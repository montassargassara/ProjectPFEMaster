package com.immobilier.backend.dto;

import lombok.Data;
import javax.validation.constraints.*;

@Data
public class RegionSelection {
    @NotBlank(message = "Le nom de la région est requis")
    private String regionName;
    
    private String regionDescription;
    
    @NotNull(message = "Le pourcentage de commission est requis")
    @DecimalMin(value = "0.0", message = "Le pourcentage doit être positif")
    @DecimalMax(value = "100.0", message = "Le pourcentage ne peut pas dépasser 100%")
    private Double commissionPercentage;
}
