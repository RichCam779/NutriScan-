import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-acerca-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './acerca-page.html',
  styleUrls: ['./acerca-page.css']
})
export class AcercaPageComponent implements OnInit {
  visible = false;

  constructor(private titleService: Title) {}

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan Pro - Acerca de Nosotros');
    setTimeout(() => this.visible = true, 50);
  }
}
