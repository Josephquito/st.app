import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type GoogleContactsStatus = {
  connected: boolean;
  email: string | null;
};

export type GoogleSyncResult = {
  imported: number;
  exported: number;
  updated: number;
};

@Injectable({ providedIn: 'root' })
export class GoogleContactsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/google`;

  getStatus(companyId: number): Promise<GoogleContactsStatus> {
    return firstValueFrom(
      this.http.get<GoogleContactsStatus>(`${this.base}/status`, {
        params: { companyId: companyId.toString() },
      }),
    );
  }

  async connect(companyId: number): Promise<void> {
    const res = await firstValueFrom(
      this.http.get<{ url: string }>(`${this.base}/auth-url`),
    );
    window.location.href = res.url;
  }

  sync(companyId: number): Promise<GoogleSyncResult> {
    return firstValueFrom(
      this.http.post<GoogleSyncResult>(`${this.base}/sync`, {}),
    );
  }

  disconnect(companyId: number): Promise<{ ok: boolean }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean }>(`${this.base}/disconnect`, {}),
    );
  }
}
