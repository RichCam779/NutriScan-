import {
  Component, OnInit, OnDestroy,
  ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';
import { DietaComidaService, Alimento, ChatMsg, Comida } from '../../services/dieta-comida.service';
import { RagService } from '../../../../core/services/rag.service';
import { ReportePdfService } from '../../../../core/services/reporte-pdf.service';
import { HttpClient } from '@angular/common/http';

export interface StepDef {
  id: number;
  icon: string;
  label: string;
  sublabel: string;
}

@Component({
  selector: 'app-usuario-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-page.html',
  styleUrls: ['./usuario-page.css']
})
export class UsuarioPageComponent implements OnInit, AfterViewChecked, OnDestroy {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  auth: any = null;
  editandoPerfil = false;

  // ─── Stepper ────────────────────────────────────────────────
  pasoActivo = 1;

  readonly pasos: StepDef[] = [
    { id: 1, icon: 'bi-camera-fill',      label: 'Registro',  sublabel: 'Meta y escaneo' },
    { id: 2, icon: 'bi-bar-chart-fill',   label: 'Reporte',   sublabel: 'Progreso calórico' },
    { id: 3, icon: 'bi-robot',            label: 'NutriBot',  sublabel: 'Asistente IA' },
  ];

  irAPaso(paso: number): void {
    this.pasoActivo = paso;
    // Si llega al chat, scroll automático
    if (paso === 3) {
      setTimeout(() => this.scrollToBottom(), 100);
    }
  }

  siguientePaso(): void {
    if (this.pasoActivo < 3) this.pasoActivo++;
    if (this.pasoActivo === 3) setTimeout(() => this.scrollToBottom(), 100);
  }

  pasoAnterior(): void {
    if (this.pasoActivo > 1) this.pasoActivo--;
  }

  // ─── Comidas / Calendario ───────────────────────────────────
  filtrados: Alimento[] = [];
  busqueda = '';
  mostrarSelector = false;
  tipoComidaSeleccionado = '';

  // Escaneo con YOLO (real via file upload)
  escaneando = false;
  alimentoEscaneado: any = null;
  alimentosDetectadosMultiples: any[] = [];
  mostrarConfirmEscaneo = false;
  mostrarPreguntaMultiples = false;
  errorEscaneo = '';

  // ─── Reporte ────────────────────────────────────────────────
  tipoReporte: 'dia' | 'semana' | 'mes' = 'dia';
  generandoPdf = false;
  generandoPdfPlan = false;

  // ─── Chat ───────────────────────────────────────────────────
  msg = '';

  // ─── Getters delegados ──────────────────────────────────────
  get caloriasConsumidas() { return this.ds.caloriasConsumidas(); }
  get caloriasMeta()       { return this.ds.caloriasMeta(); }
  get porcentaje()         { return this.ds.porcentaje(); }
  get comidas()            { return this.ds.comidas(); }
  get mensajes()           { return this.ds.mensajes(); }
  get chat()               { return this.ds.chat(); }
  get planNutricional()    { return this.ds.planNutricional(); }
  get fechaSeleccionada()  { return this.ds.fechaSeleccionada(); }
  get fechasConRegistros() { return this.ds.fechasConRegistros(); }

  // Perfil – lectura/escritura
  get edad()               { return this.ds.edad(); }
  set edad(v: number)      { this.ds.edad.set(v); }
  get peso_kg()            { return this.ds.peso_kg(); }
  set peso_kg(v: number)   { this.ds.peso_kg.set(v); }
  get altura_cm()          { return this.ds.altura_cm(); }
  set altura_cm(v: number) { this.ds.altura_cm.set(v); }
  get biotipo()            { return this.ds.biotipo(); }
  set biotipo(v: string)   { this.ds.biotipo.set(v); }
  get metaCaloricaDiaria()          { return this.ds.metaCaloricaDiaria(); }
  set metaCaloricaDiaria(v: number) { this.ds.metaCaloricaDiaria.set(v); }

  private perfilClinico: any = null;

  constructor(
    private authService: AuthService,
    public ds: DietaComidaService,
    private titleService: Title,
    private ragService: RagService,
    private reportePdf: ReportePdfService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Mi Panel');
    this.auth = this.authService.currentUser || { nombre: 'Juan Pérez' };
    this.filtrados = [...this.ds.listadoAlimentos];
    // Re-iniciar el chat con saludo inicial
    this.ds.chat.set([
      { e: 'ia', t: '¡Hola! Soy tu asistente inteligente NutriBot. ¿En qué puedo ayudarte hoy?', h: this.hora() }
    ]);
    const userId = this.auth?.id_usuario;
    const token = this.auth?.access;
    if (userId && token) {
      const headers = { Authorization: `Bearer ${token}` };
      // Cargar perfil clínico
      this.http.get<any>(`http://localhost:8000/perfiles_clinicos/usuario/${userId}`, { headers }).subscribe({
        next: (res) => {
          const p = res.resultado;
          this.perfilClinico = p;
          if (p.meta_calorica_diaria) this.ds.caloriasMeta.set(p.meta_calorica_diaria);
          if (p.meta_calorica_diaria) this.ds.metaCaloricaDiaria.set(p.meta_calorica_diaria);
          if (p.edad) this.ds.edad.set(p.edad);
          if (p.peso_kg) this.ds.peso_kg.set(parseFloat(p.peso_kg));
          if (p.altura_cm) this.ds.altura_cm.set(parseFloat(p.altura_cm));
          if (p.biotipo) this.ds.biotipo.set(p.biotipo);
        },
        error: (err) => console.warn('Perfil clínico no encontrado:', err)
      });
      // Cargar mensajes del nutricionista
      this.http.get<any>(`http://localhost:8000/users/${userId}/mensajes`, { headers }).subscribe({
        next: (res) => {
          const msgs = res.resultado || [];
          if (msgs.length) this.ds.mensajes.set(msgs.map((m: any) => ({ id: m.id, mensaje: m.mensaje, fecha: new Date(m.fecha) })));
        },
        error: (err) => console.warn('Mensajes no encontrados:', err)
      });
      // Cargar alimentos desde el backend
      this.http.get<any>('http://localhost:8000/alimentos/', { headers }).subscribe({
        next: (res) => {
          const alimentos = res.resultado || [];
          if (alimentos.length) {
            const mapped = alimentos.map((a: any) => ({ id_alimento: a.id_alimento, nombre: a.nombre, calorias: a.calorias }));
            this.ds.listadoAlimentos.splice(0, this.ds.listadoAlimentos.length, ...mapped);
            this.filtrados = [...this.ds.listadoAlimentos];
          }
        },
        error: (err) => console.warn('Alimentos no cargados:', err)
      });
      // Cargar historial de consumo de comida
      this.http.get<any>(`http://localhost:8000/registro_consumo/usuario/${userId}`, { headers }).subscribe({
        next: (res) => {
          const consumos = res.resultado || [];
          const grouped: { [fecha: string]: Comida[] } = {};
          consumos.forEach((c: any) => {
            const dateStr = c.fecha_consumo.slice(0, 10);
            if (!grouped[dateStr]) grouped[dateStr] = [];
            grouped[dateStr].push({
              id: c.id_registro,
              nombre: c.nombre || 'Alimento',
              calorias: c.calorias || 0,
              tipo: c.tipo_comida || 'Almuerzo',
              hora: c.fecha_creacion ? new Date(c.fecha_creacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00'
            });
          });
          this.ds['_historialComidas'].set(grouped);
        },
        error: (err) => console.warn('Historial de consumo no cargado:', err)
      });
    }
  }

  ngAfterViewChecked(): void {
    if (this.pasoActivo === 3) this.scrollToBottom();
  }

  ngOnDestroy(): void {}

  hora(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  }

  // ─── Calendario ─────────────────────────────────────────────
  seleccionarFecha(fecha: string): void { this.ds.seleccionarFecha(fecha); }
  irAHoy(): void { this.ds.seleccionarFecha(new Date().toISOString().slice(0, 10)); }
  esFechaHoy(): boolean { return this.ds.esFechaHoy(); }
  formatearFecha(fecha: string): string { return this.ds.formatearFecha(fecha); }

  // ─── Mensajes nutricionista ──────────────────────────────────
  finalizarMensaje(id: number): void { this.ds.finalizarMensaje(id); }

  // ─── Selector de alimentos ───────────────────────────────────
  filtrarAlimentos(): void {
    this.filtrados = this.ds.listadoAlimentos.filter(a =>
      a.nombre?.toLowerCase().includes(this.busqueda.toLowerCase())
    );
  }

  abrirSelector(tipo: string): void {
    this.tipoComidaSeleccionado = tipo;
    this.mostrarSelector = true;
    this.busqueda = '';
    this.mostrarConfirmEscaneo = false;
    this.mostrarPreguntaMultiples = false;
    this.filtrados = [...this.ds.listadoAlimentos];
  }

  guardarRegistro(alimento: Alimento): void {
    this.ds.registrarComida(alimento, this.tipoComidaSeleccionado, this.hora());
    this.mostrarSelector = false;
    this.busqueda = '';
    this.alimentoEscaneado = null;
    this.mostrarConfirmEscaneo = false;
    this.mostrarPreguntaMultiples = false;
    // Persistir en el backend
    const userId = this.auth?.id_usuario;
    const token = this.auth?.access;
    if (userId && token && alimento.id_alimento) {
      const payload = { data: {
        id_usuario: userId,
        id_alimento: alimento.id_alimento,
        cantidad_gramos: 100,
        fecha_consumo: new Date().toISOString().slice(0, 10),
        tipo_comida: this.tipoComidaSeleccionado
      }};
      this.http.post<any>('http://localhost:8000/registro_consumo/', payload,
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({ error: (e) => console.warn('Error al guardar consumo:', e) });
    }
  }

  // ─── Escaneo YOLO real via file input ────────────────────────
  activarEscaneo(tipo: string): void {
    // Disparar un input file para escanear con YOLO
    this.tipoComidaSeleccionado = tipo;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;
      this.errorEscaneo = '';
      this.escaneando = true;
      this.mostrarConfirmEscaneo = false;
      this.mostrarPreguntaMultiples = false;
      this.alimentoEscaneado = null;
      this.alimentosDetectadosMultiples = [];
      const userId = this.auth?.id_usuario;
      const token = this.auth?.access;
      const formData = new FormData();
      formData.append('file', file);
      this.http.post<any>(
        `http://localhost:8000/ai/food-recognition/${userId}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({
        next: (res) => {
          this.escaneando = false;
          const rawAlimentos: any[] = res.alimentos_detectados || [];

          // Deduplicar por nombre (YOLO puede detectar el mismo alimento varias veces)
          const vistos = new Set<string>();
          const unicos = rawAlimentos.filter((a: any) => {
            const key = (a.nombre || '').toLowerCase().trim();
            if (vistos.has(key)) return false;
            vistos.add(key);
            return true;
          });

          if (unicos.length > 1) {
            // Múltiples alimentos distintos → mostrar selector
            this.alimentosDetectadosMultiples = unicos.map((a: any) => ({
              id_alimento: a.id_alimento || 0,
              nombre: a.nombre,
              calorias: a.calorias || 0,
              cantidad: 1
            }));
            this.mostrarPreguntaMultiples = true;
          } else {
            // Un solo alimento (o el primero único)
            const first = unicos[0] || (res.alimento_detectado ? { nombre: res.alimento_detectado, calorias: res.calorias || 0, id_alimento: res.id_alimento || 0 } : null);
            if (first) {
              this.alimentoEscaneado = { id_alimento: first.id_alimento || 0, nombre: first.nombre, calorias: first.calorias || 0, cantidad: 1 };
              this.mostrarConfirmEscaneo = true;
            } else {
              this.errorEscaneo = 'No se detectó ningún alimento en la imagen.';
            }
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.escaneando = false;
          this.errorEscaneo = err.error?.detail || 'Error al analizar la imagen con YOLOv8.';
          this.cdr.detectChanges();
        }
      });
    };
    input.click();
  }

  incrementarCantidad(item: any): void {
    item.cantidad = (item.cantidad || 1) + 1;
  }

  decrementarCantidad(item: any): void {
    if (item.cantidad > 1) {
      item.cantidad--;
    }
  }

  incrementarCantidadSimple(): void {
    if (this.alimentoEscaneado) {
      this.alimentoEscaneado.cantidad = (this.alimentoEscaneado.cantidad || 1) + 1;
    }
  }

  decrementarCantidadSimple(): void {
    if (this.alimentoEscaneado && this.alimentoEscaneado.cantidad > 1) {
      this.alimentoEscaneado.cantidad--;
    }
  }

  confirmarEscaneoMultiples(): void {
    const userId = this.auth?.id_usuario;
    const token = this.auth?.access;

    this.alimentosDetectadosMultiples.forEach(item => {
      const alimentoFinal: Alimento = {
        id_alimento: item.id_alimento,
        nombre: `${item.cantidad}x ${item.nombre}`,
        calorias: item.calorias * item.cantidad
      };

      this.ds.registrarComida(alimentoFinal, this.tipoComidaSeleccionado, this.hora());

      if (userId && token && item.id_alimento) {
        const payload = { data: {
          id_usuario: userId,
          id_alimento: item.id_alimento,
          cantidad_gramos: item.cantidad * 100, // 100g por unidad
          fecha_consumo: new Date().toISOString().slice(0, 10),
          tipo_comida: this.tipoComidaSeleccionado
        }};
        this.http.post<any>('http://localhost:8000/registro_consumo/', payload,
          { headers: { Authorization: `Bearer ${token}` } }
        ).subscribe({ error: (e) => console.warn('Error al guardar consumo múltiple:', e) });
      }
    });

    this.mostrarPreguntaMultiples = false;
    this.alimentosDetectadosMultiples = [];
    setTimeout(() => this.irAPaso(2), 300);
  }

  confirmarEscaneo(): void {
    if (this.alimentoEscaneado) {
      const cantidad = this.alimentoEscaneado.cantidad || 1;
      const alimentoFinal: Alimento = {
        id_alimento: this.alimentoEscaneado.id_alimento,
        nombre: cantidad > 1 ? `${cantidad}x ${this.alimentoEscaneado.nombre}` : this.alimentoEscaneado.nombre,
        calorias: this.alimentoEscaneado.calorias * cantidad
      };

      this.ds.registrarComida(alimentoFinal, this.tipoComidaSeleccionado, this.hora());
      
      const userId = this.auth?.id_usuario;
      const token = this.auth?.access;
      if (userId && token && alimentoFinal.id_alimento) {
        const payload = { data: {
          id_usuario: userId,
          id_alimento: alimentoFinal.id_alimento,
          cantidad_gramos: cantidad * 100,
          fecha_consumo: new Date().toISOString().slice(0, 10),
          tipo_comida: this.tipoComidaSeleccionado
        }};
        this.http.post<any>('http://localhost:8000/registro_consumo/', payload,
          { headers: { Authorization: `Bearer ${token}` } }
        ).subscribe({ error: (e) => console.warn('Error al guardar consumo:', e) });
      }

      this.mostrarConfirmEscaneo = false;
      this.alimentoEscaneado = null;
      setTimeout(() => this.irAPaso(2), 300);
    }
  }

  /** Vuelve a abrir el selector de archivo para escanear de nuevo */
  volverAEscanear(): void {
    this.mostrarConfirmEscaneo = false;
    this.mostrarPreguntaMultiples = false;
    this.alimentoEscaneado = null;
    this.alimentosDetectadosMultiples = [];
    this.errorEscaneo = '';
    // Re-lanzar el escaneo con el mismo tipo de comida
    this.activarEscaneo(this.tipoComidaSeleccionado);
  }

  /** Cancela todo y regresa al estado inicial sin escanear */
  cancelarEscaneo(): void {
    this.mostrarConfirmEscaneo = false;
    this.mostrarPreguntaMultiples = false;
    this.alimentoEscaneado = null;
    this.alimentosDetectadosMultiples = [];
    this.errorEscaneo = '';
  }

  /** @deprecated Use volverAEscanear() o cancelarEscaneo() */
  rechazarEscaneo(): void {
    this.cancelarEscaneo();
  }

  // ─── Perfil ──────────────────────────────────────────────────
  toggleEditPerfil(): void { this.editandoPerfil = true; }
  guardarPerfil(): void {
    this.editandoPerfil = false;
    this.ds.guardarPerfil(this.edad, this.peso_kg, this.altura_cm, this.biotipo, this.metaCaloricaDiaria);
  }

  // ─── Reportes ────────────────────────────────────────────────
  get labelTipoReporte(): string {
    return { dia: 'Día', semana: 'Semana', mes: 'Mes' }[this.tipoReporte] || 'Día';
  }

  private getFechasRango(): string[] {
    const base = new Date(this.fechaSeleccionada + 'T12:00:00');
    if (this.tipoReporte === 'dia') return [this.fechaSeleccionada];

    if (this.tipoReporte === 'semana') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(base); d.setDate(base.getDate() - (6 - i));
        return d.toISOString().slice(0, 10);
      });
    }

    const year = base.getFullYear(), month = base.getMonth();
    const dias = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: dias }, (_, i) =>
      new Date(year, month, i + 1).toISOString().slice(0, 10)
    );
  }

  getDatosReporte() {
    const fechas = this.getFechasRango();
    const historial = this.ds.historialComidas();
    const meta = this.caloriasMeta;

    let caloriasTotales = 0, diasConDatos = 0;
    const alimentos: any[] = [];

    fechas.forEach(fecha => {
      const items: Comida[] = historial[fecha] || [];
      const totalDia = items.reduce((s, c) => s + c.calorias, 0);
      if (items.length) diasConDatos++;
      caloriasTotales += totalDia;
      items.forEach(c => alimentos.push({ fecha, fechaFormateada: this.ds.formatearFecha(fecha), ...c }));
    });

    const caloriasMetaPeriodo = meta * fechas.length;
    const porcentajePeriodo = caloriasMetaPeriodo > 0
      ? Math.min(100, Math.round((caloriasTotales / caloriasMetaPeriodo) * 100)) : 0;

    return { caloriasTotales, caloriasMetaPeriodo, porcentajePeriodo,
             diasConDatos, diasSinDatos: fechas.length - diasConDatos, alimentos };
  }

  descargarPdfPaciente(): void {
    this.generandoPdf = true;
    const datos = this.getDatosReporte();
    setTimeout(() => {
      this.reportePdf.exportarReportePaciente(
        this.auth?.nombre || 'Paciente', this.caloriasMeta, this.tipoReporte, datos
      );
      this.generandoPdf = false;
    }, 200);
  }

  descargarPdfPlan(): void {
    const plan = this.planNutricional;
    if (!plan && !this.perfilClinico) {
      alert('No tienes un plan nutricional asignado todavía.');
      return;
    }
    this.generandoPdfPlan = true;
    const planData = plan ? {
      meta_calorica_diaria: plan.caloriasObjetivo,
      proteinas_g: plan.proteinas_g,
      carbohidratos_g: plan.carbohidratos_g,
      grasas_g: plan.grasas_g,
      recomendaciones: plan.recomendaciones,
      biotipo: this.biotipo
    } : {
      meta_calorica_diaria: this.perfilClinico?.meta_calorica_diaria,
      proteinas_g: this.perfilClinico?.proteinas_g || 0,
      carbohidratos_g: this.perfilClinico?.carbohidratos_g || 0,
      grasas_g: this.perfilClinico?.grasas_g || 0,
      recomendaciones: this.perfilClinico?.recomendaciones,
      biotipo: this.biotipo
    };
    setTimeout(() => {
      this.reportePdf.exportarPlanNutricional(this.auth?.nombre || 'Paciente', planData);
      this.generandoPdfPlan = false;
    }, 200);
  }

  // ─── Chat NutriBot ───────────────────────────────────────────
  enviarMensaje(): void {
    if (!this.msg.trim()) return;
    const userMsg = this.msg;
    this.ds.agregarMensajeChat({ e: 'u', t: userMsg, h: this.hora() });
    this.msg = '';
    const userId = this.auth?.id_usuario;
    const token = this.auth?.access;

    if (userId && token) {
      // Usar el chatbot real del backend
      this.http.post<any>(
        'http://localhost:8000/chatbot/message',
        { id_usuario: userId, mensaje: userMsg },
        { headers: { Authorization: `Bearer ${token}` } }
      ).subscribe({
        next: (res) => this.ds.agregarMensajeChat({ e: 'ia', t: res.respuesta, h: this.hora() }),
        error: () => {
          // Fallback al RAG si el chatbot principal falla
          this.ragService.askQuestion(userMsg).subscribe({
            next: (response) => this.ds.agregarMensajeChat({ e: 'ia', t: response.answer, h: this.hora() }),
            error: () => this.ds.agregarMensajeChat({
              e: 'ia',
              t: `Lo siento, tuve un error de conexión. Recuerda: tu meta es ${this.caloriasMeta} kcal y llevas ${this.caloriasConsumidas} kcal hoy.`,
              h: this.hora()
            })
          });
        }
      });
    } else {
      // Sin autenticación, usar RAG directamente
      this.ragService.askQuestion(userMsg).subscribe({
        next: (response) => this.ds.agregarMensajeChat({ e: 'ia', t: response.answer, h: this.hora() }),
        error: () => this.ds.agregarMensajeChat({
          e: 'ia',
          t: `Lo siento, tuve un error de conexión.`,
          h: this.hora()
        })
      });
    }
  }

  logout(): void { this.authService.logout(); }

  private scrollToBottom(): void {
    try {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
