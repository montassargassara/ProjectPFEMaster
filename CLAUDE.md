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
                AffiliateController, SuperAdminAffiliateController, SaleOfferController, etc.)
service/      → Business logic
repository/   → Spring Data JPA repositories
entity/       → JPA domain models
dto/          → Request / response data transfer objects
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
  affiliate-dashboard/          → Affiliate: personal KPI dashboard
  affiliate-properties/         → Affiliate: eligible properties in assigned zones
  affiliate-offers/             → Affiliate: submit and track sale offers
  affiliate-earnings/           → Affiliate: commission history
  affiliate-incoming-offers/    → Agency Admin: incoming sale offers from affiliates
  services/                     → HTTP wrappers (properties, share-request, notification,
                                  auth, affiliate, …)
  guards/                       → Route guards (auth protection + role isolation)
components/     → Shared / reusable UI components
services/       → App-level HTTP clients
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
| Buyer                  | Browses public listings, requests visits/info                              |

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
1. Affiliate submits registration via `POST /api/affiliate/register` (public endpoint).
2. Backend creates a `User` (role=`AFFILIATE`, `isActive=false`) and an `AffiliateProfile` (status=`PENDING`).
3. Super Admin reviews in **Candidatures** page → approve or reject with reason.
4. On approval: `AffiliateProfile.status` → `ACTIVE`, `User.isActive` → `true`.
5. Affiliate receives an in-app notification and can now log in.

### Admin-created affiliate (via Client Management)
When Super Admin creates a user with role `AFFILIATE` through the client-management UI, `ClientManagementService.createClient()` automatically:
- Creates the `User` with `isActive=true`
- Creates an `AffiliateProfile` with `status=ACTIVE` (skips the PENDING review step)
- Creates an `AffiliateRegion` populated with **both** the joined `ClientInfo.zoneRecherchee` (`"Country, City"` legacy field) **and** the explicit `country` + `city` columns + lowercase `regionName = city`. The configured commission rate (or `5.0` default) is stored on the region.

This is the fast-path for trusted affiliates who don't need manual approval.

### Editing an affiliate (via Client Management → Modifier client)
The Modifier client modal mirrors the Add Affiliate form for `role = AFFILIATE`:
- Common fields: `nom`, `prenom`, read-only `email`, `telephone`, `Compte actif` toggle.
- Affiliate-only zone editor: **Pays** dropdown + **Ville** dropdown sourced from `/api/properties/public/countries` and `/api/properties/public/cities` (only countries/cities where properties exist). The legacy `Budget estimé` and free-text `Zone recherchée` fields are hidden for affiliates.
- The form pre-loads existing zone by parsing `client.zoneRecherchee` (`"Country, City"`) and populating both dropdowns.
- On save, `ClientManagementService.updateClient()` rebuilds `clientInfo.zoneRecherchee`, then updates (or creates) the affiliate's active `AffiliateRegion` row with the new `country`, `city`, lowercase `regionName`, preserving the commission rate.
- For non-affiliate clients, the modal keeps the legacy budget + free-text zone fields unchanged.

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

## Affiliate Sale Offer Workflow

Affiliates do **not** finalize sales — they submit sale offer proposals:

1. Affiliate finds a buyer and submits a `SaleOffer` with the buyer's contact info, offered price, and an optional message. The submission UI auto-fills the offered price with the property's current price and rejects values lower than that price (validated client- and server-side).
2. Submission is rejected if the property is inactive, not `DISPONIBLE`, not affiliate-eligible, **already reserved** (`isReservedByAffiliate = true`), or outside the affiliate's strict country+city zone.
3. The relevant property owner (Agency Admin for AGENCY_OWNED, Super Admin for SUPER_ADMIN_OWNED) is notified via `SALE_OFFER_RECEIVED`.
4. Owner responds: **Accept**, **Reject** (with reason), or leaves pending.
5. **On ACCEPTED**: the property is locked (`isReservedByAffiliate = true`) and **all sibling PENDING offers on the same property are auto-rejected** with reason `"Une autre offre a été retenue pour ce bien."`. Each losing affiliate is notified via `SALE_OFFER_REJECTED`. The accepted offer snapshots the commission percentage/amount at acceptance time.
6. **On COMPLETED**: the property's `statut` is flipped to its terminal state (`VENDU` for VENTE, `LOUE` for LOCATION) so it disappears from agency property management and never resurfaces in any listing. An `AffiliateTransaction` record is created. Super Admin can later mark the commission paid.

Sale Offer Statuses: `PENDING → ACCEPTED / REJECTED → COMPLETED / CANCELLED`

