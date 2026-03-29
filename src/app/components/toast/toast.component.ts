import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (toast.toast()) {
      <div class="toast toast-end toast-bottom z-[99999]">
        <div
          class="alert"
          [class.alert-success]="toast.toast()?.type === 'success'"
          [class.alert-error]="toast.toast()?.type === 'error'"
          [class.alert-info]="toast.toast()?.type === 'info'"
          [class.alert-warning]="toast.toast()?.type === 'warning'"
        >
          <span>{{ toast.toast()?.message }}</span>
        </div>
      </div>
    }
  `,
})
export class ToastComponent {
  toast = inject(ToastService);
}
