package com.immobilier.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.springframework.util.StringUtils;

import java.time.LocalDateTime;

@Entity
@Table(name = "properties", indexes = {
    @Index(name = "idx_properties_is_active", columnList = "is_active"),
    @Index(name = "idx_properties_statut", columnList = "statut"),
    @Index(name = "idx_properties_type", columnList = "type"),
    @Index(name = "idx_properties_created_at", columnList = "created_at"),
    @Index(name = "idx_properties_price_vente", columnList = "prix_vente"),
    @Index(name = "idx_properties_price_location", columnList = "prix_location"),
    @Index(name = "idx_properties_commission", columnList = "commission_percentage"),
    @Index(name = "idx_properties_country", columnList = "country"),
    @Index(name = "idx_properties_city", columnList = "city"),
    @Index(name = "idx_properties_owner_type", columnList = "owner_type"),
    @Index(name = "idx_properties_agency_admin", columnList = "agency_admin_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Property {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 255)
    private String titre;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(name = "prix_vente")
    private Double prixVente;

    @Column(name = "prix_location")
    private Double prixLocation;

    @Column(nullable = false, length = 50)
    private String statut;

    private Double surface;

    @Column(name = "nb_chambres")
    private Integer nbChambres;

    @Column(nullable = false, length = 500)
    private String adresse;

    @Column(length = 100)
    private String country;

    @Column(length = 100)
    private String city;

    @Column(length = 100)
    private String region;

    private Double latitude;
    private Double longitude;

    @Column(name = "main_image_id")
    private Long mainImageId;
    
    @Column(name = "main_video_id")
    private Long mainVideoId;
    
    @Column(name = "main_model_3d_id")
    private Long mainModel3dId;

    @Column(name = "commission_percentage")
    private Double commissionPercentage;

    @Column(name = "commission_type")
    private String commissionType = "PERCENTAGE";

    @Column(name = "base_price_for_commission")
    private Double basePriceForCommission;

    // ─── Multi-tenant ownership ───────────────────────────────────────────────
    // SUPER_ADMIN_OWNED: created by super admin, private until shared
    // AGENCY_OWNED: created by an agency (admin/staff)
    // NULL: legacy row, treated as visible to all authenticated users
    @Column(name = "owner_type", length = 30)
    private String ownerType;

    // The ADMIN user who owns this property (null for SUPER_ADMIN_OWNED)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agency_admin_id")
    private User agencyAdmin;
    // ─────────────────────────────────────────────────────────────────────────

    // When true, active affiliates in the matching zone can see and submit offers on this property
    @Column(name = "is_affiliate_eligible")
    private Boolean isAffiliateEligible = false;

    // Set to true when an affiliate sale offer is accepted — hides property from other affiliates
    @Column(name = "is_reserved_by_affiliate")
    private Boolean isReservedByAffiliate = false;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void validateStatusAndCategory() {
        // Validate status based on category
        String category = getCategory();
        
        if (category == null) {
            if (statut == null) statut = "DISPONIBLE";
            if (isActive == null) isActive = true;
            if (isAffiliateEligible == null) isAffiliateEligible = false;
            if (isReservedByAffiliate == null) isReservedByAffiliate = false;
            if (commissionType == null) commissionType = "PERCENTAGE";
            if (commissionPercentage == null) {
                commissionPercentage = 0.0;
            }
            return;
        }
        
        if ("VENTE".equals(category)) {
            // Vente properties cannot have rental statuses
            if ("LOUE".equals(statut)) {
                throw new IllegalStateException(
                    "Une propriété en vente ne peut pas avoir le statut 'LOUE'. " +
                    "Statuts autorisés pour la vente: DISPONIBLE, EN_ATTENTE, VENDU"
                );
            }
            // Ensure price is set for sale
            if (prixVente == null || prixVente <= 0) {
                throw new IllegalStateException(
                    "Une propriété en vente doit avoir un prix de vente valide"
                );
            }
            // Clear rental price if set by mistake
            if (prixLocation != null && prixLocation > 0) {
                prixLocation = null;
            }
        } else if ("LOCATION".equals(category)) {
            // Rental properties cannot have sold status
            if ("VENDU".equals(statut)) {
                throw new IllegalStateException(
                    "Une propriété en location ne peut pas avoir le statut 'VENDU'. " +
                    "Statuts autorisés pour la location: DISPONIBLE, EN_ATTENTE, LOUE"
                );
            }
            // Ensure rental price is set
            if (prixLocation == null || prixLocation <= 0) {
                throw new IllegalStateException(
                    "Une propriété en location doit avoir un prix de location valide"
                );
            }
            // Clear sale price if set by mistake
            if (prixVente != null && prixVente > 0) {
                prixVente = null;
            }
            // Rental properties NEVER use the commission + affiliate workflow.
            // Force-reset these fields so a leaked or stale value cannot expose
            // the property to affiliates or imply a sale commission.
            commissionPercentage = 0.0;
            commissionType = "PERCENTAGE";
            basePriceForCommission = null;
            isAffiliateEligible = false;
            isReservedByAffiliate = false;
        }
        
        // Set default status if null
        if (statut == null) {
            statut = "DISPONIBLE";
        }
        
        if (isActive == null) isActive = true;
        if (isAffiliateEligible == null) isAffiliateEligible = false;
        if (commissionType == null) commissionType = "PERCENTAGE";
        if (commissionPercentage == null) {
            commissionPercentage = getDefaultCommissionByType(type);
        }
    }

    /**
     * Get the category of the property (VENTE or LOCATION)
     */
    public String getCategory() {
        boolean isSale = prixVente != null && prixVente > 0;
        boolean isRental = prixLocation != null && prixLocation > 0;
        
        if (isSale && !isRental) {
            return "VENTE";
        } else if (!isSale && isRental) {
            return "LOCATION";
        } else if (isSale && isRental) {
            // Both prices set - determine based on which is primary or throw
            throw new IllegalStateException(
                "Une propriété ne peut pas être à la fois en vente et en location. " +
                "Veuillez spécifier soit un prix de vente, soit un prix de location."
            );
        }
        return null;
    }
    
    /**
     * Check if status is valid for current category
     */
    public boolean isStatusValidForCategory() {
        String category = getCategory();
        if (category == null) return true;
        
        if ("VENTE".equals(category)) {
            return !"LOUE".equals(statut);
        } else if ("LOCATION".equals(category)) {
            return !"VENDU".equals(statut);
        }
        return true;
    }
    
    /**
     * Get allowed statuses for current category
     */
    public java.util.List<String> getAllowedStatuses() {
        String category = getCategory();
        if ("VENTE".equals(category)) {
            return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "VENDU");
        } else if ("LOCATION".equals(category)) {
            return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "LOUE");
        }
        return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "VENDU", "LOUE", "RESERVE");
    }
    
    /**
     * Get valid statuses for a given category (static version)
     */
    public static java.util.List<String> getAllowedStatusesForCategory(String category) {
        if ("VENTE".equals(category)) {
            return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "VENDU");
        } else if ("LOCATION".equals(category)) {
            return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "LOUE");
        }
        return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "VENDU", "LOUE", "RESERVE");
    }
    
    /**
     * Validate if a status is allowed for a category
     */
    public static boolean isStatusAllowedForCategory(String category, String status) {
        if ("VENTE".equals(category)) {
            return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "VENDU").contains(status);
        } else if ("LOCATION".equals(category)) {
            return java.util.Arrays.asList("DISPONIBLE", "EN_ATTENTE", "LOUE").contains(status);
        }
        return true;
    }

    private Double getDefaultCommissionByType(String propertyType) {
        switch (propertyType) {
            case "VILLA":
                return 5.0;
            case "MAISON":
                return 4.5;
            case "APPARTEMENT":
                return 4.0;
            case "TERRAIN":
                return 6.0;
            case "COMMERCIAL":
                return 7.0;
            default:
                return 5.0;
        }
    }

    public Double calculateCommissionAmount() {
        if (commissionPercentage == null) return 0.0;
        
        Double priceToUse = getPriceForCommission();
        if (priceToUse == null) return 0.0;
        
        if ("FIXED".equals(commissionType)) {
            return commissionPercentage;
        } else {
            return priceToUse * (commissionPercentage / 100);
        }
    }

    public Double getPriceForCommission() {
        if (basePriceForCommission != null) {
            return basePriceForCommission;
        }
        if (prixVente != null && prixVente > 0) {
            return prixVente;
        }
        if (prixLocation != null && prixLocation > 0) {
            return prixLocation * 12;
        }
        return null;
    }

    public String getCommissionDisplay() {
        if (commissionPercentage == null) return "N/A";
        
        if ("FIXED".equals(commissionType)) {
            return String.format("%.0f TND", commissionPercentage);
        } else {
            return String.format("%.1f%%", commissionPercentage);
        }
    }
}