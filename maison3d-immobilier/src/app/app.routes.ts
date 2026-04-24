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
import { ClientManagementComponent } from './admin/client-management/client-management.component'; // ← AJOUTER CETTE LIGNE

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
      { path: 'customers', component: ClientManagementComponent }, // ← AJOUTER CETTE LIGNE (route /admin/customers)
      { path: 'agents', component: AgentsAdmin },
      { path: 'statistics', component: Statistics },
      { path: 'settings', component: Settings },
    ]
  },
  
  // Redirection pour les routes non trouvées
  { path: '**', redirectTo: '' }
];