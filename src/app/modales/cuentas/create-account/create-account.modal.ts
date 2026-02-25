import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { StreamingAccountsService } from '../../../services/streaming-accounts.service';
import {
  SuppliersService,
  SupplierDTO,
} from '../../../services/suppliers.service';
import { StreamingPlatformDTO } from '../../../services/streaming-platforms.service';

@Component({
  selector: 'app-create-account-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-account.modal.html',
  styleUrls: ['../accounts.modal.css'],
})
export class CreateAccountModal {
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

  // ✅ typeahead proveedor
  supplierQuery = '';
  supplierDropdownOpen = false;
  supplierMatches: SupplierDTO[] = [];
  creatingSupplier = false;

  email = '';
  password = '';
  profilesTotal = 5;

  purchaseDate = '';
  cutoffDate = '';
  totalCost = '0';
  notes = '';

  async ngOnChanges() {
    this.errorMessage = '';

    if (this.open) {
      await this.loadSuppliers();

      if (!this.platformId && this.platforms.length) {
        this.platformId = this.platforms[0].id;
      }

      if (!this.purchaseDate) {
        this.purchaseDate = this.todayISO();
      }

      this.refreshSupplierMatches();
    }
  }

  async loadSuppliers() {
    this.suppliersLoading = true;
    try {
      this.suppliers = await this.suppliersApi.findAll();
      // NO autoseleccionamos proveedor, porque ahora se busca
      // pero si quieres default, descomenta:
      // if (!this.supplierId && this.suppliers.length) this.supplierId = this.suppliers[0].id;
    } catch {
      this.suppliers = [];
    } finally {
      this.suppliersLoading = false;
    }
  }

