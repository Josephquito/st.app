import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
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

@Component({
  selector: 'app-edit-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-account.modal.html',
  styleUrls: ['../accounts.modal.css'], // ✅ comparte CSS (ajusta ruta si aplica)
})
export class EditAccountModal {
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

  // ✅ typeahead proveedor (igual que create)
  supplierQuery = '';
  supplierDropdownOpen = false;
  supplierMatches: SupplierDTO[] = [];
  creatingSupplier = false;

  email = '';
  password = '';
  profilesTotal = 0;

  purchaseDate = '';
  cutoffDate = '';
  totalCost = '0';
  notes = '';

  status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE';

  // ✅ Periodo para calcular cutoffDate (igual que create)
  periodMonths: 1 | 3 | 6 | 12 | null = 1;
  periodDays: number | null = null;

  async ngOnChanges() {
    this.errorMessage = '';

    if (this.open) {
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

    this.totalCost = String((a as any)?.totalCost ?? '0');
    this.notes = (a as any)?.notes ?? '';
    this.status = ((a as any)?.status ?? 'ACTIVE') as any;

    // ✅ pinta el label del proveedor en el input
    if (this.supplierId) {
      this.supplierQuery = this.getSupplierLabelById(this.supplierId);
    } else {
      this.supplierQuery = '';
    }

    // ✅ si ya tengo purchase + cutoff y quiero “adivinar” periodo, lo dejo simple:
    // por defecto 1 mes si no hay nada.
    if (!this.purchaseDate) {
      this.purchaseDate = this.todayISO();
    }

    // si no quieres tocar el cutoff existente, NO recalcules automático aquí.
    // Si sí quieres recalcular al abrir, descomenta:
    // this.recalcCutoffDate();
  }

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

  // ====== Supplier typeahead (igual que create) ======
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
      .filter((s) => {
        const hay = `${s.name ?? ''} ${s.contact ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
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

  canCreateSupplierFromQuery(): boolean {
    const q = this.supplierQuery.trim();
    if (q.length < 2) return false;

    const exact = this.suppliers.some((s) => {
      const name = (s.name ?? '').trim().toLowerCase();
      const contact = (s.contact ?? '').trim().toLowerCase();
      const qq = q.toLowerCase();
      return name === qq || contact === qq;
    });

    return !exact;
  }

  async createSupplierFromQuery() {
    const q = this.supplierQuery.trim();
    if (q.length < 2 || this.creatingSupplier) return;

    this.creatingSupplier = true;
    this.errorMessage = '';

    try {
      const created = await this.suppliersApi.create({ name: q, contact: q });

      if (created?.id) {
        this.suppliers = [created, ...this.suppliers];
        this.selectSupplier(created);
      } else {
        await this.loadSuppliers();
        const found = this.suppliers.find(
          (s) =>
            (s.name ?? '').trim().toLowerCase() === q.toLowerCase() ||
            (s.contact ?? '').trim().toLowerCase() === q.toLowerCase(),
        );
        if (found) this.selectSupplier(found);
      }
    } catch (e: any) {
      this.errorMessage = e?.error?.message ?? 'No se pudo crear el proveedor.';
    } finally {
      this.creatingSupplier = false;
    }
  }

  onSupplierEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();

    if (this.creatingSupplier || this.suppliersLoading) return;

    const q = this.supplierQuery.trim();

    if (this.supplierId) {
      this.supplierDropdownOpen = false;
      return;
    }

    if (this.supplierMatches.length > 0) {
      this.selectSupplier(this.supplierMatches[0]);
      return;
    }

    if (q.length >= 2 && this.canCreateSupplierFromQuery()) {
      this.createSupplierFromQuery();
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

  // ====== Total cost (igual que create) ======
  onTotalCostChange(value: string) {
    if (value == null) {
      this.totalCost = '';
      return;
    }

    let sanitized = value.replace(/[^0-9.,]/g, '');

    if (sanitized.includes(',') && sanitized.includes('.')) {
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    }

    if (sanitized.includes(',') && !sanitized.includes('.')) {
      sanitized = sanitized.replace(',', '.');
    }

    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts.shift()! + '.' + parts.join('');
    }

    this.totalCost = sanitized;
  }

  // ====== Periodo -> cutoffDate (igual que create) ======
  onPurchaseDateChange(value: string) {
    this.purchaseDate = value;
    this.recalcCutoffDate();
  }

  onPeriodMonthsChange(value: any) {
    const v = value === null ? null : Number(value);

    this.periodMonths =
      v === 1 || v === 3 || v === 6 || v === 12 ? (v as 1 | 3 | 6 | 12) : null;

    if (this.periodMonths !== null) {
      this.periodDays = null;
    }

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
    return new Date(y, m - 1, d);
  }

  private toISODate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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

  private recalcCutoffDate() {
    const base = this.parseISODate(this.purchaseDate);
    if (!base) {
      this.cutoffDate = '';
      return;
    }

    const days = Number(this.periodDays);
    if (Number.isFinite(days) && days >= 1) {
      this.cutoffDate = this.toISODate(this.addDays(base, days));
      return;
    }

    if (this.periodMonths !== null) {
      this.cutoffDate = this.toISODate(this.addMonths(base, this.periodMonths));
      return;
    }

    this.cutoffDate = '';
  }

  // ====== helpers ======
  private toDateInput(v: any) {
    if (!v) return '';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '';
    return this.toISODate(d);
  }

  private todayISO(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  onClose() {
    this.errorMessage = '';
    this.supplierDropdownOpen = false;
    this.supplierMatches = [];
    this.creatingSupplier = false;
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
      this.errorMessage = 'purchaseDate requerida.';
      return;
    }

    if (!this.cutoffDate) {
      this.errorMessage = 'cutoffDate requerida.';
      return;
    }

    this.loading = true;
    try {
      await this.api.update(this.account.id, {
        platformId: this.platformId,
        supplierId: this.supplierId,
        email: this.email.trim(),
        password: this.password,
        profilesTotal: this.profilesTotal,
        purchaseDate: this.purchaseDate,
        cutoffDate: this.cutoffDate,
        totalCost: this.totalCost,
        notes: this.notes?.trim() ? this.notes.trim() : null,
        status: this.status,
      });

      this.updated.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage =
        e?.error?.message ?? 'No se pudo actualizar la cuenta.';
    } finally {
      this.loading = false;
    }
  }
}
