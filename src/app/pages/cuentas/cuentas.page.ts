import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';

import {
  StreamingPlatformsService,
  StreamingPlatformDTO,
} from '../../services/streaming-platforms.service';

import {
  StreamingAccountsService,
  StreamingAccountDTO,
} from '../../services/streaming-accounts.service';

// Modales plataformas
import { CreatePlatformModal } from '../../modales/cuentas/create-platform/create-platform.modal';
import { EditPlatformModal } from '../../modales/cuentas/edit-platform/edit-platform.modal';
import { DeletePlatformModal } from '../../modales/cuentas/delete-platform/delete-platform.modal';

// Modales cuentas
import { CreateAccountModal } from '../../modales/cuentas/create-account/create-account.modal';
import { EditAccountModal } from '../../modales/cuentas/edit-account/edit-account.modal';
import { ViewAccountModal } from '../../modales/cuentas/view-account/view-account.modal';

type SortKey = 'ALERT' | 'STATUS' | 'PROFILES' | null;
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-cuentas-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,

    // Platforms modals
    CreatePlatformModal,
    EditPlatformModal,
    DeletePlatformModal,

    // Accounts modals
    CreateAccountModal,
    EditAccountModal,
    ViewAccountModal,
  ],
  templateUrl: './cuentas.page.html',
  styleUrls: ['./cuentas.page.css'],
})
export class CuentasPage {
  auth = inject(AuthService);
  platformsApi = inject(StreamingPlatformsService);
  accountsApi = inject(StreamingAccountsService);

  loading = false;
  loadingRowId: number | null = null;

  errorMessage = '';

  platforms: StreamingPlatformDTO[] = [];
  accounts: StreamingAccountDTO[] = [];

  // filtro por plataforma (null = todas)
  activePlatformId: number | null = null;

  // Menú flotante para CUENTA
  menuOpen = false;
  menuAccount: StreamingAccountDTO | null = null;
  menuX = 0;
  menuY = 0;

  // Menú flotante para PLATAFORMA (tab)
  platMenuOpen = false;
  menuPlatform: StreamingPlatformDTO | null = null;
  platMenuX = 0;
  platMenuY = 0;

  // Modales plataformas
  createPlatformOpen = false;
  editPlatformOpen = false;
  deletePlatformOpen = false;
  selectedPlatform: StreamingPlatformDTO | null = null;

  // Modales cuentas
  createAccountOpen = false;
  editAccountOpen = false;
  viewAccountOpen = false;
  selectedAccount: StreamingAccountDTO | null = null;

  // =========================
  // Permisos
  // =========================
  get canPlatformsCreate() {
    return this.auth.hasPermission('STREAMING_PLATFORMS:CREATE');
  }
  get canPlatformsRead() {
    return this.auth.hasPermission('STREAMING_PLATFORMS:READ');
  }
  get canPlatformsUpdate() {
    return this.auth.hasPermission('STREAMING_PLATFORMS:UPDATE');
  }
  get canPlatformsDelete() {
    return this.auth.hasPermission('STREAMING_PLATFORMS:DELETE');
  }

  get canAccountsCreate() {
    return this.auth.hasPermission('STREAMING_ACCOUNTS:CREATE');
  }
  get canAccountsRead() {
    return this.auth.hasPermission('STREAMING_ACCOUNTS:READ');
  }
  get canAccountsUpdate() {
    return this.auth.hasPermission('STREAMING_ACCOUNTS:UPDATE');
  }

  get canSalesCreate() {
    return this.auth.hasPermission('STREAMING_SALES:CREATE');
  }

  ngOnInit() {
    this.load();
  }

  // =========================
  // Load
  // =========================
  async load() {
    this.errorMessage = '';

    // Si no tiene permiso de lectura de ambos, mostramos error (y no llamamos API)
    if (!this.canPlatformsRead && !this.canAccountsRead) {
      this.platforms = [];
      this.accounts = [];
      this.errorMessage =
        'No tienes permiso para ver plataformas (STREAMING_PLATFORMS:READ) ni cuentas (STREAMING_ACCOUNTS:READ).';
      return;
    }

    this.loading = true;
    try {
      // Plataformas
      this.platforms = this.canPlatformsRead
        ? await this.platformsApi.findAll()
        : [];

      // Cuentas
      this.accounts = this.canAccountsRead
        ? await this.accountsApi.findAll()
        : [];

      // si el filtro apunta a una plataforma que ya no existe
      if (
        this.activePlatformId &&
        !this.platforms.some((p) => p.id === this.activePlatformId)
      ) {
        this.activePlatformId = null;
      }
    } catch (e: any) {
      this.errorMessage = e?.error?.message ?? 'No se pudo cargar cuentas.';
    } finally {
      this.loading = false;
    }
  }

