export interface PublicPropertyCard {
  id: number;
  titre: string;
  type: string;
  category: 'VENTE' | 'LOCATION' | string | null;
  prixVente?: number | null;
  prixLocation?: number | null;
  surface?: number | null;
  nbChambres?: number | null;
  nbSallesDeBain?: number | null;
  garage?: boolean | null;
  piscine?: boolean | null;
  jardin?: boolean | null;
  meuble?: boolean | null;
  etage?: number | null;
  parkingSpaces?: number | null;
  climatisation?: boolean | null;
  securite?: boolean | null;
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
  anneeConstruction?: number | null;
  prochePlage?: boolean | null;
  procheTransport?: boolean | null;
  imageUrls?: string[];
  model3dUrl?: string | null;
  model3dFormat?: string | null;
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
