// services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { AdminAuthService } from '../admin/services/admin-auth';
import { apiBaseUrl } from './api-config';

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: string;
}

export interface UpdateUserRequest {
  nom?: string;
  prenom?: string;
  telephone?: string;
  isActive?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${apiBaseUrl}/api`;

  constructor(
    private http: HttpClient,
    private authService: AdminAuthService
  ) {}

  // ==================== CRUD UTILISATEURS ====================

  // Récupérer tous les utilisateurs
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/super-admin/users`).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        return of([]);
      })
    );
  }

  // Récupérer un utilisateur par ID
  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/super-admin/users/${id}`).pipe(
      catchError(error => {
        console.error(`Erreur lors de la récupération de l'utilisateur ${id}:`, error);
        throw error;
      })
    );
  }

  // Récupérer les utilisateurs par rôle
  getUsersByRole(role: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/super-admin/users/role/${role}`).pipe(
      catchError(error => {
        console.error(`Erreur lors de la récupération des utilisateurs par rôle ${role}:`, error);
        return of([]);
      })
    );
  }

  // Récupérer les utilisateurs actifs
  getActiveUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/super-admin/users/active`).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des utilisateurs actifs:', error);
        return of([]);
      })
    );
  }

  // Créer un nouvel utilisateur
  createUser(userData: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/super-admin/users`, userData).pipe(
      catchError(error => {
        console.error('Erreur lors de la création de l\'utilisateur:', error);
        throw error;
      })
    );
  }

  // Créer un administrateur
  createAdmin(userData: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/super-admin/users/admin`, userData).pipe(
      catchError(error => {
        console.error('Erreur lors de la création de l\'admin:', error);
        throw error;
      })
    );
  }

  // Créer un responsable commercial
  createResponsable(userData: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/super-admin/users/responsable`, userData).pipe(
      catchError(error => {
        console.error('Erreur lors de la création du responsable:', error);
        throw error;
      })
    );
  }

  // Mettre à jour un utilisateur
  updateUser(id: number, userData: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/super-admin/users/${id}`, userData).pipe(
      catchError(error => {
        console.error(`Erreur lors de la mise à jour de l'utilisateur ${id}:`, error);
        throw error;
      })
    );
  }

  // Changer le mot de passe
  changePassword(id: number, passwordData: ChangePasswordRequest): Observable<string> {
    return this.http.put(`${this.apiUrl}/super-admin/users/${id}/password`, passwordData, {
      responseType: 'text'
    }).pipe(
      catchError(error => {
        console.error(`Erreur lors du changement de mot de passe pour l'utilisateur ${id}:`, error);
        throw error;
      })
    );
  }

  // Activer un utilisateur
  activateUser(id: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/super-admin/users/${id}/activate`, {}).pipe(
      catchError(error => {
        console.error(`Erreur lors de l'activation de l'utilisateur ${id}:`, error);
        throw error;
      })
    );
  }

  // Désactiver un utilisateur
  deactivateUser(id: number): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/super-admin/users/${id}/deactivate`, {}).pipe(
      catchError(error => {
        console.error(`Erreur lors de la désactivation de l'utilisateur ${id}:`, error);
        throw error;
      })
    );
  }

  // Supprimer (désactiver) un utilisateur
  deleteUser(id: number): Observable<string> {
    return this.http.delete(`${this.apiUrl}/super-admin/users/${id}`, {
      responseType: 'text'
    }).pipe(
      catchError(error => {
        console.error(`Erreur lors de la suppression de l'utilisateur ${id}:`, error);
        throw error;
      })
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  // Formater la date
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  }

  // Obtenir le texte du rôle
  getRoleText(role: string): string {
    switch(role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'ADMIN':
        return 'Administrateur';
      case 'RESPONSABLE_COMMERCIAL':
        return 'Resp. Commercial';
      case 'COMMERCIAL':
        return 'Commercial';
      case 'CLIENT':
        return 'Client';
      case 'AFFILIATE':
        return 'Affilié';
      default:
        return role || 'Utilisateur';
    }
  }

  // Obtenir la couleur du rôle
  getRoleColor(role: string): string {
    switch(role?.toUpperCase()) {
      case 'SUPER_ADMIN':
        return '#dc3545';
      case 'ADMIN':
        return '#007bff';
      case 'RESPONSABLE_COMMERCIAL':
        return '#20c997';
      case 'COMMERCIAL':
        return '#28a745';
      case 'CLIENT':
        return '#17a2b8';
      case 'AFFILIATE':
        return '#fd7e14';
      default:
        return '#6c757d';
    }
  }

  // Obtenir les initiales
  getInitials(prenom: string, nom: string): string {
    return (prenom?.charAt(0) || '') + (nom?.charAt(0) || '');
  }

  // Vérifier si l'utilisateur a des permissions
  canManageUsers(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN';
  }

  // Valider l'email
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Valider le téléphone (format français)
  validatePhone(phone: string): boolean {
    const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
    return phoneRegex.test(phone);
  }

  // Générer un mot de passe aléatoire
  generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}