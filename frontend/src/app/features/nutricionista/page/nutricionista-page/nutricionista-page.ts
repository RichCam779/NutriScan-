import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';
import { PacientesService, Paciente, ChatHistorial, PlanNutricional } from '../../services/pacientes.service';
import { DietaComidaService } from '../../../usuario/services/dieta-comida.service';
import { ReportePdfService } from '../../../../core/services/reporte-pdf.service';
import { HttpClient } from '@angular/common/http';

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
  perfilPaciente: any = null;
  historialChat: ChatHistorial[] = [];
  mensajeMotivacional = '';
  cargandoChat = false;
  errorChat = '';

  // Plan nutricional
  planExistente: PlanNutricional | null = null;
  mostrandoFormPlan = false;
  planGuardadoExito = false;
  generandoPdfPlan = false;
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
    private reportePdf: ReportePdfService,
    private titleService: Title,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Portal Nutricionista');
    this.auth = this.authService.currentUser || { nombre: 'Richard Gómez' };
    this.cargarPacientes();
  }

  private get authHeaders() {
    return { Authorization: `Bearer ${this.auth?.access}` };
  }

  cargarPacientes(): void {
    this.http.get<any>('https://nutriscan-production-fea8.up.railway.app/users/', { headers: this.authHeaders }).subscribe({
      next: (res) => {
        const todos = res.resultado || [];
        const pacientes = todos.filter((u: any) => u.rol === 'Paciente' || u.id_rol === 3);
        this.pacientes = pacientes.map((u: any) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          biotipo: u.biotipo || 'No definido',
          estado: u.estado || 'Al día',
          ultimaInteraccion: 'Cargado desde BD'
        }));
        // Guardar en el servicio local también
        this.pacientesService['_pacientes'].set(this.pacientes);
      },
      error: (err) => {
        console.warn('Error cargando pacientes, usando mock:', err);
        this.pacientes = [...this.pacientesService.pacientes()];
      }
    });
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
    this.perfilPaciente = null;

    // Cargar perfil clínico del paciente desde el backend
    this.http.get<any>(`https://nutriscan-production-fea8.up.railway.app/perfiles_clinicos/usuario/${p.id}`, { headers: this.authHeaders }).subscribe({
      next: (res) => {
        this.perfilPaciente = res.resultado;
        const pc = res.resultado;
        if (pc.proteinas_g || pc.carbohidratos_g || pc.grasas_g || pc.meta_calorica_diaria) {
          this.planExistente = {
            nutricionistaName: this.auth?.nombre || 'Nutricionista',
            caloriasObjetivo: pc.meta_calorica_diaria || 2000,
            proteinas_g: parseFloat(pc.proteinas_g) || 0,
            carbohidratos_g: parseFloat(pc.carbohidratos_g) || 0,
            grasas_g: parseFloat(pc.grasas_g) || 0,
            recomendaciones: pc.recomendaciones || '',
            fechaCreacion: new Date(pc.fecha_actualizacion || Date.now())
          };
          this.nuevoPlan = {
            caloriasObjetivo: this.planExistente.caloriasObjetivo,
            proteinas_g: this.planExistente.proteinas_g,
            carbohidratos_g: this.planExistente.carbohidratos_g,
            grasas_g: this.planExistente.grasas_g,
            recomendaciones: this.planExistente.recomendaciones
          };
        } else {
          this.planExistente = null;
          this.nuevoPlan = { caloriasObjetivo: 2000, proteinas_g: 120, carbohidratos_g: 250, grasas_g: 65, recomendaciones: '' };
        }
      },
      error: () => {
        this.planExistente = this.pacientesService.obtenerPlanPorPaciente(p.id);
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
      }
    });

    // Cargar historial de chat del paciente desde el backend
    this.http.get<any>(`https://nutriscan-production-fea8.up.railway.app/historial_chat/usuario/${p.id}`, { headers: this.authHeaders }).subscribe({
      next: (res) => {
        const chats = res.resultado || [];
        this.historialChat = chats.map((c: any) => ({
          pregunta_usuario: c.pregunta_usuario,
          respuesta_ia: c.respuesta_ia,
          fecha_creacion: new Date(c.fecha_creacion)
        }));
        this.cargandoChat = false;
      },
      error: (err) => {
        console.warn('Error cargando historial chat, usando mock:', err);
        this.historialChat = this.pacientesService.obtenerChatPorPaciente(p.id);
        this.cargandoChat = false;
      }
    });
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

    // Guardar en la BD del backend si existe perfil clínico
    if (this.perfilPaciente?.id_perfil) {
      const payload = { data: {
        meta_calorica_diaria: plan.caloriasObjetivo,
        proteinas_g: plan.proteinas_g,
        carbohidratos_g: plan.carbohidratos_g,
        grasas_g: plan.grasas_g,
        recomendaciones: plan.recomendaciones
      }};
      this.http.put<any>(`https://nutriscan-production-fea8.up.railway.app/perfiles_clinicos/${this.perfilPaciente.id_perfil}`, payload, { headers: this.authHeaders }).subscribe({
        next: () => console.log('Plan guardado en BD exitosamente'),
        error: (e) => console.warn('Error al guardar plan en BD:', e)
      });
    }

    // Enviar un mensaje motivacional al paciente en la BD
    const mensajePlan = `Tu nutricionista ${this.auth?.nombre || 'NutriScan'} te ha asignado un nuevo plan: ${plan.caloriasObjetivo} kcal/día. Proteínas: ${plan.proteinas_g}g, Carbohidratos: ${plan.carbohidratos_g}g, Grasas: ${plan.grasas_g}g. ${plan.recomendaciones}`;
    this.http.post<any>(`https://nutriscan-production-fea8.up.railway.app/users/${this.pacienteSeleccionado.id}/mensajes`,
      { mensaje: mensajePlan }, { headers: this.authHeaders }
    ).subscribe({ error: (e) => console.warn('Error enviando mensaje del plan:', e) });

    this.pacientesService.asignarPlanNutricional(this.pacienteSeleccionado.id, plan);
    this.dietaComidaService.asignarPlanNutricional(plan);
    this.planExistente = plan;
    this.pacientes = [...this.pacientesService.pacientes()];
    this.pacienteSeleccionado = this.pacientes.find(p => p.id === this.pacienteSeleccionado!.id) || this.pacienteSeleccionado;

    this.mostrandoFormPlan = false;
    this.planGuardadoExito = true;
    setTimeout(() => this.planGuardadoExito = false, 4000);
  }

  descargarPdfPlan(): void {
    if (!this.planExistente || !this.pacienteSeleccionado) return;
    this.generandoPdfPlan = true;
    const planData = {
      meta_calorica_diaria: this.planExistente.caloriasObjetivo,
      proteinas_g: this.planExistente.proteinas_g,
      carbohidratos_g: this.planExistente.carbohidratos_g,
      grasas_g: this.planExistente.grasas_g,
      recomendaciones: this.planExistente.recomendaciones,
      biotipo: this.pacienteSeleccionado.biotipo
    };
    setTimeout(() => {
      this.reportePdf.exportarPlanNutricional(this.pacienteSeleccionado!.nombre, planData);
      this.generandoPdfPlan = false;
    }, 200);
  }

  enviarMensaje(): void {
    if (!this.mensajeMotivacional.trim() || !this.pacienteSeleccionado) return;
    this.http.post<any>(
      `https://nutriscan-production-fea8.up.railway.app/users/${this.pacienteSeleccionado.id}/mensajes`,
      { mensaje: this.mensajeMotivacional },
      { headers: this.authHeaders }
    ).subscribe({
      next: () => {
        alert(`✅ Mensaje enviado a ${this.pacienteSeleccionado!.nombre}`);
        this.mensajeMotivacional = '';
      },
      error: () => {
        // Fallback local si falla el backend
        this.pacientesService.enviarMensajeMotivacional(this.pacienteSeleccionado!.id, this.mensajeMotivacional);
        alert(`✅ Mensaje enviado a ${this.pacienteSeleccionado!.nombre} (offline)`);
        this.mensajeMotivacional = '';
      }
    });
  }

  getTotalMacros(): number {
    return this.nuevoPlan.proteinas_g * 4 + this.nuevoPlan.carbohidratos_g * 4 + this.nuevoPlan.grasas_g * 9;
  }
}
