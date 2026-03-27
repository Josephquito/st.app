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
  StreamingAccountsService,
  StreamingAccountDTO,
} from '../../../services/streaming-accounts.service';
import { parseApiError } from '../../../utils/error.utils';

type ReplaceMode = 'credentials' | 'paid' | 'inventory' | null;
type PeriodMonths = 1 | 3 | 6 | 12 | null;

@Component({
  selector: 'app-replace-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './replace-account.modal.html',
})
export class ReplaceAccountModal implements OnChanges {
  api = inject(StreamingAccountsService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;
  @Input() accounts: StreamingAccountDTO[] = []; // todas las cuentas para el inventario

  @Output() close = new EventEmitter<void>();
  @Output() replaced = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  mode: ReplaceMode = null;

  // campos compartidos
  email = '';
  password = '';
  note = '';

  // modo paid
  totalCost = '';
  purchaseDate = '';
  periodMonths: PeriodMonths = null;
  periodDays: number | null = 30;
  durationDays = 30;
  cutoffDate = '';

  replacementAccountId: number | null = null;

  // =========================
  // Lifecycle
  // =========================
  ngOnChanges() {
    if (this.open) {
      this.errorMessage = '';
      if (!this.purchaseDate) this.purchaseDate = this.todayISO();
      if (this.periodDays == null) this.periodDays = 30;
      this.recalcCutoffDate();
    }
  }

  // =========================
  // Costo y fechas
  // =========================
  onTotalCostChange(value: string) {
    if (value == null) {
      this.totalCost = '';
      return;
    }
    let s = value.replace(/[^0-9.,]/g, '');
    if (s.includes(',') && s.includes('.'))
      s = s.replace(/\./g, '').replace(',', '.');
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    const parts = s.split('.');
    if (parts.length > 2) s = parts.shift()! + '.' + parts.join('');
    this.totalCost = s;
  }

  recalcCutoffDate() {
    const base = this.parseISODate(this.todayISO());
    if (!base) {
      this.cutoffDate = '';
      this.durationDays = 0;
      return;
    }

    const days = this.periodDays === null ? null : Number(this.periodDays);
    if (Number.isFinite(days as number) && (days as number) >= 1) {
      this.durationDays = days as number;
      const end = new Date(base);
      end.setDate(end.getDate() + this.durationDays);
      this.cutoffDate = this.toISODate(end);
      return;
    }

    if (this.periodMonths !== null) {
      const end = new Date(base);
      end.setMonth(end.getMonth() + this.periodMonths);
      this.cutoffDate = this.toISODate(end);
      this.durationDays = Math.max(
        1,
        Math.ceil((end.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return;
    }

    this.cutoffDate = '';
    this.durationDays = 0;
  }

  onPeriodMonthsChange(value: any) {
    const v = value === null ? null : Number(value);
    this.periodMonths =
      v === 1 || v === 3 || v === 6 || v === 12 ? (v as 1 | 3 | 6 | 12) : null;
    if (this.periodMonths !== null) this.periodDays = null;
    this.recalcCutoffDate();
  }

  onPeriodDaysChange(value: any) {
    const raw = value === '' || value === null ? null : Number(value);
    if (!Number.isFinite(raw as number) || (raw as number) < 1) {
      this.periodDays = null;
      this.recalcCutoffDate();
      return;
    }
    this.periodDays = raw as number;
    this.periodMonths = null;
    this.recalcCutoffDate();
  }

  private parseISODate(dateStr: string): Date | null {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(Date.UTC(y, m - 1, d)); // ← UTC
  }

  private toISODate(d: Date): string {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }

  private todayISO(): string {
    return this.toISODate(new Date()); // ya queda UTC al usar toISODate corregido
  }

  // =========================
  // Modal
  // =========================
  reset() {
    this.errorMessage = '';
    this.loading = false;
    this.mode = null;
    this.email = '';
    this.password = '';
    this.note = '';
    this.totalCost = '';
    this.purchaseDate = this.todayISO();
    this.periodMonths = null;
    this.periodDays = 30;
    this.durationDays = 30;
    this.cutoffDate = '';
    this.replacementAccountId = null;
    this.recalcCutoffDate();
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  async submit() {
    if (!this.account || !this.mode) return;
    this.errorMessage = '';

    try {
      this.loading = true;

      if (this.mode === 'credentials') {
        if (!this.email.trim()) {
          this.errorMessage = 'Email requerido.';
          return;
        }
        if (!this.password.trim()) {
          this.errorMessage = 'Clave requerida.';
          return;
        }
        await this.api.replaceCredentials(this.account.id, {
          email: this.email.trim(),
          password: this.password,
          note: this.note.trim() || undefined,
        });
      }

      if (this.mode === 'paid') {
        if (!this.email.trim()) {
          this.errorMessage = 'Email requerido.';
          return;
        }
        if (!this.password.trim()) {
          this.errorMessage = 'Clave requerida.';
          return;
        }
        if (!this.totalCost) {
          this.errorMessage = 'Costo total requerido.';
          return;
        }
        if (!this.durationDays || this.durationDays <= 0) {
          this.errorMessage = 'Duración inválida.';
          return;
        }
        if (!this.cutoffDate) {
          this.errorMessage = 'Fecha de corte inválida.';
          return;
        }

        const today = new Date().toISOString();
        await this.api.replacePaid(this.account.id, {
          email: this.email.trim(),
          password: this.password,
          purchaseDate: this.todayISO(), // ← directo
          durationDays: this.durationDays,
          totalCost: this.totalCost,
          note: this.note.trim() || undefined,
        });
      }

      if (this.mode === 'inventory') {
        if (!this.replacementAccountId) {
          this.errorMessage = 'Selecciona una cuenta de reemplazo.';
          return;
        }
        await this.api.replaceFromInventory(this.account.id, {
          replacementAccountId: this.replacementAccountId,
          note: this.note.trim() || undefined,
        });
      }

      this.replaced.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  get inventoryOptions(): StreamingAccountDTO[] {
    if (!this.account) return [];
    const soldCount = (this.account.profiles ?? []).filter(
      (p) => p.status === 'SOLD',
    ).length;

    const currentPlatformId =
      this.account.platformId ?? (this.account as any).platform?.id;

    return this.accounts.filter((a) => {
      if (a.id === this.account!.id) return false;
      if (a.status !== 'ACTIVE') return false;

      const aPlatformId = a.platformId ?? (a as any).platform?.id;
      if (aPlatformId !== currentPlatformId) return false;

      const available = (a.profiles ?? []).filter(
        (p) => p.status === 'AVAILABLE',
      ).length;
      return available >= soldCount;
    });
  }

  availableCount(a: StreamingAccountDTO): number {
    return (a.profiles ?? []).filter((p) => p.status === 'AVAILABLE').length;
  }
}
