import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { StreamingPlatformDTO } from '../../services/streaming-platforms.service';

@Component({
  selector: 'app-platforms-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './platforms-tabs.component.html',
})
export class PlatformsTabsComponent {
  @Input() platforms: StreamingPlatformDTO[] = [];
  @Input() activePlatformId: number | null = null;
  @Input() canCreate = false;
  @Input() canUpdate = false;
  @Input() canDelete = false;

  @Output() filterChange = new EventEmitter<number | null>();
  @Output() createPlatform = new EventEmitter<void>();
  @Output() editPlatform = new EventEmitter<StreamingPlatformDTO>();
  @Output() deletePlatform = new EventEmitter<StreamingPlatformDTO>();
  @Output() manageLabels = new EventEmitter<StreamingPlatformDTO>();

  menuOpen = false;
  menuPlatform: StreamingPlatformDTO | null = null;
  menuX = 0;
  menuY = 0;

  setFilter(id: number | null) {
    this.filterChange.emit(id);
    this.closeMenu();
  }

  toggleMenu(p: StreamingPlatformDTO, ev: MouseEvent) {
    ev.stopPropagation();
    if (this.menuOpen && this.menuPlatform?.id === p.id) {
      this.closeMenu();
      return;
    }
    const target = ev.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.menuX = rect.right;
    this.menuY = rect.bottom + 6;
    this.menuPlatform = p;
    this.menuOpen = true;
  }

  closeMenu() {
    this.menuOpen = false;
    this.menuPlatform = null;
  }

  onEdit(p: StreamingPlatformDTO) {
    this.editPlatform.emit(p);
    this.closeMenu();
  }

  onDelete(p: StreamingPlatformDTO) {
    this.deletePlatform.emit(p);
    this.closeMenu();
  }

  @HostListener('document:click')
  onDocClick() {
    this.closeMenu();
  }

  @HostListener('window:scroll')
  onScroll() {
    this.closeMenu();
  }

  @HostListener('window:resize')
  onResize() {
    this.closeMenu();
  }
  onManageLabels(p: StreamingPlatformDTO) {
    this.manageLabels.emit(p);
    this.closeMenu();
  }
}
