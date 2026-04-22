package com.immobilier.backend.repository;

import com.immobilier.backend.entity.Property;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    // ========== BASIC QUERIES ==========
    
    Page<Property> findByIsActiveTrue(Pageable pageable);
    
    List<Property> findByIsActiveTrue();
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true ORDER BY p.createdAt DESC")
    List<Property> findRecentProperties(@Param("limit") int limit);
    
    // ========== COUNT METHODS ==========
    
    // Count by statut - for dashboard stats
    long countByStatut(String statut);
    
    // Alternative count method
    @Query("SELECT COUNT(p) FROM Property p WHERE p.statut = :statut")
    long countPropertiesByStatut(@Param("statut") String statut);
    
    // ========== SEARCH AND FILTER METHODS ==========
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND " +
           "(LOWER(p.titre) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.adresse) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Property> searchProperties(@Param("keyword") String keyword, Pageable pageable);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.type = :type")
    List<Property> findByType(@Param("type") String type);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.statut = :statut")
    List<Property> findByStatut(@Param("statut") String statut);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.prixVente BETWEEN :minPrice AND :maxPrice")
    List<Property> findByPriceRange(@Param("minPrice") Double minPrice, @Param("maxPrice") Double maxPrice);
    
    // ========== AGGREGATION QUERIES ==========
    
    @Query("SELECT COUNT(p) FROM Property p WHERE p.isActive = true")
    long countActiveProperties();
    
    @Query("SELECT p.type, COUNT(p) FROM Property p WHERE p.isActive = true GROUP BY p.type")
    List<Object[]> getPropertyTypeStats();
    
    @Query("SELECT p.statut, COUNT(p) FROM Property p WHERE p.isActive = true GROUP BY p.statut")
    List<Object[]> getPropertyStatusStats();
    
    // For dashboard - find popular areas
    @Query("SELECT p.adresse, COUNT(p) FROM Property p GROUP BY p.adresse ORDER BY COUNT(p) DESC")
    List<Object[]> findPopularAreas();
    
    // For dashboard - find property types distribution
    @Query("SELECT p.type, COUNT(p) FROM Property p GROUP BY p.type")
    List<Object[]> findPropertyTypes();
    
    // ========== REVENUE CALCULATIONS ==========
    
    // Calculate monthly revenue (last 30 days)
    @Query("SELECT COALESCE(SUM(p.prixVente), 0) FROM Property p WHERE p.statut = 'VENDU' AND p.updatedAt >= :startDate")
    Double calculateMonthlyRevenue(@Param("startDate") java.time.LocalDateTime startDate);
    
    // Calculate yearly revenue (last 365 days)
    @Query("SELECT COALESCE(SUM(p.prixVente), 0) FROM Property p WHERE p.statut = 'VENDU' AND p.updatedAt >= :startDate")
    Double calculateYearlyRevenue(@Param("startDate") java.time.LocalDateTime startDate);
    
    // Default methods without parameters (for backward compatibility)
    default Double calculateMonthlyRevenue() {
        java.time.LocalDateTime oneMonthAgo = java.time.LocalDateTime.now().minusDays(30);
        return calculateMonthlyRevenue(oneMonthAgo);
    }
    
    default Double calculateYearlyRevenue() {
        java.time.LocalDateTime oneYearAgo = java.time.LocalDateTime.now().minusDays(365);
        return calculateYearlyRevenue(oneYearAgo);
    }
    
    // Alternative revenue calculation with direct query
    @Query("SELECT COALESCE(SUM(p.prixVente), 0) FROM Property p WHERE p.statut = 'VENDU'")
    Double calculateTotalRevenue();
    
    @Query("SELECT COALESCE(SUM(p.prixVente), 0) FROM Property p WHERE p.statut = 'VENDU' AND YEAR(p.updatedAt) = :year")
    Double calculateRevenueByYear(@Param("year") int year);
    
    @Query("SELECT COALESCE(SUM(p.prixVente), 0) FROM Property p WHERE p.statut = 'VENDU' AND MONTH(p.updatedAt) = :month AND YEAR(p.updatedAt) = :year")
    Double calculateRevenueByMonth(@Param("month") int month, @Param("year") int year);
    
    // ========== AVERAGE PRICE QUERIES ==========
    
    @Query("SELECT COALESCE(AVG(p.prixVente), 0) FROM Property p WHERE p.isActive = true AND p.type = :type")
    Double getAveragePriceByType(@Param("type") String type);
    
    // ========== GEO-SPATIAL QUERIES ==========
    
    @Query(value = "SELECT p.* FROM properties p WHERE p.is_active = true AND " +
           "ST_Distance_Sphere(point(p.longitude, p.latitude), point(:lng, :lat)) <= :radius",
           nativeQuery = true)
    List<Property> findPropertiesWithinRadius(@Param("lat") Double lat, 
                                              @Param("lng") Double lng, 
                                              @Param("radius") Double radius);
    
    // ========== TIME-BASED QUERIES ==========
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.createdAt >= :startDate ORDER BY p.createdAt DESC")
    List<Property> findRecentPropertiesByDate(@Param("startDate") java.time.LocalDateTime startDate);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.statut = 'VENDU' AND p.updatedAt >= :startDate")
    List<Property> findSoldPropertiesSince(@Param("startDate") java.time.LocalDateTime startDate);
    
    // ========== STATISTICS QUERIES ==========
    
    @Query("SELECT DATE(p.createdAt), COUNT(p) FROM Property p WHERE p.createdAt >= :startDate GROUP BY DATE(p.createdAt)")
    List<Object[]> getDailyPropertyStats(@Param("startDate") java.time.LocalDateTime startDate);
    
    @Query("SELECT MONTH(p.createdAt), COUNT(p) FROM Property p WHERE YEAR(p.createdAt) = :year GROUP BY MONTH(p.createdAt)")
    List<Object[]> getMonthlyPropertyStats(@Param("year") int year);
    
    @Query("SELECT p.type, AVG(p.prixVente), AVG(p.surface) FROM Property p WHERE p.isActive = true GROUP BY p.type")
    List<Object[]> getAveragePriceAndSurfaceByType();
   
    // ========== REGION-BASED QUERIES ==========
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.region = :region")
    List<Property> findByRegion(@Param("region") String region);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.region IN :regions")
    List<Property> findByRegions(@Param("regions") List<String> regions);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND " +
           "(LOWER(p.adresse) LIKE LOWER(CONCAT('%', :area, '%')) OR " +
           "LOWER(p.region) LIKE LOWER(CONCAT('%', :area, '%')))")
    List<Property> findByArea(@Param("area") String area);
    
    
    // ========== COMMISSION QUERIES ==========
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.commissionPercentage IS NOT NULL")
    List<Property> findPropertiesWithCommission();
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.commissionPercentage >= :minCommission")
    List<Property> findByMinCommission(@Param("minCommission") Double minCommission);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.commissionPercentage BETWEEN :min AND :max")
    List<Property> findByCommissionRange(@Param("min") Double min, @Param("max") Double max);
    
    @Query("SELECT AVG(p.commissionPercentage) FROM Property p WHERE p.isActive = true")
    Double getAverageCommission();
    
    @Query("SELECT p.type, AVG(p.commissionPercentage) FROM Property p WHERE p.isActive = true GROUP BY p.type")
    List<Object[]> getAverageCommissionByType();
    
    @Query("SELECT p.region, AVG(p.commissionPercentage) FROM Property p WHERE p.isActive = true GROUP BY p.region")
    List<Object[]> getAverageCommissionByRegion();
    
    // ========== ADVANCED FILTER WITH REGION AND COMMISSION ==========
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true " +
           "AND (:country IS NULL OR p.country = :country) " +
           "AND (:city IS NULL OR p.city = :city) " +
           "AND (:region IS NULL OR p.region = :region) " +
           "AND (:minPrice IS NULL OR p.prixVente >= :minPrice) " +
           "AND (:maxPrice IS NULL OR p.prixVente <= :maxPrice) " +
           "AND (:minCommission IS NULL OR p.commissionPercentage >= :minCommission) " +
           "AND (:propertyType IS NULL OR p.type = :propertyType)")
    List<Property> findWithFilters(@Param("country") String country,
                                   @Param("city") String city,
                                   @Param("region") String region,
                                   @Param("minPrice") Double minPrice,
                                   @Param("maxPrice") Double maxPrice,
                                   @Param("minCommission") Double minCommission,
                                   @Param("propertyType") String propertyType);
                                

    
    // ========== LOCATION-BASED QUERIES ==========
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.country = :country")
    List<Property> findByCountry(@Param("country") String country);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.country = :country AND p.city = :city")
    List<Property> findByCountryAndCity(@Param("country") String country, @Param("city") String city);
    
    @Query("SELECT p FROM Property p WHERE p.isActive = true AND p.city = :city")
    List<Property> findByCity(@Param("city") String city);
    
    @Query("SELECT DISTINCT p.country FROM Property p WHERE p.isActive = true AND p.country IS NOT NULL")
    List<String> findAllCountries();
    
    @Query("SELECT DISTINCT p.city FROM Property p WHERE p.isActive = true AND p.country = :country AND p.city IS NOT NULL")
    List<String> findCitiesByCountry(@Param("country") String country);

    @Query("SELECT DISTINCT p.region FROM Property p WHERE p.region IS NOT NULL AND p.isActive = true")
    List<String> findAllRegions();
    
}