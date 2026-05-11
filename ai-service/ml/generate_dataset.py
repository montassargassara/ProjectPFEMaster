"""
Generates realistic synthetic real estate datasets for Tunisia.
Separate generators for SALE and RENTAL properties with all amenity features.
Also tries to load real data from MySQL to augment training.
"""
import numpy as np
import pandas as pd
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# ────────────────────────────────────────────────────────────────────────────
# CONFIG
# ────────────────────────────────────────────────────────────────────────────

CITIES_CONFIG = [
    {"name": "Tunis",         "sale_per_m2": 2800, "rent_per_m2": 14,  "weight": 0.17},
    {"name": "La Marsa",      "sale_per_m2": 3500, "rent_per_m2": 17,  "weight": 0.06},
    {"name": "Carthage",      "sale_per_m2": 3800, "rent_per_m2": 19,  "weight": 0.04},
    {"name": "Sidi Bou Said", "sale_per_m2": 4500, "rent_per_m2": 22,  "weight": 0.03},
    {"name": "Gammarth",      "sale_per_m2": 3200, "rent_per_m2": 16,  "weight": 0.03},
    {"name": "Ariana",        "sale_per_m2": 2200, "rent_per_m2": 11,  "weight": 0.07},
    {"name": "Ben Arous",     "sale_per_m2": 1900, "rent_per_m2": 9,   "weight": 0.05},
    {"name": "Manouba",       "sale_per_m2": 1650, "rent_per_m2": 8,   "weight": 0.04},
    {"name": "Sousse",        "sale_per_m2": 2200, "rent_per_m2": 11,  "weight": 0.08},
    {"name": "Monastir",      "sale_per_m2": 1900, "rent_per_m2": 9,   "weight": 0.05},
    {"name": "Hammamet",      "sale_per_m2": 2500, "rent_per_m2": 13,  "weight": 0.05},
    {"name": "Nabeul",        "sale_per_m2": 1750, "rent_per_m2": 8,   "weight": 0.04},
    {"name": "Bizerte",       "sale_per_m2": 1600, "rent_per_m2": 8,   "weight": 0.04},
    {"name": "Sfax",          "sale_per_m2": 1700, "rent_per_m2": 8,   "weight": 0.09},
    {"name": "Gabes",         "sale_per_m2": 1100, "rent_per_m2": 5,   "weight": 0.03},
    {"name": "Gafsa",         "sale_per_m2": 900,  "rent_per_m2": 4,   "weight": 0.02},
    {"name": "Kairouan",      "sale_per_m2": 1150, "rent_per_m2": 5,   "weight": 0.03},
    {"name": "Mahdia",        "sale_per_m2": 1500, "rent_per_m2": 7,   "weight": 0.03},
    {"name": "Djerba",        "sale_per_m2": 2100, "rent_per_m2": 11,  "weight": 0.03},
    {"name": "Medenine",      "sale_per_m2": 950,  "rent_per_m2": 4,   "weight": 0.02},
]

BEACH_CITIES = {"la marsa", "carthage", "sidi bou said", "hammamet", "nabeul",
                "monastir", "mahdia", "djerba", "sfax", "gabes", "bizerte", "sousse"}

TYPES_CONFIG = [
    {"name": "APPARTEMENT", "sale_mult": 1.00, "rent_mult": 1.00, "surface": (55, 200),  "w": 0.38, "bf": 35},
    {"name": "VILLA",       "sale_mult": 1.65, "rent_mult": 1.60, "surface": (150, 600), "w": 0.18, "bf": 50},
    {"name": "MAISON",      "sale_mult": 1.20, "rent_mult": 1.15, "surface": (80, 350),  "w": 0.15, "bf": 45},
    {"name": "STUDIO",      "sale_mult": 0.78, "rent_mult": 0.80, "surface": (25, 65),   "w": 0.12, "bf": None},
    {"name": "COMMERCIAL",  "sale_mult": 0.85, "rent_mult": 0.70, "surface": (25, 400),  "w": 0.08, "bf": None},
    {"name": "LOFT",        "sale_mult": 1.30, "rent_mult": 1.25, "surface": (60, 250),  "w": 0.05, "bf": 60},
    {"name": "TERRAIN",     "sale_mult": 0.28, "rent_mult": 0.10, "surface": (100, 3000),"w": 0.04, "bf": None},
]


# ────────────────────────────────────────────────────────────────────────────
# HELPERS
# ────────────────────────────────────────────────────────────────────────────

