from pydantic import BaseModel, Field
from typing import Literal, Optional


class PriceRequest(BaseModel):
    city: str = Field(..., example="Tunis")
    country: str = Field(default="Tunisia")
    type: str = Field(..., example="APPARTEMENT")
    surface: float = Field(..., gt=0, example=120.0)
    bedrooms: int = Field(default=2, ge=0, le=12)
    bathrooms: int = Field(default=1, ge=0, le=10)
    garage: bool = False
    piscine: bool = False
    jardin: bool = False
    meuble: bool = False
    etage: int = Field(default=0, ge=0, le=50)
    parkingSpaces: int = Field(default=0, ge=0, le=10)
    anneeConstruction: Optional[int] = None
    prochePlage: bool = False
    procheTransport: bool = False
    securite: bool = False
    climatisation: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "city": "Sousse", "country": "Tunisia", "type": "VILLA",
                "surface": 250, "bedrooms": 4, "bathrooms": 3,
                "garage": True, "piscine": True, "jardin": True,
                "climatisation": True, "securite": True,
            }
        }


class PriceResponse(BaseModel):
    estimatedPrice: int
    confidence: int = Field(..., ge=0, le=100)
    minPrice: int
    maxPrice: int
    marketDemand: Literal["LOW", "MEDIUM", "HIGH"]
    pricePerM2: int
    modelVersion: str = "rf-v2"


class RentalPriceResponse(BaseModel):
    estimatedMonthlyRent: int
    confidence: int = Field(..., ge=0, le=100)
    minRent: int
    maxRent: int
    marketDemand: Literal["LOW", "MEDIUM", "HIGH"]
    pricePerM2: int
    modelVersion: str = "rf-v2"
