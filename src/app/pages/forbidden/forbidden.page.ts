// src/app/pages/forbidden/forbidden.page.ts
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forbidden-page',
  standalone: true,
  templateUrl: './forbidden.page.html',
  styleUrl: './forbidden.page.css',
})
export class ForbiddenPage {
  private router = inject(Router);
  private auth = inject(AuthService);

  goHome() {
    const role = this.auth.role();
    if (role === 'SUPERADMIN') this.router.navigateByUrl('/users');
    else this.router.navigateByUrl('/companies');
  }
}