  // =========================
  // Filtros + helpers UI
  // =========================
  setPlatformFilter(platformId: number | null) {
    this.activePlatformId = platformId;
    this.closePlatformMenu();
  }

  get filteredAccounts() {
    if (!this.activePlatformId) return this.accounts;
    return this.accounts.filter(
      (a) => (a.platform?.id ?? a.platformId) === this.activePlatformId,
    );
  }

  daysRemaining(cutoffDate?: string | Date | null) {
    if (!cutoffDate) return null;
    const d = new Date(cutoffDate);
    if (Number.isNaN(d.getTime())) return null;

    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  alertBadgeClass(days: number | null) {
    if (days === null) return 'badge-ghost';
    if (days < 0) return 'badge-error';
    if (days <= 3) return 'badge-warning';
    return 'badge-success';
  }

  usedProfilesText(a: StreamingAccountDTO) {
    const total = a.profilesTotal ?? a.profiles?.length ?? 0;
    const sold = (a.profiles ?? []).filter((p) => p.status === 'SOLD').length;
    return `${sold}/${total}`;
  }

  // =========================
  // Acciones header
  // =========================
  openCreatePlatform() {
    this.selectedPlatform = null;
    this.createPlatformOpen = true;
    this.editPlatformOpen = false;
    this.deletePlatformOpen = false;
  }

  openCreateAccount() {
    this.selectedAccount = null;
    this.createAccountOpen = true;
    this.editAccountOpen = false;
    this.viewAccountOpen = false;
  }

  // =========================
  // Menú plataforma (tabs)
  // =========================
  togglePlatformMenu(p: StreamingPlatformDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.platMenuOpen && this.menuPlatform?.id === p.id) {
      this.closePlatformMenu();
      return;
    }

    this.platMenuOpen = true;
    this.menuPlatform = p;

    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.platMenuX = rect.right;
    this.platMenuY = rect.bottom + 6;
  }

  closePlatformMenu() {
    this.platMenuOpen = false;
    this.menuPlatform = null;
  }

  openEditPlatform(p: StreamingPlatformDTO) {
    this.selectedPlatform = p;
    this.editPlatformOpen = true;
    this.createPlatformOpen = false;
    this.deletePlatformOpen = false;
    this.closePlatformMenu();
  }

  confirmDeletePlatform(p: StreamingPlatformDTO) {
    this.selectedPlatform = p;
    this.deletePlatformOpen = true;
    this.createPlatformOpen = false;
    this.editPlatformOpen = false;
    this.closePlatformMenu();
  }

  // =========================
  // Menú cuenta
  // =========================
  toggleAccountMenu(a: StreamingAccountDTO, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.menuOpen && this.menuAccount?.id === a.id) {
      this.closeMenu();
      return;
    }

    this.menuOpen = true;
    this.menuAccount = a;

    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();

