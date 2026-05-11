package com.immobilier.backend.service;

import com.immobilier.backend.entity.Property;
import com.immobilier.backend.entity.User;
import com.immobilier.backend.enums.RoleType;
import com.immobilier.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * Single source of truth for "does this user own this property?".
 * Kept in its own service to avoid circular dependencies between
 * PropertyService ↔ SaleValidationService ↔ InterestRequestService.
 */
@Service
@RequiredArgsConstructor
public class PropertyOwnershipService {

    private final UserRepository userRepository;

    /**
     * Returns {@code true} if {@code user} is the canonical owner of {@code property}
     * and therefore may approve/reject a cross-ownership sale validation.
     *
     * <ul>
     *   <li>SUPER_ADMIN_OWNED → only SUPER_ADMIN is the owner</li>
     *   <li>AGENCY_OWNED     → the property's {@code agencyAdmin} (or their hierarchy)</li>
     *   <li>Legacy null      → treated as ownerless; no cross-ownership validation needed</li>
     * </ul>
     */
    public boolean isOwner(User user, Property property) {
        String ownerType = property.getOwnerType();
        RoleType role    = user.getRole();

        if ("SUPER_ADMIN_OWNED".equals(ownerType)) {
            return role == RoleType.SUPER_ADMIN;
        }

        // AGENCY_OWNED or legacy null
        if (role == RoleType.SUPER_ADMIN) {
            return false; // super admin does not own an agency property
        }

        if (property.getAgencyAdmin() == null) {
            // No specific owner defined — no cross-ownership validation required
            return true;
        }

        Long agencyAdminId = property.getAgencyAdmin().getId();

        if (role == RoleType.ADMIN) {
            return user.getId().equals(agencyAdminId);
        }

        // RESPONSABLE_COMMERCIAL / COMMERCIAL — resolve top ADMIN ancestor
        Long topAdminId = userRepository.findTopAdminAncestor(user.getId())
                .map(User::getId)
                .orElse(null);
        return topAdminId != null && topAdminId.equals(agencyAdminId);
    }

    /**
     * Returns {@code true} if the requester does NOT own the property and therefore
     * a validation request must be created before the sale can proceed.
     */
    public boolean requiresValidation(User requester, Property property) {
        return !isOwner(requester, property);
    }
}
