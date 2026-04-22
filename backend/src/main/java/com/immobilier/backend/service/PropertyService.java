package com.immobilier.backend.service;

import com.immobilier.backend.dto.*;
import com.immobilier.backend.entity.*;
import com.immobilier.backend.repository.*;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class PropertyService {

    private final PropertyRepository propertyRepository;
    private final AffiliateRegionRepository affiliateRegionRepository;
    private final ImageService imageService;
    private final Model3DService model3DService;
    private final VideoService videoService;

    // ========== CREATE ==========
    
    @Transactional
    public PropertyDTO createProperty(@Valid CreatePropertyRequest request) {
        log.info("Création d'une nouvelle propriété: {}", request.getTitre());
        
        // Validate category and prices
        validateCategoryAndPrices(request);
        
        Property property = new Property();
        property.setTitre(request.getTitre());
        property.setDescription(request.getDescription());
        property.setType(request.getType());
        property.setPrixVente(request.getPrixVente());
        property.setPrixLocation(request.getPrixLocation());
        
        // Set default status based on category if not specified
        String initialStatus = request.getStatut();
        if (initialStatus == null) {
            initialStatus = "DISPONIBLE";
        }
        
        // Validate status is allowed for this category
        String category = request.getCategory();
        if (!Property.isStatusAllowedForCategory(category, initialStatus)) {
            throw new IllegalArgumentException(
                String.format("Le statut '%s' n'est pas autorisé pour une propriété en %s. " +
                              "Statuts autorisés: %s",
                              initialStatus, 
                              category.toLowerCase(),
                              Property.getAllowedStatusesForCategory(category))
            );
        }
        
        property.setStatut(initialStatus);
        property.setSurface(request.getSurface());
        property.setNbChambres(request.getNbChambres());
        property.setAdresse(request.getAdresse());
        property.setCountry(request.getCountry());
        property.setCity(request.getCity());
        property.setRegion(extractRegionFromAddress(request.getAdresse()));
        property.setLatitude(request.getLatitude());
        property.setLongitude(request.getLongitude());
        
        if (request.getCommissionPercentage() != null) {
            property.setCommissionPercentage(request.getCommissionPercentage());
        }
        if (request.getCommissionType() != null) {
            property.setCommissionType(request.getCommissionType());
        }
        if (request.getBasePriceForCommission() != null) {
            property.setBasePriceForCommission(request.getBasePriceForCommission());
        }
        
        property.setIsActive(true);
        
        Property savedProperty = propertyRepository.save(property);
        log.info("Propriété sauvegardée avec ID: {}, Catégorie: {}, Statut: {}", 
                 savedProperty.getId(), category, savedProperty.getStatut());
        
        return convertToFullDTO(savedProperty);
    }

       private void validateCategoryAndPrices(CreatePropertyRequest request) {
        boolean hasSalePrice = request.getPrixVente() != null && request.getPrixVente() > 0;
        boolean hasRentalPrice = request.getPrixLocation() != null && request.getPrixLocation() > 0;
        
        if (!hasSalePrice && !hasRentalPrice) {
            throw new IllegalArgumentException(
                "Veuillez spécifier soit un prix de vente, soit un prix de location"
            );
        }
        
        if (hasSalePrice && hasRentalPrice) {
            throw new IllegalArgumentException(
                "Une propriété ne peut pas être à la fois en vente et en location. " +
                "Veuillez spécifier UN SEUL type de prix."
            );
        }
        
        if (hasSalePrice && request.getPrixVente() <= 0) {
            throw new IllegalArgumentException("Le prix de vente doit être supérieur à 0");
        }
        
        if (hasRentalPrice && request.getPrixLocation() <= 0) {
            throw new IllegalArgumentException("Le prix de location doit être supérieur à 0");
        }
    }

    private String extractRegionFromAddress(String address) {
        if (address == null) return null;
        String[] regions = {"Tunis", "Ariana", "Ben Arous", "Manouba", "Nabeul", 
                           "Zaghouan", "Bizerte", "Béja", "Jendouba", "Le Kef",
                           "Siliana", "Kairouan", "Kasserine", "Sidi Bouzid", "Sousse",
                           "Monastir", "Mahdia", "Sfax", "Gafsa", "Tozeur", "Kebili",
                           "Gabès", "Médenine", "Tataouine"};
        for (String region : regions) {
            if (address.toLowerCase().contains(region.toLowerCase())) {
                return region;
            }
        }
        return null;
    }

    // ========== LOCATION METHODS ==========
    
    public List<String> getAllCountries() {
        return propertyRepository.findAllCountries();
    }
    
    public List<String> getCitiesByCountry(String country) {
        return propertyRepository.findCitiesByCountry(country);
    }
    
    public List<PropertyWithCommissionDTO> getPropertiesByCountry(String country) {
        log.info("📋 Recherche de propriétés dans le pays: {}", country);
        List<Property> properties = propertyRepository.findByCountry(country);
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }
    
    public List<PropertyWithCommissionDTO> getPropertiesByCountryAndCity(String country, String city) {
        log.info("📋 Recherche de propriétés dans {}/{}", country, city);
        List<Property> properties = propertyRepository.findByCountryAndCity(country, city);
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }
    
    public List<PropertyWithCommissionDTO> getPropertiesByCity(String city) {
        log.info("📋 Recherche de propriétés dans la ville: {}", city);
        List<Property> properties = propertyRepository.findByCity(city);
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }
    
    public List<PropertyWithCommissionDTO> getPropertiesByArea(String area) {
        log.info("📋 Recherche de propriétés dans la zone: {}", area);
        List<Property> properties = propertyRepository.findByArea(area);
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }

    public List<PropertyWithCommissionDTO> getPropertiesByRegions(List<String> regions) {
        log.info("📋 Recherche de propriétés dans les régions: {}", regions);
        List<Property> properties = propertyRepository.findByRegions(regions);
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }

    public List<PropertyWithCommissionDTO> getPropertiesNearLocation(Double lat, Double lng, Double radiusKm) {
        log.info("📋 Recherche de propriétés dans un rayon de {} km autour de ({}, {})", radiusKm, lat, lng);
        List<Property> properties = propertyRepository.findPropertiesWithinRadius(lat, lng, radiusKm);
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }

    public List<PropertyWithCommissionDTO> getPropertiesForAffiliate(Long affiliateId) {
        log.info("📋 Récupération des propriétés pour l'affilié ID: {}", affiliateId);
        List<AffiliateRegion> affiliateRegions = affiliateRegionRepository.findByAffiliateIdAndIsActiveTrue(affiliateId);
        
        if (affiliateRegions.isEmpty()) {
            log.warn("Affilié ID {} n'a pas de régions configurées", affiliateId);
            return List.of();
        }
        
        List<String> regionNames = affiliateRegions.stream()
                .map(AffiliateRegion::getRegionName)
                .collect(Collectors.toList());
        
        List<Property> properties = propertyRepository.findByRegions(regionNames);
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }

    public List<PropertyWithCommissionDTO> getPropertiesByCommissionRange(Double minCommission, Double maxCommission) {
        log.info("📋 Recherche de propriétés avec commission entre {}% et {}%", minCommission, maxCommission);
        
        List<Property> properties;
        if (minCommission != null && maxCommission != null) {
            properties = propertyRepository.findByCommissionRange(minCommission, maxCommission);
        } else if (minCommission != null) {
            properties = propertyRepository.findByMinCommission(minCommission);
        } else {
            properties = propertyRepository.findPropertiesWithCommission();
        }
        
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }

    public List<PropertyWithCommissionDTO> filterProperties(String country, String city, String region, 
                                                            Double minPrice, Double maxPrice,
                                                            Double minCommission, String propertyType) {
        log.info("📋 Filtrage propriétés - Pays: {}, Ville: {}, Région: {}, Prix: {}-{}, Commission min: {}%, Type: {}", 
                 country, city, region, minPrice, maxPrice, minCommission, propertyType);
        
        List<Property> properties = propertyRepository.findWithFilters(
            country, city, region, minPrice, maxPrice, minCommission, propertyType);
        
        return properties.stream().map(this::convertToCommissionDTO).collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#id")
    public PropertyDTO updatePropertyCommission(Long id, UpdateCommissionRequest request) {
        log.info("Mise à jour de la commission pour la propriété ID: {}", id);
        
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));
        
        if (request.getCommissionPercentage() != null) {
            property.setCommissionPercentage(request.getCommissionPercentage());
        }
        if (request.getCommissionType() != null) {
            property.setCommissionType(request.getCommissionType());
        }
        if (request.getBasePriceForCommission() != null) {
            property.setBasePriceForCommission(request.getBasePriceForCommission());
        }
        
        Property updatedProperty = propertyRepository.save(property);
        log.info("Commission mise à jour pour propriété ID {}: {}%", 
                 id, updatedProperty.getCommissionPercentage());
        
        return convertToFullDTO(updatedProperty);
    }

    @Transactional
    public int updateCommissionByRegion(String region, Double newCommissionPercentage) {
        log.info("Mise à jour en masse de la commission pour la région {} à {}%", region, newCommissionPercentage);
        
        List<Property> properties = propertyRepository.findByRegion(region);
        int updatedCount = 0;
        
        for (Property property : properties) {
            property.setCommissionPercentage(newCommissionPercentage);
            propertyRepository.save(property);
            updatedCount++;
        }
        
        log.info("{} propriétés mises à jour dans la région {}", updatedCount, region);
        return updatedCount;
    }

    private PropertyWithCommissionDTO convertToCommissionDTO(Property property) {
        PropertyWithCommissionDTO dto = new PropertyWithCommissionDTO();
        
        dto.setId(property.getId());
        dto.setTitre(property.getTitre());
        dto.setDescription(property.getDescription());
        dto.setType(property.getType());
        dto.setPrixVente(property.getPrixVente());
        dto.setPrixLocation(property.getPrixLocation());
        dto.setStatut(property.getStatut());
        dto.setSurface(property.getSurface());
        dto.setNbChambres(property.getNbChambres());
        dto.setAdresse(property.getAdresse());
        dto.setCountry(property.getCountry());
        dto.setCity(property.getCity());
        dto.setRegion(property.getRegion());
        dto.setLatitude(property.getLatitude());
        dto.setLongitude(property.getLongitude());
        dto.setIsActive(property.getIsActive());
        dto.setCreatedAt(property.getCreatedAt());
        dto.setUpdatedAt(property.getUpdatedAt());
        
        // Commission information
        dto.setCommissionPercentage(property.getCommissionPercentage());
        dto.setCommissionType(property.getCommissionType());
        dto.setCommissionAmount(property.calculateCommissionAmount());
        dto.setCommissionDisplay(property.getCommissionDisplay());
        dto.setBasePriceForCommission(property.getBasePriceForCommission());
        
        // Display price for commission calculation
        Double priceForCommission = property.getPriceForCommission();
        if (priceForCommission != null) {
            dto.setPriceForCommissionDisplay(String.format("%,.0f TND", priceForCommission));
        }
        
        // Image principale
        if (property.getMainImageId() != null) {
            dto.setHasMainImage(true);
            dto.setMainImageUrl("/api/public/images/" + property.getMainImageId());
            
            try {
                ImageDTO imageInfo = imageService.getImageInfoById(property.getMainImageId());
                dto.setMainImageName(imageInfo.getFileName());
                dto.setMainImageType(imageInfo.getFileType());
                dto.setMainImageSize(imageInfo.getFileSize());
            } catch (Exception e) {
                log.warn("Could not fetch image info for ID: {}", property.getMainImageId());
            }
        } else {
            dto.setHasMainImage(false);
        }
        
        // Modèle 3D
        if (property.getMainModel3dId() != null) {
            dto.setHasModel3d(true);
            dto.setModel3dUrl("/api/public/models/" + property.getMainModel3dId());
            
            try {
                Model3DDTO modelInfo = model3DService.getModel3DInfoById(property.getMainModel3dId());
                dto.setModel3dName(modelInfo.getFileName());
                dto.setModel3dType(modelInfo.getFileType());
                dto.setModel3dSize(modelInfo.getFileSize());
            } catch (Exception e) {
                log.warn("Could not fetch model info for ID: {}", property.getMainModel3dId());
            }
        } else {
            dto.setHasModel3d(false);
        }
        
        return dto;
    }

    // ========== READ METHODS ==========

    public List<PropertyListDTO> getAllPropertiesList() {
        log.info("📋 Récupération de toutes les propriétés (version liste)");
        long start = System.currentTimeMillis();
        
        List<Property> properties = propertyRepository.findByIsActiveTrue();
        List<PropertyListDTO> dtos = properties.stream()
                .map(this::convertToListDTO)
                .collect(Collectors.toList());
        
        long duration = System.currentTimeMillis() - start;
        log.info("✅ {} propriétés récupérées en {} ms", dtos.size(), duration);
        
        return dtos;
    }

    @Cacheable(value = "properties", key = "'all'")
    public List<PropertyDTO> getAllProperties() {
        log.info("📋 Récupération de toutes les propriétés (version complète)");
        long start = System.currentTimeMillis();
        
        List<Property> properties = propertyRepository.findByIsActiveTrue();
        List<PropertyDTO> result = properties.stream()
                .map(this::convertToFullDTO)
                .collect(Collectors.toList());
        
        long duration = System.currentTimeMillis() - start;
        log.info("✅ {} propriétés complètes récupérées en {} ms", result.size(), duration);
        
        return result;
    }

    @Cacheable(value = "properties", key = "'active'")
    public List<PropertyDTO> getActiveProperties() {
        return propertyRepository.findByIsActiveTrue().stream()
                .map(this::convertToFullDTO)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "property", key = "#id")
    public PropertyDTO getPropertyById(Long id) {
        long start = System.currentTimeMillis();
        log.info("📋 Récupération de la propriété ID: {}", id);
        
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));
        
        PropertyDTO dto = convertToFullDTO(property);
        long duration = System.currentTimeMillis() - start;
        log.info("✅ Propriété ID {} convertie en {} ms", id, duration);
        return dto;
    }

    public PropertyListDTO getPropertyByIdLight(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));
        return convertToListDTO(property);
    }

    public List<PropertyMediaDTO> getPropertyMediaLight(Long propertyId) {
        List<PropertyMediaDTO> allMedia = new ArrayList<>();
        
        List<ImageDTO> images = imageService.getImagesInfoByPropertyId(propertyId);
        allMedia.addAll(images.stream().map(this::convertImageToMediaDTO).collect(Collectors.toList()));
        
        List<VideoDTO> videos = videoService.getVideosInfoByPropertyId(propertyId);
        allMedia.addAll(videos.stream().map(this::convertVideoToMediaDTO).collect(Collectors.toList()));
        
        Model3DDTO model = model3DService.getModel3DInfoByPropertyId(propertyId);
        if (model != null) {
            allMedia.add(convertModelToMediaDTO(model));
        }
        
        return allMedia;
    }

    public List<PropertyListDTO> getRecentPropertiesLight(int limit) {
        log.info("📋 Récupération LIGHT des {} propriétés les plus récentes", limit);
        
        List<Property> properties = propertyRepository.findRecentProperties(limit);
        
        return properties.stream()
                .map(this::convertToListDTO)
                .collect(Collectors.toList());
    }

    // ========== UPDATE ==========
    
    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#id")
    public PropertyDTO updateProperty(Long id, @Valid UpdatePropertyRequest request) {
        log.info("Mise à jour de la propriété ID: {}", id);
        
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));

        String oldCategory = property.getCategory();
        
        // Update prices
        if (request.getPrixVente() != null) property.setPrixVente(request.getPrixVente());
        if (request.getPrixLocation() != null) property.setPrixLocation(request.getPrixLocation());
        
        // Get new category
        String newCategory = request.getCategory();
        if (newCategory == null && (request.getPrixVente() != null || request.getPrixLocation() != null)) {
            newCategory = property.getCategory();
        }
        
        // If category changed, validate and adjust status if needed
        if (newCategory != null && !newCategory.equals(oldCategory)) {
            log.info("Catégorie changée de {} à {}", oldCategory, newCategory);
            
            // Clear the inappropriate price
            if ("VENTE".equals(newCategory)) {
                property.setPrixLocation(null);
                // Ensure status is valid for sale
                String currentStatus = request.getStatut() != null ? request.getStatut() : property.getStatut();
                if (!Property.isStatusAllowedForCategory("VENTE", currentStatus)) {
                    property.setStatut("DISPONIBLE");
                    log.info("Statut réinitialisé à DISPONIBLE car {} n'est pas valide pour la vente", currentStatus);
                }
            } else if ("LOCATION".equals(newCategory)) {
                property.setPrixVente(null);
                // Ensure status is valid for rental
                String currentStatus = request.getStatut() != null ? request.getStatut() : property.getStatut();
                if (!Property.isStatusAllowedForCategory("LOCATION", currentStatus)) {
                    property.setStatut("DISPONIBLE");
                    log.info("Statut réinitialisé à DISPONIBLE car {} n'est pas valide pour la location", currentStatus);
                }
            }
        }
        
        // Update other fields
        if (request.getTitre() != null) property.setTitre(request.getTitre());
        if (request.getDescription() != null) property.setDescription(request.getDescription());
        if (request.getType() != null) property.setType(request.getType());
        if (request.getStatut() != null) {
            // Validate status is allowed for current category
            String currentCategory = property.getCategory();
            if (!Property.isStatusAllowedForCategory(currentCategory, request.getStatut())) {
                throw new IllegalArgumentException(
                    String.format("Le statut '%s' n'est pas autorisé pour une propriété en %s. " +
                                  "Statuts autorisés: %s",
                                  request.getStatut(),
                                  currentCategory.toLowerCase(),
                                  Property.getAllowedStatusesForCategory(currentCategory))
                );
            }
            property.setStatut(request.getStatut());
        }
        if (request.getSurface() != null) property.setSurface(request.getSurface());
        if (request.getNbChambres() != null) property.setNbChambres(request.getNbChambres());
        if (request.getAdresse() != null) property.setAdresse(request.getAdresse());
        if (request.getCountry() != null) property.setCountry(request.getCountry());
        if (request.getCity() != null) property.setCity(request.getCity());
        if (request.getLatitude() != null) property.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) property.setLongitude(request.getLongitude());
        if (request.getIsActive() != null) property.setIsActive(request.getIsActive());

        Property updatedProperty = propertyRepository.save(property);
        log.info("Propriété ID {} mise à jour - Catégorie: {}, Statut: {}", 
                 id, updatedProperty.getCategory(), updatedProperty.getStatut());
        
        return convertToFullDTO(updatedProperty);
    }

        @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#id")
    public PropertyDTO updatePropertyStatus(Long id, String newStatus) {
        log.info("Mise à jour du statut de la propriété ID: {} vers {}", id, newStatus);
        
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));
        
        String category = property.getCategory();
        
        // Validate status is allowed for this category
        if (!Property.isStatusAllowedForCategory(category, newStatus)) {
            throw new IllegalArgumentException(
                String.format("Le statut '%s' n'est pas autorisé pour une propriété en %s. " +
                              "Statuts autorisés: %s",
                              newStatus,
                              category.toLowerCase(),
                              Property.getAllowedStatusesForCategory(category))
            );
        }
        
        property.setStatut(newStatus);
        Property updatedProperty = propertyRepository.save(property);
        
        log.info("Statut de la propriété ID {} mis à jour: {}", id, newStatus);
        
        return convertToFullDTO(updatedProperty);
    }

    // ========== DELETE ==========
    
    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#id")
    public void deleteProperty(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));
        
        imageService.deleteAllImagesByPropertyId(id);
        videoService.deleteAllVideosByPropertyId(id);
        model3DService.deleteModel3DByPropertyId(id);
        
        property.setIsActive(false);
        propertyRepository.save(property);
        
        log.info("Propriété ID {} désactivée avec tous ses médias", id);
    }

    // ========== UPLOAD DE FICHIERS ==========
    
    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#propertyId")
    public PropertyDTO uploadMainImage(Long propertyId, MultipartFile file) throws IOException {
        log.info("Upload d'image principale pour la propriété ID: {}", propertyId);
        
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + propertyId));
        
        ImageUploadRequest request = new ImageUploadRequest();
        request.setPrimary(true);
        request.setTitle(property.getTitre());
        request.setAltText("Image principale de " + property.getTitre());
        
        ImageDTO uploadedImage = imageService.uploadImage(propertyId, file, request);
        
        property.setMainImageId(uploadedImage.getId());
        propertyRepository.save(property);
        
        log.info("Image principale uploadée avec succès pour propriété ID: {}", propertyId);
        
        return convertToFullDTO(property);
    }
    
    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#propertyId")
    public PropertyDTO uploadModel3d(Long propertyId, MultipartFile file) throws IOException {
        log.info("Upload de modèle 3D pour la propriété ID: {}", propertyId);
        
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + propertyId));
        
        Model3DDTO uploadedModel = model3DService.uploadModel3D(propertyId, file, 
            "Modèle 3D de " + property.getTitre());
        
        property.setMainModel3dId(uploadedModel.getId());
        propertyRepository.save(property);
        
        log.info("Modèle 3D uploadé avec succès pour propriété ID: {}", propertyId);
        
        return convertToFullDTO(property);
    }
    
    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#propertyId")
    public PropertyMediaDTO uploadMedia(Long propertyId, MultipartFile file, String type, 
                                    Integer sortOrder, Boolean isPrimary) throws IOException {
        log.info("Upload de média pour la propriété ID: {}, type: {}", propertyId, type);
        
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + propertyId));
        
        PropertyMediaDTO result = null;
        
        if ("IMAGE".equalsIgnoreCase(type)) {
            ImageUploadRequest request = new ImageUploadRequest();
            request.setPrimary(isPrimary != null && isPrimary);
            request.setTitle(property.getTitre());
            
            ImageDTO image = imageService.uploadImage(propertyId, file, request);
            result = convertImageToMediaDTO(image);
            
            if (isPrimary != null && isPrimary) {
                property.setMainImageId(image.getId());
                propertyRepository.save(property);
            }
            
        } else if ("VIDEO".equalsIgnoreCase(type)) {
            VideoUploadRequest request = new VideoUploadRequest();
            request.setPrimary(isPrimary != null && isPrimary);
            request.setTitle(property.getTitre());
            
            VideoDTO video = videoService.uploadVideo(propertyId, file, request);
            result = convertVideoToMediaDTO(video);
            
            if (isPrimary != null && isPrimary) {
                property.setMainVideoId(video.getId());
                propertyRepository.save(property);
            }
            
        } else if ("MODEL_3D".equalsIgnoreCase(type)) {
            Model3DDTO model = model3DService.uploadModel3D(propertyId, file, 
                "Modèle 3D de " + property.getTitre());
            result = convertModelToMediaDTO(model);
            
            property.setMainModel3dId(model.getId());
            propertyRepository.save(property);
        }
        
        log.info("Média uploadé avec succès pour propriété ID: {}", propertyId);
        return result;
    }
    
    public byte[] getMediaFile(Long mediaId, String mediaType) {
        if ("IMAGE".equalsIgnoreCase(mediaType)) {
            return imageService.getImageData(mediaId);
        } else if ("VIDEO".equalsIgnoreCase(mediaType)) {
            return videoService.getVideoData(mediaId);
        } else if ("MODEL_3D".equalsIgnoreCase(mediaType)) {
            return model3DService.getModel3DData(mediaId);
        }
        throw new RuntimeException("Type de média non supporté: " + mediaType);
    }
    
    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#propertyId")
    public void deleteMedia(Long mediaId, String mediaType, Long propertyId) {
        if ("IMAGE".equalsIgnoreCase(mediaType)) {
            imageService.deleteImage(mediaId, propertyId);
        } else if ("VIDEO".equalsIgnoreCase(mediaType)) {
            videoService.deleteVideo(mediaId, propertyId);
        } else if ("MODEL_3D".equalsIgnoreCase(mediaType)) {
            model3DService.deleteModel3D(mediaId, propertyId);
        }
        log.info("Média ID {} supprimé", mediaId);
    }
    
    public byte[] getMainImage(Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + propertyId));
        
        if (property.getMainImageId() == null) {
            throw new RuntimeException("Image non trouvée");
        }
        
        return imageService.getImageData(property.getMainImageId());
    }
    
    public byte[] getModel3d(Long propertyId) {
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + propertyId));
        
        if (property.getMainModel3dId() == null) {
            throw new RuntimeException("Modèle 3D non trouvé");
        }
        
        return model3DService.getModel3DData(property.getMainModel3dId());
    }
    
    @Transactional
    @CacheEvict(value = {"properties", "property"}, key = "#id")
    public PropertyDTO validateProperty(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));
        property.setStatut("VALIDÉ");
        Property validatedProperty = propertyRepository.save(property);
        return convertToFullDTO(validatedProperty);
    }

    // ========== MÉTHODES DE CONVERSION ==========
    
    private PropertyListDTO convertToListDTO(Property property) {
        PropertyListDTO dto = new PropertyListDTO();
        
        dto.setId(property.getId());
        dto.setTitre(property.getTitre());
        dto.setDescription(property.getDescription());
        dto.setType(property.getType());
        dto.setPrixVente(property.getPrixVente());
        dto.setPrixLocation(property.getPrixLocation());
        dto.setStatut(property.getStatut());
        dto.setSurface(property.getSurface());
        dto.setNbChambres(property.getNbChambres());
        dto.setAdresse(property.getAdresse());
        dto.setCountry(property.getCountry());
        dto.setCity(property.getCity());
        dto.setLatitude(property.getLatitude());
        dto.setLongitude(property.getLongitude());
        dto.setIsActive(property.getIsActive());
        dto.setCreatedAt(property.getCreatedAt());
        dto.setUpdatedAt(property.getUpdatedAt());
        
        if (property.getMainImageId() != null) {
            dto.setHasMainImage(true);
            dto.setMainImageUrl("/api/public/images/" + property.getMainImageId());
            
            try {
                ImageDTO imageInfo = imageService.getImageInfoById(property.getMainImageId());
                dto.setMainImageName(imageInfo.getFileName());
                dto.setMainImageType(imageInfo.getFileType());
                dto.setMainImageSize(imageInfo.getFileSize());
            } catch (Exception e) {
                log.warn("Could not fetch image info for ID: {}", property.getMainImageId());
            }
        } else {
            dto.setHasMainImage(false);
        }
        
        if (property.getMainModel3dId() != null) {
            dto.setHasModel3d(true);
            dto.setModel3dUrl("/api/public/models/" + property.getMainModel3dId());
            
            try {
                Model3DDTO modelInfo = model3DService.getModel3DInfoById(property.getMainModel3dId());
                dto.setModel3dName(modelInfo.getFileName());
                dto.setModel3dType(modelInfo.getFileType());
                dto.setModel3dSize(modelInfo.getFileSize());
            } catch (Exception e) {
                log.warn("Could not fetch model info for ID: {}", property.getMainModel3dId());
            }
        } else {
            dto.setHasModel3d(false);
        }
        
        return dto;
    }

    private PropertyDTO convertToFullDTO(Property property) {
        long start = System.currentTimeMillis();
        Long propertyId = property != null ? property.getId() : null;
        log.info("➡️ Début convertToFullDTO pour propriété ID: {}", propertyId);
        PropertyDTO dto = new PropertyDTO();
        
        dto.setId(property.getId());
        dto.setTitre(property.getTitre());
        dto.setDescription(property.getDescription());
        dto.setType(property.getType());
        dto.setPrixVente(property.getPrixVente());
        dto.setPrixLocation(property.getPrixLocation());
        dto.setStatut(property.getStatut());
        dto.setSurface(property.getSurface());
        dto.setNbChambres(property.getNbChambres());
        dto.setAdresse(property.getAdresse());
        dto.setCountry(property.getCountry());
        dto.setCity(property.getCity());
        dto.setLatitude(property.getLatitude());
        dto.setLongitude(property.getLongitude());
        dto.setIsActive(property.getIsActive());
        dto.setCreatedAt(property.getCreatedAt());
        dto.setUpdatedAt(property.getUpdatedAt());
        dto.setCommissionPercentage(property.getCommissionPercentage());
        dto.setCommissionType(property.getCommissionType());
        
        if (property.getMainImageId() != null) {
            dto.setHasMainImage(true);
            dto.setMainImageUrl("/api/public/images/" + property.getMainImageId());
            
            try {
                ImageDTO imageInfo = imageService.getImageInfoById(property.getMainImageId());
                dto.setMainImageName(imageInfo.getFileName());
                dto.setMainImageType(imageInfo.getFileType());
                dto.setMainImageSize(imageInfo.getFileSize());
            } catch (Exception e) {
                log.warn("Could not fetch image info for ID: {}", property.getMainImageId());
            }
        } else {
            dto.setHasMainImage(false);
        }
        
        if (property.getMainModel3dId() != null) {
            dto.setHasModel3d(true);
            dto.setModel3dUrl("/api/public/models/" + property.getMainModel3dId());
            
            try {
                Model3DDTO modelInfo = model3DService.getModel3DInfoById(property.getMainModel3dId());
                dto.setModel3dName(modelInfo.getFileName());
                dto.setModel3dType(modelInfo.getFileType());
                dto.setModel3dSize(modelInfo.getFileSize());
            } catch (Exception e) {
                log.warn("Could not fetch model info for ID: {}", property.getMainModel3dId());
            }
        } else {
            dto.setHasModel3d(false);
        }
        
        List<PropertyMediaDTO> allMedia = new ArrayList<>();
        
        List<ImageDTO> images = imageService.getImagesInfoByPropertyId(property.getId());
        allMedia.addAll(images.stream().map(this::convertImageToMediaDTO).collect(Collectors.toList()));
        
        List<VideoDTO> videos = videoService.getVideosInfoByPropertyId(property.getId());
        allMedia.addAll(videos.stream().map(this::convertVideoToMediaDTO).collect(Collectors.toList()));
        
        Model3DDTO model = model3DService.getModel3DInfoByPropertyId(property.getId());
        if (model != null) {
            allMedia.add(convertModelToMediaDTO(model));
        }
        
        dto.setMedias(allMedia);
        long duration = System.currentTimeMillis() - start;
        log.info("⬅️ Fin convertToFullDTO pour propriété ID: {} en {} ms", propertyId, duration);
        return dto;
    }

    private PropertyMediaDTO convertImageToMediaDTO(ImageDTO image) {
        PropertyMediaDTO dto = new PropertyMediaDTO();
        dto.setId(image.getId());
        dto.setType("IMAGE");
        dto.setUrl("/api/public/images/" + image.getId());
        dto.setFileName(image.getFileName());
        dto.setFileType(image.getFileType());
        dto.setFileSize(image.getFileSize());
        dto.setSortOrder(image.getSortOrder());
        dto.setIsPrimary(image.getIsPrimary());
        dto.setPropertyId(image.getPropertyId());
        return dto;
    }

    private PropertyMediaDTO convertVideoToMediaDTO(VideoDTO video) {
        PropertyMediaDTO dto = new PropertyMediaDTO();
        dto.setId(video.getId());
        dto.setType("VIDEO");
        dto.setUrl("/api/public/videos/" + video.getId());
        dto.setFileName(video.getFileName());
        dto.setFileType(video.getFileType());
        dto.setFileSize(video.getFileSize());
        dto.setSortOrder(video.getSortOrder());
        dto.setIsPrimary(video.getIsPrimary());
        dto.setPropertyId(video.getPropertyId());
        return dto;
    }

    private PropertyMediaDTO convertModelToMediaDTO(Model3DDTO model) {
        PropertyMediaDTO dto = new PropertyMediaDTO();
        dto.setId(model.getId());
        dto.setType("MODEL_3D");
        dto.setUrl("/api/public/models/" + model.getId());
        dto.setFileName(model.getFileName());
        dto.setFileType(model.getFileType());
        dto.setFileSize(model.getFileSize());
        dto.setSortOrder(0);
        dto.setIsPrimary(true);
        dto.setPropertyId(model.getPropertyId());
        return dto;
    }

    public List<String> getAllRegions() {
    log.info("📋 Récupération de toutes les régions disponibles");
    List<String> regions = propertyRepository.findAllRegions();
    return regions;
}

    /**
     * Get allowed statuses for a specific category
     */
    public List<String> getAllowedStatusesForCategory(String category) {
        return Property.getAllowedStatusesForCategory(category);
    }
    
    /**
     * Get category for a property
     */
    public String getPropertyCategory(Long id) {
        Property property = propertyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Propriété non trouvée avec ID: " + id));
        return property.getCategory();
    }

}