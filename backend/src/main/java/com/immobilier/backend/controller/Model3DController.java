package com.immobilier.backend.controller;

import com.immobilier.backend.dto.Model3DDTO;
import com.immobilier.backend.service.Model3DService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/models")
@RequiredArgsConstructor
public class Model3DController {

    private final Model3DService model3DService;

    // Handle OPTIONS requests for preflight
    @RequestMapping(method = RequestMethod.OPTIONS)
    public ResponseEntity<?> handleOptions() {
        return ResponseEntity.ok().build();
    }

    // ==================== ROUTES PUBLIQUES ====================
    
    // Get model by MODEL ID (for direct access)
    @GetMapping("/public/{id}")
    public ResponseEntity<?> getModelPublic(@PathVariable Long id) {
        try {
            log.info("📸 Public 3D model request for MODEL ID: {}", id);
            
            byte[] modelData = model3DService.getModel3DData(id);
            Model3DDTO modelInfo = model3DService.getModel3DInfoById(id);
            
            if (modelData == null || modelData.length == 0) {
                log.warn("⚠️ No data for model ID: {}", id);
                return ResponseEntity.notFound().build();
            }
            
            HttpHeaders headers = new HttpHeaders();
            MediaType mediaType = MediaType.parseMediaType(
                modelInfo.getFileType() != null ? modelInfo.getFileType() : "application/octet-stream");
            headers.setContentType(mediaType);
            headers.setContentLength(modelData.length);
            headers.setCacheControl("public, max-age=86400");
            headers.setContentDispositionFormData("inline", modelInfo.getFileName());
            
            log.info("✅ Serving public model ID: {}, size: {} bytes, type: {}", 
                id, modelData.length, modelInfo.getFileType());
            
            return new ResponseEntity<>(modelData, headers, HttpStatus.OK);
            
        } catch (RuntimeException e) {
            log.error("❌ Model not found ID {}: {}", id, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Model not found");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("❌ Error serving model ID {}: {}", id, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal server error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    // NEW ENDPOINT: Get model by PROPERTY ID
    @GetMapping("/public/property/{propertyId}")
    public ResponseEntity<?> getModelByPropertyPublic(@PathVariable Long propertyId) {
        try {
            log.info("📸 Public 3D model request for PROPERTY ID: {}", propertyId);
            
            Model3DDTO modelInfo = model3DService.getModel3DInfoByPropertyId(propertyId);
            
            if (modelInfo == null) {
                log.warn("⚠️ No model found for property ID: {}", propertyId);
                return ResponseEntity.notFound().build();
            }
            
            byte[] modelData = model3DService.getModel3DData(modelInfo.getId());
            
            if (modelData == null || modelData.length == 0) {
                log.warn("⚠️ No data for model ID: {}", modelInfo.getId());
                return ResponseEntity.notFound().build();
            }
            
            HttpHeaders headers = new HttpHeaders();
            MediaType mediaType = MediaType.parseMediaType(
                modelInfo.getFileType() != null ? modelInfo.getFileType() : "application/octet-stream");
            headers.setContentType(mediaType);
            headers.setContentLength(modelData.length);
            headers.setCacheControl("public, max-age=86400");
            headers.setContentDispositionFormData("inline", modelInfo.getFileName());
            
            log.info("✅ Serving model for property ID: {}, model ID: {}, size: {} bytes", 
                propertyId, modelInfo.getId(), modelData.length);
            
            return new ResponseEntity<>(modelData, headers, HttpStatus.OK);
            
        } catch (RuntimeException e) {
            log.error("❌ Model not found for property ID {}: {}", propertyId, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Model not found for this property");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        } catch (Exception e) {
            log.error("❌ Error serving model for property ID {}: {}", propertyId, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal server error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/public/{id}/info")
    public ResponseEntity<?> getModelInfoPublic(@PathVariable Long id) {
        try {
            Model3DDTO model = model3DService.getModel3DInfoById(id);
            return model != null ? ResponseEntity.ok(model) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error getting model info: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Model not found");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    // Get model info by property ID
    @GetMapping("/public/property/{propertyId}/info")
    public ResponseEntity<?> getModelInfoByPropertyPublic(@PathVariable Long propertyId) {
        try {
            Model3DDTO model = model3DService.getModel3DInfoByPropertyId(propertyId);
            return model != null ? ResponseEntity.ok(model) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error getting model info for property {}: {}", propertyId, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Model not found for this property");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
        }
    }

    // ==================== ROUTES PROTÉGÉES ====================
    
    @GetMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('CLIENT', 'COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> getModelByProperty(@PathVariable Long propertyId) {
        try {
            log.info("🔒 Récupération du modèle 3D pour la propriété ID: {}", propertyId);
            Model3DDTO model = model3DService.getModel3DInfoByPropertyId(propertyId);
            return model != null ? ResponseEntity.ok(model) : ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("❌ Error getting model: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping(value = "/property/{propertyId}/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> uploadModel(
            @PathVariable Long propertyId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        
        log.info("🎮 Upload de modèle 3D pour la propriété ID: {}", propertyId);
        
        try {
            if (file == null || file.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "File is empty");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }
            
            if (file.getSize() > 1024 * 1024 * 1024) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "File too large. Maximum size: 1GB");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }
            
            String contentType = file.getContentType();
            String fileName = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
            boolean validExtension = fileName.endsWith(".glb") || fileName.endsWith(".gltf")
                    || fileName.endsWith(".obj") || fileName.endsWith(".fbx") || fileName.endsWith(".ply");
            boolean validMime = contentType != null && (
                    contentType.contains("gltf") || contentType.contains("glb")
                    || contentType.contains("obj") || contentType.contains("fbx")
                    || contentType.contains("ply") || contentType.contains("model")
                    || contentType.equals("application/octet-stream"));
            if (!validExtension && !validMime) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Format non supporté. Formats acceptés : GLB, GLTF, OBJ, FBX, PLY");
                error.put("supported", "GLB, GLTF, OBJ, FBX, PLY");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }
            
            Model3DDTO model = model3DService.uploadModel3D(propertyId, file, description);
            return ResponseEntity.status(HttpStatus.CREATED).body(model);
            
        } catch (RuntimeException e) {
            log.error("❌ Business error uploading model: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (IOException e) {
            log.error("❌ IO error uploading model: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to process file: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        } catch (Exception e) {
            log.error("❌ Unexpected error uploading model: {}", e.getMessage(), e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal server error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @DeleteMapping("/{modelId}")
    @PreAuthorize("hasAnyRole('COMMERCIAL', 'RESPONSABLE_COMMERCIAL', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteModel(
            @PathVariable Long modelId,
            @RequestParam Long propertyId) {
        try {
            log.info("🗑️ Suppression du modèle 3D ID: {} pour la propriété ID: {}", modelId, propertyId);
            model3DService.deleteModel3D(modelId, propertyId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Modèle 3D supprimé avec succès");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Error deleting model: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @DeleteMapping("/property/{propertyId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<?> deleteAllModels(@PathVariable Long propertyId) {
        try {
            log.info("🗑️ Suppression de tous les modèles 3D pour la propriété ID: {}", propertyId);
            model3DService.deleteModel3DByPropertyId(propertyId);
            Map<String, String> response = new HashMap<>();
            response.put("message", "Tous les modèles 3D ont été supprimés avec succès");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("❌ Error deleting models: {}", e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}