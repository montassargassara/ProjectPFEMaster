package com.immobilier.backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ClientPublicRegisterRequest {
    @NotBlank @Size(min = 2, max = 80)
    private String nom;

    @NotBlank @Size(min = 2, max = 80)
    private String prenom;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 8, max = 64)
    private String telephone;

    @NotBlank @Size(min = 6, max = 100)
    private String password;
}
