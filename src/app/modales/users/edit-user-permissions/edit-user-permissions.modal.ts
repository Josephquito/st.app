import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PermissionsApi,
  PermissionDTO,
} from '../../../services/permissions.service';
import { AuthService } from '../../../services/auth.service';
import { UserDTO } from '../../../services/users.service';
import { parseApiError } from '../../../utils/error.utils';

type Grouped = { title: string; items: PermissionDTO[] };

@Component({
  selector: 'app-edit-user-permissions-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-user-permissions.modal.html',
})
export class EditUserPermissionsModal implements OnChanges {
  api = inject(PermissionsApi);
  auth = inject(AuthService);

  @Input() open = false;
  @Input() user: UserDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false;
  saving = false;
  errorMessage = '';

  catalog: PermissionDTO[] = [];
  selectedIds = new Set<number>();
  search = '';

  get canUpdate() {
    return this.auth.hasPermission('USERS:UPDATE');
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['open'] || changes['user']) {
      if (this.open && this.user) {
        await this.load();
      }
    }
  }

  private async load() {
    this.loading = true;
    this.errorMessage = '';
    this.selectedIds.clear();

    try {
      const [catalog, current] = await Promise.all([
        this.api.findAll(),
        this.api.listUserPermissions(this.user!.id),
      ]);

      // Filtrar permisos internos — nunca se muestran ni se asignan desde el front
      this.catalog = catalog.filter((p) => !p.isSystem);
      current.forEach((p) => this.selectedIds.add(p.id));
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  // ✅ Mutar el Set existente, nunca reasignar
  toggle(id: number, checked: boolean) {
    if (!this.canUpdate) return;
    if (checked) this.selectedIds.add(id);
    else this.selectedIds.delete(id);
  }

  onToggle(id: number, ev: Event) {
    if (!this.canUpdate) return;
    const checked = !!(ev.target as HTMLInputElement)?.checked;
    this.toggle(id, checked);
  }

  isChecked(id: number) {
    return this.selectedIds.has(id);
  }

  get filteredCatalog(): PermissionDTO[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.catalog;

    return this.catalog.filter((p) => {
      const label = (p.label ?? '').toLowerCase();
      const key = (p.key ?? '').toLowerCase();
      const res = (p.resource ?? '').toLowerCase();
      const act = (p.action ?? '').toLowerCase();
      const grp = (p.group ?? '').toLowerCase();
      return (
        label.includes(q) ||
        key.includes(q) ||
        res.includes(q) ||
        act.includes(q) ||
        grp.includes(q)
      );
    });
  }

  get grouped(): Grouped[] {
    const map = new Map<string, PermissionDTO[]>();
    for (const p of this.filteredCatalog) {
      const g = p.group?.trim() ? p.group : p.resource;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }

    return Array.from(map.entries())
      .map(([title, items]) => ({
        title,
        items: items
          .slice()
          .sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999)),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  // ✅ TrackBy functions — evitan que Angular re-cree nodos DOM al mutar el Set
  trackByGroup(_: number, g: Grouped) {
    return g.title;
  }

  trackByPermission(_: number, p: PermissionDTO) {
    return p.id;
  }

  get selectedCount() {
    return this.selectedIds.size;
  }

  get totalCount() {
    return this.catalog.length;
  }

  async save() {
    if (!this.user || !this.canUpdate) return;

    this.saving = true;
    this.errorMessage = '';

    try {
      const ids = Array.from(this.selectedIds.values());
      await this.api.setUserPermissions(this.user.id, ids);
      this.updated.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.saving = false;
    }
  }

  onClose() {
    this.search = '';
    this.close.emit();
  }
}
