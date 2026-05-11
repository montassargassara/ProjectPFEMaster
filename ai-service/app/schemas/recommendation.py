from pydantic import BaseModel, Field
from typing import Optional, List


class RecommendationRequest(BaseModel):
    propertyId: Optional[int] = None
    city: Optional[str] = None
    type: Optional[str] = None
    surface: Optional[float] = None
    maxPrice: Optional[float] = None
    bedrooms: Optional[int] = None
    limit: int = Field(default=6, ge=1, le=20)


class RecommendedProperty(BaseModel):
    id: int
    titre: str
    type: str
    city: str
    surface: float
    bedrooms: int
    price: float
    imageUrl: Optional[str] = None
    similarityScore: float = Field(..., ge=0.0, le=1.0)
    matchReasons: List[str] = []


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendedProperty]
    basedOn: str
    totalFound: int
