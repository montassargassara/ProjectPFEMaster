import { Component, OnInit, ChangeDetectorRef, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import * as L from 'leaflet';
import { firstValueFrom, of, combineLatest } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, filter, finalize, map, switchMap, tap } from 'rxjs/operators';
import { apiBaseUrl } from '../../services/api-config';
import { GeocodingService } from '../../services/geocoding-service';

interface PropertyPayload {
  titre: string;
  description: string;
  type: string;
  prixVente: number | null;
  prixLocation: number | null;
  statut: string;
  surface: number | null;
  nbChambres: number | null;
  adresse: string;
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  commissionPercentage: number | null;
  commissionType: string;
}

@Component({
  selector: 'app-property-edit',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './property-edit.html',
  styleUrl: './property-edit.scss',
})
export class PropertyEdit implements OnInit, AfterViewInit, OnDestroy {
  form!: FormGroup;
  isEditMode = false;
  propertyId: number | null = null;
  loading = false;
  saving = false;
  successMessage = '';
  errorMessage = '';
  activeSection = 'general';
  mainImagePreview: string | null = null;
  mainImageFile: File | null = null;
  uploadingImage = false;
  modelPreviewName = '';
  modelPreviewUrl = '';
  selectedModelFile: File | null = null;
  uploadingModel = false;
  videoPreviewName = '';
  videoPreviewUrl = '';
  selectedVideoFile: File | null = null;
  uploadingVideo = false;
  existingImages: Array<{ id: number; url: string; isPrimary?: boolean; fileName?: string }> = [];
  galleryItems: Array<
    | { kind: 'existing'; id: number; url: string; fileName?: string; isPrimary?: boolean }
    | { kind: 'new'; file: File; previewUrl: string }
  > = [];
  imagesToDelete: number[] = [];
  searchControl = new FormControl('');
  mapReady = false;
  isGeocoding = false;
  isReverseGeocoding = false;
  private map: L.Map | null = null;
  private marker: L.Marker | null = null;
  private formSyncLock = false;

  @ViewChild('mapContainer', { static: false }) mapContainer?: ElementRef<HTMLDivElement>;

  private readonly apiUrl = `${apiBaseUrl}/api/properties`;
  private readonly modelUploadUrl = `${apiBaseUrl}/api/models/property`;
  private readonly videoUploadUrl = `${apiBaseUrl}/api/videos/property`;
 
  readonly propertyTypes = [
    { value: 'APPARTEMENT', label: 'Appartement' },
    { value: 'MAISON', label: 'Maison' },
    { value: 'VILLA', label: 'Villa' },
    { value: 'TERRAIN', label: 'Terrain' },
    { value: 'COMMERCIAL', label: 'Commercial' },
    { value: 'LOFT', label: 'Loft' },
  ];
 
