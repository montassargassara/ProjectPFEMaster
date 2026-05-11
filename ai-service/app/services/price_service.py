import logging
import numpy as np
import joblib
from pathlib import Path
from typing import Optional, Tuple

from app.config import settings
from app.schemas.price import PriceRequest, PriceResponse, RentalPriceResponse

logger = logging.getLogger(__name__)

HIGH_DEMAND_CITIES = {
    "tunis", "la marsa", "carthage", "sidi bou said",
    "gammarth", "hammamet", "djerba",
}
LOW_DEMAND_CITIES = {
    "gafsa", "tataouine", "tozeur", "kebili",
    "medenine", "siliana", "el kef",
}

FEATURE_COLS = [
    "city_enc", "country_enc", "type_enc",
    "surface", "bedrooms", "bathrooms",
    "garage", "piscine", "jardin", "meuble",
    "etage", "parkingSpaces", "anneeConstruction",
    "prochePlage", "procheTransport", "securite", "climatisation",
]


class PriceService:
    def __init__(self):
        self._sale_model   = None
        self._rental_model = None
        self._le_city      = None
        self._le_country   = None
        self._le_type      = None
        self._ready        = False

    def initialize(self) -> None:
        models_dir = settings.models_dir
        sale_path   = models_dir / "price_model_sale.pkl"
        rental_path = models_dir / "price_model_rental.pkl"

        if not sale_path.exists() or not rental_path.exists():
            logger.info("Price models not found — training now (may take ~60 s)…")
            try:
                from ml.train_price_model import train
                train(save_dir=models_dir)
            except Exception as e:
                logger.error(f"Training failed: {e}")
                return

        try:
            self._sale_model   = joblib.load(models_dir / "price_model_sale.pkl")
            self._rental_model = joblib.load(models_dir / "price_model_rental.pkl")
            self._le_city      = joblib.load(models_dir / "city_encoder.pkl")
            self._le_country   = joblib.load(models_dir / "country_encoder.pkl")
            self._le_type      = joblib.load(models_dir / "type_encoder.pkl")
            self._ready        = True
            logger.info("Price models (sale + rental) loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load price models: {e}")

    def is_ready(self) -> bool:
        return self._ready

    # ── Sale prediction ───────────────────────────────────────────────────────

    def predict_sale(self, req: PriceRequest) -> PriceResponse:
        if not self._ready:
            raise RuntimeError("Price service not initialised")

        features = self._build_features(req)
        estimated = float(self._sale_model.predict([features])[0])
        estimated = max(10_000, round(estimated / 500) * 500)
        confidence = self._confidence(self._sale_model, features, estimated)
        demand = self._demand(req.city)
        margin = 0.14
        return PriceResponse(
            estimatedPrice=int(estimated),
            confidence=confidence,
            minPrice=int(round(estimated * (1 - margin) / 500) * 500),
            maxPrice=int(round(estimated * (1 + margin) / 500) * 500),
            marketDemand=demand,
            pricePerM2=int(estimated / max(req.surface, 1)),
        )

    # ── Rental prediction ─────────────────────────────────────────────────────

    def predict_rental(self, req: PriceRequest) -> RentalPriceResponse:
        if not self._ready:
            raise RuntimeError("Price service not initialised")

        features = self._build_features(req)
        estimated = float(self._rental_model.predict([features])[0])
        estimated = max(150, round(estimated / 50) * 50)
        confidence = self._confidence(self._rental_model, features, estimated)
        demand = self._demand(req.city)
        margin = 0.18
        return RentalPriceResponse(
            estimatedMonthlyRent=int(estimated),
            confidence=confidence,
            minRent=int(round(estimated * (1 - margin) / 50) * 50),
            maxRent=int(round(estimated * (1 + margin) / 50) * 50),
            marketDemand=demand,
            pricePerM2=int(estimated / max(req.surface, 1)),
        )

    # ── Internals ─────────────────────────────────────────────────────────────

    def _build_features(self, req: PriceRequest) -> list:
        city_enc    = self._safe_encode(self._le_city,    req.city.strip(),           "Tunis")
        country_enc = self._safe_encode(self._le_country, req.country.strip(),        "Tunisia")
        type_enc    = self._safe_encode(self._le_type,    req.type.strip().upper(),   "APPARTEMENT")
        year = req.anneeConstruction if req.anneeConstruction else 2005
        return [
            city_enc, country_enc, type_enc,
            float(req.surface), int(req.bedrooms), int(req.bathrooms),
            int(req.garage), int(req.piscine), int(req.jardin), int(req.meuble),
            int(req.etage), int(req.parkingSpaces), float(year),
            int(req.prochePlage), int(req.procheTransport),
            int(req.securite), int(req.climatisation),
        ]

    def _safe_encode(self, encoder, value: str, fallback: str) -> int:
        classes = list(encoder.classes_)
        if value in classes:
            return int(encoder.transform([value])[0])
        lower_map = {c.lower(): c for c in classes}
        if value.lower() in lower_map:
            return int(encoder.transform([lower_map[value.lower()]])[0])
        if fallback in classes:
            return int(encoder.transform([fallback])[0])
        return 0

    def _confidence(self, model, features: list, mean_pred: float) -> int:
        try:
            estimators = model.estimators_
            sample = min(80, len(estimators))
            preds = np.array([t.predict([features])[0] for t in estimators[:sample]])
            cv = float(np.std(preds)) / max(mean_pred, 1.0)
            return int(np.clip(96 - cv * 170, 45, 96))
        except Exception:
            return 72

    def _demand(self, city: str) -> str:
        c = city.lower().strip()
        if c in HIGH_DEMAND_CITIES: return "HIGH"
        if c in LOW_DEMAND_CITIES:  return "LOW"
        return "MEDIUM"
