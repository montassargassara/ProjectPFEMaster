package com.immobilier.backend.repository;

import com.immobilier.backend.entity.MonthlyBonus;
import com.immobilier.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MonthlyBonusRepository extends JpaRepository<MonthlyBonus, Long> {

    Optional<MonthlyBonus> findByAffiliateAndRankingMonthAndRankingYear(
            User affiliate, Integer rankingMonth, Integer rankingYear);

    List<MonthlyBonus> findByRankingMonthAndRankingYearOrderByRank(
            Integer rankingMonth, Integer rankingYear);

    List<MonthlyBonus> findByAffiliateIdOrderByCreatedAtDesc(Long affiliateId);

    // Find bonuses for a bonus month that haven't been applied to AffiliateProfile yet
    @Query("SELECT mb FROM MonthlyBonus mb WHERE mb.bonusMonth = :month AND mb.bonusYear = :year AND mb.isApplied = false")
    List<MonthlyBonus> findUnappliedForBonusMonth(@Param("month") Integer month, @Param("year") Integer year);

    boolean existsByAffiliateAndRankingMonthAndRankingYear(
            User affiliate, Integer rankingMonth, Integer rankingYear);
}
