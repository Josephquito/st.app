import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type CompanyStatus = 'ACTIVE' | 'INACTIVE';

export type CompanyDTO = {
  id: number;
  name: string;
  phone: string;
  status: CompanyStatus;
  ownerUserId: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateCompanyDto = {
  name: string;
  phone: string;
};

export type UpdateCompanyDto = {
  name?: string;
  phone?: string;
  status?: CompanyStatus;
};

// =========================
// MEMBERS
// =========================
export type CompanyMemberStatus = 'ACTIVE' | 'INACTIVE';

export type CompanyMemberDTO = {
  id: number; // id de companyUser
  status: CompanyMemberStatus;
  createdAt: string;
  user: {
    id: number;
    nombre: string | null;
    email: string;
    role: 'SUPERADMIN' | 'ADMIN' | 'EMPLOYEE';
    status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  };
};

@Injectable({ providedIn: 'root' })
export class CompaniesService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/companies`;

  // =========================
  // CRUD
  // =========================
  findAll(): Promise<CompanyDTO[]> {
    return firstValueFrom(this.http.get<CompanyDTO[]>(this.base));
  }

  create(dto: CreateCompanyDto): Promise<CompanyDTO> {
    return firstValueFrom(this.http.post<CompanyDTO>(this.base, dto));
  }

  update(id: number, dto: UpdateCompanyDto): Promise<CompanyDTO> {
    return firstValueFrom(
      this.http.patch<CompanyDTO>(`${this.base}/${id}`, dto),
    );
  }

  remove(id: number): Promise<{ ok: true }> {
    return firstValueFrom(this.http.delete<{ ok: true }>(`${this.base}/${id}`));
  }

  // =========================
  // MEMBERS (Company Users)
  // =========================

  // GET /companies/:id/users
  listMembers(companyId: number): Promise<CompanyMemberDTO[]> {
    return firstValueFrom(
      this.http.get<CompanyMemberDTO[]>(`${this.base}/${companyId}/users`),
    );
  }

  // POST /companies/:id/users  body: { userIds: number[] }
  assignEmployees(companyId: number, userIds: number[]): Promise<{ ok: true }> {
    return firstValueFrom(
      this.http.post<{ ok: true }>(`${this.base}/${companyId}/users`, {
        userIds,
      }),
    );
  }

  unassignEmployees(
    companyId: number,
    userIds: number[],
  ): Promise<{ ok: true }> {
    return firstValueFrom(
      this.http.delete<{ ok: true }>(`${this.base}/${companyId}/users`, {
        body: { userIds },
      }),
    );
  }
}
