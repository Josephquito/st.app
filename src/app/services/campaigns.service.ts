import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CampaignStatus =
  | 'DRAFT'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PAUSED'
  | 'CANCELLED';

export type CampaignContactStatus =
  | 'PENDING'
  | 'SENT'
  | 'RESPONDED'
  | 'PURCHASED'
  | 'FAILED'
  | 'IGNORED';

export type CampaignDTO = {
  id: number;
  name: string;
  message: string;
  imageUrl: string | null;
  status: CampaignStatus;
  segment: string | null;
  totalContacts: number;
  sentCount: number;
  respondedCount: number;
  purchasedCount: number;
  failedCount: number;
  ignoredCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export type CampaignContactDTO = {
  id: number;
  status: CampaignContactStatus;
  sentAt: string | null;
  respondedAt: string | null;
  purchasedAt: string | null;
  platformPurchased: string | null;
  failReason: string | null;
  customer: {
    id: number;
    name: string;
    contact: string;
    source: string | null;
    lastPurchaseAt: string | null;
    _count: { sales: number };
  };
};

export type CreateCampaignDto = {
  name: string;
  message: string;
  imageUrl?: string;
  segment?: string;
};

export type UpdateCampaignDto = Partial<CreateCampaignDto>;

// ── Servicio ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CampaignsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/campaigns`;

  // ── Campañas ───────────────────────────────────────────────────────────────

  findAll(): Promise<CampaignDTO[]> {
    return firstValueFrom(this.http.get<CampaignDTO[]>(this.base));
  }

  findOne(id: number): Promise<CampaignDTO> {
    return firstValueFrom(this.http.get<CampaignDTO>(`${this.base}/${id}`));
  }

  create(dto: CreateCampaignDto): Promise<CampaignDTO> {
    return firstValueFrom(this.http.post<CampaignDTO>(this.base, dto));
  }

  update(id: number, dto: UpdateCampaignDto): Promise<CampaignDTO> {
    return firstValueFrom(
      this.http.patch<CampaignDTO>(`${this.base}/${id}`, dto),
    );
  }

  remove(id: number): Promise<{ ok: boolean; deletedId: number }> {
    return firstValueFrom(
      this.http.delete<{ ok: boolean; deletedId: number }>(
        `${this.base}/${id}`,
      ),
    );
  }

  // ── Contactos ──────────────────────────────────────────────────────────────

  getContacts(id: number): Promise<CampaignContactDTO[]> {
    return firstValueFrom(
      this.http.get<CampaignContactDTO[]>(`${this.base}/${id}/contacts`),
    );
  }

  addContacts(
    id: number,
    customerIds: number[],
  ): Promise<{ ok: boolean; added: number }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean; added: number }>(
        `${this.base}/${id}/contacts`,
        { customerIds },
      ),
    );
  }

  removeContact(
    campaignId: number,
    customerId: number,
  ): Promise<{ ok: boolean }> {
    return firstValueFrom(
      this.http.delete<{ ok: boolean }>(
        `${this.base}/${campaignId}/contacts/${customerId}`,
      ),
    );
  }

  // ── Envío ──────────────────────────────────────────────────────────────────

  sendContacts(
    campaignId: number,
    campaignContactIds: number[],
  ): Promise<{ ok: boolean; queued: number }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean; queued: number }>(
        `${this.base}/${campaignId}/send`,
        { campaignContactIds },
      ),
    );
  }
}
