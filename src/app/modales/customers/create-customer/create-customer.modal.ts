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
  CustomersService,
  CustomerSource,
} from '../../../services/customers.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-create-customer-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-customer.modal.html',
})
export class CreateCustomerModal implements OnChanges {
  api = inject(CustomersService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  name = '';
  contact = '';
  source: CustomerSource | '' = '';
  sourceNote = '';
  notes = '';
  balance = '';

  suggestedName = '';
  loadingSuggestion = false;

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

  async ngOnChanges() {
    if (this.open) {
      await this.loadSuggestedName();
    }
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  private reset() {
    this.loading = false;
    this.errorMessage = '';
    this.name = '';
    this.contact = '';
    this.source = '';
    this.sourceNote = '';
    this.notes = '';
    this.balance = '';
  }

  async submit() {
    if (this.loading) return;

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
      await this.api.create({
        name,
        contact,
        source: this.source || undefined,
        sourceNote: this.needsSourceNote ? this.sourceNote.trim() : undefined,
        notes: this.notes.trim() || undefined,
        balance: this.balance.trim() || undefined,
      });
      this.reset();
      this.created.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
  async loadSuggestedName() {
    this.loadingSuggestion = true;
    try {
      const res = await this.api.getNextCustomerNumber();
      this.suggestedName = res.suggestedName;
    } catch {
      this.suggestedName = '';
    } finally {
      this.loadingSuggestion = false;
    }
  }
}
