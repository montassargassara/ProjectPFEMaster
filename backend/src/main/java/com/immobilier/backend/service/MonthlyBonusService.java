package com.immobilier.backend.service;

import com.immobilier.backend.dto.MonthlyBonusDTO;
import com.immobilier.backend.entity.MonthlyBonus;
import com.immobilier.backend.entity.User;
import com.immobilier.backend.enums.NotificationType;
import com.immobilier.backend.repository.AffiliateProfileRepository;
import com.immobilier.backend.repository.AffiliateTransactionRepository;
import com.immobilier.backend.repository.MonthlyBonusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Handles the monthly affiliate ranking bonus cycle.
 *
 * Call {@link #calculateAndSaveMonthlyBonuses(int, int)} at end of each month
 * (e.g. via a scheduled job or Super Admin trigger) to create MonthlyBonus records
 * for the top-3 affiliates of that month.
 *
 * Call {@link #applyBonusesForMonth(int, int)} at the start of the bonus month
 * to write the bonus % into each affiliate's AffiliateProfile.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MonthlyBonusService {

    // Configurable bonus percentages (defaults: 2%, 1.5%, 1%)
    @Value("${affiliate.bonus.rank1:2.0}")
    private double rank1Bonus;

    @Value("${affiliate.bonus.rank2:1.5}")
    private double rank2Bonus;

    @Value("${affiliate.bonus.rank3:1.0}")
    private double rank3Bonus;

    private final AffiliateTransactionRepository affiliateTransactionRepository;
    private final AffiliateProfileRepository affiliateProfileRepository;
    private final MonthlyBonusRepository monthlyBonusRepository;
    private final NotificationService notificationService;

    /**
     * Compute the top-3 affiliates for the given month/year and persist MonthlyBonus records.
     * Idempotent: skips affiliates that already have a record for this period.
     */
    @Transactional
    public List<MonthlyBonusDTO> calculateAndSaveMonthlyBonuses(int month, int year) {
        log.info("Calculating monthly bonuses for {}/{}", month, year);

        LocalDateTime periodStart = LocalDateTime.of(year, month, 1, 0, 0);

        List<Object[]> ranking = affiliateTransactionRepository.getRankingByAllCommissions(periodStart);

        // Next month for the bonus application
        YearMonth bonusPeriod = YearMonth.of(year, month).plusMonths(1);
        int bonusMonth = bonusPeriod.getMonthValue();
        int bonusYear  = bonusPeriod.getYear();

        double[] rates = {rank1Bonus, rank2Bonus, rank3Bonus};
        List<MonthlyBonusDTO> created = new ArrayList<>();

        for (int i = 0; i < Math.min(3, ranking.size()); i++) {
            User affiliate = (User) ranking.get(i)[0];
            int rank = i + 1;

            if (monthlyBonusRepository.existsByAffiliateAndRankingMonthAndRankingYear(affiliate, month, year)) {
                log.debug("Bonus already exists for affiliate {} month {}/{}", affiliate.getId(), month, year);
                continue;
            }

            MonthlyBonus bonus = new MonthlyBonus();
            bonus.setAffiliate(affiliate);
            bonus.setRankingMonth(month);
            bonus.setRankingYear(year);
            bonus.setRank(rank);
            bonus.setBonusPercentage(rates[i]);
            bonus.setBonusMonth(bonusMonth);
            bonus.setBonusYear(bonusYear);
            bonus.setIsApplied(false);

            monthlyBonusRepository.save(bonus);
            created.add(toDTO(bonus));

            notificationService.create(
                affiliate,
                NotificationType.MONTHLY_BONUS_AWARDED,
                "Bonus mensuel attribué",
                String.format("Félicitations ! Vous êtes classé n°%d du mois %d/%d. " +
                    "Vous bénéficiez d'un bonus de +%.1f%% sur vos commissions en %d/%d.",
                    rank, month, year, rates[i], bonusMonth, bonusYear),
                bonus.getId()
            );

            log.info("Bonus rank {} created for affiliate {} - {}% applicable in {}/{}",
                rank, affiliate.getId(), rates[i], bonusMonth, bonusYear);
        }

        return created;
    }

    /**
     * Apply pending bonuses for the given month/year to the affiliates' profiles.
     * Should be called at the start of the bonus month.
     */
    @Transactional
    public void applyBonusesForMonth(int month, int year) {
        List<MonthlyBonus> unapplied = monthlyBonusRepository.findUnappliedForBonusMonth(month, year);

        // Expire end-of-month
        LocalDateTime bonusExpiry = YearMonth.of(year, month).atEndOfMonth().atTime(23, 59, 59);

        for (MonthlyBonus bonus : unapplied) {
            affiliateProfileRepository.findByUserId(bonus.getAffiliate().getId()).ifPresent(profile -> {
                profile.setBonusPercentage(bonus.getBonusPercentage());
                profile.setBonusExpiresAt(bonusExpiry);
                affiliateProfileRepository.save(profile);
            });
            bonus.setIsApplied(true);
            monthlyBonusRepository.save(bonus);
            log.info("Applied bonus {}% to affiliate {}", bonus.getBonusPercentage(), bonus.getAffiliate().getId());
        }
    }

    /**
     * Expire all bonuses whose validity period has passed (run daily or on login).
     */
    @Transactional
    public void expireOldBonuses() {
        affiliateProfileRepository.findProfilesWithActiveBonus().forEach(profile -> {
            if (profile.getBonusExpiresAt() != null && LocalDateTime.now().isAfter(profile.getBonusExpiresAt())) {
                profile.setBonusPercentage(0.0);
                profile.setBonusExpiresAt(null);
                affiliateProfileRepository.save(profile);
                log.debug("Expired bonus for affiliate {}", profile.getUser().getId());
            }
        });
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<MonthlyBonusDTO> getBonusesForMonth(int month, int year) {
        return monthlyBonusRepository.findByRankingMonthAndRankingYearOrderByRank(month, year)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MonthlyBonusDTO> getBonusHistoryForAffiliate(Long affiliateId) {
        return monthlyBonusRepository.findByAffiliateIdOrderByCreatedAtDesc(affiliateId)
                .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── DTO converter ─────────────────────────────────────────────────────────

    private MonthlyBonusDTO toDTO(MonthlyBonus b) {
        MonthlyBonusDTO dto = new MonthlyBonusDTO();
        dto.setId(b.getId());
        dto.setAffiliateId(b.getAffiliate().getId());
        dto.setAffiliateName(b.getAffiliate().getFullName());
        dto.setRankingMonth(b.getRankingMonth());
        dto.setRankingYear(b.getRankingYear());
        dto.setRank(b.getRank());
        dto.setBonusPercentage(b.getBonusPercentage());
        dto.setBonusMonth(b.getBonusMonth());
        dto.setBonusYear(b.getBonusYear());
        dto.setIsApplied(b.getIsApplied());
        dto.setCreatedAt(b.getCreatedAt());
        return dto;
    }
}
