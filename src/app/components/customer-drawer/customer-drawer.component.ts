import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CustomersService,
  CustomerDTO,
  CustomerHistoryReport,
} from '../../services/customers.service';
import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../utils/error.utils';

@Component({
  selector: 'app-customer-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customer-drawer.component.html',
})
export class CustomerDrawerComponent implements OnChanges, OnDestroy {
  api = inject(CustomersService);
  auth = inject(AuthService);

  @Input() open = false;
  @Input() customer: CustomerDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<CustomerDTO>();
  @Output() delete = new EventEmitter<CustomerDTO>();
  @Output() notesUpdated = new EventEmitter<{
    notes: string;
    customerId: number;
  }>();

  loading = false;
  errorMessage = '';
  report: CustomerHistoryReport | null = null;

  saleStatusFilter: 'ACTIVE' | 'CANCELED' | '' = '';

  // Notas
  notes = '';
  notesSaving = false;
  notesSaved = false;
  notesError = '';
  private notesTimer: any = null;

  // Saldo
  balanceDraft = '';

  copied = '';

  get canUpdate() {
    return this.auth.hasPermission('CUSTOMERS:UPDATE');
  }
  get canDelete() {
    return this.auth.hasPermission('CUSTOMERS:DELETE');
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.errorMessage = '';

    if (this.open && this.customer) {
      if (changes['customer']) {
        this.notes = this.customer.notes ?? '';
        this.balanceDraft = this.customer.balance ?? '';
        this.saleStatusFilter = '';
      }
      if (changes['open']?.currentValue === true || changes['customer']) {
        await this.load();
      }
    }

    if (!this.open) {
      this.report = null;
      this.notesSaved = false;
      this.notesError = '';
      this.balanceDraft = '';
      clearTimeout(this.notesTimer);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.notesTimer);
  }

  async load() {
    if (!this.customer) return;
    this.loading = true;
    try {
      this.report = await this.api.getHistory(
        this.customer.id,
        this.saleStatusFilter || undefined,
      );
      this.notes = this.report.customer.notes ?? '';
      this.balanceDraft = this.report.customer.balance ?? '';
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  onFilterChange() {
    this.load();
  }

  // ── Notas ─────────────────────────────────────────────────────────────────

  onNotesBlur() {
    if (!this.customer || this.notes === (this.report?.customer?.notes ?? ''))
      return;
    clearTimeout(this.notesTimer);
    this.saveNotes();
  }

  private async saveNotes() {
    if (!this.customer || !this.canUpdate) return;
    const customerId = this.customer.id;
    const notes = this.notes;
    this.notesSaving = true;
    this.notesError = '';
    try {
      await this.api.update(customerId, { notes });
      if (this.report) this.report.customer.notes = notes;
      this.notesSaved = true;
      this.notesUpdated.emit({ notes, customerId });
      setTimeout(() => (this.notesSaved = false), 2000);
    } catch (e: any) {
      this.notesError = parseApiError(e);
    } finally {
      this.notesSaving = false;
    }
  }

  // ── Saldo ─────────────────────────────────────────────────────────────────

  private normalizeBalance(raw: string): string {
    // reemplaza coma decimal por punto, elimina espacios
    const cleaned = raw.trim().replace(',', '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return '';
    return num.toFixed(2);
  }

  onBalanceBlur() {
    if (!this.customer) return;
    const balance = this.normalizeBalance(this.balanceDraft);
    this.balanceDraft = balance; // ← actualiza el input con el valor normalizado
    if (balance === (this.report?.customer?.balance ?? '')) return;
    this.saveBalance(balance);
  }

  private async saveBalance(balance: string) {
    if (!this.customer || !this.canUpdate) return;
    try {
      await this.api.update(this.customer.id, {
        balance: balance !== '' ? balance : undefined, // ← solo undefined si realmente está vacío
      });
      if (this.report) this.report.customer.balance = balance || null;
    } catch (e: any) {
      this.notesError = parseApiError(e);
    }
  }

  // ── Cerrar ────────────────────────────────────────────────────────────────

  onClose() {
    clearTimeout(this.notesTimer);
    if (this.customer && this.notes !== (this.report?.customer?.notes ?? '')) {
      this.saveNotes();
    }
    if (
      this.customer &&
      this.balanceDraft.trim() !== (this.report?.customer?.balance ?? '')
    ) {
      this.saveBalance(this.balanceDraft.trim());
    }
    this.report = null;
    this.errorMessage = '';
    this.notesSaved = false;
    this.notesError = '';
    this.close.emit();
  }

  // ── Utils ─────────────────────────────────────────────────────────────────

  async copyToClipboard(text?: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.copied = text;
      setTimeout(() => (this.copied = ''), 1200);
    } catch {
      this.copied = '';
    }
  }

  statusBadge(status: string): string {
    return status === 'ACTIVE' ? 'badge-success' : 'badge-ghost';
  }

  calcMargin(salePrice: string, costAtSale: string): string {
    return (parseFloat(salePrice) - parseFloat(costAtSale)).toFixed(2);
  }
}
