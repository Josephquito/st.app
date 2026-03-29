// transfer-sale.modal.ts
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StreamingAccountDTO,
  AccountProfileDTO,
  StreamingAccountsService,
} from '../../../services/streaming-accounts.service';
import { StreamingSaleDTO } from '../../../services/streaming-sales.service';
import { AlertPipe, getProfileDotColor } from '../../../pipes/status.pipe';
import { parseApiError } from '../../../utils/error.utils';
import { parseISODate, todayISO } from '../../../utils/date.utils';
import { ToastService } from '../../../components/toast/toast.service';

@Component({
  selector: 'app-transfer-sale-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AlertPipe],
  templateUrl: './transfer-sale.modal.html',
})
export class TransferSaleModal implements OnChanges {
  private api = inject(StreamingAccountsService);
  private toast = inject(ToastService);

  @Input() open = false;
  @Input() profile: AccountProfileDTO | null = null;
  @Input() sale: StreamingSaleDTO | null = null;
  @Input() originAccount: StreamingAccountDTO | null = null;
  @Input() accounts: StreamingAccountDTO[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() transferred = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  searchText = '';
  selectedAccount: StreamingAccountDTO | null = null;
  confirmOpen = false;

  // ── Lifecycle ─────────────────────────────────────────────────────
  ngOnChanges() {
    if (!this.open) {
      this.reset();
    }
  }

  private reset() {
    this.searchText = '';
    this.selectedAccount = null;
    this.confirmOpen = false;
    this.errorMessage = '';
    this.loading = false;
  }

  // ── Cuentas disponibles ───────────────────────────────────────────
  get availableAccounts(): StreamingAccountDTO[] {
    const q = this.searchText.trim().toLowerCase();
    const originPlatformId =
      this.originAccount?.platformId ??
      (this.originAccount as any)?.platform?.id;

    return this.accounts.filter((a) => {
      if (a.id === this.originAccount?.id) return false;
      const aPlatformId = a.platformId ?? (a as any)?.platform?.id;
      if (aPlatformId !== originPlatformId) return false;
      if (a.status !== 'ACTIVE') return false; // ← solo ACTIVE
      if (!a.profiles?.some((p) => p.status === 'AVAILABLE')) return false;
      if (q) return a.email.toLowerCase().includes(q);
      return true;
    });
  }

  availableProfilesCount(a: StreamingAccountDTO): number {
    return (a.profiles ?? []).filter((p) => p.status === 'AVAILABLE').length;
  }

  // ── Dots ──────────────────────────────────────────────────────────
  profileDotClass(p: AccountProfileDTO): string {
    const sale = p.sales?.[0];
    return getProfileDotColor(
      p.status,
      sale?.status ?? null,
      sale?.cutoffDate ?? null,
      (p as any).label?.color ?? null,
    );
  }

  profileDotTooltip(p: AccountProfileDTO): string {
    if (p.status === 'AVAILABLE') return 'Disponible';
    const sale = p.sales?.[0];
    if (!sale) return 'Vendido';
    const cutoff = parseISODate(sale.cutoffDate);
    const today = parseISODate(todayISO())!;
    if (!cutoff) return 'Vendido';
    const days = Math.ceil(
      (cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return `Venció hace ${Math.abs(days)}d`;
    if (days === 0) return 'Vence hoy';
    return `Vence en ${days}d`;
  }

  // ── Selección ─────────────────────────────────────────────────────
  selectAccount(a: StreamingAccountDTO) {
    this.selectedAccount = a;
    this.confirmOpen = true;
  }

  cancelConfirm() {
    this.selectedAccount = null;
    this.confirmOpen = false;
  }

  // ── Submit ────────────────────────────────────────────────────────
  async confirm() {
    if (!this.profile || !this.selectedAccount) return;
    this.loading = true;
    this.errorMessage = '';
    try {
      await this.api.transferProfile(this.profile.id, this.selectedAccount.id);
      this.transferred.emit();
      this.reset();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
      this.confirmOpen = false;
    } finally {
      this.loading = false;
    }
  }

  onClose() {
    if (this.loading) return;
    this.reset();
    this.close.emit();
  }

  // ── Helpers display ───────────────────────────────────────────────
  get customerName(): string {
    return (this.sale as any)?.customer?.name ?? '—';
  }

  get originEmail(): string {
    return this.originAccount?.email ?? '—';
  }

  get profileNo(): number {
    return this.profile?.profileNo ?? 0;
  }
}
