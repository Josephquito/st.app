import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService, UserDTO } from '../../services/users.service';
import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../utils/error.utils';

import { CreateUserModal } from '../../modales/users/create-user/create-user.modal';
import { EditUserModal } from '../../modales/users/edit-user/edit-user.modal';
import { EditUserPermissionsModal } from '../../modales/users/edit-user-permissions/edit-user-permissions.modal';
import { StatusPipe } from '../../pipes/status.pipe';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [
    CommonModule,
    CreateUserModal,
    EditUserModal,
    EditUserPermissionsModal,
    StatusPipe,
    ConfirmActionModal,
  ],
  templateUrl: './users.page.html',
  styleUrls: ['./users.page.css'],
})
export class UsersPage {
  api = inject(UsersService);
  auth = inject(AuthService);

  loading = false;
  loadingRowId: number | null = null;
  errorMessage = '';
  users: UserDTO[] = [];

  createOpen = false;
  editOpen = false;
  deleteOpen = false;
  permissionsOpen = false;

  selected: UserDTO | null = null;

  menuOpen = false;
  menuUser: UserDTO | null = null;
  menuX = 0;
  menuY = 0;

  loadingDelete = false;

  get canCreate() {
    return this.auth.hasPermission('USERS:CREATE');
  }
  get canRead() {
    return this.auth.hasPermission('USERS:READ');
  }
  get canUpdate() {
    return this.auth.hasPermission('USERS:UPDATE');
  }
  get canDelete() {
    return this.auth.hasPermission('USERS:DELETE');
  }

  constructor() {
    this.refresh();
  }

  // ======================
  // Menú contextual
  // ======================
  toggleMenu(u: UserDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.menuOpen && this.menuUser?.id === u.id) {
      this.closeMenu();
      return;
    }

    const btn = ev.currentTarget as HTMLElement | null;
    if (btn) {
      const rect = btn.getBoundingClientRect();
      this.menuX = rect.right;
      this.menuY = rect.bottom + 8;
    } else {
      this.menuX = ev.clientX;
      this.menuY = ev.clientY;
    }

    this.menuUser = u;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuUser = null;
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
  // Data
  // ======================
  async refresh() {
    if (!this.canRead) {
      this.errorMessage = 'No tienes permiso USERS:READ';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      this.users = await this.api.findAll();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  // ======================
  // Modales
  // ======================
  openCreate() {
    if (!this.canCreate) return;
    this.createOpen = true;
  }

  openEdit(u: UserDTO) {
    if (!this.canUpdate) return;
    this.selected = u;
    this.editOpen = true;
  }

  confirmDelete(u: UserDTO) {
    if (!this.canDelete) return;
    if (u.id === this.auth.me()?.id) {
      this.errorMessage = 'No puedes eliminar tu propio usuario.';
      return;
    }
    this.selected = u;
    this.deleteOpen = true;
  }

  openPermissions(u: UserDTO) {
    if (!this.canUpdate) return;
    this.selected = u;
    this.permissionsOpen = true;
  }

  closeAll() {
    this.createOpen = false;
    this.editOpen = false;
    this.deleteOpen = false;
    this.permissionsOpen = false;
    this.selected = null;
    this.closeMenu();
  }

  closePermissions() {
    this.permissionsOpen = false;
    this.selected = null;
    this.closeMenu();
  }

  async onCreated() {
    this.closeAll();
    await this.refresh();
  }
  async onUpdated() {
    this.closeAll();
    await this.refresh();
  }
  async onDeleted() {
    this.closeAll();
    await this.refresh();
  }
  async onPermissionsUpdated() {
    this.closePermissions();
    await this.refresh();
  }

  // ======================
  // Toggle status
  // ======================
  async toggleStatus(u: UserDTO) {
    if (!this.canUpdate) return;
    if (u.id === this.auth.me()?.id) {
      this.errorMessage = 'No puedes cambiar tu propio status.';
      return;
    }

    const nextStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.loadingRowId = u.id;
    this.errorMessage = '';

    try {
      await this.api.update(u.id, { status: nextStatus });
      await this.refresh();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loadingRowId = null;
    }
  }

  async onDeleteConfirm() {
    if (!this.selected) return;
    this.loadingDelete = true;
    try {
      await this.api.remove(this.selected.id); // ← this.api no this.usersApi
      this.onDeleted();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loadingDelete = false;
    }
  }
}
