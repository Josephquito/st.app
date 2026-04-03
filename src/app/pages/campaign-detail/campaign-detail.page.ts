import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  CampaignsService,
  CampaignDTO,
  CampaignContactDTO,
} from '../../services/campaigns.service';
import { parseApiError } from '../../utils/error.utils';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';
import { AddContactsCampaignModal } from '../../modales/campaigns/add-contacts-campaign/add-contacts-campaign.modal';

@Component({
  selector: 'app-campaign-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmActionModal,
    AddContactsCampaignModal,
  ],
  templateUrl: './campaign-detail.page.html',
  styleUrl: './campaign-detail.page.css',
})
export class CampaignDetailPage implements OnInit, OnDestroy {
  private api = inject(CampaignsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  campaignId!: number;
  campaign: CampaignDTO | null = null;
  contacts: CampaignContactDTO[] = [];
  existingContactIds: number[] = [];

  loading = false;
  errorMessage = '';
  loadingActionId: number | null = null;

  // Selección
  selectedIds = new Set<number>();

  // Modal agregar contactos
  addContactsOpen = false;

  // Confirmar quitar contacto
  confirmRemoveOpen = false;
  loadingRemove = false;
  contactToRemove: CampaignContactDTO | null = null;

  // Menú flotante
  menuOpen = false;
  menuContact: CampaignContactDTO | null = null;
  menuX = 0;
  menuY = 0;
  menuDirection: 'down' | 'up' = 'down';

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Polling
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  // Filtro
  statusFilter = '';
  searchText = '';

  ngOnInit() {
    this.campaignId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
    this.pollInterval = setInterval(() => this.silentRefresh(), 10000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [campaign, contacts] = await Promise.all([
        this.api.findOne(this.campaignId),
        this.api.getContacts(this.campaignId),
      ]);
      this.campaign = campaign;
      this.contacts = contacts;
      this.existingContactIds = contacts.map((c) => c.customer.id);
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  private async silentRefresh() {
    try {
      const [campaign, contacts] = await Promise.all([
        this.api.findOne(this.campaignId),
        this.api.getContacts(this.campaignId),
      ]);
      this.campaign = campaign;
      this.contacts = contacts;
      this.existingContactIds = contacts.map((c) => c.customer.id);
    } catch {
      /* silencioso */
    }
  }

  async refreshContacts() {
    try {
      const [campaign, contacts] = await Promise.all([
        this.api.findOne(this.campaignId),
        this.api.getContacts(this.campaignId),
      ]);
      this.campaign = campaign;
      this.contacts = contacts;
      this.existingContactIds = contacts.map((c) => c.customer.id);
      this.selectedIds.clear();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  goBack() {
    this.router.navigate(['/campaigns']);
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  get visible(): CampaignContactDTO[] {
    const q = this.searchText.trim().toLowerCase();
    return this.contacts.filter((c) => {
      const matchStatus = this.statusFilter
        ? c.status === this.statusFilter
        : true;
      const matchSearch = q
        ? [c.customer.name, c.customer.contact]
            .join(' ')
            .toLowerCase()
            .includes(q)
        : true;
      return matchStatus && matchSearch;
    });
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchText || this.statusFilter);
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = '';
  }

  setStatusFilter(v: string) {
    this.statusFilter = this.statusFilter === v ? '' : v;
  }

  // ── Selección ─────────────────────────────────────────────────────────────

  get pendingContacts(): CampaignContactDTO[] {
    return this.visible.filter((c) => c.status === 'PENDING');
  }

  get allPendingSelected(): boolean {
    return (
      this.pendingContacts.length > 0 &&
      this.pendingContacts.every((c) => this.selectedIds.has(c.id))
    );
  }

  toggleSelectAll() {
    if (this.allPendingSelected) {
      this.pendingContacts.forEach((c) => this.selectedIds.delete(c.id));
    } else {
      this.pendingContacts.forEach((c) => this.selectedIds.add(c.id));
    }
  }

  toggleSelect(id: number, status: string) {
    if (status !== 'PENDING') return;
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  // ── Marcar enviado/pendiente manual ───────────────────────────────────────

  async markSentManual(contact: CampaignContactDTO) {
    this.loadingActionId = contact.id;
    try {
      await this.api.markSentManual(this.campaignId, contact.id);
      await this.refreshContacts();
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingActionId = null;
    }
  }

  async markPendingManual(contact: CampaignContactDTO) {
    this.loadingActionId = contact.id;
    try {
      await this.api.markPendingManual(this.campaignId, contact.id);
      await this.refreshContacts();
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingActionId = null;
    }
  }

  // ── Marcar seleccionados como enviados ────────────────────────────────────

  async markSelectedSent() {
    if (this.selectedIds.size === 0) return;
    this.loadingActionId = -1;
    try {
      await Promise.all(
        Array.from(this.selectedIds).map((id) =>
          this.api.markSentManual(this.campaignId, id),
        ),
      );
      this.showToast(
        `${this.selectedIds.size} contacto${this.selectedIds.size !== 1 ? 's' : ''} marcado${this.selectedIds.size !== 1 ? 's' : ''} como enviado.`,
        'success',
      );
      await this.refreshContacts();
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingActionId = null;
    }
  }

  // ── Agregar contactos ─────────────────────────────────────────────────────

  async onContactsAdded() {
    this.addContactsOpen = false;
    await this.refreshContacts();
    this.showToast('Contactos agregados.', 'success');
  }

  // ── Quitar contacto ───────────────────────────────────────────────────────

  openRemove(contact: CampaignContactDTO) {
    this.contactToRemove = contact;
    this.confirmRemoveOpen = true;
    this.closeMenu();
  }

  async confirmRemove() {
    if (!this.contactToRemove) return;
    this.loadingRemove = true;
    try {
      await this.api.removeContact(
        this.campaignId,
        this.contactToRemove.customer.id,
      );
      this.confirmRemoveOpen = false;
      this.contactToRemove = null;
      await this.refreshContacts();
      this.showToast('Contacto eliminado.', 'success');
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingRemove = false;
    }
  }

  cancelRemove() {
    this.confirmRemoveOpen = false;
    this.contactToRemove = null;
  }

  // ── Menú flotante ─────────────────────────────────────────────────────────

  toggleMenu(contact: CampaignContactDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (this.menuOpen && this.menuContact?.id === contact.id) {
      this.closeMenu();
      return;
    }
    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 192;
    const approxMenuHeight = 80;
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let x = rect.left - menuWidth;
    if (x < padding) x = rect.right + padding;
    if (x + menuWidth > vw - padding) x = vw - menuWidth - padding;

    const openUp = rect.bottom + approxMenuHeight > vh - padding;

    this.menuX = x;
    this.menuY = openUp ? rect.top : rect.bottom;
    this.menuDirection = openUp ? 'up' : 'down';
    this.menuContact = contact;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuContact = null;
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

  // ── Status helpers ────────────────────────────────────────────────────────

  contactStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      SENT: 'Enviado',
      RESPONDED: 'Respondió',
      PURCHASED: 'Compró',
      FAILED: 'Fallido',
      IGNORED: 'Ignorado',
    };
    return map[status] ?? status;
  }

  contactStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'badge-ghost',
      SENT: 'badge-info',
      RESPONDED: 'badge-warning',
      PURCHASED: 'badge-success',
      FAILED: 'badge-error',
      IGNORED: 'badge-neutral',
    };
    return map[status] ?? 'badge-ghost';
  }

  campaignStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      RUNNING: 'En curso',
      COMPLETED: 'Completada',
    };
    return map[status] ?? status;
  }

  campaignStatusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-ghost',
      RUNNING: 'badge-success',
      COMPLETED: 'badge-info',
    };
    return map[status] ?? 'badge-ghost';
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private showToast(message: string, type: 'success' | 'error') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 4500);
  }
}