def _bool(p: float) -> bool:
    return bool(np.random.random() < p)


def _amenity_bonus(row: dict, is_rental: bool) -> float:
    """Returns a multiplier bonus based on premium amenities."""
    bonus = 0.0
    if row["piscine"]:      bonus += 0.12
    if row["garage"]:       bonus += 0.05
    if row["jardin"]:       bonus += 0.06
    if row["climatisation"]:bonus += 0.04
    if row["securite"]:     bonus += 0.03
    if row["meuble"] and is_rental: bonus += 0.20   # furnished adds a LOT to rent
    if row["prochePlage"]:  bonus += 0.08
    if row["procheTransport"]: bonus += 0.03
    if row["parkingSpaces"] and row["parkingSpaces"] > 0: bonus += 0.03 * row["parkingSpaces"]
    if row["nbSallesDeBain"] and row["nbSallesDeBain"] > 1: bonus += 0.03
    return bonus


def _build_row(city_cfg: dict, type_cfg: dict, is_rental: bool, rng=None) -> dict:
    if rng is None:
        rng = np.random

    s_min, s_max = type_cfg["surface"]
    surface = round(rng.uniform(s_min, s_max), 1)

    bf = type_cfg["bf"]
    if bf is None:
        bedrooms = 0
        bathrooms = 1
    else:
        bedrooms = max(1, int(surface / bf) + rng.randint(-1, 2))
        bedrooms = min(bedrooms, 10)
        bathrooms = max(1, bedrooms - 1 + rng.randint(0, 2))

    ptype = type_cfg["name"]
    city_name = city_cfg["name"]
    city_lower = city_name.lower()
    is_beach_city = city_lower in BEACH_CITIES
    is_villa = ptype in ("VILLA", "MAISON")
    is_apt = ptype in ("APPARTEMENT", "STUDIO", "LOFT")

    row = {
        "city":           city_name,
        "country":        "Tunisia",
        "type":           ptype,
        "surface":        surface,
        "bedrooms":       bedrooms,
        "bathrooms":      bathrooms,
        "garage":         _bool(0.5 if is_villa else 0.2),
        "piscine":        _bool(0.6 if is_villa else 0.1),
        "jardin":         _bool(0.7 if is_villa else 0.15),
        "meuble":         _bool(0.3 if is_rental else 0.15),
        "etage":          rng.randint(0, 10) if is_apt else 0,
        "parkingSpaces":  int(rng.choice([0, 1, 2, 3], p=[0.2, 0.5, 0.2, 0.1])),
        "anneeConstruction": int(rng.randint(1980, 2025)),
        "prochePlage":    _bool(0.8 if is_beach_city else 0.05),
        "procheTransport": _bool(0.7 if city_lower in {"tunis","ariana","sousse"} else 0.4),
        "securite":       _bool(0.6 if is_villa else 0.3),
        "climatisation":  _bool(0.7),
        "nbSallesDeBain": bathrooms,
    }

    bonus = _amenity_bonus(row, is_rental)
    noise = rng.normal(1.0, 0.13)

    if is_rental:
        base = city_cfg["rent_per_m2"] * type_cfg["rent_mult"] * surface
        price = max(200, round(base * (1 + bonus) * noise / 50) * 50)
    else:
        base = city_cfg["sale_per_m2"] * type_cfg["sale_mult"] * surface
        price = max(15000, round(base * (1 + bonus) * noise / 500) * 500)

    row["price"] = float(price)
    return row


# ────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ────────────────────────────────────────────────────────────────────────────

