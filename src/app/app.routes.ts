import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { GuestGuard } from './guards/guest.guard';
import { PermissionGuard } from './guards/permission.guard';
import { AuthGuard } from './guards/auth.guard';
import { CompanySelectedGuard } from './guards/company-selected.guard';
import { NoCompanyGuard } from './guards/no-company.guard';
import { RootRedirectGuard } from './guards/root-redirect.guard';

export const routes: Routes = [
  // Redirección inteligente
  {
    path: '',
    canActivate: [RootRedirectGuard],
    loadComponent: () =>
      import('./pages/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },

  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },

  {
    path: 'forbidden',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/forbidden/forbidden.page').then((m) => m.ForbiddenPage),
  },

  // Rutas SIN empresa — bloqueadas si ya hay empresa seleccionada
  {
    path: 'users',
    canActivate: [AuthGuard, NoCompanyGuard, PermissionGuard],
    data: { permissions: ['USERS:READ'] },
    loadComponent: () =>
      import('./pages/users/users.page').then((m) => m.UsersPage),
  },
  {
    path: 'companies',
    canActivate: [AuthGuard, NoCompanyGuard, PermissionGuard],
    data: { permissions: ['COMPANIES:READ'] },
    loadComponent: () =>
      import('./pages/companies/companies.page').then((m) => m.CompaniesPage),
  },

  // Rutas CON empresa — todos
  {
    path: 'accounts',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_ACCOUNTS:READ'] },
    loadComponent: () =>
      import('./pages/cuentas/cuentas.page').then((m) => m.CuentasPage),
  },
  {
    path: 'profiles',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_ACCOUNTS:READ'] },
    loadComponent: () =>
      import('./pages/profiles/all-profiles-page.component').then(
        (m) => m.AllProfilesPageComponent,
      ),
  },
  {
    path: 'customers',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['CUSTOMERS:READ'] },
    loadComponent: () =>
      import('./pages/customers/customers.page').then((m) => m.CustomersPage),
  },
  {
    path: 'suppliers',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['SUPPLIERS:READ'] },
    loadComponent: () =>
      import('./pages/suppliers/suppliers.page').then((m) => m.SuppliersPage),
  },

  // Rutas CON empresa — solo Admin
  {
    path: 'campaigns',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['CUSTOMERS:READ'] },
    loadComponent: () =>
      import('./pages/campaigns/campaigns.page').then((m) => m.CampaignsPage),
  },
  {
    path: 'campaigns/:id',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['CUSTOMERS:READ'] },
    loadComponent: () =>
      import('./pages/campaign-detail/campaign-detail.page').then(
        (m) => m.CampaignDetailPage,
      ),
  },
  {
    path: 'reportes',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_SALES:READ'] },
    loadComponent: () =>
      import('./pages/reports/streaming-sales-report.page').then(
        (m) => m.StreamingSalesReportPage,
      ),
  },
  {
    path: 'kardex',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['KARDEX:READ'] },
    loadComponent: () =>
      import('./pages/kardex/kardex.page').then((m) => m.KardexPage),
  },

  // Settings y subrutas
  {
    path: 'settings',
    canActivate: [AuthGuard, CompanySelectedGuard],
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'settings/import-accounts',
    canActivate: [AuthGuard, CompanySelectedGuard, PermissionGuard],
    data: { permissions: ['STREAMING_ACCOUNTS:CREATE'] },
    loadComponent: () =>
      import('./pages/import-accounts/import-accounts.page').then(
        (m) => m.ImportAccountsPage,
      ),
  },

  { path: '**', redirectTo: 'companies' },
];
