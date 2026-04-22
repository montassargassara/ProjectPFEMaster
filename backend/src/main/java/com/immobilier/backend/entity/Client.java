/*package com.immobilier.backend.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.immobilier.backend.enums.ClientSource;
import com.immobilier.backend.enums.ClientStatus;

import jakarta.persistence.Column;
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
@Table(name = "clients")
public class Client {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String nom;
    
    @Column(nullable = false)
    private String prenom;
    
    private String email;
    private String telephone;
    private String telephoneSecondaire;
    private String adresse;
    private String ville;
    private String codePostal;
    private String pays;
    
    @Enumerated(EnumType.STRING)
    private ClientStatus status; // NOUVEAU, CONTACTE, VISITE_PLANIFIEE, NEGOCIATION, GAGNE, PERDU
    
    @Enumerated(EnumType.STRING)
    private ClientSource source; // AFFILIATE, COMMERCIAL, WEBSITE, SOCIAL, REFERRAL, DIRECT
    
    @Column(name = "source_id")
    private Long sourceId; // ID de l'affilié ou commercial source
    
    @ManyToOne
    @JoinColumn(name = "assigned_commercial_id")
    private User assignedCommercial; // Commercial responsable
    
    @ManyToOne
    @JoinColumn(name = "assigned_affiliate_id")
    private User assignedAffiliate; // Affilié qui a référé
    
    private String notes;
    private LocalDateTime firstContactDate;
    private LocalDateTime lastActivityDate;
    private LocalDateTime conversionDate; // Date où est devenu client
    
    private Boolean isActive = true;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}*/

