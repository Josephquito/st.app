import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type StreamingLabelDTO = {
  id: number;
  name: string;
  color: string;
  platformId: number;
  createdAt?: string;
  updatedAt?: string;
  _count?: { profiles: number };
};

export type CreateStreamingLabelDto = {
  platformId: number;
  name: string;
  color: string;
};

export type UpdateStreamingLabelDto = {
  name?: string;
  color?: string;
};

@Injectable({ providedIn: 'root' })
export class StreamingLabelsService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/streaming-labels`;

  findAll(platformId?: number): Promise<StreamingLabelDTO[]> {
    let params = new HttpParams();
    if (platformId) params = params.set('platformId', platformId);
    return firstValueFrom(
      this.http.get<StreamingLabelDTO[]>(this.base, { params }),
    );
  }

  create(dto: CreateStreamingLabelDto): Promise<StreamingLabelDTO> {
    return firstValueFrom(this.http.post<StreamingLabelDTO>(this.base, dto));
  }

  update(id: number, dto: UpdateStreamingLabelDto): Promise<StreamingLabelDTO> {
    return firstValueFrom(
      this.http.patch<StreamingLabelDTO>(`${this.base}/${id}`, dto),
    );
  }

  remove(id: number): Promise<{ ok: boolean; deletedId: number }> {
    return firstValueFrom(
      this.http.delete<{ ok: boolean; deletedId: number }>(
        `${this.base}/${id}`,
      ),
    );
  }
}
