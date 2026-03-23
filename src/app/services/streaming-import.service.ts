import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CompanyContextService } from './company-context.service';

export interface ImportEvent {
  type: 'progress' | 'warning' | 'skipped' | 'done' | 'error';
  platform?: string;
  email?: string;
  profileNo?: number;
  message: string;
  imported?: number;
  total?: number;
}

export interface ImportSkipped {
  email: string;
  reason: string;
}
export interface ImportWarning {
  email: string;
  profileNo: number;
  reason: string;
}
export interface ImportResult {
  platform: string;
  imported: number;
  skipped: ImportSkipped[];
  warnings: ImportWarning[];
}

@Injectable({ providedIn: 'root' })
export class StreamingImportService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private ctx = inject(CompanyContextService);
  private base = `${environment.apiUrl}/streaming/import`;

  importAccountsStream(
    file: File,
    onEvent: (event: ImportEvent) => void,
    onDone: () => void,
    onError: (msg: string) => void,
  ): () => void {
    const formData = new FormData();
    formData.append('file', file);

    const controller = new AbortController();

    // Guard para que onDone solo se llame una vez
    let doneCalledOnce = false;
    const callDoneOnce = () => {
      if (doneCalledOnce) return;
      doneCalledOnce = true;
      onDone();
    };

    fetch(`${environment.apiUrl}/streaming/import/accounts/stream`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${this.auth.getToken() ?? ''}`,
        'x-company-id': String(this.ctx.companyId() ?? ''),
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ message: `Error ${res.status}` }));
          onError(err?.message ?? `Error ${res.status}`);
          callDoneOnce();
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            callDoneOnce();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.replace(/^data: /, '').trim();
            if (!line) continue;
            try {
              const event: ImportEvent = JSON.parse(line);
              onEvent(event);
              if (event.type === 'done' || event.type === 'error') {
                callDoneOnce();
              }
            } catch {}
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') onError(err.message);
        callDoneOnce();
      });

    return () => controller.abort();
  }

  downloadTemplate(): Promise<void> {
    return firstValueFrom(
      this.http.get(`${this.base}/accounts/template`, {
        responseType: 'blob',
      }),
    ).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_cuentas.csv';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}
