package com.immobilier.backend.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.immobilier.backend.enums.RoleType;

@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @Column(nullable = false)
    private String nom;
    
    @Column(nullable = false)
    private String prenom;
    
    @Column(unique = true)
    private String telephone;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoleType role;
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Constructeurs
    public User() {
    }
    
    public User(Long id, String email, String password, String nom, String prenom, 
                String telephone, RoleType role, Boolean isActive, 
                LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.email = email;
        this.password = password;
        this.nom = nom;
        this.prenom = prenom;
        this.telephone = telephone;
        this.role = role;
        this.isActive = isActive;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
    
    // Getters
    public Long getId() {
        return id;
    }
    
    public String getEmail() {
        return email;
    }
    
    public String getPassword() {
        return password;
    }
    
    public String getNom() {
        return nom;
    }
    
    public String getPrenom() {
        return prenom;
    }
    
    public String getTelephone() {
        return telephone;
    }
    
    public RoleType getRole() {
        return role;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    // Setters
    public void setId(Long id) {
        this.id = id;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
    
    public void setNom(String nom) {
        this.nom = nom;
    }
    
    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }
    
    public void setTelephone(String telephone) {
        this.telephone = telephone;
    }
    
    public void setRole(RoleType role) {
        this.role = role;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    // Méthodes utilitaires
    public String getFullName() {
        return prenom + " " + nom;
    }
    
    public boolean isActive() {
        return isActive != null && isActive;
    }
    
    public boolean hasRole(RoleType roleType) {
        return this.role != null && this.role.equals(roleType);
    }
    
    public boolean isAdmin() {
        return hasRole(RoleType.ADMIN) || hasRole(RoleType.SUPER_ADMIN);
    }
    
    // Méthodes lifecycle JPA
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
        if (isActive == null) {
            isActive = true;
        }
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Méthode toString
    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", email='" + email + '\'' +
                ", nom='" + nom + '\'' +
                ", prenom='" + prenom + '\'' +
                ", role=" + role +
                ", isActive=" + isActive +
                '}';
    }
    
    // Méthodes equals et hashCode (pour les collections)
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        
        User user = (User) o;
        
        if (id != null ? !id.equals(user.id) : user.id != null) return false;
        return email != null ? email.equals(user.email) : user.email == null;
    }
    
    @Override
    public int hashCode() {
        int result = id != null ? id.hashCode() : 0;
        result = 31 * result + (email != null ? email.hashCode() : 0);
        return result;
    }
    
    // Builder pattern (optionnel)
    public static class Builder {
        private Long id;
        private String email;
        private String password;
        private String nom;
        private String prenom;
        private String telephone;
        private RoleType role;
        private Boolean isActive = true;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        
        public Builder id(Long id) {
            this.id = id;
            return this;
        }
        
        public Builder email(String email) {
            this.email = email;
            return this;
        }
        
        public Builder password(String password) {
            this.password = password;
            return this;
        }
        
        public Builder nom(String nom) {
            this.nom = nom;
            return this;
        }
        
        public Builder prenom(String prenom) {
            this.prenom = prenom;
            return this;
        }
        
        public Builder telephone(String telephone) {
            this.telephone = telephone;
            return this;
        }
        
        public Builder role(RoleType role) {
            this.role = role;
            return this;
        }
        
        public Builder isActive(Boolean isActive) {
            this.isActive = isActive;
            return this;
        }
        
        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }
        
        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }
        
        public User build() {
            return new User(id, email, password, nom, prenom, telephone, 
                           role, isActive, createdAt, updatedAt);
        }
    }
    
    public static Builder builder() {
        return new Builder();
    }
}