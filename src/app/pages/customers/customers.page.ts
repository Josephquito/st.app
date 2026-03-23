import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import {
  CustomersService,
  CustomerDTO,
  CustomerSource,
  CustomerStatusFilter,
  CustomerSortBy,
  SortOrder,
} from '../../services/customers.service';
import { parseApiError } from '../../utils/error.utils';

import { CreateCustomerModal } from '../../modales/customers/create-customer/create-customer.modal';
import { EditCustomerModal } from '../../modales/customers/edit-customer/edit-customer.modal';
import { DeleteCustomerModal } from '../../modales/customers/delete-customer/delete-customer.modal';
import { ImportExportCustomerModal } from '../../modales/customers/import-export-customer/import-export-customer.modal';
import { CustomerDrawerComponent } from '../../components/customer-drawer/customer-drawer.component';
import { StatusPipe } from '../../pipes/status.pipe';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CreateCustomerModal,
    EditCustomerModal,
    DeleteCustomerModal,
    ImportExportCustomerModal,
    CustomerDrawerComponent,
    StatusPipe,
  ],
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.css'],
})
export class CustomersPage implements OnInit {
  api = inject(CustomersService);
  auth = inject(AuthService);

  loading = false;
  errorMessage = '';
  customers: CustomerDTO[] = [];

  // Paginación
  currentPage = 1;
  totalPages = 1;
  total = 0;
  readonly pageSize = 50;

  // Filtros y orden
  search = '';
  statusFilter: CustomerStatusFilter | '' = '';
  sourceFilter: CustomerSource | '' = '';
  sortBy: CustomerSortBy = 'name';
  sortOrder: SortOrder = 'asc';

  // Debounce search
  private searchTimer: any;

  // Modales
  createOpen = false;
  editOpen = false;
  deleteOpen = false;
  importExportOpen = false;
  selected: CustomerDTO | null = null;

  // Drawer
  drawerOpen = false;
  drawerCustomer: CustomerDTO | null = null;

  // Menú contextual
  menuOpen = false;
  menuCustomer: CustomerDTO | null = null;
  menuX = 0;
  menuY = 0;

  readonly statusOptions: {
    value: CustomerStatusFilter | '';
    label: string;
  }[] = [
    { value: '', label: 'Todos los estados' },
    { value: 'ACTIVE', label: 'Activos' },
    { value: 'INACTIVE', label: 'Inactivos' },
    { value: 'PROSPECT', label: 'Prospectos' },
  ];

  readonly sourceOptions: { value: CustomerSource | ''; label: string }[] = [
    { value: '', label: 'Todos los orígenes' },
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'REFERRAL', label: 'Referido' },
    { value: 'OTHER', label: 'Otro' },
  ];

  readonly sortOptions: { value: CustomerSortBy; label: string }[] = [
    { value: 'name', label: 'Por nombre' },
    { value: 'lastPurchaseAt', label: 'Última compra' },
    { value: 'createdAt', label: 'Fecha registro' },
    { value: 'balance', label: 'Saldo' },
  ];

  get canCreate() {
    return this.auth.hasPermission('CUSTOMERS:CREATE');
  }
  get canRead() {
    return this.auth.hasPermission('CUSTOMERS:READ');
  }
  get canUpdate() {
    return this.auth.hasPermission('CUSTOMERS:UPDATE');
  }
  get canDelete() {
    return this.auth.hasPermission('CUSTOMERS:DELETE');
  }

  ngOnInit() {
    this.load();
  }

  async load(page = 1) {
    this.loading = true;
    this.errorMessage = '';
    this.currentPage = page;
    try {
      const res = await this.api.findAll({
        search: this.search || undefined,
        status: this.statusFilter || undefined,
        source: this.sourceFilter || undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        page,
        limit: this.pageSize,
      });
      this.customers = res.data;
      this.total = res.meta.total;
      this.totalPages = res.meta.totalPages;
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  onSearchChange() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(1), 350);
  }

  onFilterChange() {
    this.load(1);
  }

  toggleSort(field: CustomerSortBy) {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'asc';
    }
    this.load(1);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.load(page);
  }

  // ── Drawer ────────────────────────────────────────────────────────────────

  openDrawer(c: CustomerDTO) {
    this.closeMenu();
    this.drawerCustomer = c;
    this.drawerOpen = true;
  }

  closeDrawer() {
    this.drawerOpen = false;
    this.drawerCustomer = null;
  }

  onDrawerNotesUpdated(event: { notes: string; customerId: number }) {
    const c = this.customers.find((x) => x.id === event.customerId);
    if (c) c.notes = event.notes;
  }

  onDrawerEdit(c: CustomerDTO) {
    this.drawerOpen = false;
    this.openEdit(c);
  }

  onDrawerDelete(c: CustomerDTO) {
    this.drawerOpen = false;
    this.confirmDelete(c);
  }

  // ── Menú contextual ───────────────────────────────────────────────────────

  toggleMenu(c: CustomerDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (this.menuOpen && this.menuCustomer?.id === c.id) {
      this.closeMenu();
      return;
    }
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuX = rect.right;
    this.menuY = rect.bottom + 6;
    this.menuCustomer = c;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuCustomer = null;
  }

  @HostListener('document:click') onDocClick() {
    this.closeMenu();
  }
  @HostListener('window:scroll') onScroll() {
    this.closeMenu();
  }
  @HostListener('window:resize') onResize() {
    this.closeMenu();
  }

  // ── Acciones modales ──────────────────────────────────────────────────────

  openCreate() {
    this.closeAll();
    this.createOpen = true;
  }
  openImportExport() {
    this.closeAll();
    this.importExportOpen = true;
  }

  openEdit(c: CustomerDTO) {
    this.closeAll();
    this.selected = c;
    this.editOpen = true;
  }
  confirmDelete(c: CustomerDTO) {
    this.closeAll();
    this.selected = c;
    this.deleteOpen = true;
  }

  closeAll() {
    this.createOpen = false;
    this.editOpen = false;
    this.deleteOpen = false;
    this.importExportOpen = false;
    this.drawerOpen = false;
    this.drawerCustomer = null;
    this.selected = null;
    this.closeMenu();
  }

  onCreated() {
    this.closeAll();
    this.load(1);
  }
  onUpdated() {
    this.closeAll();
    this.load(this.currentPage);
  }
  onDeleted() {
    this.closeAll();
    this.load(1);
  }
  onImported() {
    this.closeAll();
    this.load(1);
  }
}
