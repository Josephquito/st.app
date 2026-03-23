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
import {
  AlertPipe,
  StatusPipe,
  getProfileDotColor,
} from '../../pipes/status.pipe';
import { StreamingLabelDTO } from '../../services/streaming-labels.service';

type SortKey = 'ALERT' | 'STATUS' | 'PROFILES' | 'CUTOFF' | null;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-accounts-table',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPipe, AlertPipe],
  templateUrl: './accounts-table.component.html',
})
export class AccountsTableComponent {
  private _accounts: StreamingAccountDTO[] = [];

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
  @Output() changeStatus = new EventEmitter<StreamingAccountDTO>();
  @Output() loadMore = new EventEmitter<void>();

  menuOpen = false;
  menuAccount: StreamingAccountDTO | null = null;
  menuX = 0;
  menuY = 0;

  searchText = '';
  statusFilter: 'ACTIVE' | 'INACTIVE' | '' = '';
  labelFilter: number | '' = '';
  sortKey: SortKey = 'ALERT';
  sortDir: SortDir = 'asc';
  visibleAccountsList: StreamingAccountDTO[] = [];

  copiedAccountId: number | null = null;

  // ── Menú ──────────────────────────────────────────────────────────────────

  toggleMenu(a: StreamingAccountDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (this.menuOpen && this.menuAccount?.id === a.id) {
      this.closeMenu();
      return;
    }
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    this.menuX = rect.right;
    this.menuY = rect.bottom + 6;
    this.menuAccount = a;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuAccount = null;
  }

  @HostListener('document:click') onDocClick() {
    this.closeMenu();
  }
  @HostListener('window:scroll') onScroll() {
    this.closeMenu();
  }
  @HostListener('window:resize') onResize() {
    this.closeMenu();
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  onFilterChange() {
    this.recalcVisible();
  }

  clearSearch() {
    this.searchText = '';
    this.statusFilter = '';
    this.labelFilter = '';
    this.recalcVisible();
  }

  setSort(key: Exclude<SortKey, null>) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.recalcVisible();
  }

  // ── Helpers UI ────────────────────────────────────────────────────────────

  daysRemaining(cutoffDate?: string | null): number | null {
    if (!cutoffDate) return null;
    const d = new Date(cutoffDate);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  usedProfilesText(a: StreamingAccountDTO): string {
    const total = a.profilesTotal ?? a.profiles?.length ?? 0;
    const sold = (a.profiles ?? []).filter((p) => p.status === 'SOLD').length;
    return `${sold}/${total}`;
  }

  trackAccount(_: number, a: StreamingAccountDTO): number {
    return a.id;
  }

  // ── Orden ─────────────────────────────────────────────────────────────────

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

  private compareAccounts(
    a: StreamingAccountDTO,
    b: StreamingAccountDTO,
  ): number {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    if (this.sortKey === 'ALERT') {
      const ra = this.alertRank(a.cutoffDate);
      const rb = this.alertRank(b.cutoffDate);
      if (ra.group !== rb.group) return (ra.group - rb.group) * dir;
      if (ra.group === 0) return (rb.within - ra.within) * dir;
      return (ra.within - rb.within) * dir;
    }
    if (this.sortKey === 'CUTOFF') {
      const da = new Date(a.cutoffDate ?? '').getTime() || 0;
      const db = new Date(b.cutoffDate ?? '').getTime() || 0;
      return (da - db) * dir;
    }
    if (this.sortKey === 'STATUS') {
      return (this.statusRank(a.status) - this.statusRank(b.status)) * dir;
    }
    if (this.sortKey === 'PROFILES') {
      const pa = this.profilesRank(a);
      const pb = this.profilesRank(b);
      if (pa.used !== pb.used) return (pa.used - pb.used) * dir;
      if (pa.ratio !== pb.ratio) return (pa.ratio - pb.ratio) * dir;
      return (pa.total - pb.total) * dir;
    }
    return 0;
  }

  // ── Recalc ────────────────────────────────────────────────────────────────

  private recalcVisible() {
    const q = this.searchText.trim().toLowerCase();

    let base = this._accounts.filter((a) => {
      const matchSearch = q
        ? [
            a.platform?.name,
            a.email,
            a.password,
            a.supplier?.name,
            a.status,
            a.cutoffDate ? new Date(a.cutoffDate).toLocaleDateString() : '',
            this.usedProfilesText(a),
          ]
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
    const d = new Date(sale.cutoffDate);
    const cutoff = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
    const today = new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
      ),
    );
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
}
