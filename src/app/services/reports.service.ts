import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type ReportSaleStatus = 'ACTIVE' | 'CANCELED' | 'ALL';

export type ReportsSalesQuery = {
  day?: string; // YYYY-MM-DD
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  platformId?: number;
  customerId?: number;
  customerSearch?: string;
  status?: ReportSaleStatus;
  page?: number;
  pageSize?: number;
};

export type ReportMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ReportTotals = {
  salesCount: number;
  revenue: string; // Decimal string
  cost: string; // Decimal string
  profit: string; // Decimal string
};

export type StreamingSaleReportItem = {
  id: number;
  companyId: number;
  platformId: number;
  accountId: number;
  profileId: number;
  customerId: number;

  salePrice: string;
  costAtSale: string;
  profit: string;

  saleDate: string;
  daysAssigned: number;
  cutoffDate: string;

  notes: string | null;
  status: 'ACTIVE' | 'CANCELED';

  createdAt?: string;
  updatedAt?: string;

  customer?: {
    id: number;
    name: string;
    contact: string;
    source?: string | null;
  };
  platform?: { id: number; name: string };
  account?: { id: number; email: string };
  profile?: { id: number; profileNo: number; status: string };
};

export type SalesReportResponse = {
  filters: any;
  meta: ReportMeta;
  totals: ReportTotals;
  items: StreamingSaleReportItem[];
};

export type SalesSummaryResponse = {
  filters: any;
  totals: ReportTotals;
};

export type SalesByDayPoint = {
  day: string; // YYYY-MM-DD
  salesCount: number;
  revenue: string;
  cost: string;
  profit: string;
};

export type SalesByPlatformPoint = {
  platformId: number;
  platformName: string;
  salesCount: number;
  revenue: string;
  cost: string;
  profit: string;
};

@Injectable({ providedIn: 'root' })
export class ReportsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/reports`;

  private toParams(q: ReportsSalesQuery): HttpParams {
    let params = new HttpParams();

    const set = (k: string, v: any) => {
      if (v === undefined || v === null) return;
      const s = String(v).trim();
      if (!s) return;
      params = params.set(k, s);
    };

    set('day', q.day);
    set('from', q.from);
    set('to', q.to);
    set('platformId', q.platformId);
    set('customerId', q.customerId);
    set('customerSearch', q.customerSearch);
    set('status', q.status);
    set('page', q.page);
    set('pageSize', q.pageSize);

    return params;
  }

  salesReport(q: ReportsSalesQuery): Promise<SalesReportResponse> {
    return firstValueFrom(
      this.http.get<SalesReportResponse>(`${this.base}/streaming-sales`, {
        params: this.toParams(q),
      }),
    );
  }

  salesSummary(q: ReportsSalesQuery): Promise<SalesSummaryResponse> {
    return firstValueFrom(
      this.http.get<SalesSummaryResponse>(
        `${this.base}/streaming-sales/summary`,
        {
          params: this.toParams(q),
        },
      ),
    );
  }

  salesByDay(q: ReportsSalesQuery): Promise<SalesByDayPoint[]> {
    return firstValueFrom(
      this.http.get<SalesByDayPoint[]>(`${this.base}/streaming-sales/by-day`, {
        params: this.toParams(q),
      }),
    );
  }

  salesByPlatform(q: ReportsSalesQuery): Promise<SalesByPlatformPoint[]> {
    return firstValueFrom(
      this.http.get<SalesByPlatformPoint[]>(
        `${this.base}/streaming-sales/by-platform`,
        { params: this.toParams(q) },
      ),
    );
  }
}
