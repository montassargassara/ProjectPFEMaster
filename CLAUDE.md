# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# PROJECT NAME

Maison3D Immobilier

Modern full-stack real estate management platform with 3D visualization, CRM tools, agency management, affiliate sales network, advanced dashboards, and a scalable multi-tenant architecture.

---

# MAIN OBJECTIVE

Build a professional immobilier SaaS platform where:

- Super Admin controls the whole ecosystem
- Clients can own accounts/businesses
- Agencies can be linked to clients
- Agents manage properties
- Affiliates act as external sales partners earning zone-based commissions
- Buyers / visitors explore listings
- 3D property presentation is a core premium feature

---

# TECH STACK

## Backend

- Java 17
- Spring Boot 3.2+
- Spring Security
- JWT Authentication (JJWT 0.11.5)
- Spring Data JPA / Hibernate
- Maven
- MySQL

Path: `backend/`

## Frontend

- Angular 21 standalone architecture
- TypeScript
- SCSS
- Bootstrap 5
- RxJS

Path: `maison3d-immobilier/`

---

# IMPORTANT LIBRARIES

## Frontend

- **Leaflet** → maps / property locations
- **Leaflet Draw** → draw zones on map
- **Marker Cluster** → grouped map markers
- **Heatmap plugin** → analytics maps
- **Three.js** → 3D house / floor plan visualization
- **ApexCharts** → dashboards / statistics
- **Bootstrap 5** → layout and UI components

---

# RUN COMMANDS

## Backend

Run from the `backend/` directory.

```bash
mvn spring-boot:run               # Start dev server on port 8080
mvn clean install                 # Full build
mvn test                          # Run all tests
mvn test -Dtest=ClassName         # Run a single test class
mvn clean package -DskipTests     # Build JAR without running tests
```

**Prerequisite**: MySQL must be running at `localhost:3306`. Create a database named `immobilierdttb` with root user and empty password. Hibernate auto-updates the schema on startup.

## Frontend

Run from the `maison3d-immobilier/` directory.

```bash
npm install          # Install dependencies (required first time)
npm start            # Dev server at http://localhost:4200
npm run build        # Production build
npm test             # Unit tests with Vitest
npm run watch        # Build in watch mode
```

---

# ARCHITECTURE

## Backend (`backend/src/main/java/com/immobilier/backend/`)

Standard Spring Boot layered architecture:

```
controller/   → REST endpoints (Auth, Dashboard, PropertyShareRequest, Notification,
                AffiliateController, SuperAdminAffiliateController, SaleOfferController,
                ZonePaymentController, SuperAdminZonePaymentController,
                AdminInterestController, etc.)
service/      → Business logic
scheduler/    → Spring @Scheduled jobs (RentalExpiryScheduler — daily rental expiry check)
repository/   → Spring Data JPA repositories
entity/       → JPA domain models
dto/          → Request / response data transfer objects (incl. ConvertLeadRequest)
security/     → JWT filter, UserDetailsService, Spring Security config
config/       → CORS, file upload, and other beans
exception/    → Global exception handler
enums/        → Domain enumerations (ShareRequestStatus, NotificationType, AffiliateStatus, …)
validation/   → Custom constraint annotations and validators
```

JWT tokens are issued on login and validated per request via a filter. The secret and expiration are configured in `application.properties`. CORS is open to all origins (dev setup).

Swagger UI is available at `http://localhost:8080/swagger-ui.html` when the backend is running.

## Frontend (`maison3d-immobilier/src/app/`)

Angular standalone components with a feature-folder layout:

```
admin/
  admin-component/              → Shell layout: sidebar, header, notification bell
                                  Sidebar is role-aware — AFFILIATE sees only affiliate menu
  dashboard/                    → Role-aware KPI dashboard (admin/commercial roles only)
  properties-admin/             → Property list + share-request modal
  property-edit/                → Property CRUD form
  share-requests/               → Super Admin: sent share requests tracker
  incoming-share-requests/      → Agency Admin: incoming proposals (accept / reject)
  agents-admin/                 → Agent management
  client-management/            → Client management
  statistics/                   → Transactions & sales
  settings/                     → Platform settings
  affiliate-applications/       → Super Admin: review PENDING affiliate registrations
  affiliate-accounts/           → Super Admin: manage all affiliate accounts
  affiliate-ranking/            → Ranking leaderboard (shared: SUPER_ADMIN + AFFILIATE)
  affiliate-commissions/        → Super Admin: all commissions & payout management
  affiliate-dashboard/          → Affiliate: personal KPI dashboard + zone expansion widget
  affiliate-properties/         → Affiliate: eligible properties in assigned zones
  affiliate-offers/             → Affiliate: submit and track sale offers
  affiliate-earnings/           → Affiliate: commission transaction history
  affiliate-incoming-offers/    → Agency Admin: incoming sale offers from affiliates
  agency-applications/          → Super Admin: review PENDING agency self-registrations
  zone-payment-requests/        → Super Admin: review zone payment proofs (approve/reject)
  sale-validations/             → Cross-ownership sale/rental validation workflow
                                  (two-tab: pending approvals + sent requests)
  services/                     → HTTP wrappers (properties, share-request, notification,
                                  auth, affiliate, agency-registration, sale-validation, …)
  guards/                       → Route guards (auth protection + role isolation)
public/                         → Public visitor portal — fully isolated from admin shell
  layout/                       → Public header + footer + outlet
  pages/home/                   → Hero + featured grids
  pages/listing/                → /biens/vente and /biens/location (mode via route data)
  pages/property-detail/        → /biens/:id with gallery, video, <model-viewer> 3D, similar
  pages/account/                → /compte/login, /compte/register, /compte/dashboard
  pages/register/               → /register (choice), /register/agence, /register/affilie
  components/                   → Public property card, filter bar, interest modal
  services/                     → ClientAuthService (own token store), InterestRequestService,
                                  PublicPortalService, clientAuthGuard
  models/                       → Public DTOs (PublicPropertyCard, PublicPropertyDetail, …)
components/     → Shared / reusable UI components
services/       → App-level HTTP clients (incl. dual-token jwt-interceptor +
                                          client-auth-error interceptor)
models/         → TypeScript interfaces mirroring backend DTOs
                  (affiliate.model.ts mirrors backend affiliate DTOs exactly)
app.routes.ts   → Central route definitions
app.config.ts   → App-level providers (HttpClient, Router, etc.)
```

The frontend calls the backend at `http://localhost:8080`. JWT tokens are attached to requests via an HTTP interceptor.

---

# ROLES

| Role                   | Scope                                                                      |
|------------------------|----------------------------------------------------------------------------|
| Super Admin            | Full platform control — users, clients, agencies, sharing, affiliate mgmt  |
| Client                 | Owns one or more agencies / businesses                                     |
| Agency (ADMIN)         | Groups agents; linked to a client; manages own properties                  |
| Responsable Commercial | Agency employee; sees agency properties                                    |
| Commercial             | Agency employee; sees agency properties                                    |
| Affiliate              | External sales partner; zone-based commission; isolated workspace          |
| Client Public          | `CLIENT_PUBLIC` — self-registered buyer account; browses listings, sends "Intéressé" requests, tracks them in their dashboard. Distinct from the legacy in-agency `CLIENT` lead role |
| Buyer (anonymous)      | Visitor with no account; browses public listings only                      |

The role hierarchy for property access is:
`SUPER_ADMIN → ADMIN → RESPONSABLE_COMMERCIAL → COMMERCIAL`

AFFILIATE is **not** part of the internal hierarchy — they operate in a completely separate workspace with no visibility into internal operations.

Any non-SUPER_ADMIN internal user resolves to their top-level ADMIN ancestor to determine which agency they belong to.

---

# PROPERTIES MULTI-TENANT SYSTEM

## Ownership Model

Every property has an `ownerType` field:

| Value               | Meaning                                           |
|---------------------|---------------------------------------------------|
| `SUPER_ADMIN_OWNED` | Created by Super Admin; private unless shared     |
| `AGENCY_OWNED`      | Created by an agency; visible only to that agency |
| `null`              | Legacy data; treated as visible to all agencies   |

