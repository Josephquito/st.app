import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  StreamingAccountsService,
  StreamingAccountDTO,
  AccountProfileDTO,
} from '../../services/streaming-accounts.service';
import {
  StreamingSalesService,
  StreamingSaleDTO,
} from '../../services/streaming-sales.service';
import { parseApiError } from '../../utils/error.utils';
import { CreateSaleModal } from '../../modales/cuentas/create-sale/create-sale.modal';
import { EditSaleModal } from '../../modales/cuentas/edit-sale/edit-sale.modal';
import { RenewSaleModal } from '../../modales/cuentas/renew-sale/renew-sale.modal';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';
import { AlertPipe, StatusPipe } from '../../pipes/status.pipe';
import {
  StreamingLabelsService,
  StreamingLabelDTO,
} from '../../services/streaming-labels.service';
import { FormsModule } from '@angular/forms';
import { AccountProfilesTableComponent } from '../account-profiles-table/account-profiles-table.component';

@Component({
  selector: 'app-account-drawer',
  standalone: true,
  imports: [
    CommonModule,
    AccountProfilesTableComponent,
    CreateSaleModal,
    EditSaleModal,
    RenewSaleModal,
    ConfirmActionModal,
    StatusPipe,
    AlertPipe,
    FormsModule,
  ],
  templateUrl: './account-drawer.component.html',
})
export class AccountDrawerComponent implements OnChanges {
  accountsApi = inject(StreamingAccountsService);
  salesApi = inject(StreamingSalesService);
  labelsApi = inject(StreamingLabelsService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;
  @Input() canSell = false;

  @Output() close = new EventEmitter<void>();
  @Output() changed = new EventEmitter<void>();
  @Output() saleCreated = new EventEmitter<void>();
  @Output() accountUpdated = new EventEmitter<StreamingAccountDTO>();

  loading = false;
  errorMessage = '';
  expanded = false;
  copiedKey = '';

  createSaleOpen = false;
  editSaleOpen = false;
  renewSaleOpen = false;

  selectedProfile: AccountProfileDTO | null = null;
  selectedSale: StreamingSaleDTO | null = null;
  saleToRenew: StreamingSaleDTO | null = null;
  profileToRenew: AccountProfileDTO | null = null;

  confirmEmptyOpen = false;
  profileToEmpty: AccountProfileDTO | null = null;

  confirmRemoveSlotOpen = false;
  profileToRemove: AccountProfileDTO | null = null;

  confirmEmptyAllOpen = false;

  salesByProfileId = new Map<number, StreamingSaleDTO>();
  accountLabels: StreamingLabelDTO[] = [];

  menuOpen = false;
  menuProfile: AccountProfileDTO | null = null;
  menuX = 0;
  menuY = 0;

  // =========================
  // Lifecycle
  // =========================
  ngOnChanges() {
    this.errorMessage = '';
    if (this.open && this.account) {
      this.refresh();
    }
    if (!this.open) {
      this.closeAllInner();
    }
  }

  // =========================
  // Data
  // =========================
  async refresh() {
    if (!this.account) return;
    this.loading = true;
    try {
      const [fresh, allSales, labels] = await Promise.all([
        this.accountsApi.findOne(this.account.id),
        this.salesApi.findAll({ accountId: this.account.id }),
        this.labelsApi.findAll(this.account.platform?.id),
      ]);
      this.account = fresh;
      this.salesByProfileId = this.buildSalesIndex(allSales);
      this.accountLabels = labels;
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  async onAssignLabel(p: AccountProfileDTO, labelId: number | null) {
    try {
      const updated = await this.accountsApi.assignLabel(p.id, labelId);
      if (this.account?.profiles) {
        this.account = {
          ...this.account,
          profiles: this.account.profiles.map((prof) =>
            prof.id === p.id
              ? { ...prof, labelId: updated.labelId, label: updated.label }
              : prof,
          ),
        };
      }
      this.changed.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  private buildSalesIndex(
    sales: StreamingSaleDTO[],
  ): Map<number, StreamingSaleDTO> {
    const map = new Map<number, StreamingSaleDTO>();
    const sorted = [...sales].sort((a, b) => {
      const aA = a.status === 'ACTIVE' ? 0 : 1;
      const bA = b.status === 'ACTIVE' ? 0 : 1;
      if (aA !== bA) return aA - bA;
      return (
        new Date(b.updatedAt ?? b.createdAt ?? b.saleDate).getTime() -
        new Date(a.updatedAt ?? a.createdAt ?? a.saleDate).getTime()
      );
    });
    for (const s of sorted) {
      if (!s.customerId && s.customer?.id)
        (s as any).customerId = s.customer.id;
      if (!s.accountId && s.account?.id) (s as any).accountId = s.account.id;
      if (!s.profileId && s.profile?.id) (s as any).profileId = s.profile.id;
      const profileKey = s.profileId ?? s.profile?.id;
      if (profileKey !== undefined && !map.has(profileKey))
        map.set(profileKey, s);
    }
    return map;
  }

  getSaleForProfile(p: AccountProfileDTO): StreamingSaleDTO | null {
    if (p.status === 'AVAILABLE') return null;
    return this.salesByProfileId.get(p.id) ?? null;
  }

  // =========================
  // Acciones venta
  // =========================
  openSell(p: AccountProfileDTO) {
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

  onEditProfile(p: AccountProfileDTO) {
    const sale = this.getSaleForProfile(p);
    if (!sale) return;
    this.selectedSale = sale;
    this.editSaleOpen = true;
  }

  async onSaleUpdated() {
    this.editSaleOpen = false;
    this.selectedSale = null;
    await this.refresh();
    this.changed.emit();
  }

  // =========================
  // Renovar venta
  // =========================
  onRenewProfile(p: AccountProfileDTO) {
    const sale = this.getSaleForProfile(p);
    if (!sale) return;
    this.saleToRenew = sale;
    this.profileToRenew = p;
    this.renewSaleOpen = true;
  }

  async onSaleRenewed() {
    this.renewSaleOpen = false;
    this.saleToRenew = null;
    this.profileToRenew = null;
    await this.refresh();
    this.changed.emit();
  }

  // =========================
  // Vaciar perfil
  // =========================
  onEmptyProfile(p: AccountProfileDTO) {
    this.profileToEmpty = p;
    this.confirmEmptyOpen = true;
  }

  async confirmEmpty() {
    if (!this.profileToEmpty) return;
    const sale = this.getSaleForProfile(this.profileToEmpty);
    if (!sale) return;
    this.loading = true;
    this.confirmEmptyOpen = false;
    try {
      await this.salesApi.empty(sale.id);
      await this.refresh();
      this.changed.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
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
  // Eliminar slot
  // =========================
  onRemoveSlot(p: AccountProfileDTO) {
    this.profileToRemove = p;
    this.confirmRemoveSlotOpen = true;
  }

  async confirmRemoveSlot() {
    if (!this.profileToRemove || !this.account) return;
    this.loading = true;
    this.confirmRemoveSlotOpen = false;
    try {
      await this.accountsApi.removeProfile(this.account.id);
      await this.refresh();
      this.changed.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
      this.profileToRemove = null;
    }
  }

  cancelRemoveSlot() {
    this.confirmRemoveSlotOpen = false;
    this.profileToRemove = null;
  }

  // =========================
  // Agregar slot
  // =========================
  async onAddSlot() {
    if (!this.account) return;
    this.loading = true;
    try {
      await this.accountsApi.addProfile(this.account.id);
      await this.refresh();
      this.changed.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  // =========================
  // Vaciar todos
  // =========================
  onEmptyAll() {
    this.confirmEmptyAllOpen = true;
  }

  async confirmEmptyAll() {
    if (!this.account) return;
    this.loading = true;
    this.confirmEmptyAllOpen = false;
    try {
      await this.accountsApi.emptyAll(this.account.id);
      await this.refresh();
      this.changed.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  cancelEmptyAll() {
    this.confirmEmptyAllOpen = false;
  }

  // =========================
  // Copiar
  // =========================
  copy(key: string, text: string): void {
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    this.copiedKey = key;
    setTimeout(() => {
      if (this.copiedKey === key) this.copiedKey = '';
    }, 2000);
  }

  copyProfileInfo(p: AccountProfileDTO): void {
    const sale = this.getSaleForProfile(p);
    const platform = (this.account?.platform?.name ?? '').toUpperCase();
    const email = this.account?.email ?? '';
    const password = this.account?.password ?? '';
    const cutoff = sale?.cutoffDate
      ? new Date(sale.cutoffDate).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })
      : '—';
    const text = `${platform}\n${email}\nClave: ${password}\nPerfil: ${p.profileNo}\n\nCorte: ${cutoff}\n•No reproducir en dos dispositivos a la vez.\n•No modificar nada de la cuenta.`;
    this.copy(`info-${p.id}`, text);
  }

  copyPasswordChange(p: AccountProfileDTO): void {
    const sale = this.getSaleForProfile(p);
    const platform = (this.account?.platform?.name ?? '').toUpperCase();
    const email = this.account?.email ?? '';
    const password = this.account?.password ?? '';
    const cutoff = sale?.cutoffDate
      ? new Date(sale.cutoffDate).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })
      : '—';
    const text = `${platform} NUEVA CLAVE\n${email}\nClave: ${password}\n\nCorte: ${cutoff}`;
    this.copy(`pass-${p.id}`, text);
  }

  copyRenewMessage(p: AccountProfileDTO): void {
    const platform = this.account?.platform?.name ?? '';
    const email = this.account?.email ?? '';
    const text = `Buen dia, desea renovar el ${platform} ${email}?`;
    this.copy(`renew-${p.id}`, text);
  }

  // =========================
  // Cerrar
  // =========================
  onClose() {
    this.closeAllInner();
    this.close.emit();
  }

  private closeAllInner() {
    this.createSaleOpen = false;
    this.editSaleOpen = false;
    this.renewSaleOpen = false;
    this.confirmEmptyOpen = false;
    this.confirmRemoveSlotOpen = false;
    this.confirmEmptyAllOpen = false;
    this.selectedProfile = null;
    this.selectedSale = null;
    this.saleToRenew = null;
    this.profileToRenew = null;
    this.profileToEmpty = null;
    this.profileToRemove = null;
    this.errorMessage = '';
  }

  // =========================
  // Acciones inline
  // =========================
  async onSaleNoteBlur(p: AccountProfileDTO, event: Event) {
    const sale = this.getSaleForProfile(p);
    if (!sale) return;
    const input = event.target as HTMLInputElement;
    const newNote = input.value.trim() || null;
    if ((newNote ?? '') === (sale.notes ?? '')) return;
    try {
      await this.salesApi.update(sale.id, { notes: newNote });
      const updated = { ...sale, notes: newNote };
      this.salesByProfileId.set(p.id, updated as StreamingSaleDTO);
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  async onRenewalStatusChange(p: AccountProfileDTO, event: Event) {
    const sale = this.getSaleForProfile(p);
    if (!sale) return;
    const newStatus = (event.target as HTMLSelectElement).value as any;
    if (newStatus === sale.renewalStatus) return;
    try {
      const updated = await this.salesApi.updateRenewalStatus(
        sale.id,
        newStatus,
      );
      this.salesByProfileId.set(p.id, updated);
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
      (event.target as HTMLSelectElement).value = sale.renewalStatus;
    }
  }

  async onPauseSale(p: AccountProfileDTO) {
    const sale = this.getSaleForProfile(p);
    if (!sale) return;
    try {
      const updated = await this.salesApi.pause(sale.id);
      this.salesByProfileId.set(p.id, updated);
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  async onResumeSale(p: AccountProfileDTO) {
    const sale = this.getSaleForProfile(p);
    if (!sale) return;
    try {
      const updated = await this.salesApi.resume(sale.id);
      this.salesByProfileId.set(p.id, updated);
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  async onRefundSale(p: AccountProfileDTO) {
    const sale = this.getSaleForProfile(p);
    if (!sale) return;
    try {
      await this.salesApi.refund(sale.id);
      await this.refresh();
      this.changed.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  onMenuToggle(data: { profile: AccountProfileDTO; rect: DOMRect }) {
    if (this.menuOpen && this.menuProfile?.id === data.profile.id) {
      this.closeMenu();
      return;
    }

    const menuWidth = 192;
    const menuHeight = 280;
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = data.rect;

    let x = rect.left - menuWidth;
    if (x < padding) x = rect.right + padding;
    if (x + menuWidth > vw - padding) x = vw - menuWidth - padding;

    let y = rect.bottom + 6;
    if (y + menuHeight > vh - padding) y = rect.top - menuHeight - 6;
    if (y < padding) y = padding;

    this.menuX = x;
    this.menuY = y;
    this.menuProfile = data.profile;
    this.menuOpen = true;
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
}
