import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { StreamingSaleDTO } from './streaming-sales.service';

export type StreamingAccountStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'EXPIRED'
  | 'DELETED';
export type ProfileStatus = 'AVAILABLE' | 'SOLD' | 'BLOCKED';

export type SupplierDTO = { id: number; name: string; contact: string };
export type PlatformDTO = { id: number; name: string; active: boolean };

export type ProfileLabelDTO = {
  id: number;
  name: string;
  color: string;
};

export type AccountProfileDTO = {
  id: number;
  accountId: number;
  profileNo: number;
  status: ProfileStatus;
  labelId?: number | null;
  label?: ProfileLabelDTO | null;
  sales?: { cutoffDate: string; status: 'ACTIVE' | 'PAUSED' | 'EXPIRED' }[]; // ← agrega EXPIRED
  createdAt?: string;
  updatedAt?: string;
};

export type StreamingAccountDTO = {
  id: number;
  companyId?: number;
  platformId: number;
  supplierId: number;
  email: string;
  password: string;
  profilesTotal: number;
  durationDays: number;
  purchaseDate: string;
  cutoffDate: string;
  totalCost: string;
  notes: string | null;
  status: StreamingAccountStatus;
  replacedByEmail?: string | null;
  replacedAt?: string | null;
  replacementNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
  platform?: PlatformDTO;
  supplier?: SupplierDTO;
  profiles?: AccountProfileDTO[];
};

export type CreateStreamingAccountDto = {
  platformId: number;
  supplierId: number;
  email: string;
  password: string;
  profilesTotal: number;
  durationDays: number;
  purchaseDate: string;
  cutoffDate: string;
  totalCost: string;
  notes?: string;
};

export type UpdateStreamingAccountDto = {
  platformId?: number;
  supplierId?: number;
  email?: string;
  password?: string;
  durationDays?: number;
  purchaseDate?: string;
  notes?: string | null;
};

export type RenewAccountDto = {
  purchaseDate: string;
  durationDays: number;
  totalCost: string;
};

export type ReplaceCredentialsDto = {
  email: string;
  password: string;
  note?: string;
};

export type ReplacePaidDto = {
  email: string;
  password: string;
  purchaseDate: string;
  durationDays: number;
  totalCost: string;
  note?: string;
};

export type ReplaceFromInventoryDto = {
  replacementAccountId: number;
  note?: string;
};

export type CorrectCostDto = {
  totalCost: string;
};

// Agrega este tipo junto a los otros DTOs, antes del @Injectable
export type ProfileWithContextDTO = {
  id: number;
  profileNo: number;
  status: ProfileStatus;
  labelId: number | null;
  label: ProfileLabelDTO | null;
  account: {
    id: number;
    email: string;
    password: string;
    cutoffDate: string;
    status: StreamingAccountStatus;
    platform: { id: number; name: string };
    supplier: { id: number; name: string };
  };
  sales: StreamingSaleDTO[];
};
@Injectable({ providedIn: 'root' })
export class StreamingAccountsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/streaming-accounts`;

  findAll(limit = 1000, platformId?: number): Promise<StreamingAccountDTO[]> {
    const params: Record<string, string> = { limit: limit.toString() };
    if (platformId) params['platformId'] = platformId.toString();
    return firstValueFrom(
      this.http.get<StreamingAccountDTO[]>(this.base, { params }),
    );
  }

  findOne(id: number): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.get<StreamingAccountDTO>(`${this.base}/${id}`),
    );
  }

  create(dto: CreateStreamingAccountDto): Promise<StreamingAccountDTO> {
    return firstValueFrom(this.http.post<StreamingAccountDTO>(this.base, dto));
  }

  update(
    id: number,
    dto: UpdateStreamingAccountDto,
  ): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.patch<StreamingAccountDTO>(`${this.base}/${id}`, dto),
    );
  }

  delete(id: number): Promise<{ ok: boolean; deletedId: number }> {
    return firstValueFrom(
      this.http.delete<{ ok: boolean; deletedId: number }>(
        `${this.base}/${id}`,
      ),
    );
  }

  // =========================
  // Perfiles
  // =========================
  addProfile(id: number): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(`${this.base}/${id}/add-profile`, {}),
    );
  }

  removeProfile(id: number): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(
        `${this.base}/${id}/remove-profile`,
        {},
      ),
    );
  }

  inactivate(id: number): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(`${this.base}/${id}/inactivate`, {}),
    );
  }

  reactivate(id: number): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(`${this.base}/${id}/reactivate`, {}),
    );
  }

  // =========================
  // Renovación
  // =========================
  renew(id: number, dto: RenewAccountDto): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(`${this.base}/${id}/renew`, dto),
    );
  }

  // =========================
  // Corrección de costo
  // =========================
  correctCost(id: number, dto: CorrectCostDto): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(
        `${this.base}/${id}/correct-cost`,
        dto,
      ),
    );
  }

  // =========================
  // Reemplazos
  // =========================
  replaceCredentials(
    id: number,
    dto: ReplaceCredentialsDto,
  ): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(
        `${this.base}/${id}/replace/credentials`,
        dto,
      ),
    );
  }

  replacePaid(id: number, dto: ReplacePaidDto): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(
        `${this.base}/${id}/replace/paid`,
        dto,
      ),
    );
  }

  replaceFromInventory(
    id: number,
    dto: ReplaceFromInventoryDto,
  ): Promise<StreamingAccountDTO> {
    return firstValueFrom(
      this.http.post<StreamingAccountDTO>(
        `${this.base}/${id}/replace/inventory`,
        dto,
      ),
    );
  }

  emptyAll(id: number): Promise<{ ok: boolean; emptied: number }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean; emptied: number }>(
        `${this.base}/${id}/empty-all`,
        {},
      ),
    );
  }

  assignLabel(
    profileId: number,
    labelId: number | null,
  ): Promise<{
    id: number;
    profileNo: number;
    status: string;
    labelId: number | null;
    label: ProfileLabelDTO | null;
  }> {
    return firstValueFrom(
      this.http.patch<any>(`${this.base}/profiles/${profileId}/label`, {
        labelId,
      }),
    );
  }

  findAllProfiles(): Promise<ProfileWithContextDTO[]> {
    return firstValueFrom(
      this.http.get<ProfileWithContextDTO[]>(`${this.base}/profiles/all`),
    );
  }
}
