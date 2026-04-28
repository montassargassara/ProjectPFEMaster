package com.immobilier.backend.dto;

import lombok.Data;

/**
 * Represents a geographic zone the affiliate doesn't cover yet but shows high opportunity.
 * Returned by GET /api/affiliate/suggested-zones.
 */
@Data
public class SuggestedZoneDTO {
    private String zoneName;
    private String country;
    private int propertyCount;
    private double averageCommission;
    private double averagePrice;
    /** Approximate demand score: number of accepted/completed sale offers in this zone. */
    private int demandScore;
    /** Composite opportunity score used for server-side ranking (not always sent to frontend). */
    private double opportunityScore;
}
