package com.immobilier.backend.controller;

import com.immobilier.backend.dto.*;
import com.immobilier.backend.security.CustomUserDetails;
import com.immobilier.backend.service.AffiliateService;
import com.immobilier.backend.service.MonthlyBonusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Super Admin endpoints for managing affiliates, approvals, rankings and payouts.
 * All methods require SUPER_ADMIN role.
 */
@Slf4j
@RestController
@RequestMapping("/api/admin/affiliates")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class SuperAdminAffiliateController {

    private final AffiliateService affiliateService;
    private final MonthlyBonusService monthlyBonusService;

    // ── Affiliate list ────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<AffiliateProfileDTO>> getAllAffiliates() {
        return ResponseEntity.ok(affiliateService.getAllAffiliates());
    }

    @GetMapping("/pending")
    public ResponseEntity<List<AffiliateProfileDTO>> getPendingAffiliates() {
        return ResponseEntity.ok(affiliateService.getPendingAffiliates());
    }

    @GetMapping("/{affiliateId}")
    public ResponseEntity<AffiliateProfileDTO> getAffiliate(@PathVariable Long affiliateId) {
        return ResponseEntity.ok(affiliateService.getAffiliateById(affiliateId));
    }

    @GetMapping("/{affiliateId}/stats")
    public ResponseEntity<AffiliateStatsDTO> getAffiliateStats(@PathVariable Long affiliateId) {
        return ResponseEntity.ok(affiliateService.getStats(affiliateId));
    }

    // ── Approval workflow ─────────────────────────────────────────────────────

    @PutMapping("/{affiliateId}/approve")
    public ResponseEntity<AffiliateProfileDTO> approve(@PathVariable Long affiliateId) {
        log.info("Super Admin {} approving affiliate {}", currentUserId(), affiliateId);
        return ResponseEntity.ok(affiliateService.approveAffiliate(affiliateId, currentUserId()));
    }

    @PutMapping("/{affiliateId}/reject")
    public ResponseEntity<AffiliateProfileDTO> reject(
            @PathVariable Long affiliateId,
            @RequestBody(required = false) AffiliateApprovalRequest request) {
        String reason = request != null ? request.getReason() : null;
        log.info("Super Admin {} rejecting affiliate {}", currentUserId(), affiliateId);
        return ResponseEntity.ok(affiliateService.rejectAffiliate(affiliateId, reason, currentUserId()));
    }

    @PutMapping("/{affiliateId}/suspend")
    public ResponseEntity<AffiliateProfileDTO> suspend(
            @PathVariable Long affiliateId,
            @RequestBody(required = false) AffiliateApprovalRequest request) {
        String reason = request != null ? request.getReason() : null;
        log.info("Super Admin {} suspending affiliate {}", currentUserId(), affiliateId);
        return ResponseEntity.ok(affiliateService.suspendAffiliate(affiliateId, reason, currentUserId()));
    }

    @PutMapping("/{affiliateId}/activate")
    public ResponseEntity<AffiliateProfileDTO> activate(@PathVariable Long affiliateId) {
        log.info("Super Admin {} re-activating affiliate {}", currentUserId(), affiliateId);
        return ResponseEntity.ok(affiliateService.activateAffiliate(affiliateId, currentUserId()));
    }

    // ── Region management ─────────────────────────────────────────────────────

    @GetMapping("/{affiliateId}/regions")
    public ResponseEntity<List<AffiliateRegionDTO>> getRegions(@PathVariable Long affiliateId) {
        return ResponseEntity.ok(affiliateService.getRegions(affiliateId));
    }

    @PostMapping("/{affiliateId}/regions")
    public ResponseEntity<AffiliateRegionDTO> addRegion(
            @PathVariable Long affiliateId,
            @Valid @RequestBody RegionSelection request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(affiliateService.addRegion(affiliateId, request));
    }

    @PutMapping("/{affiliateId}/regions/{regionId}")
    public ResponseEntity<AffiliateRegionDTO> updateRegion(
            @PathVariable Long affiliateId,
            @PathVariable Long regionId,
            @RequestBody RegionSelection request) {
        return ResponseEntity.ok(affiliateService.updateRegion(affiliateId, regionId, request));
    }

    @DeleteMapping("/{affiliateId}/regions/{regionId}")
    public ResponseEntity<Void> removeRegion(
            @PathVariable Long affiliateId,
            @PathVariable Long regionId) {
        affiliateService.removeRegion(affiliateId, regionId);
        return ResponseEntity.noContent().build();
    }

    // ── Ranking ───────────────────────────────────────────────────────────────

    @GetMapping("/ranking")
    public ResponseEntity<List<AffiliateStatsDTO>> getMonthlyRanking() {
        return ResponseEntity.ok(affiliateService.getMonthlyRanking());
    }

    // ── Bonus management ──────────────────────────────────────────────────────

    /**
     * Calculate and persist bonuses for a given month/year.
     * Defaults to previous month if no params supplied.
     */
    @PostMapping("/bonuses/calculate")
    public ResponseEntity<List<MonthlyBonusDTO>> calculateBonuses(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        LocalDate ref = LocalDate.now().minusMonths(1);
        int m = month != null ? month : ref.getMonthValue();
        int y = year  != null ? year  : ref.getYear();
        log.info("Super Admin {} calculating bonuses for {}/{}", currentUserId(), m, y);
        return ResponseEntity.ok(monthlyBonusService.calculateAndSaveMonthlyBonuses(m, y));
    }

    /**
     * Apply saved bonuses to affiliate profiles for the given month/year.
     * Defaults to current month if no params supplied.
     */
    @PostMapping("/bonuses/apply")
    public ResponseEntity<Void> applyBonuses(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        LocalDate now = LocalDate.now();
        int m = month != null ? month : now.getMonthValue();
        int y = year  != null ? year  : now.getYear();
        log.info("Super Admin {} applying bonuses for {}/{}", currentUserId(), m, y);
        monthlyBonusService.applyBonusesForMonth(m, y);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/bonuses")
    public ResponseEntity<List<MonthlyBonusDTO>> getBonuses(
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        LocalDate now = LocalDate.now();
        int m = month != null ? month : now.getMonthValue();
        int y = year  != null ? year  : now.getYear();
        return ResponseEntity.ok(monthlyBonusService.getBonusesForMonth(m, y));
    }

    @GetMapping("/{affiliateId}/bonuses")
    public ResponseEntity<List<MonthlyBonusDTO>> getAffiliateBonusHistory(@PathVariable Long affiliateId) {
        return ResponseEntity.ok(monthlyBonusService.getBonusHistoryForAffiliate(affiliateId));
    }

    // ── Transactions / payouts ────────────────────────────────────────────────

    @GetMapping("/transactions")
    public ResponseEntity<List<AffiliateTransactionDTO>> getAllTransactions() {
        return ResponseEntity.ok(affiliateService.getAllTransactions());
    }

    @PutMapping("/transactions/{transactionId}/pay")
    public ResponseEntity<Void> markCommissionPaid(@PathVariable Long transactionId) {
        log.info("Super Admin {} marking commission paid for transaction {}", currentUserId(), transactionId);
        affiliateService.markCommissionPaid(transactionId);
        return ResponseEntity.ok().build();
    }

    // ── Security context helper ───────────────────────────────────────────────

    private Long currentUserId() {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) {
            return ud.getUserId();
        }
        throw new RuntimeException("User not authenticated");
    }
}
