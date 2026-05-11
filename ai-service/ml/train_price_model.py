"""
Trains TWO models:
  - price_model_sale.pkl    → predict SALE price
  - price_model_rental.pkl  → predict RENTAL price (monthly)

Run standalone: python -m ml.train_price_model
"""
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

from ml.generate_dataset import build_sale_training_set, build_rental_training_set
from app.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "city_enc", "country_enc", "type_enc",
    "surface", "bedrooms", "bathrooms",
    "garage", "piscine", "jardin", "meuble",
    "etage", "parkingSpaces", "anneeConstruction",
    "prochePlage", "procheTransport", "securite", "climatisation",
]

# Map boolean columns to int so sklearn doesn't complain
BOOL_COLS = ["garage","piscine","jardin","meuble","prochePlage","procheTransport","securite","climatisation"]


def _best_model(X_train, y_train, X_test, y_test, label: str):
    logger.info(f"  Training RandomForest ({label})…")
    rf = RandomForestRegressor(
        n_estimators=300, max_depth=18, min_samples_split=4,
        min_samples_leaf=2, max_features="sqrt", n_jobs=-1, random_state=42)
    rf.fit(X_train, y_train)
    mae_rf = mean_absolute_error(y_test, rf.predict(X_test))
    r2_rf  = r2_score(y_test, rf.predict(X_test))
    logger.info(f"  RF  → MAE={mae_rf:,.0f} | R²={r2_rf:.4f}")

    logger.info(f"  Training GradientBoosting ({label})…")
    gb = GradientBoostingRegressor(
        n_estimators=200, max_depth=6, learning_rate=0.08,
        subsample=0.85, random_state=42)
    gb.fit(X_train, y_train)
    mae_gb = mean_absolute_error(y_test, gb.predict(X_test))
    r2_gb  = r2_score(y_test, gb.predict(X_test))
    logger.info(f"  GB  → MAE={mae_gb:,.0f} | R²={r2_gb:.4f}")

    if r2_rf >= r2_gb:
        logger.info(f"  Winner: RandomForest (R²={r2_rf:.4f})")
        return rf, "RandomForest", mae_rf, r2_rf
    else:
        logger.info(f"  Winner: GradientBoosting (R²={r2_gb:.4f})")
        return gb, "GradientBoosting", mae_gb, r2_gb


def _prepare(df, le_city, le_country, le_type, fit: bool = True):
    import pandas as pd
    df = df.copy()
    if fit:
        df["city_enc"]    = le_city.fit_transform(df["city"].str.strip())
        df["country_enc"] = le_country.fit_transform(df["country"].fillna("Tunisia").str.strip())
        df["type_enc"]    = le_type.fit_transform(df["type"].str.strip().str.upper())
    else:
        df["city_enc"]    = le_city.transform(df["city"].str.strip())
        df["country_enc"] = le_country.transform(df["country"].fillna("Tunisia").str.strip())
        df["type_enc"]    = le_type.transform(df["type"].str.strip().str.upper())

    # Ensure all amenity columns exist
    for col in BOOL_COLS:
        if col not in df.columns:
            df[col] = False
    df[BOOL_COLS] = df[BOOL_COLS].fillna(False).astype(int)

    for col in ["bathrooms","etage","parkingSpaces","anneeConstruction"]:
        if col not in df.columns:
            df[col] = 0
    df["bathrooms"]         = df["bathrooms"].fillna(1).astype(float)
    df["etage"]             = df["etage"].fillna(0).astype(float)
    df["parkingSpaces"]     = df["parkingSpaces"].fillna(0).astype(float)
    df["anneeConstruction"] = df["anneeConstruction"].fillna(2000).astype(float)

    X = df[FEATURE_COLS].values
    y = df["price"].values
    return X, y


def train(save_dir: Path = settings.models_dir) -> dict:
    save_dir.mkdir(parents=True, exist_ok=True)

    # ── Shared encoders ──────────────────────────────────────────────────────
    le_city    = LabelEncoder()
    le_country = LabelEncoder()
    le_type    = LabelEncoder()

    # Build combined city/country/type vocabulary from both datasets
    import pandas as pd
    sale_df   = build_sale_training_set(settings.db_host, settings.db_port,
                                        settings.db_name, settings.db_user, settings.db_password)
    rental_df = build_rental_training_set(settings.db_host, settings.db_port,
                                          settings.db_name, settings.db_user, settings.db_password)
    all_df = pd.concat([sale_df, rental_df], ignore_index=True)

    le_city.fit(all_df["city"].str.strip())
    le_country.fit(all_df["country"].fillna("Tunisia").str.strip())
    le_type.fit(all_df["type"].str.strip().str.upper())

    joblib.dump(le_city,    save_dir / "city_encoder.pkl")
    joblib.dump(le_country, save_dir / "country_encoder.pkl")
    joblib.dump(le_type,    save_dir / "type_encoder.pkl")
    joblib.dump({
        "cities":    list(le_city.classes_),
        "countries": list(le_country.classes_),
        "types":     list(le_type.classes_),
    }, save_dir / "known_classes.pkl")

    results = {}

    # ── Sale model ───────────────────────────────────────────────────────────
    logger.info(f"=== SALE MODEL ({len(sale_df)} samples) ===")
    X_sale, y_sale = _prepare(sale_df, le_city, le_country, le_type, fit=False)
    Xs_tr, Xs_te, ys_tr, ys_te = train_test_split(X_sale, y_sale, test_size=0.2, random_state=42)
    sale_model, sale_name, sale_mae, sale_r2 = _best_model(Xs_tr, ys_tr, Xs_te, ys_te, "SALE")
    joblib.dump(sale_model, save_dir / "price_model_sale.pkl")
    results["sale"] = {"model": sale_name, "mae": sale_mae, "r2": sale_r2}

    # ── Rental model ─────────────────────────────────────────────────────────
    logger.info(f"=== RENTAL MODEL ({len(rental_df)} samples) ===")
    X_rent, y_rent = _prepare(rental_df, le_city, le_country, le_type, fit=False)
    Xr_tr, Xr_te, yr_tr, yr_te = train_test_split(X_rent, y_rent, test_size=0.2, random_state=42)
    rent_model, rent_name, rent_mae, rent_r2 = _best_model(Xr_tr, yr_tr, Xr_te, yr_te, "RENTAL")
    joblib.dump(rent_model, save_dir / "price_model_rental.pkl")
    results["rental"] = {"model": rent_name, "mae": rent_mae, "r2": rent_r2}

    logger.info(f"All models saved to {save_dir}")
    return results


if __name__ == "__main__":
    results = train()
    print(f"\n{'='*60}")
    for kind, m in results.items():
        print(f"{kind.upper():8s} → {m['model']:20s} MAE={m['mae']:>10,.0f} | R²={m['r2']:.4f}")
    print(f"{'='*60}")
