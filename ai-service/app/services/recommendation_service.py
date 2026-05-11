"""
Content-based property recommendation using cosine similarity.
Works without user behaviour data — pure property-feature matching.
"""
import logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder, MinMaxScaler
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Optional

from app.config import settings
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse, RecommendedProperty

logger = logging.getLogger(__name__)

# Importance weights for similarity calculation
FEATURE_WEIGHTS = {
    "city_enc":  3.0,
    "type_enc":  2.5,
    "price_norm": 1.5,
    "surface_norm": 1.0,
    "bedrooms_norm": 0.8,
}


class RecommendationService:
    def __init__(self):
        self._df: Optional[pd.DataFrame] = None
        self._feature_matrix: Optional[np.ndarray] = None
        self._le_city = LabelEncoder()
        self._le_type = LabelEncoder()
        self._scaler = MinMaxScaler()
        self._ready = False

    def initialize(self) -> None:
        try:
            df = self._load_properties()
            if df is None or len(df) < 5:
                logger.warning("Not enough property data for recommendations — using synthetic")
                from ml.generate_dataset import generate_synthetic_dataset
                raw = generate_synthetic_dataset(400)
                df = pd.DataFrame({
                    "id":       range(1, len(raw) + 1),
                    "titre":    raw.apply(lambda r: f"{r['type'].capitalize()} {r['surface']}m² — {r['city']}", axis=1),
                    "type":     raw["type"],
                    "city":     raw["city"],
                    "surface":  raw["surface"],
                    "bedrooms": raw["bedrooms"],
                    "price":    raw["price"],
                    "imageUrl": None,
                })

            df["city_enc"]  = self._le_city.fit_transform(df["city"].str.strip())
            df["type_enc"]  = self._le_type.fit_transform(df["type"].str.strip().str.upper())

            numeric_cols = ["price", "surface", "bedrooms"]
            df[["price_norm", "surface_norm", "bedrooms_norm"]] = self._scaler.fit_transform(
                df[numeric_cols].fillna(0)
            )

            raw_features = df[list(FEATURE_WEIGHTS.keys())].values
            weights = np.array(list(FEATURE_WEIGHTS.values()))
            self._feature_matrix = raw_features * weights

            self._df = df.reset_index(drop=True)
            self._ready = True
            logger.info(f"Recommendation engine ready — {len(df)} properties indexed")
        except Exception as e:
            logger.error(f"RecommendationService init failed: {e}")

    def is_ready(self) -> bool:
        return self._ready

    def recommend(self, req: RecommendationRequest) -> RecommendationResponse:
        if not self._ready:
            raise RuntimeError("Recommendation engine not initialised")

        query_vec, based_on = self._build_query_vector(req)
        scores = cosine_similarity([query_vec], self._feature_matrix)[0]

        # Exclude the source property itself
        if req.propertyId is not None:
            mask = self._df["id"] == req.propertyId
            scores[mask.values] = -1.0

        top_indices = np.argsort(scores)[::-1][: req.limit]

        results: List[RecommendedProperty] = []
        for idx in top_indices:
            if scores[idx] <= 0:
                continue
            row = self._df.iloc[idx]
            reasons = self._build_match_reasons(req, row)
            results.append(RecommendedProperty(
                id=int(row["id"]),
                titre=str(row["titre"]),
                type=str(row["type"]),
                city=str(row["city"]),
                surface=float(row["surface"]),
                bedrooms=int(row["bedrooms"]),
                price=float(row["price"]),
                imageUrl=row.get("imageUrl"),
                similarityScore=round(float(scores[idx]), 4),
                matchReasons=reasons,
            ))

        return RecommendationResponse(
            recommendations=results,
            basedOn=based_on,
            totalFound=len(results),
        )

    def reload_properties(self) -> None:
        """Call this after new properties are added to refresh the index."""
        self._ready = False
        self.initialize()

    # ──────────────────────────────────────────────────────────────────────────

    def _load_properties(self) -> Optional[pd.DataFrame]:
        try:
            import mysql.connector
            conn = mysql.connector.connect(
                host=settings.db_host, port=settings.db_port,
                database=settings.db_name, user=settings.db_user,
                password=settings.db_password, connection_timeout=5
            )
            query = """
                SELECT p.id, p.titre, p.type, p.city,
                       p.surface, p.nb_chambres AS bedrooms,
                       COALESCE(p.prix_vente, p.prix_location) AS price,
                       CONCAT('http://localhost:8080/api/images/public/', p.main_image_id) AS imageUrl
                FROM properties p
                WHERE p.is_active = 1
                  AND p.statut = 'DISPONIBLE'
                  AND p.surface IS NOT NULL
                  AND COALESCE(p.prix_vente, p.prix_location) > 0
            """
            df = pd.read_sql(query, conn)
            conn.close()
            df["bedrooms"] = df["bedrooms"].fillna(0).astype(int)
            df["price"]    = df["price"].fillna(0).astype(float)
            return df if len(df) >= 5 else None
        except Exception as e:
            logger.warning(f"Could not load properties from MySQL: {e}")
            return None

    def _build_query_vector(self, req: RecommendationRequest):
        # If propertyId given, use that property as the query
        if req.propertyId is not None and self._df is not None:
            mask = self._df["id"] == req.propertyId
            if mask.any():
                idx = self._df[mask].index[0]
                vec = self._feature_matrix[idx].copy()
                row = self._df.iloc[idx]
                return vec, f"Basé sur le bien #{req.propertyId} ({row['titre']})"

        # Otherwise build vector from preferences
        city_enc = 0
        type_enc = 0
        price_norm = 0.5
        surface_norm = 0.5
        bedrooms_norm = 0.5

        based_on_parts = []
        if req.city:
            try:
                city_enc = int(self._le_city.transform([req.city.strip()])[0])
                based_on_parts.append(req.city)
            except Exception:
                pass
        if req.type:
            try:
                type_enc = int(self._le_type.transform([req.type.strip().upper()])[0])
                based_on_parts.append(req.type)
            except Exception:
                pass
        if req.maxPrice:
            price_norm = float(np.clip(req.maxPrice / 1_000_000, 0, 1))
        if req.surface:
            surface_norm = float(np.clip(req.surface / 600, 0, 1))
        if req.bedrooms is not None:
            bedrooms_norm = float(np.clip(req.bedrooms / 10, 0, 1))

        raw = np.array([city_enc, type_enc, price_norm, surface_norm, bedrooms_norm])
        weights = np.array(list(FEATURE_WEIGHTS.values()))
        vec = raw * weights
        based_on = "Vos préférences (" + ", ".join(based_on_parts) + ")" if based_on_parts else "Critères généraux"
        return vec, based_on

    def _build_match_reasons(self, req: RecommendationRequest, row: pd.Series) -> List[str]:
        reasons = []
        if req.city and str(row["city"]).lower() == req.city.lower():
            reasons.append(f"Même ville ({req.city})")
        if req.type and str(row["type"]).upper() == req.type.upper():
            reasons.append(f"Même type ({req.type})")
        if req.surface and abs(float(row["surface"]) - req.surface) <= req.surface * 0.2:
            reasons.append("Surface similaire")
        if req.maxPrice and float(row["price"]) <= req.maxPrice:
            reasons.append("Dans votre budget")
        if req.bedrooms is not None and int(row["bedrooms"]) == req.bedrooms:
            reasons.append(f"{req.bedrooms} chambres")
        if not reasons:
            reasons.append("Bien similaire")
        return reasons
