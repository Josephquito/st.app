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
  StreamingLabelsService,
  StreamingLabelDTO,
} from '../../../services/streaming-labels.service';
import { StreamingPlatformDTO } from '../../../services/streaming-platforms.service';
import { LABEL_COLORS, ColorNamePipe } from '../../../pipes/status.pipe';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-create-label-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-label.modal.html',
})
export class CreateLabelModal implements OnChanges {
  api = inject(StreamingLabelsService);

  @Input() open = false;
  @Input() platform: StreamingPlatformDTO | null = null;
  @Input() label: StreamingLabelDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  name = '';
  selectedColor = LABEL_COLORS[0].hex;
  readonly colors = LABEL_COLORS;

  get isEdit() {
    return !!this.label;
  }

  ngOnChanges() {
    this.errorMessage = '';
    if (this.open && this.label) {
      this.name = this.label.name;
      this.selectedColor = this.label.color;
    } else if (this.open && !this.label) {
      this.name = '';
      this.selectedColor = LABEL_COLORS[0].hex;
    }
  }

  onClose() {
    if (this.loading) return;
    this.errorMessage = '';
    this.close.emit();
  }

  async submit() {
    if (!this.name.trim()) {
      this.errorMessage = 'El nombre es requerido.';
      return;
    }
    if (!this.platform && !this.isEdit) {
      this.errorMessage = 'Plataforma requerida.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    try {
      if (this.isEdit && this.label) {
        await this.api.update(this.label.id, {
          name: this.name.trim(),
          color: this.selectedColor,
        });
      } else {
        await this.api.create({
          platformId: this.platform!.id,
          name: this.name.trim(),
          color: this.selectedColor,
        });
      }
      this.saved.emit();
      this.onClose();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }
}
