import { Injectable, signal } from '@angular/core';

export interface Paciente {
  id: number;
  nombre: string;
  email: string;
  biotipo: string;
  estado: string;
  ultimaInteraccion: string;
}

export interface ChatHistorial {
  pregunta_usuario: string;
  respuesta_ia: string;
  fecha_creacion: Date;
}

export interface PlanNutricional {
  nutricionistaName: string;
  caloriasObjetivo: number;
  proteinas_g: number;
  carbohidratos_g: number;
  grasas_g: number;
  recomendaciones: string;
  fechaCreacion: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PacientesService {
  private _pacientes = signal<Paciente[]>([
    { id: 1, nombre: 'Juan Pérez', email: 'juan.perez@email.com', biotipo: 'Mesomorfo', estado: 'Revisar', ultimaInteraccion: 'Hace 5 min' },
    { id: 4, nombre: 'Carlos Mendoza', email: 'carlos.mendo@email.com', biotipo: 'Ectomorfo', estado: 'Revisar', ultimaInteraccion: 'Ayer' },
    { id: 10, nombre: 'Sofía Torres', email: 'sofia.torres@email.com', biotipo: 'Endomorfo', estado: 'Al día', ultimaInteraccion: 'Hace 2 días' },
    { id: 11, nombre: 'Andrés Silva', email: 'andres.silva@email.com', biotipo: 'Mesomorfo', estado: 'Al día', ultimaInteraccion: 'Hace 4 días' }
  ]);

  private _chats = signal<{ [key: number]: ChatHistorial[] }>({
    1: [
      { pregunta_usuario: '¿Puedo comer manzana de postre hoy?', respuesta_ia: 'Una manzana mediana aporta unas 52 kcal y es rica en fibra. Es un postre excelente y saludable.', fecha_creacion: new Date(Date.now() - 300000) },
      { pregunta_usuario: '¿Cuántas calorías llevo registradas?', respuesta_ia: 'Llevas 850 kcal consumidas hoy. Tu meta diaria es 2000 kcal.', fecha_creacion: new Date(Date.now() - 200000) }
    ],
    4: [
      { pregunta_usuario: 'Hola, ¿cómo subo de peso rápido?', respuesta_ia: 'Para aumentar de peso es ideal mantener un ligero superávit calórico y realizar entrenamientos de fuerza. Te sugiero ajustar tus metas calóricas con tu nutricionista.', fecha_creacion: new Date(Date.now() - 86400000) }
    ],
    10: [
      { pregunta_usuario: '¿La avena con leche es buena para la cena?', respuesta_ia: 'Sí, la avena con leche es una excelente opción. Aporta carbohidratos complejos y proteínas que favorecen la saciedad durante la noche.', fecha_creacion: new Date(Date.now() - 172800000) }
    ],
    11: [
      { pregunta_usuario: '¿Qué snacks bajos en calorías me recomiendas?', respuesta_ia: 'Puedes optar por rodajas de pepino con limón, un puñado pequeño de almendras, o yogur griego descremado. Son opciones saciantes y nutritivas.', fecha_creacion: new Date(Date.now() - 345600000) }
    ]
  });

  // Planes nutricionales por paciente
  private _planes = signal<{ [pacienteId: number]: PlanNutricional }>({});

  readonly pacientes = this._pacientes.asReadonly();
  readonly chats = this._chats.asReadonly();
  readonly planes = this._planes.asReadonly();

  obtenerChatPorPaciente(pacienteId: number): ChatHistorial[] {
    return this._chats()[pacienteId] || [];
  }

  obtenerPlanPorPaciente(pacienteId: number): PlanNutricional | null {
    return this._planes()[pacienteId] || null;
  }

  asignarPlanNutricional(pacienteId: number, plan: PlanNutricional): void {
    this._planes.update(planes => ({ ...planes, [pacienteId]: plan }));
    // Marcar el paciente como "Al día" después de recibir un plan
    this._pacientes.update(lista => lista.map(p =>
      p.id === pacienteId ? { ...p, estado: 'Al día', ultimaInteraccion: 'Ahora' } : p
    ));
  }

  enviarMensajeMotivacional(pacienteId: number, mensaje: string): void {
    console.log(`Mensaje para paciente ${pacienteId}: ${mensaje}`);
  }
}
