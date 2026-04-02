import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CampaignsService,
  CampaignDTO,
} from '../../services/campaigns.service';
import { parseApiError } from '../../utils/error.utils';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';
import { CreateEditCampaignModal } from '../../modales/campaigns/create-edit-campaign/create-edit-campaign.modal';

@Component({
  selector: 'app-campaigns-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmActionModal,
    CreateEditCampaignModal,
  ],
  templateUrl: './campaigns.page.html',
  styleUrl: './campaigns.page.css',
})
export class CampaignsPage implements OnInit, OnDestroy {
  private api = inject(CampaignsService);
  private router = inject(Router);

  campaigns: CampaignDTO[] = [];
  loading = false;
  loadingStatus = false;
  errorMessage = '';

  searchText = '';
  statusFilter: string = '';

  // Modal crear/editar
  modalOpen = false;
  campaignToEdit: CampaignDTO | null = null;

  // Confirmar eliminar
  confirmDeleteOpen = false;
  loadingDelete = false;
  campaignToDelete: CampaignDTO | null = null;

  // Menú flotante
  menuOpen = false;
  menuCampaign: CampaignDTO | null = null;
  menuX = 0;
  menuY = 0;
  menuDirection: 'down' | 'up' = 'down';

  // Toast
  toast: { message: string; type: 'success' | 'error' } | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  // Polling
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    this.load();
    this.pollInterval = setInterval(() => this.silentRefresh(), 15000);
  }

  ngOnDestroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.campaigns = await this.api.findAll();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  private async silentRefresh() {
    try {
      this.campaigns = await this.api.findAll();
    } catch {
      /* silencioso */
    }
  }

  get visible(): CampaignDTO[] {
    const q = this.searchText.trim().toLowerCase();
    return this.campaigns.filter((c) => {
      const matchSearch = q ? c.name.toLowerCase().includes(q) : true;
      const matchStatus = this.statusFilter
        ? c.status === this.statusFilter
        : true;
      return matchSearch && matchStatus;
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

  // ── Navegación ─────────────────────────────────────────────────────────────

  goToDetail(id: number) {
    this.router.navigate(['/campaigns', id]);
  }

  // ── Modal crear/editar ─────────────────────────────────────────────────────

  openCreate() {
    this.campaignToEdit = null;
    this.modalOpen = true;
    this.closeMenu();
  }

  openEdit(campaign: CampaignDTO) {
    this.campaignToEdit = campaign;
    this.modalOpen = true;
    this.closeMenu();
  }

  async onSaved() {
    this.modalOpen = false;
    const wasEdit = !!this.campaignToEdit;
    this.campaignToEdit = null;
    await this.load();
    this.showToast(
      wasEdit ? 'Campaña actualizada.' : 'Campaña creada.',
      'success',
    );
  }

  // ── Eliminar ───────────────────────────────────────────────────────────────

  openDelete(campaign: CampaignDTO) {
    this.campaignToDelete = campaign;
    this.confirmDeleteOpen = true;
    this.closeMenu();
  }

  async confirmDelete() {
    if (!this.campaignToDelete) return;
    this.loadingDelete = true;
    try {
      await this.api.remove(this.campaignToDelete.id);
      this.confirmDeleteOpen = false;
      this.campaignToDelete = null;
      await this.load();
      this.showToast('Campaña eliminada.', 'success');
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingDelete = false;
    }
  }

  cancelDelete() {
    this.confirmDeleteOpen = false;
    this.campaignToDelete = null;
  }

  // ── Estado ────────────────────────────────────────────────────────────────

  canPublish(campaign: CampaignDTO): boolean {
    return campaign.status === 'DRAFT';
  }

  canComplete(campaign: CampaignDTO): boolean {
    return campaign.status === 'RUNNING';
  }

  async publishCampaign(campaign: CampaignDTO) {
    this.loadingStatus = true;
    try {
      await this.api.updateStatus(campaign.id, 'RUNNING');
      await this.load();
      this.showToast('Campaña publicada.', 'success');
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingStatus = false;
      this.closeMenu();
    }
  }

  async completeCampaign(campaign: CampaignDTO) {
    this.loadingStatus = true;
    try {
      await this.api.updateStatus(campaign.id, 'COMPLETED');
      await this.load();
      this.showToast('Campaña completada.', 'success');
    } catch (e: any) {
      this.showToast(parseApiError(e), 'error');
    } finally {
      this.loadingStatus = false;
      this.closeMenu();
    }
  }

  // ── Menú flotante ──────────────────────────────────────────────────────────

  toggleMenu(campaign: CampaignDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.menuOpen && this.menuCampaign?.id === campaign.id) {
      this.closeMenu();
      return;
    }

    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 192;
    const approxMenuHeight = 140;
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
    this.menuCampaign = campaign;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuCampaign = null;
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

  // ── Status helpers ─────────────────────────────────────────────────────────

  statusLabel(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'Borrador',
      RUNNING: 'En curso',
      COMPLETED: 'Completada',
    };
    return map[status] ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'badge-ghost',
      RUNNING: 'badge-success',
      COMPLETED: 'badge-info',
    };
    return map[status] ?? 'badge-ghost';
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  private showToast(message: string, type: 'success' | 'error') {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toast = { message, type };
    this.toastTimer = setTimeout(() => (this.toast = null), 4500);
  }
}
