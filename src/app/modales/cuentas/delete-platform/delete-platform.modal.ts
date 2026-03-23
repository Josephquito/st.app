import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  StreamingPlatformsService,
  StreamingPlatformDTO,
} from '../../../services/streaming-platforms.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-delete-platform-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delete-platform.modal.html',
})
export class DeletePlatformModal {
  api = inject(StreamingPlatformsService);

  @Input() open = false;
  @Input() platform: StreamingPlatformDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() deleted = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  onClose() {
    this.errorMessage = '';
    this.close.emit();
  }

  async submit() {
    if (!this.platform || this.loading) return;

    this.loading = true;
    this.errorMessage = '';
    try {
      await this.api.remove(this.platform.id);
      this.deleted.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
