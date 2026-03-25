import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { GuestGuard } from './guards/guest.guard';
import { PermissionGuard } from './guards/permission.guard';
import { AuthGuard } from './guards/auth.guard';
import { CompanySelectedGuard } from './guards/company-selected.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'companies', pathMatch: 'full' },

  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },

  {
    path: 'forbidden',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },

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
    data: { permissions: ['COMPANIES:READ'] },
    loadComponent: () =>
      import('./pages/companies/companies.page').then((m) => m.CompaniesPage),
  },

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
    path: 'kardex',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['KARDEX:READ'] },
    loadComponent: () =>
      import('./pages/kardex/kardex.page').then((m) => m.KardexPage),
  },
  {
    path: 'import/accounts',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_ACCOUNTS:CREATE'] },
    loadComponent: () =>
      import('./pages/import-accounts/import-accounts.page').then(
        (m) => m.ImportAccountsPage,
      ),
  },
  {
    path: 'profiles',
    canActivate: [CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_ACCOUNTS:READ'] },
    loadComponent: () =>
      import('./pages/profiles/all-profiles-page.component').then(
        (m) => m.AllProfilesPageComponent,
      ),
  },
  { path: '**', redirectTo: 'companies' },
];
