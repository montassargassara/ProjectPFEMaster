import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PropertiesAdminService, PropertyListItem } from '../services/properties-admin.service';
import { apiBaseUrl } from '../../services/api-config';

@Component({
  selector: 'app-transactions-location',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './transactions-location.html',
  styleUrl: './transactions-location.scss',
})
export class TransactionsLocation implements OnInit {

  properties: PropertyListItem[] = [];
  loading = false;
  errorMessage = '';

  searchTerm = '';
  typeFilter = '';
  cityFilter = '';

  constructor(
    private propertiesService: PropertiesAdminService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.propertiesService.getRentedProperties().subscribe({
      next: list => {
        this.properties = list;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les locations.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Computed stats ───────────────────────────────────────────────────────

  get totalRevenue(): number {
    return this.properties.reduce((sum, p) => sum + (p.prixLocation ?? 0), 0);
  }

  get avgPrice(): number {
    if (!this.properties.length) return 0;
    return this.totalRevenue / this.properties.length;
  }

  get cityBreakdown(): { city: string; count: number }[] {
    const map = new Map<string, number>();
    this.properties.forEach(p => {
      const c = p.city || 'Inconnue';
      map.set(c, (map.get(c) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  get typeBreakdown(): { type: string; count: number }[] {
    const map = new Map<string, number>();
    this.properties.forEach(p => {
      map.set(p.type, (map.get(p.type) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  get activeRentals(): number {
    const now = new Date();
    return this.properties.filter(p => {
      if (!p.rentalEndDate) return true;
      return new Date(p.rentalEndDate) > now;
    }).length;
  }

  // ── Filtered list ────────────────────────────────────────────────────────

  get filtered(): PropertyListItem[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.properties.filter(p => {
      const matchSearch = !term
        || p.titre.toLowerCase().includes(term)
        || (p.adresse ?? '').toLowerCase().includes(term)
        || (p.city ?? '').toLowerCase().includes(term);
      const matchType = !this.typeFilter || p.type === this.typeFilter;
      const matchCity = !this.cityFilter || (p.city ?? '') === this.cityFilter;
      return matchSearch && matchType && matchCity;
    });
  }

  get availableTypes(): string[] {
    return [...new Set(this.properties.map(p => p.type))].sort();
  }

  get availableCities(): string[] {
    return [...new Set(this.properties.map(p => p.city ?? '').filter(Boolean))].sort();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  imageUrl(p: PropertyListItem): string | null {
    if (!p.mainImageUrl) return null;
    if (p.mainImageUrl.startsWith('http')) return p.mainImageUrl;
    return `${apiBaseUrl}${p.mainImageUrl}`;
  }

  fmt(val: number | undefined): string {
    if (!val && val !== 0) return '—';
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TND';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }

  rentalStatus(p: PropertyListItem): { label: string; cls: string } {
    if (!p.rentalEndDate) return { label: 'Durée indéfinie', cls: 'badge-neutral' };
    const end = new Date(p.rentalEndDate);
    const now = new Date();
    const daysLeft = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { label: 'Expiré', cls: 'badge-expired' };
    if (daysLeft <= 30) return { label: `Expire dans ${daysLeft}j`, cls: 'badge-expiring' };
    return { label: `Actif — fin ${this.formatDate(p.rentalEndDate)}`, cls: 'badge-active' };
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.typeFilter = '';
    this.cityFilter = '';
  }
}
