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
  CompaniesService,
  CompanyDTO,
} from '../../../services/companies.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-edit-company-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-company.modal.html',
})
export class EditCompanyModal implements OnChanges {
  api = inject(CompaniesService);

  @Input() open = false;
  @Input() company: CompanyDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  name = '';
  phone = '';

  ngOnChanges() {
    if (this.open && this.company) {
      this.name = this.company.name ?? '';
      this.phone = this.company.phone ?? '';
      this.loading = false;
      this.errorMessage = '';
    }
  }

  onClose() {
    this.close.emit();
  }

  async submit() {
    if (!this.company || this.loading) return;

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
      await this.api.update(this.company.id, { name, phone });
      this.updated.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
