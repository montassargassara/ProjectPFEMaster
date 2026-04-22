/*package com.immobilier.backend.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "sales")
public class Sale {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;
    
    @ManyToOne
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;
    
    @ManyToOne
    @JoinColumn(name = "commercial_id", nullable = false)
    private User commercial;
    
    @ManyToOne
    @JoinColumn(name = "affiliate_id")
    private User affiliate; // Optionnel - si vente via affilié
    
    @Column(nullable = false)
    private Double salePrice;
    
    @Column(nullable = false)
    private LocalDateTime saleDate;
    
    @Enumerated(EnumType.STRING)
    private SaleStatus status; // EN_ATTENTE, VALIDEE, ANNULEE, LIVREE
    
    private String contractNumber;
    private LocalDateTime signatureDate;
    private String notes;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}
 */