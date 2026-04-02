import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  GoogleContactsService,
  GoogleContactsStatus,
} from '../../services/google-contacts.service';
import { BotService } from '../../services/bot.service';
import { CompanyContextService } from '../../services/company-context.service';
import { parseApiError } from '../../utils/error.utils';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, ConfirmActionModal, RouterLink],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.css'],
})
export class SettingsPage implements OnInit {
  private googleApi = inject(GoogleContactsService);
  private botApi = inject(BotService);
  private ctx = inject(CompanyContextService);

  // Google Contacts
  loadingStatus = false;
  status: GoogleContactsStatus | null = null;
  statusError = '';
  loadingSync = false;
  loadingDisconnect = false;
  disconnectOpen = false;

  // Agente Bot
  loadingAgent = false;
  agentEnabled: boolean | null = null;
  agentError = '';

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  get companyId(): number {
    return this.ctx.companyId()!;
  }

  ngOnInit() {
    this.loadStatus();
    this.loadAgentStatus();
  }

  // ── Google Contacts ───────────────────────────────────────────────────────

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

  // ── Agente Bot ────────────────────────────────────────────────────────────

  async loadAgentStatus() {
    this.loadingAgent = true;
    this.agentError = '';
    try {
      const result = await this.botApi.getAgentStatus();
      this.agentEnabled = result.enabled;
    } catch (e: any) {
      this.agentError = parseApiError(e);
    } finally {
      this.loadingAgent = false;
    }
  }

  async toggleAgent() {
    this.loadingAgent = true;
    try {
      const result = await this.botApi.toggleAgent();
      this.agentEnabled = result.enabled;
      this.showToast(result.message, 'success');
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingAgent = false;
    }
  }

  private showToast(message: string, type: 'success' | 'error') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 4500);
  }
}
