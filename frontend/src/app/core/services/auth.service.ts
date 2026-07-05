import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthState {
  id_usuario: number;
  nombre: string;
  email: string;
  id_rol: number;
  access: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _auth = new BehaviorSubject<AuthState | null>(this.loadFromStorage());

  readonly currentUser$ = this._auth.asObservable();

  constructor(private router: Router) {
    // Persistir en localStorage cuando cambia
    this._auth.subscribe(value => {
      if (value) {
        localStorage.setItem('auth', JSON.stringify(value));
      } else {
        localStorage.removeItem('auth');
      }
    });
  }

  get currentUser(): AuthState | null {
    return this._auth.getValue();
  }

  setUser(user: AuthState): void {
    this._auth.next(user);
  }

  logout(): void {
    this._auth.next(null);
    this.router.navigate(['/login']);
  }

  private loadFromStorage(): AuthState | null {
    try {
      const stored = localStorage.getItem('auth');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }
}
