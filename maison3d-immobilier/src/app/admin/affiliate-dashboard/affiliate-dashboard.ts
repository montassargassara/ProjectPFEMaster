import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AffiliateService } from '../services/affiliate.service';
import { AffiliateStatsDTO, AffiliateProfileDTO, SaleOfferDTO, SuggestedZoneDTO } from '../../models/affiliate.model';

@Component({
  selector: 'app-affiliate-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './affiliate-dashboard.html',
  styleUrl: './affiliate-dashboard.scss',
})
export class AffiliateDashboardComponent implements OnInit {

  stats: AffiliateStatsDTO | null = null;
  profile: AffiliateProfileDTO | null = null;
  recentOffers: SaleOfferDTO[] = [];
  suggestedZones: SuggestedZoneDTO[] = [];
  loading = false;
  errorMessage = '';

  constructor(
    private affiliateService: AffiliateService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;

    this.affiliateService.getMyProfile().subscribe({
      next: p => { this.profile = p; this.cdr.detectChanges(); },
      error: () => {}
    });

    this.affiliateService.getMyStats().subscribe({
      next: s => {
        this.stats = s;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Erreur lors du chargement du tableau de bord.';
        this.cdr.detectChanges();
      }
    });

    this.affiliateService.getMyOffers().subscribe({
      next: offers => {
        this.recentOffers = offers.slice(0, 5);
        this.cdr.detectChanges();
      },
      error: () => {}
    });

    this.affiliateService.getSuggestedZones().subscribe({
      next: zones => {
        this.suggestedZones = zones;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  formatStatus(status: string): string {
    return this.affiliateService.formatStatus(status);
  }

  getStatusClass(status: string): string {
    return this.affiliateService.getStatusClass(status);
  }

  fmt(val: number): string {
    if (!val && val !== 0) return '—';
    return val.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' TND';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  demandLabel(score: number): string {
    if (score >= 10) return 'Très forte';
    if (score >= 5)  return 'Forte';
    if (score >= 2)  return 'Modérée';
    if (score >= 1)  return 'Faible';
    return 'Nouvelle zone';
  }

  demandClass(score: number): string {
    if (score >= 10) return 'demand-very-high';
    if (score >= 5)  return 'demand-high';
    if (score >= 2)  return 'demand-medium';
    return 'demand-low';
  }
}
