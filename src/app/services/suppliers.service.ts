import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type SupplierDTO = {
  id: number;
  companyId?: number;
  name: string;
  contact: string;
  balance: string; // ← nuevo
  notes?: string | null; // ← nuevo
  createdAt?: string;
  updatedAt?: string;
  _count?: { accounts: number }; // ← viene en findOne
};

export type CreateSupplierDto = {
  name: string;
  contact: string;
  notes?: string;
  balance?: string; // saldo inicial opcional
};

export type UpdateSupplierDto = {
  name?: string;
  contact?: string;
  notes?: string;
  balance?: string;
};

export type AdjustBalanceDto = {
  type: 'DEPOSIT' | 'WITHDRAW';
  amount: number;
  reason?: string;
};

@Injectable({ providedIn: 'root' })
export class SuppliersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/suppliers`;

  findAll(): Promise<SupplierDTO[]> {
    return firstValueFrom(this.http.get<SupplierDTO[]>(this.base));
  }

  findOne(id: number): Promise<SupplierDTO> {
    return firstValueFrom(this.http.get<SupplierDTO>(`${this.base}/${id}`));
  }

  create(dto: CreateSupplierDto): Promise<SupplierDTO> {
    return firstValueFrom(this.http.post<SupplierDTO>(this.base, dto));
  }

  update(id: number, dto: UpdateSupplierDto): Promise<SupplierDTO> {
    return firstValueFrom(
      this.http.patch<SupplierDTO>(`${this.base}/${id}`, dto),
    );
  }

  remove(id: number): Promise<{ ok: boolean; deletedId: number }> {
    return firstValueFrom(
      this.http.delete<{ ok: boolean; deletedId: number }>(
        `${this.base}/${id}`,
      ),
    );
  }

  adjustBalance(
    id: number,
    dto: AdjustBalanceDto,
  ): Promise<{ id: number; name: string; balance: string }> {
    return firstValueFrom(
      this.http.post<{ id: number; name: string; balance: string }>(
        `${this.base}/${id}/balance`,
        dto,
      ),
    );
  }

  accountsBySupplier(id: number): Promise<any[]> {
    return firstValueFrom(this.http.get<any[]>(`${this.base}/${id}/accounts`));
  }
}
