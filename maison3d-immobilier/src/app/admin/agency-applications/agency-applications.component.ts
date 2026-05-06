import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AgencyRegistrationService, AgencyApplicationDTO } from '../services/agency-registration.service';

@Component({
  selector: 'app-agency-applications',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agency-applications.component.html',
  styleUrl: './agency-applications.component.scss',
})
export class AgencyApplicationsComponent implements OnInit {

  applications: AgencyApplicationDTO[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Reject modal
  rejectModalOpen = false;
  rejectTarget: AgencyApplicationDTO | null = null;
  rejectReason = '';
  actionLoading = false;

  // Detail modal
  detailModalOpen = false;
  selectedApp: AgencyApplicationDTO | null = null;

  constructor(
    private agencyService: AgencyRegistrationService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.agencyService.getPendingApplications().subscribe({
      next: data => {
        this.applications = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Erreur lors du chargement des candidatures.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openDetail(app: AgencyApplicationDTO): void {
    this.selectedApp = app;
    this.detailModalOpen = true;
  }

  closeDetail(): void {
    this.detailModalOpen = false;
    this.selectedApp = null;
  }

  getFullName(app: AgencyApplicationDTO): string {
    return `${app.prenom} ${app.nom}`;
  }

  approve(app: AgencyApplicationDTO): void {
    this.actionLoading = true;
    this.agencyService.approve(app.id).subscribe({
      next: () => {
        this.successMessage = `Agence "${app.agencyName}" approuvée avec succès.`;
        this.actionLoading = false;
        this.closeDetail();
        this.load();
      },
      error: () => {
        this.errorMessage = 'Erreur lors de l\'approbation.';
        this.actionLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openRejectModal(app: AgencyApplicationDTO): void {
    this.rejectTarget = app;
    this.rejectReason = '';
    this.rejectModalOpen = true;
  }

  closeRejectModal(): void {
    this.rejectModalOpen = false;
    this.rejectTarget = null;
    this.rejectReason = '';
  }

  confirmReject(): void {
    if (!this.rejectTarget || !this.rejectReason.trim()) return;
    this.actionLoading = true;
    this.agencyService.reject(this.rejectTarget.id, this.rejectReason).subscribe({
      next: () => {
        this.successMessage = `Candidature de "${this.rejectTarget!.agencyName}" rejetée.`;
        this.actionLoading = false;
        this.closeRejectModal();
        this.load();
      },
      error: () => {
        this.errorMessage = 'Erreur lors du rejet.';
        this.actionLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
}
