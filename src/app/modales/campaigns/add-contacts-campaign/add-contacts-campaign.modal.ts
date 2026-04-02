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
  CustomersService,
  CustomerDTO,
} from '../../../services/customers.service';
import { CampaignsService } from '../../../services/campaigns.service';
import { parseApiError } from '../../../utils/error.utils';

@Component({
  selector: 'app-add-contacts-campaign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-contacts-campaign.modal.html',
})
export class AddContactsCampaignModal implements OnChanges {
  private customersApi = inject(CustomersService);
  private campaignsApi = inject(CampaignsService);

  @Input() open = false;
  @Input() campaignId!: number;
  @Input() existingContactIds: number[] = [];

  @Output() close = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  loading = false;
  loadingAdd = false;
  errorMessage = '';

  customers: CustomerDTO[] = [];
  totalPages = 1;
  currentPage = 1;
  totalCustomers = 0;

  searchText = '';
  statusFilter = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  selectedIds = new Set<number>();

  async ngOnChanges() {
    if (this.open) {
      this.reset();
      await this.loadCustomers();
    }
  }

  reset() {
    this.searchText = '';
    this.statusFilter = '';
    this.currentPage = 1;
    this.selectedIds.clear();
    this.errorMessage = '';
    this.customers = [];
  }

  async loadCustomers() {
    this.loading = true;
    try {
      const res = await this.customersApi.findAll({
        search: this.searchText || undefined,
        status: (this.statusFilter as any) || undefined,
        page: this.currentPage,
        limit: 50, // ← de 20 a 50
        sortBy: 'id' as any,
        sortOrder: 'asc',
      });
      this.customers = res.data;
      this.totalPages = res.meta.totalPages;
      this.totalCustomers = res.meta.total;
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  onSearchChange() {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.currentPage = 1;
      this.loadCustomers();
    }, 350);
  }

  async onStatusChange() {
    this.currentPage = 1;
    await this.loadCustomers();
  }

  async goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    await this.loadCustomers();
  }

  // ── Selección ─────────────────────────────────────────────────────────────

  isExisting(id: number): boolean {
    return this.existingContactIds.includes(id);
  }

  toggleSelect(id: number) {
    if (this.isExisting(id)) return;
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
    } else {
      this.selectedIds.add(id);
    }
  }

  get availableOnPage(): CustomerDTO[] {
    return this.customers.filter((c) => !this.isExisting(c.id));
  }

  get allPageSelected(): boolean {
    return (
      this.availableOnPage.length > 0 &&
      this.availableOnPage.every((c) => this.selectedIds.has(c.id))
    );
  }

  toggleSelectAll() {
    if (this.allPageSelected) {
      this.availableOnPage.forEach((c) => this.selectedIds.delete(c.id));
    } else {
      this.availableOnPage.forEach((c) => this.selectedIds.add(c.id));
    }
  }

  sourceLabel(source: string | null): string {
    const map: Record<string, string> = {
      INSTAGRAM: 'Instagram',
      FACEBOOK: 'Facebook',
      WHATSAPP: 'WhatsApp',
      REFERRAL: 'Referido',
      OTHER: 'Otro',
    };
    return source ? (map[source] ?? source) : '—';
  }

  statusLabel(status: string | undefined): string {
    const map: Record<string, string> = {
      PROSPECT: 'Prospecto',
      ACTIVE: 'Activo',
      INACTIVE: 'Inactivo',
    };
    return status ? (map[status] ?? status) : '—';
  }

  statusClass(status: string | undefined): string {
    const map: Record<string, string> = {
      PROSPECT: 'badge-ghost',
      ACTIVE: 'badge-success',
      INACTIVE: 'badge-warning',
    };
    return status ? (map[status] ?? 'badge-ghost') : 'badge-ghost';
  }

  // ── Agregar ───────────────────────────────────────────────────────────────

  async addSelected() {
    if (this.selectedIds.size === 0) return;
    this.loadingAdd = true;
    this.errorMessage = '';
    try {
      await this.campaignsApi.addContacts(
        this.campaignId,
        Array.from(this.selectedIds),
      );
      this.added.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loadingAdd = false;
    }
  }

  onClose() {
    this.reset();
    this.close.emit();
  }
}
