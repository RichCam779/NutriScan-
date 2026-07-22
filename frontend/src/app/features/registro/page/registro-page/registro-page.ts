import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';

interface Ubicacion {
  pais: string;
  departamento: string;
  ciudad: string;
}

@Component({
  selector: 'app-registro-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './registro-page.html',
  styleUrls: ['./registro-page.css']
})
export class RegistroPageComponent implements OnInit {
  registroForm: FormGroup;

  ubicacionesTotales: Ubicacion[] = [];

  paisesDisponibles: string[] = [];
  departamentosDisponibles: string[] = [];
  ciudadesDisponibles: string[] = [];

  fotoArchivo: any = null;
  fotoArchivoName = '';
  analizandoIA = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private titleService: Title,
    private http: HttpClient
  ) {
    this.registroForm = this.fb.group({
      identificacion: ['', [Validators.required]],
      nombreCompleto: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      genero: ['', [Validators.required]],
      pais: ['', [Validators.required]],
      departamento: ['', [Validators.required]],
      ciudad: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      terminos: [false, [Validators.requiredTrue]]
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Crear Cuenta');
    this.http.get<any>('http://localhost:8000/users/locations').subscribe({
      next: (res) => {
        this.ubicacionesTotales = res.data || [];
        this.paisesDisponibles = [...new Set(this.ubicacionesTotales.map(u => u.pais))].sort();
      },
      error: (err) => {
        console.error('Error cargando ubicaciones:', err);
        this.errorMessage = 'No se pudieron cargar las ubicaciones del servidor.';
      }
    });
  }

  onPaisChange(): void {
    const paisValue = this.registroForm.get('pais')?.value;
    this.departamentosDisponibles = [...new Set(
      this.ubicacionesTotales
        .filter(u => u.pais === paisValue)
        .map(u => u.departamento)
    )].sort();
    this.registroForm.patchValue({
      departamento: '',
      ciudad: ''
    });
    this.ciudadesDisponibles = [];
  }

  onDepartamentoChange(): void {
    const paisValue = this.registroForm.get('pais')?.value;
    const deptoValue = this.registroForm.get('departamento')?.value;
    this.ciudadesDisponibles = [...new Set(
      this.ubicacionesTotales
        .filter(u => u.pais === paisValue && u.departamento === deptoValue)
        .map(u => u.ciudad)
    )].sort();
    this.registroForm.patchValue({
      ciudad: ''
    });
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.fotoArchivo = files[0];
      this.fotoArchivoName = files[0].name;
    }
  }

  handleRegistro(): void {
    if (this.registroForm.invalid) {
      this.errorMessage = 'Por favor completa todos los campos requeridos correctamente';
      return;
    }

    const { password, confirmPassword } = this.registroForm.value;

    if (password !== confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }
    if (!this.fotoArchivo) {
      this.errorMessage = 'Por favor, sube tu foto para el análisis inicial';
      return;
    }

    this.errorMessage = '';
    this.analizandoIA = true;

    // Primero analizamos el biotipo de forma anónima
    const formData = new FormData();
    formData.append('file', this.fotoArchivo);

    this.http.post<any>('http://localhost:8000/ai/biotype-anonymous', formData).subscribe({
      next: (resIA) => {
        const biotipoDetectado = resIA.biotipo_detectado;
        const confianza = parseFloat(resIA.confianza.replace('%', '')) / 100.0;

        // Ahora registramos el usuario en el backend con el biotipo analizado
        const formVal = this.registroForm.value;
        const userRegisterPayload = {
          nombre_completo: formVal.nombreCompleto,
          email: formVal.email,
          identificacion: formVal.identificacion,
          genero: formVal.genero,
          pais: formVal.pais,
          departamento: formVal.departamento,
          ciudad: formVal.ciudad,
          password_hash: formVal.password, // El backend realiza el hashing
          id_rol: 3, // Rol de Paciente por defecto
          biotipo: biotipoDetectado,
          confianza_ia: confianza,
          estado: 'Activo'
        };

        this.http.post<any>('http://localhost:8000/users/register', userRegisterPayload).subscribe({
          next: () => {
            this.analizandoIA = false;
            alert(`¡Registro exitoso! La IA ha determinado que tu biotipo es: ${biotipoDetectado} (Confianza: ${(confianza * 100).toFixed(2)}%)`);
            this.router.navigate(['/login']);
          },
          error: (errReg) => {
            this.analizandoIA = false;
            this.errorMessage = errReg.error?.detail || 'Error al crear la cuenta del usuario.';
          }
        });
      },
      error: (errIA) => {
        this.analizandoIA = false;
        this.errorMessage = errIA.error?.detail || 'Error en la visión artificial al analizar tu biotipo corporal.';
      }
    });
  }
}
