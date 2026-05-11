import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostBinding,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexFill,
  ApexGrid,
  ApexLegend,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  NgApexchartsModule,
} from 'ng-apexcharts';
import {
  AdminDashboardService,
  DashboardPropertyItem,
  DashboardSnapshot,
  DashboardValidationItem,
  ExpiredRentalItem,
  RecentClient,
} from '../services/admin-dashboard.service';
import { MessageService, MessageDTO } from '../services/message.service';
import { AdminAuthService } from '../services/admin-auth';
import {
  BiService,
  BIKpiDTO,
  BITrendDTO,
  BITopCityDTO,
  BITypeBreakdownDTO,
  BIAgencyRankDTO,
  BIAffiliateRankDTO,
  BIInsightDTO,
} from '../services/bi.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule, NgApexchartsModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  @HostBinding('class.dark-theme') isDarkTheme = false;

  private destroy$ = new Subject<void>();

  // ── Activity data (snapshot needed only for recent lists) ─────────────
  snapshot: DashboardSnapshot | null = null;
  loading = true;
  errorMessage = '';

  recentClients: RecentClient[] = [];
  recentAffiliates: RecentClient[] = [];
  unreadMessages: MessageDTO[] = [];
  unreadCount = 0;
  expiredRentals: ExpiredRentalItem[] = [];
  validationItems: DashboardValidationItem[] = [];

  // ── Send-message modal ────────────────────────────────────────────────
  showSendMsgModal = false;
  sendMsgReceiverId: number | null = null;
  sendMsgReceiverName = '';
  sendMsgContent = '';
  sendMsgLoading = false;
  sendMsgError = '';

  // ── Business Intelligence state ───────────────────────────────────────
  biKpis: BIKpiDTO | null = null;
  biTrend: BITrendDTO | null = null;
  biCities: BITopCityDTO[] = [];
  biTypes: BITypeBreakdownDTO[] = [];
  biAgencies: BIAgencyRankDTO[] = [];
  biAffiliates: BIAffiliateRankDTO[] = [];
  biInsights: BIInsightDTO[] = [];
  biLoading = true;

  // ── BI chart options ──────────────────────────────────────────────────
  biSalesTrendChart: ChartOptions | null = null;
  biRevenueTrendChart: ChartOptions | null = null;
  biTopCitiesChart: ChartOptions | null = null;
  biTypesPieChart: ChartOptions | null = null;
  biCommissionsChart: ChartOptions | null = null;
  biClientsChart: ChartOptions | null = null;

  // ── Getters ───────────────────────────────────────────────────────────
  get currentUserId(): number | null {
    return this.authService.getCurrentUser()?.id ?? null;
  }

  get currentUserRole(): string {
    return (this.authService.getCurrentUser()?.role ?? '').toUpperCase();
  }

  get isBiRole(): boolean {
    const r = this.currentUserRole;
    return r === 'SUPER_ADMIN' || r === 'ADMIN';
  }

  get isSuperAdmin(): boolean {
    return this.currentUserRole === 'SUPER_ADMIN';
  }

  get maxAffCommission(): number {
    return Math.max(...this.biAffiliates.map(a => a.totalCommissions), 1);
  }

  constructor(
    private dashboardService: AdminDashboardService,
    private messageService: MessageService,
    private authService: AdminAuthService,
    private biService: BiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTheme();
    this.loadActivityData();
    this.loadBiData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data loading ──────────────────────────────────────────────────────

  private loadActivityData(): void {
    const role = this.currentUserRole;
    if (role === 'AFFILIATE' || role === 'CLIENT_PUBLIC') {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getDashboardSnapshot()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: snapshot => {
          this.snapshot = snapshot;
          this.loadRecentClients();
          this.loadSideData();
        },
        error: err => {
          console.error('Dashboard error:', err);
          this.errorMessage = 'Impossible de charger le tableau de bord.';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private loadRecentClients(): void {
    this.dashboardService.getRecentClients(6)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: clients => {
          this.recentClients = clients.filter(c => c.role !== 'AFFILIATE');
          this.recentAffiliates = clients.filter(c => c.role === 'AFFILIATE');
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.recentClients = [];
          this.recentAffiliates = [];
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private loadSideData(): void {
    this.messageService.getInbox()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: msgs => {
          this.unreadMessages = msgs.filter(m => !m.read).slice(0, 6);
          this.unreadCount = this.unreadMessages.length;
          this.cdr.markForCheck();
        },
        error: () => {},
      });

    this.dashboardService.getExpiredRentals()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: items => { this.expiredRentals = items; this.cdr.markForCheck(); },
        error: () => {},
      });

    this.dashboardService.getDashboardValidations(6)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: items => { this.validationItems = items; this.cdr.markForCheck(); },
        error: () => {},
      });
  }

  loadBiData(): void {
    if (!this.isBiRole) {
      this.biLoading = false;
      return;
    }

    this.biLoading = true;
    forkJoin({
      kpis:       this.biService.getKpis().pipe(catchError(() => of(null))),
      trend:      this.biService.getTrends().pipe(catchError(() => of(null))),
      cities:     this.biService.getTopCities().pipe(catchError(() => of([]))),
      types:      this.biService.getTypeBreakdown().pipe(catchError(() => of([]))),
      agencies:   this.biService.getAgencyRanking().pipe(catchError(() => of([]))),
      affiliates: this.biService.getAffiliateRanking().pipe(catchError(() => of([]))),
      insights:   this.biService.getInsights().pipe(catchError(() => of([]))),
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: res => {
        this.biKpis       = res.kpis;
        this.biTrend      = res.trend;
        this.biCities     = (res.cities     as BITopCityDTO[])      ?? [];
        this.biTypes      = (res.types      as BITypeBreakdownDTO[]) ?? [];
        this.biAgencies   = (res.agencies   as BIAgencyRankDTO[])   ?? [];
        this.biAffiliates = (res.affiliates as BIAffiliateRankDTO[]) ?? [];
        this.biInsights   = (res.insights   as BIInsightDTO[])      ?? [];
        this.biLoading    = false;
        if (res.trend) this.buildBiCharts(res.trend, this.biCities, this.biTypes);
        this.cdr.detectChanges();
      },
      error: () => {
        this.biLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── User actions ──────────────────────────────────────────────────────

  openSendMsg(receiverId: number, receiverName: string): void {
    this.sendMsgReceiverId = receiverId;
    this.sendMsgReceiverName = receiverName;
    this.sendMsgContent = '';
    this.sendMsgError = '';
    this.showSendMsgModal = true;
  }

  closeSendMsg(): void { this.showSendMsgModal = false; }

  submitSendMsg(): void {
    if (!this.sendMsgContent.trim() || !this.sendMsgReceiverId) return;
    this.sendMsgLoading = true;
    this.sendMsgError = '';
    this.messageService
      .sendMessage({ receiverId: this.sendMsgReceiverId, content: this.sendMsgContent.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.sendMsgLoading = false;
          this.showSendMsgModal = false;
          this.loadSideData();
          this.cdr.detectChanges();
        },
        error: err => {
          this.sendMsgLoading = false;
          this.sendMsgError = err?.error?.error ?? "Erreur lors de l'envoi.";
          this.cdr.detectChanges();
        },
      });
  }

  markMessageRead(id: number): void {
    this.messageService.markAsRead(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.unreadMessages = this.unreadMessages.map(m =>
            m.id === id ? { ...m, read: true } : m
          );
          this.unreadCount = this.unreadMessages.filter(m => !m.read).length;
          this.cdr.detectChanges();
        },
        error: () => {},
      });
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('adminTheme', this.isDarkTheme ? 'dark' : 'light');
  }

  // ── Formatters ────────────────────────────────────────────────────────

  formatCurrency(amount: number | null | undefined): string {
    if (amount == null) return '—';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'TND',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);
  }

  compactNum(value: number | null | undefined): string {
    if (value == null) return '—';
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)     return `${(value / 1_000).toFixed(1)}k`;
    return `${Math.round(value)}`;
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      }).format(d);
    } catch { return '—'; }
  }

  formatPropertyTitle(p: DashboardPropertyItem): string {
    return p.titre || 'Bien sans titre';
  }

  formatRoleName(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: 'Super Admin', ADMIN: 'Admin Agence',
      RESPONSABLE_COMMERCIAL: 'Resp. Commercial', COMMERCIAL: 'Commercial',
    };
    return map[(role ?? '').toUpperCase()] ?? role ?? '—';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      DISPONIBLE: 'Disponible', VENDU: 'Vendu', RESERVE: 'Réservé',
      EN_ATTENTE: 'En attente', LOUE: 'Loué', VALIDE: 'Validé',
    };
    return map[(status ?? '').toUpperCase()] ?? status ?? 'Inconnu';
  }

  getStatusPillClass(status: string): string {
    const map: Record<string, string> = {
      DISPONIBLE: 'pill pill-available', VENDU: 'pill pill-sold',
      RESERVE: 'pill pill-pending', EN_ATTENTE: 'pill pill-pending', LOUE: 'pill pill-rented',
    };
    return map[(status ?? '').toUpperCase()] ?? 'pill pill-unknown';
  }

  getValidationLabel(item: DashboardValidationItem): string {
    if (item.ownerType === 'AGENCY_OWNED')     return item.agencyAdminName ?? 'Agence';
    if (item.ownerType === 'SUPER_ADMIN_OWNED') return 'Super Admin';
    return item.createdByName ?? '—';
  }

  getValidationClass(item: DashboardValidationItem): string {
    if (item.ownerType === 'AGENCY_OWNED')     return 'badge-agency';
    if (item.ownerType === 'SUPER_ADMIN_OWNED') return 'pill-highlight';
    return 'pill-available';
  }

  getVisibilityLabel(v: string): string {
    return v === 'PRIVATE_CLIENT' ? 'Privé' : v === 'AGENCY_CLIENT' ? 'Agence' : 'Client';
  }

  getVisibilityBadgeClass(v: string): string {
    return v === 'PRIVATE_CLIENT' ? 'badge-private' : v === 'AGENCY_CLIENT' ? 'badge-agency' : 'pill-available';
  }

  // ── BI helpers ────────────────────────────────────────────────────────

  biTrendClass(t: number): string { return t > 0 ? 'trend-up' : t < 0 ? 'trend-down' : 'trend-flat'; }
  biTrendIcon(t: number):  string { return t > 0 ? 'fa-arrow-trend-up' : t < 0 ? 'fa-arrow-trend-down' : 'fa-minus'; }
  biInsightClass(type: string): string { return `insight-${type}`; }
  biInitials(name: string): string {
    return (name ?? '?').split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
  }
  biBarWidth(value: number, max: number): number {
    return !max ? 0 : Math.min(Math.round((value / max) * 100), 100);
  }
  biFormatType(type: string): string {
    const map: Record<string, string> = {
      MAISON: 'Maisons', APPARTEMENT: 'Appartements', VILLA: 'Villas',
      COMMERCIAL: 'Commerciaux', TERRAIN: 'Terrains', LOFT: 'Lofts',
    };
    return map[(type ?? '').toUpperCase()] ?? type ?? 'Autres';
  }
  biMedalClass(rank: number): string {
    return rank === 1 ? 'medal-gold' : rank === 2 ? 'medal-silver' : rank === 3 ? 'medal-bronze' : 'medal-num';
  }

  // ── TrackBy ───────────────────────────────────────────────────────────

  trackById(_: number, item: { id: number }): number   { return item.id; }
  trackByRank(_: number, item: { rank: number }): number { return item.rank; }
  trackByIdx(i: number): number { return i; }

  // ── Private ───────────────────────────────────────────────────────────

  private loadTheme(): void {
    this.isDarkTheme = localStorage.getItem('adminTheme') === 'dark';
  }

  private buildBiCharts(
    trend: BITrendDTO,
    cities: BITopCityDTO[],
    types: BITypeBreakdownDTO[],
  ): void {
    const months = trend.months ?? [];
    const grid = { strokeDashArray: 3, borderColor: '#f1f5f9' };

    this.biSalesTrendChart = {
      series: [
        { name: 'Ventes',    data: trend.salesCounts  ?? [] },
        { name: 'Locations', data: trend.rentalCounts ?? [] },
      ],
      chart: { type: 'area', height: 270, toolbar: { show: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.25, opacityTo: 0.02 } },
      colors: ['#3b82f6', '#8b5cf6'],
      grid,
      tooltip: { shared: true, intersect: false },
      legend: { position: 'top', fontSize: '12px' },
    };

    this.biRevenueTrendChart = {
      series: [{ name: 'Revenus TND', data: (trend.revenues ?? []).map(v => Math.round(v)) }],
      chart: { type: 'bar', height: 270, toolbar: { show: false } },
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 5 } },
      colors: ['#10b981'],
      xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v / 1000)}k` } },
      grid,
      tooltip: { y: { formatter: (v: number) => this.formatCurrency(v) } },
    };

    const top = cities.slice(0, 8);
    this.biTopCitiesChart = {
      series: [{ name: 'Ventes', data: top.map(c => c.soldCount) }],
      chart: { type: 'bar', height: 270, toolbar: { show: false } },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
      dataLabels: { enabled: false },
      xaxis: { categories: top.map(c => c.city) },
      colors: ['#f59e0b'],
      grid,
      tooltip: { y: { formatter: (v: number) => `${v} ventes` } },
    };

    this.biTypesPieChart = {
      series: types.map(t => t.totalCount),
      chart: { type: 'donut', height: 270 },
      labels: types.map(t => this.biFormatType(t.type)),
      colors: ['#3b82f6', '#8b5cf6', '#ef4444', '#10b981', '#f59e0b', '#06b6d4'],
      legend: { position: 'bottom', fontSize: '12px' },
      dataLabels: { enabled: false },
      plotOptions: { pie: { donut: { size: '65%' } } },
    };

    this.biCommissionsChart = {
      series: [{ name: 'Commissions TND', data: (trend.commissions ?? []).map(v => Math.round(v)) }],
      chart: { type: 'area', height: 270, toolbar: { show: false } },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v / 1000)}k` } },
      fill: { type: 'gradient', gradient: { opacityFrom: 0.2, opacityTo: 0.02 } },
      colors: ['#6d28d9'],
      grid,
      tooltip: { y: { formatter: (v: number) => this.formatCurrency(v) } },
    };

    this.biClientsChart = {
      series: [{ name: 'Nouveaux clients', data: trend.newClients ?? [] }],
      chart: { type: 'bar', height: 270, toolbar: { show: false } },
      dataLabels: { enabled: false },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 5 } },
      colors: ['#06b6d4'],
      xaxis: { categories: months, labels: { style: { fontSize: '11px' } } },
      yaxis: { labels: { formatter: (v: number) => `${Math.round(v)}` } },
      grid,
      tooltip: { y: { formatter: (v: number) => `${v} client${v > 1 ? 's' : ''}` } },
    };
  }
}

// ── Shared chart-options type ─────────────────────────────────────────────────
type ChartOptions = {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  fill?: ApexFill;
  labels?: string[];
  colors?: string[];
  legend?: ApexLegend;
  tooltip?: ApexTooltip;
  grid?: ApexGrid;
  plotOptions?: ApexPlotOptions;
};