## Suggested Expansion Zones

The affiliate dashboard exposes a **Zones d'expansion suggérées** widget driven by `GET /api/affiliate/suggested-zones`:

- Server side: `AffiliateService.getSuggestedZones()` groups all affiliate-eligible properties by `(country, city)`, excludes the affiliate's current zones, computes per-zone `propertyCount`, `averageCommission`, `averagePrice`, and a `demandScore` (count of accepted/completed sale offers in that zone).
- Opportunity score: `propertyCount × avgCommission + demandScore × 10`. Top 5 are returned.
- The endpoint is wrapped in a try/catch that returns `[]` and logs the error — it must **never** propagate a 500 to the dashboard.

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

The affiliate interface operates as an isolated mini-portal within the admin shell:

| Route                         | Component                    | Purpose                         |
|-------------------------------|------------------------------|---------------------------------|
| `/admin/affiliate-dashboard`  | `AffiliateDashboardComponent`| KPIs, recent offers, quick actions |
| `/admin/affiliate-properties` | `AffiliatePropertiesComponent` | Browse eligible properties     |
| `/admin/affiliate-offers`     | `AffiliateOffersComponent`   | Submit and track sale offers    |
| `/admin/affiliate-earnings`   | `AffiliateEarningsComponent` | Commission transaction history  |
| `/admin/affiliate-ranking`    | `AffiliateRankingComponent`  | Monthly leaderboard (all roles) |

## Super Admin Affiliate Management (Frontend)

| Route                          | Component                      | Purpose                          |
|--------------------------------|--------------------------------|----------------------------------|
| `/admin/affiliate-applications`| `AffiliateApplicationsComponent` | Review PENDING registrations   |
| `/admin/affiliate-accounts`    | `AffiliateAccountsComponent`   | Manage all affiliate accounts    |
| `/admin/affiliate-ranking`     | `AffiliateRankingComponent`    | Full ranking with stats          |
| `/admin/affiliate-commissions` | `AffiliateCommissionsComponent`| All transactions, mark paid      |

## Agency Admin + Super Admin Affiliate View

| Route                             | Component                        | Purpose                              |
|-----------------------------------|----------------------------------|--------------------------------------|
| `/admin/affiliate-incoming-offers`| `AffiliateIncomingOffersComponent`| Accept/reject sale offers from affiliates (ADMIN loads via `GET /api/sale-offers/incoming`; SUPER_ADMIN loads via `GET /api/sale-offers`) |

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
- `AffiliateRegion` — affiliate's assigned geographic zones with commission rates; `regionName` stored lowercase
- `SaleOffer` — sale proposal submitted by affiliate; links affiliate, property, and buyer info
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
- `/api/sale-offers/**` → authenticated + method-level `@PreAuthorize` per operation

Frontend role checks are UX only. Backend is always the authoritative security layer.

## Default Route by Role

| Role                                           | Post-login redirect           |
|------------------------------------------------|-------------------------------|
| SUPER_ADMIN, ADMIN, RESPONSABLE_COMMERCIAL, COMMERCIAL | `/admin/dashboard`  |
| AFFILIATE                                      | `/admin/affiliate-dashboard`  |

---

# NOTIFICATION MODULE

## Purpose

Users receive in-app notifications for all key lifecycle events relevant to their role.

## Notification Types

| Type                       | Recipient    | Trigger                                          |
|----------------------------|--------------|--------------------------------------------------|
| `SHARE_REQUEST_RECEIVED`   | Agency Admin | Super Admin sends a share request                |
| `SHARE_REQUEST_ACCEPTED`   | Super Admin  | Agency accepts the request                       |
| `SHARE_REQUEST_REJECTED`   | Super Admin  | Agency rejects the request                       |
| `SHARE_REQUEST_CANCELLED`  | Agency Admin | Super Admin cancels a PENDING request            |
| `AFFILIATE_REGISTRATION`   | Super Admin  | New affiliate registration submitted             |
| `AFFILIATE_APPROVED`       | Affiliate    | Super Admin approves the affiliate account       |
| `AFFILIATE_REJECTED`       | Affiliate    | Super Admin rejects the affiliate account        |
| `AFFILIATE_SUSPENDED`      | Affiliate    | Super Admin suspends the affiliate account       |
| `SALE_OFFER_RECEIVED`      | Agency Admin **or** Super Admin | Affiliate submits a sale offer; Agency Admin receives it for AGENCY_OWNED properties, Super Admin receives it for SUPER_ADMIN_OWNED properties |
| `SALE_OFFER_ACCEPTED`      | Affiliate    | Agency admin accepts the sale offer              |
| `SALE_OFFER_REJECTED`      | Affiliate    | Agency admin rejects the sale offer              |
| `SALE_OFFER_COMPLETED`     | Affiliate    | Sale offer marked as completed                   |
| `MONTHLY_BONUS_AWARDED`    | Affiliate    | Affiliate receives a ranking bonus               |

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

