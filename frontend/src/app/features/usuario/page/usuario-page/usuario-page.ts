import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';
import { DietaComidaService, Alimento, ChatMsg } from '../../services/dieta-comida.service';

@Component({
  selector: 'app-usuario-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuario-page.html',
  styleUrls: ['./usuario-page.css']
})
export class UsuarioPageComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  auth: any = null;
  editandoPerfil = false;
  filtrados: Alimento[] = [];
  busqueda = '';
  mostrarSelector = false;
  tipoComidaSeleccionado = '';
  msg = '';

  // Getters delegados al DietaComidaService (datos del día seleccionado)
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
  get edad()              { return this.ds.edad(); }
  set edad(v: number)     { this.ds.edad.set(v); }
  get peso_kg()           { return this.ds.peso_kg(); }
  set peso_kg(v: number)  { this.ds.peso_kg.set(v); }
  get altura_cm()         { return this.ds.altura_cm(); }
  set altura_cm(v: number){ this.ds.altura_cm.set(v); }
  get biotipo()           { return this.ds.biotipo(); }
  set biotipo(v: string)  { this.ds.biotipo.set(v); }
  get metaCaloricaDiaria()        { return this.ds.metaCaloricaDiaria(); }
  set metaCaloricaDiaria(v: number){ this.ds.metaCaloricaDiaria.set(v); }

  constructor(
    private authService: AuthService,
    public ds: DietaComidaService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Mi Panel');
    this.auth = this.authService.currentUser || { nombre: 'Paciente Demo' };
    this.filtrados = [...this.ds.listadoAlimentos];
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  hora(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  }

  // --- Calendario ---
  seleccionarFecha(fecha: string): void {
    this.ds.seleccionarFecha(fecha);
    this.mostrarSelector = false;
  }

  irAHoy(): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.ds.seleccionarFecha(hoy);
    this.mostrarSelector = false;
  }

  esFechaHoy(): boolean {
    return this.ds.esFechaHoy();
  }

  formatearFecha(fecha: string): string {
    return this.ds.formatearFecha(fecha);
  }

  // --- Comidas ---
  finalizarMensaje(id: number): void {
    this.ds.finalizarMensaje(id);
  }

  filtrarAlimentos(): void {
    this.filtrados = this.ds.listadoAlimentos.filter(a =>
      a.nombre?.toLowerCase().includes(this.busqueda.toLowerCase())
    );
  }

  abrirSelector(tipo: string): void {
    this.tipoComidaSeleccionado = tipo;
    this.mostrarSelector = true;
    this.busqueda = '';
    this.filtrados = [...this.ds.listadoAlimentos];
  }

  guardarRegistro(alimento: Alimento): void {
    this.ds.registrarComida(alimento, this.tipoComidaSeleccionado, this.hora());
    this.mostrarSelector = false;
    this.busqueda = '';
  }

  // --- Perfil ---
  toggleEditPerfil(): void { this.editandoPerfil = true; }

  guardarPerfil(): void {
    this.editandoPerfil = false;
    this.ds.guardarPerfil(this.edad, this.peso_kg, this.altura_cm, this.biotipo, this.metaCaloricaDiaria);
  }

  // --- Chat NutriBot ---
  enviarMensaje(): void {
    if (!this.msg.trim()) return;
    const userMsg = this.msg;
    this.ds.agregarMensajeChat({ e: 'u', t: userMsg, h: this.hora() });
    this.msg = '';

    setTimeout(() => {
      let reply = '¡Hola! Para consultas detalladas de biotipos o dietas, consulta con tu nutricionista. ¿Tienes alguna otra pregunta sobre alimentos generales?';
      const low = userMsg.toLowerCase();

      if (low.includes('hola') || low.includes('buenos')) {
        reply = `¡Hola ${this.auth?.nombre}! Espero que estés teniendo un gran día. ¿Registraste ya tus comidas de hoy?`;
      } else if (low.includes('calorias') || low.includes('caloría')) {
        reply = `Hasta ahora has consumido ${this.caloriasConsumidas} kcal de tu meta de ${this.caloriasMeta} kcal. ¡Vas por un ${this.porcentaje}%!`;
      } else if (low.includes('plan')) {
        const p = this.planNutricional;
        reply = p
          ? `Tu plan actual es de ${p.caloriasObjetivo} kcal/día con ${p.proteinas_g}g proteínas, ${p.carbohidratos_g}g carbohidratos y ${p.grasas_g}g grasas. Fue diseñado por ${p.nutricionistaName}.`
          : 'Aún no tienes un plan nutricional asignado. Tu nutricionista te lo enviará pronto.';
      } else if (low.includes('manzana')) {
        reply = 'Una manzana mediana aporta aproximadamente 52 calorías. Es una excelente fuente de fibra y antioxidantes.';
      } else if (low.includes('huevo')) {
        reply = 'El huevo aporta unas 78 kcal por unidad cocida y es una fuente fantástica de proteína de alto valor biológico.';
      } else if (low.includes('pollo')) {
        reply = 'La pechuga de pollo cocida aporta unas 165 calorías por cada 100g. Ideal para dietas altas en proteína.';
      } else if (low.includes('gracias') || low.includes('ok')) {
        reply = '¡Con mucho gusto! Estoy aquí para apoyarte en tu camino nutricional con NutriScan.';
      }

      this.ds.agregarMensajeChat({ e: 'ia', t: reply, h: this.hora() });
    }, 800);
  }

  logout(): void {
    this.authService.logout();
  }

  private scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
