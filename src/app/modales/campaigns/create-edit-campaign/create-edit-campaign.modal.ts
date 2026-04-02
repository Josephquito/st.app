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
  CampaignsService,
  CampaignDTO,
} from '../../../services/campaigns.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-create-edit-campaign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-edit-campaign.modal.html',
  styleUrls: ['./create-edit-campaign.modal.css'],
})
export class CreateEditCampaignModal implements OnChanges {
  private api = inject(CampaignsService);

  @Input() open = false;
  @Input() campaign: CampaignDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  loading = false;
  errorMessage = '';

  // Campos
  name = '';
  message = '';
  imageUrl = '';
  segment = 'ALL';

  get isEdit(): boolean {
    return !!this.campaign;
  }

  ngOnChanges() {
    this.errorMessage = '';
    if (this.open) {
      if (this.campaign) {
        this.name = this.campaign.name;
        this.message = this.campaign.message;
        this.imageUrl = this.campaign.imageUrl ?? '';
        this.segment = this.campaign.segment ?? 'ALL';
      } else {
        this.reset();
      }
    }
  }

  reset() {
    this.name = '';
    this.message = '';
    this.imageUrl = '';
    this.segment = 'ALL';
    this.errorMessage = '';
  }

  onClose() {
    this.reset();
    this.close.emit();
  }

  async submit() {
    this.errorMessage = '';
    if (this.loading) return;

    if (!this.name.trim()) {
      this.errorMessage = 'El nombre es requerido.';
      return;
    }
    if (!this.message.trim()) {
      this.errorMessage = 'El mensaje es requerido.';
      return;
    }

    this.loading = true;
    try {
      const dto = {
        name: this.name.trim(),
        message: this.message.trim(),
        imageUrl: this.imageUrl.trim() || undefined,
        segment: this.segment || 'ALL',
      };

      if (this.isEdit) {
        await this.api.update(this.campaign!.id, dto);
      } else {
        await this.api.create(dto);
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
