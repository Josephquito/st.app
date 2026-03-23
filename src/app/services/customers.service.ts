import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CustomerSource =
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'WHATSAPP'
  | 'REFERRAL'
  | 'OTHER';

export type CustomerStatusFilter = 'PROSPECT' | 'ACTIVE' | 'INACTIVE';

export type CustomerSortBy =
  | 'name'
  | 'lastPurchaseAt'
  | 'createdAt'
  | 'balance';

export type SortOrder = 'asc' | 'desc';

export type CustomerDTO = {
  id: number;
  companyId?: number;
  name: string;
  contact: string;
  source: CustomerSource | null;
  sourceNote?: string | null;
  notes?: string | null;
  balance?: string | null;
  totalSales?: number;
  customerStatus?: CustomerStatusFilter;
  lastPurchaseAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CustomerDetailDTO = CustomerDTO & {
  activeSales: {
    id: number;
    salePrice: string;
    cutoffDate: string;
    platform: { id: number; name: string };
    profile: { profileNo: number };
  }[];
};

export type CustomerListResponse = {
  data: CustomerDTO[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type CustomerQuery = {
  search?: string;
  status?: CustomerStatusFilter;
  source?: CustomerSource;
  sortBy?: CustomerSortBy;
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
};

export type CreateCustomerDto = {
  name: string;
  contact: string;
  source?: CustomerSource;
  sourceNote?: string;
  notes?: string;
  balance?: string;
};

export type UpdateCustomerDto = Partial<CreateCustomerDto>;

export type CustomerSaleHistoryDTO = {
  id: number;
  salePrice: string;
  saleDate: string;
  daysAssigned: number;
  cutoffDate: string;
  costAtSale: string;
  dailyCost: string;
  status: 'ACTIVE' | 'CANCELED';
  notes: string | null;
  platform: { name: string };
  account: { email: string; status: string };
  profile: { profileNo: number };
};

export type CustomerHistoryReport = {
  customer: {
    id: number;
    name: string;
    contact: string;
    source: CustomerSource | null;
    sourceNote: string | null;
    notes: string | null;
    balance: string | null;
    lastPurchaseAt: string | null;
  };
  metrics: {
    totalSales: number;
    totalSpent: number;
    activeSales: number;
    customerStatus: CustomerStatusFilter;
  };
  history: CustomerSaleHistoryDTO[];
};

export type ImportResult = {
  ok: boolean;
  created: number;
  updated: number;
  total: number;
  errors: { row: number; name: string; errors: string[] }[];
};

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/customers`;

  findAll(query: CustomerQuery = {}): Promise<CustomerListResponse> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.source) params = params.set('source', query.source);
    if (query.sortBy) params = params.set('sortBy', query.sortBy);
    if (query.sortOrder) params = params.set('sortOrder', query.sortOrder);
    if (query.page) params = params.set('page', query.page);
    if (query.limit) params = params.set('limit', query.limit);

    return firstValueFrom(
      this.http.get<CustomerListResponse>(this.base, { params }),
    );
  }

  findOne(id: number): Promise<CustomerDetailDTO> {
    return firstValueFrom(
      this.http.get<CustomerDetailDTO>(`${this.base}/${id}`),
    );
  }

  getHistory(
    id: number,
    saleStatus?: 'ACTIVE' | 'CANCELED',
  ): Promise<CustomerHistoryReport> {
    let params = new HttpParams();
    if (saleStatus) params = params.set('saleStatus', saleStatus);
    return firstValueFrom(
      this.http.get<CustomerHistoryReport>(`${this.base}/${id}/history`, {
        params,
      }),
    );
  }

  getSources(): Promise<CustomerSource[]> {
    return firstValueFrom(
      this.http.get<CustomerSource[]>(`${this.base}/sources`),
    );
  }

  create(dto: CreateCustomerDto): Promise<CustomerDTO> {
    return firstValueFrom(this.http.post<CustomerDTO>(this.base, dto));
  }

  update(id: number, dto: UpdateCustomerDto): Promise<CustomerDTO> {
    return firstValueFrom(
      this.http.patch<CustomerDTO>(`${this.base}/${id}`, dto),
    );
  }

  remove(id: number): Promise<{ ok: boolean; deletedId: number }> {
    return firstValueFrom(
      this.http.delete<{ ok: boolean; deletedId: number }>(
        `${this.base}/${id}`,
      ),
    );
  }

  downloadTemplate(): Promise<void> {
    return firstValueFrom(
      this.http.get(`${this.base}/import/template`, { responseType: 'blob' }),
    ).then((blob) => this.triggerDownload(blob, 'clientes_plantilla.csv'));
  }

  importCsv(file: File): Promise<ImportResult> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(
      this.http.post<ImportResult>(`${this.base}/import`, form),
    );
  }

  exportCsv(query: CustomerQuery = {}): Promise<void> {
    let params = new HttpParams();
    if (query.search) params = params.set('search', query.search);
    if (query.status) params = params.set('status', query.status);
    if (query.source) params = params.set('source', query.source);

    return firstValueFrom(
      this.http.get(`${this.base}/export`, { params, responseType: 'blob' }),
    ).then((blob) => {
      const date = new Date().toISOString().slice(0, 10);
      this.triggerDownload(blob, `clientes_${date}.csv`);
    });
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  getNextCustomerNumber(): Promise<{
    nextNumber: number;
    suggestedName: string;
  }> {
    return firstValueFrom(
      this.http.get<{ nextNumber: number; suggestedName: string }>(
        `${this.base}/next-number`,
      ),
    );
  }
}