  // ====== Supplier typeahead ======
  onSupplierQueryChange() {
    this.supplierDropdownOpen = true;
    this.refreshSupplierMatches();

    // si el usuario escribe algo diferente al proveedor seleccionado, deselecciona
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

    // filtra por name o contact
    this.supplierMatches = this.suppliers
      .filter((s) => {
        const hay = `${s.name ?? ''} ${s.contact ?? ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 8); // top 8 para no hacer enorme el dropdown
  }

  selectSupplier(s: SupplierDTO) {
    this.supplierId = s.id;
    this.supplierQuery = this.getSupplierLabel(s);
    this.supplierDropdownOpen = false;
    this.supplierMatches = [];
  }

  // blur: cerramos dropdown (con timeout para permitir click mousedown)
  onSupplierBlur() {
    setTimeout(() => {
      this.supplierDropdownOpen = false;
    }, 120);
  }

  canCreateSupplierFromQuery(): boolean {
    const q = this.supplierQuery.trim();
    if (q.length < 2) return false;

    // si ya hay match exacto por name o contact, no crear
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
      // crea en backend name/contact igual
      const created = await this.suppliersApi.create({
        name: q,
        contact: q,
      });

      // refresca lista (asumiendo que tu create retorna el supplier creado;
      // si no retorna, hacemos reload)
      if (created?.id) {
        this.suppliers = [created, ...this.suppliers];
        this.selectSupplier(created);
      } else {
        await this.loadSuppliers();
        // intenta encontrarlo por exact match
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

  private todayISO(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // ====== Modal helpers ======
  reset() {
    this.errorMessage = '';
    this.platformId = this.platforms?.[0]?.id ?? null;

    this.supplierId = null;
    this.supplierQuery = '';
    this.supplierMatches = [];
    this.supplierDropdownOpen = false;
    this.creatingSupplier = false;

    this.email = '';
    this.password = '';
    this.profilesTotal = 5;

    this.purchaseDate = this.todayISO();

    // ✅ default: 1 mes (o null si prefieres que el usuario elija)
    this.periodMonths = 1;
    this.periodDays = null;

    this.totalCost = '0';
    this.notes = '';

    // ✅ calcula cutoffDate
    this.recalcCutoffDate();
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  async submit(): Promise<void> {
    this.errorMessage = '';
    if (this.loading || this.creatingSupplier) return;

    if (!this.platformId) {
      this.errorMessage = 'Selecciona plataforma.';
      return;
    }

    // ✅ proveedor requerido ahora: o seleccionas uno existente o lo creas
    if (!this.supplierId) {
      this.errorMessage = 'Selecciona o crea un proveedor.';
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
    if (!Number.isInteger(this.profilesTotal) || this.profilesTotal < 0) {
      this.errorMessage = 'profilesTotal inválido.';
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
      await this.api.create({
        platformId: this.platformId,
        supplierId: this.supplierId,
        email: this.email.trim(),
        password: this.password,
        profilesTotal: this.profilesTotal,
        purchaseDate: this.purchaseDate,
        cutoffDate: this.cutoffDate,
        totalCost: this.totalCost,
        notes: this.notes?.trim() ? this.notes.trim() : undefined,
      });

      this.created.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = e?.error?.message ?? 'No se pudo crear la cuenta.';
    } finally {
      this.loading = false;
    }
  }

  onSupplierEnter(event: Event) {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();

    if (this.creatingSupplier || this.suppliersLoading) return;

    const q = this.supplierQuery.trim();

    // 1️⃣ ya hay proveedor seleccionado
    if (this.supplierId) {
      this.supplierDropdownOpen = false;
      return;
    }

    // 2️⃣ hay matches → selecciona el primero
    if (this.supplierMatches.length > 0) {
      this.selectSupplier(this.supplierMatches[0]);
      return;
    }

    // 3️⃣ no hay matches → crear
    if (q.length >= 2 && this.canCreateSupplierFromQuery()) {
      this.createSupplierFromQuery();
    }
  }

  //acepta solo números y coma/punto decimal
  onTotalCostChange(value: string) {
    if (value == null) {
      this.totalCost = '';
      return;
    }

    // 1️⃣ elimina todo menos números, punto y coma
    let sanitized = value.replace(/[^0-9.,]/g, '');

    // 2️⃣ si hay coma y punto, asumimos que la coma es separador decimal
    // ej: 1.234,56 → 1234.56
    if (sanitized.includes(',') && sanitized.includes('.')) {
      sanitized = sanitized.replace(/\./g, '').replace(',', '.');
    }

    // 3️⃣ si solo hay coma → la convertimos a punto
    if (sanitized.includes(',') && !sanitized.includes('.')) {
      sanitized = sanitized.replace(',', '.');
    }

    // 4️⃣ evita múltiples puntos
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts.shift()! + '.' + parts.join('');
    }

    this.totalCost = sanitized;
  }

  // ✅ Periodo para calcular cutoffDate
  periodMonths: 1 | 3 | 6 | 12 | null = 1; // default: 1 mes (puedes dejar null si prefieres)
  periodDays: number | null = null;

  private parseISODate(dateStr: string): Date | null {
    // dateStr esperado: YYYY-MM-DD
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
    // Maneja meses respetando fin de mes (ej: Jan 31 + 1 mes => Feb 28/29)
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

    // ✅ PRIORIDAD: si hay días válidos, manda días
    const days = Number(this.periodDays);
    if (Number.isFinite(days) && days >= 1) {
      this.cutoffDate = this.toISODate(this.addDays(base, days));
      return;
    }

    // ✅ si no hay días, usa meses (si hay)
    if (this.periodMonths !== null) {
      this.cutoffDate = this.toISODate(this.addMonths(base, this.periodMonths));
      return;
    }

    // nada seleccionado
    this.cutoffDate = '';
  }

  onPeriodMonthsChange(value: any) {
    const v = value === null ? null : Number(value);

    this.periodMonths =
      v === 1 || v === 3 || v === 6 || v === 12 ? (v as 1 | 3 | 6 | 12) : null;

    // ✅ Si elige mes, limpiamos días (para que no haya conflicto)
    if (this.periodMonths !== null) {
      this.periodDays = null;
    }

    this.recalcCutoffDate();
  }

  onPeriodDaysChange(value: any) {
    // value puede ser '', null, number
    const raw = value === '' || value === null ? null : Number(value);

    // ✅ si es inválido o <1, lo tomamos como null (vacío)
    if (!Number.isFinite(raw as number) || (raw as number) < 1) {
      this.periodDays = null;
      // ⚠️ aquí NO tocamos meses; queda lo que esté seleccionado
      this.recalcCutoffDate();
      return;
    }

    // ✅ si escribe días válidos, los guardamos y ANULAMOS meses
    this.periodDays = raw as number;
    this.periodMonths = null;

    this.recalcCutoffDate();
  }
}
