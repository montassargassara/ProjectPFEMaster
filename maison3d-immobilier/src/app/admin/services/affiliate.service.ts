import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../../services/api-config';
import {
  AffiliateProfileDTO,
  AffiliateStatsDTO,
  AffiliateApprovalRequest,
  AffiliateRegionDTO,
  AffiliatePropertyDTO,
  AffiliateTransactionDTO,
  MonthlyBonusDTO,
  CreateAffiliateRequest,
  CreateSaleOfferRequest,
  RespondSaleOfferRequest,
  SaleOfferDTO,
  RegionSelection,
  SuggestedZoneDTO,
} from '../../models/affiliate.model';

@Injectable({ providedIn: 'root' })
export class AffiliateService {

  private readonly adminBase = `${apiBaseUrl}/api/admin/affiliates`;
  private readonly affiliateBase = `${apiBaseUrl}/api/affiliate`;
  private readonly offersBase = `${apiBaseUrl}/api/sale-offers`;

  constructor(private http: HttpClient) {}

  // ─── Super Admin: Affiliate Management ───────────────────────────────────

  getAllAffiliates(): Observable<AffiliateProfileDTO[]> {
    return this.http.get<AffiliateProfileDTO[]>(this.adminBase);
  }

  getPendingAffiliates(): Observable<AffiliateProfileDTO[]> {
    return this.http.get<AffiliateProfileDTO[]>(`${this.adminBase}/pending`);
  }

  getAffiliateProfile(affiliateId: number): Observable<AffiliateProfileDTO> {
    return this.http.get<AffiliateProfileDTO>(`${this.adminBase}/${affiliateId}`);
  }

  getAffiliateStats(affiliateId: number): Observable<AffiliateStatsDTO> {
    return this.http.get<AffiliateStatsDTO>(`${this.adminBase}/${affiliateId}/stats`);
  }

  approveAffiliate(affiliateId: number): Observable<AffiliateProfileDTO> {
    return this.http.put<AffiliateProfileDTO>(`${this.adminBase}/${affiliateId}/approve`, {});
  }

  rejectAffiliate(affiliateId: number, req: AffiliateApprovalRequest): Observable<AffiliateProfileDTO> {
    return this.http.put<AffiliateProfileDTO>(`${this.adminBase}/${affiliateId}/reject`, req);
  }

  suspendAffiliate(affiliateId: number, req: AffiliateApprovalRequest): Observable<AffiliateProfileDTO> {
    return this.http.put<AffiliateProfileDTO>(`${this.adminBase}/${affiliateId}/suspend`, req);
  }

  activateAffiliate(affiliateId: number): Observable<AffiliateProfileDTO> {
    return this.http.put<AffiliateProfileDTO>(`${this.adminBase}/${affiliateId}/activate`, {});
  }

  updateRegion(affiliateId: number, regionId: number, region: RegionSelection): Observable<AffiliateRegionDTO> {
    return this.http.put<AffiliateRegionDTO>(`${this.adminBase}/${affiliateId}/regions/${regionId}`, region);
  }

  getMonthlyRanking(): Observable<AffiliateStatsDTO[]> {
    return this.http.get<AffiliateStatsDTO[]>(`${this.adminBase}/ranking`);
  }

  getAllTransactions(): Observable<AffiliateTransactionDTO[]> {
    return this.http.get<AffiliateTransactionDTO[]>(`${this.adminBase}/transactions`);
  }

  markCommissionPaid(transactionId: number): Observable<AffiliateTransactionDTO> {
    return this.http.put<AffiliateTransactionDTO>(`${this.adminBase}/transactions/${transactionId}/pay`, {});
  }

  createAffiliate(req: CreateAffiliateRequest): Observable<AffiliateProfileDTO> {
    return this.http.post<AffiliateProfileDTO>(`${this.adminBase}`, req);
  }

  // ─── Affiliate User: Profile & Properties ────────────────────────────────

  getMyProfile(): Observable<AffiliateProfileDTO> {
    return this.http.get<AffiliateProfileDTO>(`${this.affiliateBase}/my-profile`);
  }

  getMyStats(): Observable<AffiliateStatsDTO> {
    return this.http.get<AffiliateStatsDTO>(`${this.affiliateBase}/stats`);
  }

  getEligibleProperties(): Observable<AffiliatePropertyDTO[]> {
    return this.http.get<AffiliatePropertyDTO[]>(`${this.affiliateBase}/properties`);
  }

  getPublicRanking(): Observable<AffiliateStatsDTO[]> {
    return this.http.get<AffiliateStatsDTO[]>(`${this.affiliateBase}/ranking`);
  }

  getMyTransactions(): Observable<AffiliateTransactionDTO[]> {
    return this.http.get<AffiliateTransactionDTO[]>(`${this.affiliateBase}/transactions`);
  }

  getSuggestedZones(): Observable<SuggestedZoneDTO[]> {
    return this.http.get<SuggestedZoneDTO[]>(`${this.affiliateBase}/suggested-zones`);
  }

  // ─── Sale Offers ──────────────────────────────────────────────────────────

  submitOffer(req: CreateSaleOfferRequest): Observable<SaleOfferDTO> {
    return this.http.post<SaleOfferDTO>(this.offersBase, req);
  }

  getMyOffers(): Observable<SaleOfferDTO[]> {
    return this.http.get<SaleOfferDTO[]>(`${this.offersBase}/my-offers`);
  }

  cancelOffer(offerId: number): Observable<void> {
    return this.http.delete<void>(`${this.offersBase}/${offerId}/cancel`);
  }

  getIncomingOffers(): Observable<SaleOfferDTO[]> {
    return this.http.get<SaleOfferDTO[]>(`${this.offersBase}/incoming`);
  }

  respondToOffer(offerId: number, req: RespondSaleOfferRequest): Observable<SaleOfferDTO> {
    return this.http.put<SaleOfferDTO>(`${this.offersBase}/${offerId}/respond`, req);
  }

  completeOffer(offerId: number): Observable<SaleOfferDTO> {
    return this.http.put<SaleOfferDTO>(`${this.offersBase}/${offerId}/complete`, {});
  }

  getAllOffers(): Observable<SaleOfferDTO[]> {
    return this.http.get<SaleOfferDTO[]>(`${this.offersBase}`);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  formatStatus(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'En attente',
      ACTIVE: 'Actif',
      REJECTED: 'Rejeté',
      SUSPENDED: 'Suspendu',
      ACCEPTED: 'Accepté',
      COMPLETED: 'Complété',
      CANCELLED: 'Annulé',
    };
    return map[status] ?? status;
  }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'status-pending',
      ACTIVE: 'status-active',
      REJECTED: 'status-rejected',
      SUSPENDED: 'status-suspended',
      ACCEPTED: 'status-accepted',
      COMPLETED: 'status-completed',
      CANCELLED: 'status-cancelled',
    };
    return map[status] ?? 'status-default';
  }

  formatCommission(amount: number): string {
    if (!amount && amount !== 0) return '—';
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} TND`;
  }
}
