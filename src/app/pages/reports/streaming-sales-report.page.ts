import { CommonModule } from '@angular/common';
import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../services/auth.service';
import {
  ReportsService,
  ReportSaleStatus,
  SalesByDayPoint,
  SalesByPlatformPoint,
  StreamingSaleReportItem,
} from '../../services/reports.service';
import {
  StreamingPlatformsService,
  StreamingPlatformDTO,
} from '../../services/streaming-platforms.service';
import {
  CustomersService,
  CustomerDTO,
} from '../../services/customers.service';
import { todayISO, toISODate } from '../../utils/date.utils';

type DateMode = 'RANGE' | 'DAY';

@Component({
  selector: 'app-streaming-sales-report-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './streaming-sales-report.page.html',
  styleUrls: ['./streaming-sales-report.page.css'],
})
export class StreamingSalesReportPage {
  auth = inject(AuthService);
  api = inject(ReportsService);
  platformsApi = inject(StreamingPlatformsService);
  customersApi = inject(CustomersService);

  // permisos
  get canRead() {
    return this.auth.hasPermission('STREAMING_SALES:READ');
  }

  // UI
  loading = false;
  loadingCharts = false;
  errorMessage = '';

  // catálogos
  platforms: StreamingPlatformDTO[] = [];
  customers: CustomerDTO[] = [];

  // filtros
  activePlatformId: number | null = null; // tabs
  customerId: number | '' = '';
  status: ReportSaleStatus = 'ACTIVE';

  dateMode: DateMode = 'RANGE';
  day = '';
  from = '';
  to = '';

  searchText = ''; // buscar cliente (nombre)

  // paginación
  page = 1;
  pageSize = 50;
  total = 0;
  totalPages = 1;

  // data
  items: StreamingSaleReportItem[] = [];

  totals = {
    salesCount: 0,
    revenue: '0.0000',
    cost: '0.0000',
    profit: '0.0000',
  };

  byDay: SalesByDayPoint[] = [];
  byPlatform: SalesByPlatformPoint[] = [];

  // menu row (si lo quieres)
  menuOpen = false;
  menuX = 0;
  menuY = 0;
  menuItem: StreamingSaleReportItem | null = null;

  ngOnInit() {
    this.initDefaults();
    this.bootstrap();
  }

  private initDefaults() {
    const end = todayISO();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 19);
    const start = toISODate(startDate);

