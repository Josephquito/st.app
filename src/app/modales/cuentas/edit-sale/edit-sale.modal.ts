import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StreamingSalesService,
  StreamingSaleDTO,
} from '../../../services/streaming-sales.service';
import {
  CustomersService,
  CustomerDTO,
} from '../../../services/customers.service';
import { StreamingAccountDTO } from '../../../services/streaming-accounts.service';
import { parseApiError } from '../../../utils/error.utils';
import {
  parseISODate,
  toISODate,
  addDays,
  addMonths,
} from '../../../utils/date.utils';
import { CreateCustomerModal } from '../../customers/create-customer/create-customer.modal';

type PeriodMonths = 1 | 3 | 6 | 12 | null;

@Component({
  selector: 'app-edit-sale-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateCustomerModal],
  templateUrl: './edit-sale.modal.html',
})
export class EditSaleModal implements OnChanges {
  api = inject(StreamingSalesService);
  customersApi = inject(CustomersService);

  @Input() open = false;
  @Input() sale: StreamingSaleDTO | null = null;
  @Input() account: StreamingAccountDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

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
    if (this.open && this.sale) {
      this.errorMessage = '';
      this.fillForm();
    }
  }

  fillForm() {
    if (!this.sale) return;

    const customerId = this.sale.customerId ?? (this.sale.customer as any)?.id;
    const customerName = (this.sale.customer as any)?.name ?? '';
    const customerContact = (this.sale.customer as any)?.contact ?? '';

    if (customerId) {
      const customer: CustomerDTO = {
        id: customerId,
        name: customerName,
        contact: customerContact,
        source: null,
      };
      this.customers = [customer];
      this.customerId = customerId;
      this.customerQuery = [customerName, customerContact]
        .filter(Boolean)
        .join(' · ');
    }

    this.salePrice = this.sale.salePrice;
    this.saleDate = this.sale.saleDate ? this.sale.saleDate.split('T')[0] : '';
    this.periodDays = this.sale.daysAssigned;
    this.periodMonths = null;
    this.recalcCutoffDate();
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

  onCustomerCreated(customer: CustomerDTO) {
    this.createCustomerOpen = false;
    if (!this.customers.find((x) => x.id === customer.id))
      this.customers.push(customer);
    this.selectCustomer(customer);
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
    if (this.customerMatches.length > 0)
      this.selectCustomer(this.customerMatches[0]);
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

  // =========================
  // Fechas y período
  // =========================
  recalcCutoffDate() {
    const base = parseISODate(this.saleDate);
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
  onClose() {
    this.customerMatches = [];
    this.customerDropdownOpen = false;
    this.close.emit();
  }

  async submit() {
    this.errorMessage = '';
    if (!this.customerId) {
      this.errorMessage = 'Selecciona un cliente.';
      return;
    }

    const cleanPrice = this.normalizeDecimal(this.salePrice);
    if (!cleanPrice) {
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
      await this.api.update(this.sale!.id, {
        customerId: this.customerId,
        salePrice: cleanPrice,
        saleDate: this.saleDate,
        daysAssigned: this.daysAssigned,
      });
      this.updated.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
