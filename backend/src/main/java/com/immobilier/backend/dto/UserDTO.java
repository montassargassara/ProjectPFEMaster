package com.immobilier.backend.dto;

import lombok.Data;
import java.time.LocalDateTime;

import com.immobilier.backend.enums.RoleType;

@Data
public class UserDTO {
    private Long id;
    private String email;
    private String nom;
    private String prenom;
    private String telephone;
    private RoleType role;
    private Boolean isActive;
    private LocalDateTime createdAt;
}