def generate_sale_dataset(n: int = 1500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.RandomState(seed)
    city_names   = [c["name"]   for c in CITIES_CONFIG]
    city_weights = np.array([c["weight"] for c in CITIES_CONFIG]); city_weights /= city_weights.sum()
    type_names   = [t["name"]   for t in TYPES_CONFIG]
    type_weights = np.array([t["w"]   for t in TYPES_CONFIG]); type_weights /= type_weights.sum()
    city_map = {c["name"]: c for c in CITIES_CONFIG}
    type_map = {t["name"]: t for t in TYPES_CONFIG}

    rows = []
    for _ in range(n):
        city  = rng.choice(city_names, p=city_weights)
        ptype = rng.choice(type_names, p=type_weights)
        rows.append(_build_row(city_map[city], type_map[ptype], is_rental=False, rng=rng))
    return pd.DataFrame(rows)


def generate_rental_dataset(n: int = 1200, seed: int = 77) -> pd.DataFrame:
    rng = np.random.RandomState(seed)
    city_names   = [c["name"]   for c in CITIES_CONFIG]
    city_weights = np.array([c["weight"] for c in CITIES_CONFIG]); city_weights /= city_weights.sum()
    # Rentals: exclude TERRAIN + favour APPARTEMENT/STUDIO
    type_configs = [t for t in TYPES_CONFIG if t["name"] != "TERRAIN"]
    type_names   = [t["name"] for t in type_configs]
    type_weights = np.array([t["w"] for t in type_configs]); type_weights /= type_weights.sum()
    city_map = {c["name"]: c for c in CITIES_CONFIG}
    type_map = {t["name"]: t for t in type_configs}

    rows = []
    for _ in range(n):
        city  = rng.choice(city_names, p=city_weights)
        ptype = rng.choice(type_names, p=type_weights)
        rows.append(_build_row(city_map[city], type_map[ptype], is_rental=True, rng=rng))
    return pd.DataFrame(rows)


def load_from_mysql(db_host, db_port, db_name, db_user, db_password,
                    is_rental: bool = False) -> Optional[pd.DataFrame]:
    try:
        import mysql.connector
        conn = mysql.connector.connect(
            host=db_host, port=db_port, database=db_name,
            user=db_user, password=db_password, connection_timeout=5
        )
        price_col   = "prix_location AS price" if is_rental else "prix_vente AS price"
        price_cond  = "prix_location IS NOT NULL AND prix_location > 0" if is_rental \
                      else "prix_vente IS NOT NULL AND prix_vente > 0"
        query = f"""
            SELECT city, country, type, surface,
                   nb_chambres AS bedrooms,
                   COALESCE(nb_salles_de_bain, 1) AS bathrooms,
                   COALESCE(garage,0) AS garage,
                   COALESCE(piscine,0) AS piscine,
                   COALESCE(jardin,0) AS jardin,
                   COALESCE(meuble,0) AS meuble,
                   COALESCE(etage,0) AS etage,
                   COALESCE(parking_spaces,0) AS parkingSpaces,
                   COALESCE(annee_construction,2000) AS anneeConstruction,
                   COALESCE(proche_plage,0) AS prochePlage,
                   COALESCE(proche_transport,0) AS procheTransport,
                   COALESCE(securite,0) AS securite,
                   COALESCE(climatisation,0) AS climatisation,
                   {price_col}
            FROM properties
            WHERE is_active = 1
              AND statut = 'DISPONIBLE'
              AND {price_cond}
              AND surface IS NOT NULL AND surface > 0
              AND city IS NOT NULL AND type IS NOT NULL
        """
        df = pd.read_sql(query, conn)
        conn.close()
        df = df.dropna(subset=["city", "type", "surface", "price"])
        df["bedrooms"] = df["bedrooms"].fillna(0).astype(int)
        df["country"]  = df["country"].fillna("Tunisia")
        for bool_col in ["garage","piscine","jardin","meuble","prochePlage","procheTransport","securite","climatisation"]:
            df[bool_col] = df[bool_col].fillna(0).astype(bool)
        logger.info(f"Loaded {len(df)} real {'rental' if is_rental else 'sale'} properties from MySQL")
        return df if len(df) >= 10 else None
    except Exception as e:
        logger.warning(f"Could not load MySQL data: {e}")
        return None


def build_sale_training_set(db_host="localhost", db_port=3306, db_name="immobilierdttb",
                             db_user="root", db_password="") -> pd.DataFrame:
    synthetic = generate_sale_dataset(1500)
    real = load_from_mysql(db_host, db_port, db_name, db_user, db_password, is_rental=False)
    if real is not None and len(real) > 0:
        combined = pd.concat([synthetic, pd.concat([real]*3, ignore_index=True)], ignore_index=True)
        logger.info(f"Sale training: {len(combined)} samples ({len(real)} real × 3 + {len(synthetic)} synthetic)")
        return combined
    return synthetic


def build_rental_training_set(db_host="localhost", db_port=3306, db_name="immobilierdttb",
                               db_user="root", db_password="") -> pd.DataFrame:
    synthetic = generate_rental_dataset(1200)
    real = load_from_mysql(db_host, db_port, db_name, db_user, db_password, is_rental=True)
    if real is not None and len(real) > 0:
        combined = pd.concat([synthetic, pd.concat([real]*3, ignore_index=True)], ignore_index=True)
        logger.info(f"Rental training: {len(combined)} samples ({len(real)} real × 3 + {len(synthetic)} synthetic)")
        return combined
    return synthetic
