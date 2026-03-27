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

import { StreamingAccountsService } from '../../../services/streaming-accounts.service';
import {
  SuppliersService,
  SupplierDTO,
} from '../../../services/suppliers.service';
import { StreamingPlatformDTO } from '../../../services/streaming-platforms.service';
import { parseApiError } from '../../../utils/error.utils';
import {
  todayISO,
  parseISODate,
  toISODate,
  addDays,
  addMonths,
} from '../../../utils/date.utils';
import { CreateSupplierModal } from '../../suppliers/create-supplier/create-supplier.modal';

@Component({
  selector: 'app-create-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateSupplierModal],
  templateUrl: './create-account.modal.html',
  styleUrls: ['../accounts.modal.css'],
})
export class CreateAccountModal implements OnChanges {
  api = inject(StreamingAccountsService);
  suppliersApi = inject(SuppliersService);

  @Input() open = false;
  @Input() platforms: StreamingPlatformDTO[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  suppliers: SupplierDTO[] = [];
  suppliersLoading = false;

  platformId: number | null = null;
  supplierId: number | null = null;

  supplierQuery = '';
  supplierDropdownOpen = false;
  supplierMatches: SupplierDTO[] = [];
  createSupplierOpen = false;

  email = '';
  password = '';
  profilesTotal = 5;
  purchaseDate = '';
  cutoffDate = '';
  totalCost = '0';
  notes = '';

  periodMonths: 1 | 3 | 6 | 12 | null = 1;
  periodDays: number | null = null;

  // =========================
  // Lifecycle
  // =========================
  async ngOnChanges() {
    this.errorMessage = '';

    if (this.open) {
      await this.loadSuppliers();

      if (!this.platformId && this.platforms.length) {
        this.platformId = this.platforms[0].id;
      }

      if (!this.purchaseDate) {
        this.purchaseDate = todayISO();
      }

      this.recalcCutoffDate();
      this.refreshSupplierMatches();
    }
  }

  // =========================
  // Suppliers
  // =========================
  async loadSuppliers() {
    this.suppliersLoading = true;
    try {
      this.suppliers = await this.suppliersApi.findAll();
    } catch {
      this.suppliers = [];
    } finally {
      this.suppliersLoading = false;
    }
  }

  onSupplierQueryChange() {
    this.supplierDropdownOpen = true;
    this.refreshSupplierMatches();

    const q = this.supplierQuery.trim().toLowerCase();
    if (this.supplierId) {
      const current = this.suppliers.find((x) => x.id === this.supplierId);
      const label = current
        ? `${current.name ?? ''} ${current.contact ?? ''}`.trim().toLowerCase()
        : '';
      if (q && !label.includes(q)) {
        this.supplierId = null;
      }
    }
  }

  refreshSupplierMatches() {
    const q = this.supplierQuery.trim().toLowerCase();
    if (!q) {
      this.supplierMatches = [];
      return;
    }
    this.supplierMatches = this.suppliers
      .filter((s) =>
        `${s.name ?? ''} ${s.contact ?? ''}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }

  selectSupplier(s: SupplierDTO) {
    this.supplierId = s.id;
    this.supplierQuery = this.getSupplierLabel(s);
    this.supplierDropdownOpen = false;
    this.supplierMatches = [];
  }

  onSupplierBlur() {
    setTimeout(() => {
      this.supplierDropdownOpen = false;
    }, 120);
  }

  openCreateSupplier() {
    this.supplierDropdownOpen = false;
    this.createSupplierOpen = true;
  }

  async onSupplierCreated(supplier: SupplierDTO) {
    this.createSupplierOpen = false;
    await this.loadSuppliers();
    this.selectSupplier(supplier);
  }

  onSupplierEnter(event: Event) {
    (event as KeyboardEvent).preventDefault();
    if (this.suppliersLoading) return;
    if (this.supplierId) {
      this.supplierDropdownOpen = false;
      return;
    }
    if (this.supplierMatches.length > 0) {
      this.selectSupplier(this.supplierMatches[0]);
    }
  }

  trackSupplier = (_: number, s: SupplierDTO) => s.id;

  getSupplierLabel(s: SupplierDTO): string {
    const name = (s.name ?? '').trim();
    const contact = (s.contact ?? '').trim();
    if (name && contact && contact !== name) return `${name} · ${contact}`;
    return name || contact || `#${s.id}`;
  }

  getSupplierLabelById(id: number): string {
    const s = this.suppliers.find((x) => x.id === id);
    return s ? this.getSupplierLabel(s) : '';
  }

  // =========================
  // Fechas y período
  // =========================
  recalcCutoffDate() {
    const base = parseISODate(this.purchaseDate);
    if (!base) {
      this.cutoffDate = '';
      return;
    }
    const days = Number(this.periodDays);
    if (Number.isFinite(days) && days >= 1) {
      this.cutoffDate = toISODate(addDays(base, days));
      return;
    }
    if (this.periodMonths !== null) {
      this.cutoffDate = toISODate(addMonths(base, this.periodMonths));
      return;
    }
    this.cutoffDate = '';
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

  // =========================
  // durationDays calculado
  // =========================
  get durationDays(): number {
    const days = Number(this.periodDays);
    if (Number.isFinite(days) && days >= 1) return days;
    if (this.periodMonths !== null) return this.periodMonths * 30;
    return 30;
  }

  // =========================
  // Modal helpers
  // =========================
  reset() {
    this.errorMessage = '';
    this.platformId = this.platforms?.[0]?.id ?? null;
    this.supplierId = null;
    this.supplierQuery = '';
    this.supplierMatches = [];
    this.supplierDropdownOpen = false;
    this.createSupplierOpen = false;
    this.email = '';
    this.password = '';
    this.profilesTotal = 5;
    this.purchaseDate = todayISO();
    this.periodMonths = 1;
    this.periodDays = null;
    this.totalCost = '0';
    this.notes = '';
    this.recalcCutoffDate();
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  // =========================
  // Submit
  // =========================
  async submit(): Promise<void> {
    this.errorMessage = '';
    if (this.loading) return;

    if (!this.platformId) {
      this.errorMessage = 'Selecciona una plataforma.';
      return;
    }
    if (!this.supplierId) {
      this.errorMessage = 'Selecciona un proveedor.';
      return;
    }
    if (!this.email.trim()) {
      this.errorMessage = 'Email requerido.';
      return;
    }
    if (!this.password) {
      this.errorMessage = 'Clave requerida.';
      return;
    }
    if (!Number.isInteger(this.profilesTotal) || this.profilesTotal < 1) {
      this.errorMessage = 'Debe tener al menos 1 perfil.';
      return;
    }
    if (!this.purchaseDate) {
      this.errorMessage = 'Fecha de compra requerida.';
      return;
    }
    if (!this.cutoffDate) {
      this.errorMessage = 'Fecha de corte requerida.';
      return;
    }

    this.loading = true;
    try {
      await this.api.create({
        platformId: this.platformId!,
        supplierId: this.supplierId!,
        email: this.email.trim(),
        password: this.password,
        profilesTotal: this.profilesTotal,
        durationDays: this.durationDays,
        purchaseDate: this.purchaseDate,
        cutoffDate: this.cutoffDate,
        totalCost: this.totalCost,
        notes: this.notes?.trim() || undefined,
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
