import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AppRole } from './auth.service';

export type UserDTO = {
  id: number;
  email: string;
  nombre: string;
  phone: string;
  role: AppRole; // ← lo que DEVUELVE el backend
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
};

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/users`;

  // ===== GET /users =====
  findAll() {
    return firstValueFrom(this.http.get<UserDTO[]>(this.base));
  }

  // ===== POST /users =====
  // 👇 OJO: baseRole, NO role
  create(payload: {
    email: string;
    password: string;
    nombre: string;
    phone: string;
    baseRole: AppRole;
  }) {
    return firstValueFrom(this.http.post<UserDTO>(this.base, payload));
  }

  // ===== PATCH /users/:id =====
  update(
    id: number,
    payload: Partial<{
      email: string;
      password: string;
      nombre: string;
      phone: string;
      baseRole: AppRole;
      status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
    }>,
  ) {
    return firstValueFrom(
      this.http.patch<UserDTO>(`${this.base}/${id}`, payload),
    );
  }

  // ===== DELETE /users/:id =====
  remove(id: number) {
    return firstValueFrom(
      this.http.delete<{ ok: boolean; deletedUserId: number }>(
        `${this.base}/${id}`,
      ),
    );
  }
}
