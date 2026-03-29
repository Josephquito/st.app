import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';
import {
  StreamingPlatformsService,
  StreamingPlatformDTO,
} from '../../services/streaming-platforms.service';
import {
  StreamingAccountsService,
  StreamingAccountDTO,
} from '../../services/streaming-accounts.service';
import { parseApiError } from '../../utils/error.utils';

import { PlatformsTabsComponent } from '../../components/platforms-tabs/platforms-tabs.component';
import { AccountsTableComponent } from '../../components/accounts-table/accounts-table.component';

import { CreatePlatformModal } from '../../modales/cuentas/create-platform/create-platform.modal';
import { EditPlatformModal } from '../../modales/cuentas/edit-platform/edit-platform.modal';
import { DeletePlatformModal } from '../../modales/cuentas/delete-platform/delete-platform.modal';
import { CreateAccountModal } from '../../modales/cuentas/create-account/create-account.modal';
import { EditAccountModal } from '../../modales/cuentas/edit-account/edit-account.modal';
import { AccountDrawerComponent } from '../../components/account-drawer/account-drawer.component';
import { RenewAccountModal } from '../../modales/cuentas/renew-account/renew-account.modal';
import { ReplaceAccountModal } from '../../modales/cuentas/replace-account/replace-account.modal';
import { ChangePasswordModal } from '../../modales/cuentas/change-password/change-password.modal';
import { ChangeStatusModal } from '../../modales/cuentas/change-status/change-status.modal';
import { ConfirmActionModal } from '../../modales/confirmacion/confirm-action/confirm-action.modal';
import { ManageLabelsModal } from '../../modales/labels/manage-labels/manage-labels-modal';
import {
  StreamingLabelsService,
  StreamingLabelDTO,
} from '../../services/streaming-labels.service';

@Component({
  selector: 'app-cuentas-page',
  standalone: true,
  imports: [
    CommonModule,
    PlatformsTabsComponent,
    AccountsTableComponent,
    AccountDrawerComponent,
    CreatePlatformModal,
    EditPlatformModal,
    CreateAccountModal,
    EditAccountModal,
    DeletePlatformModal,
    RenewAccountModal,
    ReplaceAccountModal,
    ChangePasswordModal,
    ChangeStatusModal,
    ConfirmActionModal,
    ManageLabelsModal,
  ],
  templateUrl: './cuentas.page.html',
  styleUrls: ['./cuentas.page.css'],
})
export class CuentasPage implements OnInit {
  auth = inject(AuthService);
  platformsApi = inject(StreamingPlatformsService);
  accountsApi = inject(StreamingAccountsService);
  labelsApi = inject(StreamingLabelsService);

  loading = false;
  errorMessage = '';

  platforms: StreamingPlatformDTO[] = [];
  accounts: StreamingAccountDTO[] = [];
  filteredAccounts: StreamingAccountDTO[] = [];
  labels: StreamingLabelDTO[] = [];
  activePlatformId: number | null = null;

  createPlatformOpen = false;
  editPlatformOpen = false;
  deletePlatformOpen = false;
  selectedPlatform: StreamingPlatformDTO | null = null;

  createAccountOpen = false;
  editAccountOpen = false;
  viewAccountOpen = false;
  selectedAccount: StreamingAccountDTO | null = null;

  renewAccountOpen = false;
  replaceAccountOpen = false;
  changePasswordOpen = false;

  deleteAccountOpen = false;
  accountToDelete: StreamingAccountDTO | null = null;

  changeStatusOpen = false;
  loadingDelete = false;

  currentLimit = 1000;
  totalLoaded = 0;

  manageLabelsOpen = false;

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
  get canAccountsDelete() {
    return this.auth.hasPermission('STREAMING_ACCOUNTS:DELETE');
  }

  ngOnInit() {
    this.load();
  }

  // En load(): pasar platformId al fetch y quitar el filtro frontend
  async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [platforms, accounts] = await Promise.all([
        this.canPlatformsRead
          ? this.platformsApi.findAll()
          : Promise.resolve([]),
        this.canAccountsRead
          ? this.accountsApi.findAll(
              this.currentLimit,
              this.activePlatformId ?? undefined, // ← pasa el filtro
            )
          : Promise.resolve([]),
      ]);
      this.platforms = platforms;
      this.accounts = accounts;
      this.totalLoaded = accounts.length;

