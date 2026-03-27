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
  SuppliersService,
  SupplierDTO,
} from '../../services/suppliers.service';
import { AuthService } from '../../services/auth.service';
import { parseApiError } from '../../utils/error.utils';
import { parseISODate, todayISO } from '../../utils/date.utils';
import { AlertPipe, StatusPipe } from '../../pipes/status.pipe';

export type SupplierAccount = {
  id: number;
  email: string;
  purchaseDate: string;
  cutoffDate: string;
  status: string;
  totalCost: string;
  platform: { id: number; name: string };
};

@Component({
  selector: 'app-supplier-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPipe, AlertPipe],
  templateUrl: './supplier-drawer.component.html',
})
export class SupplierDrawerComponent implements OnChanges, OnDestroy {
  api = inject(SuppliersService);
  auth = inject(AuthService);

  @Input() open = false;
  @Input() supplier: SupplierDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<SupplierDTO>();
  @Output() adjustBalance = new EventEmitter<SupplierDTO>();
  @Output() delete = new EventEmitter<SupplierDTO>();
  @Output() notesUpdated = new EventEmitter<{
    notes: string;
    supplierId: number;
  }>();

  loading = false;
  errorMessage = '';
  accounts: SupplierAccount[] = [];
  showInactive = false;

  notes = '';
  notesSaving = false;
  notesSaved = false;
  notesError = '';
  private notesTimer: any = null;

  get canUpdate() {
    return this.auth.hasPermission('SUPPLIERS:UPDATE');
  }
  get canDelete() {
    return this.auth.hasPermission('SUPPLIERS:DELETE');
  }
  get activeAccounts() {
    return this.accounts.filter((a) => a.status === 'ACTIVE');
  }
  get inactiveAccounts() {
    return this.accounts.filter((a) => a.status !== 'ACTIVE');
  }

  async ngOnChanges(changes: SimpleChanges) {
    this.errorMessage = '';

    if (this.open && this.supplier) {
      // ✅ Siempre sincronizar notes cuando el supplier cambia
      if (changes['supplier']) {
        this.notes = this.supplier.notes ?? '';
      }

      if (changes['open']?.currentValue === true || changes['supplier']) {
        await this.load();
      }
    }

    if (!this.open) {
      this.accounts = [];
      this.showInactive = false;
      this.notesSaved = false;
      this.notesError = '';
      clearTimeout(this.notesTimer);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.notesTimer);
  }

  async load() {
    if (!this.supplier) return;
    this.loading = true;
    try {
      this.accounts = await this.api.accountsBySupplier(this.supplier.id);
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  onNotesBlur() {
    if (!this.supplier || this.notes === (this.supplier.notes ?? '')) return;
    clearTimeout(this.notesTimer);
    this.saveNotes();
  }

  private async saveNotes() {
    if (!this.supplier || !this.canUpdate) return;
    const supplierId = this.supplier.id; // guardar antes de que se nullifique
    const notes = this.notes;
    this.notesSaving = true;
    this.notesError = '';
    try {
      await this.api.update(supplierId, { notes });
      this.supplier = this.supplier ? { ...this.supplier, notes } : null;
      this.notesSaved = true;
      this.notesUpdated.emit({ notes, supplierId }); // ✅ emite con id
      setTimeout(() => (this.notesSaved = false), 2000);
    } catch (e: any) {
      this.notesError = parseApiError(e);
    } finally {
      this.notesSaving = false;
    }
  }

  onClose() {
    clearTimeout(this.notesTimer);

    // Guardar en paralelo sin esperar — el panel se cierra inmediato
    if (this.supplier && this.notes !== (this.supplier.notes ?? '')) {
      this.saveNotes();
    }

    this.accounts = [];
    this.showInactive = false;
    this.errorMessage = '';
    this.notesSaved = false;
    this.notesError = '';
    this.close.emit();
  }

  daysRemaining(date?: string | null): number | null {
    if (!date) return null;
    const cutoff = parseISODate(date);
    if (!cutoff) return null;
    const today = parseISODate(todayISO())!;
    return Math.ceil((cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  alertBadgeClass(days: number | null): string {
    if (days === null) return 'badge-ghost';
    if (days < 0) return 'badge-error';
    if (days <= 3) return 'badge-warning';
    return 'badge-success';
  }

  alertLabel(days: number | null): string {
    if (days === null) return '—';
    if (days < 0) return `Hace ${Math.abs(days)}d`;
    if (days === 0) return 'Vence hoy';
    return `${days}d`;
  }
}
