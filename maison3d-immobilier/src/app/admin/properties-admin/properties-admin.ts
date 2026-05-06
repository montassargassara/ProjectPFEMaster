// properties-admin.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  PropertiesAdminService,
  PropertyListItem,
} from '../services/properties-admin.service';
import { AdminAuthService } from '../services/admin-auth';
import { ShareRequestService, AgencyAdminItem } from '../services/share-request.service';
import { apiBaseUrl } from '../../services/api-config';
import {
  getStatusesForCategory,
  isStatusAllowedForCategory,
  PropertyCategory,
  PropertyStatus,
  RENTAL_STATUSES,
  SALE_STATUSES,
} from '../../models/property.model';

@Component({
  selector: 'app-properties-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './properties-admin.html',
  styleUrl: './properties-admin.scss',
})
export class PropertiesAdmin implements OnInit {
  Math = Math;
  properties: PropertyListItem[] = [];
  filteredProperties: PropertyListItem[] = [];

  loading = false;
  errorMessage = '';

  searchTerm = '';
  typeFilter = '';
  statusFilter = '';
  cityFilter = '';
  categoryFilter = '';
  validationFilter = ''; // ALL | PENDING_RESPONSABLE | PENDING_ADMIN | APPROVED | REJECTED
  minPrice?: number;
  maxPrice?: number;

  page = 1;
  pageSize = 12;
  collectionSize = 0;

  saleStatuses = SALE_STATUSES;
  rentalStatuses = RENTAL_STATUSES;

  propertyCategories = new Map<number, PropertyCategory | null>();

  // ─── Share modal ───────────────────────────────────────────────────────────
  shareModalOpen = false;
  shareTargetProperty: PropertyListItem | null = null;
  availableAdmins: AgencyAdminItem[] = [];
  selectedAdminIds = new Set<number>();
  sharingLoading = false;
  shareSuccessMessage = '';
  // Commission fields for the new share-request workflow
  commissionType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE';
  commissionValue: number = 0;
  shareMessage: string = '';
  shareError: string = '';

  // VENDU properties are hidden from the active list by default; user can toggle
  showFinalized = false;

  // ─── Status change modals ──────────────────────────────────────────────────
  venduConfirmOpen = false;
  loueModalOpen = false;
  pendingStatusItem: PropertyListItem | null = null;
  loueMonths: number | null = null;
  // ──────────────────────────────────────────────────────────────────────────

