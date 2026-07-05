import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';
import { PacientesService, Paciente, ChatHistorial, PlanNutricional } from '../../services/pacientes.service';
import { DietaComidaService } from '../../../usuario/services/dieta-comida.service';

@Component({
  selector: 'app-nutricionista-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nutricionista-page.html',
  styleUrls: ['./nutricionista-page.css']
})
export class NutricionistaPageComponent implements OnInit {
  auth: any = null;
  pacientes: Paciente[] = [];
  pacienteSeleccionado: Paciente | null = null;
  historialChat: ChatHistorial[] = [];
  mensajeMotivacional = '';
  cargandoChat = false;
  errorChat = '';

  // Plan nutricional
  planExistente: PlanNutricional | null = null;
  mostrandoFormPlan = false;
  planGuardadoExito = false;
  nuevoPlan = {
    caloriasObjetivo: 2000,
    proteinas_g: 120,
    carbohidratos_g: 250,
    grasas_g: 65,
    recomendaciones: ''
  };

  constructor(
    private authService: AuthService,
    public pacientesService: PacientesService,
    private dietaComidaService: DietaComidaService,
    private titleService: Title
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Portal Nutricionista');
    this.auth = this.authService.currentUser || { nombre: 'Richard Gómez' };
    this.pacientes = [...this.pacientesService.pacientes()];
  }

  getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  }

  logout(): void {
    this.authService.logout();
  }

  seleccionarPaciente(p: Paciente): void {
    this.pacienteSeleccionado = p;
    this.historialChat = [];
    this.errorChat = '';
    this.cargandoChat = true;
    this.mostrandoFormPlan = false;
    this.planGuardadoExito = false;
    this.planExistente = this.pacientesService.obtenerPlanPorPaciente(p.id);

    // Pre-llenar el formulario con el plan existente si lo hay
    if (this.planExistente) {
      this.nuevoPlan = {
        caloriasObjetivo: this.planExistente.caloriasObjetivo,
        proteinas_g: this.planExistente.proteinas_g,
        carbohidratos_g: this.planExistente.carbohidratos_g,
        grasas_g: this.planExistente.grasas_g,
        recomendaciones: this.planExistente.recomendaciones
      };
    } else {
      this.nuevoPlan = { caloriasObjetivo: 2000, proteinas_g: 120, carbohidratos_g: 250, grasas_g: 65, recomendaciones: '' };
    }

    setTimeout(() => {
      this.historialChat = this.pacientesService.obtenerChatPorPaciente(p.id);
      this.cargandoChat = false;
    }, 500);
  }

  abrirFormPlan(): void {
    this.mostrandoFormPlan = true;
    this.planGuardadoExito = false;
  }

  cancelarFormPlan(): void {
    this.mostrandoFormPlan = false;
  }

  asignarPlan(): void {
    if (!this.pacienteSeleccionado) return;

    const plan: PlanNutricional = {
      nutricionistaName: this.auth?.nombre || 'Richard Gómez',
      caloriasObjetivo: this.nuevoPlan.caloriasObjetivo,
      proteinas_g: this.nuevoPlan.proteinas_g,
      carbohidratos_g: this.nuevoPlan.carbohidratos_g,
      grasas_g: this.nuevoPlan.grasas_g,
      recomendaciones: this.nuevoPlan.recomendaciones || 'Sigue las indicaciones del plan y mantén una hidratación adecuada.',
      fechaCreacion: new Date()
    };

    this.pacientesService.asignarPlanNutricional(this.pacienteSeleccionado.id, plan);
    // Sincronizar el plan al servicio del paciente (usuario genérico para demo)
    this.dietaComidaService.asignarPlanNutricional(plan);
    this.planExistente = plan;

    // Actualizar la lista local de pacientes para reflejar el cambio de estado
    this.pacientes = [...this.pacientesService.pacientes()];
    this.pacienteSeleccionado = this.pacientes.find(p => p.id === this.pacienteSeleccionado!.id) || this.pacienteSeleccionado;

    this.mostrandoFormPlan = false;
    this.planGuardadoExito = true;
    setTimeout(() => this.planGuardadoExito = false, 4000);
  }

  enviarMensaje(): void {
    if (!this.mensajeMotivacional.trim() || !this.pacienteSeleccionado) return;

    this.pacientesService.enviarMensajeMotivacional(this.pacienteSeleccionado.id, this.mensajeMotivacional);
    alert(`✅ Mensaje enviado a ${this.pacienteSeleccionado.nombre} (simulado con éxito)`);
    this.mensajeMotivacional = '';
  }

  getTotalMacros(): number {
    return this.nuevoPlan.proteinas_g * 4 + this.nuevoPlan.carbohidratos_g * 4 + this.nuevoPlan.grasas_g * 9;
  }
}
