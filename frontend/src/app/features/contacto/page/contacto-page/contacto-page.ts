import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-contacto-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contacto-page.html',
  styleUrls: ['./contacto-page.css']
})
export class ContactoPageComponent implements OnInit {
  contactoForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private titleService: Title
  ) {
    this.contactoForm = this.fb.group({
      nombre: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      asunto: ['', [Validators.required]],
      mensaje: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Contacto');
  }

  enviarMensaje(): void {
    if (this.contactoForm.invalid) return;

    const { nombre, asunto } = this.contactoForm.value;
    alert(`¡Gracias ${nombre}! Tu mensaje con el asunto "${asunto}" ha sido enviado.`);
    this.contactoForm.reset();
  }
}
