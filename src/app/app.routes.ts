import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { GuestGuard } from './guards/guest.guard';
import { PermissionGuard } from './guards/permission.guard';
import { CompanySelectedGuard } from './guards/company-selected.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'correo', pathMatch: 'full' },

  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },

  // NIVEL 1
  {
    path: 'users',
    canActivate: [PermissionGuard],
    data: { permissions: ['USERS:READ'] },
    loadComponent: () =>
      import('./pages/users/users.page').then((m) => m.UsersPage),
  },

  {
    path: 'companies',
    canActivate: [PermissionGuard],
    data: { permissions: ['COMPANIES:READ'] }, // ajusta a tu permiso real
    loadComponent: () =>
      import('./pages/companies/companies.page').then((m) => m.CompaniesPage),
  },

  // NIVEL 2 (scoped) => requiere company seleccionada + permiso
  {
    path: 'suppliers',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['SUPPLIERS:READ'] },
    loadComponent: () =>
      import('./pages/suppliers/suppliers.page').then((m) => m.SuppliersPage),
  },

  {
    path: 'customers',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['CUSTOMERS:READ'] },
    loadComponent: () =>
      import('./pages/customers/customers.page').then((m) => m.CustomersPage),
  },

  {
    path: 'accounts',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_ACCOUNTS:READ'] },
    loadComponent: () =>
      import('./pages/cuentas/cuentas.page').then((m) => m.CuentasPage),
  },

  {
    path: 'reportes',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_SALES:READ'] },
    loadComponent: () =>
      import('./pages/reports/streaming-sales-report.page').then(
        (m) => m.StreamingSalesReportPage,
      ),
  },

  {
    path: 'customer/:id',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['CUSTOMERS:READ'] },
    loadComponent: () =>
      import('./pages/customer-detail/customer-detail.page').then(
        (m) => m.CustomerDetailPage,
      ),
  },

  { path: '**', redirectTo: 'users' },
];
