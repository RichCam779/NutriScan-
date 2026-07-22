import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title, DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService, Usuario } from '../../services/usuarios.service';
import { ReportePdfService } from '../../../../core/services/reporte-pdf.service';
import { HttpClient } from '@angular/common/http';

interface LogEntry { h: string; msg: string; tipo: string; }

@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-page.html',
  styleUrls: ['./admin-page.css']
})
export class AdminPageComponent implements OnInit {
  auth: any = null;
  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];

  selectedTab = 'usuarios';
  // ENLACE DE POWERBI: Reemplaza este enlace por el tuyo en caso de cambiar el reporte
  powerBiUrl = 'https://app.powerbi.com/view?r=eyJrIjoiODdmYTg0NWYtZTQzZC00M2JkLWJjMjctNGE4M2Q2ZmIwNDE3IiwidCI6IjFlOWFhYmU4LTY3ZjgtNGYxYy1hMzI5LWE3NTRlOTI0OTlhZSIsImMiOjR9';

  mostrandoModal = false;
  tipoModal = '';
  datoActual: any = {};
  mensajeError = '';
  mostrarSoloInactivos = false;

  logs: LogEntry[] = [
    { h: '14:05', msg: 'Sistema iniciado correctamente', tipo: 'success' },
    { h: '13:40', msg: 'Respaldo de base de datos completado', tipo: 'info' }
  ];

  exportandoPdf = false;

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private router: Router,
    private titleService: Title,
    private reportePdf: ReportePdfService,
    private http: HttpClient,
    private sanitizer: DomSanitizer
  ) {
    // Sanitizar la URL una sola vez para evitar que el iframe se recargue
    // en cada ciclo de detección de cambios de Angular
    this.safePowerBiUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.powerBiUrl);
  }

  // URL de PowerBI sanitizada una sola vez (evita refresh infinito del iframe)
  readonly safePowerBiUrl: SafeResourceUrl;

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Administración');
    this.auth = this.authService.currentUser || { nombre: 'Admin Demo' };
    this.sincronizarUsuarios();
  }

  sincronizarUsuarios(): void {
    const token = this.auth?.access;
    if (token) {
      const endpoint = this.mostrarSoloInactivos
        ? 'https://nutriscan-production-fea8.up.railway.app/users/inactive'
        : 'https://nutriscan-production-fea8.up.railway.app/users/';
      this.http.get<any>(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (res) => {
          const list = res.resultado || [];
          this.usuarios = list.map((u: any) => ({
            id: u.id,
            nombre: u.nombre,
            email: u.email,
            rol: u.rol || (u.id_rol === 1 ? 'Administrador' : u.id_rol === 2 ? 'Nutricionista' : 'Paciente'),
            estado: u.estado || 'Activo',
            identificacion: u.identificacion,
            genero: u.genero
          }));
          // Sincronizar el signal
          this.usuariosService['_usuarios'].set(this.usuarios);
          this.filtrarUsuarios();
        },
        error: (err) => {
          console.warn('Error fetching real users, using mock fallback:', err);
          this.usuarios = [...this.usuariosService.usuarios()];
          this.filtrarUsuarios();
        }
      });
    } else {
      this.usuarios = [...this.usuariosService.usuarios()];
      this.filtrarUsuarios();
    }
  }


  filtrarUsuarios(): void {
    if (this.mostrarSoloInactivos) {
      this.usuariosFiltrados = this.usuarios.filter(u => u.estado === 'Inactivo');
    } else {
      this.usuariosFiltrados = [...this.usuarios];
    }
  }

  getInitials(name: string): string {
    return name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';
  }

  getRolBadge(rol: string): string {
    const map: any = { Administrador: 'danger', Nutricionista: 'info', Paciente: 'primary' };
    return map[rol] || 'secondary';
  }

  getEstadoBadge(estado: string): string {
    return estado === 'Activo' ? 'success' : 'secondary';
  }

  countByRol(rol: string): number {
    return this.usuarios.filter(u => u.rol === rol).length;
  }

  logout(): void {
    this.authService.logout();
  }

  filtrarInactivos(): void {
    this.mostrarSoloInactivos = !this.mostrarSoloInactivos;
    this.sincronizarUsuarios();
    if (this.mostrarSoloInactivos) {
      this.addLog('Filtrando usuarios inactivos', 'info');
    } else {
      this.addLog('Mostrando todos los usuarios', 'info');
    }
  }

  abrirModal(tipo: string, dato?: Usuario): void {
    this.tipoModal = tipo;
    this.mensajeError = '';
    if (dato) {
      this.datoActual = { ...dato };
    } else if (tipo === 'crear_usuario') {
      this.datoActual = { nombre: '', email: '', identificacion: '', password: '', rol: 'Paciente', genero: 'Masculino', estado: 'Activo' };
    } else {
      this.datoActual = { nombre: '' };
    }
    this.mostrandoModal = true;
  }

  guardarModal(): void {
    this.mensajeError = '';
    const token = this.auth?.access;
    if (this.tipoModal === 'crear_usuario' || this.tipoModal === 'usuario') {
      if (!this.datoActual.nombre || !this.datoActual.email || !this.datoActual.identificacion) {
        this.mensajeError = 'Por favor completa todos los campos obligatorios.';
        return;
      }

      if (this.tipoModal === 'crear_usuario') {
        const payload = {
          nombre_completo: this.datoActual.nombre,
          email: this.datoActual.email,
          identificacion: this.datoActual.identificacion,
          password_hash: this.datoActual.password || 'Nutri123*',
          id_rol: this.datoActual.rol === 'Administrador' ? 1 : this.datoActual.rol === 'Nutricionista' ? 2 : 3,
          genero: this.datoActual.genero || 'Masculino',
          estado: this.datoActual.estado || 'Activo',
          pais: 'Colombia',
          departamento: 'Cundinamarca',
          ciudad: 'Bogotá'
        };
        this.http.post<any>('https://nutriscan-production-fea8.up.railway.app/users/', payload, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: (res) => {
            this.addLog(`Usuario creado: ${this.datoActual.nombre}`, 'success');
            this.sincronizarUsuarios();
            this.mostrandoModal = false;
          },
          error: (err) => {
            this.mensajeError = err.error?.detail || 'Error al crear el usuario en el backend.';
          }
        });
      } else {
        const payload = {
          nombre_completo: this.datoActual.nombre,
          email: this.datoActual.email,
          identificacion: this.datoActual.identificacion,
          id_rol: this.datoActual.rol === 'Administrador' ? 1 : this.datoActual.rol === 'Nutricionista' ? 2 : 3,
          genero: this.datoActual.genero || 'Masculino',
          estado: this.datoActual.estado || 'Activo'
        };
        this.http.put<any>(`https://nutriscan-production-fea8.up.railway.app/users/${this.datoActual.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        }).subscribe({
          next: () => {
            this.addLog(`Usuario modificado: ${this.datoActual.nombre}`, 'warning');
            this.sincronizarUsuarios();
            this.mostrandoModal = false;
          },
          error: (err) => {
            this.mensajeError = err.error?.detail || 'Error al actualizar el usuario en el backend.';
          }
        });
      }
    } else {
      this.mostrandoModal = false;
    }
  }

  toggleEstado(user: Usuario): void {
    const token = this.auth?.access;
    const nuevoEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const payload = {
      nombre_completo: user.nombre,
      email: user.email,
      identificacion: user.identificacion || '',
      id_rol: user.rol === 'Administrador' ? 1 : user.rol === 'Nutricionista' ? 2 : 3,
      genero: user.genero || 'Masculino',
      estado: nuevoEstado
    };
    this.http.put<any>(`https://nutriscan-production-fea8.up.railway.app/users/${user.id}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    }).subscribe({
      next: () => {
        this.addLog(`Estado de ${user.nombre} cambiado a ${nuevoEstado}`, 'info');
        this.sincronizarUsuarios();
      },
      error: (err) => {
        console.warn('Error al cambiar el estado del usuario:', err);
        // Fallback local
        this.usuariosService.toggleEstado(user.id);
        this.sincronizarUsuarios();
      }
    });
  }

  exportarReporteGeneral(): void {
    this.exportandoPdf = true;
    this.addLog('Exportando reporte general de usuarios en PDF...', 'info');
    setTimeout(() => {
      this.reportePdf.exportarReporteGeneralAdmin(this.usuarios);
      this.addLog('Reporte PDF generado y descargado correctamente.', 'success');
      this.exportandoPdf = false;
    }, 200);
  }

  private addLog(msg: string, tipo: string): void {
    const h = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs = [{ h, msg, tipo }, ...this.logs].slice(0, 50);
  }
}
