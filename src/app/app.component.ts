import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import {
  RouterOutlet,
  RouterLink,
  Router,
  RouterLinkActive,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { CompanyContextService } from './services/company-context.service';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ToastComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private router = inject(Router);
  auth = inject(AuthService);
  companyCtx = inject(CompanyContextService);

  mobileOpen = false;
  userMenuOpen = false;
  navVisible = true;

  private lastScrollTop = 0;
  private readonly showThreshold = 10;
  private readonly hideAfter = 80;

  @ViewChild('mobileMenu') mobileMenu?: ElementRef<HTMLElement>;

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn(); // ← usa el signal
  }

  get displayName(): string {
    if (!this.isLoggedIn) return 'JOTAVIX';
    const me = this.auth.me();
    return me?.nombre || me?.email || 'JOTAVIX';
  }

  get hasCompany(): boolean {
    return this.companyCtx.hasCompany();
  }

  get activeCompanyName(): string {
    return this.companyCtx.companyName() || '';
  }

  ngOnInit() {
    this.router.events.subscribe(() => {
      if (this.mobileOpen) this.closeMobileMenu();
      if (this.userMenuOpen) this.closeUserMenu();
    });
  }

  changeCompany() {
    this.companyCtx.setActiveCompany(null);
    this.router.navigate(['/companies']);
    this.closeMobileMenu();
  }

  logout() {
    this.companyCtx.setActiveCompany(null);
    this.auth.logout();
    this.router.navigate(['/login']);
    this.closeMobileMenu();
  }

  toggleMobileMenu(event: Event) {
    event.stopPropagation();
    this.mobileOpen = !this.mobileOpen;
    if (this.mobileOpen) {
      this.navVisible = true;
      this.closeUserMenu();
    }
  }

  closeMobileMenu() {
    this.mobileOpen = false;
  }

  toggleUserMenu(event: Event) {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
    if (this.userMenuOpen) this.closeMobileMenu();
  }

  closeUserMenu() {
    this.userMenuOpen = false;
  }

  changeCompanyFromMenu() {
    this.closeUserMenu();
    this.changeCompany();
  }

  logoutFromMenu() {
    this.closeUserMenu();
    this.logout();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.userMenuOpen) this.closeUserMenu();
    if (!this.mobileOpen) return;
    const target = event.target as HTMLElement;
    const clickedInside =
      this.mobileMenu?.nativeElement.contains(target) ?? false;
    const clickedHamburger = target.closest('.hamburger');
    if (!clickedInside && !clickedHamburger) this.closeMobileMenu();
  }

  @HostListener('document:keydown.escape')
  onEsc() {
    if (this.userMenuOpen) this.closeUserMenu();
    if (this.mobileOpen) this.closeMobileMenu();
  }

  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    const st = window.pageYOffset || document.documentElement.scrollTop || 0;

    if (this.mobileOpen) {
      this.closeMobileMenu();
      this.navVisible = true;
      this.lastScrollTop = st;
      return;
    }

    if (st <= this.hideAfter) {
      this.navVisible = true;
      this.lastScrollTop = st;
      return;
    }

    const delta = st - this.lastScrollTop;
    if (Math.abs(delta) < this.showThreshold) return;

    this.navVisible = delta < 0;
    this.lastScrollTop = st <= 0 ? 0 : st;
  }

  goToSettings() {
    this.router.navigate(['/settings']);
    this.closeMobileMenu();
  }

  goToSettingsFromMenu() {
    this.closeUserMenu();
    this.router.navigate(['/settings']);
  }
}
