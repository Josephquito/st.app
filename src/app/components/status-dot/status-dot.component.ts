import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusPipe, StatusDisplay } from '../../pipes/status.pipe';

@Component({
  selector: 'app-status-dot',
  standalone: true,
  imports: [CommonModule, StatusPipe],
  template: `
    <span class="flex items-center gap-2">
      <span
        class="h-2 w-2 rounded-full flex-shrink-0"
        [ngClass]="display.color"
      >
      </span>
      <span class="text-sm">{{ display.label }}</span>
    </span>
  `,
})
export class StatusDotComponent {
  @Input() set status(val: string) {
    this.display = new StatusPipe().transform(val);
  }
  display: StatusDisplay = { color: 'bg-base-content/30', label: '' };
}