Agency-owned properties also store a reference to their `agencyAdmin` (the ADMIN user at the top of that agency's hierarchy).

## Visibility Rules

| Actor                | What they can see                                                                               |
|----------------------|-------------------------------------------------------------------------------------------------|
| Super Admin          | All properties (SUPER_ADMIN_OWNED, AGENCY_OWNED, legacy)                                       |
| Agency (ADMIN/staff) | Own AGENCY_OWNED properties + SUPER_ADMIN_OWNED properties explicitly shared **and accepted**  |
| Affiliate            | Only properties that are active, affiliate-eligible, commission-enabled, and in their zone(s)  |
| No one               | SUPER_ADMIN_OWNED properties with no accepted share, or with only PENDING/REJECTED requests    |

## Sharing Approval Workflow

Sharing is a **two-phase process**. Sharing a property does not immediately make it visible to the agency.

### Phase 1 — Share Request (PENDING)

When Super Admin initiates sharing:

1. A `PropertyShareRequest` record is created with status `PENDING`.
2. The agency does **not** see the property yet — no `PropertySharedAgency` row is created.
3. The agency Admin receives an **in-app notification** containing: property title, price, location, commission terms, and sender.
4. Super Admin can track per-agency status (PENDING / ACCEPTED / REJECTED / CANCELLED).
5. Super Admin can cancel a PENDING request at any time (status → CANCELLED).

### Phase 2 — Agency Decision

| Agency action | Result                                                                                 |
|---------------|----------------------------------------------------------------------------------------|
| **Accept**    | A `PropertySharedAgency` row is created → property becomes visible to the agency       |
| **Reject**    | No row created → property stays hidden; Super Admin sees REJECTED status + reason      |

### Share Request Statuses

`PENDING` → `ACCEPTED` or `REJECTED` or `CANCELLED`

### Share Request API

- `POST /api/share-requests/property/{propertyId}` — Super Admin creates requests (one or more agencies)
- `GET  /api/share-requests/sent` — Super Admin lists all sent requests
- `GET  /api/share-requests/property/{propertyId}` — requests for a specific property
- `GET  /api/share-requests/property/{propertyId}/agencies` — agencies with current share status
- `DELETE /api/share-requests/{requestId}` — Super Admin cancels a PENDING request
- `GET  /api/share-requests/incoming` — Agency views all incoming requests
- `GET  /api/share-requests/incoming/pending` — Agency views pending requests only
- `GET  /api/share-requests/{requestId}` — single request detail
- `PUT  /api/share-requests/{requestId}/respond` — Agency accepts or rejects (body: `response`, `rejectionReason`)
- `DELETE /api/properties/{id}/sharing/{adminId}` — Super Admin revokes an accepted share

> The old `PUT /api/properties/{id}/sharing` (instant bulk-replace) endpoint has been removed. All sharing now goes through the approval workflow above.

## Commission System (Agency Sharing)

Commission is **negotiated per share request**, not inherited from the property default.

| Type         | Example         | Notes                                           |
|--------------|-----------------|-------------------------------------------------|
| `PERCENTAGE` | `2%`            | Applied to the property sale/rental price       |
| `FIXED`      | `3 500 TND`     | Flat amount regardless of price                 |
| None / zero  | `0`             | No commission — still requires explicit choice  |

Rules:
- `commissionPercentage` is stored on `PropertyShareRequest` (per-agency negotiation).
- Super Admin sets the commission before sending the request and can change type (PERCENTAGE ↔ FIXED) per agency.
- The `expectedCommissionAmount` is calculated server-side at response time (not stored) to always reflect the current price.
- `commissionPercentage` defaults to `0.0` in `@PrePersist`.

## Dashboard Revenue Rule

**Shared Super Admin properties sold by an agency count only the commission as agency revenue, not the full sale price.**

| Scenario                                                  | What counts as agency revenue               |
|-----------------------------------------------------------|---------------------------------------------|
| Agency sells its **own** (`AGENCY_OWNED`) property        | Full sale price                             |
| Agency sells a **shared** (`SUPER_ADMIN_OWNED`) property  | Commission only (e.g. 2% of 100 000 TND)   |

This rule must be enforced in the dashboard aggregation queries — never sum `prixVente` directly for shared properties.

## Security Rule

**Property visibility is always enforced on the backend.** The frontend never decides what data is shown — it only renders what the API returns. Key implementation points:

- `PropertyVisibilityService` is the single source of truth for access control
- `PropertyRepository.findVisiblePropertiesForAgency()` filters at the DB query level using the `PropertySharedAgency` table (only ACCEPTED shares)
- All protected controller endpoints call `SecurityUtils.getCurrentUser()` and delegate to `ForUser` service methods
- Return `403 FORBIDDEN` (not 404) when access is denied to a known resource

---

# CLIENT AFFILIATE MODULE

## Purpose

Client Affiliates are external sales partners who help sell properties in their assigned geographic zones and earn zone-based commissions. They are **not** internal staff and have no visibility into agency or platform management operations.

## Affiliate Account Lifecycle

Affiliates go through an approval workflow before gaining access:

| Status      | Meaning                                                        |
|-------------|----------------------------------------------------------------|
| `PENDING`   | Registration submitted; Super Admin must review                |
| `ACTIVE`    | Approved; can log in and access affiliate workspace            |
| `REJECTED`  | Application denied; login blocked                              |
| `SUSPENDED` | Access revoked by Super Admin; login blocked                   |

- Only Super Admin can approve, reject, or suspend affiliate accounts.
- Agency users have no visibility into affiliate registration requests.
- `User.isActive` is set to `true` only upon approval.
- `AffiliateProfile.status` tracks the workflow state separately from `User.isActive`.

## Affiliate Registration Flow

### Self-registration (public portal)
1. Affiliate fills `/register/affilie` form (name, email, password, zone selector — country+city dropdowns from `/api/properties/public/countries` + `/api/properties/public/cities`).
2. Frontend POSTs to `POST /api/affiliate/register` (public endpoint).
3. Backend creates a `User` (role=`AFFILIATE`, `isActive=false`) and an `AffiliateProfile` (status=`PENDING`). Saves one `AffiliateRegion` row from the submitted zone.
4. Super Admin receives an `AFFILIATE_REGISTRATION` notification and reviews in **Candidatures Affiliés** page → approve or reject with reason.
5. On approval: `AffiliateProfile.status` → `ACTIVE`, `User.isActive` → `true`. A `ClientInfo` row is auto-created so the affiliate appears in Gestion des clients.
6. Affiliate receives an `AFFILIATE_APPROVED` notification and can now log in.

### Admin-created affiliate (via Client Management)
When Super Admin creates a user with role `AFFILIATE` through the client-management UI, `ClientManagementService.createClient()` automatically:
- Creates the `User` with `isActive=true`
- Creates an `AffiliateProfile` with `status=ACTIVE` (skips the PENDING review step)
- Creates an `AffiliateRegion` populated with **both** the joined `ClientInfo.zoneRecherchee` (`"Country, City"` legacy field) **and** the explicit `country` + `city` columns + lowercase `regionName = city`.

This is the fast-path for trusted affiliates who don't need manual approval.

---

# AGENCY SELF-REGISTRATION MODULE

## Purpose

Agencies (ADMIN role) can register themselves via a public form instead of waiting for a Super Admin to create their account manually. The flow mirrors the affiliate approval workflow — accounts start PENDING and are blocked until Super Admin approves.

## Agency Registration Flow

1. Visitor fills `/register/agence` form (responsable info, agency name, email, password, telephone optional, description optional).
2. Frontend POSTs to `POST /api/register/agency` (public endpoint — `permitAll` in SecurityConfig).
3. Backend (`AgencyRegistrationService.register()`):
   - Validates email uniqueness.
   - Creates `User` (role=`ADMIN`, `isActive=false`) with `telephone=null` when field is blank (avoids unique-constraint violation on `users.telephone`).
   - Creates an `AgencyRegistrationApplication` row (status=`PENDING`).
4. Super Admin receives an `AGENCY_REGISTRATION` notification and reviews in **Candidatures Agences** page (`/admin/agency-applications`).
5. On **approve**: `User.isActive=true`, application status → `APPROVED`, `user.parent` set to the approving Super Admin (places the agency in the hierarchy tree). Sends `AGENCY_APPROVED` notification.
6. On **reject** (with reason): application status → `REJECTED`, `User.isActive` stays `false`. Sends `AGENCY_REJECTED` notification.
7. Approved agency can now log in and manages their own properties, agents, and clients.

## Agency Registration Backend API

- `POST /api/register/agency` — public self-registration
- `GET  /api/register/agency/pending` — Super Admin: list PENDING applications
- `GET  /api/register/agency/all` — Super Admin: list all applications
- `PUT  /api/register/agency/{id}/approve` — Super Admin approves
- `PUT  /api/register/agency/{id}/reject` — Super Admin rejects with reason

All management endpoints require `ROLE_SUPER_ADMIN`.

## Agency Registration Frontend Routes

| Route                        | Component                       | Auth        |
|------------------------------|---------------------------------|-------------|
| `/register`                  | `RegisterChoiceComponent`       | Public      |
| `/register/agence`           | `RegisterAgencyComponent`       | Public      |
| `/register/affilie`          | `RegisterAffiliateComponent`    | Public      |
| `/admin/agency-applications` | `AgencyApplicationsComponent`   | SUPER_ADMIN |

The `/register` choice page links to both `/register/agence` and `/register/affilie`. The admin login page has a "Pas encore de compte ? → Créer un compte" CTA linking to `/register`.

## Key Backend Entity

- `AgencyRegistrationApplication` — tracks the agency self-registration lifecycle. Links 1:1 to the `User` created at submission time. Fields: `status` (PENDING/APPROVED/REJECTED), `agencyName`, `description`, `rejectionReason`, `reviewedBy`, `reviewedAt`.
- On approval: `AgencyRegistrationService.approve()` sets `user.parent = approver` via injected `SecurityUtils` so the agency appears under the Super Admin in the hierarchy tree.

## Registration Form Rules

- **`telephone` optional on both forms.** The `users.telephone` column has `@Column(unique = true)`. Sending `""` (empty string) causes a unique constraint violation when two users register without a phone number. Both `AgencyRegistrationService` and `AffiliateService` guard: `user.setTelephone((tel != null && !tel.isBlank()) ? tel : null)`.
- Frontend components omit the field entirely when blank: `telephone: this.form.telephone || undefined`.
- `experienceLevel` and `notes` are likewise sent as `undefined` (not `""`) when blank.

---

# CLIENT AFFILIATE MODULE (continued)

### Editing an affiliate (via Client Management → Modifier client)
The Modifier client modal mirrors the Add Affiliate form for `role = AFFILIATE`:
- Common fields: `nom`, `prenom`, read-only `email`, `telephone`, `Compte actif` toggle.
- Affiliate-only zone editor: **Pays** dropdown + **Ville** dropdown sourced from `/api/properties/public/countries` and `/api/properties/public/cities` (only countries/cities where properties exist). The legacy `Budget estimé` and free-text `Zone recherchée` fields are hidden for affiliates.
- The form pre-loads existing zone by parsing `client.zoneRecherchee` (`"Country, City"`) and populating both dropdowns.
- On save, `ClientManagementService.updateClient()` rebuilds `clientInfo.zoneRecherchee`, then updates (or creates) the affiliate's active `AffiliateRegion` row with the new `country`, `city`, lowercase `regionName`.
- For non-affiliate clients, the modal keeps the legacy budget + free-text zone fields unchanged.

## Affiliate Commission Model

**Commission is stored ONLY on properties, never on zones.**

- `Property.commissionPercentage` — the commission rate an affiliate earns when they close a sale on that property.
- `AffiliateRegion` — geographic filter only. It has no `commissionPercentage` field. Zones determine which properties an affiliate can see and offer on; they do not set the payout rate.
- `SaleOffer` — snapshots `commissionPercentage` and `commissionAmount` at acceptance time from the property.
- `AffiliateTransaction` — records the final commission paid.

This was refactored from an earlier design where each zone carried its own commission rate. Any code that sets `commissionPercentage` on an `AffiliateRegion` or `RegionSelection` is wrong.

## Affiliate Property Access Rules

An affiliate sees only properties that satisfy **all** of the following:

- `Property.isActive = true` and `Property.statut = 'DISPONIBLE'`
- `Property.isAffiliateEligible = true` — toggled via the **"Visible pour les affiliés"** switch in the property-edit form (visible only when category = VENTE)
- `Property.commissionPercentage > 0` — commission must be set
- `Property.isReservedByAffiliate = false` — properties locked by an accepted offer are hidden from everyone but their winning affiliate
- Property is NOT in `LOCATION` category — the entity's `@PrePersist` forces `commissionPercentage = 0` and `isAffiliateEligible = false` for rentals, so they are intrinsically excluded
- **Strict country + city match** — `LOWER(p.country)|LOWER(p.city)` must equal one of the affiliate's `country|city` zone keys

Zone examples: `(Tunisia, Tunis)`, `(Tunisia, Sfax)`, `(France, Paris)` — backed by `AffiliateRegion` entity (separate `country` + `city` columns).

Backend enforcement: `AffiliateService.getEligiblePropertiesForAffiliate()` partitions the affiliate's regions:
- Strict regions (with both `country` and `city` set) → `propertyRepository.findEligiblePropertiesForAffiliateZoneKeys(zoneKeys)` matches `CONCAT(LOWER(p.country), '|', LOWER(p.city)) IN :zoneKeys`.
- Legacy regions (only `regionName` set) → `findEligiblePropertiesForAffiliateRegions(regionNames)` matches city or region by name (case-insensitive). Kept solely for backward compatibility with pre-migration data.

Comparisons are trimmed and lowercase to avoid case/whitespace mismatches.

## Zone Monetization System

Affiliates manage their geographic zones with the following rules:

| Rule                  | Value                                                      |
|-----------------------|------------------------------------------------------------|
| First zone            | Free (no payment required)                                 |
| Standard additional zone | 50 TND (manual wire transfer + proof upload)          |
| Premium additional zone  | 100 TND (zones with `demandScore >= 3`)               |
| Maximum zones         | 3 active zones per affiliate                               |

### Zone Types

- **Free** — First zone; affiliate can add it instantly via `POST /api/affiliate/add-zone` with `paymentConfirmed=true`.
- **Standard** — Paid zone (50 TND); affiliate submits a `ZonePaymentRequest` with wire transfer proof image.
- **Premium** — High-demand paid zone (100 TND); same workflow as standard.

### Zone Addition Flow

1. Affiliate views the **Zones d'expansion suggérées** widget on their dashboard.
2. For a free zone: multi-step modal → upload step → instant activation via `addZone()`.
3. For a paid zone: multi-step modal → **Step 1** (RIB/bank details + amount) → **Step 2** (upload wire transfer proof) → **Step 3** (confirmation: pending admin validation).
4. Backend creates a `ZonePaymentRequest` (status=`PENDING`), stores the proof image under `uploads/payments/`, notifies Super Admins via `ZONE_PAYMENT_SUBMITTED`.
5. Super Admin reviews in **Paiements zones** page → **Approve** (activates the zone, notifies affiliate via `ZONE_PAYMENT_APPROVED`) or **Reject** (sends reason, notifies affiliate via `ZONE_PAYMENT_REJECTED`).
6. On approval: `ZonePaymentService.activateZone()` creates an `AffiliateRegion` with `isPaid=true`, `pricePaid=amount`, `isPremium` from the request.

### Zone Removal

Affiliate can remove any of their zones via the dashboard zone tags (remove button → confirmation modal). Backend: `DELETE /api/affiliate/remove-zone/{regionId}`.

### Suggested Expansion Zones

`GET /api/affiliate/suggested-zones` returns top 5 zones outside the affiliate's current scope:
- Groups all affiliate-eligible properties by `(country, city)`
- Excludes the affiliate's current zones
- Computes `propertyCount`, `averageCommission` (from properties), `averagePrice`, `demandScore` (count of accepted/completed offers in zone)
- Opportunity score: `propertyCount × avgCommission + demandScore × 10`
- Each zone is priced: `demandScore >= 3` → premium (100 TND), else standard (50 TND); first zone if affiliate has 0 zones → free
- Endpoint returns `[]` and logs on internal error — **never propagates a 500 to the dashboard**

## Affiliate Sale Offer Workflow

Affiliates do **not** finalize sales — they submit sale offer proposals:

1. Affiliate finds a buyer and submits a `SaleOffer` with the buyer's contact info, offered price, and an optional message. The submission UI auto-fills the offered price with the property's current price and rejects values lower than that price (validated client- and server-side).
2. Submission is rejected if the property is inactive, not `DISPONIBLE`, not affiliate-eligible, **already reserved** (`isReservedByAffiliate = true`), or outside the affiliate's strict country+city zone.
3. The relevant property owner (Agency Admin for AGENCY_OWNED, Super Admin for SUPER_ADMIN_OWNED) is notified via `SALE_OFFER_RECEIVED`.
4. Owner responds: **Accept**, **Reject** (with reason), or leaves pending.
5. **On ACCEPTED**: the property is locked (`isReservedByAffiliate = true`) and **all sibling PENDING offers on the same property are auto-rejected** with reason `"Une autre offre a été retenue pour ce bien."`. Each losing affiliate is notified via `SALE_OFFER_REJECTED`. The accepted offer snapshots the commission percentage/amount at acceptance time.
6. **On COMPLETED**: the property's `statut` is flipped to its terminal state (`VENDU` for VENTE, `LOUE` for LOCATION) so it disappears from agency property management and never resurfaces in any listing. An `AffiliateTransaction` record is created. Super Admin can later mark the commission paid.

Sale Offer Statuses: `PENDING → ACCEPTED / REJECTED → COMPLETED / CANCELLED`

## Affiliate Ranking System

Monthly leaderboard based on accepted sales and commissions earned:

| Rank | Bonus Applied Next Month |
|------|--------------------------|
| 1st  | +2% commission bonus     |
| 2nd  | +1.5% commission bonus   |
| 3rd  | +1% commission bonus     |

- Bonuses are additive on top of the normal commission rate.
- Ranking is calculated from `AffiliateTransaction` records for the current month.
- `MonthlyBonusService` calculates and persists bonuses; Super Admin triggers calculation.
- Ranking resets each calendar month.
- The `/api/affiliate/ranking` endpoint is accessible to all authenticated roles (AFFILIATE, SUPER_ADMIN, ADMIN, RESPONSABLE_COMMERCIAL).

## Affiliate Workspace (Frontend)

| Route                         | Component                      | Purpose                            |
|-------------------------------|--------------------------------|------------------------------------|
| `/admin/affiliate-dashboard`  | `AffiliateDashboardComponent`  | KPIs, zones, expansion suggestions |
| `/admin/affiliate-properties` | `AffiliatePropertiesComponent` | Browse eligible properties         |
| `/admin/affiliate-offers`     | `AffiliateOffersComponent`     | Submit and track sale offers       |
| `/admin/affiliate-earnings`   | `AffiliateEarningsComponent`   | Commission transaction history     |
| `/admin/affiliate-ranking`    | `AffiliateRankingComponent`    | Monthly leaderboard (all roles)    |

## Super Admin Affiliate Management (Frontend)

| Route                           | Component                        | Purpose                                    |
|---------------------------------|----------------------------------|--------------------------------------------|
| `/admin/affiliate-applications` | `AffiliateApplicationsComponent` | Review PENDING affiliate registrations     |
| `/admin/affiliate-accounts`     | `AffiliateAccountsComponent`     | Manage all affiliate accounts              |
| `/admin/affiliate-ranking`      | `AffiliateRankingComponent`      | Full ranking with stats                    |
| `/admin/affiliate-commissions`  | `AffiliateCommissionsComponent`  | All transactions, mark paid                |
| `/admin/agency-applications`    | `AgencyApplicationsComponent`    | Review PENDING agency self-registrations   |
| `/admin/zone-payment-requests`  | `ZonePaymentRequestsComponent`   | Review zone payment proofs, approve/reject |

## Agency Admin + Super Admin Affiliate View

| Route                              | Component                         | Purpose                                                                                                                          |
|------------------------------------|-----------------------------------|----------------------------------------------------------------------------------------------------------------------------------|
| `/admin/affiliate-incoming-offers` | `AffiliateIncomingOffersComponent`| Accept/reject sale offers from affiliates (ADMIN loads via `GET /api/sale-offers/incoming`; SUPER_ADMIN loads via `GET /api/sale-offers`) |

## Affiliate Backend API

### Affiliate-facing (`/api/affiliate/**` — requires `ROLE_AFFILIATE`, except ranking)

- `POST /api/affiliate/register` — public registration
- `GET  /api/affiliate/my-profile` — own profile (returns default DTO if profile missing)
- `GET  /api/affiliate/properties` — eligible properties by zone (empty if not ACTIVE)
- `GET  /api/affiliate/stats` — personal KPIs and offer counts
- `GET  /api/affiliate/ranking` — monthly leaderboard (**accessible to ALL authenticated roles** — SecurityConfig has a specific `authenticated()` rule for this path before the AFFILIATE wildcard)
- `GET  /api/affiliate/my-ranking` — own ranking position (AFFILIATE only)
- `GET  /api/affiliate/transactions` — own commission history (AFFILIATE only)
- `GET  /api/affiliate/regions` — own assigned zones (AFFILIATE only)
- `GET  /api/affiliate/suggested-zones` — top 5 expansion zones (AFFILIATE only; returns `[]` on internal error, never 500)
- `POST /api/affiliate/add-zone` — add a zone (free first zone with `paymentConfirmed=true`; paid zones require prior approved `ZonePaymentRequest`)
- `DELETE /api/affiliate/remove-zone/{regionId}` — remove an active zone

### Zone Payment (`/api/zone-payments/**`)

- `POST /api/zone-payments` — multipart; affiliate submits proof image for a paid zone (`ROLE_AFFILIATE`)
- `GET  /api/zone-payments/my-requests` — affiliate's own payment requests (`ROLE_AFFILIATE`)
- `GET  /api/zone-payments/proof/{filename}` — serve proof image (`ROLE_SUPER_ADMIN`)

### Super Admin Zone Payment Management (`/api/admin/zone-payments/**` — `ROLE_SUPER_ADMIN`)

- `GET /api/admin/zone-payments` — all payment requests
- `GET /api/admin/zone-payments/pending` — only PENDING requests
- `PUT /api/admin/zone-payments/{id}/approve` — approve: activates zone, notifies affiliate
- `PUT /api/admin/zone-payments/{id}/reject` — reject with reason, notifies affiliate

### Sale Offers (`/api/sale-offers/**` — authenticated, method-level `@PreAuthorize`)

- `POST /api/sale-offers` — affiliate submits a sale offer
- `GET  /api/sale-offers/my-offers` — affiliate's own offers
- `DELETE /api/sale-offers/{id}/cancel` — affiliate cancels a PENDING offer
- `GET  /api/sale-offers/incoming` — agency admin sees incoming offers
- `PUT  /api/sale-offers/{id}/respond` — agency admin accepts or rejects
- `PUT  /api/sale-offers/{id}/complete` — mark offer as completed

### Super Admin Affiliate Management (`/api/admin/affiliates/**` — requires `ROLE_SUPER_ADMIN`)

- `GET    /api/admin/affiliates` — list all affiliates
- `GET    /api/admin/affiliates/pending` — list PENDING applications
- `GET    /api/admin/affiliates/{id}` — single affiliate profile
- `GET    /api/admin/affiliates/{id}/stats` — affiliate statistics
- `PUT    /api/admin/affiliates/{id}/approve` — approve affiliate
- `PUT    /api/admin/affiliates/{id}/reject` — reject with reason
- `PUT    /api/admin/affiliates/{id}/suspend` — suspend with reason
- `PUT    /api/admin/affiliates/{id}/activate` — re-activate
- `GET    /api/admin/affiliates/ranking` — admin ranking view
- `GET    /api/admin/affiliates/transactions` — all commission transactions
- `PUT    /api/admin/affiliates/transactions/{id}/pay` — mark commission paid
- `POST   /api/admin/affiliates/bonuses/calculate` — calculate monthly bonuses
- `POST   /api/admin/affiliates/bonuses/apply` — apply bonuses to profiles

## Key Backend Entities

- `AffiliateProfile` — tracks status, bonus, approval metadata; linked 1:1 to `User`
- `AffiliateRegion` — affiliate's assigned geographic zone. Stores `country`, `city`, lowercase `regionName`, `isPaid` (boolean), `pricePaid` (Double), `isPremium` (boolean). **No `commissionPercentage` field** — commission lives only on properties. `@PrePersist` defaults `isActive=true`, `isPaid=false`, `isPremium=false`.
- `ZonePaymentRequest` — manual payment proof record. Fields: `affiliate` (User), `country`, `city`, `zoneName`, `amount`, `isPremium`, `proofImagePath` (filename under `uploads/payments/`), `status` (PENDING/APPROVED/REJECTED), `rejectionReason`, `reviewedBy`, `reviewedAt`, `createdAt`. On approval, `ZonePaymentService.activateZone()` creates the `AffiliateRegion` row. Proof images are served at `GET /api/zone-payments/proof/{filename}` (SUPER_ADMIN only).
- `Property` — has `isReservedByAffiliate` flag (set true on offer ACCEPTED, kept true after COMPLETED). For `LOCATION` category the entity's `@PrePersist` force-resets `commissionPercentage = 0`, `commissionType = "PERCENTAGE"`, `basePriceForCommission = null`, `isAffiliateEligible = false`, `isReservedByAffiliate = false` — so rentals can never enter the affiliate workflow even via direct API calls.
- `SaleOffer` — sale proposal submitted by affiliate; links affiliate, property, and buyer info. On ACCEPTED, snapshots commission % + amount and triggers sibling auto-rejection.
- `AffiliateTransaction` — completed commission record; tracks paid/unpaid state
- `AffiliateActivity` — tracks VIEW/SHARE/CONTACT/VISIT actions for analytics
- `MonthlyBonus` — persisted ranking bonus records per affiliate per month
- `Notification` — `type` column is `VARCHAR(50)` (not MySQL ENUM); column must be VARCHAR to support all `NotificationType` values. If migrating from an older schema, run: `ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL;`

## Frontend Model Alignment

`affiliate.model.ts` must mirror backend DTOs exactly. Key field names:

| Backend DTO field      | Frontend model field   |
|------------------------|------------------------|
| `email`                | `email`                |
| `nom`                  | `nom`                  |
| `prenom`               | `prenom`               |
| `telephone`            | `telephone`            |
| `hasBonusActive`       | `hasBonusActive`       |
| `totalRevenue`         | `totalRevenue`         |
| `transactionDate`      | `transactionDate`      |
| `propertyPrice`        | `propertyPrice`        |
| `paymentDate`          | `paymentDate`          |

`AffiliateRegionDTO` has `isPaid`, `pricePaid`, `isPremium` — **no `commissionPercentage`**.
`SuggestedZoneDTO` has `price: number`, `isPremium: boolean`, `city?: string` in addition to the demand/stats fields.
`AddZoneRequest` has `country`, `city`, `paymentConfirmed?` — **no `commissionPercentage`**.
`ZonePaymentRequestDTO` has `id`, `affiliateId/Name/Email`, `country`, `city`, `zoneName`, `amount`, `isPremium`, `proofImageUrl`, `status` (PENDING/APPROVED/REJECTED), `rejectionReason`, `reviewedByName`, `reviewedAt`, `createdAt`.

---

# PUBLIC CLIENT PORTAL

## Purpose

A premium marketplace-style portal where visitors and registered public clients
browse properties without ever entering the admin shell. Completely isolated
from the agency/affiliate workspaces — different layout, different routes,
different auth store, different token. The only thing it shares with the admin
side is the backend property data and the JWT signing secret.

## Frontend Routes (`maison3d-immobilier/src/app/public/`)

| Route                | Component                                | Auth                              |
|----------------------|------------------------------------------|-----------------------------------|
| `/`                  | `PublicHomeComponent`                    | Public                            |
| `/biens/vente`       | `PublicListingComponent` (mode=VENTE)    | Public                            |
| `/biens/location`    | `PublicListingComponent` (mode=LOCATION) | Public                            |
| `/biens/:id`         | `PublicPropertyDetailComponent`          | Public                            |
| `/compte/login`      | `PublicLoginComponent`                   | Public                            |
| `/compte/register`   | `PublicRegisterComponent`                | Public                            |
| `/compte/dashboard`  | `PublicDashboardComponent`               | `clientAuthGuard` (CLIENT_PUBLIC) |

All public routes are nested under `PublicLayoutComponent` — its own header
(brand + nav + login/avatar) and footer, fully separate from the admin shell.
Legacy `/property/:id` redirects to `/biens/:id` for backward compatibility.

## Public Browsing Visibility

Visitors see any property where `isActive = true AND statut = 'DISPONIBLE'`.
The vente/location split is by price field (`prixVente > 0` vs `prixLocation > 0`).
Multi-tenant share-request gating does NOT apply to the public portal — that
restriction only governs the internal admin views.

## Public Portal Backend API (`/api/properties/public/portal/**` — `permitAll`)

- `GET /vente` — sale listings; filters: `q, country, city, type, minPrice, maxPrice, minSurface, maxSurface, minRooms`
- `GET /location` — rental listings; same filter set
- `GET /featured/vente?limit=N`, `GET /featured/location?limit=N` — homepage grids
- `GET /{id}` — detail (gallery URLs, video URLs, 3D model URL, agency name, map coords)
- `GET /{id}/similar?limit=N` — same-city/same-type fallbacks
- `GET /facets/{countries|cities|types}` — filter dropdown data

Detail DTO uses these media URL prefixes (must match the SecurityConfig
`permitAll` rules exactly): `/api/images/public/{id}`, `/api/videos/public/{id}`,
`/api/models/public/{id}`. Wrong prefix → 403 from the public-asset filter.

## Client Public Auth (`/api/client/auth/**`)

- `POST /register` — `permitAll`. Creates `User(role=CLIENT_PUBLIC, isActive=true)`
  and immediately returns a JWT. No approval workflow.
- `POST /login` — `permitAll`. Refuses non-`CLIENT_PUBLIC` accounts so admins
  cannot accidentally log into the public space and vice versa.
- `GET /me` — `hasRole('CLIENT_PUBLIC')`. Returns the current profile.

Service `ClientPublicAuthService` lives separate from `AuthService`. Tokens
share the same JWT signing secret but the role claim (`CLIENT_PUBLIC`) is what
gates everything downstream.

## Interest Request Workflow ("Intéressé par ce bien")

1. Public client clicks the CTA on `/biens/:id`.
2. **Not logged in** → redirected to `/compte/login?redirect=/biens/{id}`.
   Login bounces back to the same property after success.
3. **Logged in** → `InterestModalComponent` opens, prefilled with the user's
   name + phone. Fields: `fullName`, `telephone`, `proposedBudget` (optional),
   `message`.
4. Submit → `POST /api/client/interests`. `InterestRequestService.submit()`:
   - Creates an `InterestRequest` row (status=PENDING).
   - Resolves the property's owner: `agencyAdmin` for `AGENCY_OWNED`, first
     SUPER_ADMIN for `SUPER_ADMIN_OWNED`.
   - **Per-agency CRM lead auto-creation**: if the public client has no
     `ClientInfo` row tied to that `agencyAdminId` yet, creates one with
     `visibilityType=AGENCY_CLIENT` and `source="Portail public — Intéressé"`.
     Idempotent — repeat interest from the same client to the same agency
     reuses the existing row.
   - **Multi-agency rule**: same client → property B from a different agency
     → a NEW `ClientInfo` row in that other agency's CRM. Never share leads
     across agencies.
   - Sends `PROPERTY_INTEREST_RECEIVED` notification to the owner.
5. Public client sees the submission on `/compte/dashboard` under
   "Mes biens d'intérêt".

`GET /api/client/interests/mine` returns the current client's submissions.

---

# CRM LEAD WORKFLOW (Admin side)

## Lead Pipeline

When a public client submits "Intéressé par ce bien", an `InterestRequest` (lead) is created at `PENDING`. Admins advance it through the pipeline:

```
PENDING → CONTACTED → VISITE_PROGRAMMEE → EN_NEGOCIATION
                                                ↓
                              CONVERTI_VENTE | CONVERTI_LOCATION | REFUSE
```

**Terminal states** (CONVERTI_VENTE, CONVERTI_LOCATION, REFUSE) lock the lead permanently — no further changes allowed.

## Category-Conditional Conversion

The conversion options shown in the UI depend on the property's category:

| Property category | Allowed terminal statuses        |
|-------------------|----------------------------------|
| VENTE             | CONVERTI_VENTE, REFUSE           |
| LOCATION          | CONVERTI_LOCATION, REFUSE        |

The backend validates this at `PUT /api/admin/interests/{id}/convert` and rejects invalid combinations.

## Conversion Effects

### CONVERTI_VENTE
- `property.statut → VENDU`, `property.isFinalized = true`
- All other **active** leads on the same property are auto-refused (`LEAD_AUTO_REFUSED` notification to each losing client)
- Lead locked. Owner notified via `LEAD_CONVERTED_SALE`.

### CONVERTI_LOCATION
- `property.statut → LOUE`
- Rental contract fields stored on the lead: `rentalStartDate`, `rentalEndDate` (= start + duration), `rentalDurationMonths`, `rentalAmount`, `rentalNotes`
- Same property fields updated: `property.rentalStartDate`, `property.rentalEndDate`, `property.rentalDurationMonths`
- All sibling active leads auto-refused. Owner notified via `LEAD_CONVERTED_RENTAL`.
- **Rental end date is auto-calculated**: `rentalEndDate = rentalStartDate + rentalDurationMonths months`.

### REFUSE
- Lead locked with optional `rejectionMessage`
- Public client notified via `LEAD_REFUSED`
- A refused lead can only be "re-opened" if the client submits a **new** "Intéressé" request — which creates a fresh `InterestRequest` row. The old one stays archived.

## Multi-Client / Auto-Refuse Rule

A property can have multiple concurrent active leads (one per interested client). When any lead is converted:
1. The converted lead is locked with the new status.
2. Every other non-terminal lead on the **same property** is immediately set to REFUSE + locked.
3. Each losing client receives a `LEAD_AUTO_REFUSED` notification.

This is enforced by `InterestRequestService.autoRefuseSiblings()` called inside `convertLead()`.

## Rental Expiry Scheduler

`RentalExpiryScheduler` runs daily at **02:00** (`@Scheduled(cron = "0 0 2 * * *")`):
- Queries `Property` rows where `statut = 'LOUE'` AND `rentalEndDate < NOW()`
- For each expired rental:
  - `property.statut → DISPONIBLE`
  - `property.rentalStartDate/EndDate/DurationMonths` cleared
  - Agency admin (or all super admins if no agency) notified via `PROPERTY_AVAILABLE_AGAIN`
- Each property is processed independently; an error on one does not stop others.

## Admin-Side API

All endpoints are at `/api/admin/interests/**` (admin JWT required — never `/api/client/interests/**` which uses the client token).

- `GET  /api/admin/interests/my-leads` — all leads where the caller is the property owner
- `PUT  /api/admin/interests/{id}/status` — non-terminal pipeline moves (PENDING → CONTACTED → VISITE_PROGRAMMEE → EN_NEGOCIATION); rejects terminal statuses
- `PUT  /api/admin/interests/{id}/convert` — terminal transition (`ConvertLeadRequest` body with `targetStatus` + optional rental/refusal fields)

## ConvertLeadRequest DTO

```json
{
  "targetStatus": "CONVERTI_LOCATION",
  "rentalStartDate": "2026-06-01",
  "rentalDurationMonths": 12,
  "rentalAmount": 800,
  "rentalNotes": "Caution 2 mois",
  "rejectionMessage": null
}
```

For `CONVERTI_LOCATION`, `rentalStartDate` and `rentalDurationMonths` (≥ 1) are mandatory. For `REFUSE`, all rental fields are ignored; `rejectionMessage` is optional.

## Frontend Lead Card Behaviour

- Dropdown is filtered by property category (no CONVERTI_LOCATION shown for VENTE properties and vice versa).
- Selecting CONVERTI_VENTE → confirmation modal (warns about auto-refuse of siblings).
- Selecting CONVERTI_LOCATION → rental contract modal (start date, duration, amount, notes; end date previewed live).
- Selecting REFUSE → refusal modal with optional message field.
- Locked leads show a coloured ribbon (green = converted, red = refused) and a "Lecture seule" label. Contact buttons (call, WhatsApp, email) remain clickable even on locked leads.
- After conversion, `loadProperties()` is re-called to reflect the updated `statut` on the property card.

## Working Rules

- **Never call terminal transitions through `PUT /{id}/status`** — that endpoint rejects CONVERTI_* and REFUSE and instructs the caller to use `/convert`. This prevents accidental locking without the proper modal confirmation.
- **Terminal state is final.** There is no "unlock" endpoint. If a conversion was wrong, the property status must be corrected directly via the property update endpoint; a new lead must be submitted by the client.
- **The `status` column is `VARCHAR(50)`, not VARCHAR(20).** `VISITE_PROGRAMMEE` is 18 chars; `CONVERTI_LOCATION` is 17 chars. Any migration from an old schema must run: `ALTER TABLE interest_requests MODIFY COLUMN status VARCHAR(50) NOT NULL;`
- **Rental contract fields live on `InterestRequest`, not a separate table.** One lead = one contract snapshot. Do not add a separate `RentalContract` entity unless the domain genuinely needs contract amendments.
- **Auto-refuse siblings happens inside the same transaction as the conversion.** If the sibling notifications fail (e.g. a recipient user was deleted), that must not roll back the conversion. Wrap notification calls so they never bubble exceptions.

## 3D Model Viewer

Inline rendering uses Google's `<model-viewer>` web component, loaded once
via `<script type="module" src="…@google/model-viewer…">` in `index.html`.
The detail page declares `schemas: [CUSTOM_ELEMENTS_SCHEMA]` to accept the
custom element. **Never** stream a GLB/GLTF directly into an `<iframe>` —
browsers treat it as a download and prompt the user to install something.

## Key Public Portal Backend Entities

- `User.role = CLIENT_PUBLIC` — distinct from the legacy in-agency `CLIENT`.
- `InterestRequest` — links public client + property + owner-at-submission.
  Full status pipeline: `PENDING → CONTACTED → VISITE_PROGRAMMEE → EN_NEGOCIATION → CONVERTI_VENTE / CONVERTI_LOCATION / REFUSE`.
  Terminal states are **locked** — no further status changes are possible.
  `status` column is `VARCHAR(50)` (not 20 — VISITE_PROGRAMMEE is 18 chars).
- `users.role` column **must be VARCHAR(40)**, not MySQL ENUM. Same trap as
  `notifications.type` — a fresh role added to the enum will trigger
  `Data truncated for column 'role'` until you run:
  `ALTER TABLE users MODIFY COLUMN role VARCHAR(40) NOT NULL;`

---

# ROLE VISIBILITY & UI ISOLATION

## Rule

Each role sees **only** the interface that belongs to their scope. No role can access another role's workspace — neither through the UI nor by manually typing a URL.

## AFFILIATE Isolation (Strict)

An AFFILIATE user must **never** see or access:

- Super Admin dashboard or management tools
- Agency Admin interface
- Responsable Commercial / Commercial space
- Internal staff analytics or settings
- Property management forms
- Client, agent, or user management pages

An AFFILIATE user **only** accesses:

- Affiliate Dashboard
- Available Properties (zone-filtered)
- My Offers
- My Earnings
- Monthly Ranking
- Notifications
- Their own Profile

## Implementation

### Frontend Guard (`AdminAuthGuard`)

```
affiliateAllowedRoutes = [
  /admin/affiliate-dashboard,
  /admin/affiliate-properties,
  /admin/affiliate-offers,
  /admin/affiliate-earnings,
  /admin/affiliate-ranking
]

if role === AFFILIATE AND url not in affiliateAllowedRoutes:
  → redirect to /admin/affiliate-dashboard
  → return false
```

### Sidebar (`admin-component.html`)

The sidebar uses `ng-container *ngIf="currentUser?.role !== 'AFFILIATE'"` to wrap all internal menu items. AFFILIATE users see only their 5-item workspace menu. No admin menus, quick actions, or settings links are rendered.

### API Calls (`admin-component.ts`)

`loadCounts()` returns immediately for AFFILIATE role — no calls to `/api/dashboard/client-count` or property-count APIs that would return 403.

### Backend Security

Spring Security enforces role checks at every API endpoint:
- `GET /api/affiliate/ranking` → `authenticated()` — listed **before** the wildcard rule so all roles can reach the ranking page
- `/api/affiliate/**` → `hasRole('AFFILIATE')` (security config wildcard — evaluated after the ranking exception above)
- `/api/admin/affiliates/**` → `hasRole('SUPER_ADMIN')` (class-level `@PreAuthorize`)
- `/api/admin/zone-payments/**` → `hasRole('SUPER_ADMIN')`
- `/api/zone-payments/proof/**` → `hasRole('SUPER_ADMIN')` — proof images secured; use blob fetch (not `<img src>`) since browser img tags never send JWT headers
- `/api/sale-offers/**` → authenticated + method-level `@PreAuthorize` per operation
- `/api/notifications/**` → `authenticated()` — must be listed explicitly so all roles (including AFFILIATE) can fetch their own notifications and unread count without 403

Frontend role checks are UX only. Backend is always the authoritative security layer.

## Default Route by Role

| Role                                                   | Post-login redirect           |
|--------------------------------------------------------|-------------------------------|
| SUPER_ADMIN, ADMIN, RESPONSABLE_COMMERCIAL, COMMERCIAL | `/admin/dashboard`            |
| AFFILIATE                                              | `/admin/affiliate-dashboard`  |

---

# NOTIFICATION MODULE

## Purpose

Users receive in-app notifications for all key lifecycle events relevant to their role.

## Notification Types

| Type                         | Recipient                       | Trigger                                                                                                         |
|------------------------------|---------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `SHARE_REQUEST_RECEIVED`     | Agency Admin                    | Super Admin sends a share request                                                                               |
| `SHARE_REQUEST_ACCEPTED`     | Super Admin                     | Agency accepts the request                                                                                      |
| `SHARE_REQUEST_REJECTED`     | Super Admin                     | Agency rejects the request                                                                                      |
| `SHARE_REQUEST_CANCELLED`    | Agency Admin                    | Super Admin cancels a PENDING request                                                                           |
| `AFFILIATE_REGISTRATION`     | Super Admin                     | New affiliate registration submitted                                                                            |
| `AFFILIATE_APPROVED`         | Affiliate                       | Super Admin approves the affiliate account                                                                      |
| `AFFILIATE_REJECTED`         | Affiliate                       | Super Admin rejects the affiliate account                                                                       |
| `AFFILIATE_SUSPENDED`        | Affiliate                       | Super Admin suspends the affiliate account                                                                      |
| `SALE_OFFER_RECEIVED`        | Agency Admin **or** Super Admin | Affiliate submits a sale offer; Agency Admin for AGENCY_OWNED, Super Admin for SUPER_ADMIN_OWNED                |
| `SALE_OFFER_ACCEPTED`        | Affiliate                       | Agency admin accepts the sale offer                                                                             |
| `SALE_OFFER_REJECTED`        | Affiliate                       | Agency admin rejects the sale offer                                                                             |
| `SALE_OFFER_COMPLETED`       | Affiliate                       | Sale offer marked as completed                                                                                  |
| `MONTHLY_BONUS_AWARDED`      | Affiliate                       | Affiliate receives a ranking bonus                                                                              |
| `PROPERTY_INTEREST_RECEIVED` | Agency Admin **or** Super Admin | Public client clicks "Intéressé par ce bien"                                                                    |
| `AGENCY_REGISTRATION`        | Super Admin                     | New agency self-registration submitted                                                                          |
| `AGENCY_APPROVED`            | Agency Admin                    | Super Admin approves the agency account                                                                         |
| `AGENCY_REJECTED`            | Agency Admin                    | Super Admin rejects the agency account                                                                          |
| `ZONE_PAYMENT_SUBMITTED`     | Super Admin                     | Affiliate uploads a wire transfer proof to unlock a paid zone                                                   |
| `ZONE_PAYMENT_APPROVED`      | Affiliate                       | Super Admin approves the zone payment — zone is now active                                                      |
| `ZONE_PAYMENT_REJECTED`      | Affiliate                       | Super Admin rejects the zone payment with a reason                                                              |
| `LEAD_REFUSED`               | Public client                   | Admin refuses the client's interest request (with optional message)                                             |
| `LEAD_CONVERTED_SALE`        | Admin / agency                  | Lead converted → property set VENDU                                                                             |
| `LEAD_CONVERTED_RENTAL`      | Admin / agency                  | Lead converted → property set LOUE (with rental contract dates)                                                 |
| `LEAD_AUTO_REFUSED`          | Public client                   | Another buyer was selected for the property; sibling leads auto-refused                                         |
| `PROPERTY_AVAILABLE_AGAIN`   | Admin / agency                  | Daily scheduler: rental period expired, property automatically reset to DISPONIBLE                              |
| `SALE_APPROVAL_REQUESTED`    | Property owner (Admin/SuperAdmin)| Cross-ownership validation: requester submitted a sale/rental for owner approval                                |
| `SALE_APPROVAL_GRANTED`      | Requester                       | Property owner approved the cross-ownership sale/rental request                                                  |
| `SALE_APPROVAL_REJECTED`     | Requester                       | Property owner rejected the cross-ownership sale/rental request                                                  |

`NotificationType` is a Java enum stored as `VARCHAR(50)` in MySQL — **not** a MySQL ENUM column. If migrating an older schema: `ALTER TABLE notifications MODIFY COLUMN type VARCHAR(50) NOT NULL;`

## Implementation

- **Backend**: `Notification` entity + `NotificationService` + `NotificationController`
- **Frontend**: `NotificationService` (Angular) polls `/api/notifications/unread-count` every 30 seconds using `interval(30_000).pipe(startWith(0), switchMap(…))`
- Unread count is surfaced as a `BehaviorSubject<number>` (`unreadCount$`) consumed by the header bell badge
- The notification panel (click-toggle, not hover) shows the latest 6 notifications with relative timestamps; clicking an item marks it read and navigates to the relevant page
- Clicking a notification routes to the appropriate page based on `type` + `role`:
  - `SHARE_REQUEST_*` → ADMIN: `/admin/incoming-share-requests`, others: `/admin/share-requests`
  - `AFFILIATE_REGISTRATION` + SUPER_ADMIN → `/admin/affiliate-applications`
  - `AFFILIATE_APPROVED/REJECTED/SUSPENDED` + AFFILIATE → `/admin/affiliate-dashboard`
  - `SALE_OFFER_RECEIVED` + ADMIN **or SUPER_ADMIN** → `/admin/affiliate-incoming-offers`
  - `SALE_OFFER_ACCEPTED/REJECTED/COMPLETED` + AFFILIATE → `/admin/affiliate-offers`
  - `MONTHLY_BONUS_AWARDED` + AFFILIATE → `/admin/affiliate-dashboard`
  - `AGENCY_REGISTRATION` + SUPER_ADMIN → `/admin/agency-applications`
  - `AGENCY_APPROVED/REJECTED` + ADMIN → `/admin/dashboard`
  - `ZONE_PAYMENT_SUBMITTED` + SUPER_ADMIN → `/admin/zone-payment-requests`
  - `ZONE_PAYMENT_APPROVED/REJECTED` + AFFILIATE → `/admin/affiliate-dashboard`
  - `SALE_APPROVAL_REQUESTED` → `/admin/sale-validations` (for any role — owner clicks to approve/reject)
  - `SALE_APPROVAL_GRANTED` / `SALE_APPROVAL_REJECTED` → `/admin/sale-validations` (requester sees status)

## Notification API

- `GET  /api/notifications` — all notifications for current user
- `GET  /api/notifications/unread-count` — `{ count: number }`
- `PUT  /api/notifications/{id}/read` — mark one as read
- `PUT  /api/notifications/read-all` — mark all as read

---

# CROSS-OWNERSHIP SALE VALIDATION WORKFLOW

## Purpose

When a staff member (COMMERCIAL, RESPONSABLE_COMMERCIAL, or even ADMIN) tries to close a sale or rental on a property they do not own, the system cannot finalise the transaction directly. Instead, it creates a **pending validation request** that the property owner must approve or reject. This enforces a clean chain of authority across multi-tenant and cross-agency transactions.

## Ownership Rules

`PropertyOwnershipService.isOwner(user, property)` is the single source of truth:

| Property `ownerType`   | Who is the owner                                                      |
|------------------------|-----------------------------------------------------------------------|
| `SUPER_ADMIN_OWNED`    | Only SUPER_ADMIN                                                      |
| `AGENCY_OWNED`         | The `agencyAdmin` User (ADMIN) of that property's agency              |
| `null` (legacy)        | Nobody specific — no validation required (treated as ownerless)       |

For `AGENCY_OWNED`, non-ADMIN internal users (COMMERCIAL, RESPONSABLE_COMMERCIAL) are resolved to their top ADMIN ancestor via `userRepository.findTopAdminAncestor(userId)`. If that ancestor matches the property's `agencyAdmin`, they are considered the owner.

`requiresValidation(user, property)` = `!isOwner(user, property)`.

## When Validation Is Triggered

Two entry points both call `saleValidationService.isPropertyOwner()` and create a request if the requester is not the owner:

1. **Direct sale path** — `PropertyService.processDirectSale()`:
   - If requester does NOT own the property → `SaleValidationService.createForDirectSale(property, req, requester)` → returns early (property status: `EN_ATTENTE_VALIDATION`)
   - If requester OWNS the property → `completeValidatedDirectSale()` runs immediately

2. **CRM lead conversion path** — `InterestRequestService.convertLead()`:
   - `REFUSE` never requires validation (no ownership change).
   - For `CONVERTI_VENTE` / `CONVERTI_LOCATION` + non-owner → `SaleValidationService.createForCrmLead(...)` → lead stays unlocked, returns as-is
   - For owner → inline conversion proceeds immediately

## Workflow States

```
[Requester] → createForDirectSale / createForCrmLead
                          ↓
              SaleValidationRequest (status = PENDING)
              property.statut = EN_ATTENTE_VALIDATION
                          ↓
              Owner notified: SALE_APPROVAL_REQUESTED
                     ↙              ↘
             approve()            reject()
                ↓                    ↓
     complete sale/rental    property → DISPONIBLE
     notify requester:       notify requester:
     SALE_APPROVAL_GRANTED   SALE_APPROVAL_REJECTED
```

## Property Status During Validation

`EN_ATTENTE_VALIDATION` is a transient status set while a validation request is PENDING. The property is effectively locked:
- Not DISPONIBLE → no new leads or affiliate offers accepted
- Not VENDU/LOUE → not shown as finalised

On approval → property moves to VENDU or LOUE (via the normal completion path).
On rejection → property reverts to DISPONIBLE.

## Approve Path (by source)

`SaleValidationService.approve(id, reviewer)`:

- **DIRECT_SALE**: reconstructs a `DirectSaleRequest` from the stored SVR fields → calls `propertyService.completeValidatedDirectSale(property, req, reviewer)` which runs the same logic as a direct sale by the owner (marks VENDU/LOUE, applies rental fields, etc.)
- **CRM_LEAD**: calls `completeLeadConversion(svr, property, targetStatus, reviewer)` inline — sets property statut, locks the lead as CONVERTI_VENTE or CONVERTI_LOCATION, auto-refuses sibling leads, notifies losing clients via `LEAD_AUTO_REFUSED`

Both paths then set `svr.status = APPROVED`, record `reviewedBy` + `reviewedAt`, and send `SALE_APPROVAL_GRANTED` to the requester.

## Reject Path

`SaleValidationService.reject(id, reviewer, reason)`:
- Property reverts to `DISPONIBLE`
- `svr.status = REJECTED`, optional `rejectionReason` stored
- Requester notified via `SALE_APPROVAL_REJECTED`

## Circular Dependency Resolution

`PropertyService` injects `SaleValidationService` (to create validation requests when a non-owner tries to close a deal). `SaleValidationService` injects `PropertyService` (to complete an approved direct-sale validation). This is a circular dependency.

**Solution**: `SaleValidationService` uses an **explicit constructor** with `@Lazy PropertyService propertyService`. The ownership check itself is moved to `PropertyOwnershipService` (a neutral service with no back-references), which both services can inject without cycles.

## Backend Components

- `PropertyOwnershipService` — `isOwner(User, Property)` and `requiresValidation(User, Property)`. No circular deps.
- `SaleValidationRequest` (entity) — fields: `property`, `requester`, `buyer` (nullable), `clientNom/Prenom/Email/Tel`, `targetStatus` (VENDU/LOUE), `source` (DIRECT_SALE/CRM_LEAD), `interestRequest` (nullable), rental fields, `status` (PendingSaleApprovalStatus), `rejectionReason`, `reviewedBy`, `reviewedAt`, `createdAt`. `@PrePersist` sets `status = PENDING`.
- `SaleValidationRequestRepository` — JPQL queries:
  - `findPendingForAgencyAdmin(adminId)` — AGENCY_OWNED pending requests where agencyAdmin matches
  - `findPendingForSuperAdmin()` — SUPER_ADMIN_OWNED pending requests
  - `findByRequesterIdOrderByCreatedAtDesc(requesterId)` — requester's history
  - `findByPropertyIdAndStatus(propertyId, status)` — uniqueness guard
  - `countPendingForAgencyAdmin(adminId)` / `countPendingForSuperAdmin()` — sidebar badge
- `SaleValidationRequestDTO` — static factory `from(SaleValidationRequest, apiBase)` builds absolute image URL
- `SaleValidationService` — business logic (see above)
- `SaleValidationController` — `@PreAuthorize("hasAnyRole('SUPER_ADMIN','ADMIN','RESPONSABLE_COMMERCIAL','COMMERCIAL')")`
  - `GET /api/sale-validations/pending-for-me` — owner's pending validations
  - `GET /api/sale-validations/my-requests` — requester's sent requests
  - `GET /api/sale-validations/pending-count` — `{ count: N }` for sidebar badge
  - `PUT /api/sale-validations/{id}/approve` — owner approves
  - `PUT /api/sale-validations/{id}/reject` — owner rejects (body: `{ "reason": "…" }`)

Security config: `.requestMatchers("/api/sale-validations/**").hasAnyRole("SUPER_ADMIN", "ADMIN", "RESPONSABLE_COMMERCIAL", "COMMERCIAL")`

## Frontend Components

- `sale-validation.service.ts` — Angular HTTP service (`admin/services/`): `getPendingForMe()`, `getMyRequests()`, `getPendingCount()`, `approve(id)`, `reject(id, reason)`
- `SaleValidationsComponent` (`admin/sale-validations/`) — Two-tab page:
  - **"Validations à traiter"** — Cards for pending approvals (property thumbnail, requester/buyer info, rental contract details). Approve button → confirmation modal (warns about auto-refuse siblings + irreversibility). Reject button → modal with optional reason textarea.
  - **"Mes demandes envoyées"** — Table view of sent requests with status (PENDING / APPROVED / REJECTED) and rejection reason.
- Route: `/admin/sale-validations` registered in `app.routes.ts`
- Sidebar: "Validations" menu item (all non-affiliate roles) with red badge showing `pendingValidationsCount`
- `admin-component.ts`:
  - `pendingValidationsCount: number` field
  - `loadValidationCount()` called on login + every 60 seconds via `interval(60000)`
  - `SALE_APPROVAL_REQUESTED` → navigate to `/admin/sale-validations`
  - `SALE_APPROVAL_GRANTED` / `SALE_APPROVAL_REJECTED` → navigate to `/admin/sale-validations`
- Notification panel footer shows "Voir les validations (N)" when `pendingValidationsCount > 0`

## Working Rules

- **`EN_ATTENTE_VALIDATION` is the only status that signals a pending cross-ownership validation.** Do not use it for any other purpose. It blocks the property from public listings and from new affiliate offers.
- **Never skip the validation path.** Both `processDirectSale()` and `convertLead()` MUST call `isPropertyOwner()` before proceeding. Owners bypass validation and complete immediately; non-owners always go through the approval workflow.
- **Auto-refuse siblings only on approval, never on request creation.** The lead (InterestRequest) stays unlocked until the owner approves. Only on `approve()` does the CRM lead get locked and sibling leads refused.
- **`PropertyOwnershipService` is the single source of truth.** Never inline the ownership check logic in other services — always delegate to `PropertyOwnershipService.isOwner()`.
- **`@Lazy` on `PropertyService` in `SaleValidationService` constructor is mandatory.** Removing it restores the circular dependency and crashes the Spring context on startup.
- **Reject notifications must include an optional reason.** `rejectionReason` is stored on the `SaleValidationRequest`. The frontend reject modal has an optional textarea. The backend reject endpoint accepts `{ "reason": "…" }` (nullable).
- **Sidebar badge polls every 60 seconds** (not 30) to avoid overloading the backend with count queries. The `loadValidationCount()` helper is separate from `loadCounts()` and uses its own interval subscription.

---

# CLAUDE WORKING RULES

## Property Module

- **Never expose one agency's data to another.** Any query that returns property lists must go through `PropertyVisibilityService` or the visibility JPQL query.
- **Always preserve Super Admin master visibility.** Super Admin bypasses agency filtering entirely.
- **Always secure backend filtering first.** Frontend role checks are UX only — they can be bypassed. The backend must enforce the same rules independently.
- **LOCATION (rental) properties never use commission or the affiliate network.** The property-edit form hides the Commission and Réseau affilié blocks for rentals, and `Property.@PrePersist` force-resets `commissionPercentage = 0`, `isAffiliateEligible = false`, `basePriceForCommission = null`, `isReservedByAffiliate = false` for `LOCATION`. Do not bypass this rule with optional UI overrides — it is the single source of truth.
- **Do not put `@NotNull` on `prixVente` in `CreatePropertyRequest`.** A LOCATION property legitimately leaves `prixVente` null. Cross-field "at least one price" validation is enforced by `PropertyService.validateCategoryAndPrices()` and `Property.@PrePersist`.
- **In the property-edit Angular component, use `markForCheck()` — never `detectChanges()` — for form sync triggered by map clicks, drag, geolocation, or geocode results.** Synchronous `detectChanges()` inside `ngZone.run(...)` causes NG0100 (`ExpressionChangedAfterItHasBeenCheckedError`).

## Sharing Workflow

- **Never auto-activate a shared property.** A property only becomes visible to an agency after the agency explicitly accepts the share request. Creating a `PropertyShareRequest` is never sufficient — a `PropertySharedAgency` row must be created separately upon acceptance.
- **Never expose one agency's share requests to another.** `PropertyShareRequest` queries must always filter by the authenticated user's agency.
- **Never cancel an already-responded request.** Only PENDING requests can be cancelled or responded to.

## Revenue and Commission

- **Never count the full sale price as agency revenue for shared properties.** When a `SUPER_ADMIN_OWNED` property is transacted through an agency, only the negotiated commission amount is attributed to the agency.
- **Commission calculation lives on the backend.** `expectedCommissionAmount` is computed at query time — never stored — to prevent stale values if the property price changes.

## Public Client Portal

- **`CLIENT_PUBLIC` is not the same role as `CLIENT`.** `CLIENT` is the legacy
  in-agency CRM lead role. `CLIENT_PUBLIC` is the self-registered buyer
  account that owns the public dashboard. Don't reuse one for the other.
- **Public-portal endpoints must NEVER leak commission or affiliate metadata.**
  `PublicPortalService` returns lean DTOs with only buyer-facing fields
  (price, location, images, video, 3D model). No `commissionPercentage`,
  no `isAffiliateEligible`, no share-request state.
- **Image/video/model URLs in public DTOs must use the SecurityConfig
  permitAll prefixes**: `/api/images/public/{id}`, `/api/videos/public/{id}`,
  `/api/models/public/{id}`. Anything else (e.g. `/api/public/images/{id}`)
  returns 403 because it doesn't match the permit rule.
- **3D models render in-page via `<model-viewer>`, never via `<iframe>`.**
  Iframes pointing at GLB/GLTF binaries trigger a download prompt.
- **Auto-create a per-agency CRM lead on every interest submission.**
  `InterestRequestService.submit()` ensures a `ClientInfo` row exists for the
  pair (`publicClient`, `agencyAdmin`) with `visibilityType=AGENCY_CLIENT`.
  Multi-agency rule: the same public client interested in property B from a
  different agency creates a SECOND `ClientInfo` row — never share leads
  across agencies.
- **Login/register endpoints are `permitAll`; everything else under
  `/api/client/**` is `hasRole('CLIENT_PUBLIC')`.** SecurityConfig order
  matters — the two `permitAll` POST matchers must come BEFORE the wildcard
  `hasRole` rule.
- **`users.role` column must be VARCHAR, not ENUM.** Adding any new role
  (next time we extend `RoleType`) breaks inserts with
  `Data truncated for column 'role'` until the DBA runs the ALTER. Same trap
  as the `notifications.type` migration.

## CORS

- **There is exactly ONE CORS configuration in the project**: the
  `CorsConfigurationSource` bean in `SecurityConfig`. It uses
  `setAllowedOrigins(List.of("http://localhost:4200"))` (explicit list, not
  wildcard pattern).
- **Never add `@CrossOrigin` to a controller.** Spring MVC's annotation-based
  CORS handler runs in addition to Spring Security's filter — both add
  `Access-Control-Allow-Origin` and the browser rejects the response with
  "header contains multiple values, only one is allowed".
- **Never call `headers.set("Access-Control-Allow-Origin", …)` in an endpoint
  body.** Same duplication problem as `@CrossOrigin`. The historical bug had
  this in `Model3DController` and `VideoController`, blocking the 3D viewer
  for the entire public portal.

## JWT Interceptor (Frontend)

The app has TWO independent token stores in localStorage:
- `AdminAuthService` → admin/agency/affiliate JWT
- `ClientAuthService` → public-client JWT (`client_public_token`)

The interceptor in `services/http/jwt-interceptor.ts` routes by request URL:

- `/api/client/**` → ALWAYS uses the client token (never the admin token).
  Sending an admin JWT here causes a role mismatch and 403.
- everything else → prefers the admin token, falls back to the client token
  only if no admin is logged in.

A second interceptor (`client-auth-error.interceptor.ts`) auto-clears the
client token and redirects to `/compte/login?redirect=…` on 401/403 from
`/api/client/**` (excluding the login/register endpoints, which surface
their own form errors).

## Secured Images (Never use `<img src>` for JWT-protected endpoints)

**`<img src="…">` never sends an `Authorization` header** — the browser makes a plain unauthenticated request, so any endpoint secured with `hasRole(…)` will return 403.

For any image that requires authentication (e.g. zone payment proofs at `/api/zone-payments/proof/{filename}`):

1. Fetch via `HttpClient` with `{ responseType: 'blob' }` — the JWT interceptor attaches the token automatically.
2. Convert the blob to an object URL: `URL.createObjectURL(blob)`.
3. Sanitize: `DomSanitizer.bypassSecurityTrustUrl(objectUrl)`.
4. Bind to `[src]` (not `src`): `<img [src]="safeUrl" />`.
5. Revoke object URLs in `ngOnDestroy` to prevent memory leaks.

Cache blob URLs in a `Map<id, SafeUrl>` keyed by record ID so each image is fetched only once per component lifecycle. The `ZonePaymentRequestsComponent` implements this pattern as the reference implementation.

Do **not** make proof endpoints `permitAll` — that would expose sensitive financial documents to anyone who guesses the UUID filename.

## Self-Registration (Agency + Affiliate)

- **Always store `null`, never `""`, for an optional unique column.** `users.telephone` is `@Column(unique = true)`. Inserting an empty string when a second user leaves the phone blank causes a duplicate-key error. Both `AgencyRegistrationService` and `AffiliateService` guard: `user.setTelephone((tel != null && !tel.isBlank()) ? tel : null)`. Frontend form `submit()` methods must send `telephone: this.form.telephone || undefined` so the field is omitted from JSON rather than sent as `""`.
- **Set `user.parent` on agency approval.** `AgencyRegistrationService.approve()` calls `agencyUser.setParent(approver)` before saving, placing the agency in the Super Admin's hierarchy tree. Without this the agency is invisible in the hierarchy view.
- **Auto-create `ClientInfo` on affiliate approval.** `AffiliateService.approveAffiliate()` creates a `ClientInfo` row (if one doesn't already exist for that user) so the affiliate appears in Gestion des clients. Guard with `clientInfoRepository.findByUserId(id).isPresent()` to keep it idempotent.
- **Public registration components must use `finalize()` + `ChangeDetectorRef.markForCheck()`.** Both `RegisterAgencyComponent` and `RegisterAffiliateComponent` wrap the HTTP call in `finalize(() => { this.loading = false; this.cdr.markForCheck(); })` so the spinner always stops even if zone.js doesn't trigger a detection cycle after the callback.
- **Never include `provideClientHydration(withEventReplay())` in `app.config.ts` for a pure CSR app.** This SSR feature captures and replays DOM events during the Angular init phase, causing click events on registration buttons to fire twice — the first fires while `loading=true` (spinner already set), the second fires the actual HTTP call. Remove it if present.

## CRM Lead Module

- **Admin lead endpoints live at `/api/admin/interests/**`, never `/api/client/interests/**`.** The JWT interceptor routes all `/api/client/**` URLs through the client token. Admin users have no client token → 403. The `clientAuthErrorInterceptor` then redirects to `/compte/login`. Always use the `/api/admin/` namespace for admin-side CRM calls.
- **Non-terminal moves go through `PUT /{id}/status`; terminal moves go through `PUT /{id}/convert`.** The `/status` endpoint actively rejects CONVERTI_* and REFUSE to prevent bypassing the confirmation modals.
- **Locked leads are read-only forever.** There is no unlock endpoint. Correction path: update the property directly via `/api/properties/{id}`; client must re-submit a new interest request.
- **The `status` column is `VARCHAR(50)`.** `VISITE_PROGRAMMEE` (18 chars) and `CONVERTI_LOCATION` (17 chars) exceed the old VARCHAR(20) size. On first deploy against an existing schema: `ALTER TABLE interest_requests MODIFY COLUMN status VARCHAR(50) NOT NULL;`
- **Auto-refuse runs in the same `@Transactional` boundary as the conversion.** If notifications throw, catch and log — never let a notification failure roll back the conversion itself.
- **`getAvailableLeadStatuses(lead)` uses `lead.propertyCategory` (backend-supplied) first, with `leadsPanelProperty` as a fallback.** Never call `getPropertyCategory(null!)` — always guard: `(this.leadsPanelProperty ? this.getPropertyCategory(this.leadsPanelProperty) : null)`.
- **After a conversion the property list must be refreshed.** `executeConvert()` calls `loadProperties()` when `targetStatus` is CONVERTI_VENTE or CONVERTI_LOCATION so the property card reflects the new `statut` without a page reload.
- **`RentalExpiryScheduler` is the only place that flips LOUE → DISPONIBLE automatically.** Do not add ad-hoc status resets elsewhere. The scheduler fires at 02:00 daily and clears rental date fields upon reset.

## Affiliate Module

- **Never expose admin spaces to affiliate users.** `AdminAuthGuard` must reject all non-affiliate routes for `ROLE_AFFILIATE`.
- **Never expose unrelated deals to affiliate users.** All sale offer queries must filter by the authenticated affiliate's ID.
- **Always filter by role + zone + permission.** Eligible property lists are computed server-side by crossing the affiliate's active regions with property region data.
- **Preserve Super Admin full control.** Super Admin can see all affiliates, all offers, all transactions, and manage the full ranking, bonus, and zone payment lifecycles.
- **Keep affiliate UI simple and separate.** No shared components between the affiliate workspace and the internal admin interface — they are isolated via `ng-container` role guards in the sidebar.
- **Never throw 500 for missing affiliate profile.** `getMyProfile` returns a default PENDING DTO from the `User` entity when no `AffiliateProfile` row exists. `getEligibleProperties` returns an empty list when the affiliate is not ACTIVE.
- **Use `/api/affiliate/ranking` for the ranking page** — not `/api/admin/affiliates/ranking`. SecurityConfig has a specific `authenticated()` exception for this path before the `hasRole('AFFILIATE')` wildcard, making it reachable by all roles.
- **Always use `/api/images/public/{id}` for property image URLs** in DTO converters (`AffiliateService.toAffiliatePropertyDTO`, `SaleOfferService.toDTO`). The wrong path `/api/public/images/{id}` causes 403 because it does not match the `permitAll()` rule in SecurityConfig.
- **Match affiliate zones strictly by `(country, city)` pair.** The repository query `findEligiblePropertiesForAffiliateZoneKeys` uses `CONCAT(LOWER(country), '|', LOWER(city)) IN :zoneKeys`. The legacy `findEligiblePropertiesForAffiliateRegions` (single region name) is kept only for affiliates whose `AffiliateRegion` rows have not yet been backfilled with explicit country/city — never use it for new code.
- **Reserve a property the moment an affiliate's offer is ACCEPTED.** `SaleOfferService.respondToOffer` flips `property.isReservedByAffiliate = true`, then calls `autoRejectSiblingOffers` which moves every other PENDING offer on that property to REJECTED with reason `"Une autre offre a été retenue pour ce bien."` and notifies each losing affiliate. Never accept a second concurrent offer for the same property.
- **Block new submissions on reserved properties.** `SaleOfferService.submitOffer` throws if `property.isReservedByAffiliate` is true. Defense-in-depth, even though the eligible-properties query already excludes reserved rows.
- **Mark the property SOLD/RENTED on offer COMPLETED.** `SaleOfferService.completeOffer` sets `property.statut = "VENDU"` for VENTE properties (or `"LOUE"` for rentals) and keeps `isReservedByAffiliate = true`. The property then disappears from agency property management and never resurfaces in any listing — do not rely on the reservation flag alone.
- **Never throw 500 from `getSuggestedZones`.** Wrap the entire computation in a try/catch that logs the error and returns `[]`. Affiliate dashboard widgets must degrade silently when data is missing — they must never break the dashboard load.
- **Commission lives on properties, not zones.** `AffiliateRegion` has no `commissionPercentage` field. Never set commission on a zone — it belongs on `Property.commissionPercentage`. Any `RegionSelection` or `AddZoneRequest` DTO must not include `commissionPercentage`.
- **Zone payment proofs use blob fetch, not `<img src>`.** The `/api/zone-payments/proof/**` endpoint requires `ROLE_SUPER_ADMIN`. Always fetch via `HttpClient` blob and bind to `[src]` via `DomSanitizer.bypassSecurityTrustUrl()`. See the Secured Images rule above.
- **`isPremium` in FormData must be a boolean string, never `"undefined"`.** Use `isPremium ? 'true' : 'false'` (not `String(isPremium)`) when appending to `FormData`. Spring rejects `"undefined"` with a 400. Always pass `zone.isPremium ?? false` at the call site.
- **The Modifier client modal is role-aware.** For `AFFILIATE` clients it must show country/city dropdowns sourced from `/api/properties/public/countries` + `/api/properties/public/cities` and persist the change through `UpdateClientRequest.country` + `city`, which `ClientManagementService.updateClient()` uses to rebuild `clientInfo.zoneRecherchee` and update the affiliate's `AffiliateRegion`. Normal clients keep the legacy free-text Budget + Zone fields.

---

# CURRENT PRIORITIES

1. ✅ Property multi-tenant security (ownership isolation, visibility enforcement)
2. ✅ Sharing approval workflow (request → notify → accept/reject → activate)
3. ✅ Affiliate module completion (profile, offers, ranking, earnings, zone filtering)
4. ✅ Zone monetization system (free first zone, paid additional zones, payment proof workflow)
5. ✅ Role visibility isolation (AFFILIATE workspace, route guard, sidebar, API guard)
6. ✅ Commission engine (agency per-share negotiation + affiliate property-based rates)
7. ✅ Dashboard financial accuracy (commission-only revenue for shared properties)
8. ✅ Public client portal (browsing, CLIENT_PUBLIC accounts, Intéressé workflow,
   per-agency lead auto-creation, in-page 3D viewer)
9. ✅ CRM lead workflow (pipeline, terminal conversions, rental contract, auto-refuse siblings)
10. ✅ Cross-ownership sale validation workflow (PropertyOwnershipService, SaleValidationService,
    SaleValidationController, SaleValidationsComponent, sidebar badge, notification routing)
11. Mobile responsive UI
12. 3D premium module
13. Reviews + favorites for public clients (Phase 3 — pending)

---

# FUTURE ROADMAP

- Agency marketplace sharing (cross-platform property syndication)
- Advanced commissions engine (tiered rates, split commissions, referral chains)
- Lead distribution system (auto-assign leads to agents by zone / availability)
- Smart property matching AI (buyer profile → property recommendations)
- Affiliate performance analytics (conversion funnel, zone heat maps)
- Property reviews / avis system (public clients, with verified-interaction badge)
- Favorites / saved searches for `CLIENT_PUBLIC` accounts
- Recently viewed + recommended properties on the public portal

---

# CONFIGURATION

All backend configuration is in `backend/src/main/resources/application.properties`. No `.env` files are used. There is no Docker setup — both services run directly.

Key `application.properties` values relevant to the zone payment system:
- `file.upload.payments-dir` — directory for proof images (default: `uploads/payments`)
- `app.base-url` — used to build absolute proof image URLs in DTOs (default: `http://localhost:8080`)

Prettier is configured for the frontend (100-char line width).
