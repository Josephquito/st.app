import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StreamingAccountDTO,
  AccountProfileDTO,
  StreamingAccountsService,
} from '../../services/streaming-accounts.service';
import {
  AlertPipe,
  StatusPipe,
  getProfileDotColor,
} from '../../pipes/status.pipe';
import { StreamingLabelDTO } from '../../services/streaming-labels.service';
import { parseISODate, todayISO } from '../../utils/date.utils';
import { parseApiError } from '../../utils/error.utils';
import { ToastService } from '../toast/toast.service';

type AccountAlertFilter = '' | 'EXPIRED' | 'TODAY' | '1_3_DAYS' | 'MORE_3_DAYS';
type ProfileAlertFilter =
  | ''
  | 'AVAILABLE'
  | 'EXPIRED'
  | 'TODAY'
  | '1_3_DAYS'
  | 'MORE_3_DAYS'
  | 'PAUSED';

@Component({
  selector: 'app-accounts-table',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPipe, AlertPipe],
  templateUrl: './accounts-table.component.html',
})
export class AccountsTableComponent {
  constructor(private api: StreamingAccountsService) {}
  private _accounts: StreamingAccountDTO[] = [];
  private toast = inject(ToastService);

  @Input() set accounts(value: StreamingAccountDTO[]) {
    this._accounts = value;
    this.recalcVisible();
  }
  get accounts(): StreamingAccountDTO[] {
    return this._accounts;
  }

  @Input() loading = false;
  @Input() canUpdate = false;
  @Input() canDelete = false;
  @Input() showLoadMore = false;
  @Input() labels: StreamingLabelDTO[] = [];

  @Output() viewAccount = new EventEmitter<StreamingAccountDTO>();
  @Output() editAccount = new EventEmitter<StreamingAccountDTO>();
  @Output() replaceAccount = new EventEmitter<StreamingAccountDTO>();
  @Output() renewAccount = new EventEmitter<StreamingAccountDTO>();
  @Output() changePassword = new EventEmitter<StreamingAccountDTO>();
  @Output() deleteAccount = new EventEmitter<StreamingAccountDTO>();
  @Output() refreshAccounts = new EventEmitter<void>();
  @Output() loadMore = new EventEmitter<void>();

  statusLoading = false;

  // ── Estado UI ─────────────────────────────────────────────────────────────
  menuOpen = false;
  menuAccount: StreamingAccountDTO | null = null;
  menuX = 0;
  menuY = 0;
  menuDirection: 'down' | 'up' = 'down';

  searchText = '';
  statusFilter: 'ACTIVE' | 'INACTIVE' | '' = '';
  labelFilter: number | '' = '';
  accountAlertFilter: AccountAlertFilter = '';
  profileAlertFilter: ProfileAlertFilter = '';
  visibleAccountsList: StreamingAccountDTO[] = [];
  copiedAccountId: number | null = null;

  readonly statusOptions = [
    { value: '' as const, label: 'Todos' },
    { value: 'ACTIVE' as const, label: 'Activa' },
    { value: 'INACTIVE' as const, label: 'Inactiva' },
  ];

  // ── Menú ──────────────────────────────────────────────────────────────────

  toggleMenu(a: StreamingAccountDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (this.menuOpen && this.menuAccount?.id === a.id) {
      this.closeMenu();
      return;
    }
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const menuWidth = 192;
    const approxMenuHeight = 260;
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = rect.right;
    if (x > vw - padding) x = vw - padding;
    if (x < menuWidth + padding) x = menuWidth + padding;
    const openUp = rect.bottom + approxMenuHeight > vh - padding;
    this.menuX = x;
    this.menuY = openUp ? rect.top : rect.bottom;
    this.menuDirection = openUp ? 'up' : 'down';
    this.menuAccount = a;
    this.menuOpen = true;
  }

  async toggleStatus(account: StreamingAccountDTO) {
    this.statusLoading = true;
    try {
      if (account.status === 'ACTIVE') {
        await this.api.inactivate(account.id);
      } else if (account.status === 'INACTIVE') {
        await this.api.reactivate(account.id);
      }
      this.refreshAccounts.emit();
    } catch (err) {
      this.toast.error(parseApiError(err));
    } finally {
      this.statusLoading = false;
      this.closeMenu();
    }
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuAccount = null;
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeMenu();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.closeMenu();
  }

