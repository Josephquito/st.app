import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  KardexApiService,
  KardexMovementDTO,
  KardexItemDTO,
} from '../../services/kardex.service';

@Component({
  selector: 'app-kardex-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kardex.page.html',
})
export class KardexPage implements OnInit {
  private api = inject(KardexApiService);

  movements: KardexMovementDTO[] = [];
  items: KardexItemDTO[] = [];
  loading = false;
  errorMessage = '';

  selectedPlatformId: number | null = null;

  async ngOnInit() {
    await this.loadItems();
    await this.loadMovements();
  }

  async loadItems() {
    try {
      this.items = await this.api.items();
    } catch {
      this.errorMessage = 'Error cargando plataformas.';
    }
  }

  async loadMovements() {
    this.loading = true;
    this.errorMessage = '';
    try {
      if (this.selectedPlatformId) {
        this.movements = await this.api.movementsByPlatform(
          this.selectedPlatformId,
          { take: 100 },
        );
      } else {
        this.movements = await this.api.movements({ take: 100 });
      }
    } catch {
      this.errorMessage = 'Error cargando movimientos.';
    } finally {
      this.loading = false;
    }
  }

  onPlatformChange() {
    this.loadMovements();
  }

  get selectedItem(): KardexItemDTO | null {
    if (!this.selectedPlatformId) return null;
    return (
      this.items.find((i) => i.platform?.id === +this.selectedPlatformId!) ??
      null
    );
  }

  formatCost(val: string | number): string {
    return Number(val).toFixed(4);
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return (
      d.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      }) +
      ' ' +
      d.toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
      })
    );
  }
}
