import { Injectable, signal } from '@angular/core';

export interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toast = signal<Toast | null>(null);
  private timer: any;

  show(message: string, type: Toast['type'] = 'info', duration = 3000) {
    clearTimeout(this.timer);
    this.toast.set({ message, type });
    this.timer = setTimeout(() => this.toast.set(null), duration);
  }

  success(message: string) {
    this.show(message, 'success');
  }
  error(message: string) {
    this.show(message, 'error');
  }
  info(message: string) {
    this.show(message, 'info');
  }
  warning(message: string) {
    this.show(message, 'warning');
  }
}
