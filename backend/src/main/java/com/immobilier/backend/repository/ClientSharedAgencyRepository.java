package com.immobilier.backend.repository;

import com.immobilier.backend.entity.ClientSharedAgency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ClientSharedAgencyRepository extends JpaRepository<ClientSharedAgency, Long> {
    
    List<ClientSharedAgency> findByClientId(Long clientId);
    
    List<ClientSharedAgency> findByAdminId(Long adminId);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM ClientSharedAgency csa WHERE csa.client.id = :clientId AND csa.admin.id = :adminId")
    void deleteByClientIdAndAdminId(@Param("clientId") Long clientId, @Param("adminId") Long adminId);
    
    boolean existsByClientIdAndAdminId(Long clientId, Long adminId);
}