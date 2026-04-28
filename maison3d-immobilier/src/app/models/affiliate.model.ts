// affiliate.model.ts — mirrors backend DTOs exactly

export type AffiliateStatus = 'PENDING' | 'ACTIVE' | 'REJECTED' | 'SUSPENDED';
export type SaleOfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
export type CommissionType = 'PERCENTAGE' | 'FIXED';

export interface AffiliateRegionDTO {
  id: number;
  affiliateId?: number;
  affiliateName?: string;
  regionName: string;
  country?: string;
  city?: string;
  regionDescription?: string;
  commissionPercentage: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AffiliateProfileDTO {
  id: number;
  userId: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  isActive?: boolean;
  status: AffiliateStatus;
  experienceLevel?: string;
  notes?: string;
  regions?: AffiliateRegionDTO[];
  bonusPercentage?: number;
  bonusExpiresAt?: string;
  hasBonusActive: boolean;
  reviewedById?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AffiliateStatsDTO {
  affiliateId: number;
  affiliateName: string;
  regions?: AffiliateRegionDTO[];
  totalSales?: number;
  totalViews?: number;
  totalShares?: number;
  totalContacts?: number;
  totalVisits?: number;
  totalRevenue: number;
  pendingCommission?: number;
  paidCommission?: number;
  totalOffersPending: number;
  totalOffersAccepted: number;
  totalOffersRejected: number;
  conversionRate?: number;
  currentBonusPercentage?: number;
  bonusExpiresAt?: string;
  rank?: number;
  lastActivity?: string;
}

export interface CreateAffiliateRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  experienceLevel?: string;
  notes?: string;
  selectedRegions: RegionSelection[];
}

export interface RegionSelection {
  regionName: string;
  country?: string;
  city?: string;
  regionDescription?: string;
  commissionPercentage: number;
}

export interface AffiliateApprovalRequest {
  reason?: string;
}

export interface AffiliatePropertyDTO {
  id: number;
  titre: string;
  type: string;
  statut: string;
  prixVente?: number;
  prixLocation?: number;
  surface?: number;
  nbChambres?: number;
  adresse?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  commissionPercentage?: number;
  commissionType?: string;
  commissionAmount?: number;
  hasMainImage?: boolean;
  mainImageUrl?: string;
  description?: string;
  isAffiliateEligible?: boolean;
  reservedByAffiliate?: boolean;
}

export interface SuggestedZoneDTO {
  zoneName: string;
  country?: string;
  propertyCount: number;
  averageCommission: number;
  averagePrice: number;
  demandScore: number;
  opportunityScore?: number;
}

export interface CreateSaleOfferRequest {
  propertyId: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  offeredPrice: number;
  message?: string;
}

export interface RespondSaleOfferRequest {
  response: 'ACCEPTED' | 'REJECTED';
  rejectionReason?: string;
}

export interface SaleOfferDTO {
  id: number;
  status: SaleOfferStatus;

  affiliateId: number;
  affiliateName: string;
  affiliateEmail: string;

  propertyId: number;
  propertyTitle: string;
  propertyType?: string;
  propertyStatut?: string;
  propertyPrice?: number;
  propertyCity?: string;
  propertyRegion?: string;
  propertyMainImageUrl?: string;

  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  offeredPrice: number;
  message?: string;

  commissionPercentage?: number;
  commissionAmount?: number;

  rejectionReason?: string;
  respondedByName?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface AffiliateTransactionDTO {
  id: number;
  affiliateId: number;
  affiliateName: string;
  propertyId: number;
  propertyTitle: string;
  propertyPrice: number;
  commissionPercentage: number;
  commissionAmount: number;
  transactionType?: string;
  clientEmail?: string;
  isPaid: boolean;
  paymentDate?: string;
  transactionDate: string;
}

export interface MonthlyBonusDTO {
  id: number;
  affiliateId: number;
  affiliateName: string;
  rankingMonth: number;
  rankingYear: number;
  rank: number;
  bonusPercentage: number;
  bonusMonth: number;
  bonusYear: number;
  isApplied: boolean;
}
