import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientAuthService } from '../services/client-auth.service';
import { InterestRequestService } from '../services/interest-request.service';

@Component({
  selector: 'app-interest-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="backdrop" (click)="close()">
      <div class="modal" (click)="$event.stopPropagation()">
        <button type="button" class="close" (click)="close()" aria-label="Fermer">×</button>

        <ng-container *ngIf="!success; else successView">
          <h2>Intéressé par ce bien</h2>
          <p class="muted">{{ propertyTitle }}</p>

          <form (ngSubmit)="submit()" #f="ngForm">
            <div class="field">
              <label>Nom complet</label>
              <input type="text" [(ngModel)]="fullName" name="fullName" required minlength="2" />
            </div>
            <div class="field">
              <label>Téléphone</label>
              <input type="tel" [(ngModel)]="telephone" name="telephone" required minlength="6" />
            </div>
            <div class="field">
              <label>Budget proposé (TND, optionnel)</label>
              <input type="number" min="0" [(ngModel)]="proposedBudget" name="proposedBudget" />
            </div>
            <div class="field">
              <label>Message</label>
              <textarea [(ngModel)]="message" name="message" rows="4"
                        placeholder="Ex: Je souhaite organiser une visite ce week-end…"></textarea>
            </div>

            <p class="error" *ngIf="error">{{ error }}</p>

            <div class="actions">
              <button type="button" class="btn-secondary" (click)="close()">Annuler</button>
              <button type="submit" class="btn-primary" [disabled]="loading || !f.valid">
                {{ loading ? 'Envoi…' : 'Envoyer ma demande' }}
              </button>
            </div>
          </form>
        </ng-container>

        <ng-template #successView>
          <div class="success">
            <div class="check">✓</div>
            <h2>Demande envoyée</h2>
            <p class="muted">
              L'agence a bien reçu votre intérêt et vous contactera très prochainement.
            </p>
            <button type="button" class="btn-primary" (click)="close()">Fermer</button>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .backdrop {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .modal {
      background: #fff; border-radius: 18px; padding: 32px;
      max-width: 500px; width: 100%; position: relative;
      box-shadow: 0 30px 80px -20px rgba(15,23,42,0.4);
      max-height: 90vh; overflow-y: auto;
    }
    .close {
      position: absolute; top: 14px; right: 16px;
      width: 34px; height: 34px; border-radius: 50%;
      background: #f1f5f9; color: #0f172a; border: none;
      font-size: 22px; line-height: 1; cursor: pointer;
    }
    .close:hover { background: #e2e8f0; }
    h2 { font-size: 22px; margin: 0 0 4px; color: #0f172a; }
    .muted { color: #64748b; margin: 0 0 20px; font-size: 14px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .field input, .field textarea {
      padding: 11px 13px; border: 1px solid #e2e8f0;
      border-radius: 10px; font-size: 14px; font-family: inherit;
    }
    .field textarea { resize: vertical; min-height: 90px; }
    .field input:focus, .field textarea:focus {
      outline: none; border-color: #0b6bcb; box-shadow: 0 0 0 3px rgba(11,107,203,0.15);
    }
    .error {
      background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
      border-radius: 9px; padding: 10px 12px; font-size: 13px; margin-top: 4px;
    }
    .actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 14px; }
    .btn-primary, .btn-secondary {
      padding: 11px 18px; border-radius: 10px;
      font-weight: 600; font-size: 14px; border: none; cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #0b6bcb, #084c91);
      color: #fff;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-secondary {
      background: #fff; color: #0f172a; border: 1px solid #e2e8f0;
    }
    .success { text-align: center; padding: 12px 0; }
    .success .check {
      width: 60px; height: 60px; border-radius: 50%;
      background: #dcfce7; color: #15803d;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; margin: 0 auto 16px;
    }
    .success h2 { margin-bottom: 8px; }
    .success .btn-primary { margin-top: 18px; }
  `],
})
export class InterestModalComponent implements OnInit {
  @Input({ required: true }) propertyId!: number;
  @Input() propertyTitle = '';
  @Output() closed = new EventEmitter<boolean>();

  private auth = inject(ClientAuthService);
  private service = inject(InterestRequestService);
  private cdr = inject(ChangeDetectorRef);

  fullName = '';
  telephone = '';
  message = '';
  proposedBudget?: number;
  loading = false;
  error = '';
  success = false;

  ngOnInit(): void {
    const u = this.auth.getCurrentUser();
    if (u) {
      this.fullName = `${u.prenom} ${u.nom}`.trim();
      this.telephone = u.telephone || '';
    }
  }

  submit(): void {
    this.error = '';
    this.loading = true;
    this.cdr.detectChanges();
    this.service.submit({
      propertyId: this.propertyId,
      fullName: this.fullName.trim(),
      telephone: this.telephone.trim(),
      message: this.message?.trim() || undefined,
      proposedBudget: this.proposedBudget,
    }).subscribe({
      next: () => { this.loading = false; this.success = true; this.cdr.detectChanges(); },
      error: (err) => {
        this.error = err?.error?.error || "Erreur lors de l'envoi";
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  close(): void {
    this.closed.emit(this.success);
  }
}
