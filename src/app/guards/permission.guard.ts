import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  Router,
  UrlTree,
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class PermissionGuard implements CanActivate {
  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    // Sin sesión → login
    if (!this.auth.isLoggedIn()) {
      return this.router.parseUrl('/login');
    }

    const required = route.data['permissions'] as string[] | undefined;
    if (!required || required.length === 0) return true;

    if (this.auth.hasAllPermissions(required)) return true;

    // Logueado pero sin permisos → forbidden
    return this.router.parseUrl('/forbidden');
  }
}
