import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// --- Tipos de Datos ---

export type CustomerDTO = {
  id: number;
  companyId: number;
  name: string;
  contact: string;
  source: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCustomerDto = {
  name: string;
  contact: string;
  source?: string;
};

export type UpdateCustomerDto = {
  name?: string;
  contact?: string;
  source?: string;
};

/**
 * Representa una venta dentro del historial del cliente,
 * incluyendo los datos anidados del backend.
 */
export type CustomerSaleHistoryDTO = {
  id: number;
  salePrice: string;
  saleDate: string;
  daysAssigned: number;
  cutoffDate: string;
  status: 'ACTIVE' | 'CANCELED';
  notes: string | null;
  platform: { name: string };
  account: {
    email: string;
    password?: string; // Opcional, según permisos
    status: string;
  };
  profile: { profileNo: number };
};

/**
 * Estructura completa del reporte de historial
 */
export type CustomerHistoryReport = {
  customer: Pick<CustomerDTO, 'id' | 'name' | 'contact' | 'source'>;
  metrics: {
    totalSales: number;
    totalSpent: number;
    activeSales: number;
  };
  history: CustomerSaleHistoryDTO[];
};

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/customers`;

  findAll(): Promise<CustomerDTO[]> {
    return firstValueFrom(this.http.get<CustomerDTO[]>(this.base));
  }

  findOne(id: number): Promise<CustomerDTO> {
    return firstValueFrom(this.http.get<CustomerDTO>(`${this.base}/${id}`));
  }

  /**
   * Obtiene el historial detallado de ventas de un cliente
   * @param id ID del cliente
   * @param status Opcional: filtrar por 'ACTIVE' o 'CANCELED'
   */
  getHistory(id: number, status?: string): Promise<CustomerHistoryReport> {
    let url = `${this.base}/${id}/history`;
    if (status) url += `?status=${status}`;

    return firstValueFrom(this.http.get<CustomerHistoryReport>(url));
  }

  create(dto: CreateCustomerDto): Promise<CustomerDTO> {
    return firstValueFrom(this.http.post<CustomerDTO>(this.base, dto));
  }

  update(id: number, dto: UpdateCustomerDto): Promise<CustomerDTO> {
    return firstValueFrom(
      this.http.patch<CustomerDTO>(`${this.base}/${id}`, dto),
    );
  }

  remove(id: number): Promise<{ ok: true }> {
    return firstValueFrom(this.http.delete<{ ok: true }>(`${this.base}/${id}`));
  }
}
