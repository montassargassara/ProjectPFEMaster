package com.immobilier.backend.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "models_3d", indexes = {
    @Index(name = "idx_models_property_id", columnList = "property_id"),
    @Index(name = "idx_models_file_type", columnList = "file_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Model3D {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "property_id", nullable = false)
    private Long propertyId;
    
    @Column(name = "file_name", length = 255, nullable = false)
    private String fileName;
    
    @Column(name = "file_type", length = 100, nullable = false)
    private String fileType;
    
    @Column(name = "file_size", nullable = false)
    private Long fileSize;
    
    @Lob
    @Column(name = "file_data", columnDefinition = "LONGBLOB", nullable = false)
    private byte[] fileData;
    
    @Column(name = "format", length = 50)
    private String format; // gltf, glb, obj, fbx
    
    @Column(name = "polygon_count")
    private Integer polygonCount;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "description", length = 500)
    private String description;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        if (isActive == null) isActive = true;
        if (fileType != null && fileType.contains("gltf")) format = "gltf";
        else if (fileType != null && fileType.contains("glb")) format = "glb";
    }
}