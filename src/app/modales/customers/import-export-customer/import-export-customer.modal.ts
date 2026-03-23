import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CustomersService,
  CustomerStatusFilter,
  CustomerSource,
} from '../../../services/customers.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-import-export-customer-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-export-customer.modal.html',
})
export class ImportExportCustomerModal {
  api = inject(CustomersService);

  @Input() open = false;
  @Input() search = '';
  @Input() statusFilter: CustomerStatusFilter | '' = '';
  @Input() sourceFilter: CustomerSource | '' = '';

  @Output() close = new EventEmitter<void>();
  @Output() imported = new EventEmitter<void>();

  importing = false;
  errorMessage = '';
  importResult: {
    ok: boolean;
    created: number;
    updated: number;
    total: number;
    errors: { row: number; name: string; errors: string[] }[];
  } | null = null;

  onClose() {
    this.errorMessage = '';
    this.importResult = null;
    this.close.emit();
  }

  async downloadTemplate() {
    try {
      await this.api.downloadTemplate();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  async exportCsv() {
    try {
      await this.api.exportCsv({
        search: this.search || undefined,
        status: this.statusFilter || undefined,
        source: this.sourceFilter || undefined,
      });
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.runImport(file);
    input.value = '';
  }

  async runImport(file: File) {
    this.importing = true;
    this.importResult = null;
    this.errorMessage = '';
    try {
      this.importResult = await this.api.importCsv(file);
      if (this.importResult.ok) this.imported.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.importing = false;
    }
  }
}
