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

  get isSuperAdmin(): boolean {
    return this.currentUserRole === 'SUPER_ADMIN';
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

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    let filtered = [...this.properties];

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
      return rawUrl.replace('/api/public/images/', '/api/images/public/');
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

  updateStatus(item: PropertyListItem, status: string): void {
    if (status === item.statut) return;

    const category = this.getPropertyCategory(item);
    if (!isStatusAllowedForCategory(status, category)) {
      this.errorMessage = category === 'VENTE'
        ? 'Une propriété en vente ne peut pas avoir le statut "Loué"'
        : 'Une propriété en location ne peut pas avoir le statut "Vendu"';
      setTimeout(() => (this.errorMessage = ''), 3000);
      this.cdr.detectChanges();
      return;
    }

    const oldStatus = item.statut;
    item.statut = status;
    this.cdr.detectChanges();

    this.propertiesService.updatePropertyStatus(item.id, status).subscribe({
      next: updated => {
        item.statut = updated.statut;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: error => {
        item.statut = oldStatus;
        this.errorMessage =
          error.error?.error ||
          error.error?.message ||
          'Impossible de modifier le statut. Vérifiez que le statut est compatible avec la catégorie.';
        this.applyFilters();
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

  get availableCities(): string[] {
    return Array.from(
      new Set(
        this.properties.map(item => item.city).filter((city): city is string => !!city && city.trim() !== '')
      )
    ).sort();
  }
}
