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
import { UsersService } from '../../../services/users.service';
import { AppRole } from '../../../services/auth.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-create-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-user.modal.html',
})
export class CreateUserModal implements OnChanges {
  private api = inject(UsersService);

  @Input() open = false;
  @Input() currentUserRole: AppRole = 'ADMIN';
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  email = '';
  password = '';
  nombre = '';
  phone = '';
  baseRole: AppRole = 'EMPLOYEE';

  loading = false;
  error = '';

  ngOnChanges() {
    this.setTargetRole();
  }

  private setTargetRole() {
    this.baseRole =
      this.currentUserRole === 'SUPERADMIN' ? 'ADMIN' : 'EMPLOYEE';
  }

  onClose() {
    if (this.loading) return;
    this.reset();
    this.close.emit();
  }

  async submit() {
    if (this.loading) return;

    const email = this.email.trim();
    const nombre = this.nombre.trim();
    const phone = this.phone.trim();

    if (!email || !nombre || !phone || !this.password) {
      this.error = 'Todos los campos son obligatorios';
      return;
    }

    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      await this.api.create({
        email,
        password: this.password,
        nombre,
        phone,
        baseRole: this.baseRole,
      });
      this.reset();
      this.created.emit();
    } catch (e: any) {
      this.error = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  private reset() {
    this.email = '';
    this.password = '';
    this.nombre = '';
    this.phone = '';
    this.error = '';
    this.setTargetRole();
  }
}
