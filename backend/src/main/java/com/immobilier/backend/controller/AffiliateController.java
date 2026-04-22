package com.immobilier.backend.controller;

import com.immobilier.backend.dto.*;
import com.immobilier.backend.security.CustomUserDetails;
import com.immobilier.backend.service.AffiliateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/affiliate")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class AffiliateController {

    private final AffiliateService affiliateService;

    // ==================== REGISTRATION ====================
    
    @PostMapping("/register")
    public ResponseEntity<UserDTO> registerAffiliate(@Valid @RequestBody RegisterAffiliateRequest request) {
        log.info("📝 New affiliate registration: {}", request.getEmail());
        UserDTO createdAffiliate = affiliateService.registerAffiliate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdAffiliate);
    }

    // ==================== REGION MANAGEMENT ====================
    
    @GetMapping("/regions")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<List<AffiliateRegionDTO>> getMyRegions() {
        Long userId = getCurrentUserId();
        log.info("🔒 Getting regions for affiliate ID: {}", userId);
        List<AffiliateRegionDTO> regions = affiliateService.getAffiliateRegions(userId);
        return ResponseEntity.ok(regions);
    }

    @PostMapping("/regions")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<AffiliateRegionDTO> addRegion(@Valid @RequestBody RegionSelection regionSelection) {
        Long userId = getCurrentUserId();
        log.info("➕ Adding region for affiliate ID: {}", userId);
        AffiliateRegionDTO region = affiliateService.addAffiliateRegion(userId, regionSelection);
        return ResponseEntity.status(HttpStatus.CREATED).body(region);
    }

    // ==================== ACTIVITY TRACKING ====================
    
    @PostMapping("/track")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<String> trackActivity(
            @RequestParam String activityType,
            @RequestParam(required = false) Long propertyId,
            @RequestParam(required = false) String metadata) {
        Long userId = getCurrentUserId();
        log.info("📊 Tracking activity for affiliate ID: {} - Type: {}", userId, activityType);
        affiliateService.trackActivity(userId, activityType, propertyId, metadata);
        return ResponseEntity.ok("Activity tracked successfully");
    }

    // ==================== STATISTICS & DASHBOARD ====================
    
    @GetMapping("/stats")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<AffiliateStatsDTO> getMyStats() {
        Long userId = getCurrentUserId();
        log.info("📊 Getting stats for affiliate ID: {}", userId);
        AffiliateStatsDTO stats = affiliateService.getAffiliateStats(userId);
        return ResponseEntity.ok(stats);
    }

    // Add this method to AffiliateController.java

    @GetMapping("/regions/{affiliateId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public ResponseEntity<List<AffiliateRegionDTO>> getAffiliateRegionsById(@PathVariable Long affiliateId) {
        log.info("👑 Getting regions for affiliate ID: {}", affiliateId);
        List<AffiliateRegionDTO> regions = affiliateService.getAffiliateRegions(affiliateId);
        return ResponseEntity.ok(regions);
    }
// Update this in AffiliateController.java

    @GetMapping("/ranking")
    @PreAuthorize("hasAnyRole('AFFILIATE', 'SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_COMMERCIAL')")
    public ResponseEntity<List<AffiliateStatsDTO>> getMonthlyRanking() {
        log.info("🏆 Getting monthly affiliate ranking");
        List<AffiliateStatsDTO> ranking = affiliateService.getMonthlyRanking();
        return ResponseEntity.ok(ranking);
    }

    @GetMapping("/my-ranking")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<AffiliateStatsDTO> getMyRanking() {
        // Get userId from SecurityContext
        Long userId = getCurrentUserId();
        log.info("🏆 Getting ranking for affiliate ID: {}", userId);
        AffiliateStatsDTO myRanking = affiliateService.getAffiliateRankingPosition(userId);
        return ResponseEntity.ok(myRanking);
    }

    // ==================== TRANSACTIONS ====================
    
    @GetMapping("/transactions")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<List<AffiliateTransactionDTO>> getMyTransactions() {
        Long userId = getCurrentUserId();
        log.info("💰 Getting transactions for affiliate ID: {}", userId);
        List<AffiliateTransactionDTO> transactions = affiliateService.getAffiliateTransactions(userId);
        return ResponseEntity.ok(transactions);
    }

    // ==================== ACTIVITIES ====================
    
    @GetMapping("/activities")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<List<AffiliateActivityDTO>> getMyActivities() {
        Long userId = getCurrentUserId();
        log.info("📋 Getting activities for affiliate ID: {}", userId);
        List<AffiliateActivityDTO> activities = affiliateService.getAffiliateActivities(userId);
        return ResponseEntity.ok(activities);
    }

    // ==================== RECOMMENDATIONS ====================
    
    @GetMapping("/recommendations")
    @PreAuthorize("hasRole('AFFILIATE')")
    public ResponseEntity<List<PropertyListDTO>> getRecommendedProperties() {
        Long userId = getCurrentUserId();
        log.info("🎯 Getting recommended properties for affiliate ID: {}", userId);
        List<PropertyListDTO> properties = affiliateService.getRecommendedPropertiesByRegion(userId);
        return ResponseEntity.ok(properties);
    }

    private Long getCurrentUserId() {
        org.springframework.security.core.Authentication authentication = 
            org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof CustomUserDetails) {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            return userDetails.getUserId();
        }
        
        throw new RuntimeException("User not authenticated");
    }

    // ==================== SALE RECORDING (ADMIN ONLY) ====================
    
    @PostMapping("/record-sale")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN', 'RESPONSABLE_COMMERCIAL')")
    public ResponseEntity<AffiliateTransactionDTO> recordSale(
            @RequestParam Long affiliateId,
            @RequestParam Long propertyId,
            @RequestParam String clientEmail,
            @RequestParam Double propertyPrice,
            @RequestParam Double commissionPercentage) {
        log.info("💰 Recording sale for affiliate ID: {} - Property ID: {}", affiliateId, propertyId);
        AffiliateTransactionDTO transaction = affiliateService.recordSale(
            affiliateId, propertyId, clientEmail, propertyPrice, commissionPercentage);
        return ResponseEntity.status(HttpStatus.CREATED).body(transaction);
    }
}
