package com.immobilier.backend.dto;

import lombok.Data;

@Data
public class AuthDTO {
    private String token;
    private String email;
    private String role;
    private String nom;
    private String prenom;
    private Long userId;
    
    public AuthDTO(String token, String email, String role, 
                       String nom, String prenom, Long userId) {
        this.token = token;
        this.email = email;
        this.role = role;
        this.nom = nom;
        this.prenom = prenom;
        this.userId = userId;
    }
}