// components/accounts-excel-table/accounts-excel-table.component.ts
import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StreamingAccountsService,
  StreamingAccountDTO,
  CreateStreamingAccountDto,
  AccountProfileDTO,
} from '../../services/streaming-accounts.service';
import { StreamingPlatformDTO } from '../../services/streaming-platforms.service';
import { StreamingLabelDTO } from '../../services/streaming-labels.service';
import { parseApiError } from '../../utils/error.utils';

export type DraftAccount = {
  _isDraft: true;
  _id: string;
  platformId: number | null;
  email: string;
  password: string;
  supplierId: number | null;
  purchaseDate: string;
  durationDays: number | null;
  cutoffDate: string;
  totalCost: string;
  notes: string;
  profilesTotal: number | null;
};

@Component({
  selector: 'app-accounts-excel-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts-excel-table.component.html',
  styleUrls: ['./accounts-excel-table.component.css'],
})
export class AccountsExcelTableComponent implements OnChanges {
  private api = inject(StreamingAccountsService);

  @Input() accounts: StreamingAccountDTO[] = [];
  @Input() platforms: StreamingPlatformDTO[] = [];
  @Input() labels: StreamingLabelDTO[] = [];
  @Input() loading = false;
  @Input() canUpdate = false;
  @Input() canDelete = false;
  @Input() canSell = false;
  @Input() activePlatformId: number | null = null;

  @Output() refreshAccounts = new EventEmitter<void>();
  @Output() renewAccount = new EventEmitter<StreamingAccountDTO>();
  @Output() replaceAccount = new EventEmitter<StreamingAccountDTO>();
  @Output() deleteAccount = new EventEmitter<StreamingAccountDTO>();

  drafts: DraftAccount[] = [];
  savingDraftId: string | null = null;
  errorByDraftId: Record<string, string> = {};

  // Filtra por plataforma activa
  get visibleAccounts(): StreamingAccountDTO[] {
    if (!this.activePlatformId) return this.accounts;
    return this.accounts.filter(
      (a) => a.platform?.id === this.activePlatformId,
    );
  }

  // Drafts filtrados por plataforma activa
  get visibleDrafts(): DraftAccount[] {
    if (!this.activePlatformId) return this.drafts;
    return this.drafts.filter((d) => d.platformId === this.activePlatformId);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activePlatformId']) {
      // Limpiar drafts de otras plataformas al cambiar tab
    }
  }

  addDraft() {
    const draft: DraftAccount = {
      _isDraft: true,
      _id: crypto.randomUUID(),
      platformId: this.activePlatformId,
      email: '',
      password: '',
      supplierId: null,
      purchaseDate: '',
      durationDays: null,
      cutoffDate: '',
      totalCost: '',
      notes: '',
      profilesTotal: null,
    };
    this.drafts.unshift(draft);
  }

  removeDraft(id: string) {
    this.drafts = this.drafts.filter((d) => d._id !== id);
    delete this.errorByDraftId[id];
  }

  isDraftComplete(draft: DraftAccount): boolean {
    return !!(
      draft.platformId &&
      draft.email.trim() &&
      draft.password.trim() &&
      draft.supplierId &&
      draft.purchaseDate &&
      draft.durationDays &&
      draft.durationDays > 0 &&
      draft.cutoffDate &&
      draft.totalCost &&
      parseFloat(draft.totalCost) > 0 &&
      draft.profilesTotal &&
      draft.profilesTotal > 0
    );
  }

  async saveDraft(draft: DraftAccount) {
    if (!this.isDraftComplete(draft)) return;
    this.savingDraftId = draft._id;
    this.errorByDraftId[draft._id] = '';

    try {
      const dto: CreateStreamingAccountDto = {
        platformId: draft.platformId!,
        supplierId: draft.supplierId!,
        email: draft.email.trim(),
        password: draft.password.trim(),
        profilesTotal: draft.profilesTotal!,
        durationDays: draft.durationDays!,
        purchaseDate: draft.purchaseDate,
        cutoffDate: draft.cutoffDate,
        totalCost: draft.totalCost,
        notes: draft.notes || undefined,
      };

      await this.api.create(dto);
      this.removeDraft(draft._id);
      this.refreshAccounts.emit();
    } catch (e: any) {
      this.errorByDraftId[draft._id] = parseApiError(e);
    } finally {
      this.savingDraftId = null;
    }
  }

  getAlertLabel(cutoffDate: string): {
    text: string;
    type: 'ok' | 'warn' | 'danger';
  } {
    if (!cutoffDate) return { text: '—', type: 'ok' };
    const today = new Date();
    const cutoff = new Date(cutoffDate);
    const diff = Math.ceil(
      (cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff < 0) return { text: 'Vencido', type: 'danger' };
    if (diff <= 7) return { text: `${diff}d`, type: 'warn' };
    return { text: `${diff}d`, type: 'ok' };
  }

  formatDate(date: string): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  trackByAccountId(_: number, a: StreamingAccountDTO) {
    return a.id;
  }

  trackByDraftId(_: number, d: DraftAccount) {
    return d._id;
  }

  getActiveSale(profile: AccountProfileDTO) {
    return profile.sales?.[0] ?? null;
  }
}
