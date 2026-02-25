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
import {
  StreamingAccountDTO,
  AccountProfileDTO,
} from '../../../services/streaming-accounts.service';

type PeriodMonths = 1 | 3 | 6 | 12 | null;

@Component({
  selector: 'app-edit-sale-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  // Clientes
  customers: CustomerDTO[] = [];
  customersLoading = false;
  customerId: number | null = null;
  customerQuery = '';
  customerDropdownOpen = false;
  customerMatches: CustomerDTO[] = [];
  creatingCustomer = false;

  // Venta
  salePrice = '';
  saleDate = '';
  periodMonths: PeriodMonths = null;
  periodDays: number | null = 30;
  daysAssigned = 30;
  cutoffDate = '';
  notes = '';

  async ngOnChanges() {
    if (this.open && this.sale) {
      this.errorMessage = '';
      await this.loadCustomers();
      this.fillForm();
    }
  }

  fillForm() {
    if (!this.sale) return;
    this.customerId = this.sale.customerId;
    this.customerQuery = this.getCustomerLabelById(this.sale.customerId);
    this.salePrice = this.sale.salePrice.replace('.', ','); // Mostramos con coma por defecto si prefieres

    if (this.sale.saleDate) {
      this.saleDate = this.sale.saleDate.split('T')[0];
    }

    this.periodDays = this.sale.daysAssigned;
    this.notes = this.sale.notes || '';
    this.recalcCutoffDate();
  }

  // --- Lógica de Clientes ---
  async loadCustomers() {
    this.customersLoading = true;
    try {
      this.customers = await this.customersApi.findAll();
    } catch {
      this.customers = [];
    } finally {
      this.customersLoading = false;
    }
  }

  onCustomerQueryChange() {
    this.customerDropdownOpen = true;
    const q = this.customerQuery.trim().toLowerCase();
    this.customerMatches = this.customers
      .filter((c) => `${c.name} ${c.contact || ''}`.toLowerCase().includes(q))
      .slice(0, 8);
  }

  selectCustomer(c: CustomerDTO) {
    this.customerId = c.id;
    this.customerQuery = this.getCustomerLabel(c);
    this.customerDropdownOpen = false;
  }

  getCustomerLabel(c: any): string {
    return [c.name, c.contact, c.source].filter(Boolean).join(' · ');
  }

  getCustomerLabelById(id: number): string {
    const c = this.customers.find((x) => x.id === id);
    return c ? this.getCustomerLabel(c) : '';
  }

  // --- Lógica de Fechas y Periodos (Igual a Create) ---
  onSaleDateChange() {
    this.recalcCutoffDate();
  }

  onPeriodMonthsChange(value: any) {
    const v = value === null ? null : Number(value);
    this.periodMonths = v as PeriodMonths;
    if (this.periodMonths !== null) this.periodDays = null;
    this.recalcCutoffDate();
  }

  onPeriodDaysChange(value: any) {
    const raw = value === '' || value === null ? null : Number(value);
    this.periodDays = raw;
    this.periodMonths = null;
    this.recalcCutoffDate();
  }

  recalcCutoffDate() {
    if (!this.saleDate) return;
    const base = new Date(this.saleDate + 'T00:00:00');

    if (this.periodDays && this.periodDays >= 1) {
      this.daysAssigned = this.periodDays;
    } else if (this.periodMonths) {
      const end = new Date(base);
      end.setMonth(end.getMonth() + this.periodMonths);
      const diff = end.getTime() - base.getTime();
      this.daysAssigned = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    const res = new Date(base);
    res.setDate(base.getDate() + this.daysAssigned);
    this.cutoffDate = res.toISOString().split('T')[0];
  }

  // --- Normalización de Decimales (Clave para aceptar comas) ---
  private normalizeDecimal(value: string): string {
    if (!value) return '';
    let sanitized = value.replace(/[^0-9.,]/g, '');
    if (sanitized.includes(',') && sanitized.includes('.')) {
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    } else if (sanitized.includes(',')) {
      sanitized = sanitized.replace(',', '.');
    }
    return sanitized;
  }

  onClose() {
    this.close.emit();
  }

  async submit() {
    this.errorMessage = '';
    if (!this.customerId) {
      this.errorMessage = 'Seleccione un cliente';
      return;
    }

    const cleanPrice = this.normalizeDecimal(this.salePrice);
    if (!cleanPrice) {
      this.errorMessage = 'Precio inválido';
      return;
    }

    this.loading = true;
    try {
      await this.api.update(this.sale!.id, {
        customerId: this.customerId,
        salePrice: cleanPrice,
        saleDate: new Date(this.saleDate).toISOString(),
        daysAssigned: this.daysAssigned,
        notes: this.notes.trim() || undefined,
      });
      this.updated.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = e?.error?.message || 'Error al actualizar';
    } finally {
      this.loading = false;
    }
  }
}
