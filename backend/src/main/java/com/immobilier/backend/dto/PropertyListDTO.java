package com.immobilier.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PropertyListDTO {
    private Long id;
    private String titre;
    private String description;
    private String type;
    private Double prixVente;
    private Double prixLocation;
    private String statut;
    private Double surface;
    private Integer nbChambres;
    private String adresse;
    private String country;  // Add this field
    private String city;     // Add this field
    private Double latitude;
    private Double longitude;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // ✅ Seulement les métadonnées, pas les BLOBs !
    private String mainImageName;
    private String mainImageType;
    private Long mainImageSize;
    private String mainImageUrl;
    private boolean hasMainImage;
    
    private String model3dName;
    private String model3dType;
    private Long model3dSize;
    private String model3dUrl;
    private boolean hasModel3d;
    
    // Ownership / multi-tenant fields
    private String ownerType;
    private Long agencyAdminId;
    private String agencyAdminName;

    private Boolean isAffiliateEligible;

    // ✅ Pour les listes, pas de médias (trop lourd)
    // private List<PropertyMediaDTO> medias;
}