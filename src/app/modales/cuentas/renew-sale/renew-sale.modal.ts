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
  StreamingSalesService,
  StreamingSaleDTO,
} from '../../../services/streaming-sales.service';
import { StreamingAccountDTO } from '../../../services/streaming-accounts.service';
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
  selector: 'app-renew-sale-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './renew-sale.modal.html',
})
export class RenewSaleModal implements OnChanges {
  api = inject(StreamingSalesService);

  @Input() open = false;
  @Input() sale: StreamingSaleDTO | null = null;
  @Input() account: StreamingAccountDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() renewed = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  salePrice = '';
  periodMonths: PeriodMonths = null;
  periodDays: number | null = 30;
  daysAssigned = 30;
  cutoffDate = '';
  todayLabel = '';

  // =========================
  // Lifecycle
  // =========================
  ngOnChanges() {
    if (this.open && this.sale) {
      this.errorMessage = '';
      this.salePrice = this.sale.salePrice;
      this.periodDays = this.sale.daysAssigned;
      this.periodMonths = null;
      this.todayLabel = new Date().toLocaleDateString('es-EC', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      this.recalcCutoffDate();
    }
  }

  // =========================
  // Fechas y período
  // =========================
  recalcCutoffDate() {
    const base = parseISODate(todayISO());
    if (!base) {
      this.cutoffDate = '';
      this.daysAssigned = 0;
      return;
    }

    const days = this.periodDays === null ? null : Number(this.periodDays);
    if (Number.isFinite(days as number) && (days as number) >= 1) {
      this.daysAssigned = days as number;
      this.cutoffDate = toISODate(addDays(base, this.daysAssigned));
      return;
    }

    if (this.periodMonths !== null) {
      const end = addMonths(base, this.periodMonths);
      this.cutoffDate = toISODate(end);
      this.daysAssigned = Math.max(
        1,
        Math.ceil((end.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return;
    }

    this.cutoffDate = '';
    this.daysAssigned = 0;
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
    this.salePrice = '';
    this.periodMonths = null;
    this.periodDays = 30;
    this.daysAssigned = 30;
    this.cutoffDate = '';
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  async submit() {
    this.errorMessage = '';

    const cleanPrice = this.normalizeDecimal(this.salePrice);
    if (!cleanPrice) {
      this.errorMessage = 'Precio de venta requerido.';
      return;
    }
    if (!this.daysAssigned || this.daysAssigned <= 0) {
      this.errorMessage = 'Duración inválida.';
      return;
    }

    this.loading = true;
    try {
      await this.api.renew(this.sale!.id, {
        saleDate: todayISO(),
        daysAssigned: this.daysAssigned,
        salePrice: cleanPrice,
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