## Notification API

- `GET  /api/notifications` — all notifications for current user
- `GET  /api/notifications/unread-count` — `{ count: number }`
- `PUT  /api/notifications/{id}/read` — mark one as read
- `PUT  /api/notifications/read-all` — mark all as read

---

# CLAUDE WORKING RULES

## Property Module

- **Never expose one agency's data to another.** Any query that returns property lists must go through `PropertyVisibilityService` or the visibility JPQL query.
- **Always preserve Super Admin master visibility.** Super Admin bypasses agency filtering entirely.
- **Always secure backend filtering first.** Frontend role checks are UX only — they can be bypassed. The backend must enforce the same rules independently.

## Sharing Workflow

- **Never auto-activate a shared property.** A property only becomes visible to an agency after the agency explicitly accepts the share request. Creating a `PropertyShareRequest` is never sufficient — a `PropertySharedAgency` row must be created separately upon acceptance.
- **Never expose one agency's share requests to another.** `PropertyShareRequest` queries must always filter by the authenticated user's agency.
- **Never cancel an already-responded request.** Only PENDING requests can be cancelled or responded to.

## Revenue and Commission

- **Never count the full sale price as agency revenue for shared properties.** When a `SUPER_ADMIN_OWNED` property is transacted through an agency, only the negotiated commission amount is attributed to the agency.
- **Commission calculation lives on the backend.** `expectedCommissionAmount` is computed at query time — never stored — to prevent stale values if the property price changes.

## Affiliate Module

- **Never expose admin spaces to affiliate users.** `AdminAuthGuard` must reject all non-affiliate routes for `ROLE_AFFILIATE`.
- **Never expose unrelated deals to affiliate users.** All sale offer queries must filter by the authenticated affiliate's ID.
- **Always filter by role + zone + permission.** Eligible property lists are computed server-side by crossing the affiliate's active regions with property region data.
- **Preserve Super Admin full control.** Super Admin can see all affiliates, all offers, all transactions, and manage the full ranking and bonus lifecycle.
- **Keep affiliate UI simple and separate.** No shared components between the affiliate workspace and the internal admin interface — they are isolated via `ng-container` role guards in the sidebar.
- **Never throw 500 for missing affiliate profile.** `getMyProfile` returns a default PENDING DTO from the `User` entity when no `AffiliateProfile` row exists. `getEligibleProperties` returns an empty list when the affiliate is not ACTIVE.
- **Use `/api/affiliate/ranking` for the ranking page** — not `/api/admin/affiliates/ranking`. SecurityConfig has a specific `authenticated()` exception for this path before the `hasRole('AFFILIATE')` wildcard, making it reachable by all roles.
- **Always use `/api/images/public/{id}` for property image URLs** in DTO converters (`AffiliateService.toAffiliatePropertyDTO`, `SaleOfferService.toDTO`). The wrong path `/api/public/images/{id}` causes 403 because it does not match the `permitAll()` rule in SecurityConfig.

---

# CURRENT PRIORITIES

1. Property multi-tenant security (ownership isolation, visibility enforcement)
2. Sharing approval workflow (request → notify → accept/reject → activate)
3. Affiliate module completion (profile, offers, ranking, earnings, zone filtering)
4. Role visibility isolation (AFFILIATE workspace, route guard, sidebar, API guard)
5. Commission engine (agency per-share negotiation + affiliate zone-based rates)
6. Dashboard financial accuracy (commission-only revenue for shared properties)
7. Mobile responsive UI
8. 3D premium module

---

# FUTURE ROADMAP

- Agency marketplace sharing (cross-platform property syndication)
- Advanced commissions engine (tiered rates, split commissions, referral chains)
- Affiliate public registration portal (standalone onboarding page)
- Lead distribution system (auto-assign leads to agents by zone / availability)
- Smart property matching AI (buyer profile → property recommendations)
- Affiliate performance analytics (conversion funnel, zone heat maps)

---

# CONFIGURATION

All backend configuration is in `backend/src/main/resources/application.properties`. No `.env` files are used. There is no Docker setup — both services run directly.

Prettier is configured for the frontend (100-char line width).
