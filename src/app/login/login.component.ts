import { Component, inject, PLATFORM_ID, OnInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  errorMessage = '';
  cargando = false;
  expired = false;

  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    if (this.auth.isLoggedIn()) {
      sessionStorage.removeItem('sessionExpired');
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      this.router.navigateByUrl(returnUrl ?? '/companies');
      return;
    }

    const flag = sessionStorage.getItem('sessionExpired');
    if (flag === '1') {
      sessionStorage.removeItem('sessionExpired');
      this.expired = true;
    }
  }

  async login(): Promise<void> {
    if (this.cargando) return;

    const email = this.email.trim();
    const password = this.password;

    if (!email || !password) {
      this.errorMessage = 'Ingresa correo y contraseña';
      return;
    }

    this.cargando = true;
    this.errorMessage = '';
    this.expired = false;

    try {
      const { access_token } = await this.auth.login(email, password);
      this.auth.setToken(access_token);

      const me = await this.auth.fetchMe();
      this.auth.setMe(me);

      const returnUrl =
        this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
      this.router.navigateByUrl(returnUrl);
    } catch (err: any) {
      if (err?.url?.includes('/users/me')) {
        this.auth.logout();
      }
      this.errorMessage = this.parseError(err);
    } finally {
      this.cargando = false;
    }
  }

  private parseError(err: any): string {
    const msg = err?.error?.message;
    if (!msg) {
      if (err?.status === 0) return 'No se pudo conectar al servidor';
      return `Error ${err?.status || ''} al iniciar sesión`;
    }
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
    return JSON.stringify(msg);
  }
}
