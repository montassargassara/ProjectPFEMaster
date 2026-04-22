package com.immobilier.backend.validation;

import com.immobilier.backend.entity.Property;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class PropertyStatusValidator implements ConstraintValidator<ValidPropertyStatus, Property> {
    
    @Override
    public boolean isValid(Property property, ConstraintValidatorContext context) {
        if (property == null) return true;
        
        String category = property.getCategory();
        if (category == null) return true;
        
        boolean isValid = property.isStatusValidForCategory();
        
        if (!isValid) {
            context.disableDefaultConstraintViolation();
            String message = "VENTE".equals(category) 
                ? "Une propriété en vente ne peut pas avoir le statut 'LOUE'. Statuts autorisés: DISPONIBLE, EN_ATTENTE, VENDU"
                : "Une propriété en location ne peut pas avoir le statut 'VENDU'. Statuts autorisés: DISPONIBLE, EN_ATTENTE, LOUE";
            context.buildConstraintViolationWithTemplate(message)
                   .addPropertyNode("statut")
                   .addConstraintViolation();
        }
        
        return isValid;
    }
}