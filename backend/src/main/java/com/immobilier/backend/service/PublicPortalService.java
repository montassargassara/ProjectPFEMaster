package com.immobilier.backend.service;

import com.immobilier.backend.dto.ImageDTO;
import com.immobilier.backend.dto.PublicPropertyCardDTO;
import com.immobilier.backend.dto.PublicPropertyDetailDTO;
import com.immobilier.backend.dto.VideoDTO;
import com.immobilier.backend.entity.Property;
import com.immobilier.backend.repository.PropertyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Public-facing portal service. Exposes only the data buyers/visitors need —
 * prices, location, images. No commission or affiliate metadata leaks here.
 *
 * Visibility rule: any property where {@code isActive = true} and
 * {@code statut = 'DISPONIBLE'} is browsable by visitors. Multi-tenant access
 * control (agency isolation, share-request approval) only matters for the
 * internal admin views — the public site is the marketplace.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PublicPortalService {

    private static final String IMAGE_URL_PREFIX = "/api/images/public/";
    private static final String VIDEO_URL_PREFIX = "/api/videos/public/";
    private static final String MODEL_URL_PREFIX = "/api/models/public/";
    private static final String STATUT_DISPONIBLE = "DISPONIBLE";

    private final PropertyRepository propertyRepository;
    private final ImageService imageService;
    private final VideoService videoService;

    public List<PublicPropertyCardDTO> listForSale(PublicSearchFilters filters) {
        return browsable()
                .filter(this::isForSale)
                .filter(p -> matches(p, filters))
                .sorted(Comparator.comparing(Property::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toCardDTO)
                .collect(Collectors.toList());
    }

    public List<PublicPropertyCardDTO> listForRent(PublicSearchFilters filters) {
        return browsable()
                .filter(this::isForRent)
                .filter(p -> matches(p, filters))
                .sorted(Comparator.comparing(Property::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toCardDTO)
                .collect(Collectors.toList());
    }

    public List<PublicPropertyCardDTO> featuredForSale(int limit) {
        return browsable()
                .filter(this::isForSale)
                .sorted(Comparator.comparing(Property::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .map(this::toCardDTO)
                .collect(Collectors.toList());
    }

    public List<PublicPropertyCardDTO> featuredForRent(int limit) {
        return browsable()
                .filter(this::isForRent)
                .sorted(Comparator.comparing(Property::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .map(this::toCardDTO)
                .collect(Collectors.toList());
    }

    public PublicPropertyDetailDTO getDetail(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée"));
        if (Boolean.FALSE.equals(property.getIsActive())) {
            throw new RuntimeException("Propriété non disponible");
        }
        return toDetailDTO(property);
    }

    public List<PublicPropertyCardDTO> similarTo(Long id, int limit) {
        Property base = propertyRepository.findById(id).orElse(null);
        if (base == null) return List.of();

        String category = base.getCategory();
        return browsable()
                .filter(p -> !p.getId().equals(base.getId()))
                .filter(p -> category == null || category.equals(p.getCategory()))
                .sorted(Comparator.comparingInt((Property p) -> similarityScore(base, p)).reversed())
                .limit(limit)
                .map(this::toCardDTO)
                .collect(Collectors.toList());
    }

    public List<String> distinctCountries() {
        return browsable()
                .map(Property::getCountry)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }

    public List<String> distinctCities(String country) {
        return browsable()
                .filter(p -> country == null || country.isBlank()
                        || country.equalsIgnoreCase(p.getCountry()))
                .map(Property::getCity)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }

    public List<String> distinctTypes() {
        return browsable()
                .map(Property::getType)
                .filter(t -> t != null && !t.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    // ────────────────────────────────────────────────────────────────────────
    // Internals
    // ────────────────────────────────────────────────────────────────────────

    private java.util.stream.Stream<Property> browsable() {
        return propertyRepository.findByIsActiveTrue().stream()
                .filter(p -> STATUT_DISPONIBLE.equalsIgnoreCase(p.getStatut()));
    }

    private boolean isForSale(Property p) {
        return p.getPrixVente() != null && p.getPrixVente() > 0;
    }

    private boolean isForRent(Property p) {
        return p.getPrixLocation() != null && p.getPrixLocation() > 0;
    }

    private boolean matches(Property p, PublicSearchFilters f) {
        if (f == null) return true;
        if (f.country != null && !f.country.isBlank()
                && !f.country.equalsIgnoreCase(p.getCountry())) return false;
        if (f.city != null && !f.city.isBlank()
                && !f.city.equalsIgnoreCase(p.getCity())) return false;
        if (f.type != null && !f.type.isBlank()
                && !f.type.equalsIgnoreCase(p.getType())) return false;
        if (f.minSurface != null && (p.getSurface() == null || p.getSurface() < f.minSurface)) return false;
        if (f.maxSurface != null && (p.getSurface() == null || p.getSurface() > f.maxSurface)) return false;
        if (f.minRooms != null && (p.getNbChambres() == null || p.getNbChambres() < f.minRooms)) return false;

        Double price = isForSale(p) ? p.getPrixVente() : p.getPrixLocation();
        if (f.minPrice != null && (price == null || price < f.minPrice)) return false;
        if (f.maxPrice != null && (price == null || price > f.maxPrice)) return false;

        if (f.q != null && !f.q.isBlank()) {
            String needle = f.q.toLowerCase(Locale.ROOT).trim();
            String haystack = String.join(" ",
                    nullSafe(p.getTitre()),
                    nullSafe(p.getDescription()),
                    nullSafe(p.getCity()),
                    nullSafe(p.getCountry()),
                    nullSafe(p.getRegion()),
                    nullSafe(p.getAdresse())).toLowerCase(Locale.ROOT);
            if (!haystack.contains(needle)) return false;
        }
        return true;
    }

    private int similarityScore(Property base, Property other) {
        int score = 0;
        if (eqIgnoreCase(base.getCity(), other.getCity())) score += 5;
        if (eqIgnoreCase(base.getCountry(), other.getCountry())) score += 2;
        if (eqIgnoreCase(base.getType(), other.getType())) score += 3;
        if (base.getNbChambres() != null && base.getNbChambres().equals(other.getNbChambres())) score += 1;
        return score;
    }

    private boolean eqIgnoreCase(String a, String b) {
        return a != null && b != null && a.equalsIgnoreCase(b);
    }

    private String nullSafe(String s) {
        return s == null ? "" : s;
    }

    private PublicPropertyCardDTO toCardDTO(Property p) {
        PublicPropertyCardDTO dto = new PublicPropertyCardDTO();
        dto.setId(p.getId());
        dto.setTitre(p.getTitre());
        dto.setType(p.getType());
        dto.setCategory(p.getCategory());
        dto.setPrixVente(p.getPrixVente());
        dto.setPrixLocation(p.getPrixLocation());
        dto.setSurface(p.getSurface());
        dto.setNbChambres(p.getNbChambres());
        dto.setCity(p.getCity());
        dto.setCountry(p.getCountry());
        dto.setRegion(p.getRegion());
        dto.setLatitude(p.getLatitude());
        dto.setLongitude(p.getLongitude());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setHasModel3d(p.getMainModel3dId() != null);
        if (p.getMainImageId() != null) {
            dto.setMainImageUrl(IMAGE_URL_PREFIX + p.getMainImageId());
        }
        if (p.getAgencyAdmin() != null) {
            dto.setAgencyName(p.getAgencyAdmin().getFullName());
        }
        return dto;
    }

    private PublicPropertyDetailDTO toDetailDTO(Property p) {
        PublicPropertyDetailDTO dto = new PublicPropertyDetailDTO();
        dto.setId(p.getId());
        dto.setTitre(p.getTitre());
        dto.setDescription(p.getDescription());
        dto.setType(p.getType());
        dto.setCategory(p.getCategory());
        dto.setStatut(p.getStatut());
        dto.setPrixVente(p.getPrixVente());
        dto.setPrixLocation(p.getPrixLocation());
        dto.setSurface(p.getSurface());
        dto.setNbChambres(p.getNbChambres());
        dto.setAdresse(p.getAdresse());
        dto.setCity(p.getCity());
        dto.setCountry(p.getCountry());
        dto.setRegion(p.getRegion());
        dto.setLatitude(p.getLatitude());
        dto.setLongitude(p.getLongitude());
        dto.setCreatedAt(p.getCreatedAt());

        if (p.getMainImageId() != null) {
            dto.setMainImageUrl(IMAGE_URL_PREFIX + p.getMainImageId());
        }

        try {
            List<ImageDTO> images = imageService.getImagesInfoByPropertyId(p.getId());
            List<String> urls = images.stream()
                    .map(img -> IMAGE_URL_PREFIX + img.getId())
                    .collect(Collectors.toList());
            if (dto.getMainImageUrl() != null && !urls.contains(dto.getMainImageUrl())) {
                urls.add(0, dto.getMainImageUrl());
            }
            dto.setImageUrls(urls);
        } catch (Exception e) {
            log.warn("Could not fetch images for property {}: {}", p.getId(), e.getMessage());
            dto.setImageUrls(List.of());
        }

        if (p.getMainModel3dId() != null) {
            dto.setHasModel3d(true);
            dto.setModel3dUrl(MODEL_URL_PREFIX + p.getMainModel3dId());
        }

        try {
            List<VideoDTO> videos = videoService.getVideosInfoByPropertyId(p.getId());
            List<String> videoUrls = videos.stream()
                    .map(v -> VIDEO_URL_PREFIX + v.getId())
                    .collect(Collectors.toList());
            dto.setVideoUrls(videoUrls);
            if (p.getMainVideoId() != null) {
                dto.setHasVideo(true);
                dto.setMainVideoUrl(VIDEO_URL_PREFIX + p.getMainVideoId());
            } else if (!videoUrls.isEmpty()) {
                dto.setHasVideo(true);
                dto.setMainVideoUrl(videoUrls.get(0));
            }
        } catch (Exception e) {
            log.warn("Could not fetch videos for property {}: {}", p.getId(), e.getMessage());
            dto.setVideoUrls(List.of());
        }

        if (p.getAgencyAdmin() != null) {
            dto.setAgencyAdminId(p.getAgencyAdmin().getId());
            dto.setAgencyName(p.getAgencyAdmin().getFullName());
        }

        return dto;
    }

    @lombok.Data
    public static class PublicSearchFilters {
        private String q;
        private String country;
        private String city;
        private String type;
        private Double minPrice;
        private Double maxPrice;
        private Double minSurface;
        private Double maxSurface;
        private Integer minRooms;
    }
}
