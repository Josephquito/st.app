import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; // <--- Importante

import { AuthService } from '../../services/auth.service';
import {
  CustomersService,
  CustomerDTO,
} from '../../services/customers.service';

import { CreateCustomerModal } from '../../modales/customers/create-customer/create-customer.modal';
import { EditCustomerModal } from '../../modales/customers/edit-customer/edit-customer.modal';
import { DeleteCustomerModal } from '../../modales/customers/delete-customer/delete-customer.modal';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [
    CommonModule,
    CreateCustomerModal,
    EditCustomerModal,
    DeleteCustomerModal,
  ],
  templateUrl: './customers.page.html',
  styleUrls: ['./customers.page.css'],
})
export class CustomersPage {
  api = inject(CustomersService);
  auth = inject(AuthService);
  private router = inject(Router); // <--- Inyectar Router

  loading = false;
  loadingRowId: number | null = null;

  errorMessage = '';
  customers: CustomerDTO[] = [];

  // Modales
  createOpen = false;
  editOpen = false;
  deleteOpen = false;

  selected: CustomerDTO | null = null;

  // Menú flotante
  menuOpen = false;
  menuCustomer: CustomerDTO | null = null;
  menuX = 0;
  menuY = 0;

  // permisos
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

  async load() {
    this.errorMessage = '';
    if (!this.canRead) {
      this.customers = [];
      this.errorMessage =
        'No tienes permiso para ver clientes (CUSTOMERS:READ).';
      return;
    }
    this.loading = true;
    try {
      this.customers = await this.api.findAll();
    } catch (e: any) {
      this.errorMessage = e?.error?.message ?? 'No se pudo cargar clientes.';
    } finally {
      this.loading = false;
    }
  }

  // ✅ Nueva función de navegación
  goToDetail(customerId: number) {
    // Usamos la ruta que definiste en tu routing
    this.router.navigate(['/customer', customerId]);
  }

  // acciones header
  openCreate() {
    this.selected = null;
    this.createOpen = true;
    this.editOpen = false;
    this.deleteOpen = false;
  }

  // menú
  toggleMenu(c: CustomerDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (this.menuOpen && this.menuCustomer?.id === c.id) {
      this.closeMenu();
      return;
    }
    this.menuOpen = true;
    this.menuCustomer = c;
    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.menuX = rect.right;
    this.menuY = rect.bottom + 6;
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

  openEdit(c: CustomerDTO) {
    this.selected = c;
    this.editOpen = true;
    this.createOpen = false;
    this.deleteOpen = false;
  }

  confirmDelete(c: CustomerDTO) {
    this.selected = c;
    this.deleteOpen = true;
    this.createOpen = false;
    this.editOpen = false;
  }

  closeAll() {
    this.createOpen = false;
    this.editOpen = false;
    this.deleteOpen = false;
    this.selected = null;
  }

  onCreated() {
    this.closeAll();
    this.load();
  }
  onUpdated() {
    this.closeAll();
    this.load();
  }
  onDeleted() {
    this.closeAll();
    this.load();
  }
}
