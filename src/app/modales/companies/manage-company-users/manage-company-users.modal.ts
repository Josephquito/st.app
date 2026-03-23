import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CompaniesService,
  CompanyDTO,
  CompanyMemberDTO,
} from '../../../services/companies.service';
import { UsersService, UserDTO } from '../../../services/users.service';
import { parseApiError } from '../../../utils/error.utils';
import { StatusPipe } from '../../../pipes/status.pipe';

@Component({
  selector: 'app-manage-company-users-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, StatusPipe],
  templateUrl: './manage-company-users.modal.html',
})
export class ManageCompanyUsersModal implements OnChanges {
  companiesApi = inject(CompaniesService);
  usersApi = inject(UsersService);

  @Input() open = false;
  @Input() company: CompanyDTO | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();

  loading = false; // solo para la carga inicial
  saving = false; // para acciones (asignar/quitar)
  errorMessage = '';

  members: CompanyMemberDTO[] = [];
  allUsers: UserDTO[] = [];

  async ngOnChanges() {
    if (this.open && this.company) {
      await this.load(true);
    }
  }

  // showSpinner = true solo en la carga inicial, false en refresh silencioso
  private async load(showSpinner = false) {
    if (showSpinner) this.loading = true;
    this.errorMessage = '';
    try {
      const [members, users] = await Promise.all([
        this.companiesApi.listMembers(this.company!.id),
        this.usersApi.findAll(),
      ]);
      this.members = members;
      this.allUsers = users;
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.loading = false;
    }
  }

  get activeMembers(): CompanyMemberDTO[] {
    return this.members.filter((m) => m.status === 'ACTIVE');
  }

  get inactiveMembers(): CompanyMemberDTO[] {
    return this.members.filter((m) => m.status === 'INACTIVE');
  }

  get availableUsers(): UserDTO[] {
    const assignedIds = new Set(this.members.map((m) => m.user.id));
    return this.allUsers.filter(
      (u) =>
        u.role === 'EMPLOYEE' &&
        u.status === 'ACTIVE' &&
        !assignedIds.has(u.id),
    );
  }

  async assign(userId: number) {
    if (!this.company || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    try {
      await this.companiesApi.assignEmployees(this.company.id, [userId]);
      await this.load(); // sin spinner
      this.updated.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.saving = false;
    }
  }

  async unassign(member: CompanyMemberDTO) {
    if (!this.company || this.saving) return;
    this.saving = true;
    this.errorMessage = '';
    try {
      await this.companiesApi.unassignEmployees(this.company.id, [
        member.user.id,
      ]);
      await this.load(); // sin spinner
      this.updated.emit();
    } catch (e: any) {
      this.errorMessage = parseApiError(e);
    } finally {
      this.saving = false;
    }
  }

  onClose() {
    this.errorMessage = '';
    this.members = [];
    this.allUsers = [];
    this.close.emit();
  }

  trackById(_: number, item: any) {
    return item.id;
  }
}
