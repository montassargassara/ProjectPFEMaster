package com.immobilier.backend.controller;

import com.immobilier.backend.dto.ClientCountDTO;
import com.immobilier.backend.dto.RecentClientsDTO;
import com.immobilier.backend.service.DashboardVisibilityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardVisibilityService dashboardVisibilityService;

    /**
     * GET /api/dashboard/client-count
     * Retourne le nombre de clients visibles pour l'utilisateur connecté
     */
    @GetMapping("/client-count")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ClientCountDTO> getClientCount() {
        ClientCountDTO count = dashboardVisibilityService.getVisibleClientsCount();
        return ResponseEntity.ok(count);
    }

    /**
     * GET /api/dashboard/recent-clients
     * Retourne les clients récents visibles pour l'utilisateur connecté
     */
    @GetMapping("/recent-clients")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<RecentClientsDTO>> getRecentClients(
            @RequestParam(defaultValue = "6") int limit) {
        List<RecentClientsDTO> recentClients = dashboardVisibilityService.getRecentVisibleClients(limit);
        return ResponseEntity.ok(recentClients);
    }
}