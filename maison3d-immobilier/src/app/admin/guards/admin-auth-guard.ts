import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AdminAuthService } from '../services/admin-auth';

@Injectable({
  providedIn: 'root'
})
export class AdminAuthGuard {
  constructor(
    private authService: AdminAuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Vérifier si l'utilisateur est connecté ET si c'est un admin
    if (this.authService.isLoggedIn() && this.authService.isAdmin()) {
      return true;
    }
    
    // Vérifier si le token est expiré
    if (this.authService.isTokenExpired()) {
      this.authService.logout();
    }
    
    // Rediriger vers la page de login
    this.router.navigate(['/admin/login'], { 
      queryParams: { returnUrl: state.url } 
    });
    
    return false;
  }
}