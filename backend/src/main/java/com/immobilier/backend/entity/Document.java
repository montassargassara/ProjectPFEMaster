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
@Table(name = "documents")
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "client_id")
    private Client client;
    
    @ManyToOne
    @JoinColumn(name = "sale_id")
    private Sale sale;
    
    private String fileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    
    @Enumerated(EnumType.STRING)
    private DocumentType type; // CONTRAT, PIECE_IDENTITE, JUSTIFICATIF_DOMAICILE, ATTESTATION
    
    private String description;
    
    @ManyToOne
    @JoinColumn(name = "uploaded_by_id")
    private User uploadedBy;
    
    private LocalDateTime uploadedAt;
}*/
