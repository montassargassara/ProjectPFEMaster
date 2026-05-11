import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexChart, ApexAxisChartSeries, ApexNonAxisChartSeries,
  ApexXAxis, ApexYAxis, ApexDataLabels, ApexTooltip,
  ApexLegend, ApexFill, ApexStroke, ApexPlotOptions, ApexGrid
} from 'ng-apexcharts';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  BiService,
  BIKpiDTO, BITrendDTO, BITopCityDTO,
  BITypeBreakdownDTO, BIAgencyRankDTO, BIAffiliateRankDTO, BIInsightDTO
} from '../services/bi.service';

@Component({
  selector: 'app-bi-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  template: `
    <div class="bi-shell">
      <!-- ── Header ─────────────────────────────────────────── -->
      <div class="bi-header">
        <div class="bi-header-left">
          <div class="bi-header-icon"><i class="fas fa-chart-line"></i></div>
          <div>
            <h1 class="bi-title">Business Intelligence</h1>
            <p class="bi-sub">Tableau de bord analytique · Maison3D Immobilier</p>
          </div>
        </div>
        <div class="bi-header-right">
          <button class="btn-refresh" (click)="loadAll()" [disabled]="loading">
            <i class="fas fa-rotate-right" [class.spin]="loading"></i>
            Actualiser
          </button>
        </div>
      </div>

      <!-- ── Loading skeleton ───────────────────────────────── -->
      <div class="skeleton-grid" *ngIf="loading">
        <div class="skeleton-card" *ngFor="let i of [1,2,3,4,5,6,7,8]"></div>
      </div>

      <ng-container *ngIf="!loading">

        <!-- ── KPI Cards ──────────────────────────────────────── -->
        <div class="kpi-grid">
          <div class="kpi-card" *ngFor="let kpi of kpiCards">
            <div class="kpi-icon" [style.background]="kpi.gradient">
              <i [class]="kpi.icon"></i>
            </div>
            <div class="kpi-body">
              <div class="kpi-value">{{ kpi.value }}</div>
              <div class="kpi-label">{{ kpi.label }}</div>
              <div class="kpi-trend" *ngIf="kpi.trend !== undefined && kpi.trend !== 0"
                   [class.up]="kpi.trend > 0" [class.down]="kpi.trend < 0">
                <i [class]="kpi.trend > 0 ? 'fas fa-arrow-up' : 'fas fa-arrow-down'"></i>
                {{ abs(kpi.trend) | number:'1.1-1' }}% vs mois préc.
              </div>
              <div class="kpi-trend neutral" *ngIf="kpi.trend === 0 || kpi.trend === undefined">
                <i class="fas fa-minus"></i> Stable
              </div>
            </div>
          </div>
        </div>

        <!-- ── Row 1: Sales Trend + Revenue Trend ───────────── -->
        <div class="chart-row">
          <div class="chart-card chart-wide">
            <div class="chart-header">
              <div>
                <h3>Évolution des transactions</h3>
                <p>Ventes et locations sur 12 mois</p>
              </div>
              <span class="chart-badge">12 derniers mois</span>
            </div>
            <apx-chart
              *ngIf="trend"
              [series]="salesSeries"
              [chart]="salesChartOpts"
              [xaxis]="salesXAxis"
              [yaxis]="salesYAxis"
              [stroke]="{ curve: 'smooth', width: [3, 2] }"
              [fill]="salesFill"
              [colors]="['#0b6bcb', '#10b981']"
              [legend]="{ position: 'top', horizontalAlign: 'right' }"
              [grid]="chartGrid"
              [tooltip]="{ theme: 'light', shared: true, intersect: false }"
              [dataLabels]="{ enabled: false }">
            </apx-chart>
          </div>

          <div class="chart-card chart-narrow">
            <div class="chart-header">
              <div>
                <h3>Chiffre d'affaires</h3>
                <p>Revenus mensuels en TND</p>
              </div>
            </div>
            <apx-chart
              *ngIf="trend"
              [series]="revenueSeries"
              [chart]="revenueChartOpts"
              [xaxis]="salesXAxis"
              [yaxis]="revenueYAxis"
              [plotOptions]="revenueBarOpts"
              [colors]="['#6366f1']"
              [fill]="{ type: 'gradient', gradient: { shade: 'light', type: 'vertical', gradientToColors: ['#a5b4fc'], opacityFrom: 1, opacityTo: 0.7 } }"
              [grid]="chartGrid"
              [tooltip]="{ theme: 'light', y: { formatter: formatTND } }"
              [dataLabels]="{ enabled: false }">
            </apx-chart>
          </div>
        </div>

        <!-- ── Row 2: Top Cities + Type Breakdown ────────────── -->
        <div class="chart-row">
          <div class="chart-card chart-wide">
            <div class="chart-header">
              <div>
                <h3>Top villes par ventes</h3>
                <p>Classement des zones les plus actives</p>
              </div>
            </div>
            <apx-chart
              *ngIf="cities.length"
              [series]="citySeries"
              [chart]="cityChartOpts"
              [xaxis]="cityXAxis"
              [yaxis]="cityYAxis"
              [plotOptions]="cityBarOpts"
              [colors]="cityColors"
              [grid]="chartGrid"
              [tooltip]="{ theme: 'light' }"
              [dataLabels]="{ enabled: false }">
            </apx-chart>
            <div class="empty-chart" *ngIf="!cities.length">
              <i class="fas fa-map-location-dot"></i>
              <span>Pas encore de données de vente par ville</span>
            </div>
          </div>

          <div class="chart-card chart-narrow">
            <div class="chart-header">
              <div>
                <h3>Répartition par type</h3>
                <p>Distribution du portefeuille</p>
              </div>
            </div>
            <apx-chart
              *ngIf="types.length"
              [series]="typeSeries"
              [chart]="typeChartOpts"
              [labels]="typeLabels"
              [colors]="typeColors"
              [legend]="{ position: 'bottom' }"
              [plotOptions]="typeDonutOpts"
              [dataLabels]="{ enabled: true, formatter: formatPct }"
              [tooltip]="{ theme: 'light' }">
            </apx-chart>
            <div class="empty-chart" *ngIf="!types.length">
              <i class="fas fa-chart-pie"></i>
              <span>Aucun bien enregistré</span>
            </div>
          </div>
        </div>

        <!-- ── Row 3: Commission Trend + New Clients ─────────── -->
        <div class="chart-row">
          <div class="chart-card chart-wide">
            <div class="chart-header">
              <div>
                <h3>Commissions affiliés</h3>
                <p>Montant mensuel des commissions en TND</p>
              </div>
            </div>
            <apx-chart
              *ngIf="trend"
              [series]="commSeries"
              [chart]="commChartOpts"
              [xaxis]="salesXAxis"
              [yaxis]="commYAxis"
              [stroke]="{ curve: 'smooth', width: 3 }"
              [fill]="commFill"
              [colors]="['#f59e0b']"
              [grid]="chartGrid"
              [tooltip]="{ theme: 'light', y: { formatter: formatTND } }"
              [dataLabels]="{ enabled: false }">
            </apx-chart>
          </div>

          <div class="chart-card chart-narrow">
            <div class="chart-header">
              <div>
                <h3>Nouveaux clients</h3>
                <p>Inscriptions publiques par mois</p>
              </div>
            </div>
            <apx-chart
              *ngIf="trend"
              [series]="clientSeries"
              [chart]="clientChartOpts"
              [xaxis]="salesXAxis"
              [yaxis]="clientYAxis"
              [plotOptions]="clientBarOpts"
              [colors]="['#10b981']"
              [grid]="chartGrid"
              [tooltip]="{ theme: 'light' }"
              [dataLabels]="{ enabled: false }">
            </apx-chart>
          </div>
        </div>

        <!-- ── Row 4: Agency Ranking + Affiliate Ranking ──────── -->
        <div class="chart-row">
          <div class="chart-card chart-wide">
            <div class="chart-header">
              <div>
                <h3>Classement des agences</h3>
                <p>Performance par nombre de biens vendus</p>
              </div>
            </div>
            <div class="ranking-table" *ngIf="agencies.length; else noAgencies">
              <table>
                <thead>
                  <tr>
                    <th>Rang</th>
                    <th>Agence</th>
                    <th>Ventes</th>
                    <th>Actifs</th>
                    <th>Chiffre d'affaires</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let a of agencies">
                    <td>
                      <span class="medal" *ngIf="a.rank === 1">🥇</span>
                      <span class="medal" *ngIf="a.rank === 2">🥈</span>
                      <span class="medal" *ngIf="a.rank === 3">🥉</span>
                      <span class="rank-num" *ngIf="a.rank > 3">#{{ a.rank }}</span>
                    </td>
                    <td>
                      <div class="agency-cell">
                        <div class="avatar">{{ initials(a.agencyName) }}</div>
                        <div>
                          <strong>{{ a.agencyName }}</strong>
                          <small>{{ a.email }}</small>
                        </div>
                      </div>
                    </td>
                    <td><span class="badge-count sold">{{ a.propertiesSold }}</span></td>
                    <td><span class="badge-count active">{{ a.propertiesActive }}</span></td>
                    <td class="revenue-cell">{{ formatNum(a.revenue) }} TND</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ng-template #noAgencies>
              <div class="empty-chart">
                <i class="fas fa-building-columns"></i>
                <span>Aucune vente d'agence enregistrée</span>
              </div>
            </ng-template>
          </div>

          <div class="chart-card chart-narrow">
            <div class="chart-header">
              <div>
                <h3>Top affiliés</h3>
                <p>Commissions cumulées (12 mois)</p>
              </div>
            </div>
            <div class="affiliate-list" *ngIf="affiliates.length; else noAffiliates">
              <div class="aff-row" *ngFor="let a of affiliates">
                <span class="medal" *ngIf="a.rank === 1">🥇</span>
                <span class="medal" *ngIf="a.rank === 2">🥈</span>
                <span class="medal" *ngIf="a.rank === 3">🥉</span>
                <span class="rank-num" *ngIf="a.rank > 3">#{{ a.rank }}</span>
                <div class="aff-avatar">{{ initials(a.name) }}</div>
                <div class="aff-info">
                  <strong>{{ a.name }}</strong>
                  <div class="aff-bar-wrap">
                    <div class="aff-bar"
                         [style.width]="barWidth(a.totalCommissions, maxAffComm) + '%'"></div>
                  </div>
                </div>
                <div class="aff-comm">{{ formatNum(a.totalCommissions) }} TND</div>
              </div>
            </div>
            <ng-template #noAffiliates>
              <div class="empty-chart">
                <i class="fas fa-handshake"></i>
                <span>Pas encore de transactions affiliés</span>
              </div>
            </ng-template>
          </div>
        </div>

        <!-- ── Smart Insights ─────────────────────────────────── -->
        <div class="insights-section" *ngIf="insights.length">
          <div class="chart-header" style="margin-bottom: 16px">
            <div>
              <h3>Insights intelligents</h3>
              <p>Alertes et recommandations générées automatiquement</p>
            </div>
            <span class="chart-badge">IA</span>
          </div>
          <div class="insights-grid">
            <div class="insight-card" *ngFor="let ins of insights" [class]="ins.type">
              <div class="ins-icon"><i [class]="ins.icon"></i></div>
              <div class="ins-body">
                <strong>{{ ins.title }}</strong>
                <p>{{ ins.message }}</p>
              </div>
            </div>
          </div>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .bi-shell { padding: 28px 32px; min-height: 100vh; background: #f8fafc; }

    /* ── Header ────────────────────────────────────────────── */
    .bi-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 28px; flex-wrap: wrap; gap: 12px;
    }
    .bi-header-left { display: flex; align-items: center; gap: 16px; }
    .bi-header-icon {
      width: 52px; height: 52px; border-radius: 14px;
      background: linear-gradient(135deg, #0b6bcb, #084c91);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 22px;
    }
    .bi-title  { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
    .bi-sub    { font-size: 13px; color: #64748b; margin: 2px 0 0; }
    .btn-refresh {
      display: flex; align-items: center; gap: 8px;
      padding: 9px 18px; border-radius: 10px;
      border: 1px solid #e2e8f0; background: #fff;
      color: #334155; font-weight: 600; font-size: 13px;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-refresh:hover:not(:disabled) { border-color: #0b6bcb; color: #0b6bcb; }
    .btn-refresh:disabled { opacity: 0.6; cursor: default; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 0.8s linear infinite; }

    /* ── Skeleton ───────────────────────────────────────────── */
    .skeleton-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px;
      margin-bottom: 24px;
    }
    .skeleton-card {
      height: 120px; border-radius: 16px;
      background: linear-gradient(90deg, #eef2f7 25%, #f8fafc 50%, #eef2f7 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s linear infinite;
    }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ── KPI Grid ───────────────────────────────────────────── */
    .kpi-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-bottom: 24px;
    }
    .kpi-card {
      display: flex; align-items: flex-start; gap: 14px;
      background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
      padding: 18px; box-shadow: 0 2px 8px rgba(0,0,0,.04);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 8px 20px -8px rgba(15,23,42,.12); }
    .kpi-icon {
      width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-size: 18px;
    }
    .kpi-body { flex: 1; min-width: 0; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #0f172a; line-height: 1.2; }
    .kpi-label { font-size: 12px; color: #64748b; font-weight: 500; margin: 2px 0 6px; }
    .kpi-trend {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; font-weight: 600; padding: 2px 7px; border-radius: 999px;
    }
    .kpi-trend.up      { background: #dcfce7; color: #166534; }
    .kpi-trend.down    { background: #fee2e2; color: #991b1b; }
    .kpi-trend.neutral { background: #f1f5f9; color: #64748b; }

    /* ── Chart rows ─────────────────────────────────────────── */
    .chart-row { display: grid; grid-template-columns: 1fr 420px; gap: 20px; margin-bottom: 20px; }
    .chart-card {
      background: #fff; border-radius: 16px; border: 1px solid #e2e8f0;
      padding: 22px; box-shadow: 0 2px 8px rgba(0,0,0,.04);
    }
    .chart-header {
      display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px;
    }
    .chart-header h3 { font-size: 16px; font-weight: 700; color: #0f172a; margin: 0 0 2px; }
    .chart-header p  { font-size: 12px; color: #64748b; margin: 0; }
    .chart-badge {
      background: #ede9fe; color: #6d28d9; font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 999px; white-space: nowrap;
    }
    .empty-chart {
      height: 200px; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #94a3b8; gap: 10px; font-size: 13px;
      i { font-size: 32px; }
    }

    /* ── Ranking Table ──────────────────────────────────────── */
    .ranking-table { overflow-x: auto; }
    .ranking-table table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .ranking-table thead th {
      padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .05em; color: #64748b;
      border-bottom: 1px solid #e2e8f0;
    }
    .ranking-table tbody tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
    .ranking-table tbody tr:hover { background: #f8fafc; }
    .ranking-table td { padding: 12px 12px; color: #334155; }
    .medal { font-size: 20px; }
    .rank-num { font-size: 13px; font-weight: 700; color: #94a3b8; }
    .agency-cell { display: flex; align-items: center; gap: 10px; }
    .avatar {
      width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
      background: linear-gradient(135deg, #0b6bcb, #084c91);
      color: #fff; font-size: 12px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .agency-cell strong { display: block; color: #0f172a; font-size: 13px; }
    .agency-cell small  { color: #94a3b8; font-size: 11px; }
    .badge-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 28px; padding: 2px 8px; border-radius: 999px;
      font-size: 12px; font-weight: 700;
    }
    .badge-count.sold   { background: #dbeafe; color: #1d4ed8; }
    .badge-count.active { background: #dcfce7; color: #15803d; }
    .revenue-cell { font-weight: 700; color: #0b6bcb; }

    /* ── Affiliate list ─────────────────────────────────────── */
    .affiliate-list { display: flex; flex-direction: column; gap: 14px; }
    .aff-row { display: flex; align-items: center; gap: 10px; }
    .aff-avatar {
      width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: #fff; font-size: 11px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
    }
    .aff-info { flex: 1; min-width: 0; }
    .aff-info strong { display: block; font-size: 13px; color: #0f172a; }
    .aff-bar-wrap { height: 5px; background: #f1f5f9; border-radius: 999px; margin-top: 4px; }
    .aff-bar { height: 100%; background: linear-gradient(90deg, #f59e0b, #fbbf24); border-radius: 999px; transition: width 0.6s ease; }
    .aff-comm { font-size: 12px; font-weight: 700; color: #0b6bcb; white-space: nowrap; }

    /* ── Insights ───────────────────────────────────────────── */
    .insights-section { margin-bottom: 32px; }
    .insights-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .insight-card {
      display: flex; gap: 14px; align-items: flex-start;
      padding: 18px; border-radius: 14px; border-left: 4px solid;
    }
    .insight-card.success { background: #f0fdf4; border-color: #22c55e; }
    .insight-card.warning { background: #fffbeb; border-color: #f59e0b; }
    .insight-card.danger  { background: #fef2f2; border-color: #ef4444; }
    .insight-card.info    { background: #eff6ff; border-color: #3b82f6; }
    .ins-icon {
      width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center; font-size: 15px;
    }
    .insight-card.success .ins-icon { background: #dcfce7; color: #166534; }
    .insight-card.warning .ins-icon { background: #fef9c3; color: #854d0e; }
    .insight-card.danger  .ins-icon { background: #fee2e2; color: #991b1b; }
    .insight-card.info    .ins-icon { background: #dbeafe; color: #1d4ed8; }
    .ins-body strong { font-size: 13px; color: #0f172a; font-weight: 700; display: block; margin-bottom: 4px; }
    .ins-body p { font-size: 12px; color: #475569; margin: 0; line-height: 1.5; }

    /* ── Responsive ─────────────────────────────────────────── */
    @media (max-width: 1200px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .chart-row { grid-template-columns: 1fr; }
      .insights-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 640px) {
      .bi-shell { padding: 16px; }
      .kpi-grid { grid-template-columns: 1fr; }
      .insights-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class BIDashboardComponent implements OnInit {
  private bi = inject(BiService);

  loading = true;

  kpis: BIKpiDTO | null = null;
  trend: BITrendDTO | null = null;
  cities: BITopCityDTO[] = [];
  types: BITypeBreakdownDTO[] = [];
  agencies: BIAgencyRankDTO[] = [];
  affiliates: BIAffiliateRankDTO[] = [];
  insights: BIInsightDTO[] = [];

  // ── KPI card definitions ───────────────────────────────────
  kpiCards: Array<{ icon: string; label: string; value: string; gradient: string; trend?: number }> = [];

  // ── Chart configs ─────────────────────────────────────────
  salesSeries: ApexAxisChartSeries = [];
  salesChartOpts: ApexChart = {
    type: 'area', height: 260, toolbar: { show: false },
    animations: { enabled: true, speed: 600, dynamicAnimation: { enabled: true, speed: 400 } }
  };
  salesXAxis: ApexXAxis = { categories: [], labels: { style: { fontSize: '11px', colors: '#94a3b8' } }, axisBorder: { show: false }, axisTicks: { show: false } };
  salesYAxis: ApexYAxis = { labels: { style: { fontSize: '11px', colors: '#94a3b8' } } };
  salesFill: ApexFill = { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } };
  chartGrid: ApexGrid = { borderColor: '#f1f5f9', strokeDashArray: 4 };

  revenueSeries: ApexAxisChartSeries = [];
  revenueChartOpts: ApexChart = { type: 'bar', height: 260, toolbar: { show: false } };
  revenueYAxis: ApexYAxis = { labels: { style: { fontSize: '11px', colors: '#94a3b8' }, formatter: (v: number) => this.compactNum(v) } };
  revenueBarOpts: ApexPlotOptions = { bar: { borderRadius: 6, columnWidth: '60%' } };

  citySeries: ApexAxisChartSeries = [];
  cityChartOpts: ApexChart = { type: 'bar', height: 260, toolbar: { show: false } };
  cityXAxis: ApexXAxis = { type: 'category', labels: { style: { fontSize: '11px', colors: '#94a3b8' } }, axisBorder: { show: false } };
  cityYAxis: ApexYAxis = { labels: { style: { fontSize: '11px', colors: '#94a3b8' } } };
  cityBarOpts: ApexPlotOptions = { bar: { horizontal: true, borderRadius: 5, barHeight: '55%' } };
  cityColors: string[] = ['#0b6bcb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe', '#eff6ff', '#f8fafc'];

  typeSeries: ApexNonAxisChartSeries = [];
  typeLabels: string[] = [];
  typeColors: string[] = ['#0b6bcb', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#ec4899'];
  typeChartOpts: ApexChart = { type: 'donut', height: 260, toolbar: { show: false } };
  typeDonutOpts: ApexPlotOptions = { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', fontSize: '13px', fontWeight: '700' } } } } };

  commSeries: ApexAxisChartSeries = [];
  commChartOpts: ApexChart = { type: 'area', height: 260, toolbar: { show: false } };
  commYAxis: ApexYAxis = { labels: { style: { fontSize: '11px', colors: '#94a3b8' }, formatter: (v: number) => this.compactNum(v) } };
  commFill: ApexFill = { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] } };

  clientSeries: ApexAxisChartSeries = [];
  clientChartOpts: ApexChart = { type: 'bar', height: 260, toolbar: { show: false } };
  clientYAxis: ApexYAxis = { labels: { style: { fontSize: '11px', colors: '#94a3b8' } }, tickAmount: 4 };
  clientBarOpts: ApexPlotOptions = { bar: { borderRadius: 6, columnWidth: '55%' } };

  formatTND = (v: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(v))} TND`;
  formatPct = (v: number) => `${v}%`;

  ngOnInit(): void { this.loadAll(); }

  loadAll(): void {
    this.loading = true;
    forkJoin({
      kpis:       this.bi.getKpis().pipe(catchError(() => of(null))),
      trend:      this.bi.getTrends().pipe(catchError(() => of(null))),
      cities:     this.bi.getTopCities(8).pipe(catchError(() => of([]))),
      types:      this.bi.getTypeBreakdown().pipe(catchError(() => of([]))),
      agencies:   this.bi.getAgencyRanking(8).pipe(catchError(() => of([]))),
      affiliates: this.bi.getAffiliateRanking(8).pipe(catchError(() => of([]))),
      insights:   this.bi.getInsights().pipe(catchError(() => of([]))),
    }).subscribe(res => {
      this.kpis      = res.kpis;
      this.trend     = res.trend;
      this.cities    = res.cities as BITopCityDTO[];
      this.types     = res.types as BITypeBreakdownDTO[];
      this.agencies  = res.agencies as BIAgencyRankDTO[];
      this.affiliates = res.affiliates as BIAffiliateRankDTO[];
      this.insights  = res.insights as BIInsightDTO[];

      this.buildKpiCards();
      this.buildCharts();
      this.loading = false;
    });
  }

  // ── KPI cards ────────────────────────────────────────────────
  private buildKpiCards(): void {
    if (!this.kpis) return;
    const k = this.kpis;
    this.kpiCards = [
      { icon: 'fas fa-home',           label: 'Total biens',           value: k.totalProperties.toString(),        gradient: 'linear-gradient(135deg,#0b6bcb,#084c91)', trend: undefined },
      { icon: 'fas fa-tag',            label: 'Disponibles',           value: k.disponibleCount.toString(),        gradient: 'linear-gradient(135deg,#10b981,#059669)', trend: undefined },
      { icon: 'fas fa-handshake',      label: 'Vendus',                value: k.venduCount.toString(),             gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', trend: k.salesTrend },
      { icon: 'fas fa-key',            label: 'Loués',                 value: k.loueCount.toString(),              gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: undefined },
      { icon: 'fas fa-coins',          label: 'Revenus du mois',       value: this.formatNum(k.currentMonthRevenue) + ' TND', gradient: 'linear-gradient(135deg,#0b6bcb,#3b82f6)', trend: k.revenueTrend },
      { icon: 'fas fa-percent',        label: 'Commissions totales',   value: this.formatNum(k.totalCommissions) + ' TND',   gradient: 'linear-gradient(135deg,#f59e0b,#fbbf24)', trend: k.commissionsTrend },
      { icon: 'fas fa-building',       label: 'Agences partenaires',   value: k.agencyCount.toString(),            gradient: 'linear-gradient(135deg,#ec4899,#db2777)', trend: undefined },
      { icon: 'fas fa-chart-bar',      label: 'Taux de conversion',    value: k.conversionRate + '%',              gradient: 'linear-gradient(135deg,#10b981,#34d399)', trend: undefined },
    ];
  }

  // ── Chart data ───────────────────────────────────────────────
  private buildCharts(): void {
    if (this.trend) {
      this.salesXAxis = { ...this.salesXAxis, categories: this.trend.months };

      this.salesSeries = [
        { name: 'Ventes', data: this.trend.salesCounts as number[] },
        { name: 'Locations', data: this.trend.rentalCounts as number[] },
      ];
      this.revenueSeries = [{ name: 'Revenus (TND)', data: this.trend.revenues }];
      this.commSeries    = [{ name: 'Commissions (TND)', data: this.trend.commissions }];
      this.clientSeries  = [{ name: 'Nouveaux clients', data: this.trend.newClients as number[] }];
    }

    if (this.cities.length) {
      this.citySeries  = [{ name: 'Biens vendus', data: this.cities.map(c => c.soldCount) }];
      this.cityXAxis   = { ...this.cityXAxis, categories: this.cities.map(c => c.city || c.country) };
    }

    if (this.types.length) {
      this.typeSeries = this.types.map(t => t.totalCount);
      this.typeLabels = this.types.map(t => this.formatType(t.type));
    }
  }

  // ── Helpers ──────────────────────────────────────────────────
  get maxAffComm(): number {
    return Math.max(...this.affiliates.map(a => a.totalCommissions), 1);
  }

  abs = (n: number) => Math.abs(n);

  barWidth(value: number, max: number): number {
    return max > 0 ? Math.round((value / max) * 100) : 0;
  }

  initials(name: string): string {
    return (name || '??').split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase();
  }

  formatNum(n: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(n));
  }

  compactNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + 'k';
    return String(Math.round(n));
  }

  formatType(t: string): string {
    const map: Record<string, string> = {
      APPARTEMENT: 'Appartement', VILLA: 'Villa', MAISON: 'Maison',
      BUREAU: 'Bureau', COMMERCE: 'Commerce', TERRAIN: 'Terrain',
      FERME: 'Ferme', ENTREPOT: 'Entrepôt',
    };
    return map[t] || (t ? t.charAt(0) + t.slice(1).toLowerCase() : t);
  }
}
