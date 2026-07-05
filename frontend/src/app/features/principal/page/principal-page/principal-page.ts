import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-principal-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './principal-page.html',
  styleUrls: ['./principal-page.css']
})
export class PrincipalPageComponent implements OnInit {
  constructor(private titleService: Title) {}

  ngOnInit(): void {
    this.titleService.setTitle('NutriScan - Inicio');
  }
}
