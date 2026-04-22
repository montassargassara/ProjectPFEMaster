package com.immobilier.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.immobilier.backend.dto.ChangePasswordRequest;
import com.immobilier.backend.dto.CreateUserRequest;
import com.immobilier.backend.dto.UpdateUserRequest;
import com.immobilier.backend.dto.UserDTO;
import com.immobilier.backend.entity.User;
import com.immobilier.backend.enums.RoleType;
import com.immobilier.backend.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    public UserDTO createUser(CreateUserRequest request) {
        // Vérifier si l'email existe déjà
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email déjà utilisé");
        }
        
        // Vérifier si le téléphone existe déjà
        if (request.getTelephone() != null && 
            userRepository.existsByTelephone(request.getTelephone())) {
            throw new RuntimeException("Téléphone déjà utilisé");
        }
        
        // Créer l'utilisateur
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setNom(request.getNom());
        user.setPrenom(request.getPrenom());
        user.setTelephone(request.getTelephone());
        user.setRole(request.getRole());
        user.setIsActive(true);
        
        User savedUser = userRepository.save(user);
        return convertToDTO(savedUser);
    }
    
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return convertToDTO(user);
    }
    
    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        return convertToDTO(user);
    }
    
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public List<UserDTO> getUsersByRole(RoleType role) {
        return userRepository.findByRole(role)
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public List<UserDTO> getActiveUsers() {
        return userRepository.findByIsActiveTrue()
            .stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    public UserDTO updateUser(Long id, UpdateUserRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        if (request.getNom() != null) {
            user.setNom(request.getNom());
        }
        if (request.getPrenom() != null) {
            user.setPrenom(request.getPrenom());
        }
        if (request.getTelephone() != null) {
            // Vérifier si le téléphone n'est pas utilisé par un autre utilisateur
            if (!request.getTelephone().equals(user.getTelephone()) &&
                userRepository.existsByTelephone(request.getTelephone())) {
                throw new RuntimeException("Téléphone déjà utilisé");
            }
            user.setTelephone(request.getTelephone());
        }
        if (request.getIsActive() != null) {
            user.setIsActive(request.getIsActive());
        }
        
        User updatedUser = userRepository.save(user);
        return convertToDTO(updatedUser);
    }
    
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        // Vérifier l'ancien mot de passe
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Mot de passe actuel incorrect");
        }
        
        // Mettre à jour le mot de passe
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }
    
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
        
        // Ne pas supprimer physiquement, désactiver
        user.setIsActive(false);
        userRepository.save(user);
    }
    
    public long countUsersByRole(RoleType role) {
        return userRepository.findByRole(role).size();
    }
    
    public long countAllUsers() {
        return userRepository.count();
    }
    
    private UserDTO convertToDTO(User user) {
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
}
