package com.immobilier.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class InterestRequestDTO {
    private Long id;
    private Long propertyId;
    private String propertyTitle;
    private String propertyCity;
    private String propertyCountry;
    private String propertyMainImageUrl;
    private String fullName;
    private String email;
    private String telephone;
    private String message;
    private Double proposedBudget;
    private String status;
    private String agencyName;
    private LocalDateTime createdAt;
}
