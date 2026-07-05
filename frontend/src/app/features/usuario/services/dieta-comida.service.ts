import { Injectable, signal, computed } from '@angular/core';

export interface Comida {
  id?: number;
  nombre: string;
  calorias: number;
  tipo: string;
  hora: string;
}

export interface Alimento {
  id_alimento: number;
  nombre: string;
  calorias: number;
}

export interface Mensaje {
  id: number;
  mensaje: string;
  fecha: Date;
}

export interface ChatMsg {
  e: 'u' | 'ia';
  t: string;
  h: string;
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

// Helper para obtener clave de fecha: 'YYYY-MM-DD'
function fechaClave(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Pre-load simulated historical data for demo
function generarHistorial(): { [fecha: string]: Comida[] } {
  const hoy = new Date();
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1);
  const antesDeAyer = new Date(hoy); antesDeAyer.setDate(hoy.getDate() - 2);

  return {
    [fechaClave(ayer)]: [
      { nombre: 'Avena con Leche', calorias: 150, tipo: 'Desayuno', hora: '07:30' },
      { nombre: 'Pechuga de Pollo (100g)', calorias: 165, tipo: 'Almuerzo', hora: '12:15' },
      { nombre: 'Ensalada Mixta', calorias: 45, tipo: 'Almuerzo', hora: '12:20' },
      { nombre: 'Manzana', calorias: 52, tipo: 'Merienda', hora: '16:00' },
    ],
    [fechaClave(antesDeAyer)]: [
      { nombre: 'Huevo Cocido', calorias: 78, tipo: 'Desayuno', hora: '08:00' },
      { nombre: 'Arroz Blanco (100g)', calorias: 130, tipo: 'Almuerzo', hora: '13:00' },
      { nombre: 'Salmón a la Plancha (100g)', calorias: 206, tipo: 'Cena', hora: '19:30' },
    ]
  };
}

@Injectable({
  providedIn: 'root'
})
export class DietaComidaService {
  readonly listadoAlimentos: Alimento[] = [
    { id_alimento: 1, nombre: 'Manzana', calorias: 52 },
    { id_alimento: 2, nombre: 'Arroz Blanco (100g)', calorias: 130 },
    { id_alimento: 3, nombre: 'Pechuga de Pollo (100g)', calorias: 165 },
    { id_alimento: 4, nombre: 'Huevo Cocido', calorias: 78 },
    { id_alimento: 5, nombre: 'Avena con Leche', calorias: 150 },
    { id_alimento: 6, nombre: 'Ensalada Mixta', calorias: 45 },
    { id_alimento: 7, nombre: 'Plátano / Banano', calorias: 89 },
    { id_alimento: 8, nombre: 'Salmón a la Plancha (100g)', calorias: 206 }
  ];

  // --- Historial de comidas por fecha ---
  private _historialComidas = signal<{ [fecha: string]: Comida[] }>(generarHistorial());

  // Fecha actualmente seleccionada para ver (por defecto hoy)
  readonly fechaSeleccionada = signal<string>(fechaClave(new Date()));

  // Comidas del día seleccionado (computed reactivo)
  readonly comidas = computed<Comida[]>(() => {
    return this._historialComidas()[this.fechaSeleccionada()] || [];
  });

  readonly caloriasConsumidas = computed<number>(() => {
    return this.comidas().reduce((sum, c) => sum + c.calorias, 0);
  });

  // --- Plan Nutricional ---
  readonly planNutricional = signal<PlanNutricional | null>(null);

  // --- Perfil y meta ---
  readonly caloriasMeta = signal<number>(2000);
  readonly mensajes = signal<Mensaje[]>([
    { id: 1, mensaje: 'Recuerda aumentar el consumo de proteínas esta semana para apoyar el entrenamiento.', fecha: new Date() }
  ]);

  readonly edad = signal<number>(24);
  readonly peso_kg = signal<number>(72);
  readonly altura_cm = signal<number>(175);
  readonly biotipo = signal<string>('Mesomorfo');
  readonly metaCaloricaDiaria = signal<number>(2000);

  readonly chat = signal<ChatMsg[]>([
    { e: 'ia', t: '¡Hola! Soy tu asistente inteligente NutriBot. ¿En qué puedo ayudarte hoy?', h: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);

  readonly porcentaje = computed(() => {
    const meta = this.caloriasMeta();
    if (meta <= 0) return 0;
    return Math.min(100, Math.round((this.caloriasConsumidas() / meta) * 100));
  });

  // --- Fechas disponibles en historial ---
  readonly fechasConRegistros = computed<string[]>(() => {
    return Object.keys(this._historialComidas()).sort().reverse();
  });

  seleccionarFecha(fecha: string): void {
    this.fechaSeleccionada.set(fecha);
  }

  esFechaHoy(): boolean {
    return this.fechaSeleccionada() === fechaClave(new Date());
  }

  registrarComida(alimento: Alimento, tipo: string, hora: string): void {
    const fecha = this.fechaSeleccionada();
    const nuevaComida: Comida = { nombre: alimento.nombre, calorias: alimento.calorias, tipo, hora };
    this._historialComidas.update(hist => ({
      ...hist,
      [fecha]: [...(hist[fecha] || []), nuevaComida]
    }));
  }

  asignarPlanNutricional(plan: PlanNutricional): void {
    this.planNutricional.set(plan);
    // El plan también actualiza la meta calórica
    this.caloriasMeta.set(plan.caloriasObjetivo);
    this.metaCaloricaDiaria.set(plan.caloriasObjetivo);
    // Añadir mensaje del nutricionista
    this.mensajes.update(lista => [
      { id: Date.now(), mensaje: `Tu nutricionista ${plan.nutricionistaName} te asignó un nuevo plan: ${plan.caloriasObjetivo} kcal/día. ${plan.recomendaciones}`, fecha: new Date() },
      ...lista
    ]);
  }

  finalizarMensaje(id: number): void {
    this.mensajes.update(lista => lista.filter(m => m.id !== id));
  }

  guardarPerfil(edad: number, peso: number, altura: number, biotipo: string, meta: number): void {
    this.edad.set(edad);
    this.peso_kg.set(peso);
    this.altura_cm.set(altura);
    this.biotipo.set(biotipo);
    this.metaCaloricaDiaria.set(meta);
    this.caloriasMeta.set(meta);
  }

  agregarMensajeChat(msg: ChatMsg): void {
    this.chat.update(historial => [...historial, msg]);
  }

  formatearFecha(fecha: string): string {
    const hoy = fechaClave(new Date());
    const ayer = new Date(); ayer.setDate(ayer.getDate() - 1);
    const ayerStr = fechaClave(ayer);
    if (fecha === hoy) return 'Hoy';
    if (fecha === ayerStr) return 'Ayer';
    const d = new Date(fecha + 'T12:00:00');
    return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
  }
}
