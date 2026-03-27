import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import {
  StreamingAccountsService,
  ProfileWithContextDTO,
  StreamingAccountDTO,
  AccountProfileDTO,
} from '../../services/streaming-accounts.service';
import {
  StreamingSalesService,
  StreamingSaleDTO,
} from '../../services/streaming-sales.service';
import { parseApiError } from '../../utils/error.utils';
import { parseISODate, todayISO } from '../../utils/date.utils';
import { AlertPipe, StatusPipe } from '../../pipes/status.pipe';
import { EditSaleModal } from '../../modales/cuentas/edit-sale/edit-sale.modal';
import { RenewSaleModal } from '../../modales/cuentas/renew-sale/renew-sale.modal';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';
import {
  StreamingPlatformDTO,
  StreamingPlatformsService,
} from '../../services/streaming-platforms.service';
import { PlatformsTabsComponent } from '../../components/platforms-tabs/platforms-tabs.component';
import { CreateSaleModal } from '../../modales/cuentas/create-sale/create-sale.modal';

type SortKey = 'PLATFORM' | 'CUTOFF' | 'ALERT' | 'STATUS' | null;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-all-profiles-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AlertPipe,
    StatusPipe,
    EditSaleModal,
    RenewSaleModal,
    ConfirmActionModal,
    PlatformsTabsComponent,
    CreateSaleModal,
  ],
  templateUrl: './all-profiles-page.component.html',
  styleUrl: './all-profiles-page.component.css',
})
export class AllProfilesPageComponent implements OnInit {
  private auth = inject(AuthService);
  private accountsApi = inject(StreamingAccountsService);
  private salesApi = inject(StreamingSalesService);
  private platformsApi = inject(StreamingPlatformsService);

  profiles: ProfileWithContextDTO[] = [];
  visible: ProfileWithContextDTO[] = [];
  loading = true;
  errorMessage = '';

  searchText = '';
  statusFilter: 'AVAILABLE' | 'SOLD' | '' = '';
  platformFilter = '';
  sortKey: SortKey = 'ALERT';
  sortDir: SortDir = 'asc';

  copiedKey = '';

  createSaleOpen = false;
  selectedProfile: AccountProfileDTO | null = null;

  editSaleOpen = false;
  renewSaleOpen = false;
  confirmEmptyOpen = false;

  selectedSale: StreamingSaleDTO | null = null;
  saleToRenew: StreamingSaleDTO | null = null;
  profileToEmpty: ProfileWithContextDTO | null = null;
  selectedAccount: StreamingAccountDTO | null = null;

  menuOpen = false;
  menuProfile: ProfileWithContextDTO | null = null;
  menuX = 0;
  menuY = 0;
  menuDirection: 'down' | 'up' = 'down';

  platformsList: StreamingPlatformDTO[] = [];
  activePlatformId: number | null = null;

  private toAccountProfileDTO(p: ProfileWithContextDTO): AccountProfileDTO {
    const { account, sales, label, ...profile } = p as any;

    return {
      ...profile,
      accountId: account.id,
    } as AccountProfileDTO;
  }

  get canSell() {
    return this.auth.hasPermission('STREAMING_SALES:CREATE');
  }

