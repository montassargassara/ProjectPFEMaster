package com.immobilier.backend.dto;

import lombok.Data;
import jakarta.validation.constraints.*;

@Data
public class RegionSelection {
    @NotBlank(message = "Le nom de la région est requis")
    private String regionName;

    /** Optional explicit country (e.g. "Tunisia"). When provided with city, used for strict matching. */
    private String country;

    /** Optional explicit city (e.g. "Tunis"). When provided with country, used for strict matching. */
    private String city;

    private String regionDescription;

    @NotNull(message = "Le pourcentage de commission est requis")
    @DecimalMin(value = "0.0", message = "Le pourcentage doit être positif")
    @DecimalMax(value = "100.0", message = "Le pourcentage ne peut pas dépasser 100%")
    private Double commissionPercentage;
}
