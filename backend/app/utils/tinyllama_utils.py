from ctransformers import AutoModelForCausalLM

class TinyLlamaHandler:
    def __init__(self):
        # Usamos una versión Q4 (Quantized 4-bit) que pesa unos 600MB y usa casi nada de RAM
        self.llm = AutoModelForCausalLM.from_pretrained(
            "TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF",
            model_file="tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
            model_type="llama",
            gpu_layers=0 # Cambiar a > 0 si tienes GPU NVIDIA
        )

    def generate_response(self, user_message, context=""):
        # Prompt más estricto para evitar que la IA divague o pida traducciones
        prompt = f"<|system|>\nEres un nutricionista experto. Responde DIRECTAMENTE al usuario en Español. {context}\n<|user|>\n{user_message}\n<|assistant|>\n"
        
        # Generar con límite para evitar repeticiones
        response = self.llm(prompt, max_new_tokens=80, temperature=0.7, stop=["<|user|>", "Context:"])
        return response.strip()