    this.from = start;
    this.to = end;
    this.day = end;
  }

  async bootstrap() {
    this.errorMessage = '';
    if (!this.canRead) {
      this.errorMessage =
        'No tienes permiso para ver reportes (STREAMING_SALES:READ).';
      return;
    }

    try {
      const [platforms, customersRes] = await Promise.all([
        this.platformsApi.findAll(),
        this.customersApi.findAll({ limit: 200 }),
      ]);

      this.platforms = (platforms ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
      this.customers = (customersRes?.data ?? [])
        .slice()
        .sort((a: CustomerDTO, b: CustomerDTO) => a.name.localeCompare(b.name));
    } catch (e: any) {
      this.errorMessage = e?.error?.message ?? 'No se pudo cargar catálogos.';
      return;
    }

    await this.reloadAll();
  }

  setPlatformFilter(platformId: number | null) {
    this.activePlatformId = platformId;
    this.applyFilters();
  }

  setDateMode(mode: DateMode) {
    this.dateMode = mode;
    this.applyFilters();
  }

  clearSearch() {
    this.searchText = '';
    this.applyFilters();
  }

  private buildQuery() {
    const q: any = {
      status: this.status,
      page: this.page,
      pageSize: this.pageSize,
    };

    if (this.activePlatformId) q.platformId = this.activePlatformId;
    if (this.customerId !== '') q.customerId = this.customerId;

    if (this.searchText.trim()) q.customerSearch = this.searchText.trim();

    if (this.dateMode === 'DAY') {
      q.day = this.day || '';
    } else {
      q.from = this.from || '';
      q.to = this.to || '';
    }

    return q;
  }

  async applyFilters() {
    this.page = 1;
    await this.reloadAll();
  }

  private validateQuery(q: any) {
    if (this.dateMode === 'DAY') {
      if (!q.day) {
        throw new Error('Selecciona un día.');
      }
    } else {
      if (!q.from || !q.to) {
        throw new Error('Selecciona un rango (from/to).');
      }
      if (q.to < q.from) {
        throw new Error('El rango es inválido: to < from.');
      }
    }
  }

  async reloadAll() {
    this.errorMessage = '';
    if (!this.canRead) return;

    const q = this.buildQuery();
    try {
      this.validateQuery(q);
    } catch (err: any) {
      this.errorMessage = err?.message ?? 'Filtros inválidos.';
      this.items = [];
      this.byDay = [];
      this.byPlatform = [];
      return;
    }

    this.loading = true;
    this.loadingCharts = true;

    try {
      const [report, summary] = await Promise.all([
        this.api.salesReport(q),
        this.api.salesSummary({ ...q, page: undefined, pageSize: undefined }),
      ]);

      this.items = report.items ?? [];
      this.total = report.meta.total;
      this.totalPages = report.meta.totalPages;

      this.totals = summary.totals;

      // charts
      try {
        const chartsQuery = { ...q, page: undefined, pageSize: undefined };
        const [byDay, byPlatform] = await Promise.all([
          this.api.salesByDay(chartsQuery),
          this.api.salesByPlatform(chartsQuery),
        ]);
        this.byDay = byDay ?? [];
        this.byPlatform = byPlatform ?? [];
      } catch {
        this.byDay = [];
        this.byPlatform = [];
      }
    } catch (e: any) {
      this.items = [];
      this.byDay = [];
      this.byPlatform = [];
      this.errorMessage = e?.error?.message ?? 'No se pudo cargar el reporte.';
    } finally {
      this.loading = false;
      this.loadingCharts = false;
    }
  }

  // paginación
  async goPrev() {
    if (this.page <= 1) return;
    this.page--;
    await this.loadPageOnly();
  }

  async goNext() {
    if (this.page >= this.totalPages) return;
    this.page++;
    await this.loadPageOnly();
  }

  async changePageSize() {
    this.page = 1;
    await this.loadPageOnly();
  }

  private async loadPageOnly() {
    this.errorMessage = '';
    const q = this.buildQuery();

    try {
      this.validateQuery(q);
    } catch (err: any) {
      this.errorMessage = err?.message ?? 'Filtros inválidos.';
      this.items = [];
      return;
    }

    this.loading = true;
    try {
      const report = await this.api.salesReport(q);
      this.items = report.items ?? [];
      this.total = report.meta.total;
      this.totalPages = report.meta.totalPages;
    } catch (e: any) {
      this.items = [];
      this.errorMessage = e?.error?.message ?? 'No se pudo cargar la página.';
    } finally {
      this.loading = false;
    }
  }

  // reset todo
  async clearAllFilters() {
    this.activePlatformId = null;
    this.customerId = '';
    this.status = 'ACTIVE';
    this.searchText = '';
    this.dateMode = 'RANGE';
    this.initDefaults();
    await this.applyFilters();
  }

  // money helper
  money(v: string | number | null | undefined) {
    const n = Number(v ?? 0);
    if (!Number.isFinite(n)) return '0.00';
    return n.toLocaleString('es-EC', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // chart helpers
  maxProfitByDay(): number {
    return Math.max(1, ...this.byDay.map((x) => Number(x.profit || 0)));
  }
  maxRevenueByPlatform(): number {
    return Math.max(1, ...this.byPlatform.map((x) => Number(x.revenue || 0)));
  }
  barWidth(value: string, max: number) {
    const v = Math.max(0, Number(value || 0));
    const pct = Math.min(100, (v / max) * 100);
    return `${pct}%`;
  }

  // menu (opcional)
  toggleMenu(item: StreamingSaleReportItem, ev: MouseEvent) {
    ev.stopPropagation();

    if (this.menuOpen && this.menuItem?.id === item.id) {
      this.closeMenu();
      return;
    }

    this.menuOpen = true;
    this.menuItem = item;

    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.menuX = rect.right;
    this.menuY = rect.bottom + 6;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuItem = null;
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeMenu();
  }
  @HostListener('window:scroll')
  onScroll() {
    this.closeMenu();
  }
}