  readonly statuts = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'RESERVE', label: 'Réservé' },
    { value: 'VENDU', label: 'Vendu' },
    { value: 'LOUE', label: 'Loué' },
    { value: 'EN_ATTENTE', label: 'En attente' },
  ];

  readonly venteStatuses = ['DISPONIBLE', 'EN_ATTENTE', 'VENDU'];
  readonly locationStatuses = ['DISPONIBLE', 'EN_ATTENTE', 'LOUE'];
 
  readonly commissionTypes = [
    { value: 'PERCENTAGE', label: 'Pourcentage (%)' },
    { value: 'FIXED', label: 'Montant fixe (TND)' },
  ];
 
  readonly sections = [
    { id: 'general', label: 'Informations', icon: 'fa-file-alt' },
    { id: 'location', label: 'Localisation', icon: 'fa-map-marker-alt' },
    { id: 'pricing', label: 'Tarification', icon: 'fa-tag' },
    { id: 'media', label: 'Médias', icon: 'fa-images' },
    { id: 'advanced-media', label: 'Médias 3D/Video', icon: 'fa-cube' },
  ];
 
  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private geocodingService: GeocodingService
  ) {}
 
  ngOnInit(): void {
    console.log('🟢 PropertyEdit - Initialisation');
    this.buildForm();
    this.route.paramMap
      .pipe(
        map(params => params.get('id')),
        tap(id => {
          this.errorMessage = '';
          if (!id) {
            this.isEditMode = false;
            this.propertyId = null;
            this.loading = false;
            this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE EN MODE CRÉATION
            return;
          }
          this.isEditMode = true;
          this.propertyId = Number(id);
          this.loading = true;
          this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE PENDANT LE CHARGEMENT
        }),
        switchMap(id => {
          if (!id) return of(null);
          const numericId = Number(id);
          if (Number.isNaN(numericId)) {
            this.errorMessage = 'Identifiant invalide.';
            return of(null);
          }
          return this.http.get<any>(`${this.apiUrl}/${numericId}`).pipe(
            tap(property => {
              console.log('✅ Propriété chargée:', property?.titre);
            }),
            catchError(error => {
              console.error('🔴 Erreur chargement:', error);
              this.errorMessage = 'Impossible de charger le bien.';
              this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE EN ERREUR
              return of(null);
            }),
            finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS CHARGEMENT
            })
          );
        })
      )
      .subscribe(property => {
        if (!property) return;
        this.applyProperty(property);
        this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS APPLICATION DES DONNÉES
        console.log('✅ Formulaire rempli et affiché');
      });
  }
 
  private buildForm(): void {
    this.form = this.fb.group({
      titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(2000)]],
      type: ['APPARTEMENT', Validators.required],
      statut: ['DISPONIBLE', Validators.required],
      categorie: ['VENTE'],
      prixVente: [null],
      prixLocation: [null],
      surface: [null, [Validators.min(1)]],
      nbChambres: [null, [Validators.min(0)]],
      adresse: ['', Validators.required],
      country: ['Tunisie'],
      city: [''],
      latitude: [null],
      longitude: [null],
      commissionPercentage: [null],
      commissionType: ['PERCENTAGE'],
    });
 
    // Sync price validators based on category
    this.form.get('categorie')?.valueChanges.subscribe(cat => {
      const prixVente = this.form.get('prixVente');
      const prixLocation = this.form.get('prixLocation');
      if (cat === 'VENTE') {
        prixVente?.setValidators([Validators.required, Validators.min(0)]);
        prixLocation?.clearValidators();
      } else {
        prixLocation?.setValidators([Validators.required, Validators.min(0)]);
        prixVente?.clearValidators();
      }
      prixVente?.updateValueAndValidity();
      prixLocation?.updateValueAndValidity();
      this.ensureStatusMatchesCategory();
      this.cdr.detectChanges();  // ← FORCE L'UPDATE APRÈS CHANGEMENT DE CATÉGORIE
    });
 
    this.form.get('categorie')?.setValue('VENTE');
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS CRÉATION DU FORMULAIRE

    this.setupLocationSync();
  }
 
  private applyProperty(property: any): void {
    console.log('📝 Application des données au formulaire');
    const medias = Array.isArray(property?.medias) ? property.medias : [];
    const imageMedias = medias.filter((media: any) => media?.type === 'IMAGE');
    const videoMedias = medias.filter((media: any) => media?.type === 'VIDEO');
    const modelMedias = medias.filter((media: any) => media?.type === 'MODEL_3D');
    const categorie = property.prixVente ? 'VENTE' : 'LOCATION';
    this.form.patchValue({
      titre: property.titre,
      description: property.description,
      type: property.type,
      statut: property.statut,
      categorie,
      prixVente: property.prixVente,
      prixLocation: property.prixLocation,
      surface: property.surface,
      nbChambres: property.nbChambres,
      adresse: property.adresse,
      country: property.country,
      city: property.city,
      latitude: property.latitude,
      longitude: property.longitude,
      commissionPercentage: property.commissionPercentage,
      commissionType: property.commissionType || 'PERCENTAGE',
    });

    if (property.mainImageUrl) {
      this.mainImagePreview = this.resolveMediaUrl(property.mainImageUrl);
    }
    if (property.model3dUrl) {
      this.modelPreviewUrl = this.resolveMediaUrl(property.model3dUrl);
    }
    if (property.model3dName) {
      this.modelPreviewName = property.model3dName;
    }

    if (imageMedias.length) {
      this.existingImages = imageMedias.map((media: any) => ({
        id: Number(media.id),
        url: this.resolveMediaUrl(media.url),
        isPrimary: media.isPrimary,
        fileName: media.fileName,
      }));

      const primaryImage = this.existingImages.find(image => image.isPrimary) || this.existingImages[0];
      if (!this.mainImagePreview && primaryImage?.url) {
        this.mainImagePreview = primaryImage.url;
      }

      const galleryImages = this.existingImages.filter(image => image.id !== primaryImage?.id);
      this.galleryItems = galleryImages.map(image => ({
        kind: 'existing',
        id: image.id,
        url: image.url,
        fileName: image.fileName,
        isPrimary: image.isPrimary,
      }));
    }

    const primaryVideo = videoMedias.find((media: any) => media?.isPrimary) || videoMedias[0];
    if (property.mainVideoUrl || primaryVideo?.url) {
      this.videoPreviewUrl = this.resolveMediaUrl(property.mainVideoUrl || primaryVideo?.url);
    }
    if (property.mainVideoName || primaryVideo?.fileName) {
      this.videoPreviewName = property.mainVideoName || primaryVideo?.fileName || '';
    }

    if (!this.modelPreviewUrl) {
      const primaryModel = modelMedias[0];
      if (primaryModel?.url) {
        this.modelPreviewUrl = this.resolveMediaUrl(primaryModel.url);
      }
      if (!this.modelPreviewName && primaryModel?.fileName) {
        this.modelPreviewName = primaryModel.fileName;
      }
    }
    
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS PATCH

    this.syncMapWithForm();
    this.ensureStatusMatchesCategory();
  }

  ngAfterViewInit(): void {
    if (this.activeSection === 'location') {
      this.initializeMap();
    }
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
 
  setSection(id: string): void {
    this.activeSection = id;
    if (id === 'location') {
      if (!this.map) {
        this.initializeMap();
      } else {
        setTimeout(() => this.map?.invalidateSize(true), 150);
      }
    }
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS CHANGEMENT DE SECTION
  }
 
  get isVente(): boolean {
    return this.form.get('categorie')?.value === 'VENTE';
  }

  get modelSizeLabel(): string {
    if (!this.selectedModelFile?.size) return 'Fichier existant';
    const sizeMb = this.selectedModelFile.size / 1024 / 1024;
    return `${sizeMb.toFixed(1)} MB`;
  }

  get videoSizeLabel(): string {
    if (!this.selectedVideoFile?.size) return 'Fichier existant';
    const sizeMb = this.selectedVideoFile.size / 1024 / 1024;
    return `${sizeMb.toFixed(1)} MB`;
  }
 
  onMainImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.mainImageFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => { 
        this.mainImagePreview = reader.result as string;
        this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS CHARGEMENT IMAGE
      };
      reader.readAsDataURL(this.mainImageFile);
    }
  }
 
  clearMainImage(): void {
    this.mainImagePreview = null;
    this.mainImageFile = null;
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS SUPPRESSION IMAGE
  }

  onGallerySelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const files = Array.from(input.files);
    files.forEach(file => this.addGalleryFile(file));
    input.value = '';
    this.cdr.detectChanges();
  }

  onGalleryDrop(event: DragEvent): void {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []);
    files.forEach(file => this.addGalleryFile(file));
    this.cdr.detectChanges();
  }

  removeGalleryItem(index: number): void {
    const item = this.galleryItems[index];
    if (!item) return;
    if (item.kind === 'existing') {
      this.imagesToDelete.push(item.id);
    }
    this.galleryItems.splice(index, 1);
    this.cdr.detectChanges();
  }

  moveGalleryItem(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    if (fromIndex >= this.galleryItems.length || toIndex >= this.galleryItems.length) return;
    const [moved] = this.galleryItems.splice(fromIndex, 1);
    this.galleryItems.splice(toIndex, 0, moved);
    this.cdr.detectChanges();
  }

  setGalleryPrimary(index: number): void {
    const item = this.galleryItems[index];
    if (!item || item.kind !== 'existing') return;
    const primaryImage = this.existingImages.find(image => image.isPrimary);
    if (primaryImage) {
      this.galleryItems.unshift({
        kind: 'existing',
        id: primaryImage.id,
        url: primaryImage.url,
        fileName: primaryImage.fileName,
        isPrimary: false,
      });
    }
    this.existingImages = this.existingImages.map(image => ({
      ...image,
      isPrimary: image.id === item.id,
    }));
    this.mainImagePreview = item.url;
    this.galleryItems.splice(index + (primaryImage ? 1 : 0), 1);
    this.cdr.detectChanges();
  }

  onModelSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!this.isValidModelFile(file)) {
      this.errorMessage = 'Format 3D non supporte (GLB, GLTF, OBJ, FBX).';
      this.cdr.detectChanges();
      return;
    }
    this.selectedModelFile = file;
    this.modelPreviewName = file.name;
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS SÉLECTION MODÈLE
  }

  onModelDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!this.isValidModelFile(file)) {
      this.errorMessage = 'Format 3D non supporte (GLB, GLTF, OBJ, FBX).';
      this.cdr.detectChanges();
      return;
    }
    this.selectedModelFile = file;
    this.modelPreviewName = file.name;
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS DROP MODÈLE
  }

  clearModel(): void {
    this.selectedModelFile = null;
    this.modelPreviewName = '';
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS SUPPRESSION MODÈLE
  }

  onVideoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    if (!this.isValidVideoFile(file)) {
      this.errorMessage = 'Format video non supporte (MP4).';
      this.cdr.detectChanges();
      return;
    }
    this.selectedVideoFile = file;
    this.videoPreviewName = file.name;
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS SÉLECTION VIDÉO
  }

  onVideoDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    if (!this.isValidVideoFile(file)) {
      this.errorMessage = 'Format video non supporte (MP4).';
      this.cdr.detectChanges();
      return;
    }
    this.selectedVideoFile = file;
    this.videoPreviewName = file.name;
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS DROP VIDÉO
  }

  clearVideo(): void {
    this.selectedVideoFile = null;
    this.videoPreviewName = '';
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS SUPPRESSION VIDÉO
  }
 
  getFieldError(fieldName: string): string {
    const control = this.form.get(fieldName);
    if (!control?.invalid || !control.touched) return '';
    if (control.errors?.['required']) return 'Ce champ est obligatoire.';
    if (control.errors?.['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} caractères.`;
    if (control.errors?.['maxlength']) return `Maximum ${control.errors['maxlength'].requiredLength} caractères.`;
    if (control.errors?.['min']) return 'La valeur doit être positive.';
    return 'Valeur invalide.';
  }
 
  isInvalid(fieldName: string): boolean {
    const c = this.form.get(fieldName);
    return !!(c?.invalid && c.touched);
  }
 
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Jump to first section with error
      const errFields = ['titre', 'description', 'type', 'statut'];
      const locFields = ['adresse', 'country', 'city'];
      const priceFields = ['prixVente', 'prixLocation'];
      if (errFields.some(f => this.form.get(f)?.invalid)) this.activeSection = 'general';
      else if (locFields.some(f => this.form.get(f)?.invalid)) this.activeSection = 'location';
      else if (priceFields.some(f => this.form.get(f)?.invalid)) this.activeSection = 'pricing';
      this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE DES ERREURS
      return;
    }
 
    this.saving = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE PENDANT LA SAUVEGARDE
 
    const v = this.form.value;
    const payload: PropertyPayload = {
      titre: v.titre,
      description: v.description,
      type: v.type,
      statut: v.statut,
      prixVente: v.categorie === 'VENTE' ? v.prixVente : null,
      prixLocation: v.categorie === 'LOCATION' ? v.prixLocation : null,
      surface: v.surface,
      nbChambres: v.nbChambres,
      adresse: v.adresse,
      country: v.country,
      city: v.city,
      latitude: v.latitude,
      longitude: v.longitude,
      commissionPercentage: v.commissionPercentage,
      commissionType: v.commissionType,
    };
 
    try {
      let savedId: number;

      if (this.isEditMode && this.propertyId) {
        await firstValueFrom(this.http.put<any>(`${this.apiUrl}/${this.propertyId}`, payload));
        savedId = this.propertyId;
      } else {
        const created = await firstValueFrom(this.http.post<any>(this.apiUrl, payload));
        savedId = created.id;
      }

      if (this.mainImageFile && savedId) {
        await this.uploadMainImage(savedId, this.mainImageFile);
      }

      if (this.galleryItems.some(item => item.kind === 'new') && savedId) {
        await this.uploadGalleryImages(savedId, this.galleryItems);
      }

      if (this.imagesToDelete.length && savedId) {
        await this.deleteImages(savedId, this.imagesToDelete);
      }

      if (this.selectedModelFile && savedId) {
        await this.uploadModel(savedId, this.selectedModelFile);
      }

      if (this.selectedVideoFile && savedId) {
        await this.uploadVideo(savedId, this.selectedVideoFile);
      }

      this.successMessage = this.isEditMode
        ? 'Bien modifié avec succès !'
        : 'Bien créé avec succès !';
      this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE DU MESSAGE DE SUCCÈS

      setTimeout(() => {
        this.router.navigate(['/admin/properties']);
      }, 1800);
    } catch (err: any) {
      this.errorMessage = err?.error?.message || err?.message || 'Une erreur est survenue.';
      this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE DE L'ERREUR
    } finally {
      this.saving = false;
      this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS LA SAUVEGARDE
    }
  }

  private async uploadMainImage(propertyId: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrimary', 'true');
    await firstValueFrom(
      this.http.post(`${apiBaseUrl}/api/images/property/${propertyId}/upload`, formData)
    );
  }

  private async uploadGalleryImages(
    propertyId: number,
    items: Array<{ kind: 'existing' | 'new'; file?: File }>
  ): Promise<void> {
    const files = items
      .filter(item => item.kind === 'new')
      .map(item => item.file)
      .filter((file): file is File => !!file);
    if (!files.length) return;
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('setAsMain', 'false');
    await firstValueFrom(
      this.http.post(`${apiBaseUrl}/api/images/property/${propertyId}/upload-multiple`, formData)
    );
  }

  private async deleteImages(propertyId: number, imageIds: number[]): Promise<void> {
    const deletes = imageIds.map(imageId =>
      firstValueFrom(
        this.http.delete(`${apiBaseUrl}/api/images/${imageId}`, { params: { propertyId } })
      )
    );
    await Promise.all(deletes);
  }

  private async uploadModel(propertyId: number, file: File): Promise<void> {
    this.uploadingModel = true;
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE PENDANT L'UPLOAD
    try {
      const formData = new FormData();
      formData.append('file', file);
      await firstValueFrom(this.http.post(`${this.modelUploadUrl}/${propertyId}/upload`, formData));
    } finally {
      this.uploadingModel = false;
      this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS L'UPLOAD
    }
  }

  private async uploadVideo(propertyId: number, file: File): Promise<void> {
    this.uploadingVideo = true;
    this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE PENDANT L'UPLOAD
    try {
      const formData = new FormData();
      formData.append('file', file);
      await firstValueFrom(this.http.post(`${this.videoUploadUrl}/${propertyId}/upload`, formData));
    } finally {
      this.uploadingVideo = false;
      this.cdr.detectChanges();  // ← FORCE L'AFFICHAGE APRÈS L'UPLOAD
    }
  }

  private isValidModelFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return (
      name.endsWith('.glb') ||
      name.endsWith('.gltf') ||
      name.endsWith('.obj') ||
      name.endsWith('.fbx')
    );
  }

  private isValidVideoFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.mp4') || file.type === 'video/mp4';
  }

  private addGalleryFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Format image non supporte (JPG, PNG, WebP).';
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    this.galleryItems.push({ kind: 'new', file, previewUrl });
  }

  private resolveMediaUrl(rawUrl?: string | null): string {
    if (!rawUrl) return '';
    if (rawUrl.startsWith('http')) return rawUrl;

    const normalized = this.normalizePublicMediaPath(rawUrl);
    return `${apiBaseUrl}${normalized}`;
  }

  private normalizePublicMediaPath(rawUrl: string): string {
    return rawUrl
      .replace('/api/public/images/', '/api/images/public/')
      .replace('/api/public/videos/', '/api/videos/public/')
      .replace('/api/public/models/', '/api/models/public/');
  }
 
  cancel(): void {
    this.router.navigate(['/admin/properties']);
  }

  get availableStatusOptions(): Array<{ value: string; label: string }> {
    const categorie = this.form.get('categorie')?.value;
    const allowed = categorie === 'LOCATION' ? this.locationStatuses : this.venteStatuses;
    return this.statuts.filter(status => allowed.includes(status.value));
  }

  private ensureStatusMatchesCategory(): void {
    const currentStatus = this.form.get('statut')?.value;
    const categorie = this.form.get('categorie')?.value;
    const allowed = categorie === 'LOCATION' ? this.locationStatuses : this.venteStatuses;
    if (!allowed.includes(currentStatus)) {
      this.form.patchValue({ statut: allowed[0] }, { emitEvent: false });
    }
  }

  private setupLocationSync(): void {
    const address$ = this.form.get('adresse')?.valueChanges || of('');
    const city$ = this.form.get('city')?.valueChanges || of('');
    const country$ = this.form.get('country')?.valueChanges || of('');

    combineLatest([address$, city$, country$])
      .pipe(
        debounceTime(600),
        filter(() => !this.formSyncLock),
        map(([adresse, city, country]) => [adresse, city, country].filter(Boolean).join(', ').trim()),
        distinctUntilChanged(),
        filter(query => query.length > 2)
      )
      .subscribe(query => {
        this.searchControl.setValue(query, { emitEvent: false });
        this.geocodeAndMove(query);
      });

    const lat$ = this.form.get('latitude')?.valueChanges || of(null);
    const lng$ = this.form.get('longitude')?.valueChanges || of(null);

    combineLatest([lat$, lng$])
      .pipe(
        debounceTime(300),
        filter(() => !this.formSyncLock)
      )
      .subscribe(([lat, lng]) => {
        if (lat == null || lng == null) return;
        this.setMarkerPosition(Number(lat), Number(lng), true);
      });
  }

  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) return;
    this.fixLeafletIcons();
    this.loadLeafletCss();
    this.ensureMapContainerDimensions();

    const defaultLat = Number(this.form.get('latitude')?.value) || 36.8065;
    const defaultLng = Number(this.form.get('longitude')?.value) || 10.1815;
    const defaultZoom = this.form.get('latitude')?.value && this.form.get('longitude')?.value ? 14 : 6;

    this.map = L.map(this.mapContainer.nativeElement, {
      center: [defaultLat, defaultLng],
      zoom: defaultZoom,
      zoomControl: true,
      scrollWheelZoom: true,
      doubleClickZoom: true,
      dragging: true,
      attributionControl: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      detectRetina: true,
    }).addTo(this.map);

    this.marker = L.marker([defaultLat, defaultLng], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', () => {
      const position = this.marker?.getLatLng();
      if (!position) return;
      this.updateFormFromCoords(position.lat, position.lng, true);
    });

    this.map.on('click', event => {
      const latlng = event.latlng;
      this.setMarkerPosition(latlng.lat, latlng.lng, true);
      this.updateFormFromCoords(latlng.lat, latlng.lng, true);
    });

    setTimeout(() => {
      this.map?.invalidateSize(true);
      this.mapReady = true;
      this.cdr.detectChanges();
    }, 200);
  }

  private ensureMapContainerDimensions(): void {
    const element = this.mapContainer?.nativeElement;
    if (!element) return;
    if (element.offsetHeight < 200) {
      element.style.height = '360px';
      element.style.minHeight = '360px';
    }
  }

  private loadLeafletCss(): void {
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }

  private fixLeafletIcons(): void {
    const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
    const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
    const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

    const defaultIcon = L.Icon.Default.prototype as any;
    if (defaultIcon._getIconUrl) {
      delete defaultIcon._getIconUrl;
    }

    L.Icon.Default.mergeOptions({
      iconRetinaUrl,
      iconUrl,
      shadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }

  onSearchLocation(): void {
    const query = (this.searchControl.value || '').trim();
    if (!query) return;
    this.geocodeAndMove(query);
  }

  onUseCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.errorMessage = 'Geolocalisation indisponible.';
      this.cdr.detectChanges();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        this.setMarkerPosition(latitude, longitude, true);
        this.updateFormFromCoords(latitude, longitude, true);
      },
      () => {
        this.errorMessage = 'Impossible de recuperer votre position.';
        this.cdr.detectChanges();
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  private geocodeAndMove(query: string): void {
    if (!this.map) return;
    this.isGeocoding = true;
    this.geocodingService.geocodeAddress(query)
      .pipe(finalize(() => {
        this.isGeocoding = false;
        this.cdr.detectChanges();
      }))
      .subscribe(result => {
        const item = Array.isArray(result) ? result[0] : null;
        if (!item) return;
        const lat = Number(item.lat);
        const lng = Number(item.lon);
        this.setMarkerPosition(lat, lng, true);
        this.updateFormFromCoords(lat, lng, false, item);
      });
  }

  private updateFormFromCoords(
    lat: number,
    lng: number,
    withReverseGeocode: boolean,
    geocodeResult?: any
  ): void {
    this.formSyncLock = true;
    this.form.patchValue({ latitude: lat, longitude: lng }, { emitEvent: false });
    this.formSyncLock = false;

    if (!withReverseGeocode && geocodeResult) {
      this.applyGeocodeResult(geocodeResult, lat, lng);
      return;
    }

    if (!withReverseGeocode) return;
    this.isReverseGeocoding = true;
    this.geocodingService.reverseGeocode(lat, lng)
      .pipe(finalize(() => {
        this.isReverseGeocoding = false;
        this.cdr.detectChanges();
      }))
      .subscribe(result => {
        if (!result) return;
        this.applyGeocodeResult(result, lat, lng);
      });
  }

  private applyGeocodeResult(result: any, lat: number, lng: number): void {
    const address = result?.address || {};
    const city = address.city || address.town || address.village || address.municipality || '';
    const country = address.country || '';
    const displayName = result.display_name || this.form.get('adresse')?.value || '';

    this.formSyncLock = true;
    this.form.patchValue(
      {
        adresse: displayName,
        city,
        country,
        latitude: lat,
        longitude: lng,
      },
      { emitEvent: false }
    );
    this.formSyncLock = false;
    this.cdr.detectChanges();
  }

  private setMarkerPosition(lat: number, lng: number, animate: boolean): void {
    if (!this.map || !this.marker) return;
    this.marker.setLatLng([lat, lng]);
    this.map.setView([lat, lng], Math.max(this.map.getZoom(), 13), { animate });
  }

  private syncMapWithForm(): void {
    const lat = Number(this.form.get('latitude')?.value);
    const lng = Number(this.form.get('longitude')?.value);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    if (!this.map) return;
    this.setMarkerPosition(lat, lng, false);
  }
}