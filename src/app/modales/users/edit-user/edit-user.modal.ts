import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, UserDTO } from '../../../services/users.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-edit-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-user.modal.html',
  styleUrls: ['./edit-user.modal.css'],
})
export class EditUserModal implements OnChanges {
  private api = inject(UsersService);

  @Input() open = false;
  @Input() user: UserDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  nombre = '';
  phone = '';
  password = '';
  status: UserDTO['status'] = 'ACTIVE'; // ← tipo directo del DTO

  private originalNombre = '';
  private originalPhone = '';
  private originalStatus: UserDTO['status'] = 'ACTIVE';

  loading = false;
  error = '';

  ngOnChanges() {
    if (!this.user) return;

    this.nombre = this.user.nombre ?? '';
    this.phone = this.user.phone ?? '';
    this.status = this.user.status ?? 'ACTIVE';
    this.password = '';
    this.error = '';

    this.originalNombre = this.nombre.trim();
    this.originalPhone = this.phone.trim();
    this.originalStatus = this.status;
  }

  onClose() {
    if (this.loading) return;
    this.close.emit();
  }

  async submit() {
    if (!this.user || this.loading) return;

    const nombre = this.nombre.trim();
    const phone = this.phone.trim();

    if (!nombre || !phone) {
      this.error = 'Nombre y teléfono son obligatorios';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const payload: any = {};

      if (nombre !== this.originalNombre) payload.nombre = nombre;
      if (phone !== this.originalPhone) payload.phone = phone;
      if (this.status !== this.originalStatus) payload.status = this.status;
      if (this.password && this.password.length >= 6)
        payload.password = this.password;

      if (Object.keys(payload).length === 0) {
        this.updated.emit();
        return;
      }

      await this.api.update(this.user.id, payload);
      this.updated.emit();
    } catch (e: any) {
      this.error = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
