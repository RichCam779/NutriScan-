import { Component, OnInit, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';

// Google Client ID
const GOOGLE_CLIENT_ID = '147789098664-tjsh2kd7p4ioo8athlbrqm2nnqqom96s.apps.googleusercontent.com';

// Declaración para TypeScript de la API global de Google Identity Services
declare const google: any;

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css']
})
export class LoginPageComponent implements OnInit, AfterViewInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;
  googleClientId = GOOGLE_CLIENT_ID;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private titleService: Title,
    private ngZone: NgZone
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Iniciar Sesión');
    if (this.authService.currentUser) {
      this.redirectByRole(this.authService.currentUser.id_rol);
    }
  }

  ngAfterViewInit(): void {
    this.initGoogleButton();
  }

  private initGoogleButton(): void {
    const checkGoogleInterval = setInterval(() => {
      if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        clearInterval(checkGoogleInterval);
        
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => this.handleGoogleCallback(response)
        });

        const btnContainer = document.getElementById('google-btn-official');
        if (btnContainer) {
          google.accounts.id.renderButton(btnContainer, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'rectangular',
            logo_alignment: 'left',
            width: 320
          });
        }
      }
    }, 200);
  }

  handleLogin(): void {
    if (this.loginForm.invalid) {
      this.error = 'Por favor ingresa tu correo y contraseña válidos';
      return;
    }
    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: (auth) => {
        this.loading = false;
        this.redirectByRole(auth.id_rol);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.detail || 'Error de autenticación. Verifica tus credenciales.';
      }
    });
  }

  loginWithGoogle(): void {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      google.accounts.id.prompt();
    } else {
      this.error = 'El servicio de Google no está disponible. Revisa tu conexión a internet.';
    }
  }

  private handleGoogleCallback(response: any): void {
    if (!response.credential) {
      this.ngZone.run(() => {
        this.error = 'No se pudo obtener el token de Google.';
      });
      return;
    }

    this.ngZone.run(() => {
      this.loading = true;
      this.error = '';

      this.authService.loginWithGoogle(response.credential).subscribe({
        next: (auth) => {
          this.loading = false;
          this.redirectByRole(auth.id_rol);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.detail || 'Error al iniciar sesión con Google.';
        }
      });
    });
  }


  loginComo(roleId: number): void {
    let nombre = 'Juan Pérez';
    let email = 'juan.perez@email.com';

    if (roleId === 1) {
      nombre = 'Camilo Hernández';
      email = 'camilo@nutriscan.pro';
    } else if (roleId === 2) {
      nombre = 'Richard Gómez';
      email = 'richard@nutriscan.pro';
    }

    this.authService.setUser({
      id_usuario: roleId * 10,
      nombre: nombre,
      email: email,
      id_rol: roleId,
      access: 'mock-access-token-jwt-12345'
    });

    this.redirectByRole(roleId);
  }

  redirectByRole(roleId: number): void {
    if (roleId === 1) this.router.navigate(['/admin']);
    else if (roleId === 2) this.router.navigate(['/nutricionista']);
    else this.router.navigate(['/usuario']);
  }
}
