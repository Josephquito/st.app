import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  GoogleContactsService,
  GoogleContactsStatus,
} from '../../services/google-contacts.service';
import { CompanyContextService } from '../../services/company-context.service';
import { parseApiError } from '../../utils/error.utils';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ConfirmActionModal, RouterLink],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.css'],
})
export class SettingsPage implements OnInit {
  private googleApi = inject(GoogleContactsService);
  private ctx = inject(CompanyContextService);

  // Estado de conexión
  loadingStatus = false;
  status: GoogleContactsStatus | null = null;
  statusError = '';

  // Acciones
  loadingSync = false;
  loadingDisconnect = false;

  // Modal desconexión
  disconnectOpen = false;

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  get companyId(): number {
    return this.ctx.companyId()!;
  }

  ngOnInit() {
    this.loadStatus();
  }

  async loadStatus() {
    this.loadingStatus = true;
    this.statusError = '';
    try {
      this.status = await this.googleApi.getStatus(this.companyId);
    } catch (e: any) {
      this.statusError = parseApiError(e);
    } finally {
      this.loadingStatus = false;
    }
  }

  async connectGoogle() {
    try {
      await this.googleApi.connect(this.companyId);
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    }
  }

  async syncNow() {
    this.loadingSync = true;
    try {
      const result = await this.googleApi.sync(this.companyId);
      this.showToast(
        `Sincronización completa — importados: ${result.imported}, exportados: ${result.exported}, actualizados: ${result.updated}`,
        'success',
      );
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingSync = false;
    }
  }

  openDisconnect() {
    this.disconnectOpen = true;
  }

  closeDisconnect() {
    this.disconnectOpen = false;
  }

  async confirmDisconnect() {
    this.loadingDisconnect = true;
    try {
      await this.googleApi.disconnect(this.companyId);
      this.disconnectOpen = false;
      this.showToast('Cuenta de Google desconectada.', 'success');
      await this.loadStatus();
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingDisconnect = false;
    }
  }

  private showToast(message: string, type: 'success' | 'error') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 4500);
  }
}
