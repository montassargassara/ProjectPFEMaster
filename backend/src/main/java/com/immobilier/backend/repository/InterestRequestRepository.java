package com.immobilier.backend.repository;

import com.immobilier.backend.entity.InterestRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterestRequestRepository extends JpaRepository<InterestRequest, Long> {

    @Query("SELECT i FROM InterestRequest i WHERE i.user.id = :userId ORDER BY i.createdAt DESC")
    List<InterestRequest> findByUserId(@Param("userId") Long userId);

    @Query("SELECT i FROM InterestRequest i WHERE i.ownerUser.id = :ownerId ORDER BY i.createdAt DESC")
    List<InterestRequest> findByOwnerUserId(@Param("ownerId") Long ownerId);

    @Query("SELECT i FROM InterestRequest i WHERE i.user.id = :userId AND i.property.id = :propertyId")
    List<InterestRequest> findByUserAndProperty(@Param("userId") Long userId,
                                                @Param("propertyId") Long propertyId);
}
