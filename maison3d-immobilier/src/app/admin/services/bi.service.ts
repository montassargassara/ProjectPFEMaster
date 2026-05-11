import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiBaseUrl } from '../../services/api-config';

export interface BIKpiDTO {
  totalProperties: number;
  disponibleCount: number;
  venduCount: number;
  loueCount: number;
  agencyCount: number;
  affiliateCount: number;
  clientCount: number;
  totalRevenue: number;
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  totalCommissions: number;
  currentMonthCommissions: number;
  conversionRate: number;
  revenueTrend: number;
  salesTrend: number;
  commissionsTrend: number;
  currentMonthSales: number;
  previousMonthSales: number;
  stagnantProperties: number;
}

export interface BITrendDTO {
  months: string[];
  salesCounts: number[];
  rentalCounts: number[];
  revenues: number[];
  commissions: number[];
  newClients: number[];
}

export interface BITopCityDTO {
  city: string;
  country: string;
  soldCount: number;
  activeCount: number;
  totalRevenue: number;
}

export interface BITypeBreakdownDTO {
  type: string;
  totalCount: number;
  soldCount: number;
  activeCount: number;
  percentage: number;
}

export interface BIAgencyRankDTO {
  id: number;
  agencyName: string;
  email: string;
  propertiesSold: number;
  propertiesActive: number;
  revenue: number;
  commissions: number;
  rank: number;
}

export interface BIAffiliateRankDTO {
  id: number;
  name: string;
  email: string;
  salesCompleted: number;
  totalCommissions: number;
  rank: number;
}

export interface BIInsightDTO {
  type: 'success' | 'warning' | 'danger' | 'info';
  icon: string;
  title: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class BiService {
  private readonly base = `${apiBaseUrl}/api/bi`;

  constructor(private http: HttpClient) {}

  getKpis(): Observable<BIKpiDTO> {
    return this.http.get<BIKpiDTO>(`${this.base}/kpis`);
  }

  getTrends(): Observable<BITrendDTO> {
    return this.http.get<BITrendDTO>(`${this.base}/trends`);
  }

  getTopCities(limit = 8): Observable<BITopCityDTO[]> {
    return this.http.get<BITopCityDTO[]>(`${this.base}/top-cities`,
      { params: new HttpParams().set('limit', limit) });
  }

  getTypeBreakdown(): Observable<BITypeBreakdownDTO[]> {
    return this.http.get<BITypeBreakdownDTO[]>(`${this.base}/type-breakdown`);
  }

  getAgencyRanking(limit = 10): Observable<BIAgencyRankDTO[]> {
    return this.http.get<BIAgencyRankDTO[]>(`${this.base}/agency-ranking`,
      { params: new HttpParams().set('limit', limit) });
  }

  getAffiliateRanking(limit = 10): Observable<BIAffiliateRankDTO[]> {
    return this.http.get<BIAffiliateRankDTO[]>(`${this.base}/affiliate-ranking`,
      { params: new HttpParams().set('limit', limit) });
  }

  getInsights(): Observable<BIInsightDTO[]> {
    return this.http.get<BIInsightDTO[]>(`${this.base}/insights`);
  }
}
