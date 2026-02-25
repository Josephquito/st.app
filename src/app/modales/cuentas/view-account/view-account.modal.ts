import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  StreamingAccountsService,
  StreamingAccountDTO,
  AccountProfileDTO,
} from '../../../services/streaming-accounts.service';

import { CreateSaleModal } from '../create-sale/create-sale.modal';

import {
  StreamingSalesService,
  StreamingSaleDTO,
} from '../../../services/streaming-sales.service';
import { EditSaleModal } from '../edit-sale/edit-sale.modal';

@Component({
  selector: 'app-view-account-modal',
  standalone: true,
  imports: [CommonModule, CreateSaleModal, EditSaleModal],
  templateUrl: './view-account.modal.html',
})
export class ViewAccountModal implements OnChanges {
  accountsApi = inject(StreamingAccountsService);
  salesApi = inject(StreamingSalesService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;
  @Input() canSell = false;

  @Output() close = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();
  @Output() saleCreated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  // Venta modal
  createSaleOpen = false;
  selectedProfile: AccountProfileDTO | null = null;

  // Ventas indexadas por profileId
  salesByProfileId = new Map<number, StreamingSaleDTO>();

  // Menú flotante
  menuOpen = false;
  menuProfile: AccountProfileDTO | null = null;
  menuX = 0;
  menuY = 0;

  // Edición de venta
  editSaleOpen = false;
  selectedSale: StreamingSaleDTO | null = null;

  // ✅ Nueva Modal de Confirmación para Vaciar
  confirmEmptyOpen = false;
  profileToEmpty: AccountProfileDTO | null = null;

  ngOnChanges() {
    this.errorMessage = '';
    if (this.open && this.account) {
      this.refresh();
    }
  }

  onClose() {
    this.errorMessage = '';
    this.createSaleOpen = false;
    this.selectedProfile = null;
    this.closeMenu();
    this.close.emit();
  }

  async refresh() {
    if (!this.account) return;

    this.loading = true;
    try {
      this.closeMenu();

      // 1) Refresca cuenta con perfiles
      const fresh = await this.accountsApi.findOne(this.account.id);
      this.account = fresh;

      // 2) Carga ventas y filtra por cuenta
      const allSales = await this.salesApi.findAll();
      const forThisAccount = allSales.filter(
        (s) => s.accountId === this.account!.id,
      );

      // 3) Map por profileId (prioriza ACTIVE y la más reciente)
      this.salesByProfileId = this.buildSalesIndex(forThisAccount);
    } catch (e: any) {
      this.errorMessage = e?.error?.message ?? 'No se pudo cargar la cuenta.';
    } finally {
      this.loading = false;
    }
  }

  private buildSalesIndex(
    sales: StreamingSaleDTO[],
  ): Map<number, StreamingSaleDTO> {
    const map = new Map<number, StreamingSaleDTO>();

    const sorted = [...sales].sort((a, b) => {
      const aActive = a.status === 'ACTIVE' ? 0 : 1;
      const bActive = b.status === 'ACTIVE' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;

      const ad = new Date(a.updatedAt ?? a.createdAt ?? a.saleDate).getTime();
      const bd = new Date(b.updatedAt ?? b.createdAt ?? b.saleDate).getTime();
      return bd - ad;
    });

    for (const s of sorted) {
      if (!map.has(s.profileId)) map.set(s.profileId, s);
    }

    return map;
  }

  getSaleForProfile(p: AccountProfileDTO): StreamingSaleDTO | null {
    if (p.status === 'AVAILABLE') return null;

    return this.salesByProfileId.get(p.id) ?? null;
  }

  // =========================
  // Menú flotante
  // =========================
  toggleProfileMenu(p: AccountProfileDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (p.status === 'AVAILABLE') return;

    if (this.menuOpen && this.menuProfile?.id === p.id) {
      this.closeMenu();
      return;
    }

    this.menuOpen = true;
    this.menuProfile = p;

    const btn = ev.currentTarget as HTMLElement;
    const modalBox = btn.closest('.modal-box') as HTMLElement | null;

    if (!modalBox) {
      this.menuX = ev.clientX;
      this.menuY = ev.clientY;
      return;
    }

    const btnRect = btn.getBoundingClientRect();
    const boxRect = modalBox.getBoundingClientRect();

    this.menuX = btnRect.right - boxRect.left;
    this.menuY = btnRect.bottom - boxRect.top + 6;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuProfile = null;
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeMenu();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.closeMenu();
  }

  // =========================
  // Acciones de Venta
  // =========================
  openSell(p: AccountProfileDTO) {
    this.closeMenu();
    if (!this.canSell || !this.account || p.status !== 'AVAILABLE') return;

    this.selectedProfile = p;
    this.createSaleOpen = true;
  }

  async onSaleDone() {
    this.createSaleOpen = false;
    this.selectedProfile = null;
    await this.refresh();
    this.saleCreated.emit();
  }

  // =========================
  // Lógica de Vaciado (Modal Custom)
  // =========================
  onEmptyProfile(p: AccountProfileDTO) {
    this.profileToEmpty = p;
    this.confirmEmptyOpen = true;
    this.closeMenu();
  }

  async confirmEmpty() {
    if (!this.profileToEmpty) return;
    const sale = this.getSaleForProfile(this.profileToEmpty);
    if (!sale) return;

    this.loading = true;
    this.confirmEmptyOpen = false; // Cerramos modal de confirmación

    try {
      await this.salesApi.empty(sale.id);
      await this.refresh(); // Refrescamos solo el contenido interno
      this.changed.emit(); // Avisamos al padre sin cerrar este modal
    } catch (e: any) {
      this.errorMessage = e?.error?.message || 'Error al vaciar perfil';
    } finally {
      this.loading = false;
      this.profileToEmpty = null;
    }
  }

  cancelEmpty() {
    this.confirmEmptyOpen = false;
    this.profileToEmpty = null;
  }

  // =========================
  // Helpers UI
  // =========================
  daysRemaining(cutoffDate?: string | Date | null) {
    if (!cutoffDate) return null;
    const d = new Date(cutoffDate);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  alertBadgeClass(days: number | null) {
    if (days === null) return 'badge-ghost';
    if (days < 0) return 'badge-error';
    if (days <= 3) return 'badge-warning';
    return 'badge-success';
  }

  onEditProfile(p: AccountProfileDTO) {
    const sale = this.getSaleForProfile(p);
    if (sale) {
      this.selectedSale = sale;
      this.editSaleOpen = true;
      this.closeMenu();
    }
  }

  async onSaleUpdated() {
    this.editSaleOpen = false;
    await this.refresh();
    this.changed.emit();
  }
}
