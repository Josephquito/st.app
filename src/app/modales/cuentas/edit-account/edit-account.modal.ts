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
import {
  SuppliersService,
  SupplierDTO,
} from '../../../services/suppliers.service';
import { StreamingPlatformDTO } from '../../../services/streaming-platforms.service';
import { CreateSupplierModal } from '../../suppliers/create-supplier/create-supplier.modal';
import { parseApiError } from '../../../utils/error.utils';
import {
  todayISO,
  parseISODate,
  toISODate,
  addDays,
  addMonths,
} from '../../../utils/date.utils';

@Component({
  selector: 'app-edit-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CreateSupplierModal],
  templateUrl: './edit-account.modal.html',
  styleUrls: ['../accounts.modal.css'],
})
export class EditAccountModal implements OnChanges {
  api = inject(StreamingAccountsService);
  suppliersApi = inject(SuppliersService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;
  @Input() platforms: StreamingPlatformDTO[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

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
  profilesTotal = 0;
  purchaseDate = '';
  cutoffDate = '';
  notes = '';
  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';

  periodMonths: 1 | 3 | 6 | 12 | null = null;
  periodDays: number | null = null;

  correctCostValue = '';
  loadingCorrectCost = false;
  correctCostError = '';
  correctCostSuccess = false;

  // =========================
  // Lifecycle
  // =========================
  async ngOnChanges() {
    this.errorMessage = '';
    if (this.open) {
      this.suppliersLoading = true;
      await this.loadSuppliers();
    }
    if (this.open && this.account) {
      this.hydrateFromAccount(this.account);
      this.refreshSupplierMatches();
    }
  }

  private hydrateFromAccount(a: StreamingAccountDTO) {
    this.platformId = a.platformId ?? (a as any)?.platform?.id ?? null;
    this.supplierId = a.supplierId ?? (a as any)?.supplier?.id ?? null;
    this.email = a.email ?? '';
    this.password = (a as any)?.password ?? '';
    this.profilesTotal = a.profilesTotal ?? 0;
    this.purchaseDate = this.toDateInput((a as any)?.purchaseDate);
    this.cutoffDate = this.toDateInput((a as any)?.cutoffDate);
    this.notes = (a as any)?.notes ?? '';
    this.status = ((a as any)?.status ?? 'ACTIVE') as any;
    this.periodMonths = null;
    this.periodDays = null;

    if (this.supplierId) {
      this.supplierQuery = this.getSupplierLabelById(this.supplierId);
    } else {
      this.supplierQuery = '';
    }

    if (!this.purchaseDate) this.purchaseDate = todayISO();

    this.correctCostValue = '';
    this.correctCostError = '';
    this.correctCostSuccess = false;
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
      if (q && !label.includes(q)) this.supplierId = null;
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
    if (this.supplierMatches.length > 0)
      this.selectSupplier(this.supplierMatches[0]);
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
  // Corrección de costo
  // =========================
  onCorrectCostChange(value: string) {
    if (value == null) {
      this.correctCostValue = '';
      return;
    }
    let s = value.replace(/[^0-9.,]/g, '');
    if (s.includes(',') && s.includes('.'))
      s = s.replace(/\./g, '').replace(',', '.');
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    const parts = s.split('.');
    if (parts.length > 2) s = parts.shift()! + '.' + parts.join('');
    this.correctCostValue = s;
  }

  async submitCorrectCost() {
    if (!this.account || !this.correctCostValue) return;
    this.correctCostError = '';
    this.correctCostSuccess = false;
    this.loadingCorrectCost = true;
    try {
      await this.api.correctCost(this.account.id, {
        totalCost: this.correctCostValue,
      });
      this.correctCostSuccess = true;
      this.correctCostValue = '';
      this.updated.emit();
    } catch (e: any) {
      this.correctCostError = parseApiError(e);
    } finally {
      this.loadingCorrectCost = false;
    }
  }

  // =========================
  // Fechas y período
  // =========================
  private toDateInput(v: any): string {
    if (!v) return '';
    const datePart = String(v).split('T')[0];
    return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
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

  private recalcCutoffDate() {
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
      const end = addMonths(base, this.periodMonths);
      this.cutoffDate = toISODate(end);
      return;
    }
    // Si no hay período nuevo, recalcula con durationDays actual de la cuenta
    if (this.account?.durationDays) {
      this.cutoffDate = toISODate(
        addDays(base, this.account.durationDays),
      );
    }
  }

  private getEffectiveDurationDays(): number {
    // Si el usuario seleccionó días explícitos
    const days = Number(this.periodDays);
    if (Number.isFinite(days) && days >= 1) return days;

    // Si el usuario seleccionó meses
    if (this.periodMonths !== null) {
      const base = parseISODate(this.purchaseDate);
      if (!base) return 0;
      const end = addMonths(base, this.periodMonths);
      return Math.max(
        1,
        Math.ceil((end.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    // Si no cambió el período, usar el de la cuenta actual
    return this.account?.durationDays ?? 0;
  }

  // =========================
  // Modal
  // =========================
  onClose() {
    this.errorMessage = '';
    this.supplierDropdownOpen = false;
    this.supplierMatches = [];
    this.createSupplierOpen = false;
    this.correctCostValue = '';
    this.correctCostError = '';
    this.correctCostSuccess = false;
    this.loadingCorrectCost = false;
    this.close.emit();
  }

  async submit(): Promise<void> {
    if (!this.account) return;
    this.errorMessage = '';

    if (!this.platformId) {
      this.errorMessage = 'Selecciona plataforma.';
      return;
    }
    if (!this.supplierId) {
      this.errorMessage = 'Selecciona o crea un proveedor.';
      return;
    }
    if (!this.email.trim()) {
      this.errorMessage = 'Email requerido.';
      return;
    }
    if (!this.purchaseDate) {
      this.errorMessage = 'Fecha de compra requerida.';
      return;
    }

    // Calcular durationDays efectivo
    const effectiveDurationDays = this.getEffectiveDurationDays();
    if (!effectiveDurationDays || effectiveDurationDays < 1) {
      this.errorMessage = 'Duración inválida.';
      return;
    }

    this.loading = true;
    try {
      await this.api.update(this.account.id, {
        platformId: this.platformId,
        supplierId: this.supplierId,
        email: this.email.trim(),
        password: this.password,
        purchaseDate: this.purchaseDate,
        durationDays: effectiveDurationDays,
        notes: this.notes?.trim() ? this.notes.trim() : null,
        ...(this.status !== this.account.status &&
        (this.status === 'INACTIVE' || this.status === 'ACTIVE')
          ? { status: this.status }
          : {}),
      });
      this.updated.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  onPurchaseDateChange() {
    const base = parseISODate(this.purchaseDate);
    if (!base) return;

    // Si el usuario seleccionó un período explícito, recalcula con ese
    if (this.periodDays !== null || this.periodMonths !== null) {
      this.recalcCutoffDate();
      return;
    }

    // Si no hay período, recalcula con los durationDays actuales de la cuenta
    if (this.account?.durationDays) {
      this.cutoffDate = toISODate(addDays(base, this.account.durationDays));
    }
  }
}
