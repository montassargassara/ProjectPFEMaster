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

  updatePropertyStatus(id: number, status: string): Observable<PropertyListItem> {
    const request: UpdateStatusRequest = { statut: status, propertyId: id };
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
}
