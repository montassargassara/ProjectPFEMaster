package com.immobilier.backend.dto;

import java.util.List;

import com.immobilier.backend.enums.RoleType;

import lombok.Data;

@Data
public class CreateUserRequest {
    private String email;
    private String password;
    private String nom;
    private String prenom;
    private String telephone;
    private RoleType role;
    private List<RegionSelection> selectedRegions;
}
