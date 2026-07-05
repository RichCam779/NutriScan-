import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService, Usuario } from '../../services/usuarios.service';

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

  mostrandoModal = false;
  tipoModal = '';
  datoActual: any = {};
  mensajeError = '';
  mostrarSoloInactivos = false;

  logs: LogEntry[] = [
    { h: '14:05', msg: 'Sistema iniciado correctamente', tipo: 'success' },
    { h: '13:40', msg: 'Respaldo de base de datos completado', tipo: 'info' }
  ];

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private router: Router,
    private titleService: Title
  ) { }

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Administración');
    this.auth = this.authService.currentUser || { nombre: 'Admin Demo' };
    this.sincronizarUsuarios();
  }

  sincronizarUsuarios(): void {
    this.usuarios = [...this.usuariosService.usuarios()];
    this.filtrarUsuarios();
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
    if (this.tipoModal === 'crear_usuario' || this.tipoModal === 'usuario') {
      if (!this.datoActual.nombre || !this.datoActual.email || !this.datoActual.identificacion) {
        this.mensajeError = 'Por favor completa todos los campos obligatorios.';
        return;
      }

      if (this.tipoModal === 'crear_usuario') {
        const nuevoId = this.usuariosService.usuarios().length > 0 ? Math.max(...this.usuariosService.usuarios().map(u => u.id)) + 1 : 1;
        const nuevoUsuario: Usuario = {
          id: nuevoId,
          nombre: this.datoActual.nombre,
          email: this.datoActual.email,
          rol: this.datoActual.rol,
          estado: this.datoActual.estado || 'Activo',
          identificacion: this.datoActual.identificacion,
          genero: this.datoActual.genero || 'Masculino'
        };
        this.usuariosService.agregarUsuario(nuevoUsuario);
        this.addLog(`Usuario creado: ${nuevoUsuario.nombre} (${nuevoUsuario.rol})`, 'success');
      } else {
        this.usuariosService.actualizarUsuario(this.datoActual);
        this.addLog(`Usuario modificado: ${this.datoActual.nombre}`, 'warning');
      }
    } else if (this.tipoModal === 'rol') {
      if (!this.datoActual.nombre) {
        this.mensajeError = 'Por favor indica el nombre del rol.';
        return;
      }
      this.addLog(`Rol creado: ${this.datoActual.nombre}`, 'success');
    } else if (this.tipoModal === 'permiso') {
      if (!this.datoActual.nombre) {
        this.mensajeError = 'Por favor indica el nombre del permiso.';
        return;
      }
      this.addLog(`Permiso creado: ${this.datoActual.nombre}`, 'success');
    }

    this.sincronizarUsuarios();
    this.mostrandoModal = false;
  }

  toggleEstado(user: Usuario): void {
    this.usuariosService.toggleEstado(user.id);
    const nuevoEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
    this.addLog(`Estado de ${user.nombre} cambiado a ${nuevoEstado}`, 'info');
    this.sincronizarUsuarios();
  }

  private addLog(msg: string, tipo: string): void {
    const h = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.logs = [{ h, msg, tipo }, ...this.logs].slice(0, 50);
  }
}
