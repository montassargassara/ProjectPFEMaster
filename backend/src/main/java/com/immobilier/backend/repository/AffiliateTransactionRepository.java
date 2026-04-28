package com.immobilier.backend.repository;


import com.immobilier.backend.entity.AffiliateTransaction;
import com.immobilier.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AffiliateTransactionRepository extends JpaRepository<AffiliateTransaction, Long> {
    
    List<AffiliateTransaction> findByAffiliateOrderByTransactionDateDesc(User affiliate);
    
    List<AffiliateTransaction> findByAffiliateIdAndIsPaid(Long affiliateId, Boolean isPaid);
    
    @Query("SELECT SUM(at.commissionAmount) FROM AffiliateTransaction at WHERE at.affiliate = :affiliate AND at.isPaid = true")
    Double getTotalPaidCommission(@Param("affiliate") User affiliate);
    
    @Query("SELECT SUM(at.commissionAmount) FROM AffiliateTransaction at WHERE at.affiliate = :affiliate AND at.isPaid = false")
    Double getTotalPendingCommission(@Param("affiliate") User affiliate);
    
    @Query("SELECT COUNT(at) FROM AffiliateTransaction at WHERE at.affiliate = :affiliate AND at.transactionDate >= :startDate")
    Long countSalesSince(@Param("affiliate") User affiliate, @Param("startDate") LocalDateTime startDate);
    
    @Query("SELECT at.affiliate, COUNT(at) as saleCount, SUM(at.commissionAmount) as totalCommission " +
           "FROM AffiliateTransaction at WHERE at.transactionDate >= :startDate " +
           "GROUP BY at.affiliate ORDER BY COUNT(at) DESC")
    List<Object[]> getAffiliateRanking(@Param("startDate") LocalDateTime startDate);
    
    // Legacy — keeps paid-only ranking for payout reports
    @Query("SELECT at.affiliate, COUNT(at) as saleCount, SUM(at.commissionAmount) as totalCommission " +
           "FROM AffiliateTransaction at WHERE at.transactionDate >= :startDate AND at.isPaid = true " +
           "GROUP BY at.affiliate ORDER BY SUM(at.commissionAmount) DESC")
    List<Object[]> getAffiliateRankingByRevenue(@Param("startDate") LocalDateTime startDate);

    // Ranking counts ALL transactions (paid and unpaid) — used for monthly leaderboard and bonus calculation
    @Query("SELECT at.affiliate, COUNT(at) as saleCount, SUM(at.commissionAmount) as totalCommission " +
           "FROM AffiliateTransaction at WHERE at.transactionDate >= :startDate " +
           "GROUP BY at.affiliate ORDER BY SUM(at.commissionAmount) DESC")
    List<Object[]> getRankingByAllCommissions(@Param("startDate") LocalDateTime startDate);
    
    @Query("SELECT at FROM AffiliateTransaction at WHERE at.transactionDate BETWEEN :startDate AND :endDate")
    List<AffiliateTransaction> findByTransactionDateBetween(@Param("startDate") LocalDateTime startDate, 
                                                            @Param("endDate") LocalDateTime endDate);
}
