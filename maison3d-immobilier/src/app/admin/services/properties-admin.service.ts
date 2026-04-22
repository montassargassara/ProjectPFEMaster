// services/properties-admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
}

export interface UpdateStatusRequest {
  statut: string;
  propertyId?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PropertiesAdminService {
  constructor(private http: HttpClient) {}

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
}