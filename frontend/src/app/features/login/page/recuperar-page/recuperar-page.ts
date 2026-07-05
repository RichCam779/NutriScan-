import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-recuperar-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './recuperar-page.html',
  styleUrls: ['./recuperar-page.css']
})
export class RecuperarPageComponent implements OnInit {
  recuperarForm: FormGroup;
  loading = false;
  success = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private titleService: Title
  ) {
    this.recuperarForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Recuperar Contraseña');
  }

  handleRecuperar(): void {
    if (this.recuperarForm.invalid) return;

    this.loading = true;
    this.error = '';
    this.success = false;

    // Simular el envío de correo de recuperación
    setTimeout(() => {
      this.loading = false;
      this.success = true;
    }, 1500);
  }
}
