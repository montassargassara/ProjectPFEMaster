package com.immobilier.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class PropertyDTO {
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
    
    // Commission fields
    private Double commissionPercentage;
    private String commissionType;
    
    // Image fields
    private String mainImageName;
    private String mainImageType;
    private Long mainImageSize;
    private String mainImageUrl;
    private boolean hasMainImage;
    
    // Model 3D fields
    private String model3dName;
    private String model3dType;
    private Long model3dSize;
    private String model3dUrl;
    private boolean hasModel3d;
    
    // Media list
    private List<PropertyMediaDTO> medias;
}