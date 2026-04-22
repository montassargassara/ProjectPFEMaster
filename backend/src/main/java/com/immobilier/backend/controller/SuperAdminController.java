package com.immobilier.backend.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;  // Add this import

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.immobilier.backend.dto.AffiliateRegionDTO;
import com.immobilier.backend.dto.AffiliateStatsDTO;
import com.immobilier.backend.dto.AffiliateTransactionDTO;
import com.immobilier.backend.dto.ChangePasswordRequest;
import com.immobilier.backend.dto.CreateUserRequest;
import com.immobilier.backend.dto.RegionSelection;
import com.immobilier.backend.dto.RegisterAffiliateRequest;
import com.immobilier.backend.dto.UpdateUserRequest;
import com.immobilier.backend.dto.UserDTO;
import com.immobilier.backend.enums.RoleType;
import com.immobilier.backend.service.AffiliateService;
import com.immobilier.backend.service.SuperAdminService;
import com.immobilier.backend.service.UserService;

import jakarta.validation.Valid;

import java.util.List;
import java.util.Map;

@Slf4j  // Add this annotation
@RestController
@RequestMapping("/api/super-admin")
@RequiredArgsConstructor
public class SuperAdminController {
    
    private final SuperAdminService superAdminService;
    private final UserService userService;
    private final AffiliateService affiliateService;
    
    // ==================== DASHBOARD ====================
    
    @GetMapping("/dashboard/stats")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> stats = superAdminService.getDashboardStats();
        return ResponseEntity.ok(stats);
    }
    
    // ==================== GESTION UTILISATEURS ====================
    
    @PostMapping("/users")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> createUser(@RequestBody CreateUserRequest request) {
        UserDTO createdUser = userService.createUser(request);
        return ResponseEntity.ok(createdUser);
    }
    
    @PostMapping("/users/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> createAdmin(@RequestBody CreateUserRequest request) {
        UserDTO createdAdmin = superAdminService.createAdmin(request);
        return ResponseEntity.ok(createdAdmin);
    }
    
    @PostMapping("/users/responsable")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> createResponsable(@RequestBody CreateUserRequest request) {
        UserDTO createdResponsable = superAdminService.createResponsable(request);
        return ResponseEntity.ok(createdResponsable);
    }
    
    @GetMapping("/users")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(user);
    }
    
    @GetMapping("/users/role/{role}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<UserDTO>> getUsersByRole(@PathVariable RoleType role) {
        List<UserDTO> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/users/active")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<UserDTO>> getActiveUsers() {
        List<UserDTO> users = userService.getActiveUsers();
        return ResponseEntity.ok(users);
    }
    
    @PutMapping("/users/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request) {
        UserDTO updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }
    
    @PutMapping("/users/{id}/password")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> changePassword(
            @PathVariable Long id,
            @RequestBody ChangePasswordRequest request) {
        userService.changePassword(id, request);
        return ResponseEntity.ok("Mot de passe modifié avec succès");
    }
    
    @PutMapping("/users/{id}/activate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> activateUser(@PathVariable Long id) {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setIsActive(true);
        UserDTO updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }

    @PostMapping("/users/affiliate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> createAffiliate(@Valid @RequestBody RegisterAffiliateRequest request) {
        log.info("👑 Super admin creating affiliate: {}", request.getEmail());
        UserDTO createdAffiliate = affiliateService.registerAffiliate(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdAffiliate);
    }

    // Add these to SuperAdminController.java

// Get all affiliates (for super admin)
    @GetMapping("/affiliates")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<UserDTO>> getAllAffiliates() {
        log.info("👑 Super admin getting all affiliates");
        List<UserDTO> affiliates = userService.getUsersByRole(RoleType.AFFILIATE);
        return ResponseEntity.ok(affiliates);
    }

    // Get affiliate details by ID
    @GetMapping("/affiliates/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AffiliateStatsDTO> getAffiliateDetails(@PathVariable Long id) {
        log.info("👑 Super admin getting affiliate details for ID: {}", id);
        AffiliateStatsDTO stats = affiliateService.getAffiliateStats(id);
        return ResponseEntity.ok(stats);
    }

    // Get all affiliate transactions (super admin view)
    @GetMapping("/affiliates/transactions")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<AffiliateTransactionDTO>> getAllAffiliateTransactions() {
        log.info("👑 Super admin getting all affiliate transactions");
        // You'll need to add this method to AffiliateService
        List<AffiliateTransactionDTO> transactions = affiliateService.getAllAffiliateTransactions();
        return ResponseEntity.ok(transactions);
    }

    // Update affiliate region (super admin)
    @PutMapping("/affiliates/{affiliateId}/regions/{regionId}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AffiliateRegionDTO> updateAffiliateRegion(
            @PathVariable Long affiliateId,
            @PathVariable Long regionId,
            @Valid @RequestBody RegionSelection regionSelection) {
        log.info("👑 Super admin updating region {} for affiliate {}", regionId, affiliateId);
        AffiliateRegionDTO updatedRegion = affiliateService.updateAffiliateRegion(affiliateId, regionId, regionSelection);
        return ResponseEntity.ok(updatedRegion);
    }

    // Get affiliate ranking (protected for super admin and affiliates)
    @GetMapping("/affiliates/ranking")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN', 'RESPONSABLE_COMMERCIAL')")
    public ResponseEntity<List<AffiliateStatsDTO>> getAffiliateRankingForAdmin() {
        log.info("👑 Getting affiliate ranking for admin");
        List<AffiliateStatsDTO> ranking = affiliateService.getMonthlyRanking();
        return ResponseEntity.ok(ranking);
    }
    
    @PutMapping("/users/{id}/deactivate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserDTO> deactivateUser(@PathVariable Long id) {
        UpdateUserRequest request = new UpdateUserRequest();
        request.setIsActive(false);
        UserDTO updatedUser = userService.updateUser(id, request);
        return ResponseEntity.ok(updatedUser);
    }
    
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok("Utilisateur désactivé avec succès");
    }
    
    // ==================== INITIALISATION ====================
    
    @PostMapping("/init")
    public ResponseEntity<String> initSuperAdmin() {
        superAdminService.initFirstSuperAdmin();
        return ResponseEntity.ok("Super Admin initialisé avec succès");
    }
}