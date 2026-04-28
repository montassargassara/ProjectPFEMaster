// app.routes.ts
import { Routes } from '@angular/router';
import { PropertyListComponent } from './components/property-list/property-list';
import { PropertyViewerComponent } from './components/property-viewer/property-viewer';
import { AdminComponent } from './admin/admin-component/admin-component';
import { AdminAuthGuard } from './admin/guards/admin-auth-guard';
import { AdminLoginComponent } from './admin/admin-login/admin-login';
import { DashboardComponent } from './admin/dashboard/dashboard';
import { PropertiesAdmin } from './admin/properties-admin/properties-admin';
import { PropertyEdit } from './admin/property-edit/property-edit';
import { AgentsAdmin } from './admin/agents-admin/agents-admin';
import { Statistics } from './admin/statistics/statistics';
import { Settings } from './admin/settings/settings';
import { ClientManagementComponent } from './admin/client-management/client-management.component';
import { ShareRequestsComponent } from './admin/share-requests/share-requests';
import { IncomingShareRequestsComponent } from './admin/incoming-share-requests/incoming-share-requests';
import { AffiliateApplicationsComponent } from './admin/affiliate-applications/affiliate-applications';
import { AffiliateAccountsComponent } from './admin/affiliate-accounts/affiliate-accounts';
import { AffiliateRankingComponent } from './admin/affiliate-ranking/affiliate-ranking';
import { AffiliateCommissionsComponent } from './admin/affiliate-commissions/affiliate-commissions';
import { AffiliateDashboardComponent } from './admin/affiliate-dashboard/affiliate-dashboard';
import { AffiliatePropertiesComponent } from './admin/affiliate-properties/affiliate-properties';
import { AffiliateOffersComponent } from './admin/affiliate-offers/affiliate-offers';
import { AffiliateEarningsComponent } from './admin/affiliate-earnings/affiliate-earnings';
import { AffiliateIncomingOffersComponent } from './admin/affiliate-incoming-offers/affiliate-incoming-offers';

export const routes: Routes = [
  // Routes publiques
  { path: '', component: PropertyListComponent },
  { path: 'property/:id', component: PropertyViewerComponent },

  // Routes admin
  {
    path: 'admin/login',
    component: AdminLoginComponent
  },
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [AdminAuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'properties', component: PropertiesAdmin },
      { path: 'properties/new', component: PropertyEdit },
      { path: 'properties/edit/:id', component: PropertyEdit },
      { path: 'customers', component: ClientManagementComponent },
      { path: 'agents', component: AgentsAdmin },
      { path: 'statistics', component: Statistics },
      { path: 'settings', component: Settings },
      { path: 'share-requests', component: ShareRequestsComponent },
      { path: 'incoming-share-requests', component: IncomingShareRequestsComponent },
      // Super Admin — Affiliate management
      { path: 'affiliate-applications', component: AffiliateApplicationsComponent },
      { path: 'affiliate-accounts', component: AffiliateAccountsComponent },
      { path: 'affiliate-ranking', component: AffiliateRankingComponent },
      { path: 'affiliate-commissions', component: AffiliateCommissionsComponent },
      // Affiliate User — personal workspace
      { path: 'affiliate-dashboard', component: AffiliateDashboardComponent },
      { path: 'affiliate-properties', component: AffiliatePropertiesComponent },
      { path: 'affiliate-offers', component: AffiliateOffersComponent },
      { path: 'affiliate-earnings', component: AffiliateEarningsComponent },
      // Agency Admin — incoming offers from affiliates
      { path: 'affiliate-incoming-offers', component: AffiliateIncomingOffersComponent },
    ]
  },

  // Redirection pour les routes non trouvées
  { path: '**', redirectTo: '' }
];