// properties-admin.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  PropertiesAdminService,
  PropertyListItem,
} from '../services/properties-admin.service';
import { apiBaseUrl } from '../../services/api-config';
import { getStatusesForCategory, isStatusAllowedForCategory, PropertyCategory, PropertyStatus, RENTAL_STATUSES, SALE_STATUSES } from '../../models/property.model';


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

  // Status options will be filtered based on category
  saleStatuses = SALE_STATUSES;
  rentalStatuses = RENTAL_STATUSES;
  
  // Cache for property categories - allow null values
  propertyCategories = new Map<number, PropertyCategory | null>();

  constructor(
    private propertiesService: PropertiesAdminService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    console.log('🟢 loadProperties - Début du chargement');
    this.loading = true;
    this.errorMessage = '';

    this.propertiesService.getAllProperties().subscribe({
      next: properties => {
        console.log('✅ Propriétés reçues:', properties.length);
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
    // Use cached value if available
    if (this.propertyCategories.has(property.id)) {
      return this.propertyCategories.get(property.id) ?? null;
    }
    
    // Calculate category based on prices
    const category = this.calculateCategory(property);
    this.propertyCategories.set(property.id, category);
    return category;
  }

  calculateCategory(property: PropertyListItem): PropertyCategory | null {
    const hasSalePrice = property.prixVente && property.prixVente > 0;
    const hasRentalPrice = property.prixLocation && property.prixLocation > 0;
    
    if (hasSalePrice && !hasRentalPrice) {
      return 'VENTE';
    } else if (!hasSalePrice && hasRentalPrice) {
      return 'LOCATION';
    }
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
    if (item.prixVente && item.prixVente > 0) {
      return item.prixVente;
    }
    if (item.prixLocation && item.prixLocation > 0) {
      return item.prixLocation;
    }
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
      case 'DISPONIBLE':
        return 'Disponible';
      case 'VENDU':
        return 'Vendu';
      case 'RESERVE':
        return 'Réservé';
      case 'LOUE':
        return 'Loué';
      case 'EN_ATTENTE':
        return 'En attente';
      default:
        return status || 'Inconnu';
    }
  }

  updateStatus(item: PropertyListItem, status: string): void {
    if (status === item.statut) return;
    
    // Validate status is allowed for this property's category
    const category = this.getPropertyCategory(item);
    if (!isStatusAllowedForCategory(status, category)) {
      const errorMsg = category === 'VENTE' 
        ? 'Une propriété en vente ne peut pas avoir le statut "Loué"'
        : 'Une propriété en location ne peut pas avoir le statut "Vendu"';
      this.errorMessage = errorMsg;
      setTimeout(() => this.errorMessage = '', 3000);
      this.cdr.detectChanges();
      return;
    }
    
    // Optimistic update
    const oldStatus = item.statut;
    item.statut = status;
    this.cdr.detectChanges();
    
    this.propertiesService.updatePropertyStatus(item.id, status).subscribe({
      next: (updatedProperty) => {
        console.log('✅ Statut mis à jour avec succès');
        // Update with the response from server
        item.statut = updatedProperty.statut;
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to update status', error);
        // Revert optimistic update
        item.statut = oldStatus;
        
        // Show appropriate error message
        if (error.error?.error) {
          this.errorMessage = error.error.error;
        } else if (error.error?.message) {
          this.errorMessage = error.error.message;
        } else {
          this.errorMessage = 'Impossible de modifier le statut. Vérifiez que le statut est compatible avec la catégorie.';
        }
        
        this.applyFilters();
        this.cdr.detectChanges();
        
        // Auto-clear error after 4 seconds
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
    if (!confirm(`Supprimer le bien ${item.titre} ?`)) {
      return;
    }

    this.propertiesService.deleteProperty(item.id).subscribe({
      next: () => {
        this.properties = this.properties.filter(p => p.id !== item.id);
        this.propertyCategories.delete(item.id);
        this.applyFilters();
        this.cdr.detectChanges();
      },
      error: error => {
        console.error('Failed to delete property', error);
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
      new Set(this.properties.map(item => item.city).filter(city => city && city.trim() !== '') as string[])
    ).sort();
  }
}