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
  StreamingPlatformsService,
  StreamingPlatformDTO,
} from '../../../services/streaming-platforms.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-edit-platform-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-platform.modal.html',
})
export class EditPlatformModal implements OnChanges {
  api = inject(StreamingPlatformsService);

  @Input() open = false;
  @Input() platform: StreamingPlatformDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  name = '';
  active = true;

  ngOnChanges() {
    if (this.platform) {
      this.name = this.platform.name ?? '';
      this.active = !!this.platform.active;
    }
    this.errorMessage = '';
  }

  onClose() {
    this.errorMessage = '';
    this.close.emit();
  }

  async submit() {
    if (!this.platform || this.loading) return;

    this.errorMessage = '';
    if (!this.name.trim()) {
      this.errorMessage = 'Nombre requerido.';
      return;
    }

    this.loading = true;
    try {
      await this.api.update(this.platform.id, {
        name: this.name.trim(),
        active: this.active,
      });
      this.updated.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
