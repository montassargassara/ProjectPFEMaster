package com.immobilier.backend.service;

import com.immobilier.backend.dto.*;
import com.immobilier.backend.entity.User;
import com.immobilier.backend.enums.RoleType;
import com.immobilier.backend.repository.AffiliateTransactionRepository;
import com.immobilier.backend.repository.ClientInfoRepository;
import com.immobilier.backend.repository.PropertyRepository;
import com.immobilier.backend.repository.UserRepository;
import com.immobilier.backend.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BIService {

    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final AffiliateTransactionRepository affiliateTransactionRepository;
    private final ClientInfoRepository clientInfoRepository;
    private final SecurityUtils securityUtils;

    private static final DateTimeFormatter MONTH_LABEL_FMT =
            DateTimeFormatter.ofPattern("MMM yyyy", Locale.FRENCH);

    // ── KPIs ─────────────────────────────────────────────────────────────────

    public BIKpiDTO getKpis() {
        return securityUtils.isSuperAdmin() ? getKpisGlobal() : getKpisForAgency(securityUtils.getCurrentUserId());
    }

    private BIKpiDTO getKpisGlobal() {
        LocalDateTime now           = LocalDateTime.now();
        LocalDateTime startOfMonth  = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startPrevMonth = startOfMonth.minusMonths(1);
        LocalDateTime sixMonthsAgo  = now.minusMonths(6);

        long total      = propertyRepository.count();
        long disponible = propertyRepository.countByStatut("DISPONIBLE");
        long vendu      = propertyRepository.countByStatut("VENDU");
        long loue       = propertyRepository.countByStatut("LOUE");

        long agencies   = userRepository.countByRole(RoleType.ADMIN);
        long affiliates = userRepository.countByRole(RoleType.AFFILIATE);
        long clients    = userRepository.countByRole(RoleType.CLIENT_PUBLIC);

        double totalRevenue  = Optional.ofNullable(propertyRepository.calculateTotalRevenue()).orElse(0.0);
        double currRevenue   = Optional.ofNullable(propertyRepository.calculateMonthlyRevenue(startOfMonth)).orElse(0.0);
        double prevRevenue   = Optional.ofNullable(
                propertyRepository.calculateRevenueByMonth(startPrevMonth.getMonthValue(), startPrevMonth.getYear())
        ).orElse(0.0);

        double totalCommissions = Optional.ofNullable(affiliateTransactionRepository.getTotalCommissions()).orElse(0.0);
        double currCommissions  = Optional.ofNullable(affiliateTransactionRepository.getTotalCommissionsSince(startOfMonth)).orElse(0.0);
        double prevCommissions  = Optional.ofNullable(affiliateTransactionRepository.getTotalCommissionsSince(startPrevMonth)).orElse(0.0)
                                  - currCommissions;

        long currSales = propertyRepository.countVenduBetween(startOfMonth, now)
                       + propertyRepository.countLoueBetween(startOfMonth, now);
        long prevSales = propertyRepository.countVenduBetween(startPrevMonth, startOfMonth)
                       + propertyRepository.countLoueBetween(startPrevMonth, startOfMonth);

        long stagnant = propertyRepository.countStagnantProperties(sixMonthsAgo);

        return buildKpiDTO(total, disponible, vendu, loue, agencies, affiliates, clients,
                totalRevenue, currRevenue, prevRevenue, totalCommissions, currCommissions,
                prevCommissions, currSales, prevSales, stagnant);
    }

    private BIKpiDTO getKpisForAgency(Long adminId) {
        LocalDateTime now           = LocalDateTime.now();
        LocalDateTime startOfMonth  = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startPrevMonth = startOfMonth.minusMonths(1);
        LocalDateTime sixMonthsAgo  = now.minusMonths(6);

        long total      = propertyRepository.countByAgencyAdmin(adminId);
        long disponible = propertyRepository.countAvailableByAgencyAdmin(adminId);
        long vendu      = propertyRepository.countSoldByAgencyAdmin(adminId);
        long loue       = propertyRepository.countRentedByAgencyAdmin(adminId);

        long affiliates = affiliateTransactionRepository.countDistinctAffiliatesByAgencyAdmin(adminId);
        long clients    = clientInfoRepository.countByAgencyAdminId(adminId);

        double totalRevenue  = Optional.ofNullable(propertyRepository.calculateTotalRevenueByAgencyAdmin(adminId)).orElse(0.0);
        double currRevenue   = Optional.ofNullable(propertyRepository.calculateMonthlyRevenueByAgencyAdmin(adminId, startOfMonth)).orElse(0.0);
        double prevRevenue   = Optional.ofNullable(
                propertyRepository.calculateRevenueByMonthByAgencyAdmin(adminId, startPrevMonth.getMonthValue(), startPrevMonth.getYear())
        ).orElse(0.0);

        double totalCommissions = Optional.ofNullable(affiliateTransactionRepository.getTotalCommissionsByAgencyAdmin(adminId)).orElse(0.0);
        double currCommissions  = Optional.ofNullable(affiliateTransactionRepository.getTotalCommissionsSinceByAgencyAdmin(adminId, startOfMonth)).orElse(0.0);
        double prevCommissions  = Optional.ofNullable(affiliateTransactionRepository.getTotalCommissionsSinceByAgencyAdmin(adminId, startPrevMonth)).orElse(0.0)
                                  - currCommissions;

        long currSales = propertyRepository.countVenduBetweenByAgencyAdmin(adminId, startOfMonth, now)
                       + propertyRepository.countLoueBetweenByAgencyAdmin(adminId, startOfMonth, now);
        long prevSales = propertyRepository.countVenduBetweenByAgencyAdmin(adminId, startPrevMonth, startOfMonth)
                       + propertyRepository.countLoueBetweenByAgencyAdmin(adminId, startPrevMonth, startOfMonth);

        long stagnant = propertyRepository.countStagnantByAgencyAdmin(adminId, sixMonthsAgo);

        // agencyCount is 0 for ADMIN — frontend hides that KPI card
        return buildKpiDTO(total, disponible, vendu, loue, 0, affiliates, clients,
                totalRevenue, currRevenue, prevRevenue, totalCommissions, currCommissions,
                prevCommissions, currSales, prevSales, stagnant);
    }

    private BIKpiDTO buildKpiDTO(long total, long disponible, long vendu, long loue,
                                  long agencies, long affiliates, long clients,
                                  double totalRevenue, double currRevenue, double prevRevenue,
                                  double totalCommissions, double currCommissions, double prevCommissions,
                                  long currSales, long prevSales, long stagnant) {
        double revenueTrend     = trend(currRevenue, prevRevenue);
        double salesTrend       = trend(currSales, prevSales);
        double commissionsTrend = trend(currCommissions, Math.max(prevCommissions, 0));
        double conversionRate   = total > 0 ? round1((vendu + loue) * 100.0 / total) : 0;

        return BIKpiDTO.builder()
                .totalProperties(total)
                .disponibleCount(disponible)
                .venduCount(vendu)
                .loueCount(loue)
                .agencyCount(agencies)
                .affiliateCount(affiliates)
                .clientCount(clients)
                .totalRevenue(totalRevenue)
                .currentMonthRevenue(currRevenue)
                .previousMonthRevenue(prevRevenue)
                .totalCommissions(totalCommissions)
                .currentMonthCommissions(currCommissions)
                .conversionRate(conversionRate)
                .revenueTrend(round1(revenueTrend))
                .salesTrend(round1(salesTrend))
                .commissionsTrend(round1(commissionsTrend))
                .currentMonthSales(currSales)
                .previousMonthSales(prevSales)
                .stagnantProperties(stagnant)
                .build();
    }

    // ── Trends (12 months) ────────────────────────────────────────────────────

    public BITrendDTO getTrends() {
        return securityUtils.isSuperAdmin() ? getTrendsGlobal() : getTrendsForAgency(securityUtils.getCurrentUserId());
    }

    private BITrendDTO getTrendsGlobal() {
        LocalDateTime since = startOf12MonthsAgo();
        List<String> months = buildMonthLabels(since);
        List<LocalDateTime> monthStarts = buildMonthStarts(since);

        Map<String, Long>   salesMap   = toLongMap(propertyRepository.getMonthlySalesSince(since));
        Map<String, Long>   rentalsMap = toLongMap(propertyRepository.getMonthlyRentalsSince(since));
        Map<String, Double> revenueMap = toDoubleMap(propertyRepository.getMonthlyRevenueSince(since));
        Map<String, Double> commMap    = toDoubleMap(affiliateTransactionRepository.getMonthlyCommissionsSince(since));
        Map<String, Long>   clientMap  = toLongMap(
                userRepository.countNewUsersByRoleByMonth(RoleType.CLIENT_PUBLIC, since));

        return assembleTrendDTO(months, monthStarts, salesMap, rentalsMap, revenueMap, commMap, clientMap);
    }

    private BITrendDTO getTrendsForAgency(Long adminId) {
        LocalDateTime since = startOf12MonthsAgo();
        List<String> months = buildMonthLabels(since);
        List<LocalDateTime> monthStarts = buildMonthStarts(since);

        Map<String, Long>   salesMap   = toLongMap(propertyRepository.getMonthlySalesByAgencyAdminSince(adminId, since));
        Map<String, Long>   rentalsMap = toLongMap(propertyRepository.getMonthlyRentalsByAgencyAdminSince(adminId, since));
        Map<String, Double> revenueMap = toDoubleMap(propertyRepository.getMonthlyRevenueByAgencyAdminSince(adminId, since));
        Map<String, Double> commMap    = toDoubleMap(affiliateTransactionRepository.getMonthlyCommissionsSinceByAgencyAdmin(adminId, since));
        // newClients for ADMIN = clients added to this agency's CRM each month — not a per-month query we have;
        // return zeros (no CLIENT_PUBLIC growth curve for a single agency)
        Map<String, Long> clientMap = Collections.emptyMap();

        return assembleTrendDTO(months, monthStarts, salesMap, rentalsMap, revenueMap, commMap, clientMap);
    }

    private BITrendDTO assembleTrendDTO(List<String> months, List<LocalDateTime> monthStarts,
                                         Map<String, Long> salesMap, Map<String, Long> rentalsMap,
                                         Map<String, Double> revenueMap, Map<String, Double> commMap,
                                         Map<String, Long> clientMap) {
        List<Long>   salesCounts  = new ArrayList<>();
        List<Long>   rentalCounts = new ArrayList<>();
        List<Double> revenues     = new ArrayList<>();
        List<Double> commissions  = new ArrayList<>();
        List<Long>   newClients   = new ArrayList<>();

        for (LocalDateTime ms : monthStarts) {
            String key = ms.getYear() + "-" + ms.getMonthValue();
            salesCounts.add(salesMap.getOrDefault(key, 0L));
            rentalCounts.add(rentalsMap.getOrDefault(key, 0L));
            revenues.add(revenueMap.getOrDefault(key, 0.0));
            commissions.add(commMap.getOrDefault(key, 0.0));
            newClients.add(clientMap.getOrDefault(key, 0L));
        }

        return BITrendDTO.builder()
                .months(months)
                .salesCounts(salesCounts)
                .rentalCounts(rentalCounts)
                .revenues(revenues)
                .commissions(commissions)
                .newClients(newClients)
                .build();
    }

    // ── Top Cities ────────────────────────────────────────────────────────────

    public List<BITopCityDTO> getTopCities(int limit) {
        return securityUtils.isSuperAdmin()
                ? getTopCitiesGlobal(limit)
                : getTopCitiesForAgency(securityUtils.getCurrentUserId(), limit);
    }

    private List<BITopCityDTO> getTopCitiesGlobal(int limit) {
        List<Object[]> soldRaw   = propertyRepository.getTopCitiesBySales(PageRequest.of(0, limit));
        List<Object[]> activeRaw = propertyRepository.getTopCitiesByActive(PageRequest.of(0, limit));
        return mergeTopCities(soldRaw, activeRaw);
    }

    private List<BITopCityDTO> getTopCitiesForAgency(Long adminId, int limit) {
        List<Object[]> soldRaw   = propertyRepository.getTopCitiesBySalesByAgencyAdmin(adminId, PageRequest.of(0, limit));
        List<Object[]> activeRaw = propertyRepository.getTopCitiesByActiveByAgencyAdmin(adminId, PageRequest.of(0, limit));
        return mergeTopCities(soldRaw, activeRaw);
    }

    private List<BITopCityDTO> mergeTopCities(List<Object[]> soldRaw, List<Object[]> activeRaw) {
        Map<String, Long> activeMap = new HashMap<>();
        for (Object[] r : activeRaw) {
            String key = r[0] + "|" + r[1];
            activeMap.put(key, ((Number) r[2]).longValue());
        }
        return soldRaw.stream().map(r -> {
            String city    = (String) r[0];
            String country = (String) r[1];
            String key     = city + "|" + country;
            return BITopCityDTO.builder()
                    .city(city)
                    .country(country)
                    .soldCount(((Number) r[2]).longValue())
                    .totalRevenue(r[3] != null ? ((Number) r[3]).doubleValue() : 0)
                    .activeCount(activeMap.getOrDefault(key, 0L))
                    .build();
        }).collect(Collectors.toList());
    }

    // ── Type Breakdown ────────────────────────────────────────────────────────

    public List<BITypeBreakdownDTO> getTypeBreakdown() {
        List<Object[]> raw = securityUtils.isSuperAdmin()
                ? propertyRepository.getTypeStatsByStatus()
                : propertyRepository.getTypeStatsByStatusByAgencyAdmin(securityUtils.getCurrentUserId());
        return buildTypeBreakdown(raw);
    }

    private List<BITypeBreakdownDTO> buildTypeBreakdown(List<Object[]> raw) {
        Map<String, long[]> grouped = new LinkedHashMap<>();
        for (Object[] row : raw) {
            String type   = (String) row[0];
            long   count  = ((Number) row[1]).longValue();
            String statut = (String) row[2];
            grouped.putIfAbsent(type, new long[3]);
            grouped.get(type)[0] += count;
            if ("VENDU".equals(statut) || "LOUE".equals(statut)) grouped.get(type)[1] += count;
            if ("DISPONIBLE".equals(statut))                       grouped.get(type)[2] += count;
        }
        long grandTotal = grouped.values().stream().mapToLong(a -> a[0]).sum();

        return grouped.entrySet().stream()
                .sorted(Comparator.comparingLong((Map.Entry<String, long[]> e) -> e.getValue()[0]).reversed())
                .map(e -> BITypeBreakdownDTO.builder()
                        .type(e.getKey())
                        .totalCount(e.getValue()[0])
                        .soldCount(e.getValue()[1])
                        .activeCount(e.getValue()[2])
                        .percentage(grandTotal > 0 ? round1(e.getValue()[0] * 100.0 / grandTotal) : 0)
                        .build())
                .collect(Collectors.toList());
    }

    // ── Agency Ranking ────────────────────────────────────────────────────────

    public List<BIAgencyRankDTO> getAgencyRanking(int limit) {
        // Only SUPER_ADMIN sees the agency ranking — ADMIN gets an empty list (panel is hidden in UI)
        if (!securityUtils.isSuperAdmin()) return Collections.emptyList();

        List<Object[]> soldRaw   = propertyRepository.getAgencyRankingBySales(PageRequest.of(0, limit));
        List<Object[]> activeRaw = propertyRepository.getActiveCountByAgency();

        Map<Long, Long> activeMap = new HashMap<>();
        for (Object[] r : activeRaw) {
            activeMap.put(((Number) r[0]).longValue(), ((Number) r[1]).longValue());
        }

        List<BIAgencyRankDTO> result = new ArrayList<>();
        for (int i = 0; i < soldRaw.size(); i++) {
            Object[] r = soldRaw.get(i);
            long id = ((Number) r[0]).longValue();
            result.add(BIAgencyRankDTO.builder()
                    .id(id)
                    .agencyName(r[1] + " " + r[2])
                    .email((String) r[3])
                    .propertiesSold(((Number) r[4]).longValue())
                    .revenue(r[5] != null ? ((Number) r[5]).doubleValue() : 0)
                    .propertiesActive(activeMap.getOrDefault(id, 0L))
                    .rank(i + 1)
                    .build());
        }
        return result;
    }

    // ── Affiliate Ranking ─────────────────────────────────────────────────────

    public List<BIAffiliateRankDTO> getAffiliateRanking(int limit) {
        LocalDateTime since = LocalDateTime.now().minusMonths(12);
        List<Object[]> raw = securityUtils.isSuperAdmin()
                ? affiliateTransactionRepository.getAffiliateRanking(since)
                : affiliateTransactionRepository.getAffiliateRankingByAgencyAdmin(securityUtils.getCurrentUserId(), since);

        List<BIAffiliateRankDTO> result = new ArrayList<>();
        for (int i = 0; i < Math.min(limit, raw.size()); i++) {
            Object[] r = raw.get(i);
            User affiliate = (User) r[0];
            result.add(BIAffiliateRankDTO.builder()
                    .id(affiliate.getId())
                    .name(affiliate.getPrenom() + " " + affiliate.getNom())
                    .email(affiliate.getEmail())
                    .salesCompleted(((Number) r[1]).longValue())
                    .totalCommissions(r[2] != null ? ((Number) r[2]).doubleValue() : 0)
                    .rank(i + 1)
                    .build());
        }
        return result;
    }

    // ── Smart Insights ────────────────────────────────────────────────────────

    public List<BIInsightDTO> getInsights() {
        return securityUtils.isSuperAdmin()
                ? getInsightsGlobal()
                : getInsightsForAgency(securityUtils.getCurrentUserId());
    }

    private List<BIInsightDTO> getInsightsGlobal() {
        List<BIInsightDTO> insights = new ArrayList<>();
        LocalDateTime now            = LocalDateTime.now();
        LocalDateTime startOfMonth   = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startPrevMonth = startOfMonth.minusMonths(1);
        LocalDateTime sixMonthsAgo   = now.minusMonths(6);

        long stagnant = propertyRepository.countStagnantProperties(sixMonthsAgo);
        if (stagnant > 0) {
            insights.add(insight("warning", "fas fa-clock", "Biens stagnants",
                    stagnant + " bien(s) disponibles depuis plus de 6 mois sans transaction."));
        }

        double currRevenue = Optional.ofNullable(propertyRepository.calculateMonthlyRevenue(startOfMonth)).orElse(0.0);
        double prevRevenue = Optional.ofNullable(
                propertyRepository.calculateRevenueByMonth(startPrevMonth.getMonthValue(), startPrevMonth.getYear())
        ).orElse(0.0);
        addRevenueTrendInsight(insights, currRevenue, prevRevenue);

        long disponible = propertyRepository.countByStatut("DISPONIBLE");
        long vendu      = propertyRepository.countByStatut("VENDU");
        long loue       = propertyRepository.countByStatut("LOUE");
        addConversionInsight(insights, disponible, vendu, loue);

        List<Object[]> topCities = propertyRepository.getTopCitiesBySales(PageRequest.of(0, 1));
        if (!topCities.isEmpty()) {
            Object[] top = topCities.get(0);
            insights.add(insight("info", "fas fa-map-pin", "Zone la plus active",
                    String.format("%s est la ville avec le plus de ventes (%s biens vendus).", top[0], top[2])));
        }

        double unpaidTotal = Optional.ofNullable(affiliateTransactionRepository.getTotalUnpaidCommissions()).orElse(0.0);
        long   unpaidCount = affiliateTransactionRepository.countUnpaidTransactions();
        if (unpaidCount > 0) {
            insights.add(insight("warning", "fas fa-money-bill-wave", "Commissions en attente de paiement",
                    String.format("%d commission(s) non réglée(s) pour un total de %.0f TND à verser aux affiliés.", unpaidCount, unpaidTotal)));
        }

        if (vendu > 0 && loue > 0) {
            double rentRatio = loue * 100.0 / (vendu + loue);
            if (rentRatio > 60) {
                insights.add(insight("info", "fas fa-key", "Forte demande locative",
                        String.format("%.0f%% des transactions sont des locations. Envisagez d'élargir le portefeuille locatif.", rentRatio)));
            }
        }

        return insights;
    }

    private List<BIInsightDTO> getInsightsForAgency(Long adminId) {
        List<BIInsightDTO> insights = new ArrayList<>();
        LocalDateTime now            = LocalDateTime.now();
        LocalDateTime startOfMonth   = now.withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime startPrevMonth = startOfMonth.minusMonths(1);
        LocalDateTime sixMonthsAgo   = now.minusMonths(6);

        long stagnant = propertyRepository.countStagnantByAgencyAdmin(adminId, sixMonthsAgo);
        if (stagnant > 0) {
            insights.add(insight("warning", "fas fa-clock", "Biens stagnants",
                    stagnant + " bien(s) disponibles depuis plus de 6 mois sans transaction."));
        }

        double currRevenue = Optional.ofNullable(propertyRepository.calculateMonthlyRevenueByAgencyAdmin(adminId, startOfMonth)).orElse(0.0);
        double prevRevenue = Optional.ofNullable(
                propertyRepository.calculateRevenueByMonthByAgencyAdmin(adminId, startPrevMonth.getMonthValue(), startPrevMonth.getYear())
        ).orElse(0.0);
        addRevenueTrendInsight(insights, currRevenue, prevRevenue);

        long disponible = propertyRepository.countAvailableByAgencyAdmin(adminId);
        long vendu      = propertyRepository.countSoldByAgencyAdmin(adminId);
        long loue       = propertyRepository.countRentedByAgencyAdmin(adminId);
        addConversionInsight(insights, disponible, vendu, loue);

        List<Object[]> topCities = propertyRepository.getTopCitiesBySalesByAgencyAdmin(adminId, PageRequest.of(0, 1));
        if (!topCities.isEmpty()) {
            Object[] top = topCities.get(0);
            insights.add(insight("info", "fas fa-map-pin", "Zone la plus active",
                    String.format("%s est la ville avec le plus de ventes (%s biens vendus).", top[0], top[2])));
        }

        double unpaidTotal = Optional.ofNullable(affiliateTransactionRepository.getTotalUnpaidCommissionsByAgencyAdmin(adminId)).orElse(0.0);
        long   unpaidCount = affiliateTransactionRepository.countUnpaidTransactionsByAgencyAdmin(adminId);
        if (unpaidCount > 0) {
            insights.add(insight("warning", "fas fa-money-bill-wave", "Commissions en attente",
                    String.format("%d commission(s) non réglée(s) pour un total de %.0f TND.", unpaidCount, unpaidTotal)));
        }

        return insights;
    }

    // ── Shared insight helpers ────────────────────────────────────────────────

    private void addRevenueTrendInsight(List<BIInsightDTO> list, double currRevenue, double prevRevenue) {
        if (prevRevenue > 0) {
            double trendPct = (currRevenue - prevRevenue) / prevRevenue * 100;
            if (trendPct >= 10) {
                list.add(insight("success", "fas fa-arrow-trend-up", "Revenus en hausse",
                        String.format("Les revenus ont progressé de %.1f%% ce mois par rapport au mois précédent.", trendPct)));
            } else if (trendPct <= -10) {
                list.add(insight("danger", "fas fa-arrow-trend-down", "Baisse des revenus",
                        String.format("Les revenus ont reculé de %.1f%%. Une action commerciale est recommandée.", Math.abs(trendPct))));
            }
        } else if (currRevenue > 0) {
            list.add(insight("success", "fas fa-star", "Premières ventes du mois",
                    String.format("%.0f TND de chiffre d'affaires réalisé ce mois.", currRevenue)));
        }
    }

    private void addConversionInsight(List<BIInsightDTO> list, long disponible, long vendu, long loue) {
        if (disponible > 0 && vendu + loue > 0) {
            double convRate = (vendu + loue) * 100.0 / (disponible + vendu + loue);
            if (convRate < 20) {
                list.add(insight("info", "fas fa-lightbulb", "Taux de conversion à optimiser",
                        String.format("Seulement %.1f%% des biens ont été vendus/loués. Envisagez des actions marketing ciblées.", convRate)));
            } else if (convRate >= 50) {
                list.add(insight("success", "fas fa-trophy", "Excellent taux de conversion",
                        String.format("%.1f%% des biens ont trouvé preneur — performance au-dessus de la moyenne du marché.", convRate)));
            }
        }
    }

    private BIInsightDTO insight(String type, String icon, String title, String message) {
        return BIInsightDTO.builder().type(type).icon(icon).title(title).message(message).build();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private LocalDateTime startOf12MonthsAgo() {
        return LocalDateTime.now()
                .minusMonths(11).withDayOfMonth(1).withHour(0).withMinute(0).withSecond(0).withNano(0);
    }

    private List<String> buildMonthLabels(LocalDateTime since) {
        List<String> months = new ArrayList<>();
        LocalDateTime cursor = since;
        while (!cursor.isAfter(LocalDateTime.now())) {
            months.add(cursor.format(MONTH_LABEL_FMT));
            cursor = cursor.plusMonths(1);
        }
        return months;
    }

    private List<LocalDateTime> buildMonthStarts(LocalDateTime since) {
        List<LocalDateTime> starts = new ArrayList<>();
        LocalDateTime cursor = since;
        while (!cursor.isAfter(LocalDateTime.now())) {
            starts.add(cursor);
            cursor = cursor.plusMonths(1);
        }
        return starts;
    }

    private Map<String, Long> toLongMap(List<Object[]> rows) {
        Map<String, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            int  month = ((Number) row[0]).intValue();
            int  year  = ((Number) row[1]).intValue();
            long val   = ((Number) row[2]).longValue();
            map.put(year + "-" + month, val);
        }
        return map;
    }

    private Map<String, Double> toDoubleMap(List<Object[]> rows) {
        Map<String, Double> map = new HashMap<>();
        for (Object[] row : rows) {
            int    month = ((Number) row[0]).intValue();
            int    year  = ((Number) row[1]).intValue();
            double val   = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
            map.put(year + "-" + month, val);
        }
        return map;
    }

    private double trend(double current, double previous) {
        if (previous <= 0) return 0;
        return (current - previous) / previous * 100;
    }

    private double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
