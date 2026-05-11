from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health, price, recommendations
from app.services.price_service import PriceService
from app.services.recommendation_service import RecommendationService


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.price_service = PriceService()
    app.state.price_service.initialize()

    app.state.rec_service = RecommendationService()
    app.state.rec_service.initialize()

    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "AI microservice for Maison3D Immobilier — "
        "price estimation, property recommendations, and market analytics."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200", "http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router,          prefix="/health",  tags=["Health"])
app.include_router(price.router,           prefix="/api/ai",  tags=["Price Estimation"])
app.include_router(recommendations.router, prefix="/api/ai",  tags=["Recommendations"])
