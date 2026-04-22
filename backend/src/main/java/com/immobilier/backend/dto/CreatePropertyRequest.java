package com.immobilier.backend.dto;

import com.immobilier.backend.validation.ValidPropertyStatus;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@ValidPropertyStatus
public class CreatePropertyRequest {
    @NotBlank(message = "Le titre est obligatoire")
    private String titre;
    
    private String description;
    
    @NotBlank(message = "Le type est obligatoire")
    private String type;
    
    @NotNull(message = "Le prix de vente ou le prix de location doit être spécifié")
    private Double prixVente;
    
    private Double prixLocation;
    
    private String statut = "DISPONIBLE";
    
    private Double surface;
    private Integer nbChambres;
    
    @NotBlank(message = "L'adresse est obligatoire")
    private String adresse;
    
    private String country;
    private String city;
    private Double latitude;
    private Double longitude;

    private Double commissionPercentage;
    private String commissionType = "PERCENTAGE";
    private Double basePriceForCommission;
    
    private List<PropertyMediaDTO> medias;
    
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