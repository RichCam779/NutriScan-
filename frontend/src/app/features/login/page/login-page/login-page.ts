import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login-page.html',
  styleUrls: ['./login-page.css']
})
export class LoginPageComponent implements OnInit {
  loginForm: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private titleService: Title
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

  async handleLogin(): Promise<void> {
    if (this.loginForm.invalid) {
      this.error = 'Por favor ingresa tu correo y contraseña válidos';
      return;
    }
    this.loading = true;
    this.error = '';

    const { email, password } = this.loginForm.value;

    setTimeout(() => {
      // Login simulado
      let roleId = 3; // Por defecto paciente
      let nombre = 'Juan Pérez';

      if (email === 'camilo@nutriscan.pro' || email.includes('admin')) {
        roleId = 1;
        nombre = 'Camilo Hernández';
      } else if (email === 'richard@nutriscan.pro' || email.includes('nutri')) {
        roleId = 2;
        nombre = 'Richard Gómez';
      }

      this.authService.setUser({
        id_usuario: 100,
        nombre: nombre,
        email: email,
        id_rol: roleId,
        access: 'mock-access-token-jwt-12345'
      });

      this.loading = false;
      this.redirectByRole(roleId);
    }, 1000);
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
