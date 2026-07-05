import { Injectable, signal } from '@angular/core';

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  estado: string;
  identificacion?: string;
  genero?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private _usuarios = signal<Usuario[]>([
    { id: 1, nombre: 'Juan Pérez', email: 'juan.perez@email.com', rol: 'Paciente', estado: 'Activo', identificacion: '123276273', genero: 'Masculino' },
    { id: 2, nombre: 'Richard Gómez', email: 'richard@nutriscan.pro', rol: 'Nutricionista', estado: 'Activo', identificacion: '1130266316', genero: 'Masculino' },
    { id: 3, nombre: 'Camilo Hernández', email: 'camilo@nutriscan.pro', rol: 'Administrador', estado: 'Activo', identificacion: '1048065261', genero: 'Masculino' },
    { id: 4, nombre: 'Carlos Mendoza', email: 'carlos.mendo@email.com', rol: 'Paciente', estado: 'Inactivo', identificacion: '12723512', genero: 'Masculino' },
    { id: 5, nombre: 'Dra. Ana Restrepo', email: 'ana.restrepo@nutriscan.pro', rol: 'Nutricionista', estado: 'Activo', identificacion: '122566529', genero: 'Femenino' }
  ]);

  readonly usuarios = this._usuarios.asReadonly();

  agregarUsuario(usuario: Usuario): void {
    this._usuarios.update(lista => [...lista, usuario]);
  }

  actualizarUsuario(usuario: Usuario): void {
    this._usuarios.update(lista => lista.map(u => u.id === usuario.id ? usuario : u));
  }

  toggleEstado(id: number): void {
    this._usuarios.update(lista => lista.map(u => {
      if (u.id === id) {
        const nuevoEstado = u.estado === 'Activo' ? 'Inactivo' : 'Activo';
        return { ...u, estado: nuevoEstado };
      }
      return u;
    }));
  }
}
