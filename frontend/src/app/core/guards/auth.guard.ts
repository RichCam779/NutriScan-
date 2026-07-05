import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser) {
    return true;
  }
  router.navigate(['/login'], { replaceUrl: true });
  return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser;

  if (user && user.id_rol === 1) return true;
  router.navigate(['/login'], { replaceUrl: true });
  return false;
};

export const nutricionistaGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser;

  if (user && user.id_rol === 2) return true;
  router.navigate(['/login'], { replaceUrl: true });
  return false;
};

export const usuarioGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser;

  if (user && user.id_rol === 3) return true;
  router.navigate(['/login'], { replaceUrl: true });
  return false;
};
