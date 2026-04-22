/*package com.immobilier.backend.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import com.immobilier.backend.enums.CommissionStatus;

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
@Table(name = "commissions")
public class Commission {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "sale_id", nullable = false)
    private Sale sale;
    
    @ManyToOne
    @JoinColumn(name = "recipient_id", nullable = false)
    private User recipient; // Commercial ou Affilié
    
    @Column(nullable = false)
    private Double amount;
    
    private Double percentage; // Pourcentage appliqué
    
    @Enumerated(EnumType.STRING)
    private CommissionType type; // COMMERCIAL, AFFILIATE, RESPONSABLE
    
    @Enumerated(EnumType.STRING)
    private CommissionStatus status; // EN_ATTENTE, VALIDEE, PAYEE, ANNULEE
    
    private LocalDateTime dueDate;
    private LocalDateTime paymentDate;
    private String paymentReference;
    private String notes;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}*/

