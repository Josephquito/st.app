import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CompanyDTO,
  CompaniesService,
} from '../../../services/companies.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-delete-company-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-company.modal.html',
})
export class DeleteCompanyModal {
  api = inject(CompaniesService);

  @Input() open = false;
  @Input() company: CompanyDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  onClose() {
    this.loading = false;
    this.errorMessage = '';
    this.close.emit();
  }

  async confirm() {
    if (!this.company || this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    try {
      await this.api.remove(this.company.id);
      this.deleted.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
