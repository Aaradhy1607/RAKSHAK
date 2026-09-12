"""
ML Dataset Builder for Landslide Susceptibility and Trigger Modeling in NER.
Constructs balanced, scientifically grounded training/testing datasets across all 8 North Eastern Region (NER) states:
1. Historical GSI Landslide Inventory and realistic failure modes across 8 NER states (Positive samples)
2. Defensible Negative sampling across NER terrain including challenging geotechnical edge-cases
3. Conditioning Factors: Slope, Aspect (cos/sin), Elevation, Curvature, Lithology hardness, Land Cover
4. Triggering Factors: 1h, 6h, 24h, 72h Antecedent Rainfall, Soil Moisture Saturation (with plateau handling)
5. Engineered Interaction Indices:
   - Antecedent Rainfall Ratio (72h / 24h)
   - Slope-Wetness Index (tan(slope) * effective_sm)
   - Geotechnical Vulnerability Index (lithology * (1 - veg_cover))
   - Rainfall Burst Ratio (1h / 24h)
6. Spatial grouping tags (state_groups) for spatial holdout validation.
"""

import json
import math
import numpy as np
import os
import random
from typing import Tuple, List, Dict, Any

FEATURE_NAMES = [
    "slope_deg",               # #1 Conditioning Factor (Loke et al. 2026)
    "aspect_cos",              # Slope direction cosine (North-South polarity)
    "aspect_sin",              # Slope direction sine (East-West polarity)
    "elevation_m",             # Elevation above MSL
    "curvature",               # Profile curvature (convergent/divergent flow)
    "rainfall_1h_mm",          # Short-duration burst intensity
    "rainfall_6h_mm",          # Intermediate saturation trigger
    "rainfall_24h_mm",         # Daily precipitation trigger
    "rainfall_72h_mm",         # Antecedent rainfall index (ARI)
    "soil_moisture_effective", # Corrected soil moisture handling ~70% saturation plateau
    "lithology_vulnerability", # Rock strength index (0.1 hard gneiss to 0.9 soft shale)
    "veg_cover_protection",    # Forest cover root cohesion (0.1 bare/excavated to 0.9 dense forest)
    "antecedent_rainfall_ratio", # 72h to 24h ratio (prolonged monsoon saturation vs flash burst)
    "slope_wetness_index",     # Shear stress proxy: tan(slope) * effective_sm
    "geotech_vulnerability",   # Lithology vulnerability weighted by lack of root cohesion
    "rainfall_burst_ratio"     # 1h to 24h cloudburst intensity ratio
]

LITHOLOGY_MAP = {
    "Disang Shale": 0.85,
    "Tertiary Mudstone": 0.80,
    "Daling Series Phyllite": 0.75,
    "Surma Group Siltstone": 0.65,
    "Barail Group Sandstone": 0.50,
    "Barail Sandstone": 0.50,
    "Tipam Sandstone": 0.45,
    "Precambrian Gneiss": 0.20,
    "Gneiss": 0.20,
    "Alluvium": 0.40
}

LANDCOVER_MAP = {
    "Highway Cut Slope": 0.15,
    "Roadside Cut Slope": 0.15,
    "Urban Slump": 0.25,
    "Settlement Edge": 0.30,
    "Shifting Cultivation (Jhum)": 0.35,
    "Jhum Agriculture Land": 0.35,
    "Degraded Forest": 0.55,
    "Steep Tea Garden Escarpment": 0.60,
    "Dense Forest": 0.90
}

def transform_soil_moisture_plateau(raw_sm_pct: float) -> float:
    """
    Per Sharma & Laskar (IJAPE 2025):
    Soil moisture sensor readings plateau around 65-70% of saturation capacity.
    This function computes an effective saturation index taking into account non-linear pore water pressure.
    """
    if raw_sm_pct <= 0:
        return 0.0
    if raw_sm_pct < 65.0:
        return float(raw_sm_pct / 100.0)
    else:
        excess = raw_sm_pct - 65.0
        escalated = 0.65 + (0.35 * (1.0 - math.exp(-excess / 8.0)))
        return float(min(1.0, escalated))

