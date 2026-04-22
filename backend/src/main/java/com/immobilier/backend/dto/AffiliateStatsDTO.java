package com.immobilier.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AffiliateStatsDTO {
    private Long affiliateId;
    private String affiliateName;
    private Integer totalSales;
    private Integer totalViews;
    private Integer totalShares;
    private Integer totalContacts;
    private Integer totalVisits;
    private Double totalRevenue;
    private Double pendingCommission;
    private Double paidCommission;
    private Double conversionRate;
    private Integer rank;
    private LocalDateTime lastActivity;
}