  @HostListener('window:resize')
  onResize() {
    this.closeMenu();
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  setStatusFilter(value: 'ACTIVE' | 'INACTIVE' | '') {
    this.statusFilter = value;
    this.searchText = '';
    this.recalcVisible();
  }

  setLabelFilter(value: number | '') {
    this.labelFilter = value;
    this.searchText = '';
    this.recalcVisible();
  }

  setAccountAlertFilter(value: AccountAlertFilter) {
    this.accountAlertFilter = this.accountAlertFilter === value ? '' : value;
    this.searchText = '';
    this.recalcVisible();
  }

  setProfileAlertFilter(value: ProfileAlertFilter) {
    this.profileAlertFilter = this.profileAlertFilter === value ? '' : value;
    this.searchText = '';
    this.recalcVisible();
  }

  onFilterChange() {
    this.statusFilter = '';
    this.accountAlertFilter = '';
    this.profileAlertFilter = '';
    this.labelFilter = '';
    this.recalcVisible();
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = '';
    this.accountAlertFilter = '';
    this.profileAlertFilter = '';
    this.labelFilter = '';
    this.recalcVisible();
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchText ||
      this.statusFilter ||
      this.accountAlertFilter ||
      this.profileAlertFilter ||
      this.labelFilter
    );
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────

  daysRemaining(cutoffDate?: string | null): number | null {
    if (!cutoffDate) return null;
    const cutoff = parseISODate(cutoffDate);
    if (!cutoff) return null;
    const today = parseISODate(todayISO())!;
    return Math.ceil(
      (cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  usedProfilesText(a: StreamingAccountDTO): string {
    const total = a.profilesTotal ?? a.profiles?.length ?? 0;
    const sold = (a.profiles ?? []).filter((p) => p.status === 'SOLD').length;
    return `${sold}/${total}`;
  }

  trackAccount(_: number, a: StreamingAccountDTO): number {
    return a.id;
  }

  // ── Match filters ─────────────────────────────────────────────────────────

  private getAccountAlertGroup(
    cutoffDate: string | null | undefined,
  ): 'EXPIRED' | 'TODAY' | '1_3_DAYS' | 'MORE_3_DAYS' | 'NONE' {
    const days = this.daysRemaining(cutoffDate);
    if (days === null) return 'NONE';
    if (days < 0) return 'EXPIRED';
    if (days === 0) return 'TODAY';
    if (days <= 3) return '1_3_DAYS';
    return 'MORE_3_DAYS';
  }

  private matchesAccountAlertFilter(a: StreamingAccountDTO): boolean {
    if (!this.accountAlertFilter) return true;
    return this.getAccountAlertGroup(a.cutoffDate) === this.accountAlertFilter;
  }

  private matchesProfileAlertFilter(a: StreamingAccountDTO): boolean {
    if (!this.profileAlertFilter) return true;
    const profiles = a.profiles ?? [];

    switch (this.profileAlertFilter) {
      case 'AVAILABLE':
        return profiles.some((p) => p.status === 'AVAILABLE');
      case 'PAUSED':
        return profiles.some((p) => p.sales?.[0]?.status === 'PAUSED');
      case 'EXPIRED':
        return profiles.some((p) => {
          const sale = p.sales?.[0];
          if (!sale || p.status !== 'SOLD') return false;
          const days = this.daysRemaining(sale.cutoffDate);
          return days !== null && days < 0;
        });
      case 'TODAY':
        return profiles.some((p) => {
          const sale = p.sales?.[0];
          if (!sale || p.status !== 'SOLD') return false;
          return this.daysRemaining(sale.cutoffDate) === 0;
        });
      case '1_3_DAYS':
        return profiles.some((p) => {
          const sale = p.sales?.[0];
          if (!sale || p.status !== 'SOLD') return false;
          const days = this.daysRemaining(sale.cutoffDate);
          return days !== null && days >= 1 && days <= 3;
        });
      case 'MORE_3_DAYS':
        return profiles.some((p) => {
          const sale = p.sales?.[0];
          if (!sale || p.status !== 'SOLD') return false;
          const days = this.daysRemaining(sale.cutoffDate);
          return days !== null && days > 3;
        });
      default:
        return true;
    }
  }

  // ── Recalc — orden fijo, solo filtra ─────────────────────────────────────

  private recalcVisible() {
    const q = this.searchText.trim().toLowerCase();

    this.visibleAccountsList = this._accounts.filter((a) => {
      const matchSearch = q
        ? [a.platform?.name, a.email, a.password, a.supplier?.name, a.status]
            .join(' ')
            .toLowerCase()
            .includes(q)
        : true;

      const matchStatus = this.statusFilter
        ? a.status?.toUpperCase() === this.statusFilter
        : true;

      const matchLabel = this.labelFilter
        ? (a.profiles ?? []).some(
            (p) => (p as any).labelId === this.labelFilter,
          )
        : true;

      return (
        matchSearch &&
        matchStatus &&
        matchLabel &&
        this.matchesAccountAlertFilter(a) &&
        this.matchesProfileAlertFilter(a)
      );
    });
  }

  // ── Dots ──────────────────────────────────────────────────────────────────

  profileDotClass(p: AccountProfileDTO): string {
    const sale = p.sales?.[0];
    return getProfileDotColor(
      p.status,
      sale?.status ?? null,
      sale?.cutoffDate ?? null,
      (p as any).label?.color ?? null,
    );
  }

  profileDotTooltip(p: AccountProfileDTO): string {
    if (p.status === 'AVAILABLE') return '';
    if (p.status === 'BLOCKED') return '';

    const sale = p.sales?.[0];
    if (!sale) return '';
    if (sale.status === 'PAUSED') return '';

    const cutoff = parseISODate(sale.cutoffDate);
    const today = parseISODate(todayISO())!;
    if (!cutoff) return '';

    const days = Math.ceil(
      (cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (days < 0) return `-${Math.abs(days)}d`;
    if (days === 0) return 'Hoy';
    return `${days}d`;
  }

  // ── Copy ──────────────────────────────────────────────────────────────────

  copyAccountInfo(a: StreamingAccountDTO): void {
    const text = `${a.email}\n${a.password}`;
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });
    this.copiedAccountId = a.id;
    setTimeout(() => {
      if (this.copiedAccountId === a.id) this.copiedAccountId = null;
    }, 2000);
  }
}
