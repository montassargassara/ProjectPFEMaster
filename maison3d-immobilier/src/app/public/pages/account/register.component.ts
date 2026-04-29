import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClientAuthService } from '../../services/client-auth.service';

@Component({
  selector: 'app-public-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-wrap">
      <div class="auth-card">
        <h1>Créer un compte</h1>
        <p class="muted">Rejoignez Maison3D pour suivre vos biens préférés et contacter les agences.</p>

        <form (ngSubmit)="submit()" #f="ngForm">
          <div class="row">
            <div class="field">
              <label>Prénom</label>
              <input type="text" [(ngModel)]="prenom" name="prenom" required minlength="2" />
            </div>
            <div class="field">
              <label>Nom</label>
              <input type="text" [(ngModel)]="nom" name="nom" required minlength="2" />
            </div>
          </div>
          <div class="field">
            <label>Email</label>
            <input type="email" [(ngModel)]="email" name="email" required autocomplete="email" />
          </div>
          <div class="field">
            <label>Téléphone</label>
            <input type="tel" [(ngModel)]="telephone" name="telephone" required minlength="8" />
          </div>
          <div class="field">
            <label>Mot de passe (8 caractères min.)</label>
            <input type="password" [(ngModel)]="password" name="password" required minlength="8" autocomplete="new-password" />
          </div>

          <p class="error" *ngIf="error">{{ error }}</p>

          <button type="submit" class="btn-primary" [disabled]="loading || !f.valid">
            {{ loading ? 'Création…' : 'Créer mon compte' }}
          </button>
        </form>

        <p class="footer-link">
          Vous avez déjà un compte ? <a routerLink="/compte/login">Se connecter</a>
        </p>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .auth-wrap {
      min-height: calc(100vh - 72px);
      display: flex; align-items: center; justify-content: center;
      padding: 60px 24px;
      background:
        radial-gradient(800px 400px at 20% 0%, rgba(11,107,203,0.08), transparent 60%),
        radial-gradient(600px 400px at 100% 100%, rgba(245,158,11,0.07), transparent 60%);
    }
    .auth-card {
      width: 100%; max-width: 480px;
      background: #fff; border: 1px solid #e2e8f0; border-radius: 18px;
      padding: 36px;
      box-shadow: 0 20px 50px -16px rgba(15,23,42,0.18);
    }
    h1 { font-size: 26px; margin: 0 0 6px; color: #0f172a; }
    .muted { color: #64748b; margin: 0 0 24px; font-size: 14px; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .field input {
      padding: 12px 14px; border: 1px solid #e2e8f0;
      border-radius: 10px; font-size: 14px;
    }
    .field input:focus { outline: none; border-color: #0b6bcb; box-shadow: 0 0 0 3px rgba(11,107,203,0.15); }
    .btn-primary {
      width: 100%; padding: 13px;
      background: linear-gradient(135deg, #0b6bcb, #084c91);
      color: #fff; border: none; border-radius: 11px;
      font-weight: 600; font-size: 14px;
      cursor: pointer; margin-top: 10px;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .error {
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
      border-radius: 9px; padding: 10px 12px; font-size: 13px; margin-top: 4px;
    }
    .footer-link { text-align: center; font-size: 14px; color: #475569; margin: 14px 0 0; }
    .footer-link a { color: #0b6bcb; text-decoration: none; font-weight: 600; }
  `],
})
export class PublicRegisterComponent {
  private auth = inject(ClientAuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  nom = '';
  prenom = '';
  email = '';
  telephone = '';
  password = '';
  error = '';
  loading = false;

  submit(): void {
    this.error = '';
    this.loading = true;
    this.cdr.detectChanges();
    this.auth.register({
      nom: this.nom.trim(),
      prenom: this.prenom.trim(),
      email: this.email.trim().toLowerCase(),
      telephone: this.telephone.trim(),
      password: this.password,
    }).subscribe({
      next: () => {
        this.loading = false;
        const redirect = this.route.snapshot.queryParamMap.get('redirect') || '/compte/dashboard';
        this.router.navigateByUrl(redirect);
      },
      error: (err) => {
        this.error = err?.error?.error || "Impossible de créer le compte";
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}
