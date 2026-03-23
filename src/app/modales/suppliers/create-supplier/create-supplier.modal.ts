import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuppliersService } from '../../../services/suppliers.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-create-supplier-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-supplier.modal.html',
})
export class CreateSupplierModal {
  api = inject(SuppliersService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  name = '';
  contact = '';
  notes = '';

  onClose() {
    this.reset();
    this.close.emit();
  }

  private reset() {
    this.loading = false;
    this.errorMessage = '';
    this.name = '';
    this.contact = '';
    this.notes = '';
  }

  async submit() {
    if (this.loading) return;

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
      await this.api.create({
        name,
        contact,
        notes: this.notes.trim() || undefined,
      });
      this.reset();
      this.created.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
