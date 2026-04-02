import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export type AgentStatus = {
  enabled: boolean;
};

@Injectable({ providedIn: 'root' })
export class BotService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/bot`;

  getAgentStatus(): Promise<AgentStatus> {
    return firstValueFrom(
      this.http.get<AgentStatus>(`${this.base}/agent/status`),
    );
  }

  enableAgent(): Promise<AgentStatus> {
    return firstValueFrom(
      this.http.post<AgentStatus>(`${this.base}/agent/enable`, {}),
    );
  }

  disableAgent(): Promise<AgentStatus> {
    return firstValueFrom(
      this.http.post<AgentStatus>(`${this.base}/agent/disable`, {}),
    );
  }

  toggleAgent(): Promise<AgentStatus & { message: string }> {
    return firstValueFrom(
      this.http.post<AgentStatus & { message: string }>(
        `${this.base}/agent/toggle`,
        {},
      ),
    );
  }
}
