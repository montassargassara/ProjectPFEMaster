package com.immobilier.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.immobilier.backend.dto.*;
import com.immobilier.backend.service.PropertyService;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/properties")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class PropertyController {

    private final PropertyService propertyService;

    // ==================== LOCATION ENDPOINTS ====================
    
    @GetMapping("/public/countries")
    public ResponseEntity<List<String>> getAllCountries() {
        log.info("📋 Récupération de tous les pays");
        List<String> countries = propertyService.getAllCountries();
        return ResponseEntity.ok(countries);
    }
    
    @GetMapping("/public/cities")
    public ResponseEntity<List<String>> getCitiesByCountry(@RequestParam String country) {
        log.info("📋 Récupération des villes pour le pays: {}", country);
        List<String> cities = propertyService.getCitiesByCountry(country);
        return ResponseEntity.ok(cities);
    }
    
    @GetMapping("/public/regions")
    public ResponseEntity<List<String>> getAllRegions() {
        log.info("📋 Récupération de toutes les régions");
        List<String> regions = propertyService.getAllRegions();
        return ResponseEntity.ok(regions);
    }
    
    @GetMapping("/public/by-country")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesByCountry(
            @RequestParam String country) {
        log.info("📋 Récupération des propriétés dans le pays: {}", country);
        List<PropertyWithCommissionDTO> properties = propertyService.getPropertiesByCountry(country);
        return ResponseEntity.ok(properties);
    }
    
    @GetMapping("/public/by-country-city")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesByCountryAndCity(
            @RequestParam String country,
            @RequestParam String city) {
        log.info("📋 Récupération des propriétés dans {}/{}", country, city);
        List<PropertyWithCommissionDTO> properties = propertyService.getPropertiesByCountryAndCity(country, city);
        return ResponseEntity.ok(properties);
    }
    
    @GetMapping("/public/by-city")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesByCity(
            @RequestParam String city) {
        log.info("📋 Récupération des propriétés dans la ville: {}", city);
        List<PropertyWithCommissionDTO> properties = propertyService.getPropertiesByCity(city);
        return ResponseEntity.ok(properties);
    }
    
    @GetMapping("/public/by-area")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesByArea(
            @RequestParam String area) {
        log.info("📋 Récupération des propriétés dans la zone: {}", area);
        List<PropertyWithCommissionDTO> properties = propertyService.getPropertiesByArea(area);
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/public/by-regions")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesByRegions(
            @RequestParam List<String> regions) {
        log.info("📋 Récupération des propriétés dans les régions: {}", regions);
        List<PropertyWithCommissionDTO> properties = propertyService.getPropertiesByRegions(regions);
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/public/near-location")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesNearLocation(
            @RequestParam Double lat,
            @RequestParam Double lng,
            @RequestParam(defaultValue = "10") Double radiusKm) {
        log.info("📋 Récupération des propriétés près de ({}, {}) rayon {} km", lat, lng, radiusKm);
        List<PropertyWithCommissionDTO> properties = 
            propertyService.getPropertiesNearLocation(lat, lng, radiusKm);
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/public/by-commission")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesByCommission(
            @RequestParam(required = false) Double minCommission,
            @RequestParam(required = false) Double maxCommission) {
        log.info("📋 Récupération des propriétés avec commission entre {}% et {}%", 
                 minCommission, maxCommission);
        List<PropertyWithCommissionDTO> properties = 
            propertyService.getPropertiesByCommissionRange(minCommission, maxCommission);
        return ResponseEntity.ok(properties);
    }

    @GetMapping("/public/filter")
    public ResponseEntity<List<PropertyWithCommissionDTO>> filterProperties(
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String region,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) Double minCommission,
            @RequestParam(required = false) String propertyType) {
        log.info("📋 Filtrage propriétés - Pays: {}, Ville: {}, Région: {}, Prix: {}-{}, Commission min: {}%, Type: {}", 
                 country, city, region, minPrice, maxPrice, minCommission, propertyType);
        
        List<PropertyWithCommissionDTO> properties = propertyService.filterProperties(
            country, city, region, minPrice, maxPrice, minCommission, propertyType);
        return ResponseEntity.ok(properties);
    }

    // ==================== PUBLIC ENDPOINTS ====================
    
    @GetMapping("/public")
    public ResponseEntity<?> getAllPropertiesPublic() {
        log.info("📋 Requête publique - Récupération de toutes les propriétés");
        try {
            List<PropertyListDTO> properties = propertyService.getAllPropertiesList();
            return ResponseEntity.ok(properties);
        } catch (Exception e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur serveur: " + e.getMessage()));
        }
    }

    @GetMapping("/public/full")
    public ResponseEntity<List<PropertyDTO>> getAllPropertiesFullPublic() {
        log.info("📋 Requête publique - Récupération de toutes les propriétés (version complète)");
        return ResponseEntity.ok(propertyService.getAllProperties());
    }

    @GetMapping("/public/active")
    public ResponseEntity<List<PropertyDTO>> getActivePropertiesPublic() {
        log.info("📋 Requête publique - Récupération des propriétés actives");
        return ResponseEntity.ok(propertyService.getActiveProperties());
    }

    @GetMapping("/public/{id}")
    public ResponseEntity<?> getPropertyByIdPublic(@PathVariable Long id) {
        log.info("📋 Requête publique - Récupération de la propriété ID: {}", id);
        try {
            PropertyDTO property = propertyService.getPropertyById(id);
            return ResponseEntity.ok(property);
        } catch (Exception e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur serveur: " + e.getMessage()));
        }
    }

    @GetMapping("/public/{id}/light")
    public ResponseEntity<?> getPropertyByIdLightPublic(@PathVariable Long id) {
        log.info("📋 Requête publique - Récupération LIGHT de la propriété ID: {}", id);
        try {
            PropertyListDTO property = propertyService.getPropertyByIdLight(id);
            return ResponseEntity.ok(property);
        } catch (Exception e) {
            log.error("❌ Erreur: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Propriété non trouvée"));
        }
    }

    // ==================== PROTECTED ENDPOINTS ====================
    
    @GetMapping("/affiliate/{affiliateId}")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<List<PropertyWithCommissionDTO>> getPropertiesForAffiliate(
            @PathVariable Long affiliateId) {
        log.info("🔒 Récupération des propriétés pour l'affilié ID: {}", affiliateId);
        List<PropertyWithCommissionDTO> properties = 
            propertyService.getPropertiesForAffiliate(affiliateId);
        return ResponseEntity.ok(properties);
    }

    @PutMapping("/{id}/commission")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_COMMERCIAL')")
    public ResponseEntity<PropertyDTO> updatePropertyCommission(
            @PathVariable Long id,
            @RequestBody UpdateCommissionRequest request) {
        log.info("🔒 Mise à jour de la commission pour la propriété ID: {}", id);
        PropertyDTO updatedProperty = propertyService.updatePropertyCommission(id, request);
        return ResponseEntity.ok(updatedProperty);
    }

    @PutMapping("/region/{region}/commission")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_COMMERCIAL')")
    public ResponseEntity<Map<String, Object>> updateCommissionByRegion(
            @PathVariable String region,
            @RequestParam Double commissionPercentage) {
        log.info("🔒 Mise à jour de la commission pour la région {} à {}%", region, commissionPercentage);
        int updatedCount = propertyService.updateCommissionByRegion(region, commissionPercentage);
        return ResponseEntity.ok(Map.of(
            "message", updatedCount + " propriétés mises à jour",
            "updatedCount", updatedCount,
            "region", region,
            "newCommission", commissionPercentage
        ));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CLIENT', 'COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PropertyDTO>> getAllProperties() {
        log.info("🔒 Requête protégée - Récupération de toutes les propriétés");
        return ResponseEntity.ok(propertyService.getAllProperties());
    }

    @GetMapping("/list")
    @PreAuthorize("hasAnyRole('CLIENT', 'COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PropertyListDTO>> getAllPropertiesList() {
        log.info("🔒 Requête protégée - Récupération de toutes les propriétés (liste)");
        return ResponseEntity.ok(propertyService.getAllPropertiesList());
    }

    @GetMapping("/active")
    @PreAuthorize("hasAnyRole('CLIENT', 'COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PropertyDTO>> getActiveProperties() {
        log.info("🔒 Requête protégée - Récupération des propriétés actives");
        return ResponseEntity.ok(propertyService.getActiveProperties());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CLIENT', 'COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PropertyDTO> getPropertyById(@PathVariable Long id) {
        log.info("🔒 Requête protégée - Récupération de la propriété ID: {}", id);
        return ResponseEntity.ok(propertyService.getPropertyById(id));
    }

    @GetMapping("/recent-light")
    @PreAuthorize("hasAnyRole('CLIENT', 'COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<List<PropertyListDTO>> getRecentPropertiesLight(
            @RequestParam(defaultValue = "5") int limit) {
        log.info("🔒 Récupération LIGHT des {} propriétés les plus récentes", limit);
        long start = System.currentTimeMillis();
        List<PropertyListDTO> properties = propertyService.getRecentPropertiesLight(limit);
        long duration = System.currentTimeMillis() - start;
        log.info("✅ {} propriétés récentes LIGHT récupérées en {} ms", properties.size(), duration);
        return ResponseEntity.ok(properties);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PropertyDTO> createProperty(@RequestBody CreatePropertyRequest request) {
        log.info("➕ Création de propriété par utilisateur authentifié");
        PropertyDTO createdProperty = propertyService.createProperty(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProperty);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PropertyDTO> updateProperty(
            @PathVariable Long id,
            @RequestBody UpdatePropertyRequest request) {
        log.info("✏️ Mise à jour de propriété ID: {} par utilisateur authentifié", id);
        return ResponseEntity.ok(propertyService.updateProperty(id, request));
    }

    @PutMapping("/{id}/validate")
    @PreAuthorize("hasAnyRole('RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<PropertyDTO> validateProperty(@PathVariable Long id) {
        log.info("✅ Validation de propriété ID: {} par utilisateur authentifié", id);
        return ResponseEntity.ok(propertyService.validateProperty(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<String> deleteProperty(@PathVariable Long id) {
        log.info("🗑️ Suppression de propriété ID: {} par utilisateur authentifié", id);
        propertyService.deleteProperty(id);
        return ResponseEntity.ok("Propriété désactivée avec succès");
    }

        @GetMapping("/categories/{category}/allowed-statuses")
    public ResponseEntity<List<String>> getAllowedStatusesForCategory(
            @PathVariable String category) {
        log.info("📋 Récupération des statuts autorisés pour la catégorie: {}", category);
        List<String> statuses = propertyService.getAllowedStatusesForCategory(category);
        return ResponseEntity.ok(statuses);
    }

        @GetMapping("/{id}/category")
    public ResponseEntity<Map<String, String>> getPropertyCategory(@PathVariable Long id) {
        log.info("📋 Récupération de la catégorie de la propriété ID: {}", id);
        String category = propertyService.getPropertyCategory(id);
        return ResponseEntity.ok(Map.of("category", category != null ? category : "INCONNU"));
    }
    
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> updatePropertyStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request) {
        log.info("🔒 Mise à jour du statut de la propriété ID: {} vers {}", id, request.getStatut());
        try {
            PropertyDTO updatedProperty = propertyService.updatePropertyStatus(id, request.getStatut());
            return ResponseEntity.ok(updatedProperty);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}