import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

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

  private lastActivityTime: number = Date.now();
  private inactivityTimeout = 15 * 60 * 1000; // 15 minutos de inactividad
  private checkInterval: any = null;

  constructor(private router: Router, private http: HttpClient) {
    // Persistir en localStorage cuando cambia
    this._auth.subscribe(value => {
      if (value) {
        localStorage.setItem('auth', JSON.stringify(value));
        this.resetInactivityTimer();
        this.startCheckingSession();
      } else {
        localStorage.removeItem('auth');
        this.stopCheckingSession();
      }
    });

    // Registrar eventos globales para detectar actividad del usuario
    if (typeof window !== 'undefined') {
      const events = ['mousemove', 'keydown', 'click', 'scroll'];
      events.forEach(event => {
        window.addEventListener(event, () => this.resetInactivityTimer());
      });
    }
  }

  get currentUser(): AuthState | null {
    return this._auth.getValue();
  }

  setUser(user: AuthState): void {
    this._auth.next(user);
  }

  login(email: string, password: string): Observable<AuthState> {
    return this.http.post<AuthState>('http://localhost:8000/login', { email, password }).pipe(
      tap(auth => {
        this.setUser(auth);
      })
    );
  }

  loginWithGoogle(idToken: string): Observable<AuthState> {
    return this.http.post<AuthState>('http://localhost:8000/auth/google', { id_token: idToken }).pipe(
      tap(auth => {
        this.setUser(auth);
      })
    );
  }

  logout(): void {
    this._auth.next(null);
    this.router.navigate(['/login']);
  }

  private resetInactivityTimer(): void {
    this.lastActivityTime = Date.now();
  }

  private startCheckingSession(): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(() => {
      const user = this.currentUser;
      if (!user) return;

      // 1. Validar inactividad
      if (Date.now() - this.lastActivityTime > this.inactivityTimeout) {
        this.handleSessionExpired("Tu sesión ha expirado por inactividad. Por seguridad, se ha cerrado tu sesión.");
        return;
      }

      // 2. Validar expiración de JWT
      if (user.access) {
        const decoded = this.decodeToken(user.access);
        if (decoded && decoded.exp) {
          const currentTime = Math.floor(Date.now() / 1000);
          if (currentTime >= decoded.exp) {
            this.handleSessionExpired("Tu token de sesión ha expirado. Por favor, inicia sesión de nuevo.");
          }
        }
      }
    }, 10000); // Revisar cada 10 segundos
  }

  private stopCheckingSession(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private handleSessionExpired(message: string): void {
    this.stopCheckingSession();
    alert(message);
    this.logout();
  }

  private decodeToken(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const decoded = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decoded);
    } catch {
      return null;
    }
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
