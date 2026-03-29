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

type SortKey =
  | 'ALERT'
  | 'STATUS'
  | 'PROFILES'
  | 'PROFILES_AVAIL'
  | 'PROFILES_CUTOFF'
  | 'CUTOFF'
  | 'PLATFORM'
  | 'EMAIL'
  | 'SUPPLIER'
  | null;
type SortDir = 'asc' | 'desc';

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
  sortKey: SortKey = 'ALERT';
  sortDir: SortDir = 'asc';
  visibleAccountsList: StreamingAccountDTO[] = [];
  copiedAccountId: number | null = null;

  readonly statusOptions = [
    { value: '' as const, label: 'Todos' },
    { value: 'ACTIVE' as const, label: 'Activa' },
    { value: 'INACTIVE' as const, label: 'Inactiva' },
  ];

  // ── Menú ──────────────────────────────────────────────────────────────────

  // ── Menú ──────────────────────────────────────────────────────────────────
  toggleMenu(a: StreamingAccountDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.menuOpen && this.menuAccount?.id === a.id) {
      this.closeMenu();
      return;
    }

    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();

    const menuWidth = 192; // w-48
    const approxMenuHeight = 260; // aproximado por la cantidad de opciones
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // El menú se alinea al borde derecho del botón
    // porque en el HTML usamos translateX(-100%)
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
    this.recalcVisible();
  }

  setLabelFilter(value: number | '') {
    this.labelFilter = value;
    this.recalcVisible();
  }

  onFilterChange() {
    this.recalcVisible();
  }

  hasActiveFilters(): boolean {
    return !!(this.searchText || this.statusFilter || this.labelFilter);
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = '';
    this.labelFilter = '';
    this.recalcVisible();
  }

  // ── Ordenamiento ──────────────────────────────────────────────────────────

  setSort(key: Exclude<SortKey, null>) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.recalcVisible();
  }

  sortIndicator(key: Exclude<SortKey, null>): string {
    if (this.sortKey !== key) return '↕';
    return this.sortDir === 'asc' ? '▲' : '▼';
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

  // ── Ranks para ordenamiento ───────────────────────────────────────────────

  private alertRank(cutoffDate: any) {
    const d = this.daysRemaining(cutoffDate);
    if (d === null) return { group: 3, within: 0 };
    if (d < 0) return { group: 0, within: Math.abs(d) };
    if (d === 0) return { group: 1, within: 0 };
    return { group: 2, within: d };
  }

  private statusRank(status: string): number {
    return status?.toUpperCase() === 'ACTIVE' ? 0 : 1;
  }

  private profilesRank(a: StreamingAccountDTO) {
    const m = this.usedProfilesText(a).match(/(\d+)\s*\/\s*(\d+)/);
    if (!m) return { used: 9999, total: 9999, ratio: 1 };
    const used = Number(m[1]);
    const total = Number(m[2]);
    return { used, total, ratio: total > 0 ? used / total : 1 };
  }

  private profilesAvailRank(a: StreamingAccountDTO): number {
    return (a.profiles ?? []).filter((p) => p.status === 'AVAILABLE').length;
  }

  private profilesCutoffRank(a: StreamingAccountDTO): number {
    const soldDates = (a.profiles ?? [])
      .map((p) => p.sales?.[0]?.cutoffDate)
      .filter(Boolean)
      .map((d) => new Date(d!).getTime());
    if (soldDates.length === 0) return Infinity;
    return Math.min(...soldDates);
  }

  private compareAccounts(
    a: StreamingAccountDTO,
    b: StreamingAccountDTO,
  ): number {
    const dir = this.sortDir === 'asc' ? 1 : -1;

    switch (this.sortKey) {
      case 'ALERT': {
        const ra = this.alertRank(a.cutoffDate);
        const rb = this.alertRank(b.cutoffDate);
        if (ra.group !== rb.group) return (ra.group - rb.group) * dir;
        if (ra.group === 0) return (rb.within - ra.within) * dir;
        return (ra.within - rb.within) * dir;
      }
      case 'CUTOFF': {
        const da = new Date(a.cutoffDate ?? '').getTime() || 0;
        const db = new Date(b.cutoffDate ?? '').getTime() || 0;
        return (da - db) * dir;
      }
      case 'STATUS':
        return (this.statusRank(a.status) - this.statusRank(b.status)) * dir;
      case 'PROFILES': {
        const pa = this.profilesRank(a);
        const pb = this.profilesRank(b);
        if (pa.used !== pb.used) return (pa.used - pb.used) * dir;
        if (pa.ratio !== pb.ratio) return (pa.ratio - pb.ratio) * dir;
        return (pa.total - pb.total) * dir;
      }
      case 'PROFILES_AVAIL':
        return (this.profilesAvailRank(a) - this.profilesAvailRank(b)) * dir;
      case 'PROFILES_CUTOFF':
        return (this.profilesCutoffRank(a) - this.profilesCutoffRank(b)) * dir;
      case 'PLATFORM':
        return (
          (a.platform?.name ?? '').localeCompare(b.platform?.name ?? '') * dir
        );
      case 'EMAIL':
        return a.email.localeCompare(b.email) * dir;
      case 'SUPPLIER':
        return (
          (a.supplier?.name ?? '').localeCompare(b.supplier?.name ?? '') * dir
        );
      default:
        return 0;
    }
  }

  // ── Recalc ────────────────────────────────────────────────────────────────

  private recalcVisible() {
    const q = this.searchText.trim().toLowerCase();

    let base = this._accounts.filter((a) => {
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

      return matchSearch && matchStatus && matchLabel;
    });

    if (this.labelFilter) {
      base = [...base].sort((a, b) => {
        const aAvail = (a.profiles ?? []).filter(
          (p) =>
            p.status === 'AVAILABLE' && (p as any).labelId === this.labelFilter,
        ).length;
        const bAvail = (b.profiles ?? []).filter(
          (p) =>
            p.status === 'AVAILABLE' && (p as any).labelId === this.labelFilter,
        ).length;
        return bAvail - aAvail;
      });
      this.visibleAccountsList = base;
      return;
    }

    this.visibleAccountsList = this.sortKey
      ? [...base].sort((a, b) => this.compareAccounts(a, b))
      : base;
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
    if (p.status === 'AVAILABLE') {
      const labelName = (p as any).label?.name;
      return labelName ? `Disponible · ${labelName}` : 'Disponible';
    }
    const sale = p.sales?.[0];
    if (!sale) return 'Vendido';
    if (sale.status === 'PAUSED') return 'Pausado';
    const cutoff = parseISODate(sale.cutoffDate);
    const today = parseISODate(todayISO())!;
    if (!cutoff) return 'Vendido';
    const days = Math.ceil(
      (cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return `Venció hace ${Math.abs(days)}d`;
    if (days === 0) return 'Vence hoy';
    return `Vence en ${days}d`;
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

  cycleProfilesSort() {
    if (this.sortKey === 'PROFILES_AVAIL' && this.sortDir === 'asc') {
      // disponibilidad asc → disponibilidad desc
      this.sortDir = 'desc';
    } else if (this.sortKey === 'PROFILES_AVAIL' && this.sortDir === 'desc') {
      // disponibilidad desc → vencimiento asc
      this.sortKey = 'PROFILES_CUTOFF';
      this.sortDir = 'asc';
    } else if (this.sortKey === 'PROFILES_CUTOFF' && this.sortDir === 'asc') {
      // vencimiento asc → vencimiento desc
      this.sortDir = 'desc';
    } else if (this.sortKey === 'PROFILES_CUTOFF' && this.sortDir === 'desc') {
      // vencimiento desc → sin orden
      this.sortKey = null;
    } else {
      // cualquier otro → disponibilidad asc
      this.sortKey = 'PROFILES_AVAIL';
      this.sortDir = 'asc';
    }
    this.recalcVisible();
  }

  profilesSortIndicator(): string {
    if (this.sortKey === 'PROFILES_AVAIL') {
      return this.sortDir === 'asc' ? '▲ disp' : '▼ disp';
    }
    if (this.sortKey === 'PROFILES_CUTOFF') {
      return this.sortDir === 'asc' ? '▲ vence' : '▼ vence';
    }
    return '↕';
  }
}
