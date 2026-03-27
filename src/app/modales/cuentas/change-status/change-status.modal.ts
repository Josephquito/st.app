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
  StreamingAccountsService,
  StreamingAccountDTO,
  StreamingAccountStatus,
} from '../../../services/streaming-accounts.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-change-status-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-status.modal.html',
})
export class ChangeStatusModal implements OnChanges {
  api = inject(StreamingAccountsService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  selectedStatus: StreamingAccountStatus | '' = '';

  readonly statusOptions: { value: StreamingAccountStatus; label: string }[] = [
    { value: 'ACTIVE', label: 'Activa' },
    { value: 'INACTIVE', label: 'Inactiva' },
  ];

  ngOnChanges() {
    if (this.open && this.account) {
      this.errorMessage = '';
      this.selectedStatus =
        this.account.status === 'DELETED' ? '' : this.account.status;
    }
  }

  onClose() {
    this.selectedStatus = '';
    this.errorMessage = '';
    this.loading = false;
    this.close.emit();
  }

  async submit() {
    if (!this.account || !this.selectedStatus) return;
    if (this.selectedStatus === this.account.status) {
      this.onClose();
      return;
    }
    this.errorMessage = '';
    this.loading = true;
    try {
      if (this.selectedStatus === 'INACTIVE') {
        await this.api.inactivate(this.account.id);
      } else if (this.selectedStatus === 'ACTIVE') {
        if (this.account.status === 'INACTIVE') {
          await this.api.reactivate(this.account.id);
        } else {
          this.errorMessage =
            'Para reactivar una cuenta expirada usa la opción de renovar.';
          return;
        }
      }
      this.updated.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
