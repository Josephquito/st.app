import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type KardexItemDTO = {
  id: number;
  companyId?: number;
  platformId: number;
  unit: 'PROFILE_DAY'; // ← actualizado
  stock: number;
  avgCost: string; // costo diario promedio por perfil
  platform?: { id: number; name: string; active: boolean };
  updatedAt?: string;
  _count?: { accounts: number };
};

export type KardexMovementDTO = {
  id: number;
  companyId?: number;
  itemId: number;
  type: 'IN' | 'OUT' | 'ADJUST';
  refType: string;
  qty: number;
  unitCost: string; // costo diario por perfil
  totalCost: string;
  stockAfter: number;
  avgCostAfter: string;
  createdAt: string;
  item?: {
    platform?: { id: number; name: string };
  };
  account?: { id: number; email: string } | null;
  sale?: { id: number; salePrice: string; daysAssigned: number } | null;
};

export type KardexQueryParams = {
  platformId?: number;
  take?: number;
  skip?: number;
};

@Injectable({ providedIn: 'root' })
export class KardexApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/kardex`;

  items(): Promise<KardexItemDTO[]> {
    return firstValueFrom(this.http.get<KardexItemDTO[]>(`${this.base}/items`));
  }

  movements(params?: KardexQueryParams): Promise<KardexMovementDTO[]> {
    const query = this.buildQuery(params);
    return firstValueFrom(
      this.http.get<KardexMovementDTO[]>(`${this.base}/movements${query}`),
    );
  }

  movementsByPlatform(
    platformId: number,
    params?: Omit<KardexQueryParams, 'platformId'>,
  ): Promise<KardexMovementDTO[]> {
    const query = this.buildQuery(params);
    return firstValueFrom(
      this.http.get<KardexMovementDTO[]>(
        `${this.base}/platform/${platformId}${query}`,
      ),
    );
  }

  private buildQuery(params?: KardexQueryParams): string {
    if (!params) return '';
    const p = new URLSearchParams();
    if (params.platformId) p.set('platformId', String(params.platformId));
    if (params.take) p.set('take', String(params.take));
    if (params.skip) p.set('skip', String(params.skip));
    const str = p.toString();
    return str ? `?${str}` : '';
  }
}
