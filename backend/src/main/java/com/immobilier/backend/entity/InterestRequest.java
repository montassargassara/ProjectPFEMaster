package com.immobilier.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "interest_requests", indexes = {
        @Index(name = "idx_interest_user", columnList = "user_id"),
        @Index(name = "idx_interest_property", columnList = "property_id"),
        @Index(name = "idx_interest_owner", columnList = "owner_user_id"),
        @Index(name = "idx_interest_status", columnList = "status")
})
@Data
@NoArgsConstructor
public class InterestRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "property_id", nullable = false)
    private Property property;

    /** Property owner at time of submission — agency admin or super admin. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id")
    private User ownerUser;

    @Column(name = "full_name", length = 160)
    private String fullName;

    @Column(length = 160)
    private String email;

    @Column(length = 60)
    private String telephone;

    @Column(length = 1000)
    private String message;

    @Column(name = "proposed_budget")
    private Double proposedBudget;

    @Column(nullable = false, length = 20)
    private String status = "PENDING"; // PENDING, CONTACTED, CLOSED

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
