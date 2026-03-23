import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { CompanyContextService } from '../services/company-context.service';

export const companyScopeInterceptor: HttpInterceptorFn = (req, next) => {
  const ctx = inject(CompanyContextService);

  // Rutas de auth no necesitan company context
  if (req.url.includes('/auth/login')) return next(req);

  const companyId = ctx.companyId();
  if (!companyId) return next(req);

  return next(
    req.clone({
      setHeaders: { 'x-company-id': String(companyId) },
    }),
  );
};
