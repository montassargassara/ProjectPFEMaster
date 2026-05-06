// services/properties-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../../services/api-config';

export interface PropertyListItem {
  id: number;
  titre: string;
  description: string;
  type: string;
  prixVente?: number;
  prixLocation?: number;
  statut: string;
  surface?: number;
  nbChambres?: number;
  adresse: string;
  country?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  mainImageName?: string;
  mainImageType?: string;
  mainImageSize?: number;
  mainImageUrl?: string;
  hasMainImage: boolean;
  model3dName?: string;
  model3dType?: string;
  model3dSize?: number;
  model3dUrl?: string;
  hasModel3d: boolean;
  // Ownership / multi-tenant fields
  ownerType?: string;          // 'SUPER_ADMIN_OWNED' | 'AGENCY_OWNED' | null (legacy)
  agencyAdminId?: number;
  agencyAdminName?: string;
  sharedWithAgencyIds?: number[];

  // Validation workflow
  validationStatus?: 'PENDING_RESPONSABLE' | 'PENDING_ADMIN' | 'APPROVED' | 'REJECTED' | null;
  ownerRole?: string;
  createdById?: number;
  createdByName?: string;
  commissionLocked?: boolean;
  priceLocked?: boolean;
  rejectionReason?: string;

  // Rental lock fields
  rentalDurationMonths?: number;
  rentalEndDate?: string;
  isFinalized?: boolean;
  isStatusLocked?: boolean;
  statusLockReason?: string;

  // Pending sale approval workflow
  pendingSaleApproval?: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  pendingSaleStatut?: string;
  pendingSaleRejectionReason?: string;
  pendingSaleRequestedById?: number;
  pendingSaleRequestedByName?: string;
  pendingSaleApproverRole?: 'ADMIN' | 'SUPER_ADMIN' | null; // who must approve next
}

export interface AgencyAdminItem {
  id: number;
  fullName: string;
  email: string;
  alreadyShared: boolean;
}

export interface UpdateStatusRequest {
  statut: string;
  propertyId?: number;
  rentalDurationMonths?: number;
}

export interface SharePropertyRequest {
  agencyAdminIds: number[];
}

@Injectable({
  providedIn: 'root'
})
export class PropertiesAdminService {
  constructor(private http: HttpClient) {}

  /** Returns only the properties the current user is allowed to see (filtered server-side). */
  getAllProperties(): Observable<PropertyListItem[]> {
    return this.http.get<PropertyListItem[]>(`${apiBaseUrl}/api/properties/list`);
  }

  /** Returns all VENDU (sold/finalized) properties visible to the current user. */
  getSoldProperties(): Observable<PropertyListItem[]> {
    return this.http.get<PropertyListItem[]>(`${apiBaseUrl}/api/properties/sold`);
  }

  /** Returns all LOUE (actively rented) properties visible to the current user. */
  getRentedProperties(): Observable<PropertyListItem[]> {
    return this.http.get<PropertyListItem[]>(`${apiBaseUrl}/api/properties/rented`);
  }

  updatePropertyStatus(id: number, status: string, rentalDurationMonths?: number): Observable<PropertyListItem> {
    const request: UpdateStatusRequest = { statut: status, propertyId: id, rentalDurationMonths };
    return this.http.patch<PropertyListItem>(`${apiBaseUrl}/api/properties/${id}/status`, request);
  }

  deleteProperty(id: number): Observable<void> {
    return this.http.delete<void>(`${apiBaseUrl}/api/properties/${id}`);
  }

  getPropertyCategory(id: number): Observable<{ category: string }> {
    return this.http.get<{ category: string }>(`${apiBaseUrl}/api/properties/${id}/category`);
  }

  getAllowedStatusesForCategory(category: string): Observable<string[]> {
    return this.http.get<string[]>(`${apiBaseUrl}/api/properties/categories/${category}/allowed-statuses`);
  }

  // ─── Sharing (Super Admin only) ───────────────────────────────────────────

  /** Returns all agency admins with their sharing status for a property. */
  getSharingInfo(propertyId: number): Observable<AgencyAdminItem[]> {
    return this.http.get<AgencyAdminItem[]>(`${apiBaseUrl}/api/properties/${propertyId}/sharing`);
  }

  /** Replaces the full shared-agency set for a property. */
  updateSharing(propertyId: number, agencyAdminIds: number[]): Observable<PropertyListItem> {
    const body: SharePropertyRequest = { agencyAdminIds };
    return this.http.put<PropertyListItem>(`${apiBaseUrl}/api/properties/${propertyId}/sharing`, body);
  }

  /** Revokes sharing for a single agency admin. */
  revokeSharing(propertyId: number, adminId: number): Observable<void> {
    return this.http.delete<void>(`${apiBaseUrl}/api/properties/${propertyId}/sharing/${adminId}`);
  }

  // ─── Pending sale approval (ADMIN / SUPER_ADMIN) ──────────────────────────

  approvePendingSale(propertyId: number): Observable<PropertyListItem> {
    return this.http.put<PropertyListItem>(`${apiBaseUrl}/api/properties/${propertyId}/approve-sale`, {});
  }

  rejectPendingSale(propertyId: number, reason: string): Observable<PropertyListItem> {
    return this.http.put<PropertyListItem>(`${apiBaseUrl}/api/properties/${propertyId}/reject-sale`, { reason });
  }
}
