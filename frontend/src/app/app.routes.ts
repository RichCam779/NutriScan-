import { Routes } from '@angular/router';
import { adminGuard, nutricionistaGuard, usuarioGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/principal/page/principal-page/principal-page').then(m => m.PrincipalPageComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./features/login/page/login-page/login-page').then(m => m.LoginPageComponent)
  },
  {
    path: 'recuperar',
    loadComponent: () => import('./features/login/page/recuperar-page/recuperar-page').then(m => m.RecuperarPageComponent)
  },
  {
    path: 'acerca',
    loadComponent: () => import('./features/acerca/page/acerca-page/acerca-page').then(m => m.AcercaPageComponent)
  },
  {
    path: 'contacto',
    loadComponent: () => import('./features/contacto/page/contacto-page/contacto-page').then(m => m.ContactoPageComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/page/admin-page/admin-page').then(m => m.AdminPageComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'usuario',
    loadComponent: () => import('./features/usuario/page/usuario-page/usuario-page').then(m => m.UsuarioPageComponent),
    canActivate: [usuarioGuard]
  },
  {
    path: 'nutricionista',
    loadComponent: () => import('./features/nutricionista/page/nutricionista-page/nutricionista-page').then(m => m.NutricionistaPageComponent),
    canActivate: [nutricionistaGuard]
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/registro/page/registro-page/registro-page').then(m => m.RegistroPageComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];

