package com.immobilier.backend.service;

import com.immobilier.backend.dto.*;
import com.immobilier.backend.entity.*;
import com.immobilier.backend.repository.*;
import com.immobilier.backend.enums.RoleType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AffiliateService {

    private final UserRepository userRepository;
    private final AffiliateRegionRepository affiliateRegionRepository;
    private final AffiliateTransactionRepository affiliateTransactionRepository;
    private final AffiliateActivityRepository affiliateActivityRepository;
    private final PropertyRepository propertyRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Register a new affiliate user with their selected regions
     */
    @Transactional
    public UserDTO registerAffiliate(RegisterAffiliateRequest request) {
        log.info("Registering new affiliate: {}", request.getEmail());
        
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email déjà utilisé");
        }
        
        // Create user with AFFILIATE role
        User affiliate = new User();
        affiliate.setEmail(request.getEmail());
        affiliate.setPassword(passwordEncoder.encode(request.getPassword()));
        affiliate.setNom(request.getNom());
        affiliate.setPrenom(request.getPrenom());
        affiliate.setTelephone(request.getTelephone());
        affiliate.setRole(RoleType.AFFILIATE);
        affiliate.setIsActive(true);
        
        User savedAffiliate = userRepository.save(affiliate);
        log.info("Affiliate created with ID: {}", savedAffiliate.getId());
        
        // Add selected regions
        if (request.getSelectedRegions() != null && !request.getSelectedRegions().isEmpty()) {
            for (RegionSelection regionSelection : request.getSelectedRegions()) {
                AffiliateRegion region = new AffiliateRegion();
                region.setAffiliate(savedAffiliate);
                region.setRegionName(regionSelection.getRegionName());
                region.setRegionDescription(regionSelection.getRegionDescription());
                region.setCommissionPercentage(regionSelection.getCommissionPercentage());
                region.setIsActive(true);
                
                affiliateRegionRepository.save(region);
                log.info("Added region '{}' for affiliate ID: {}", 
                    regionSelection.getRegionName(), savedAffiliate.getId());
            }
        }
        
        return convertToUserDTO(savedAffiliate);
    }
    
    /**
     * Add a new region for an existing affiliate
     */
    @Transactional
    public AffiliateRegionDTO addAffiliateRegion(Long affiliateId, RegionSelection regionSelection) {
        log.info("Adding region for affiliate ID: {}", affiliateId);
        
        User affiliate = userRepository.findById(affiliateId)
            .orElseThrow(() -> new RuntimeException("Affiliate not found"));
        
        // Check if affiliate already has this region
        if (affiliateRegionRepository.findByAffiliateIdAndRegionName(affiliateId, regionSelection.getRegionName()).isPresent()) {
            throw new RuntimeException("Region already assigned to this affiliate");
        }
        
        AffiliateRegion region = new AffiliateRegion();
        region.setAffiliate(affiliate);
        region.setRegionName(regionSelection.getRegionName());
        region.setRegionDescription(regionSelection.getRegionDescription());
        region.setCommissionPercentage(regionSelection.getCommissionPercentage());
        region.setIsActive(true);
        
        AffiliateRegion savedRegion = affiliateRegionRepository.save(region);
        
        return convertToRegionDTO(savedRegion);
    }
    
    /**
     * Get all regions for an affiliate
     */
    public List<AffiliateRegionDTO> getAffiliateRegions(Long affiliateId) {
        List<AffiliateRegion> regions = affiliateRegionRepository.findByAffiliateIdAndIsActiveTrue(affiliateId);
        return regions.stream()
            .map(this::convertToRegionDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Track affiliate activity
     */
    @Transactional
    public void trackActivity(Long affiliateId, String activityType, Long propertyId, String metadata) {
        log.info("Tracking activity for affiliate ID: {} - Type: {}", affiliateId, activityType);
        
        User affiliate = userRepository.findById(affiliateId)
            .orElseThrow(() -> new RuntimeException("Affiliate not found"));
        
        AffiliateActivity activity = new AffiliateActivity();
        activity.setAffiliate(affiliate);
        activity.setActivityType(activityType);
        activity.setPropertyId(propertyId);
        activity.setActivityDate(LocalDateTime.now());
        activity.setMetadata(metadata);
        
        affiliateActivityRepository.save(activity);
    }
    
    /**
     * Get affiliate statistics
     */
    public AffiliateStatsDTO getAffiliateStats(Long affiliateId) {
        User affiliate = userRepository.findById(affiliateId)
            .orElseThrow(() -> new RuntimeException("Affiliate not found"));
        
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
        LocalDateTime yearStart = LocalDateTime.now().withDayOfYear(1).withHour(0).withMinute(0);
        
        AffiliateStatsDTO stats = new AffiliateStatsDTO();
        stats.setAffiliateId(affiliateId);
        stats.setAffiliateName(affiliate.getFullName());
        
        // Count activities for current month
        stats.setTotalViews(affiliateActivityRepository.countActivitiesByType(affiliate, "VIEW", monthStart).intValue());
        stats.setTotalShares(affiliateActivityRepository.countActivitiesByType(affiliate, "SHARE", monthStart).intValue());
        stats.setTotalContacts(affiliateActivityRepository.countActivitiesByType(affiliate, "CONTACT", monthStart).intValue());
        stats.setTotalVisits(affiliateActivityRepository.countActivitiesByType(affiliate, "VISIT", monthStart).intValue());
        
        // Sales statistics
        List<AffiliateTransaction> allTransactions = affiliateTransactionRepository.findByAffiliateOrderByTransactionDateDesc(affiliate);
        stats.setTotalSales(allTransactions.size());
        
        // Calculate total revenue (commission from all sales)
        Double totalCommission = allTransactions.stream()
            .mapToDouble(AffiliateTransaction::getCommissionAmount)
            .sum();
        stats.setTotalRevenue(totalCommission);
        
        // Pending vs paid commission
        Double pendingCommission = affiliateTransactionRepository.getTotalPendingCommission(affiliate);
        Double paidCommission = affiliateTransactionRepository.getTotalPaidCommission(affiliate);
        stats.setPendingCommission(pendingCommission != null ? pendingCommission : 0);
        stats.setPaidCommission(paidCommission != null ? paidCommission : 0);
        
        // Conversion rate (sales / views)
        if (stats.getTotalViews() > 0) {
            stats.setConversionRate((double) stats.getTotalSales() / stats.getTotalViews() * 100);
        } else {
            stats.setConversionRate(0.0);
        }
        
        // Last activity
        List<AffiliateActivity> recentActivities = affiliateActivityRepository.findByAffiliateOrderByActivityDateDesc(affiliate);
        if (!recentActivities.isEmpty()) {
            stats.setLastActivity(recentActivities.get(0).getActivityDate());
        }
        
        return stats;
    }
    
    /**
     * Get affiliate ranking for the current month
     */
    public List<AffiliateStatsDTO> getMonthlyRanking() {
        LocalDateTime monthStart = LocalDateTime.now().withDayOfMonth(1).withHour(0).withMinute(0);
        
        List<Object[]> rankingData = affiliateTransactionRepository.getAffiliateRankingByRevenue(monthStart);
        List<AffiliateStatsDTO> ranking = new ArrayList<>();
        
        int rank = 1;
        for (Object[] data : rankingData) {
            User affiliate = (User) data[0];
            Long saleCount = (Long) data[1];
            Double totalCommission = (Double) data[2];
            
            AffiliateStatsDTO stats = new AffiliateStatsDTO();
            stats.setAffiliateId(affiliate.getId());
            stats.setAffiliateName(affiliate.getFullName());
            stats.setTotalSales(saleCount.intValue());
            stats.setTotalRevenue(totalCommission);
            stats.setRank(rank);
            
            ranking.add(stats);
            rank++;
        }
        
        return ranking;
    }
    
    /**
     * Record a sale for an affiliate
     */
    @Transactional
    public AffiliateTransactionDTO recordSale(Long affiliateId, Long propertyId, String clientEmail, 
                                              Double propertyPrice, Double commissionPercentage) {
        log.info("Recording sale for affiliate ID: {} - Property ID: {}", affiliateId, propertyId);
        
        User affiliate = userRepository.findById(affiliateId)
            .orElseThrow(() -> new RuntimeException("Affiliate not found"));
        
        Property property = propertyRepository.findById(propertyId)
            .orElseThrow(() -> new RuntimeException("Property not found"));
        
        Double commissionAmount = propertyPrice * (commissionPercentage / 100);
        
        AffiliateTransaction transaction = new AffiliateTransaction();
        transaction.setAffiliate(affiliate);
        transaction.setProperty(property);
        transaction.setTransactionDate(LocalDateTime.now());
        transaction.setPropertyPrice(propertyPrice);
        transaction.setCommissionPercentage(commissionPercentage);
        transaction.setCommissionAmount(commissionAmount);
        transaction.setTransactionType("SALE");
        transaction.setClientEmail(clientEmail);
        transaction.setIsPaid(false);
        
        AffiliateTransaction savedTransaction = affiliateTransactionRepository.save(transaction);
        
        // Track the sale activity
        trackActivity(affiliateId, "SALE", propertyId, "Sale amount: " + propertyPrice);
        
        // Update property status to SOLD
        property.setStatut("VENDU");
        propertyRepository.save(property);
        
        return convertToTransactionDTO(savedTransaction);
    }
    
    /**
     * Get affiliate transactions
     */
    public List<AffiliateTransactionDTO> getAffiliateTransactions(Long affiliateId) {
        User affiliate = userRepository.findById(affiliateId)
            .orElseThrow(() -> new RuntimeException("Affiliate not found"));
        
        List<AffiliateTransaction> transactions = affiliateTransactionRepository.findByAffiliateOrderByTransactionDateDesc(affiliate);
        
        return transactions.stream()
            .map(this::convertToTransactionDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Get affiliate activities
     */
    public List<AffiliateActivityDTO> getAffiliateActivities(Long affiliateId) {
        User affiliate = userRepository.findById(affiliateId)
            .orElseThrow(() -> new RuntimeException("Affiliate not found"));
        
        List<AffiliateActivity> activities = affiliateActivityRepository.findByAffiliateOrderByActivityDateDesc(affiliate);
        
        return activities.stream()
            .map(this::convertToActivityDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Get properties by affiliate region (recommended properties)
     */
    public List<PropertyListDTO> getRecommendedPropertiesByRegion(Long affiliateId) {
        List<AffiliateRegion> regions = affiliateRegionRepository.findByAffiliateIdAndIsActiveTrue(affiliateId);
        
        if (regions.isEmpty()) {
            return new ArrayList<>();
        }
        
        List<String> regionNames = regions.stream()
            .map(AffiliateRegion::getRegionName)
            .collect(Collectors.toList());
        
        // Get properties in these regions
        List<Property> properties = propertyRepository.findByIsActiveTrue();
        
        return properties.stream()
            .filter(p -> regionNames.stream().anyMatch(region -> 
                p.getAdresse().toLowerCase().contains(region.toLowerCase())))
            .map(this::convertToPropertyListDTO)
            .collect(Collectors.toList());
    }
    
    // Conversion methods
    
    private UserDTO convertToUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setNom(user.getNom());
        dto.setPrenom(user.getPrenom());
        dto.setTelephone(user.getTelephone());
        dto.setRole(user.getRole());
        dto.setIsActive(user.getIsActive());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }
    
    private AffiliateRegionDTO convertToRegionDTO(AffiliateRegion region) {
        AffiliateRegionDTO dto = new AffiliateRegionDTO();
        dto.setId(region.getId());
        dto.setAffiliateId(region.getAffiliate().getId());
        dto.setAffiliateName(region.getAffiliate().getFullName());
        dto.setRegionName(region.getRegionName());
        dto.setRegionDescription(region.getRegionDescription());
        dto.setCommissionPercentage(region.getCommissionPercentage());
        dto.setIsActive(region.getIsActive());
        dto.setCreatedAt(region.getCreatedAt());
        dto.setUpdatedAt(region.getUpdatedAt());
        return dto;
    }
    
    private AffiliateTransactionDTO convertToTransactionDTO(AffiliateTransaction transaction) {
        AffiliateTransactionDTO dto = new AffiliateTransactionDTO();
        dto.setId(transaction.getId());
        dto.setAffiliateId(transaction.getAffiliate().getId());
        dto.setAffiliateName(transaction.getAffiliate().getFullName());
        dto.setPropertyId(transaction.getProperty().getId());
        dto.setPropertyTitle(transaction.getProperty().getTitre());
        dto.setTransactionDate(transaction.getTransactionDate());
        dto.setPropertyPrice(transaction.getPropertyPrice());
        dto.setCommissionPercentage(transaction.getCommissionPercentage());
        dto.setCommissionAmount(transaction.getCommissionAmount());
        dto.setTransactionType(transaction.getTransactionType());
        dto.setClientEmail(transaction.getClientEmail());
        dto.setIsPaid(transaction.getIsPaid());
        dto.setPaymentDate(transaction.getPaymentDate());
        return dto;
    }
    
    private AffiliateActivityDTO convertToActivityDTO(AffiliateActivity activity) {
        AffiliateActivityDTO dto = new AffiliateActivityDTO();
        dto.setId(activity.getId());
        dto.setAffiliateId(activity.getAffiliate().getId());
        dto.setAffiliateName(activity.getAffiliate().getFullName());
        dto.setActivityType(activity.getActivityType());
        dto.setPropertyId(activity.getPropertyId());
        
        // Get property title if property exists
        if (activity.getPropertyId() != null) {
            propertyRepository.findById(activity.getPropertyId()).ifPresent(property -> 
                dto.setPropertyTitle(property.getTitre()));
        }
        
        dto.setActivityDate(activity.getActivityDate());
        dto.setMetadata(activity.getMetadata());
        return dto;
    }
    
    private PropertyListDTO convertToPropertyListDTO(Property property) {
        PropertyListDTO dto = new PropertyListDTO();
        dto.setId(property.getId());
        dto.setTitre(property.getTitre());
        dto.setType(property.getType());
        dto.setPrixVente(property.getPrixVente());
        dto.setPrixLocation(property.getPrixLocation());
        dto.setStatut(property.getStatut());
        dto.setSurface(property.getSurface());
        dto.setNbChambres(property.getNbChambres());
        dto.setAdresse(property.getAdresse());
        dto.setHasMainImage(property.getMainImageId() != null);
        if (property.getMainImageId() != null) {
            dto.setMainImageUrl("/api/public/images/" + property.getMainImageId());
        }
        return dto;
    }

    // Add these methods to AffiliateService.java

    /**
     * Get all affiliate transactions (for super admin)
     */
    public List<AffiliateTransactionDTO> getAllAffiliateTransactions() {
        List<AffiliateTransaction> allTransactions = affiliateTransactionRepository.findAll();
        return allTransactions.stream()
            .sorted((t1, t2) -> t2.getTransactionDate().compareTo(t1.getTransactionDate()))
            .map(this::convertToTransactionDTO)
            .collect(Collectors.toList());
    }

    /**
     * Update affiliate region (super admin)
     */
    @Transactional
    public AffiliateRegionDTO updateAffiliateRegion(Long affiliateId, Long regionId, RegionSelection regionSelection) {
        log.info("Updating region {} for affiliate {}", regionId, affiliateId);
        
        AffiliateRegion region = affiliateRegionRepository.findById(regionId)
            .orElseThrow(() -> new RuntimeException("Region not found"));
        
        // Verify region belongs to affiliate
        if (!region.getAffiliate().getId().equals(affiliateId)) {
            throw new RuntimeException("Region does not belong to this affiliate");
        }
        
        if (regionSelection.getRegionName() != null) {
            region.setRegionName(regionSelection.getRegionName());
        }
        if (regionSelection.getRegionDescription() != null) {
            region.setRegionDescription(regionSelection.getRegionDescription());
        }
        if (regionSelection.getCommissionPercentage() != null) {
            region.setCommissionPercentage(regionSelection.getCommissionPercentage());
        }
        
        AffiliateRegion updatedRegion = affiliateRegionRepository.save(region);
        return convertToRegionDTO(updatedRegion);
    }

    /**
     * Get affiliate's ranking position
     */
    public AffiliateStatsDTO getAffiliateRankingPosition(Long affiliateId) {
        List<AffiliateStatsDTO> ranking = getMonthlyRanking();
        
        // Find the affiliate's position in ranking
        for (int i = 0; i < ranking.size(); i++) {
            if (ranking.get(i).getAffiliateId().equals(affiliateId)) {
                AffiliateStatsDTO stats = getAffiliateStats(affiliateId);
                stats.setRank(i + 1);
                return stats;
            }
        }
        
        // If not in ranking (no sales yet), return stats with rank = 0
        AffiliateStatsDTO stats = getAffiliateStats(affiliateId);
        stats.setRank(0);
        return stats;
    }

    /**
     * Get affiliate by ID (for super admin)
     */
    public UserDTO getAffiliateById(Long affiliateId) {
        User affiliate = userRepository.findById(affiliateId)
            .orElseThrow(() -> new RuntimeException("Affiliate not found"));
        
        if (affiliate.getRole() != RoleType.AFFILIATE) {
            throw new RuntimeException("User is not an affiliate");
        }
        
        return convertToUserDTO(affiliate);
    }
}
