package com.immobilier.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.immobilier.backend.entity.User;
import com.immobilier.backend.enums.RoleType;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByEmail(String email);
    
    List<User> findByRole(RoleType role);
    
    boolean existsByEmail(String email);
    
    boolean existsByTelephone(String telephone);
    
    List<User> findByIsActiveTrue();
    
    List<User> findByRoleAndIsActiveTrue(RoleType role);

        // Méthodes pour les statistiques
    long countByRole(RoleType role);
    
    long countByIsActive(boolean isActive);

}
