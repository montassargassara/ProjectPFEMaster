export interface PublicPropertyCard {
  id: number;
  titre: string;
  type: string;
  category: 'VENTE' | 'LOCATION' | string | null;
  prixVente?: number | null;
  prixLocation?: number | null;
  surface?: number | null;
  nbChambres?: number | null;
  city?: string | null;
  country?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mainImageUrl?: string | null;
  hasModel3d?: boolean;
  agencyName?: string | null;
  createdAt?: string;
}

export interface PublicPropertyDetail extends PublicPropertyCard {
  description?: string | null;
  statut?: string | null;
  adresse?: string | null;
  imageUrls?: string[];
  model3dUrl?: string | null;
  hasVideo?: boolean;
  mainVideoUrl?: string | null;
  videoUrls?: string[];
  agencyAdminId?: number | null;
}

export interface PublicSearchFilters {
  q?: string;
  country?: string;
  city?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  maxSurface?: number;
  minRooms?: number;
}