def compute_engineered_features(
    slope: float,
    r1: float,
    r24: float,
    r72: float,
    eff_sm: float,
    lith_val: float,
    veg_val: float
) -> Tuple[float, float, float, float]:
    """Computes the 4 physical geotechnical and hydrological interaction features."""
    ari_ratio = round(float(r72 / (r24 + 1.0)), 3)
    rad_slope = math.radians(max(0.5, min(89.0, slope)))
    swi = round(float(math.tan(rad_slope) * eff_sm), 3)
    geotech_vuln = round(float(lith_val * (1.0 - veg_val)), 3)
    burst_ratio = round(float(r1 / (r24 + 1.0)), 3)
    return ari_ratio, swi, geotech_vuln, burst_ratio

def build_dataset(
    inventory_path="data/historical_landslides.json",
    target_samples=3200,
    random_state=42
) -> Tuple[np.ndarray, np.ndarray, List[str], List[Dict[str, Any]], np.ndarray]:
    random.seed(random_state)
    np.random.seed(random_state)

    positive_records = []
    if os.path.exists(inventory_path):
        with open(inventory_path, "r", encoding="utf-8") as f:
            positive_records = json.load(f)

    # Load district geographic registry
    districts = []
    if os.path.exists("geo/ner_district_list.json"):
        with open("geo/ner_district_list.json", "r", encoding="utf-8") as f:
            districts = json.load(f)
    if not districts:
        districts = [
            {"name": "Guwahati", "state": "Assam", "elev": 55, "base_slope": 12},
            {"name": "Dima Hasao", "state": "Assam", "elev": 680, "base_slope": 36},
            {"name": "Noney", "state": "Manipur", "elev": 640, "base_slope": 44},
            {"name": "Gangtok", "state": "Sikkim", "elev": 1650, "base_slope": 38},
            {"name": "Aizawl", "state": "Mizoram", "elev": 1132, "base_slope": 42},
            {"name": "Kohima", "state": "Nagaland", "elev": 1444, "base_slope": 35},
            {"name": "East Khasi Hills", "state": "Meghalaya", "elev": 1500, "base_slope": 34},
            {"name": "Papum Pare", "state": "Arunachal Pradesh", "elev": 320, "base_slope": 28}
        ]

    state_to_group = {
        "Assam": 0, "Arunachal Pradesh": 1, "Manipur": 2, "Meghalaya": 3,
        "Mizoram": 4, "Nagaland": 5, "Sikkim": 6, "Tripura": 7
    }

    n_target_pos = target_samples // 2
    n_target_neg = target_samples // 2

    X_list = []
    y_list = []
    groups_list = []
    metadata = []

    # 1. Process Positive Historical Landslides & Geotechnical Failure Modes
    pos_count = 0
    # First add all historical base records
    for rec in positive_records:
        slope = float(rec["slope_deg"])
        aspect = float(rec["aspect_deg"])
        elev = float(rec["elevation_m"])
        curv = float(rec["curvature"])
        r24 = float(rec["rainfall_24h_mm"])
        r72 = float(rec["rainfall_72h_mm"])
        r1 = round(r24 * random.uniform(0.08, 0.25), 1)
        r6 = round(r24 * random.uniform(0.35, 0.65), 1)
        raw_sm = float(rec["soil_moisture_pct"])
        eff_sm = transform_soil_moisture_plateau(raw_sm)
        lith_val = LITHOLOGY_MAP.get(rec.get("lithology", ""), 0.65)
        veg_val = LANDCOVER_MAP.get(rec.get("land_cover", ""), 0.45)

        aspect_rad = math.radians(aspect)
        aspect_cos = round(float(math.cos(aspect_rad)), 3)
        aspect_sin = round(float(math.sin(aspect_rad)), 3)

        ari_r, swi, gv, br = compute_engineered_features(slope, r1, r24, r72, eff_sm, lith_val, veg_val)

        feat = [
            slope, aspect_cos, aspect_sin, elev, curv,
            r1, r6, r24, r72, eff_sm, lith_val, veg_val,
            ari_r, swi, gv, br
        ]
        X_list.append(feat)
        y_list.append(1)
        st = rec.get("state", "Assam")
        groups_list.append(state_to_group.get(st, 0))
        metadata.append({"id": rec["id"], "state": st, "district": rec["district"], "label": 1, "type": "HISTORICAL_EVENT"})
        pos_count += 1

    # Augment realistic positive landslide events across all 8 states to reach n_target_pos
    failure_archetypes = [
        "cloudburst_steep_shale",     # Short intense burst on steep shale slope
        "prolonged_monsoon_saturation",# Multi-day rainfall on saturated slope
        "excavated_road_cut_failure", # Road cut / highway slope with compromised root cohesion
        "deforested_jhum_hillslope",  # Shifting cultivation slope under continuous rain
        "high_alpine_debris_flow"     # High elevation Sikkim/Arunachal debris flow
    ]

    while pos_count < n_target_pos:
        d = random.choice(districts)
        arch = random.choice(failure_archetypes)
        st = d.get("state", "Assam")
        base_e = float(d.get("elev", 800))
        base_s = float(d.get("base_slope", 32))

        if arch == "cloudburst_steep_shale":
            slope = round(random.uniform(34.0, 52.0), 1)
            elev = round(max(200.0, base_e + random.uniform(-150, 250)), 0)
            r24 = round(random.uniform(90.0, 220.0), 1)
            r1 = round(r24 * random.uniform(0.30, 0.55), 1)
            r6 = round(r24 * random.uniform(0.65, 0.88), 1)
            r72 = round(r24 * random.uniform(1.2, 1.8), 1)
            raw_sm = round(random.uniform(68.0, 84.0), 1)
            lith_val = random.choice([0.75, 0.80, 0.85])
            veg_val = round(random.uniform(0.15, 0.45), 2)
            curv = round(random.uniform(0.01, 0.08), 3)
        elif arch == "prolonged_monsoon_saturation":
            slope = round(random.uniform(24.0, 40.0), 1)
            elev = round(max(150.0, base_e + random.uniform(-100, 300)), 0)
            r24 = round(random.uniform(70.0, 150.0), 1)
            r72 = round(r24 * random.uniform(2.5, 4.2), 1)
            r1 = round(r24 * random.uniform(0.08, 0.18), 1)
            r6 = round(r24 * random.uniform(0.30, 0.50), 1)
            raw_sm = round(random.uniform(76.0, 88.0), 1)
            lith_val = random.choice([0.65, 0.75, 0.80])
            veg_val = round(random.uniform(0.30, 0.60), 2)
            curv = round(random.uniform(-0.04, 0.04), 3)
        elif arch == "excavated_road_cut_failure":
            slope = round(random.uniform(38.0, 56.0), 1)
            elev = round(max(300.0, base_e + random.uniform(-50, 150)), 0)
            r24 = round(random.uniform(55.0, 130.0), 1)
            r72 = round(r24 * random.uniform(1.5, 2.5), 1)
            r1 = round(r24 * random.uniform(0.15, 0.35), 1)
            r6 = round(r24 * random.uniform(0.40, 0.70), 1)
            raw_sm = round(random.uniform(64.0, 80.0), 1)
            lith_val = random.choice([0.50, 0.65, 0.80])
            veg_val = round(random.uniform(0.10, 0.25), 2) # Cut slope bare
            curv = round(random.uniform(0.02, 0.09), 3)
        elif arch == "deforested_jhum_hillslope":
            slope = round(random.uniform(28.0, 44.0), 1)
            elev = round(max(400.0, base_e + random.uniform(-100, 200)), 0)
            r24 = round(random.uniform(80.0, 170.0), 1)
            r72 = round(r24 * random.uniform(1.8, 3.0), 1)
            r1 = round(r24 * random.uniform(0.10, 0.25), 1)
            r6 = round(r24 * random.uniform(0.35, 0.60), 1)
            raw_sm = round(random.uniform(72.0, 85.0), 1)
            lith_val = random.choice([0.65, 0.75, 0.85])
            veg_val = round(random.uniform(0.20, 0.40), 2) # Jhum land
            curv = round(random.uniform(-0.03, 0.05), 3)
        else: # high_alpine_debris_flow
            slope = round(random.uniform(42.0, 62.0), 1)
            elev = round(random.uniform(1600.0, 3200.0), 0)
            r24 = round(random.uniform(60.0, 140.0), 1)
            r72 = round(r24 * random.uniform(1.4, 2.4), 1)
            r1 = round(r24 * random.uniform(0.20, 0.40), 1)
            r6 = round(r24 * random.uniform(0.45, 0.75), 1)
            raw_sm = round(random.uniform(66.0, 82.0), 1)
            lith_val = random.choice([0.50, 0.75, 0.80])
            veg_val = round(random.uniform(0.15, 0.45), 2)
            curv = round(random.uniform(0.03, 0.10), 3)

        aspect = random.uniform(0, 360)
        aspect_rad = math.radians(aspect)
        aspect_cos = round(float(math.cos(aspect_rad)), 3)
        aspect_sin = round(float(math.sin(aspect_rad)), 3)
        eff_sm = transform_soil_moisture_plateau(raw_sm)

        ari_r, swi, gv, br = compute_engineered_features(slope, r1, r24, r72, eff_sm, lith_val, veg_val)

        feat = [
            slope, aspect_cos, aspect_sin, elev, curv,
            r1, r6, r24, r72, eff_sm, lith_val, veg_val,
            ari_r, swi, gv, br
        ]
        X_list.append(feat)
        y_list.append(1)
        groups_list.append(state_to_group.get(st, 0))
        metadata.append({"id": f"GSI-NER-POS-{pos_count+1:04d}", "state": st, "district": d["name"], "label": 1, "type": arch})
        pos_count += 1

    # 2. Defensible Negative Samples (Non-landslide / Stable conditions across diverse NER terrain)
    # Includes critical geotechnical hard-negatives to prevent trivial separability
    neg_archetypes = [
        "heavy_rain_gentle_valley",   # HARD NEGATIVE: Extreme rain on flat/gentle plain without failure
        "steep_hard_gneiss_canopy",   # HARD NEGATIVE: Steep slope with strong rock and dense forest withstanding rain
        "moderate_monsoon_convex",    # Moderate rain on well-drained convex slopes
        "dry_steep_ridge",            # Steep terrain in dry season
        "stabilized_road_drainage",   # Engineered road segment with good drainage
        "tea_estate_terraced_slope"   # Terraced, root-stabilized agricultural slope
    ]

    for i in range(n_target_neg):
        d = random.choice(districts)
        arch = random.choice(neg_archetypes)
        st = d.get("state", "Assam")
        base_e = float(d.get("elev", 800))

        if arch == "heavy_rain_gentle_valley":
            # Very heavy monsoon rain, but slope is too gentle to fail (Factor of Safety >> 2.0)
            slope = round(random.uniform(2.0, 14.0), 1)
            elev = round(max(30.0, random.uniform(40.0, 600.0)), 0)
            r24 = round(random.uniform(120.0, 280.0), 1)
            r72 = round(r24 * random.uniform(1.8, 3.2), 1)
            r1 = round(r24 * random.uniform(0.15, 0.35), 1)
            r6 = round(r24 * random.uniform(0.40, 0.65), 1)
            raw_sm = round(random.uniform(75.0, 85.0), 1)
            lith_val = random.choice([0.40, 0.50, 0.65])
            veg_val = round(random.uniform(0.60, 0.90), 2)
            curv = round(random.uniform(-0.05, 0.02), 3)
        elif arch == "steep_hard_gneiss_canopy":
            # Steep slope withstanding significant rain due to high rock cohesion and dense root matrix
            slope = round(random.uniform(32.0, 46.0), 1)
            elev = round(max(400.0, base_e + random.uniform(0, 400)), 0)
            r24 = round(random.uniform(70.0, 140.0), 1)
            r72 = round(r24 * random.uniform(1.4, 2.2), 1)
            r1 = round(r24 * random.uniform(0.06, 0.18), 1)
            r6 = round(r24 * random.uniform(0.25, 0.45), 1)
            raw_sm = round(random.uniform(62.0, 74.0), 1)
            lith_val = 0.20 # Precambrian Gneiss / hard rock
            veg_val = round(random.uniform(0.85, 0.95), 2) # Climax dense forest
            curv = round(random.uniform(-0.06, 0.01), 3)
        elif arch == "moderate_monsoon_convex":
            slope = round(random.uniform(15.0, 28.0), 1)
            elev = round(max(200.0, base_e + random.uniform(-100, 200)), 0)
            r24 = round(random.uniform(30.0, 75.0), 1)
            r72 = round(r24 * random.uniform(1.3, 2.0), 1)
            r1 = round(r24 * random.uniform(0.05, 0.15), 1)
            r6 = round(r24 * random.uniform(0.25, 0.45), 1)
            raw_sm = round(random.uniform(45.0, 64.0), 1)
            lith_val = random.choice([0.45, 0.50, 0.65])
            veg_val = round(random.uniform(0.60, 0.85), 2)
            curv = round(random.uniform(-0.06, -0.01), 3) # Convex water-divergent
        elif arch == "dry_steep_ridge":
            slope = round(random.uniform(30.0, 50.0), 1)
            elev = round(max(800.0, base_e + random.uniform(200, 800)), 0)
            r24 = round(random.uniform(0.0, 15.0), 1)
            r72 = round(r24 * random.uniform(1.0, 1.8), 1)
            r1 = round(r24 * random.uniform(0.0, 0.2), 1)
            r6 = round(r24 * random.uniform(0.1, 0.5), 1)
            raw_sm = round(random.uniform(18.0, 42.0), 1)
            lith_val = random.choice([0.20, 0.50, 0.75])
            veg_val = round(random.uniform(0.40, 0.85), 2)
            curv = round(random.uniform(-0.04, 0.04), 3)
        elif arch == "stabilized_road_drainage":
            slope = round(random.uniform(22.0, 36.0), 1)
            elev = round(max(300.0, base_e + random.uniform(-50, 150)), 0)
            r24 = round(random.uniform(40.0, 95.0), 1)
            r72 = round(r24 * random.uniform(1.4, 2.2), 1)
            r1 = round(r24 * random.uniform(0.08, 0.20), 1)
            r6 = round(r24 * random.uniform(0.25, 0.50), 1)
            raw_sm = round(random.uniform(50.0, 68.0), 1)
            lith_val = random.choice([0.40, 0.50, 0.65])
            veg_val = round(random.uniform(0.65, 0.85), 2)
            curv = round(random.uniform(-0.03, 0.02), 3)
        else: # tea_estate_terraced_slope
            slope = round(random.uniform(18.0, 32.0), 1)
            elev = round(max(100.0, base_e + random.uniform(-100, 100)), 0)
            r24 = round(random.uniform(50.0, 110.0), 1)
            r72 = round(r24 * random.uniform(1.5, 2.5), 1)
            r1 = round(r24 * random.uniform(0.06, 0.16), 1)
            r6 = round(r24 * random.uniform(0.30, 0.50), 1)
            raw_sm = round(random.uniform(55.0, 70.0), 1)
            lith_val = 0.45
            veg_val = round(random.uniform(0.70, 0.85), 2)
            curv = round(random.uniform(-0.02, 0.03), 3)

        aspect = random.uniform(0, 360)
        aspect_rad = math.radians(aspect)
        aspect_cos = round(float(math.cos(aspect_rad)), 3)
        aspect_sin = round(float(math.sin(aspect_rad)), 3)
        eff_sm = transform_soil_moisture_plateau(raw_sm)

        ari_r, swi, gv, br = compute_engineered_features(slope, r1, r24, r72, eff_sm, lith_val, veg_val)

        feat = [
            slope, aspect_cos, aspect_sin, elev, curv,
            r1, r6, r24, r72, eff_sm, lith_val, veg_val,
            ari_r, swi, gv, br
        ]
        X_list.append(feat)
        y_list.append(0)
        groups_list.append(state_to_group.get(st, 0))
        metadata.append({"id": f"GSI-NER-NEG-{i+1:04d}", "state": st, "district": d["name"], "label": 0, "type": arch})

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.int32)
    groups = np.array(groups_list, dtype=np.int32)

    return X, y, FEATURE_NAMES, metadata, groups
