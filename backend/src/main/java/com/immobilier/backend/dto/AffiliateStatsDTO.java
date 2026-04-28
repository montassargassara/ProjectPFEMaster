package com.immobilier.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AffiliateStatsDTO {
    private Long affiliateId;
    private String affiliateName;

    // Sales / activities
    private Integer totalSales;
    private Integer totalViews;
    private Integer totalShares;
    private Integer totalContacts;
    private Integer totalVisits;

    // Revenue
    private Double totalRevenue;
    private Double pendingCommission;
    private Double paidCommission;

    // Offer stats
    private Integer totalOffersPending;
    private Integer totalOffersAccepted;
    private Integer totalOffersRejected;

    // Ranking
    private Double conversionRate;
    private Integer rank;
    private LocalDateTime lastActivity;

    // Bonus for current month (0.0 if none active)
    private Double currentBonusPercentage;
    private LocalDateTime bonusExpiresAt;
}
