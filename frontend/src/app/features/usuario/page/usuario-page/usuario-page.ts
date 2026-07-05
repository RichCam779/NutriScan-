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

  // Animación de escaneo (simulada)
  escaneando = false;
  alimentoEscaneado: Alimento | null = null;
  mostrarConfirmEscaneo = false;

  // ─── Reporte ────────────────────────────────────────────────
  tipoReporte: 'dia' | 'semana' | 'mes' = 'dia';
  generandoPdf = false;

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

  constructor(
    private authService: AuthService,
    public ds: DietaComidaService,
    private titleService: Title,
    private ragService: RagService,
    private reportePdf: ReportePdfService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Mi Panel');
    this.auth = this.authService.currentUser || { nombre: 'Juan Pérez' };
    this.filtrados = [...this.ds.listadoAlimentos];
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
    this.filtrados = [...this.ds.listadoAlimentos];
  }

  guardarRegistro(alimento: Alimento): void {
    this.ds.registrarComida(alimento, this.tipoComidaSeleccionado, this.hora());
    this.mostrarSelector = false;
    this.busqueda = '';
    this.alimentoEscaneado = null;
    this.mostrarConfirmEscaneo = false;
  }

  // ─── Escaneo simulado de IA ──────────────────────────────────
  activarEscaneo(tipo: string): void {
    this.tipoComidaSeleccionado = tipo;
    this.escaneando = true;
    this.mostrarConfirmEscaneo = false;
    this.alimentoEscaneado = null;

    // Simula el análisis de IA (1.8 segundos)
    setTimeout(() => {
      const idx = Math.floor(Math.random() * this.ds.listadoAlimentos.length);
      this.alimentoEscaneado = this.ds.listadoAlimentos[idx];
      this.escaneando = false;
      this.mostrarConfirmEscaneo = true;
      this.cdr.detectChanges();
    }, 1800);
  }

  confirmarEscaneo(): void {
    if (this.alimentoEscaneado) {
      this.guardarRegistro(this.alimentoEscaneado);
      // Avanza automáticamente al reporte
      setTimeout(() => this.irAPaso(2), 300);
    }
  }

  rechazarEscaneo(): void {
    this.mostrarConfirmEscaneo = false;
    this.alimentoEscaneado = null;
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

  // ─── Chat NutriBot ───────────────────────────────────────────
  enviarMensaje(): void {
    if (!this.msg.trim()) return;
    const userMsg = this.msg;
    this.ds.agregarMensajeChat({ e: 'u', t: userMsg, h: this.hora() });
    this.msg = '';
    const low = userMsg.toLowerCase();

    if (low.includes('calorias') || low.includes('caloría') || low.includes('meta')) {
      const rpt = this.getDatosReporte();
      const reply = `Tu meta calórica diaria es de ${this.caloriasMeta} kcal. ` +
        `Hoy has consumido ${this.caloriasConsumidas} kcal (${this.porcentaje}% de tu meta). ` +
        `En los datos del ${this.labelTipoReporte} llevas ${rpt.caloriasTotales} kcal consumidas de ${rpt.caloriasMetaPeriodo} kcal meta. ¡Sigue así!`;
      setTimeout(() => this.ds.agregarMensajeChat({ e: 'ia', t: reply, h: this.hora() }), 400);
      return;
    }

    if (low.includes('plan') || low.includes('dieta')) {
      const p = this.planNutricional;
      const reply = p
        ? `Tu plan nutricional: ${p.caloriasObjetivo} kcal/día — Proteínas: ${p.proteinas_g}g, Carboh: ${p.carbohidratos_g}g, Grasas: ${p.grasas_g}g. Diseñado por ${p.nutricionistaName}.`
        : 'Aún no tienes un plan nutricional asignado por un nutricionista.';
      setTimeout(() => this.ds.agregarMensajeChat({ e: 'ia', t: reply, h: this.hora() }), 400);
      return;
    }

    if (low.includes('biotipo') || low.includes('perfil') || low.includes('edad') || low.includes('peso') || low.includes('altura')) {
      const reply = `Tu perfil: Biotipo ${this.biotipo}, Edad ${this.edad} años, Peso ${this.peso_kg} kg, Altura ${this.altura_cm} cm.`;
      setTimeout(() => this.ds.agregarMensajeChat({ e: 'ia', t: reply, h: this.hora() }), 400);
      return;
    }

    if (low.includes('reporte') || low.includes('historial')) {
      const rpt = this.getDatosReporte();
      const reply = `Tu reporte del ${this.labelTipoReporte}: consumiste ${rpt.caloriasTotales} kcal de ${rpt.caloriasMetaPeriodo} kcal meta (${rpt.porcentajePeriodo}%). Puedes ver el reporte completo en el paso 2 o descargarlo en PDF.`;
      setTimeout(() => this.ds.agregarMensajeChat({ e: 'ia', t: reply, h: this.hora() }), 400);
      return;
    }

    this.ragService.askQuestion(userMsg).subscribe({
      next: (response) => this.ds.agregarMensajeChat({ e: 'ia', t: response.answer, h: this.hora() }),
      error: () => this.ds.agregarMensajeChat({
        e: 'ia',
        t: `Lo siento, tuve un error de conexión. Recuerda: tu meta es ${this.caloriasMeta} kcal y llevas ${this.caloriasConsumidas} kcal hoy.`,
        h: this.hora()
      })
    });
  }

  logout(): void { this.authService.logout(); }

  private scrollToBottom(): void {
    try {
      const el = this.chatContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }
}
