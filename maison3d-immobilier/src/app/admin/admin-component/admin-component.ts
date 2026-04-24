// admin/admin-component/admin-component.ts
import { Component, HostListener, OnDestroy, OnInit, Renderer2, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { UserService } from '../../services/user.service';
import { AdminDashboardService } from '../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-component',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-component.html',
  styleUrl: './admin-component.scss',
})
export class AdminComponent implements OnInit, OnDestroy {
  isSidebarCollapsed = false;
  isMobileMenuOpen = false;
  isMobileView = false;
  isDarkTheme = false;
  currentRoute = '';
  currentUser: any = null;
  customersCount = 0; // Renommé de usersCount
  propertiesCount = 0;
  agentsCount = 0;
  
  private subscriptions: Subscription[] = [];
  private readonly mobileBreakpoint = 992;
  private isBrowser: boolean;

  constructor(
    private router: Router,
    private authService: AdminAuthService,
    private userService: UserService,
    private dashboardService: AdminDashboardService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef,  // ✅ Ajoutez ceci
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.updateViewportState();
    this.restorePreferences();
    this.applyTheme();
    this.currentRoute = this.normalizeRoute(this.router.url);

    this.subscriptions.push(
      this.router.events.pipe(
        filter(event => event instanceof NavigationEnd)
      ).subscribe((event: NavigationEnd) => {
        this.currentRoute = this.normalizeRoute(event.urlAfterRedirects);
        this.closeMobileSidebar();
      })
    );

    this.subscriptions.push(
      this.authService.currentUser.subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadCounts();
        }
      })
    );
  }

  loadCounts(): void {
    // Charger le nombre de clients
    if (this.currentUser?.role === 'SUPER_ADMIN' || this.currentUser?.role === 'ADMIN') {
      const customersSub = this.userService.getUsersByRoles(['CLIENT', 'AFFILIATE']).subscribe({
        next: (customers: any[]) => {
          this.customersCount = customers.length;
          this.cdr.detectChanges();  // ✅ Force la détection des changements
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement du nombre de clients:', error);
          this.customersCount = 0;
          this.cdr.detectChanges();
        }
      });
      this.subscriptions.push(customersSub);
    }

    const propertiesSub = this.dashboardService.getDashboardSnapshot().subscribe({
      next: snapshot => {
        this.propertiesCount = snapshot.stats.totalProperties;
        this.cdr.detectChanges();  // ✅ Force la détection des changements
      },
      error: error => {
        console.error('Erreur lors du chargement du nombre de propriétés:', error);
        this.propertiesCount = 0;
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.push(propertiesSub);

    if (this.currentUser?.role === 'SUPER_ADMIN') {
      const agentsSub = this.userService.getUsersByRole('COMMERCIAL').subscribe({
        next: (agents: any[]) => {
          this.agentsCount = agents.length;
          this.cdr.detectChanges();  // ✅ Force la détection des changements
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement du nombre d\'agents:', error);
          this.agentsCount = 0;
          this.cdr.detectChanges();
        }
      });
      this.subscriptions.push(agentsSub);
    } else {
      this.agentsCount = 0;
    }
  }


  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    this.savePreferences();
  }

  openMobileSidebar(): void {
    this.isMobileMenuOpen = true;
  }

  closeMobileSidebar(): void {
    this.isMobileMenuOpen = false;
  }

  handleNavClick(): void {
    if (this.isMobileMenuOpen) {
      this.closeMobileSidebar();
    }
  }

  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    this.applyTheme();
    this.savePreferences();
  }

  logout(): void {
    this.authService.logout();
  }

  getPageTitle(): string {
    const routes: Array<{ path: string; title: string; exact?: boolean }> = [
      { path: '/admin/dashboard', title: 'Tableau de bord', exact: true },
      { path: '/admin/properties/new', title: 'Nouveau bien' },
      { path: '/admin/properties/edit', title: 'Modifier un bien' },
      { path: '/admin/properties', title: 'Biens immobiliers' },
      { path: '/admin/customers', title: 'Gestion des clients' }, // Changé
      { path: '/admin/agents', title: 'Agents commerciaux' },
      { path: '/admin/statistics', title: 'Transactions & Ventes' },
      { path: '/admin/settings', title: 'Paramètres' }
    ];

    const match = routes.find(route => {
      if (route.exact) {
        return this.currentRoute === route.path;
      }
      return this.currentRoute.startsWith(route.path);
    });

    return match?.title || 'Administration';
  }

  getUserInitials(): string {
    if (!this.currentUser) return 'U';
    
    const nom = this.currentUser.nom || '';
    const prenom = this.currentUser.prenom || '';
    const name = this.currentUser.name || '';
    
    if (nom && prenom) {
      return (prenom.charAt(0) + nom.charAt(0)).toUpperCase();
    }
    
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    
    if (this.currentUser.email) {
      return this.currentUser.email.charAt(0).toUpperCase();
    }
    
    return 'U';
  }

  getAvatarColor(): string {
    if (!this.currentUser) return '#3b82f6';
    
    const name = this.currentUser.name || this.currentUser.email || 'User';
    const colors = [
      '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b',
      '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316'
    ];
    
    const charSum = name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const colorIndex = charSum % colors.length;
    
    return colors[colorIndex];
  }

  getFormattedRole(): string {
    if (!this.currentUser || !this.currentUser.role) return '';
    
    const role = this.currentUser.role.toUpperCase();
    
    switch (role) {
      case 'SUPER_ADMIN':
      case 'SUPERADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Administrateur';
      case 'RESPONSABLE_COMMERCIAL':
        return 'Resp. Commercial';
      case 'COMMERCIAL':
        return 'Commercial';
      case 'EDITOR':
        return 'Éditeur';
      case 'AFFILIATE':
      case 'AFFILIATE_CLIENT':
        return 'Affilié';
      case 'CLIENT':
        return 'Client';
      default:
        return role.toLowerCase();
    }
  }

  getBadgeClass(): string {
    if (!this.currentUser || !this.currentUser.role) return 'badge-default';
    
    const role = this.currentUser.role.toUpperCase();
    
    if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') {
      return 'badge-superadmin';
    } else if (role === 'ADMIN') {
      return 'badge-admin';
    } else if (role === 'COMMERCIAL' || role === 'RESPONSABLE_COMMERCIAL') {
      return 'badge-commercial';
    } else if (role === 'CLIENT') {
      return 'badge-client';
    } else if (role === 'AFFILIATE' || role === 'AFFILIATE_CLIENT') {
      return 'badge-affiliate';
    }
    
    return 'badge-default';
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  @HostListener('window:resize')
  onResize(): void {
    this.updateViewportState();
  }

  private updateViewportState(): void {
    if (!this.isBrowser) return;

    this.isMobileView = window.innerWidth < this.mobileBreakpoint;

    if (!this.isMobileView) {
      this.closeMobileSidebar();
    }
  }

  private normalizeRoute(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  private restorePreferences(): void {
    if (!this.isBrowser) return;
    
    const collapsed = localStorage.getItem('adminSidebarCollapsed');
    if (collapsed !== null) {
      this.isSidebarCollapsed = collapsed === 'true';
    }
    
    const theme = localStorage.getItem('adminTheme');
    if (theme === 'dark') {
      this.isDarkTheme = true;
    } else if (theme === 'light') {
      this.isDarkTheme = false;
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkTheme = prefersDark;
    }
  }

  private savePreferences(): void {
    if (!this.isBrowser) return;
    localStorage.setItem('adminSidebarCollapsed', String(this.isSidebarCollapsed));
    localStorage.setItem('adminTheme', this.isDarkTheme ? 'dark' : 'light');
  }

  private applyTheme(): void {
    if (!this.isBrowser) return;
    
    if (this.isDarkTheme) {
      document.body.classList.add('dark-mode');
      document.documentElement.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
      document.documentElement.classList.remove('dark-mode');
    }
    
    document.body.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', this.isDarkTheme ? 'dark' : 'light');
    
    this.forceStyleRecalculation();
  }
  
  private forceStyleRecalculation(): void {
    document.body.style.display = 'none';
    void document.body.offsetHeight;
    document.body.style.display = '';
  }
}