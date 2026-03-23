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
  SuppliersService,
  SupplierDTO,
} from '../../../services/suppliers.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-adjust-balance-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adjust-balance.modal.html',
})
export class AdjustBalanceModal implements OnChanges {
  api = inject(SuppliersService);

  @Input() open = false;
  @Input() supplier: SupplierDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  type: 'DEPOSIT' | 'WITHDRAW' = 'DEPOSIT';
  amount = '';
  reason = '';

  ngOnChanges() {
    if (this.open && this.supplier) {
      this.type = 'DEPOSIT';
      this.amount = '';
      this.reason = '';
      this.errorMessage = '';
      this.loading = false;
    }
  }

  onClose() {
    this.close.emit();
  }

  async submit() {
    if (this.loading || !this.supplier) return;

    const amount = parseFloat(this.amount);
    if (isNaN(amount) || amount <= 0) {
      this.errorMessage = 'Ingresa un monto válido mayor a 0.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      await this.api.adjustBalance(this.supplier.id, {
        type: this.type,
        amount,
        reason: this.reason.trim() || undefined,
      });
      this.updated.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
