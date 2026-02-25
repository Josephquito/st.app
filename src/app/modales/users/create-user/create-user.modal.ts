import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  OnInit,
  OnChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UsersService, AppRole } from '../../../services/users.service';

@Component({
  selector: 'app-create-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-user.modal.html',
})
export class CreateUserModal implements OnChanges {
  private api = inject(UsersService);

  @Input() open = false;
  @Input() currentUserRole: AppRole = 'ADMIN'; // Recibimos el rol de quien crea
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();

  email = '';
  password = '';
  nombre = '';
  phone = '';
  baseRole: AppRole = 'EMPLOYEE';

  loading = false;
  error = '';

  // Cada vez que cambie el rol de quien crea, recalculamos el rol del nuevo usuario
  ngOnChanges() {
    this.setTargetRole();
  }

  private setTargetRole() {
    if (this.currentUserRole === 'SUPERADMIN') {
      this.baseRole = 'ADMIN';
    } else {
      this.baseRole = 'EMPLOYEE';
    }
  }

  onClose() {
    if (this.loading) return;
    this.reset();
    this.close.emit();
  }

  async submit() {
    // ... (Tu lógica de validación se mantiene igual)
    this.loading = true;
    try {
      await this.api.create({
        email: this.email.trim(),
        password: this.password,
        nombre: this.nombre.trim(),
        phone: this.phone.trim(),
        baseRole: this.baseRole, // Se envía el rol calculado automáticamente
      });
      this.reset();
      this.created.emit();
    } catch (e: any) {
      this.error = e?.error?.message || 'Error creando usuario';
    } finally {
      this.loading = false;
    }
  }

  private reset() {
    this.email = '';
    this.password = '';
    this.nombre = '';
    this.phone = '';
    this.setTargetRole(); // Reiniciar al rol que corresponde
    this.error = '';
  }
}
