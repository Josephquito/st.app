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
  SupplierDTO,
  SuppliersService,
} from '../../../services/suppliers.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-edit-supplier-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-supplier.modal.html',
})
export class EditSupplierModal implements OnChanges {
  api = inject(SuppliersService);

  @Input() open = false;
  @Input() supplier: SupplierDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  name = '';
  contact = '';
  notes = '';

  ngOnChanges() {
    if (this.open && this.supplier) {
      this.name = this.supplier.name ?? '';
      this.contact = this.supplier.contact ?? '';
      this.notes = this.supplier.notes ?? '';
      this.errorMessage = '';
      this.loading = false;
    }
  }

  onClose() {
    this.close.emit();
  }

  async submit() {
    if (this.loading || !this.supplier) return;

    const name = this.name.trim();
    const contact = this.contact.trim();

    if (name.length < 2 || contact.length < 2) {
      this.errorMessage =
        'Nombre y contacto deben tener al menos 2 caracteres.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      await this.api.update(this.supplier.id, {
        name,
        contact,
        notes: this.notes.trim() || undefined,
      });
      this.updated.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
