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

import { StreamingSalesService } from '../../../services/streaming-sales.service';
import {
  CustomersService,
  CustomerDTO,
} from '../../../services/customers.service';
import {
  StreamingAccountDTO,
  AccountProfileDTO,
} from '../../../services/streaming-accounts.service';
import { parseApiError } from '../../../utils/error.utils';
import { CreateCustomerModal } from '../../customers/create-customer/create-customer.modal';

type PeriodMonths = 1 | 3 | 6 | 12 | null;

@Component({
  selector: 'app-create-sale-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateCustomerModal],
  templateUrl: './create-sale.modal.html',
})
export class CreateSaleModal implements OnChanges {
  api = inject(StreamingSalesService);
  customersApi = inject(CustomersService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;
  @Input() profile: AccountProfileDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  customers: CustomerDTO[] = [];
  customersLoading = false;

  customerId: number | null = null;
  customerQuery = '';
  customerDropdownOpen = false;
  customerMatches: CustomerDTO[] = [];

  createCustomerOpen = false;

  salePrice = '';
  saleDate = '';

  periodMonths: PeriodMonths = null;
  periodDays: number | null = 30;

  daysAssigned = 30;
  cutoffDate = '';

  // =========================
  // Lifecycle
  // =========================
  async ngOnChanges() {
    this.errorMessage = '';
    if (this.open) {
      if (!this.saleDate) this.saleDate = this.todayISO();
      if (this.periodDays == null && this.periodMonths == null)
        this.periodDays = 30;
      this.recalcCutoffDate();
    }
  }

  // =========================
  // Customers
  // =========================
  onCustomerQueryChange() {
    this.customerDropdownOpen = true;
    const q = this.customerQuery.trim();
    if (this.customerId) {
      const current = this.customers.find((x) => x.id === this.customerId);
      const label = current ? this.getCustomerLabel(current).toLowerCase() : '';
      if (q && !label.toLowerCase().includes(q.toLowerCase()))
        this.customerId = null;
    }
    this.searchCustomers(q);
  }

  private searchDebounce: any = null;

  searchCustomers(q: string) {
    clearTimeout(this.searchDebounce);
    if (q.length < 1) {
      this.customerMatches = [];
      return;
    }
    this.searchDebounce = setTimeout(async () => {
      this.customersLoading = true;
      try {
        const res = await this.customersApi.findAll({ limit: 10, search: q });
        this.customerMatches = res.data;
        for (const c of res.data) {
          if (!this.customers.find((x) => x.id === c.id))
            this.customers.push(c);
        }
      } catch {
        this.customerMatches = [];
      } finally {
        this.customersLoading = false;
      }
    }, 250);
  }

  selectCustomer(c: CustomerDTO) {
    this.customerId = c.id;
    this.customerQuery = this.getCustomerLabel(c);
    this.customerDropdownOpen = false;
    this.customerMatches = [];
  }

  onCustomerBlur() {
    setTimeout(() => {
      this.customerDropdownOpen = false;
    }, 120);
  }

  onCustomerEnter(event: Event) {
    (event as KeyboardEvent).preventDefault();
    if (this.customersLoading) return;
    if (this.customerId) {
      this.customerDropdownOpen = false;
      return;
    }
    if (this.customerMatches.length > 0) {
      this.selectCustomer(this.customerMatches[0]);
    }
  }

  trackCustomer = (_: number, c: CustomerDTO) => c.id;

  getCustomerLabel(c: CustomerDTO): string {
    const name = (c.name ?? '').trim();
    const contact = (c.contact ?? '').trim();
    const parts = [name, contact].filter(Boolean);
    return parts.length === 0 ? `#${c.id}` : parts.join(' · ');
  }

  getCustomerLabelById(id: number): string {
    const c = this.customers.find((x) => x.id === id);
    return c ? this.getCustomerLabel(c) : '';
  }

  async onCustomerCreated() {
    this.createCustomerOpen = false;
    const q = this.customerQuery.trim();
    if (q.length > 0) {
      this.customersLoading = true;
      try {
        const res = await this.customersApi.findAll({ limit: 10, search: q });
        this.customerMatches = res.data;
        for (const c of res.data) {
          if (!this.customers.find((x) => x.id === c.id))
            this.customers.push(c);
        }
      } catch {
        this.customerMatches = [];
      } finally {
        this.customersLoading = false;
      }
    }
  }

  // =========================
  // Fechas y período
  // =========================
  private todayISO(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
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

  private addDays(base: Date, days: number): Date {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  }

  private addMonths(base: Date, months: number): Date {
    const d = new Date(base);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d;
  }

  recalcCutoffDate() {
    const base = this.parseISODate(this.saleDate);
    if (!base) {
      this.cutoffDate = '';
      this.daysAssigned = 0;
      return;
    }

    const days = this.periodDays === null ? null : Number(this.periodDays);
    if (Number.isFinite(days as number) && (days as number) >= 1) {
      this.daysAssigned = days as number;
      this.cutoffDate = this.toISODate(this.addDays(base, this.daysAssigned));
      return;
    }

    if (this.periodMonths !== null) {
      const end = this.addMonths(base, this.periodMonths);
      this.cutoffDate = this.toISODate(end);
      this.daysAssigned = Math.max(
        1,
        Math.ceil((end.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return;
    }

    this.cutoffDate = '';
    this.daysAssigned = 0;
  }

  onSaleDateChange() {
    this.recalcCutoffDate();
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
    this.customerId = null;
    this.customerQuery = '';
    this.customerMatches = [];
    this.customerDropdownOpen = false;
    this.createCustomerOpen = false;
    this.salePrice = '';
    this.saleDate = this.todayISO();
    this.periodMonths = null;
    this.periodDays = 30;
    this.daysAssigned = 30;
    this.cutoffDate = '';
    this.recalcCutoffDate();
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  async submit(): Promise<void> {
    this.errorMessage = '';

    if (!this.account) {
      this.errorMessage = 'Cuenta inválida.';
      return;
    }
    if (!this.profile) {
      this.errorMessage = 'Perfil inválido.';
      return;
    }
    if (!this.customerId) {
      this.errorMessage = 'Selecciona un cliente.';
      return;
    }

    this.salePrice = this.normalizeDecimal(this.salePrice);

    if (!this.salePrice) {
      this.errorMessage = 'Precio de venta requerido.';
      return;
    }
    if (!this.saleDate) {
      this.errorMessage = 'Fecha de venta requerida.';
      return;
    }
    if (!Number.isInteger(this.daysAssigned) || this.daysAssigned <= 0) {
      this.errorMessage = 'Días asignados inválidos.';
      return;
    }

    this.loading = true;
    try {
      await this.api.create({
        accountId: this.account.id,
        profileId: this.profile.id,
        customerId: this.customerId,
        salePrice: this.salePrice,
        saleDate: this.saleDate,
        daysAssigned: this.daysAssigned,
      });
      this.created.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
