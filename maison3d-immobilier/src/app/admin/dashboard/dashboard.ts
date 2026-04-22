import { ChangeDetectorRef, Component, HostBinding, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  DashboardSnapshot,
  PropertyListItem,
} from '../services/admin-dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, NgApexchartsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  @HostBinding('class.dark-theme') isDarkTheme = false;

  snapshot: DashboardSnapshot | null = null;
  loading = true;
  errorMessage = '';

  salesChartOptions: ChartOptions | null = null;
  revenueChartOptions: ChartOptions | null = null;
  typesChartOptions: ChartOptions | null = null;
  statusChartOptions: ChartOptions | null = null;

  constructor(private dashboardService: AdminDashboardService,
    private cdr: ChangeDetectorRef 
  ) {}

  ngOnInit(): void {
    this.loadTheme();
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Force la détection de changement après l'affichage
    setTimeout(() => {
      if (!this.snapshot && !this.loading) {
        console.log('🔄 Rechargement forcé après view init');
        this.loadDashboardData();
      }
      this.cdr.detectChanges();
    }, 0);
  }

  loadDashboardData(): void {
    console.log('📊 Chargement dashboard - début');
    this.loading = true;
    this.errorMessage = '';

    this.dashboardService.getDashboardSnapshot().subscribe({
      next: snapshot => {
        console.log('✅ Données reçues:', snapshot);
        this.snapshot = snapshot;
        this.buildCharts(snapshot);
        this.loading = false;
        this.cdr.detectChanges(); // ← Force l'update de l'UI
      },
      error: error => {
        console.error('Dashboard error:', error);
        this.errorMessage = 'Impossible de charger le tableau de bord.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }


  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    localStorage.setItem('adminTheme', this.isDarkTheme ? 'dark' : 'light');
  }

  getStatValue(value: number | null | undefined): string {
    if (value === null || value === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatCurrency(amount: number | null | undefined): string {
    if (amount === null || amount === undefined) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'TND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  getStatusLabel(status: string): string {
    switch (status.toUpperCase()) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'VENDU':
        return 'Vendu';
      case 'RESERVE':
        return 'Reserve';
      case 'LOUE':
        return 'Loue';
      case 'EN_ATTENTE':
        return 'En attente';
      case 'VALIDÉ':
      case 'VALIDE':
        return 'Valide';
      default:
        return status || 'Inconnu';
    }
  }

  getStatusPillClass(status: string): string {
    switch (status.toUpperCase()) {
      case 'DISPONIBLE':
        return 'pill pill-available';
      case 'VENDU':
        return 'pill pill-sold';
      case 'RESERVE':
      case 'EN_ATTENTE':
        return 'pill pill-pending';
      case 'LOUE':
        return 'pill pill-rented';
      default:
        return 'pill pill-unknown';
    }
  }

  formatPropertyTitle(property: PropertyListItem): string {
    return property.titre || 'Bien sans titre';
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  trackById(_: number, item: PropertyListItem): number {
    return item.id;
  }

  private loadTheme(): void {
    const saved = localStorage.getItem('adminTheme');
    this.isDarkTheme = saved === 'dark';
  }

  private buildCharts(snapshot: DashboardSnapshot): void {
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];

    this.salesChartOptions = {
      series: [
        {
          name: 'Ventes',
          data: snapshot.monthlySales,
        },
        {
          name: 'Locations',
          data: snapshot.monthlyRentals,
        },
      ],
      chart: {
        type: 'area',
        height: 280,
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      xaxis: { categories: monthLabels },
      yaxis: { labels: { formatter: (value: number) => `${Math.round(value)}` } },
      fill: {
        type: 'gradient',
        gradient: { opacityFrom: 0.35, opacityTo: 0.05 },
      },
      colors: ['#2ecc71', '#3498db'],
      grid: { strokeDashArray: 4 },
      tooltip: { shared: true },
      legend: { position: 'top' },
    };

    this.revenueChartOptions = {
      series: [
        {
          name: 'Revenu',
          data: snapshot.monthlyRevenue.map(value => Math.round(value)),
        },
      ],
      chart: {
        type: 'bar',
        height: 280,
        toolbar: { show: false },
      },
      dataLabels: { enabled: false },
      plotOptions: {
        bar: { columnWidth: '45%', borderRadius: 6 },
      },
      colors: ['#f39c12'],
      xaxis: { categories: monthLabels },
      yaxis: {
        labels: { formatter: (value: number) => `${Math.round(value / 1000)}k` },
      },
      grid: { strokeDashArray: 4 },
      tooltip: { y: { formatter: (value: number) => this.formatCurrency(value) } },
    };

    this.typesChartOptions = {
      series: snapshot.propertyTypes.map(item => item.count),
      chart: {
        type: 'donut',
        height: 280,
      },
      labels: snapshot.propertyTypes.map(item => this.getTypeLabel(item.type)),
      colors: ['#3498db', '#9b59b6', '#e74c3c', '#2ecc71', '#f39c12', '#1abc9c'],
      legend: { position: 'bottom' },
      dataLabels: { enabled: false },
    };

    this.statusChartOptions = {
      series: [
        {
          name: 'Transactions',
          data: snapshot.statusCounts.map(item => item.count),
        },
      ],
      chart: {
        type: 'bar',
        height: 280,
        toolbar: { show: false },
      },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 6 },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: snapshot.statusCounts.map(item => this.getStatusLabel(item.status)),
      },
      colors: ['#6c5ce7'],
      grid: { strokeDashArray: 4 },
    };
  }

  private getTypeLabel(type: string): string {
    switch (type.toUpperCase()) {
      case 'MAISON':
        return 'Maisons';
      case 'APPARTEMENT':
        return 'Appartements';
      case 'VILLA':
        return 'Villas';
      case 'COMMERCIAL':
        return 'Commerciaux';
      case 'TERRAIN':
        return 'Terrains';
      case 'LOFT':
        return 'Lofts';
      default:
        return type || 'Autres';
    }
  }
}

// Remplacez la définition de ChartOptions par celle-ci :
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