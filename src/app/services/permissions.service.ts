import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type PermissionDTO = {
  id: number;
  key: string;
  resource: string;
  action: string;
  group?: string | null;
  label?: string | null;
  order?: number | null;
  isSystem: boolean;
};

@Injectable({ providedIn: 'root' })
export class PermissionsApi {
  private http = inject(HttpClient);
  private base = environment.apiUrl.replace(/\/+$/, '');

  findAll(): Promise<PermissionDTO[]> {
    return firstValueFrom(
      this.http.get<PermissionDTO[]>(`${this.base}/permissions`),
    );
  }

  listUserPermissions(userId: number): Promise<PermissionDTO[]> {
    return firstValueFrom(
      this.http.get<PermissionDTO[]>(
        `${this.base}/users/${userId}/permissions`,
      ),
    );
  }

  setUserPermissions(
    userId: number,
    permissionIds: number[],
  ): Promise<{ ok: boolean; userId: number; permissions: number[] }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean; userId: number; permissions: number[] }>(
        `${this.base}/users/${userId}/permissions/set`,
        { permissionIds },
      ),
    );
  }

  addUserPermissions(
    userId: number,
    permissionIds: number[],
  ): Promise<{ ok: boolean; added: number[] }> {
    return firstValueFrom(
      this.http.post<{ ok: boolean; added: number[] }>(
        `${this.base}/users/${userId}/permissions/add`,
        { permissionIds },
      ),
    );
  }

  removeUserPermissions(
    userId: number,
    permissionIds: number[],
  ): Promise<{ ok: boolean; removed: number[] }> {
    return firstValueFrom(
      this.http.delete<{ ok: boolean; removed: number[] }>(
        `${this.base}/users/${userId}/permissions/remove`,
        { body: { permissionIds } },
      ),
    );
  }
}
