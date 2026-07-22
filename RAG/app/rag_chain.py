# app/rag_chain.py

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_groq import ChatGroq

from app.config import settings

PROMPT_TEMPLATE = """Eres un asistente experto. Usa ÚNICAMENTE la siguiente información
de contexto para responder la pregunta. Si la respuesta no está en el contexto,
di exactamente: "No encontré información sobre eso en los documentos disponibles."

No inventes información. Responde en el mismo idioma de la pregunta.

Contexto:
{context}

Pregunta: {question}

Respuesta:"""

RAG_PROMPT = PromptTemplate(
    template=PROMPT_TEMPLATE,
    input_variables=["context", "question"]
)

def get_embeddings() -> HuggingFaceEmbeddings:
    """Embeddings siguen siendo de HuggingFace (gratis, corren local)."""
    return HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

def get_vector_store(embeddings: HuggingFaceEmbeddings) -> Chroma:
    import os
    if not os.path.exists(settings.CHROMA_DB_PATH):
        raise FileNotFoundError(
            f"No se encontró la base de datos en '{settings.CHROMA_DB_PATH}'. "
            "Ejecuta primero: python -m app.ingest"
        )
    return Chroma(
        persist_directory=settings.CHROMA_DB_PATH,
        embedding_function=embeddings,
        collection_name=settings.CHROMA_COLLECTION_NAME,
    )

def get_llm() -> ChatGroq:
    """LLM via Groq — gratis y ultrarrápido."""
    return ChatGroq(
        model="llama-3.1-8b-instant",
        api_key=settings.GROQ_API_KEY,
        temperature=0.1,
        max_tokens=512,
    )

def format_docs(docs) -> str:
    return "\n\n".join(doc.page_content for doc in docs)

_retriever = None
_chain = None

def initialize_chain():
    global _retriever, _chain
    settings.validate()
    print("[Chain] Inicializando pipeline RAG...")

    embeddings = get_embeddings()
    vector_store = get_vector_store(embeddings)
    llm = get_llm()

    _retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": settings.RETRIEVER_K}
    )

    _chain = (
        {"context": _retriever | format_docs, "question": RunnablePassthrough()}
        | RAG_PROMPT
        | llm
        | StrOutputParser()
    )

    print("[Chain] Pipeline RAG listo")

def get_answer(question: str, patient_context: dict = None) -> dict:
    if _chain is None:
        raise RuntimeError("La cadena RAG no está inicializada.")

    source_documents = _retriever.invoke(question)
    
    if patient_context:
        docs_text = format_docs(source_documents)
        alimentos_list = patient_context.get("alimentos_hoy", [])
        alimentos_str = ", ".join(alimentos_list) if alimentos_list else "Ninguno registrado aún"
        
        patient_info = f"""Información del Paciente:
- Nombre: {patient_context.get('nombre', 'Paciente')}
- Meta Calórica Diaria: {patient_context.get('meta_calorica', 0)} kcal
- Calorías Consumidas Hoy: {patient_context.get('consumido_hoy', 0)} kcal
- Alimentos Consumidos Hoy: {alimentos_str}
- Plan Nutricional Activo:
  * Proteínas: {patient_context.get('plan_proteinas', 0)}g
  * Carbohidratos: {patient_context.get('plan_carbohidratos', 0)}g
  * Grasas: {patient_context.get('plan_grasas', 0)}g
  * Recomendaciones: {patient_context.get('plan_recomendaciones', 'Ninguna')}
  * Asignado por Nutricionista: {patient_context.get('plan_nutricionista', 'No asignado')}"""

        prompt_text = f"""Eres un asistente nutricional experto para la aplicación NutriScan.
Responde de manera amable, clara y profesional en Español.

Usa el contexto de los documentos de NutriScan y la información del paciente proporcionada a continuación para responder la pregunta del usuario.
Si el usuario pregunta sobre su meta, consumos de hoy, o plan nutricional, usa la "Información del Paciente" proporcionada para darle una respuesta exacta y personalizada.
Si pregunta algo general sobre nutrición o la aplicación, utiliza el "Contexto de Documentos".
Intenta relacionar amigablemente ambos contextos si es pertinente.

{patient_info}

Contexto de Documentos:
{docs_text}

Pregunta: {question}

Respuesta:"""

        llm = get_llm()
        answer = llm.invoke(prompt_text).content
    else:
        answer = _chain.invoke(question)

    sources = []
    for doc in source_documents:
        sources.append({
            "source": doc.metadata.get("source", "Desconocido"),
            "page": doc.metadata.get("page", None),
            "content_preview": doc.page_content[:200] + "..."
        })

    return {
        "answer": answer.strip(),
        "sources": sources,
    }

