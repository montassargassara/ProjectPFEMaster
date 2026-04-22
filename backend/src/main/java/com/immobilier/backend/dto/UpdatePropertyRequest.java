package com.immobilier.backend.dto;

import com.immobilier.backend.validation.ValidPropertyStatus;
import lombok.Data;

@Data
@ValidPropertyStatus
public class UpdatePropertyRequest {
    private String titre;
    private String description;
    private String type;
    private Double prixVente;
    private Double prixLocation;
    private String statut;
    private Double surface;
    private Integer nbChambres;
    private String adresse;
    private String country;
    private String city;
    private Double latitude;
    private Double longitude;
    private Boolean isActive;
    
    private MediaUpdateMode mediaUpdateMode = MediaUpdateMode.REPLACE;
    private java.util.List<PropertyMediaDTO> medias;
    private java.util.List<Long> mediaIdsToDelete;
    
    public enum MediaUpdateMode {
        REPLACE, APPEND
    }
    
    /**
     * Helper method to get category based on which price is set
     */
    public String getCategory() {
        boolean hasSalePrice = prixVente != null && prixVente > 0;
        boolean hasRentalPrice = prixLocation != null && prixLocation > 0;
        
        if (hasSalePrice && !hasRentalPrice) {
            return "VENTE";
        } else if (!hasSalePrice && hasRentalPrice) {
            return "LOCATION";
        } else if (hasSalePrice && hasRentalPrice) {
            throw new IllegalArgumentException(
                "Une propriété ne peut pas être à la fois en vente et en location"
            );
        }
        return null;
    }
}