  get canUpdate() {
    return this.auth.hasPermission('STREAMING_SALES:UPDATE');
  }

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [data, platforms] = await Promise.all([
        this.accountsApi.findAllProfiles(),
        this.platformsApi.findAll(),
      ]);
      this.profiles = data;
      this.platformsList = platforms;
      this.recalc();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  async refresh() {
    try {
      const data = await this.accountsApi.findAllProfiles();
      this.profiles = data;
      this.recalc();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  onFilterChange() {
    this.recalc();
  }

  setStatusFilter(v: 'AVAILABLE' | 'SOLD' | '') {
    this.statusFilter = v;
    this.recalc();
  }

  setPlatformFilter(v: string) {
    this.platformFilter = v;
    this.recalc();
  }

  hasActiveFilters() {
    return !!(this.searchText || this.statusFilter || this.activePlatformId);
  }

  clearFilters() {
    this.searchText = '';
    this.statusFilter = '';
    this.platformFilter = '';
    this.activePlatformId = null;
    this.recalc();
  }

  setSort(key: Exclude<SortKey, null>) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
    this.recalc();
  }

  sortIndicator(key: Exclude<SortKey, null>): string {
    if (this.sortKey !== key) return '↕';
    return this.sortDir === 'asc' ? '▲' : '▼';
  }

  private alertRank(cutoffDate: string | null) {
    if (!cutoffDate) return { group: 3, within: 0 };
    const cutoff = parseISODate(cutoffDate);
    if (!cutoff) return { group: 3, within: 0 };
    const today = parseISODate(todayISO())!;
    const days = Math.ceil((cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return { group: 0, within: Math.abs(days) };
    if (days === 0) return { group: 1, within: 0 };
    return { group: 2, within: days };
  }

  private compare(a: ProfileWithContextDTO, b: ProfileWithContextDTO): number {
    const dir = this.sortDir === 'asc' ? 1 : -1;
    const saleA = this.getSale(a);
    const saleB = this.getSale(b);

    switch (this.sortKey) {
      case 'PLATFORM':
        return (
          a.account.platform.name.localeCompare(b.account.platform.name) * dir
        );
      case 'CUTOFF': {
        const da = new Date(saleA?.cutoffDate ?? '').getTime() || 0;
        const db = new Date(saleB?.cutoffDate ?? '').getTime() || 0;
        return (da - db) * dir;
      }
      case 'ALERT': {
        const ra = this.alertRank(saleA?.cutoffDate ?? null);
        const rb = this.alertRank(saleB?.cutoffDate ?? null);
        if (ra.group !== rb.group) return (ra.group - rb.group) * dir;
        if (ra.group === 0) return (rb.within - ra.within) * dir;
        return (ra.within - rb.within) * dir;
      }
      case 'STATUS':
        return a.status.localeCompare(b.status) * dir;
      default:
        return 0;
    }
  }

  private recalc() {
    const q = this.searchText.trim().toLowerCase();

    const filtered = this.profiles.filter((p) => {
      const sale = this.getSale(p);

      const matchSearch = q
        ? [
            p.account.platform.name,
            p.account.email,
            p.account.supplier.name,
            sale?.customer?.name ?? '',
            sale?.customer?.contact ?? '',
          ]
            .join(' ')
            .toLowerCase()
            .includes(q)
        : true;

      const matchStatus = this.statusFilter
        ? p.status === this.statusFilter
        : true;

      const matchPlatform = this.activePlatformId
        ? p.account.platform.id === this.activePlatformId
        : true;

      return matchSearch && matchStatus && matchPlatform;
    });

    this.visible = this.sortKey
      ? [...filtered].sort((a, b) => this.compare(a, b))
      : filtered;
  }

  getSale(p: ProfileWithContextDTO): StreamingSaleDTO | null {
    return p.sales[0] ?? null;
  }

  getSaleStatus(p: ProfileWithContextDTO) {
    return this.getSale(p)?.status ?? '';
  }

  getSaleCutoff(p: ProfileWithContextDTO) {
    return this.getSale(p)?.cutoffDate ?? null;
  }

  async onSaleNoteBlur(p: ProfileWithContextDTO, event: Event) {
    const sale = this.getSale(p);
    if (!sale) return;

    const input = event.target as HTMLTextAreaElement;
    const newNote = input.value.trim() || null;

    if ((newNote ?? '') === (sale.notes ?? '')) return;

    try {
      await this.salesApi.update(sale.id, { notes: newNote });
      p.sales[0] = { ...sale, notes: newNote };
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  async onRenewalStatusChange(p: ProfileWithContextDTO, event: Event) {
    const sale = this.getSale(p);
    if (!sale) return;

    const newStatus = (event.target as HTMLSelectElement).value as any;
    if (newStatus === sale.renewalStatus) return;

    try {
      const updated = await this.salesApi.updateRenewalStatus(
        sale.id,
        newStatus,
      );

      p.sales[0] = {
        ...p.sales[0],
        renewalStatus: updated.renewalStatus,
      } as any;
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
      (event.target as HTMLSelectElement).value = sale.renewalStatus;
    }
  }

  async onPauseSale(p: ProfileWithContextDTO) {
    const sale = this.getSale(p);
    if (!sale) return;

    try {
      const updated = await this.salesApi.pause(sale.id);
      p.sales[0] = updated as any;
      this.recalc();
      this.closeMenu();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  async onResumeSale(p: ProfileWithContextDTO) {
    const sale = this.getSale(p);
    if (!sale) return;

    try {
      const updated = await this.salesApi.resume(sale.id);
      p.sales[0] = updated as any;
      this.recalc();
      this.closeMenu();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  async onRefundSale(p: ProfileWithContextDTO) {
    const sale = this.getSale(p);
    if (!sale) return;

    try {
      await this.salesApi.refund(sale.id);
      await this.refresh();
      this.closeMenu();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  onCreateSale(p: ProfileWithContextDTO) {
    this.selectedProfile = this.toAccountProfileDTO(p);
    this.selectedAccount = p.account as any;
    this.createSaleOpen = true;
    this.closeMenu();
  }

  async onSaleDone() {
    this.createSaleOpen = false;
    this.selectedProfile = null;
    this.selectedAccount = null;
    await this.refresh();
  }

  onEditSale(p: ProfileWithContextDTO) {
    const sale = this.getSale(p);
    if (!sale) return;

    this.selectedSale = {
      ...sale,
      profile: { ...sale.profile, profileNo: p.profileNo } as any,
    };
    this.selectedAccount = p.account as any;
    this.editSaleOpen = true;
    this.closeMenu();
  }

  async onSaleUpdated() {
    this.editSaleOpen = false;
    this.selectedSale = null;
    this.selectedAccount = null;
    await this.refresh();
  }

  onRenewSale(p: ProfileWithContextDTO) {
    const sale = this.getSale(p);
    if (!sale) return;

    this.saleToRenew = {
      ...sale,
      profile: { ...sale.profile, profileNo: p.profileNo } as any,
    };
    this.selectedAccount = p.account as any;
    this.renewSaleOpen = true;
    this.closeMenu();
  }

  async onSaleRenewed() {
    this.renewSaleOpen = false;
    this.saleToRenew = null;
    this.selectedAccount = null;
    await this.refresh();
  }

  onEmptyProfile(p: ProfileWithContextDTO) {
    this.profileToEmpty = p;
    this.confirmEmptyOpen = true;
    this.closeMenu();
  }

  async confirmEmpty() {
    if (!this.profileToEmpty) return;

    const sale = this.getSale(this.profileToEmpty);
    if (!sale) return;

    this.loading = true;
    this.confirmEmptyOpen = false;

    try {
      await this.salesApi.empty(sale.id);
      await this.refresh();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
      this.profileToEmpty = null;
    }
  }

  cancelEmpty() {
    this.confirmEmptyOpen = false;
    this.profileToEmpty = null;
  }

  private copy(key: string, text: string) {
    navigator.clipboard.writeText(text).catch(() => {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    });

    this.copiedKey = key;
    setTimeout(() => {
      if (this.copiedKey === key) this.copiedKey = '';
    }, 2000);
  }

  copyInfo(p: ProfileWithContextDTO) {
    const sale = this.getSale(p);
    const platform = p.account.platform.name.toUpperCase();
    const email = p.account.email;
    const password = p.account.password;
    const cutoff = sale?.cutoffDate
      ? new Date(sale.cutoffDate).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })
      : '—';

    const text =
      `${platform}\n` +
      `${email}\n` +
      `Clave: ${password}\n` +
      `Perfil: ${p.profileNo}\n\n` +
      `Corte: ${cutoff}\n` +
      `•No reproducir en dos dispositivos a la vez.\n` +
      `•No modificar nada de la cuenta.`;

    this.copy(`info-${p.id}`, text);
  }

  copyPassword(p: ProfileWithContextDTO) {
    const sale = this.getSale(p);
    const platform = p.account.platform.name.toUpperCase();
    const email = p.account.email;
    const password = p.account.password;
    const cutoff = sale?.cutoffDate
      ? new Date(sale.cutoffDate).toLocaleDateString('es-EC', {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
        })
      : '—';

    const text =
      `${platform} NUEVA CLAVE\n` +
      `${email}\n` +
      `Clave: ${password}\n\n` +
      `Corte: ${cutoff}`;

    this.copy(`pass-${p.id}`, text);
  }

  copyRenewMessage(p: ProfileWithContextDTO) {
    const platform = p.account.platform.name;
    const email = p.account.email;
    const text = `Buen dia, desea renovar el ${platform} ${email}?`;
    this.copy(`renew-${p.id}`, text);
    this.closeMenu();
  }

  toggleProfileMenu(p: ProfileWithContextDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (p.status === 'AVAILABLE') return;

    const btn = ev.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    this.onMenuToggle({ profile: p, rect });
  }

  onMenuToggle(data: { profile: ProfileWithContextDTO; rect: DOMRect }) {
    if (data.profile.status !== 'SOLD') return;

    if (this.menuOpen && this.menuProfile?.id === data.profile.id) {
      this.closeMenu();
      return;
    }

    const approxMenuHeight = 240;
    const menuWidth = 192;
    const padding = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rect = data.rect;

    let x = rect.left - menuWidth;
    if (x < padding) x = rect.right + padding;
    if (x + menuWidth > vw - padding) x = vw - menuWidth - padding;

    const openUp = rect.bottom + approxMenuHeight > vh - padding;

    this.menuX = x;
    this.menuY = openUp ? rect.top : rect.bottom;
    this.menuDirection = openUp ? 'up' : 'down';
    this.menuProfile = data.profile;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuProfile = null;
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

  autoResize(ev: Event) {
    const el = ev.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  onPlatformTabChange(id: number | null) {
    this.activePlatformId = id;
    this.recalc();
  }
}
