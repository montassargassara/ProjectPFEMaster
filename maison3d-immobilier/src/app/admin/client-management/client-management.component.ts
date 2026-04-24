// src/app/admin/client-management/client-management.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { UserService, User } from '../../services/user.service';
import { AdminAuthService } from '../services/admin-auth';
import { Client, ClientNote, ClientService, CreateClientRequest, UpdateClientRequest } from '../services/client.service';

declare var bootstrap: any;

@Component({
  selector: 'app-client-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './client-management.component.html',
  styleUrls: ['./client-management.component.scss']
})
export class ClientManagementComponent implements OnInit, OnDestroy, AfterViewInit {
  public Math = Math;
  
  clients: Client[] = [];
  filteredClients: Client[] = [];
  selectedClient: Client | null = null;
  currentUser: any = null;
  commercials: User[] = [];
  clientNotes: ClientNote[] = [];
  agencies: User[] = [];
  availableAgencies: User[] = [];
  
  loading = false;
  errorMessage = '';
  successMessage = '';
  
  // Filters
  searchTerm = '';
  clientTypeFilter = '';
  visibilityTypeFilter = '';
  statusFilter = '';
  buyerStatusFilter = '';
  minBudget: number | null = null;
  maxBudget: number | null = null;
  
  sortField = 'createdAt';
  sortDirection: 'asc' | 'desc' = 'desc';
  
  page = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  
  stats = {
    totalClientsNormaux: 0,
    totalClientsAffilies: 0,
    totalClientsActifs: 0,
    clientsAcheteurs: 0,
    ventesMois: 0,
    commissionsMois: 0
  };
  
  @ViewChild('createClientModal') createModalElement!: ElementRef;
  @ViewChild('editClientModal') editModalElement!: ElementRef;
  @ViewChild('detailsModal') detailsModalElement!: ElementRef;
  @ViewChild('noteModal') noteModalElement!: ElementRef;
  @ViewChild('historyModal') historyModalElement!: ElementRef;
  @ViewChild('shareModal') shareModalElement!: ElementRef;
  
  private createModal: any;
  private editModal: any;
  private detailsModal: any;
  private noteModal: any;
  private historyModal: any;
  private shareModal: any;
  
  clientForm: FormGroup;
  editForm: FormGroup;
  noteForm: FormGroup;
  showPassword = false;
  generatedPassword = '';
  isAffiliateForm = false;
  selectedSharedAgencyIds: number[] = [];
  activeDropdown: HTMLElement | null = null;
  
  private subscriptions: Subscription[] = [];

