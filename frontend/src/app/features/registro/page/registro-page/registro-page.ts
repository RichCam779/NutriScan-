import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

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

  ubicacionesTotales: Ubicacion[] = [
    { pais: 'Colombia', departamento: 'Cundinamarca', ciudad: 'Bogotá' },
    { pais: 'Colombia', departamento: 'Antioquia', ciudad: 'Medellín' },
    { pais: 'Colombia', departamento: 'Valle del Cauca', ciudad: 'Cali' },
    { pais: 'Colombia', departamento: 'Atlántico', ciudad: 'Barranquilla' },
    { pais: 'México', departamento: 'CDMX', ciudad: 'Ciudad de México' },
    { pais: 'México', departamento: 'Jalisco', ciudad: 'Guadalajara' },
    { pais: 'Argentina', departamento: 'Buenos Aires', ciudad: 'Buenos Aires' }
  ];

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
    private titleService: Title
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
    this.paisesDisponibles = [...new Set(this.ubicacionesTotales.map(u => u.pais))].sort();
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

    // Simular escaneo de biotipo YOLOv8
    setTimeout(() => {
      this.analizandoIA = false;
      const biotipos = ['Mesomorfo', 'Ectomorfo', 'Endomorfo'];
      const biotipoResultado = biotipos[Math.floor(Math.random() * biotipos.length)];

      alert(`¡Registro exitoso! La IA ha determinado que tu biotipo es: ${biotipoResultado} (Visión YOLOv8 simulada correctamente)`);
      this.router.navigate(['/login']);
    }, 2500);
  }
}
