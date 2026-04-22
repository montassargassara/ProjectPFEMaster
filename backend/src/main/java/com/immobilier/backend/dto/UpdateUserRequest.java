package com.immobilier.backend.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String nom;
    private String prenom;
    private String telephone;
    private Boolean isActive;
}