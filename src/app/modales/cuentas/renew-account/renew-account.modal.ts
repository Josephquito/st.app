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
import {
  todayISO,
  parseISODate,
  toISODate,
  addDays,
  addMonths,
} from '../../../utils/date.utils';

type PeriodMonths = 1 | 3 | 6 | 12 | null;

@Component({
  selector: 'app-renew-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renew-account.modal.html',
})
export class RenewAccountModal implements OnChanges {
  api = inject(StreamingAccountsService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() renewed = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  totalCost = '';
  purchaseDate = '';
  periodMonths: PeriodMonths = null;
  periodDays: number | null = 30;
  durationDays = 30;
  cutoffDate = '';

  isExtending = false;

  // =========================
  // Lifecycle
  // =========================
  ngOnChanges() {
    if (this.open && this.account) {
      this.errorMessage = '';

      // Comparar solo por fecha local, sin hora
      const cutoffDate = this.account.cutoffDate
        ? parseISODate(this.account.cutoffDate)
        : null;
      const todayDate = parseISODate(todayISO())!;

      if (cutoffDate && cutoffDate >= todayDate) {
        this.purchaseDate = toISODate(cutoffDate);
        this.isExtending = true;
      } else {
        this.purchaseDate = todayISO();
        this.isExtending = false;
      }

      if (this.periodDays == null && this.periodMonths == null)
        this.periodDays = 30;
      this.recalcCutoffDate();
    }
  }

  // =========================
  // Fechas y período
  // =========================
  recalcCutoffDate() {
    const base = parseISODate(this.purchaseDate);
    if (!base) {
      this.cutoffDate = '';
      this.durationDays = 0;
      return;
    }

    const days = this.periodDays === null ? null : Number(this.periodDays);
    if (Number.isFinite(days as number) && (days as number) >= 1) {
      this.durationDays = days as number;
      this.cutoffDate = toISODate(addDays(base, this.durationDays));
      return;
    }

    if (this.periodMonths !== null) {
      const end = addMonths(base, this.periodMonths);
      this.cutoffDate = toISODate(end);
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

  onTotalCostChange(value: string) {
    this.totalCost = value;
  }

  private normalizeDecimal(value: string): string {
    if (!value) return '';
    let s = value.replace(/[^0-9.,]/g, '');
    if (s.includes(',') && s.includes('.'))
      s = s.replace(/\./g, '').replace(',', '.');
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    const parts = s.split('.');
    if (parts.length > 2) s = parts.shift()! + '.' + parts.join('');
    return s;
  }

  // =========================
  // Modal
  // =========================
  reset() {
    this.errorMessage = '';
    this.loading = false;
    this.totalCost = '';
    this.purchaseDate = todayISO();
    this.periodMonths = null;
    this.periodDays = 30;
    this.durationDays = 30;
    this.cutoffDate = '';
    this.recalcCutoffDate();
    this.isExtending = false;
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  async submit() {
    this.errorMessage = '';

    if (!this.account) {
      this.errorMessage = 'Cuenta inválida.';
      return;
    }

    const cleanCost = this.normalizeDecimal(this.totalCost);
    if (!cleanCost) {
      this.errorMessage = 'Costo total requerido.';
      return;
    }
    if (!this.purchaseDate) {
      this.errorMessage = 'Fecha de compra requerida.';
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

    this.loading = true;
    try {
      await this.api.renew(this.account.id, {
        purchaseDate: this.purchaseDate, // '2026-03-21' directo
        durationDays: this.durationDays,
        totalCost: cleanCost,
      });
      this.renewed.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
