// edit-customer.modal.ts
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
  CustomerDTO,
  CustomerSource,
  CustomersService,
} from '../../../services/customers.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-edit-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-customer.modal.html',
})
export class EditCustomerModal implements OnChanges {
  api = inject(CustomersService);

  @Input() open = false;
  @Input() customer: CustomerDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  name = '';
  contact = '';
  source: CustomerSource | '' = '';
  sourceNote = '';
  notes = '';
  balance = '';

  readonly sourceOptions: { value: CustomerSource; label: string }[] = [
    { value: 'INSTAGRAM', label: 'Instagram' },
    { value: 'FACEBOOK', label: 'Facebook' },
    { value: 'WHATSAPP', label: 'WhatsApp' },
    { value: 'REFERRAL', label: 'Referido' },
    { value: 'OTHER', label: 'Otro' },
  ];

  get needsSourceNote() {
    return this.source === 'OTHER';
  }

  ngOnChanges() {
    if (this.open && this.customer) {
      this.name = this.customer.name ?? '';
      this.contact = this.customer.contact ?? '';
      this.source = this.customer.source ?? '';
      this.sourceNote = this.customer.sourceNote ?? '';
      this.notes = this.customer.notes ?? '';
      this.balance = this.customer.balance ?? '';
      this.loading = false;
      this.errorMessage = '';
    }
  }

  onClose() {
    this.close.emit();
  }

  async submit() {
    if (!this.customer || this.loading) return;

    const name = this.name.trim();
    const contact = this.contact.trim();

    if (name.length < 2) {
      this.errorMessage = 'El nombre debe tener al menos 2 caracteres.';
      return;
    }
    if (contact.length < 2) {
      this.errorMessage = 'El contacto debe tener al menos 2 caracteres.';
      return;
    }
    if (this.source === 'OTHER' && !this.sourceNote.trim()) {
      this.errorMessage = 'Indica el origen cuando seleccionas "Otro".';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      await this.api.update(this.customer.id, {
        name,
        contact,
        source: this.source || undefined,
        sourceNote: this.needsSourceNote ? this.sourceNote.trim() : undefined,
        notes: this.notes.trim() || undefined,
        balance: this.balance.trim() || undefined,
      });
      this.updated.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
