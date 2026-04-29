package com.immobilier.backend.service;

import com.immobilier.backend.dto.InterestRequestCreateRequest;
import com.immobilier.backend.dto.InterestRequestDTO;
import com.immobilier.backend.entity.ClientInfo;
import com.immobilier.backend.entity.InterestRequest;
import com.immobilier.backend.entity.Property;
import com.immobilier.backend.entity.User;
import com.immobilier.backend.enums.NotificationType;
import com.immobilier.backend.enums.RoleType;
import com.immobilier.backend.repository.ClientInfoRepository;
import com.immobilier.backend.repository.InterestRequestRepository;
import com.immobilier.backend.repository.PropertyRepository;
import com.immobilier.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Captures public-client interest in a property and routes it to the right agency.
 *
 * Multi-agency rule: each agency manages its own CRM leads. The same public client
 * expressing interest in two different agencies' properties produces two distinct
 * {@link ClientInfo} rows (one per agencyAdmin). No cross-agency lead sharing.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class InterestRequestService {

    private final InterestRequestRepository interestRequestRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final ClientInfoRepository clientInfoRepository;
    private final NotificationService notificationService;

    @Transactional
    public InterestRequestDTO submit(User publicClient, InterestRequestCreateRequest req) {
        Property property = propertyRepository.findById(req.getPropertyId())
                .orElseThrow(() -> new IllegalArgumentException("Propriété introuvable"));
        if (Boolean.FALSE.equals(property.getIsActive())) {
            throw new IllegalArgumentException("Cette annonce n'est plus disponible");
        }

        InterestRequest interest = new InterestRequest();
        interest.setUser(publicClient);
        interest.setProperty(property);
        interest.setOwnerUser(resolveOwner(property));
        interest.setFullName(req.getFullName());
        interest.setEmail(publicClient.getEmail());
        interest.setTelephone(req.getTelephone());
        interest.setMessage(req.getMessage());
        interest.setProposedBudget(req.getProposedBudget());
        interest.setStatus("PENDING");
        interest = interestRequestRepository.save(interest);

        // Per-agency CRM lead (only when property has an agency owner)
        if (property.getAgencyAdmin() != null) {
            ensureAgencyCrmLead(publicClient, property.getAgencyAdmin());
        }

        notifyOwner(interest);
        return toDTO(interest);
    }

    public List<InterestRequestDTO> myInterests(User publicClient) {
        return interestRequestRepository.findByUserId(publicClient.getId()).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    // ───────────────────────────────────────────────────────────────────────
    // Internals
    // ───────────────────────────────────────────────────────────────────────

    private User resolveOwner(Property property) {
        if (property.getAgencyAdmin() != null) return property.getAgencyAdmin();
        // Super-admin owned property → notify the first super admin
        return userRepository.findByRole(RoleType.SUPER_ADMIN).stream()
                .findFirst()
                .orElse(null);
    }

    /**
     * Creates an AGENCY_CLIENT lead in the agency's CRM if no row exists yet for this
     * (user, agency) pair. Idempotent: if the same user already has a lead with this
     * agency, it leaves the row alone — the new InterestRequest itself is the trail.
     */
    private void ensureAgencyCrmLead(User publicClient, User agencyAdmin) {
        if (agencyAdmin == null) return;
        boolean exists = clientInfoRepository.findByUser(publicClient)
                .filter(c -> agencyAdmin.getId().equals(c.getAgencyAdminId()))
                .isPresent();
        if (exists) return;

        ClientInfo lead = new ClientInfo();
        lead.setUser(publicClient);
        lead.setCreatedBy(agencyAdmin);
        lead.setAgencyAdminId(agencyAdmin.getId());
        lead.setVisibilityType("AGENCY_CLIENT");
        lead.setSource("Portail public — Intéressé");
        clientInfoRepository.save(lead);
        log.info("Created agency CRM lead for public client {} in agency {}",
                publicClient.getId(), agencyAdmin.getId());
    }

    private void notifyOwner(InterestRequest interest) {
        User owner = interest.getOwnerUser();
        if (owner == null) return;
        Property p = interest.getProperty();
        String title = "Nouveau prospect intéressé";
        String message = String.format("%s est intéressé par « %s ».",
                interest.getFullName(), p.getTitre());
        notificationService.create(owner, NotificationType.PROPERTY_INTEREST_RECEIVED,
                title, message, interest.getId());
    }

    private InterestRequestDTO toDTO(InterestRequest i) {
        InterestRequestDTO dto = new InterestRequestDTO();
        dto.setId(i.getId());
        dto.setStatus(i.getStatus());
        dto.setFullName(i.getFullName());
        dto.setEmail(i.getEmail());
        dto.setTelephone(i.getTelephone());
        dto.setMessage(i.getMessage());
        dto.setProposedBudget(i.getProposedBudget());
        dto.setCreatedAt(i.getCreatedAt());
        Property p = i.getProperty();
        if (p != null) {
            dto.setPropertyId(p.getId());
            dto.setPropertyTitle(p.getTitre());
            dto.setPropertyCity(p.getCity());
            dto.setPropertyCountry(p.getCountry());
            if (p.getMainImageId() != null) {
                dto.setPropertyMainImageUrl("/api/images/public/" + p.getMainImageId());
            }
            if (p.getAgencyAdmin() != null) {
                dto.setAgencyName(p.getAgencyAdmin().getFullName());
            }
        }
        return dto;
    }
}
