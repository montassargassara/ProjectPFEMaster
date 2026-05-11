import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SaleValidationService, SaleValidationRequestDTO } from '../services/sale-validation.service';
import { AdminAuthService } from '../services/admin-auth';
import { apiBaseUrl } from '../../services/api-config';

@Component({
  selector: 'app-sale-validations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sale-validations.component.html',
  styleUrl: './sale-validations.component.scss',
})
export class SaleValidationsComponent implements OnInit {

  pendingList: SaleValidationRequestDTO[] = [];
  myRequests: SaleValidationRequestDTO[] = [];
  activeTab: 'pending' | 'sent' = 'pending';
  loading = false;
  errorMessage = '';
  successMessage = '';

  // Reject modal
  rejectModalOpen = false;
  rejectTarget: SaleValidationRequestDTO | null = null;
  rejectReason = '';
  actionLoading = false;

  // Approve confirm modal
  approveModalOpen = false;
  approveTarget: SaleValidationRequestDTO | null = null;

  constructor(
    private saleValidationService: SaleValidationService,
    private authService: AdminAuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.saleValidationService.getPendingForMe().subscribe({
      next: data => { this.pendingList = data; this.checkDone(); },
      error: () => { this.pendingList = []; this.checkDone(); }
    });

    this.saleValidationService.getMyRequests().subscribe({
      next: data => { this.myRequests = data; this.checkDone(); },
      error: () => { this.myRequests = []; this.checkDone(); }
    });
  }

  private _doneCount = 0;
  private checkDone(): void {
    this._doneCount++;
    if (this._doneCount >= 2) {
      this._doneCount = 0;
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  openApprove(item: SaleValidationRequestDTO): void {
    this.approveTarget = item;
    this.approveModalOpen = true;
  }

  confirmApprove(): void {
    if (!this.approveTarget) return;
    this.actionLoading = true;
    this.saleValidationService.approve(this.approveTarget.id).subscribe({
      next: () => {
        this.successMessage = 'Validation approuvée. La transaction a été finalisée.';
        this.approveModalOpen = false;
        this.approveTarget = null;
        this.actionLoading = false;
        this.load();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Erreur lors de l\'approbation.';
        this.actionLoading = false;
        this.approveModalOpen = false;
        this.cdr.detectChanges();
      }
    });
  }

  openReject(item: SaleValidationRequestDTO): void {
    this.rejectTarget = item;
    this.rejectReason = '';
    this.rejectModalOpen = true;
  }

  confirmReject(): void {
    if (!this.rejectTarget) return;
    this.actionLoading = true;
    this.saleValidationService.reject(this.rejectTarget.id, this.rejectReason).subscribe({
      next: () => {
        this.successMessage = 'Validation refusée. Le bien est de nouveau disponible.';
        this.rejectModalOpen = false;
        this.rejectTarget = null;
        this.rejectReason = '';
        this.actionLoading = false;
        this.load();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Erreur lors du refus.';
        this.actionLoading = false;
        this.rejectModalOpen = false;
        this.cdr.detectChanges();
      }
    });
  }

  closeModals(): void {
    this.approveModalOpen = false;
    this.rejectModalOpen = false;
    this.approveTarget = null;
    this.rejectTarget = null;
    this.rejectReason = '';
  }

  imageUrl(url?: string): string | null {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${apiBaseUrl}${url}`;
  }

  getBuyerDisplay(item: SaleValidationRequestDTO): string {
    if (item.buyerName) return item.buyerName;
    const parts = [item.clientPrenom, item.clientNom].filter(Boolean);
    if (parts.length) return parts.join(' ');
    if (item.clientEmail) return item.clientEmail;
    return 'Client non défini';
  }

  getTransactionLabel(item: SaleValidationRequestDTO): string {
    return item.targetStatus === 'VENDU' ? 'Vente' : 'Location';
  }

  getTransactionClass(item: SaleValidationRequestDTO): string {
    return item.targetStatus === 'VENDU' ? 'badge-sale' : 'badge-rent';
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING': return 'En attente';
      case 'APPROVED': return 'Approuvée';
      case 'REJECTED': return 'Refusée';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING': return 'status-pending';
      case 'APPROVED': return 'status-approved';
      case 'REJECTED': return 'status-rejected';
      default: return '';
    }
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}
