/*package com.immobilier.backend.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "leads")
public class Lead {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "client_id")
    private Client client; // Optionnel - si lead qualifié
    
    private String nom;
    private String prenom;
    private String email;
    private String telephone;
    
    @Enumerated(EnumType.STRING)
    private LeadStatus status; // NOUVEAU, QUALIFIE, PROPOSITION_ENVOYEE, NEGOCIATION, CONCLU, PERDU
    
    @Enumerated(EnumType.STRING)
    private LeadSource source; // Formulaire site, Appel entrant, Référence, Evenement
    
    @ManyToOne
    @JoinColumn(name = "property_interest_id")
    private Property propertyInterest; // Bien qui intéresse
    
    private Double budgetMin;
    private Double budgetMax;
    private String preferences;
    private LocalDateTime followUpDate;
    private String notes;
    
    @ManyToOne
    @JoinColumn(name = "assigned_commercial_id")
    private User assignedCommercial;
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
} */