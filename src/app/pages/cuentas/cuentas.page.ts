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
import { AccountsExcelTableComponent } from '../../components/accounts-excel-table/accounts-excel-table.component';

import { CreatePlatformModal } from '../../modales/cuentas/create-platform/create-platform.modal';
import { EditPlatformModal } from '../../modales/cuentas/edit-platform/edit-platform.modal';
import { DeletePlatformModal } from '../../modales/cuentas/delete-platform/delete-platform.modal';
import { RenewAccountModal } from '../../modales/cuentas/renew-account/renew-account.modal';
import { ReplaceAccountModal } from '../../modales/cuentas/replace-account/replace-account.modal';
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
    AccountsExcelTableComponent,
    CreatePlatformModal,
    EditPlatformModal,
    DeletePlatformModal,
    RenewAccountModal,
    ReplaceAccountModal,
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
  labels: StreamingLabelDTO[] = [];
  activePlatformId: number | null = null;

  createPlatformOpen = false;
  editPlatformOpen = false;
  deletePlatformOpen = false;
  selectedPlatform: StreamingPlatformDTO | null = null;

  selectedAccount: StreamingAccountDTO | null = null;
  renewAccountOpen = false;
  replaceAccountOpen = false;
  deleteAccountOpen = false;
  accountToDelete: StreamingAccountDTO | null = null;
  loadingDelete = false;
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
  get canAccountsDelete() {
    return this.auth.hasPermission('STREAMING_ACCOUNTS:DELETE');
  }
  get canSalesCreate() {
    return this.auth.hasPermission('STREAMING_SALES:CREATE');
  }

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    this.errorMessage = '';
    try {
      const [platforms, accounts] = await Promise.all([
        this.canPlatformsRead
          ? this.platformsApi.findAll()
          : Promise.resolve([]),
        this.canAccountsRead
          ? this.accountsApi.findAll(1000, this.activePlatformId ?? undefined)
          : Promise.resolve([]),
      ]);
      this.platforms = platforms;
      this.accounts = accounts;
      await this.loadLabels();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
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
    this.load();
  }

  openCreatePlatform() {
    this.closeAll();
    this.createPlatformOpen = true;
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
  onManageLabels(p: StreamingPlatformDTO) {
    this.selectedPlatform = p;
    this.manageLabelsOpen = true;
  }

  onRenewAccount(a: StreamingAccountDTO) {
    this.closeAll();
    this.selectedAccount = a;
    this.renewAccountOpen = true;
  }
  onReplaceAccount(a: StreamingAccountDTO) {
    this.closeAll();
    this.selectedAccount = a;
    this.replaceAccountOpen = true;
  }
  onDeleteAccount(a: StreamingAccountDTO) {
    this.closeAll();
    this.accountToDelete = a;
    this.deleteAccountOpen = true;
  }

  async onAccountRenewed() {
    this.renewAccountOpen = false;
    this.selectedAccount = null;
    await this.load();
  }
  async onAccountReplaced() {
    this.replaceAccountOpen = false;
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

  async onPlatformChanged() {
    this.closeAll();
    await this.load();
  }

  closeAll() {
    this.createPlatformOpen = false;
    this.editPlatformOpen = false;
    this.deletePlatformOpen = false;
    this.selectedPlatform = null;
    this.selectedAccount = null;
    this.renewAccountOpen = false;
    this.replaceAccountOpen = false;
    this.deleteAccountOpen = false;
    this.accountToDelete = null;
    this.manageLabelsOpen = false;
  }
}
