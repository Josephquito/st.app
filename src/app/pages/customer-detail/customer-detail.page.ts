import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  CustomersService,
  CustomerHistoryReport,
} from '../../services/customers.service';

@Component({
  selector: 'app-customer-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './customer-detail.page.html',
  styleUrls: ['./customer-detail.page.css'],
})
export class CustomerDetailPage implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(CustomersService);

  report: CustomerHistoryReport | null = null;
  loading = true;
  errorMessage = '';
  copied = ''; // para feedback rápido (opcional)

  ngOnInit() {
    // ✅ parseo seguro a number
    const id = Number(this.route.snapshot.paramMap.get('id') ?? 0);
    this.loadHistory(id);
  }

  async loadHistory(id: number) {
    this.loading = true;
    this.errorMessage = '';
    this.report = null;

    if (!id) {
      this.loading = false;
      this.errorMessage = 'ID de cliente inválido.';
      return;
    }

    try {
      this.report = await this.api.getHistory(id);
    } catch (e: any) {
      this.errorMessage =
        e?.error?.message ?? 'No se pudo cargar el historial.';
    } finally {
      this.loading = false;
    }
  }

  async copyToClipboard(text?: string) {
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      this.copied = text;
      setTimeout(() => (this.copied = ''), 1200);
    } catch {
      this.copied = '';
    }
  }

  statusBadge(status: string) {
    return status === 'ACTIVE'
      ? 'badge-success'
      : status === 'EXPIRED'
        ? 'badge-error'
        : 'badge-ghost';
  }
}
