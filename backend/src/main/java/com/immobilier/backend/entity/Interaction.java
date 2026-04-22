/*package com.immobilier.backend.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "interactions")
public class Interaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // Commercial qui a interagi
    
    @Enumerated(EnumType.STRING)
    private InteractionType type; // APPEL, EMAIL, VISITE, MESSAGE, RENDEZ_VOUS
    
    private String subject;
    private String content;
    private LocalDateTime interactionDate;
    private Boolean isFollowUpNeeded;
    private LocalDateTime followUpDate;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}
 */