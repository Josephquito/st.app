import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';
import { CompaniesService, CompanyDTO } from '../../services/companies.service';
import { CompanyContextService } from '../../services/company-context.service';
import { parseApiError } from '../../utils/error.utils';

import { CreateCompanyModal } from '../../modales/companies/create-company/create-company.modal';
import { EditCompanyModal } from '../../modales/companies/edit-company/edit-company.modal';
import { DeleteCompanyModal } from '../../modales/companies/delete-company/delete-company.modal';
import { ManageCompanyUsersModal } from '../../modales/companies/manage-company-users/manage-company-users.modal';
import { StatusPipe } from '../../pipes/status.pipe';

@Component({
  selector: 'app-companies-page',
  standalone: true,
  imports: [
    CommonModule,
    CreateCompanyModal,
    EditCompanyModal,
    DeleteCompanyModal,
    ManageCompanyUsersModal,
    StatusPipe,
  ],
  templateUrl: './companies.page.html',
  styleUrls: ['./companies.page.css'],
})
export class CompaniesPage implements OnInit {
  api = inject(CompaniesService);
  auth = inject(AuthService);
  companyCtx = inject(CompanyContextService);
  router = inject(Router);

  loading = false;
  loadingRowId: number | null = null;
  errorMessage = '';
  companies: CompanyDTO[] = [];

  createOpen = false;
  editOpen = false;
  deleteOpen = false;
  membersOpen = false;

  selected: CompanyDTO | null = null;

  menuOpen = false;
  menuCompany: CompanyDTO | null = null;
  menuX = 0;
  menuY = 0;

  get canCreate() {
    return this.auth.hasPermission('COMPANIES:CREATE');
  }
  get canRead() {
    return this.auth.hasPermission('COMPANIES:READ');
  }
  get canUpdate() {
    return this.auth.hasPermission('COMPANIES:UPDATE');
  }
  get canDelete() {
    return this.auth.hasPermission('COMPANIES:DELETE');
  }
  get canMembersRead() {
    return this.auth.hasPermission('COMPANIES-USERS:READ');
  }
  get canMembersUpdate() {
    return this.auth.hasPermission('COMPANIES-USERS:UPDATE');
  }

  get activeCompanyId() {
    return this.companyCtx.companyId();
  }

  ngOnInit() {
    this.load();
  }

  async load() {
    this.errorMessage = '';
    this.loading = true;
    try {
      this.companies = await this.api.findAll();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  // ======================
  // Menú contextual
  // ======================
  toggleMenu(c: CompanyDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.menuOpen && this.menuCompany?.id === c.id) {
      this.closeMenu();
      return;
    }

    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.menuX = rect.right;
    this.menuY = rect.bottom + 6;
    this.menuCompany = c;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuCompany = null;
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeMenu();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.closeMenu();
  }

  @HostListener('window:resize')
  onResize() {
    this.closeMenu();
  }

  // ======================
  // Acciones
  // ======================
  openCreate() {
    this.closeAll();
    this.createOpen = true;
  }

  openEdit(c: CompanyDTO) {
    this.closeAll();
    this.selected = c;
    this.editOpen = true;
  }

  confirmDelete(c: CompanyDTO) {
    this.closeAll();
    this.selected = c;
    this.deleteOpen = true;
  }

  openMembers(c: CompanyDTO) {
    this.closeAll();
    this.selected = c;
    this.membersOpen = true;
  }

  closeAll() {
    this.createOpen = false;
    this.editOpen = false;
    this.deleteOpen = false;
    this.membersOpen = false;
    this.selected = null;
    this.closeMenu();
  }

  // ======================
  // Eventos modales
  // ======================
  onCreated() {
    this.closeAll();
    this.load();
  }
  onUpdated() {
    this.closeAll();
    this.load();
  }

  onMembersUpdated() {
    this.load();
  }

  onDeleted() {
    if (this.selected?.id === this.activeCompanyId) {
      this.companyCtx.setCompanyId(null);
    }
    this.closeAll();
    this.load();
  }

  closeMembers() {
    this.membersOpen = false;
    this.selected = null;
  }

  // ======================
  // Selección de company
  // ======================
  selectCompany(c: CompanyDTO) {
    this.companyCtx.setActiveCompany({ id: c.id, name: c.name });
    this.router.navigateByUrl('/suppliers');
  }

  isActive(c: CompanyDTO) {
    return this.companyCtx.companyId() === c.id;
  }
}
