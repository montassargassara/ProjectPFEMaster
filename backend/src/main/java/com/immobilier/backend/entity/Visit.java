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
@Table(name = "visits")
public class Visit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;
    
    @ManyToOne
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;
    
    @ManyToOne
    @JoinColumn(name = "commercial_id", nullable = false)
    private User commercial;
    
    private LocalDateTime scheduledDate;
    private LocalDateTime actualDate;
    private Integer durationMinutes;
    
    @Enumerated(EnumType.STRING)
    private VisitStatus status; // PLANIFIEE, CONFIRMEE, EFFECTUEE, ANNULEE, REPORTEE
    
    private String clientFeedback;
    private String commercialNotes;
    private String clientSatisfaction; // TRES_SATISFAIT, SATISFAIT, NEUTRE, INSATISFAIT
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}
 */