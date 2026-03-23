import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-action-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirm-action.modal.html',
})
export class ConfirmActionModal {
  @Input() open = false;
  @Input() title = '¿Estás seguro?';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() danger = false; // true = botón rojo, false = warning
  @Input() loading = false;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
