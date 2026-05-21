import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CompanyContextService } from '../services/company-context.service';

export const RootRedirectGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const ctx = inject(CompanyContextService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    router.navigateByUrl('/login');
    return false;
  }

  if (ctx.hasCompany()) {
    router.navigateByUrl('/accounts');
  } else {
    router.navigateByUrl('/companies');
  }
  return false;
};
