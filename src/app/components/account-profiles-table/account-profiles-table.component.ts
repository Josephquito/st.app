import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StreamingAccountDTO,
  AccountProfileDTO,
} from '../../services/streaming-accounts.service';
import { StreamingSaleDTO } from '../../services/streaming-sales.service';
import { StreamingLabelDTO } from '../../services/streaming-labels.service';
import { AlertPipe, StatusPipe } from '../../pipes/status.pipe';

@Component({
  selector: 'app-account-profiles-table',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPipe, AlertPipe],
  templateUrl: './account-profiles-table.component.html',
})
export class AccountProfilesTableComponent {
  @Input() profiles: AccountProfileDTO[] = [];
  @Input() salesByProfileId = new Map<number, StreamingSaleDTO>();
  @Input() expanded = false;
  @Input() canSell = false;
  @Input() accountLabels: StreamingLabelDTO[] = [];
  @Input() loading = false;
  @Input() copiedKey = '';
  @Input() accountStatus: string = '';

  // Acciones de perfil/slot
  @Output() sell = new EventEmitter<AccountProfileDTO>();
  @Output() emptyProfile = new EventEmitter<AccountProfileDTO>();
  @Output() removeSlot = new EventEmitter<AccountProfileDTO>();
  @Output() addSlot = new EventEmitter<void>();
  @Output() emptyAll = new EventEmitter<void>();

  // Acciones del menú
  @Output() editSale = new EventEmitter<AccountProfileDTO>();
  @Output() renewSale = new EventEmitter<AccountProfileDTO>();
  @Output() pauseSale = new EventEmitter<AccountProfileDTO>();
  @Output() resumeSale = new EventEmitter<AccountProfileDTO>();
  @Output() refundSale = new EventEmitter<AccountProfileDTO>();
  @Output() copyRenew = new EventEmitter<AccountProfileDTO>();

  // Acciones inline
  @Output() copyInfo = new EventEmitter<AccountProfileDTO>();
  @Output() copyPassword = new EventEmitter<AccountProfileDTO>();
  @Output() menuToggle = new EventEmitter<{
    profile: AccountProfileDTO;
    rect: DOMRect;
  }>();

  @Output() noteBlur = new EventEmitter<{
    profile: AccountProfileDTO;
    event: Event;
  }>();
  @Output() renewalStatusChange = new EventEmitter<{
    profile: AccountProfileDTO;
    event: Event;
  }>();
  @Output() assignLabel = new EventEmitter<{
    profile: AccountProfileDTO;
    labelId: number | null;
  }>();

  // Menú flotante
  menuOpen = false;
  menuProfile: AccountProfileDTO | null = null;
  menuX = 0;
  menuY = 0;

  getSaleForProfile(p: AccountProfileDTO): StreamingSaleDTO | null {
    if (p.status === 'AVAILABLE') return null;
    return this.salesByProfileId.get(p.id) ?? null;
  }

  hasAnyPausedProfile(): boolean {
    return Array.from(this.salesByProfileId.values()).some(
      (s) => s.status === 'PAUSED',
    );
  }

  hasSoldProfiles(): boolean {
    return this.profiles.some((p) => p.status === 'SOLD');
  }

  toLabelId(value: string): number | null {
    return value === '' ? null : +value;
  }

  autoResize(event: Event) {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  // =========================
  // Menú flotante con smart positioning
  // =========================
  toggleProfileMenu(p: AccountProfileDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (p.status === 'AVAILABLE') return;
    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.menuToggle.emit({ profile: p, rect });
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuProfile = null;
  }
  getProfileLabel(
    p: AccountProfileDTO,
  ): { name: string; color: string } | null {
    return (p as any).label ?? null;
  }
}