      if (
        this.activePlatformId &&
        !platforms.some((p) => p.id === this.activePlatformId)
      ) {
        this.activePlatformId = null;
      }

      this.filteredAccounts = [...this.accounts]; // ← ya viene filtrado del backend
      await this.loadLabels();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  async loadMore() {
    this.currentLimit += 100;
    await this.load();
  }

  async loadLabels() {
    try {
      this.labels = await this.labelsApi.findAll(
        this.activePlatformId ?? undefined,
      );
    } catch {
      this.labels = [];
    }
  }

  onFilterChange(id: number | null) {
    this.activePlatformId = id;
    this.currentLimit = 100;
    this.load(); // load() ya llama loadLabels() adentro
  }

  openCreatePlatform() {
    this.closeAll();
    this.createPlatformOpen = true;
  }
  openCreateAccount() {
    this.closeAll();
    this.createAccountOpen = true;
  }

  onEditPlatform(p: StreamingPlatformDTO) {
    this.closeAll();
    this.selectedPlatform = p;
    this.editPlatformOpen = true;
  }

  onDeletePlatform(p: StreamingPlatformDTO) {
    this.closeAll();
    this.selectedPlatform = p;
    this.deletePlatformOpen = true;
  }

  onViewAccount(a: StreamingAccountDTO) {
    this.selectedAccount = a;
    this.viewAccountOpen = true;
  }

  onEditAccount(a: StreamingAccountDTO) {
    this.closeAll();
    this.selectedAccount = a;
    this.editAccountOpen = true;
  }

  closeAll() {
    this.createPlatformOpen = false;
    this.editPlatformOpen = false;
    this.deletePlatformOpen = false;
    this.selectedPlatform = null;
    this.createAccountOpen = false;
    this.editAccountOpen = false;
    this.viewAccountOpen = false;
    this.selectedAccount = null;
    this.renewAccountOpen = false;
    this.replaceAccountOpen = false;
    this.changePasswordOpen = false;
    this.deleteAccountOpen = false;
    this.accountToDelete = null;
    this.changeStatusOpen = false;
  }

  async onPlatformChanged() {
    this.closeAll();
    await this.load();
  }

  async onAccountChanged() {
    if (this.viewAccountOpen) {
      await this.load();
    } else {
      this.closeAll();
      await this.load();
    }
  }

  onRenewAccount(a: StreamingAccountDTO) {
    this.closeAll();
    this.selectedAccount = a;
    this.renewAccountOpen = true;
  }

  async onAccountRenewed() {
    this.renewAccountOpen = false;
    this.selectedAccount = null;
    await this.load();
  }

  onReplaceAccount(a: StreamingAccountDTO) {
    this.closeAll();
    this.selectedAccount = a;
    this.replaceAccountOpen = true;
  }

  async onAccountReplaced() {
    this.replaceAccountOpen = false;
    this.selectedAccount = null;
    await this.load();
  }

  onChangePassword(a: StreamingAccountDTO) {
    this.closeAll();
    this.selectedAccount = a;
    this.changePasswordOpen = true;
  }

  async onPasswordChanged() {
    this.changePasswordOpen = false;
    this.selectedAccount = null;
    await this.load();
  }

  async confirmDeleteAccount() {
    if (!this.accountToDelete) return;
    this.loadingDelete = true;
    try {
      await this.accountsApi.delete(this.accountToDelete.id);
      this.deleteAccountOpen = false;
      this.accountToDelete = null;
      await this.load();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loadingDelete = false;
    }
  }

  onDeleteAccount(a: StreamingAccountDTO) {
    this.closeAll();
    this.accountToDelete = a;
    this.deleteAccountOpen = true;
  }

  onChangeStatus(a: StreamingAccountDTO) {
    this.closeAll();
    this.selectedAccount = a;
    this.changeStatusOpen = true;
  }

  async onStatusChanged() {
    this.changeStatusOpen = false;
    this.selectedAccount = null;
    await this.load();
  }

  onManageLabels(p: StreamingPlatformDTO) {
    this.selectedPlatform = p;
    this.manageLabelsOpen = true;
  }
}