  constructor(
    private propertiesService: PropertiesAdminService,
    private shareRequestService: ShareRequestService,
    private authService: AdminAuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  get currentUserRole(): string {
    return this.authService.getCurrentUser()?.role?.toUpperCase() ?? '';
  }

  get currentUserId(): number | undefined {
    return this.authService.getCurrentUser()?.id;
  }

  get isSuperAdmin(): boolean {
    return this.currentUserRole === 'SUPER_ADMIN';
  }

  get isAdmin(): boolean {
    return this.currentUserRole === 'ADMIN';
  }

  get isCommercial(): boolean {
    return this.currentUserRole === 'COMMERCIAL';
  }

  get canApproveSales(): boolean {
    return this.isSuperAdmin || this.isAdmin;
  }

  loadProperties(): void {
    this.loading = true;
    this.errorMessage = '';

    this.propertiesService.getAllProperties().subscribe({
      next: properties => {
        this.properties = properties;
        this.loadCategoriesForProperties();
        this.applyFilters();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Failed to load properties', error);
        this.errorMessage = 'Erreur lors du chargement des biens.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  loadCategoriesForProperties(): void {
    this.properties.forEach(property => {
      this.getPropertyCategory(property);
    });
  }

  getPropertyCategory(property: PropertyListItem): PropertyCategory | null {
    if (this.propertyCategories.has(property.id)) {
      return this.propertyCategories.get(property.id) ?? null;
    }
    const category = this.calculateCategory(property);
    this.propertyCategories.set(property.id, category);
    return category;
  }

  calculateCategory(property: PropertyListItem): PropertyCategory | null {
    const hasSalePrice = property.prixVente && property.prixVente > 0;
    const hasRentalPrice = property.prixLocation && property.prixLocation > 0;
    if (hasSalePrice && !hasRentalPrice) return 'VENTE';
    if (!hasSalePrice && hasRentalPrice) return 'LOCATION';
    return null;
  }

  getStatusesForProperty(property: PropertyListItem): PropertyStatus[] {
    const category = this.getPropertyCategory(property);
    return getStatusesForCategory(category);
  }

  isStatusDisabledForProperty(property: PropertyListItem, statusValue: string): boolean {
    const category = this.getPropertyCategory(property);
    return !isStatusAllowedForCategory(statusValue, category);
  }

  getCategoryLabel(property: PropertyListItem): string {
    const category = this.getPropertyCategory(property);
    return category === 'VENTE' ? 'Vente' : category === 'LOCATION' ? 'Location' : 'Inconnu';
  }

  // ─── Ownership helpers ────────────────────────────────────────────────────

  getOwnershipLabel(property: PropertyListItem): string {
    if (property.ownerType === 'SUPER_ADMIN_OWNED') {
      const sharedCount = property.sharedWithAgencyIds?.length ?? 0;
      return sharedCount > 0 ? `Partagé (${sharedCount} agence${sharedCount > 1 ? 's' : ''})` : 'Super Admin';
    }
    if (property.ownerType === 'AGENCY_OWNED') {
      return property.agencyAdminName ? `Agence: ${property.agencyAdminName}` : 'Agence';
    }
    return ''; // legacy
  }

  getOwnershipClass(property: PropertyListItem): string {
    if (property.ownerType === 'SUPER_ADMIN_OWNED') {
      return (property.sharedWithAgencyIds?.length ?? 0) > 0 ? 'badge-shared' : 'badge-super-admin';
    }
    if (property.ownerType === 'AGENCY_OWNED') return 'badge-agency';
    return '';
  }

  canShare(property: PropertyListItem): boolean {
    return this.isSuperAdmin && property.ownerType === 'SUPER_ADMIN_OWNED';
  }

  /**
   * Whether the current user can edit/modify/delete this property.
   * Mirrors backend enforcement in PropertyService:
   *  - SUPER_ADMIN: cannot mutate AGENCY_OWNED properties
   *  - ADMIN: cannot mutate SUPER_ADMIN_OWNED properties
   *  - COMMERCIAL: can only mutate properties they personally created
   */
  canEditProperty(property: PropertyListItem): boolean {
    if (!this.authService.getCurrentUser()) return false;

    if (this.isSuperAdmin) {
      const isAgencyOwned = property.ownerType === 'AGENCY_OWNED'
        || property.ownerRole === 'ADMIN'
        || property.ownerRole === 'RESPONSABLE_COMMERCIAL'
        || property.ownerRole === 'COMMERCIAL';
      if (isAgencyOwned) return false;
    }

    if (this.isAdmin && property.ownerType === 'SUPER_ADMIN_OWNED') {
      return false;
    }

    if (this.currentUserRole === 'RESPONSABLE_COMMERCIAL' && property.ownerType === 'SUPER_ADMIN_OWNED') {
      return false;
    }

    if (this.isCommercial && property.createdById !== this.currentUserId) {
      return false;
    }

    return true;
  }

  noEditTooltip(property: PropertyListItem): string {
    if (this.isSuperAdmin && property.ownerType === 'AGENCY_OWNED') {
      return 'Vous ne pouvez pas modifier ce bien (appartient à une agence)';
    }
    if ((this.isAdmin || this.currentUserRole === 'RESPONSABLE_COMMERCIAL') && property.ownerType === 'SUPER_ADMIN_OWNED') {
      return 'Ce bien appartient au Super Admin — lecture seule';
    }
    if (this.isCommercial && property.createdById !== this.currentUserId) {
      return 'Vous ne pouvez modifier que vos propres biens';
    }
    return '';
  }

  /**
   * Whether the current user can initiate a status change on this property.
   * Every visible property allows a status-change request; cross-ownership ones
   * are routed through the approval workflow instead of being applied directly.
   *
   * COMMERCIAL and RESPONSABLE_COMMERCIAL can request status changes on ALL
   * properties returned by the API (visibility is enforced server-side).
   */
  canChangeStatus(property: PropertyListItem): boolean {
    if (this.canEditProperty(property)) return true;
    // SUPER_ADMIN on AGENCY_OWNED — routes to that agency's ADMIN for approval
    if (this.isSuperAdmin && property.ownerType === 'AGENCY_OWNED') return true;
    // ADMIN on SUPER_ADMIN_OWNED — routes to SUPER_ADMIN for approval
    if (this.isAdmin && property.ownerType === 'SUPER_ADMIN_OWNED') return true;
    // COMMERCIAL / RESPONSABLE — all status changes go through ADMIN approval
    // regardless of ownerType or who created the property
    if (this.currentUserRole === 'COMMERCIAL' || this.currentUserRole === 'RESPONSABLE_COMMERCIAL') return true;
    return false;
  }

  /**
   * Whether any status change on this property will trigger the approval workflow.
   * When true, the dropdown shows a warning before the user submits.
   */
  statusChangeNeedsApproval(property: PropertyListItem): boolean {
    if (this.isSuperAdmin && property.ownerType === 'AGENCY_OWNED') return true;
    if (this.isAdmin && property.ownerType === 'SUPER_ADMIN_OWNED') return true;
    if (this.currentUserRole === 'COMMERCIAL' || this.currentUserRole === 'RESPONSABLE_COMMERCIAL') return true;
    return false;
  }

  approvalChainLabel(property: PropertyListItem): string {
    if (this.isSuperAdmin && property.ownerType === 'AGENCY_OWNED') {
      return "L'Admin de l'agence doit valider avant application.";
    }
    if (this.isAdmin && property.ownerType === 'SUPER_ADMIN_OWNED') {
      return 'Le Super Admin doit valider avant application.';
    }
    // RESPONSABLE / COMMERCIAL: chain depends on the property owner
    if (this.currentUserRole === 'RESPONSABLE_COMMERCIAL' || this.currentUserRole === 'COMMERCIAL') {
      if (property.ownerType === 'SUPER_ADMIN_OWNED') {
        return "L'Admin de votre agence, puis le Super Admin, doivent valider.";
      }
      return "L'Admin de votre agence doit valider avant application.";
    }
    return '';
  }

  // ─── Pending sale approval ────────────────────────────────────────────────

  hasPendingSale(property: PropertyListItem): boolean {
    return property.pendingSaleApproval === 'PENDING';
  }

  canApproveSaleFor(property: PropertyListItem): boolean {
    if (!this.canApproveSales) return false;
    if (!this.hasPendingSale(property)) return false;
    // The backend sets pendingSaleApproverRole to indicate exactly who should approve next.
    if (this.isSuperAdmin) return property.pendingSaleApproverRole === 'SUPER_ADMIN';
    if (this.isAdmin) return property.pendingSaleApproverRole === 'ADMIN';
    return false;
  }

  approveSale(property: PropertyListItem): void {
    this.propertiesService.approvePendingSale(property.id).subscribe({
      next: updated => {
        Object.assign(property, updated);
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMessage = err?.error?.error || 'Impossible d\'approuver la vente.';
        this.cdr.detectChanges();
        setTimeout(() => { this.errorMessage = ''; this.cdr.detectChanges(); }, 4000);
      },
    });
  }

  rejectSale(property: PropertyListItem): void {
    const reason = prompt('Raison du refus (optionnelle):') ?? '';
    this.propertiesService.rejectPendingSale(property.id, reason).subscribe({
      next: updated => {
        Object.assign(property, updated);
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: err => {
        this.errorMessage = err?.error?.error || 'Impossible de refuser la vente.';
        this.cdr.detectChanges();
        setTimeout(() => { this.errorMessage = ''; this.cdr.detectChanges(); }, 4000);
      },
    });
  }

  getPendingSaleLabel(property: PropertyListItem): string {
    if (!property.pendingSaleApproval) return '';
    const requester = property.pendingSaleRequestedByName ?? 'Inconnu';
    const target = property.pendingSaleStatut ?? '?';
    switch (property.pendingSaleApproval) {
      case 'PENDING': {
        const waitingFor = property.pendingSaleApproverRole === 'SUPER_ADMIN'
          ? 'Super Admin' : 'Admin';
        return `Vente "${target}" demandée par ${requester} — en attente de ${waitingFor}`;
      }
      case 'APPROVED':
        return `Vente approuvée (${target})`;
      case 'REJECTED':
        return `Vente refusée${property.pendingSaleRejectionReason ? ': ' + property.pendingSaleRejectionReason : ''}`;
      default: return '';
    }
  }

  getPendingSaleClass(property: PropertyListItem): string {
    switch (property.pendingSaleApproval) {
      case 'PENDING':  return 'badge-pending-sale';
      case 'APPROVED': return 'badge-sale-approved';
      case 'REJECTED': return 'badge-sale-rejected';
      default: return '';
    }
  }

  // ─── Share modal ──────────────────────────────────────────────────────────

  openShareModal(property: PropertyListItem): void {
    this.shareTargetProperty = property;
    this.shareSuccessMessage = '';
    this.shareError = '';
    this.commissionType = 'PERCENTAGE';
    this.commissionValue = 0;
    this.shareMessage = '';
    this.selectedAdminIds.clear();
    this.sharingLoading = true;
    this.shareModalOpen = true;
    this.cdr.detectChanges();

    this.shareRequestService.getAgenciesWithStatus(property.id).subscribe({
      next: admins => {
        this.availableAdmins = admins;
        this.sharingLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.sharingLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  closeShareModal(): void {
    this.shareModalOpen = false;
    this.shareTargetProperty = null;
    this.availableAdmins = [];
    this.selectedAdminIds.clear();
    this.shareSuccessMessage = '';
    this.shareError = '';
    this.cdr.detectChanges();
  }

  toggleAdmin(adminId: number): void {
    // Cannot select agencies that already have a pending or accepted request
    const admin = this.availableAdmins.find(a => a.id === adminId);
    if (admin?.shareRequestStatus === 'PENDING' || admin?.alreadyShared) return;
    if (this.selectedAdminIds.has(adminId)) {
      this.selectedAdminIds.delete(adminId);
    } else {
      this.selectedAdminIds.add(adminId);
    }
  }

  isAdminSelected(adminId: number): boolean {
    return this.selectedAdminIds.has(adminId);
  }

  isAdminLocked(admin: AgencyAdminItem): boolean {
    return admin.alreadyShared || admin.shareRequestStatus === 'PENDING';
  }

  getAdminStatusLabel(admin: AgencyAdminItem): string {
    if (admin.alreadyShared) return 'Accepté';
    switch (admin.shareRequestStatus) {
      case 'PENDING':   return 'En attente';
      case 'REJECTED':  return 'Refusé';
      case 'CANCELLED': return 'Annulé';
      default: return '';
    }
  }

  getAdminStatusClass(admin: AgencyAdminItem): string {
    if (admin.alreadyShared) return 'admin-status-accepted';
    switch (admin.shareRequestStatus) {
      case 'PENDING':   return 'admin-status-pending';
      case 'REJECTED':  return 'admin-status-rejected';
      case 'CANCELLED': return 'admin-status-cancelled';
      default: return '';
    }
  }

  get commissionPreview(): string {
    if (!this.commissionValue) return 'Aucune commission';
    if (this.commissionType === 'PERCENTAGE') return `${this.commissionValue}%`;
    return `${this.commissionValue.toLocaleString('fr-FR')} TND`;
  }

  sendShareRequests(): void {
    if (!this.shareTargetProperty) return;
    if (this.selectedAdminIds.size === 0) {
      this.shareError = 'Sélectionnez au moins une agence.';
      this.cdr.detectChanges();
      return;
    }
    if (this.commissionValue < 0) {
      this.shareError = 'La commission ne peut pas être négative.';
      this.cdr.detectChanges();
      return;
    }

    this.sharingLoading = true;
    this.shareError = '';

    this.shareRequestService.createRequests(this.shareTargetProperty.id, {
      agencyAdminIds: Array.from(this.selectedAdminIds),
      commissionType: this.commissionType,
      commissionPercentage: this.commissionValue,
      message: this.shareMessage || undefined,
    }).subscribe({
      next: results => {
        this.shareSuccessMessage = `${results.length} demande(s) envoyée(s). Les agences recevront une notification.`;
        this.sharingLoading = false;
        this.applyFilters();
        this.cdr.detectChanges();
        setTimeout(() => this.closeShareModal(), 2000);
      },
      error: err => {
        this.shareError = err?.error?.message || 'Impossible d\'envoyer les demandes.';
        this.sharingLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ─── Filters & pagination ─────────────────────────────────────────────────

  get finalizedCount(): number {
    return this.properties.filter(p => p.statut === 'VENDU' || (p as any).isFinalized).length;
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    let filtered = [...this.properties];

    // Hide finalized (VENDU) properties from the active management list unless toggled on
    if (!this.showFinalized) {
      filtered = filtered.filter(p => p.statut !== 'VENDU' && !(p as any).isFinalized);
    }

    if (term) {
      filtered = filtered.filter(item => {
        const reference = this.getReference(item).toLowerCase();
        const title = (item.titre || '').toLowerCase();
        const address = (item.adresse || '').toLowerCase();
        const city = (item.city || '').toLowerCase();
        return (
          title.includes(term) ||
          reference.includes(term) ||
          address.includes(term) ||
          city.includes(term)
        );
      });
    }

    if (this.typeFilter) {
      filtered = filtered.filter(item => item.type === this.typeFilter);
    }
    if (this.statusFilter) {
      filtered = filtered.filter(item => item.statut === this.statusFilter);
    }
    if (this.cityFilter) {
      filtered = filtered.filter(item => (item.city || '') === this.cityFilter);
    }
    if (this.categoryFilter) {
      filtered = filtered.filter(item => this.getCategory(item) === this.categoryFilter);
    }
    if (this.validationFilter) {
      filtered = filtered.filter(item =>
        (item.validationStatus || 'APPROVED') === this.validationFilter);
    }
    if (this.minPrice !== undefined && this.minPrice !== null) {
      filtered = filtered.filter(item => this.getPrice(item) >= this.minPrice!);
    }
    if (this.maxPrice !== undefined && this.maxPrice !== null) {
      filtered = filtered.filter(item => this.getPrice(item) <= this.maxPrice!);
    }

    this.filteredProperties = filtered;
    this.collectionSize = filtered.length;
    this.page = 1;
    this.cdr.detectChanges();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.typeFilter = '';
    this.statusFilter = '';
    this.cityFilter = '';
    this.categoryFilter = '';
    this.validationFilter = '';
    this.minPrice = undefined;
    this.maxPrice = undefined;
    this.applyFilters();
  }

  get paginatedProperties(): PropertyListItem[] {
    const startIndex = (this.page - 1) * this.pageSize;
    return this.filteredProperties.slice(startIndex, startIndex + this.pageSize);
  }

  getCategory(item: PropertyListItem): string {
    return this.getCategoryLabel(item);
  }

  getPrice(item: PropertyListItem): number {
    if (item.prixVente && item.prixVente > 0) return item.prixVente;
    if (item.prixLocation && item.prixLocation > 0) return item.prixLocation;
    return 0;
  }

  formatPrice(item: PropertyListItem): string {
    const price = this.getPrice(item);
    if (!price || price === 0) return '—';
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND',
      maximumFractionDigits: 0,
    }).format(price);
    return this.getCategory(item) === 'LOCATION' ? `${formatted} / mois` : formatted;
  }

  getReference(item: PropertyListItem): string {
    const id = item.id ?? 0;
    return `PROP-${id.toString().padStart(5, '0')}`;
  }

  getLocation(item: PropertyListItem): string {
    return [item.city, item.country].filter(Boolean).join(', ') || '—';
  }

  getImageUrl(item: PropertyListItem): string | null {
    if (item.mainImageUrl) {
      const rawUrl = item.mainImageUrl.startsWith('http')
        ? item.mainImageUrl
        : `${apiBaseUrl}${item.mainImageUrl}`;
      return rawUrl;
    }
    return null;
  }

  onImageError(item: PropertyListItem): void {
    item.mainImageUrl = undefined;
    item.hasMainImage = false;
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'DISPONIBLE': return 'Disponible';
      case 'VENDU': return 'Vendu';
      case 'RESERVE': return 'Réservé';
      case 'LOUE': return 'Loué';
      case 'EN_ATTENTE': return 'En attente';
      default: return status || 'Inconnu';
    }
  }

  // ── Status lock helpers ────────────────────────────────────────────────────

  isPropertyLocked(property: PropertyListItem): boolean {
    if (property.isFinalized) return true;
    if (property.statut === 'VENDU') return true;
    if (property.isStatusLocked) return true;
    return false;
  }

  get loueEndDatePreview(): string | null {
    if (!this.loueMonths || this.loueMonths < 1) return null;
    const end = new Date();
    end.setMonth(end.getMonth() + this.loueMonths);
    return end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  get loueConfirmEnabled(): boolean {
    return !!(this.loueMonths && this.loueMonths >= 1);
  }

  // ── Status change flow ─────────────────────────────────────────────────────

  updateStatus(item: PropertyListItem, newStatus: string): void {
    if (newStatus === item.statut) return;
    if (this.isPropertyLocked(item)) return;

    const category = this.getPropertyCategory(item);
    if (!isStatusAllowedForCategory(newStatus, category)) {
      this.errorMessage = category === 'VENTE'
        ? 'Une propriété en vente ne peut pas avoir le statut "Loué"'
        : 'Une propriété en location ne peut pas avoir le statut "Vendu"';
      setTimeout(() => (this.errorMessage = ''), 3000);
      this.cdr.detectChanges();
      return;
    }

    // Intercept terminal statuses — show confirmation modals before API call
    if (newStatus === 'VENDU') {
      this.pendingStatusItem = item;
      this.venduConfirmOpen = true;
      this.cdr.detectChanges();
      return;
    }
    if (newStatus === 'LOUE') {
      this.pendingStatusItem = item;
      this.loueMonths = null;
      this.loueModalOpen = true;
      this.cdr.detectChanges();
      return;
    }

    this.applyStatusUpdate(item, newStatus);
  }

  confirmVendu(): void {
    if (!this.pendingStatusItem) return;
    const item = this.pendingStatusItem;
    this.venduConfirmOpen = false;
    this.pendingStatusItem = null;
    this.applyStatusUpdate(item, 'VENDU');
  }

  confirmLoue(): void {
    if (!this.pendingStatusItem || !this.loueConfirmEnabled) return;
    const item = this.pendingStatusItem;
    const months = this.loueMonths!;
    this.loueModalOpen = false;
    this.pendingStatusItem = null;
    this.loueMonths = null;
    this.applyStatusUpdate(item, 'LOUE', months);
  }

  cancelStatusChange(): void {
    this.venduConfirmOpen = false;
    this.loueModalOpen = false;
    this.pendingStatusItem = null;
    this.loueMonths = null;
    this.cdr.detectChanges();
  }

  private applyStatusUpdate(item: PropertyListItem, status: string, rentalDurationMonths?: number): void {
    const oldStatus = item.statut;
    this.propertiesService.updatePropertyStatus(item.id, status, rentalDurationMonths).subscribe({
      next: updated => {
        item.statut                        = updated.statut;
        item.isFinalized                   = updated.isFinalized;
        item.isStatusLocked                = updated.isStatusLocked;
        item.statusLockReason              = updated.statusLockReason;
        item.rentalEndDate                 = updated.rentalEndDate;
        item.rentalDurationMonths          = updated.rentalDurationMonths;
        item.pendingSaleApproval           = updated.pendingSaleApproval;
        item.pendingSaleStatut             = updated.pendingSaleStatut;
        item.pendingSaleRejectionReason    = updated.pendingSaleRejectionReason;
        item.pendingSaleRequestedById      = updated.pendingSaleRequestedById;
        item.pendingSaleRequestedByName    = updated.pendingSaleRequestedByName;
        item.pendingSaleApproverRole       = updated.pendingSaleApproverRole;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: error => {
        item.statut = oldStatus;
        this.errorMessage =
          error.error?.error ||
          error.error?.message ||
          'Impossible de modifier le statut.';
        this.applyFilters();
        this.cdr.detectChanges();
        setTimeout(() => { this.errorMessage = ''; this.cdr.detectChanges(); }, 4000);
      },
    });
  }

  deleteProperty(item: PropertyListItem): void {
    if (!confirm(`Supprimer le bien ${item.titre} ?`)) return;

    this.propertiesService.deleteProperty(item.id).subscribe({
      next: () => {
        this.properties = this.properties.filter(p => p.id !== item.id);
        this.propertyCategories.delete(item.id);
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: error => {
        this.errorMessage = error.error?.error || 'Impossible de supprimer le bien.';
        this.cdr.detectChanges();
        setTimeout(() => {
          if (this.errorMessage) {
            this.errorMessage = '';
            this.cdr.detectChanges();
          }
        }, 4000);
      },
    });
  }

  trackById(_: number, item: PropertyListItem): number {
    return item.id;
  }

  get availableTypes(): string[] {
    return Array.from(new Set(this.properties.map(item => item.type).filter(Boolean))).sort();
  }

  getValidationLabel(status?: string | null): string {
    switch (status) {
      case 'PENDING_RESPONSABLE': return 'En attente Responsable';
      case 'PENDING_ADMIN':       return 'En attente Admin';
      case 'APPROVED':            return 'Approuvé';
      case 'REJECTED':            return 'Refusé';
      default:                    return 'Approuvé';
    }
  }

  getValidationClass(status?: string | null): string {
    switch (status) {
      case 'PENDING_RESPONSABLE':
      case 'PENDING_ADMIN':       return 'badge-pending';
      case 'REJECTED':            return 'badge-rejected';
      case 'APPROVED':
      default:                    return 'badge-approved';
    }
  }

  get pendingCount(): number {
    return this.properties.filter(p =>
      p.validationStatus === 'PENDING_RESPONSABLE' || p.validationStatus === 'PENDING_ADMIN').length;
  }

  get availableCities(): string[] {
    return Array.from(
      new Set(
        this.properties.map(item => item.city).filter((city): city is string => !!city && city.trim() !== '')
      )
    ).sort();
  }
}
