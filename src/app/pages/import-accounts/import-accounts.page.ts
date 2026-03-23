import {
  AfterViewChecked,
  Component,
  ElementRef,
  inject,
  NgZone,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import {
  ImportEvent,
  StreamingImportService,
} from '../../services/streaming-import.service';
import { parseApiError } from '../../utils/error.utils';

@Component({
  selector: 'app-import-accounts-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './import-accounts.page.html',
  styleUrls: ['./import-accounts.page.css'],
})
export class ImportAccountsPage implements AfterViewChecked {
  private importService = inject(StreamingImportService);
  private auth = inject(AuthService);
  private zone = inject(NgZone);

  @ViewChild('consoleEl') consoleEl?: ElementRef;

  loading = false;
  errorMessage = '';
  file: File | null = null;
  liveLines: ImportEvent[] = [];
  totalFinal = 0;
  totalFinalGroups = 0;

  private cancelStream?: () => void;

  get canImport() {
    return this.auth.hasPermission('STREAMING_ACCOUNTS:CREATE');
  }

  get hasLines() {
    return this.liveLines.length > 0;
  }

  ngAfterViewChecked() {
    if (this.consoleEl) {
      this.consoleEl.nativeElement.scrollTop =
        this.consoleEl.nativeElement.scrollHeight;
    }
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.file = input.files?.[0] ?? null;
    this.liveLines = [];
    this.errorMessage = '';
    this.totalFinal = 0;
    this.totalFinalGroups = 0;
  }

  onImport() {
    if (!this.file || this.loading) return;
    this.loading = true;
    this.liveLines = [];
    this.errorMessage = '';
    this.totalFinal = 0;
    this.totalFinalGroups = 0;

    this.cancelStream = this.importService.importAccountsStream(
      this.file,
      (event) => {
        this.zone.run(() => {
          this.liveLines.push(event);
          if (event.type === 'done') {
            this.totalFinal = event.imported ?? 0;
            this.totalFinalGroups = event.total ?? 0;
          }
        });
      },
      () => {
        this.zone.run(() => {
          this.loading = false;
        });
      },
      (msg) => {
        this.zone.run(() => {
          this.errorMessage = msg;
          this.loading = false;
        });
      },
    );
  }

  onCancel() {
    this.cancelStream?.();
    this.zone.run(() => {
      this.loading = false;
    });
  }

  onReset() {
    this.cancelStream?.();
    this.file = null;
    this.liveLines = [];
    this.errorMessage = '';
    this.loading = false;
    this.totalFinal = 0;
    this.totalFinalGroups = 0;
  }

  async onDownloadTemplate() {
    try {
      await this.importService.downloadTemplate();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    }
  }

  get totalWarnings() {
    return this.liveLines.filter((l) => l.type === 'warning').length;
  }

  get totalSkipped() {
    return this.liveLines.filter((l) => l.type === 'skipped').length;
  }
}
