package com.immobilier.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Persists the bonus awarded to top-3 affiliates at end of each ranking month.
 *
 * rankingMonth/Year = the month whose leaderboard produced this bonus.
 * bonusMonth/Year   = the NEXT month when the bonus is actually applied.
 *
 * Default bonus rates (configurable via application.properties):
 *   Rank 1 → +2%   Rank 2 → +1.5%   Rank 3 → +1%
 */
@Entity
@Table(name = "monthly_bonuses",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_bonus_affiliate_month",
        columnNames = {"affiliate_id", "ranking_month", "ranking_year"}
    ),
    indexes = {
        @Index(name = "idx_bonus_affiliate",     columnList = "affiliate_id"),
        @Index(name = "idx_bonus_ranking_period", columnList = "ranking_month, ranking_year"),
        @Index(name = "idx_bonus_applied",        columnList = "is_applied")
    }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class MonthlyBonus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "affiliate_id", nullable = false)
    private User affiliate;

    // Month that was ranked (1–12)
    @Column(name = "ranking_month", nullable = false)
    private Integer rankingMonth;

    @Column(name = "ranking_year", nullable = false)
    private Integer rankingYear;

    // Position in that month's leaderboard (1, 2, or 3)
    @Column(nullable = false)
    private Integer rank;

    // Extra commission % added to base property commission
    @Column(name = "bonus_percentage", nullable = false)
    private Double bonusPercentage;

    // Month in which the bonus is applied (ranking month + 1)
    @Column(name = "bonus_month", nullable = false)
    private Integer bonusMonth;

    @Column(name = "bonus_year", nullable = false)
    private Integer bonusYear;

    // True once AffiliateProfile.bonusPercentage has been written for this record
    @Column(name = "is_applied", nullable = false)
    private Boolean isApplied = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
