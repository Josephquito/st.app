import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CompaniesService } from '../../../services/companies.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-create-company-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-company.modal.html',
})
export class CreateCompanyModal {
  api = inject(CompaniesService);

  @Input() open = false;
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  name = '';
  phone = '';

  onClose() {
    this.reset();
    this.close.emit();
  }

  private reset() {
    this.loading = false;
    this.errorMessage = '';
    this.name = '';
    this.phone = '';
  }

  async submit() {
    if (this.loading) return;

    const name = this.name.trim();
    const phone = this.phone.trim();

    if (name.length < 2) {
      this.errorMessage = 'El nombre debe tener al menos 2 caracteres.';
      return;
    }
    if (phone.length < 5) {
      this.errorMessage = 'El teléfono debe tener al menos 5 caracteres.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      await this.api.create({ name, phone });
      this.reset();
      this.created.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
