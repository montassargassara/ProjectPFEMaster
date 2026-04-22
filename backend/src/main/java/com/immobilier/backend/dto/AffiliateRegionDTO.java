package com.immobilier.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AffiliateRegionDTO {
    private Long id;
    private Long affiliateId;
    private String affiliateName;
    private String regionName;
    private String regionDescription;
    private Double commissionPercentage;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