    this.menuX = rect.right;
    this.menuY = rect.bottom + 6;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuAccount = null;
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeMenu();
    this.closePlatformMenu();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.closeMenu();
    this.closePlatformMenu();
  }

  // =========================
  // Abrir cuenta (perfiles) / editar
  // =========================
  openAccount(a: StreamingAccountDTO) {
    this.selectedAccount = a;
    this.viewAccountOpen = true;

    this.createAccountOpen = false;
    this.editAccountOpen = false;
  }

  openEditAccount(a: StreamingAccountDTO) {
    this.selectedAccount = a;
    this.editAccountOpen = true;

    this.createAccountOpen = false;
    this.viewAccountOpen = false;
  }

  // =========================
  // Cerrar modales + eventos
  // =========================
  closeAll() {
    // platforms
    this.createPlatformOpen = false;
    this.editPlatformOpen = false;
    this.deletePlatformOpen = false;
    this.selectedPlatform = null;

    // accounts
    this.createAccountOpen = false;
    this.editAccountOpen = false;
    this.viewAccountOpen = false;
    this.selectedAccount = null;
  }

  async onPlatformChanged() {
    this.closeAll();
    await this.load();
  }

  async onAccountChanged() {
    // Si la modal de ver perfiles está abierta, NO llamamos a closeAll
    // porque queremos que el usuario siga viendo la cuenta después de vaciar/editar.
    if (this.viewAccountOpen) {
      await this.load(); // Solo refresca la tabla de fondo
    } else {
      this.closeAll();
      await this.load();
    }
  }

  async onSaleCreated() {
    await this.load();
  }

  // =========================
  // Búsqueda
  // =========================
  searchText = '';

  clearSearch() {
    this.searchText = '';
  }

  // =========================
  // Orden (solo Alerta/Estado/Perfiles)
  // =========================
  sortKey: SortKey = null;
  sortDir: SortDir = 'asc';

  setSort(key: Exclude<SortKey, null>) {
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDir = 'asc';
    }
  }

  clearSort() {
    this.sortKey = null;
    this.sortDir = 'asc';
  }

  private alertRank(cutoffDate: any): { group: number; within: number } {
    const d = this.daysRemaining(cutoffDate);
    if (d === null || d === undefined) return { group: 3, within: 0 };

    if (d < 0) return { group: 0, within: Math.abs(d) }; // vencidas
    if (d === 0) return { group: 1, within: 0 }; // hoy
    return { group: 2, within: d }; // quedan días
  }

  private statusRank(status: string | null | undefined): number {
    return (status || '').toUpperCase() === 'ACTIVE' ? 0 : 1;
  }

  private profilesRank(a: StreamingAccountDTO): {
    used: number;
    total: number;
    ratio: number;
  } {
    const txt = (this.usedProfilesText(a) || '').toString(); // "x/y"
    const m = txt.match(/(\d+)\s*\/\s*(\d+)/);

    if (!m) return { used: 9999, total: 9999, ratio: 1 };

    const used = Number(m[1]);
    const total = Number(m[2]);
    const ratio = total > 0 ? used / total : 1;

    return { used, total, ratio };
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

      // Dentro del grupo:
      // - vencidas: más vencida arriba
      if (ra.group === 0) return (rb.within - ra.within) * dir;

      // - hoy / quedan días / sin fecha: menor primero
      return (ra.within - rb.within) * dir;
    }

    if (this.sortKey === 'STATUS') {
      const sa = this.statusRank(a.status as any);
      const sb = this.statusRank(b.status as any);
      return (sa - sb) * dir;
    }

    if (this.sortKey === 'PROFILES') {
      const pa = this.profilesRank(a);
      const pb = this.profilesRank(b);

      if (pa.used !== pb.used) return (pa.used - pb.used) * dir;
      if (pa.ratio !== pb.ratio) return (pa.ratio - pb.ratio) * dir;
      if (pa.total !== pb.total) return (pa.total - pb.total) * dir;

      return 0;
    }

    return 0;
  }

  // =========================
  // Visible accounts = filtro plataforma + búsqueda + orden
  // =========================
  get visibleAccounts() {
    const q = this.searchText.trim().toLowerCase();

    // 1) base por plataforma
    let base = this.filteredAccounts;

    // 2) búsqueda
    if (q) {
      base = base.filter((a) => {
        const platform = (a.platform?.name || '').toLowerCase();
        const email = (a.email || '').toLowerCase();
        const password = (a.password || '').toLowerCase();
        const supplier = (a.supplier?.name || '').toLowerCase();
        const status = (a.status || '').toLowerCase();
        const cutoff = a.cutoffDate
          ? new Date(a.cutoffDate).toLocaleDateString().toLowerCase()
          : '';
        const profiles = (this.usedProfilesText(a) || '').toLowerCase();

        return `${platform} ${email} ${password} ${supplier} ${status} ${cutoff} ${profiles}`.includes(
          q,
        );
      });
    }

    // 3) orden
    if (!this.sortKey) return base;
    return [...base].sort((a, b) => this.compareAccounts(a, b));
  }
}
