import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type AppRole = 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE';

type JwtPayload = { exp?: number; [k: string]: any };

export type Me = {
  id: number;
  email: string;
  role: AppRole;
  permissions: string[];
  nombre?: string;
};

type LoginResponse = { access_token: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private tokenKey = 'access_token';
  private meKey = 'me';

  private logoutInProgress = false;
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;

  private meSig = signal<Me | null>(null);

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  constructor() {
    if (!this.isBrowser()) return;

    const raw = localStorage.getItem(this.meKey);
    if (raw) {
      try {
        this.meSig.set(JSON.parse(raw) as Me);
      } catch {
        // ignore
      }
    }

    const t = this.getToken();
    if (t) this.scheduleAutoLogout(t);
  }

  // ======================
  // API calls
  // ======================
  login(email: string, password: string) {
    return firstValueFrom(
      this.http.post<LoginResponse>(`${this.base}/auth/login`, {
        email,
        password,
      }),
    );
  }

  fetchMe() {
    return firstValueFrom(this.http.get<Me>(`${this.base}/users/me`));
  }

  // ======================
  // Token
  // ======================
  setToken(token: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(this.tokenKey, token);
    this.scheduleAutoLogout(token);
  }

  getToken(): string | null {
    return this.isBrowser() ? localStorage.getItem(this.tokenKey) : null;
  }

  // ======================
  // Me
  // ======================
  setMe(me: Me | null): void {
    this.meSig.set(me);
    if (!this.isBrowser()) return;
    if (!me) {
      localStorage.removeItem(this.meKey);
      return;
    }
    localStorage.setItem(this.meKey, JSON.stringify(me));
  }

  clearMe(): void {
    this.setMe(null);
  }

  // ======================
  // Signals / computed
  // ======================
  me = computed(() => this.meSig());
  permissions = computed(() => this.meSig()?.permissions ?? []);
  role = computed<AppRole | null>(() => this.meSig()?.role ?? null);
  isLoggedIn = computed(() => !!this.meSig() && this.isAuthenticated());

  // ======================
  // Permission helpers
  // ======================
  hasPermission(p: string): boolean {
    return this.permissions().includes(p);
  }

  hasAnyPermission(perms: string[]): boolean {
    const set = new Set(this.permissions());
    return perms.some((p) => set.has(p));
  }

  hasAllPermissions(perms: string[]): boolean {
    const set = new Set(this.permissions());
    return perms.every((p) => set.has(p));
  }

  isAdmin(): boolean {
    const r = this.role();
    return r === 'ADMIN' || r === 'SUPERADMIN';
  }

  // ======================
  // Auth checks
  // ======================
  isAuthenticated(): boolean {
    if (!this.isBrowser()) return false;
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  }

  // ======================
  // Logout
  // ======================
  logout(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.meKey);
    this.meSig.set(null);
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
  }

  logoutAndRedirect(): void {
    this.logout();
    sessionStorage.setItem('sessionExpired', '1');
    this.router.navigate(['/login']);
  }

  // ======================
  // Expiration
  // ======================
  isTokenExpired(token: string): boolean {
    const payload = this.decodeJwt(token);
    const exp = payload?.exp;
    if (!exp) return true;
    return exp <= Math.floor(Date.now() / 1000);
  }

  private decodeJwt(token: string): JwtPayload | null {
    try {
      const part = token.split('.')[1];
      if (!part) return null;
      const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        '=',
      );
      return JSON.parse(atob(padded)) as JwtPayload;
    } catch {
      return null;
    }
  }

  scheduleAutoLogout(token?: string): void {
    if (!this.isBrowser()) return;
    const t = token ?? this.getToken();
    if (!t) return;

    const payload = this.decodeJwt(t);
    const exp = payload?.exp;

    if (!exp) {
      this.forceSessionExpired();
      return;
    }

    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }

    const msLeft = exp * 1000 - Date.now() - 30_000;

    if (msLeft <= 0) {
      this.forceSessionExpired();
      return;
    }

    this.logoutTimer = setTimeout(() => this.forceSessionExpired(), msLeft);
  }

  forceSessionExpired(): void {
    if (!this.isBrowser()) return;
    if (this.logoutInProgress) return;
    this.logoutInProgress = true;
    this.logoutAndRedirect();
    this.logoutInProgress = false;
  }
}
