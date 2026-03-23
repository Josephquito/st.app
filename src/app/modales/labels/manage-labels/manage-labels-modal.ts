import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  StreamingLabelsService,
  StreamingLabelDTO,
} from '../../../services/streaming-labels.service';
import { StreamingPlatformDTO } from '../../../services/streaming-platforms.service';
import { CreateLabelModal } from '../create-label/create-label.modal';
import { ConfirmActionModal } from '../../confirmacion/confirm-action/confirm-action.modal';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-manage-labels-modal',
  standalone: true,
  imports: [CommonModule, CreateLabelModal, ConfirmActionModal],
  templateUrl: './manage-labels-modal.html',
})
export class ManageLabelsModal implements OnChanges {
  api = inject(StreamingLabelsService);

  @Input() open = false;
  @Input() platform: StreamingPlatformDTO | null = null;

  @Output() close = new EventEmitter<void>();

  loading = false;
  errorMessage = '';
  labels: StreamingLabelDTO[] = [];

  createOpen = false;
  selectedLabel: StreamingLabelDTO | null = null;

  confirmDeleteOpen = false;
  labelToDelete: StreamingLabelDTO | null = null;
  loadingDelete = false;

  async ngOnChanges() {
    if (this.open && this.platform) {
      await this.load();
    }
    if (!this.open) {
      this.createOpen = false;
      this.selectedLabel = null;
      this.confirmDeleteOpen = false;
      this.labelToDelete = null;
      this.errorMessage = '';
    }
  }

  async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      this.labels = await this.api.findAll(this.platform!.id);
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  openCreate() {
    this.selectedLabel = null;
    this.createOpen = true;
  }

  openEdit(label: StreamingLabelDTO) {
    this.selectedLabel = label;
    this.createOpen = true;
  }

  async onSaved() {
    this.createOpen = false;
    this.selectedLabel = null;
    await this.load();
  }

  confirmDelete(label: StreamingLabelDTO) {
    this.labelToDelete = label;
    this.confirmDeleteOpen = true;
  }

  async onDeleteConfirm() {
    if (!this.labelToDelete) return;
    this.loadingDelete = true;
    try {
      await this.api.remove(this.labelToDelete.id);
      this.confirmDeleteOpen = false;
      this.labelToDelete = null;
      await this.load();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loadingDelete = false;
    }
  }

  onClose() {
    this.close.emit();
  }
}
