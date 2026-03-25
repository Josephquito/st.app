import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import {
  SuppliersService,
  SupplierDTO,
} from '../../services/suppliers.service';
import { parseApiError } from '../../utils/error.utils';

import { CreateSupplierModal } from '../../modales/suppliers/create-supplier/create-supplier.modal';
import { EditSupplierModal } from '../../modales/suppliers/edit-supplier/edit-supplier.modal';
import { AdjustBalanceModal } from '../../modales/suppliers/adjust-balance/adjust-balance.modal';
import { SupplierDrawerComponent } from '../../components/supplier-drawer/supplier-drawer.component';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';

@Component({
  selector: 'app-suppliers-page',
  standalone: true,
  imports: [
    CommonModule,
    CreateSupplierModal,
    EditSupplierModal,
    AdjustBalanceModal,
    SupplierDrawerComponent,
    ConfirmActionModal,
  ],
  templateUrl: './suppliers.page.html',
  styleUrls: ['./suppliers.page.css'],
})
export class SuppliersPage implements OnInit {
  api = inject(SuppliersService);
  auth = inject(AuthService);

  loading = false;
  errorMessage = '';
  suppliers: SupplierDTO[] = [];

  createOpen = false;
  editOpen = false;
  deleteOpen = false;
  balanceOpen = false;
  selected: SupplierDTO | null = null;

  drawerSupplier: SupplierDTO | null = null;

  menuOpen = false;
  menuSupplier: SupplierDTO | null = null;
  menuX = 0;
  menuY = 0;
  menuDirection: 'down' | 'up' = 'down';

  loadingDelete = false;

  get canCreate() {
    return this.auth.hasPermission('SUPPLIERS:CREATE');
  }
  get canUpdate() {
    return this.auth.hasPermission('SUPPLIERS:UPDATE');
  }
  get canDelete() {
    return this.auth.hasPermission('SUPPLIERS:DELETE');
  }

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.suppliers = await this.api.findAll();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  private syncDrawer() {
    if (!this.drawerSupplier) return;
    const refreshed = this.suppliers.find(
      (s) => s.id === this.drawerSupplier!.id,
    );
    if (refreshed) this.drawerSupplier = { ...refreshed };
  }

  // ======================
  // Drawer
  // ======================
  openDrawer(s: SupplierDTO) {
    this.drawerSupplier = s;
  }

  closeDrawer() {
    this.drawerSupplier = null;
  }

  // ======================
  // Menú contextual
  // ======================
  toggleMenu(s: SupplierDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.menuOpen && this.menuSupplier?.id === s.id) {
      this.closeMenu();
      return;
    }

    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    const menuWidth = 192; // w-48
    const approxMenuHeight = 140; // aproximado, solo para decidir si abre arriba o abajo
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // menuX representa el borde derecho del menú,
    // porque usamos translateX(-100%)
    let x = rect.right;

    if (x > vw - padding) x = vw - padding;
    if (x < menuWidth + padding) x = menuWidth + padding;

    const openUp = rect.bottom + approxMenuHeight > vh - padding;

    this.menuX = x;
    this.menuY = openUp ? rect.top : rect.bottom;
    this.menuDirection = openUp ? 'up' : 'down';
    this.menuSupplier = s;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuSupplier = null;
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

  openEdit(s: SupplierDTO) {
    this.closeAll();
    this.selected = s;
    this.editOpen = true;
  }

  confirmDelete(s: SupplierDTO) {
    this.closeAll();
    this.selected = s;
    this.deleteOpen = true;
  }

  openBalance(s: SupplierDTO) {
    this.closeAll();
    this.selected = s;
    this.balanceOpen = true;
  }

  closeAll() {
    this.createOpen = false;
    this.editOpen = false;
    this.deleteOpen = false;
    this.balanceOpen = false;
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
    this.load().then(() => this.syncDrawer());
  }

  onDeleted() {
    this.closeAll();
    this.load();
    this.closeDrawer();
  }

  onBalanceUpdated() {
    this.closeAll();
    this.load().then(() => this.syncDrawer());
  }

  // ✅ Autosave de notas — sin recargar, solo actualiza el array local
  onNotesUpdated(notes: string, supplierId: number) {
    // Actualizar el array siempre
    this.suppliers = this.suppliers.map((s) =>
      s.id === supplierId ? { ...s, notes } : s,
    );
    // Actualizar drawer solo si sigue abierto con el mismo proveedor
    if (this.drawerSupplier?.id === supplierId) {
      this.drawerSupplier = { ...this.drawerSupplier, notes };
    }
  }

  // Agrega método:
  async onDeleteConfirm() {
    if (!this.selected) return;
    this.loadingDelete = true;
    try {
      await this.api.remove(this.selected.id);
      this.onDeleted();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loadingDelete = false;
    }
  }
}