  constructor(
    private clientService: ClientService,
    private userService: UserService,
    private authService: AdminAuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.clientForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      telephone: ['', [Validators.pattern(/^(?:(?:\+|00)216|0)?[2-9][0-9]{7}$/)]],
      clientType: ['NORMAL', [Validators.required]],
      budgetEstime: [null],
      zoneRecherchee: [''],
      commercialId: [null],
      visibilityType: ['AGENCY_CLIENT', [Validators.required]],
      targetAgencyAdminId: [null],
      codeAffiliation: [''],
      tauxCommission: [5],
      source: ['']
    }, { validators: this.passwordMatchValidator });

    this.editForm = this.fb.group({
      nom: ['', [Validators.required]],
      prenom: ['', [Validators.required]],
      telephone: ['', [Validators.pattern(/^(?:(?:\+|00)216|0)?[2-9][0-9]{7}$/)]],
      budgetEstime: [null],
      zoneRecherchee: [''],
      commercialId: [null],
      isActive: [true],
      codeAffiliation: [''],
      tauxCommission: [5],
      source: ['']
    });

    this.noteForm = this.fb.group({
      note: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    console.log('🟢 ClientManagement - Initialisation');
    this.currentUser = this.authService.getCurrentUser();
    this.loadAgencies();
    this.loadCommercials();
    this.loadStats();
    setTimeout(() => { this.loadClients(); }, 0);
    this.cdr.detectChanges();
  }

  ngAfterViewInit(): void {
    this.initModals();
    this.cdr.detectChanges();
  }

  private initModals(): void {
    if (this.createModalElement) this.createModal = new bootstrap.Modal(this.createModalElement.nativeElement);
    if (this.editModalElement) this.editModal = new bootstrap.Modal(this.editModalElement.nativeElement);
    if (this.detailsModalElement) this.detailsModal = new bootstrap.Modal(this.detailsModalElement.nativeElement);
    if (this.noteModalElement) this.noteModal = new bootstrap.Modal(this.noteModalElement.nativeElement);
    if (this.historyModalElement) this.historyModal = new bootstrap.Modal(this.historyModalElement.nativeElement);
    if (this.shareModalElement) this.shareModal = new bootstrap.Modal(this.shareModalElement.nativeElement);
  }

  loadAgencies(): void {
    if (this.currentUser?.role === 'SUPER_ADMIN') {
      this.userService.getUsersByRole('ADMIN').subscribe({
        next: (agencies) => { this.agencies = agencies; this.cdr.detectChanges(); },
        error: (error) => console.error('Erreur chargement agences:', error)
      });
    }
  }

  loadCommercials(): void {
    this.userService.getUsersByRole('COMMERCIAL').subscribe({
      next: (commercials) => { this.commercials = commercials; this.cdr.detectChanges(); },
      error: (error) => console.error('Erreur chargement commerciaux:', error)
    });
  }

  loadStats(): void {
    this.clientService.getClientStats().subscribe({
      next: (stats) => { this.stats = stats; this.cdr.detectChanges(); },
      error: (error) => console.error('Erreur chargement stats:', error)
    });
  }

  loadClients(): void {
    this.loading = true;
    this.cdr.detectChanges();

    const sub = this.clientService.getAllClients(this.page, this.pageSize, this.sortField, this.sortDirection).subscribe({
      next: (response) => {
        this.clients = response.content.map(client => ({
          ...client,
          visibilityType: client.visibilityType || 'AGENCY_CLIENT',
          sharedWithAgencyIds: client.sharedWithAgencyIds || []
        }));
        this.applyFilters();
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur chargement clients:', error);
        this.errorMessage = 'Erreur lors du chargement des clients';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(sub);
  }

  applyFilters(): void {
    let filtered = [...this.clients];
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.email.toLowerCase().includes(term) || 
        c.nom.toLowerCase().includes(term) || 
        c.prenom.toLowerCase().includes(term) || 
        (c.telephone && c.telephone.toLowerCase().includes(term))
      );
    }
    if (this.clientTypeFilter) filtered = filtered.filter(c => c.role === this.clientTypeFilter);
    if (this.visibilityTypeFilter) filtered = filtered.filter(c => c.visibilityType === this.visibilityTypeFilter);
    if (this.statusFilter) filtered = filtered.filter(c => c.isActive === (this.statusFilter === 'active'));
    if (this.buyerStatusFilter === 'buyers') filtered = filtered.filter(c => (c.nombreAchats || 0) > 0);
    else if (this.buyerStatusFilter === 'non-buyers') filtered = filtered.filter(c => (c.nombreAchats || 0) === 0);
    if (this.minBudget !== null) filtered = filtered.filter(c => (c.budgetEstime || 0) >= this.minBudget!);
    if (this.maxBudget !== null) filtered = filtered.filter(c => (c.budgetEstime || 0) <= this.maxBudget!);
    
    filtered.sort((a, b) => {
      let aVal: any = a[this.sortField as keyof Client];
      let bVal: any = b[this.sortField as keyof Client];
      if (this.sortField === 'createdAt') { 
        aVal = new Date(aVal || 0).getTime(); 
        bVal = new Date(bVal || 0).getTime(); 
      }
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    this.filteredClients = filtered;
    this.cdr.detectChanges();
  }

  sort(field: string): void {
    if (this.sortField === field) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortField = field; this.sortDirection = 'asc'; }
    this.loadClients();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) return 'fas fa-sort';
    return this.sortDirection === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  changePage(newPage: number): void { this.page = newPage; this.loadClients(); }
  changePageSize(newSize: number): void { this.pageSize = newSize; this.page = 0; this.loadClients(); }

  resetFilters(): void {
    this.searchTerm = '';
    this.clientTypeFilter = '';
    this.visibilityTypeFilter = '';
    this.statusFilter = '';
    this.buyerStatusFilter = '';
    this.minBudget = null;
    this.maxBudget = null;
    this.applyFilters();
  }

  onClientTypeChange(): void {
    this.isAffiliateForm = this.clientForm.get('clientType')?.value === 'AFFILIATE';
    if (this.isAffiliateForm) this.clientForm.patchValue({ codeAffiliation: this.clientService.generateAffiliateCode() });
    else this.clientForm.patchValue({ codeAffiliation: '', tauxCommission: 5, source: '' });
    this.cdr.detectChanges();
  }

  toggleSharedAgency(event: any): void {
    const agencyId = Number(event.target.value);
    if (event.target.checked) { 
      if (!this.selectedSharedAgencyIds.includes(agencyId)) this.selectedSharedAgencyIds.push(agencyId); 
    } else { 
      const index = this.selectedSharedAgencyIds.indexOf(agencyId); 
      if (index > -1) this.selectedSharedAgencyIds.splice(index, 1); 
    }
  }

  isAgencySelected(agencyId: number): boolean { return this.selectedSharedAgencyIds.includes(agencyId); }

  openCreateModal(): void { 
    this.resetClientForm(); 
    this.isAffiliateForm = false; 
    this.selectedSharedAgencyIds = []; 
    this.createModal?.show(); 
    this.cdr.detectChanges(); 
  }
  closeCreateModal(): void { this.createModal?.hide(); this.cdr.detectChanges(); }

  openEditModal(client: Client): void {
    this.selectedClient = client;
    this.isAffiliateForm = client.role === 'AFFILIATE';
    this.editForm.patchValue({
      nom: client.nom, prenom: client.prenom, telephone: client.telephone || '',
      budgetEstime: client.budgetEstime || null, zoneRecherchee: client.zoneRecherchee || '',
      isActive: client.isActive, codeAffiliation: client.codeAffiliation || '',
      tauxCommission: client.tauxCommission || 5, source: client.source || ''
    });
    this.editModal?.show();
    this.cdr.detectChanges();
  }
  closeEditModal(): void { this.editModal?.hide(); this.selectedClient = null; this.cdr.detectChanges(); }

  openDetailsModal(client: Client): void { this.selectedClient = client; this.detailsModal?.show(); this.cdr.detectChanges(); }
  closeDetailsModal(): void { this.detailsModal?.hide(); this.selectedClient = null; this.cdr.detectChanges(); }

  openNoteModal(client: Client): void { this.selectedClient = client; this.noteForm.reset(); this.noteModal?.show(); this.cdr.detectChanges(); }
  closeNoteModal(): void { this.noteModal?.hide(); this.selectedClient = null; this.cdr.detectChanges(); }

  openHistoryModal(client: Client): void { this.selectedClient = client; this.loadClientNotes(client.id); this.historyModal?.show(); this.cdr.detectChanges(); }
  closeHistoryModal(): void { this.historyModal?.hide(); this.selectedClient = null; this.clientNotes = []; this.cdr.detectChanges(); }

  openShareModal(client: Client): void {
    this.selectedClient = client;
    this.loadAvailableAgencies(client.id);
    this.shareModal?.show();
    this.cdr.detectChanges();
  }
  closeShareModal(): void { this.shareModal?.hide(); this.selectedClient = null; this.availableAgencies = []; this.cdr.detectChanges(); }

  loadAvailableAgencies(clientId: number): void {
    this.clientService.getAvailableAgenciesForSharing(clientId).subscribe({
      next: (agencies) => { this.availableAgencies = agencies; this.cdr.detectChanges(); },
      error: (error) => console.error('Erreur chargement agences disponibles:', error)
    });
  }

  shareWithAgency(adminId: number): void {
    if (!this.selectedClient) return;
    this.clientService.sharePrivateClientWithAgency(this.selectedClient.id, adminId).subscribe({
      next: () => {
        this.successMessage = 'Client partagé avec succès';
        this.loadClients();
        this.loadAvailableAgencies(this.selectedClient!.id);
        setTimeout(() => this.hideMessageAfterDelay('success'), 3000);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Erreur lors du partage';
        this.cdr.detectChanges();
      }
    });
  }

  revokeSharing(adminId: number): void {
    if (!this.selectedClient) return;
    this.clientService.revokePrivateClientSharing(this.selectedClient.id, adminId).subscribe({
      next: () => {
        this.successMessage = 'Partage révoqué avec succès';
        this.loadClients();
        this.loadAvailableAgencies(this.selectedClient!.id);
        setTimeout(() => this.hideMessageAfterDelay('success'), 3000);
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Erreur lors de la révocation';
        this.cdr.detectChanges();
      }
    });
  }

  loadClientNotes(clientId: number): void {
    this.clientService.getClientNotes(clientId).subscribe({
      next: (notes) => { this.clientNotes = notes; this.cdr.detectChanges(); },
      error: (error) => console.error('Erreur chargement notes:', error)
    });
  }

  createClient(): void {
    if (this.clientForm.invalid) { this.markFormGroupTouched(this.clientForm); return; }
    this.loading = true;
    const fv = this.clientForm.value;
    const request: CreateClientRequest = {
      email: fv.email, password: fv.password, nom: fv.nom, prenom: fv.prenom,
      telephone: fv.telephone || undefined, budgetEstime: fv.budgetEstime || undefined,
      zoneRecherchee: fv.zoneRecherchee || undefined, commercialId: fv.commercialId || undefined,
      clientType: fv.clientType, visibilityType: fv.visibilityType,
      targetAgencyAdminId: fv.visibilityType === 'AGENCY_CLIENT' && this.currentUser?.role === 'SUPER_ADMIN' ? fv.targetAgencyAdminId : undefined,
      sharedAgencyIds: fv.visibilityType === 'PRIVATE_CLIENT' ? this.selectedSharedAgencyIds : [],
      codeAffiliation: fv.clientType === 'AFFILIATE' ? fv.codeAffiliation : undefined,
      tauxCommission: fv.clientType === 'AFFILIATE' ? fv.tauxCommission : undefined,
      source: fv.clientType === 'AFFILIATE' ? fv.source : undefined
    };
    this.clientService.createClient(request).subscribe({
      next: (newClient) => {
        this.successMessage = `Client ${newClient.prenom} ${newClient.nom} créé avec succès`;
        this.loadStats(); this.loadClients(); this.resetClientForm();
        this.selectedSharedAgencyIds = []; this.closeCreateModal();
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.hideMessageAfterDelay('success'), 3000);
      },
      error: (error) => {
        console.error('Erreur création client:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la création';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  updateClient(): void {
    if (!this.selectedClient || this.editForm.invalid) { this.markFormGroupTouched(this.editForm); return; }
    this.loading = true;
    const fv = this.editForm.value;
    const request: UpdateClientRequest = {
      nom: fv.nom, prenom: fv.prenom, telephone: fv.telephone || undefined,
      budgetEstime: fv.budgetEstime || undefined, zoneRecherchee: fv.zoneRecherchee || undefined,
      isActive: fv.isActive
    };
    if (this.selectedClient.role === 'AFFILIATE') {
      request.codeAffiliation = fv.codeAffiliation || undefined;
      request.tauxCommission = fv.tauxCommission;
      request.source = fv.source || undefined;
    }
    this.clientService.updateClient(this.selectedClient.id, request).subscribe({
      next: (updatedClient) => {
        this.successMessage = `Client ${updatedClient.prenom} ${updatedClient.nom} mis à jour`;
        this.loadStats(); this.loadClients(); this.closeEditModal();
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.hideMessageAfterDelay('success'), 3000);
      },
      error: (error) => {
        console.error('Erreur mise à jour:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la mise à jour';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  addNote(): void {
    if (!this.selectedClient || this.noteForm.invalid) { this.markFormGroupTouched(this.noteForm); return; }
    this.loading = true;
    this.clientService.addClientNote(this.selectedClient.id, this.currentUser?.userId, this.noteForm.get('note')?.value).subscribe({
      next: () => { 
        this.successMessage = 'Note ajoutée'; 
        this.closeNoteModal(); 
        this.loading = false; 
        this.cdr.detectChanges(); 
        setTimeout(() => this.hideMessageAfterDelay('success'), 3000); 
      },
      error: (error) => { 
        console.error('Erreur ajout note:', error); 
        this.errorMessage = error.error?.message || 'Erreur'; 
        this.loading = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  toggleClientStatus(client: Client): void {
    if (!confirm(`Voulez-vous vraiment ${client.isActive ? 'désactiver' : 'activer'} ce client ?`)) return;
    this.loading = true;
    this.clientService.toggleClientStatus(client.id).subscribe({
      next: () => { 
        this.successMessage = `Client ${client.isActive ? 'désactivé' : 'activé'}`; 
        this.loadStats(); 
        this.loadClients(); 
        this.loading = false; 
        this.cdr.detectChanges(); 
      },
      error: (error) => { 
        console.error('Erreur changement statut:', error); 
        this.errorMessage = error.error?.message || 'Erreur'; 
        this.loading = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  deleteClient(client: Client): void {
    if (!confirm(`Supprimer ${client.email} ?`)) return;
    this.loading = true;
    this.clientService.deleteClient(client.id).subscribe({
      next: () => { 
        this.successMessage = `Client ${client.email} supprimé`; 
        this.loadStats(); 
        this.loadClients(); 
        this.loading = false; 
        this.cdr.detectChanges(); 
      },
      error: (error) => { 
        console.error('Erreur suppression:', error); 
        this.errorMessage = error.error?.message || 'Erreur'; 
        this.loading = false; 
        this.cdr.detectChanges(); 
      }
    });
  }

  generatePassword(): void {
    this.generatedPassword = this.clientService.generateRandomPassword();
    this.clientForm.patchValue({ password: this.generatedPassword, confirmPassword: this.generatedPassword });
    this.showPassword = true;
  }

  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  
  resetClientForm(): void { 
    this.clientForm.reset({ 
      clientType: 'NORMAL', 
      visibilityType: 'AGENCY_CLIENT', 
      tauxCommission: 5 
    }); 
    this.generatedPassword = ''; 
    this.showPassword = false; 
    this.isAffiliateForm = false; 
  }
  
  passwordMatchValidator(form: FormGroup): any { 
    return form.get('password')?.value === form.get('confirmPassword')?.value ? null : { passwordMismatch: true }; 
  }
  
  markFormGroupTouched(formGroup: FormGroup): void { 
    Object.values(formGroup.controls).forEach(c => { 
      c.markAsTouched(); 
      if (c instanceof FormGroup) this.markFormGroupTouched(c); 
    }); 
  }
  
  hideMessageAfterDelay(type: 'success' | 'error'): void { 
    setTimeout(() => { 
      if (type === 'success') this.successMessage = ''; 
      else this.errorMessage = ''; 
      this.cdr.detectChanges(); 
    }, 5000); 
  }

  // Display helpers
  formatDate(dateString: string): string { return this.clientService.formatDate(dateString); }
  formatCurrency(amount: number): string { return this.clientService.formatCurrency(amount); }
  
  getVisibilityTypeLabel(type: string | undefined): string { 
    if (type === 'PRIVATE_CLIENT') return 'Client privé';
    return 'Client agence';
  }
  
  getVisibilityTypeIcon(type: string | undefined): string { 
    if (type === 'PRIVATE_CLIENT') return 'fa-lock';
    return 'fa-building';
  }
  
  getVisibilityTypeClass(type: string | undefined): string { 
    if (type === 'PRIVATE_CLIENT') return 'badge-private';
    return 'badge-agency';
  }
  
  getRoleText(role: string): string { 
    const roles: any = { 
      'SUPER_ADMIN': 'Super Admin', 
      'ADMIN': 'Administrateur', 
      'RESPONSABLE_COMMERCIAL': 'Resp. Commercial', 
      'COMMERCIAL': 'Commercial', 
      'CLIENT': 'Client', 
      'AFFILIATE': 'Affilié' 
    }; 
    return roles[role] || role; 
  }
  
  getRoleColor(role: string): string { return this.clientService.getRoleColor(role); }
  getInitials(prenom: string, nom: string): string { return this.clientService.getInitials(prenom, nom); }
  getClientTypeBadgeClass(role: string): string { return role === 'AFFILIATE' ? 'badge-affiliate' : 'badge-client'; }
  
  canEdit(client: Client): boolean { 
    return this.currentUser?.role === 'COMMERCIAL' ? client.role === 'CLIENT' : true; 
  }
  
  canViewAffiliateDetails(client: Client): boolean { 
    return this.currentUser?.role !== 'COMMERCIAL' && client.role === 'AFFILIATE'; 
  }
  
  canManageSharing(client: Client): boolean { 
    return this.currentUser?.role === 'SUPER_ADMIN' && client.visibilityType === 'PRIVATE_CLIENT'; 
  }

  toggleDropdown(event: MouseEvent, dropdownId: string): void {
    event.stopPropagation();
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
      if (this.activeDropdown && this.activeDropdown !== dropdown) this.activeDropdown.classList.remove('show');
      dropdown.classList.toggle('show');
      this.activeDropdown = dropdown.classList.contains('show') ? dropdown : null;
    }
  }
  
  @HostListener('document:click') onDocumentClick(): void { 
    if (this.activeDropdown) { 
      this.activeDropdown.classList.remove('show'); 
      this.activeDropdown = null; 
    } 
  }
  
  viewAffiliateDetails(client: Client): void { 
    this.selectedClient = client; 
    this.detailsModal?.show(); 
  }

  ngOnDestroy(): void { 
    this.subscriptions.forEach(sub => sub.unsubscribe()); 
  }
}