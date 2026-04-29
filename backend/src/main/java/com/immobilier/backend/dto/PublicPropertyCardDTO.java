package com.immobilier.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PublicPropertyCardDTO {
    private Long id;
    private String titre;
    private String type;
    private String category;
    private Double prixVente;
    private Double prixLocation;
    private Double surface;
    private Integer nbChambres;
    private String city;
    private String country;
    private String region;
    private Double latitude;
    private Double longitude;
    private String mainImageUrl;
    private boolean hasModel3d;
    private String agencyName;
    private LocalDateTime createdAt;
}
