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
} from '../../../services/streaming-accounts.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password.modal.html',
})
export class ChangePasswordModal implements OnChanges {
  api = inject(StreamingAccountsService);

  @Input() open = false;
  @Input() account: StreamingAccountDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  password = '';
  showPassword = false;

  ngOnChanges() {
    if (this.open) {
      this.errorMessage = '';
      this.password = '';
      this.showPassword = false;
    }
  }

  onClose() {
    this.password = '';
    this.errorMessage = '';
    this.showPassword = false;
    this.loading = false;
    this.close.emit();
  }

  async submit() {
    if (!this.account || !this.password.trim()) return;
    this.errorMessage = '';
    this.loading = true;
    try {
      await this.api.update(this.account.id, { password: this.password });
      this.updated.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
