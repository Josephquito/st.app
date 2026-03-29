import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type SaleStatus = 'ACTIVE' | 'EXPIRED' | 'PAUSED' | 'CLOSED';
export type RenewalMessageStatus = 'NOT_APPLICABLE' | 'PENDING' | 'SENT';

export type StreamingSaleDTO = {
  id: number;
  companyId?: number;
  platformId: number;
  accountId: number;
  profileId: number;
  customerId: number;

  salePrice: string;
  saleDate: string;
  daysAssigned: number;
  cutoffDate: string;
  costAtSale: string;
  dailyCost: string;
  notes: string | null;
  status: SaleStatus;
  renewalStatus: RenewalMessageStatus;

  pausedAt?: string | null;
  pausedDaysLeft?: number | null;
  creditAmount?: string | null;
  creditRefunded: boolean;

  createdAt?: string;
  updatedAt?: string;

  customer?: { id: number; name: string; contact: string };
  platform?: { id: number; name: string };
  account?: { id: number; email: string };
  profile?: { id: number; profileNo: number; status: string };
};

export type CreateStreamingSaleDto = {
  accountId: number;
  profileId: number;
  customerId: number;
  salePrice: string;
  saleDate: string;
  daysAssigned: number;
  notes?: string;
};

export type UpdateStreamingSaleDto = {
  customerId?: number;
  salePrice?: string;
  saleDate?: string;
  daysAssigned?: number;
  notes?: string | null; // ← agrega | null
};

export type RenewStreamingSaleDto = {
  saleDate: string;
  daysAssigned: number;
  salePrice: string;
  customerId?: number;
  notes?: string;
};

export type SalesQueryDto = {
  status?: SaleStatus;
  renewalStatus?: RenewalMessageStatus;
  accountId?: number;
};

@Injectable({ providedIn: 'root' })
export class StreamingSalesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/streaming-sales`;

  findAll(query?: SalesQueryDto): Promise<StreamingSaleDTO[]> {
    let params = new HttpParams();
    if (query?.status) params = params.set('status', query.status);
    if (query?.renewalStatus)
      params = params.set('renewalStatus', query.renewalStatus);
    if (query?.accountId) params = params.set('accountId', query.accountId);
    return firstValueFrom(
      this.http.get<StreamingSaleDTO[]>(this.base, { params }),
    );
  }

  findOne(id: number): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.get<StreamingSaleDTO>(`${this.base}/${id}`),
    );
  }

  create(dto: CreateStreamingSaleDto): Promise<StreamingSaleDTO> {
    return firstValueFrom(this.http.post<StreamingSaleDTO>(this.base, dto));
  }

  update(id: number, dto: UpdateStreamingSaleDto): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.patch<StreamingSaleDTO>(`${this.base}/${id}`, dto),
    );
  }

  // Vacía el perfil → vuelve a AVAILABLE, venta → CLOSED
  empty(id: number): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.post<StreamingSaleDTO>(`${this.base}/${id}/empty`, {}),
    );
  }

  // Renueva la venta → nueva venta en mismo perfil, perfil sigue SOLD
  renew(id: number, dto: RenewStreamingSaleDto): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.post<StreamingSaleDTO>(`${this.base}/${id}/renew`, dto),
    );
  }

  // Pausa la venta → congela días restantes y calcula saldo
  pause(id: number): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.post<StreamingSaleDTO>(`${this.base}/${id}/pause`, {}),
    );
  }

  // Reanuda la venta pausada → recalcula cutoffDate desde hoy
  resume(id: number): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.post<StreamingSaleDTO>(`${this.base}/${id}/resume`, {}),
    );
  }

  // Reembolsa saldo al cliente y cierra el perfil
  refund(id: number): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.post<StreamingSaleDTO>(`${this.base}/${id}/refund`, {}),
    );
  }

  // Actualiza el estado del mensaje de renovación manualmente
  updateRenewalStatus(
    id: number,
    renewalStatus: RenewalMessageStatus,
  ): Promise<StreamingSaleDTO> {
    return firstValueFrom(
      this.http.patch<StreamingSaleDTO>(`${this.base}/${id}/renewal-status`, {
        renewalStatus,
      }),
    );
  }
}
