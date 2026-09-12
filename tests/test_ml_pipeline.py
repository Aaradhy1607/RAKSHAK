"""
Unit Tests for Machine Learning Pipeline, Spatial Validation & Explainability Engine
"""

import pytest
import numpy as np
from ml.dataset import build_dataset, transform_soil_moisture_plateau, FEATURE_NAMES
from ml.explainer import RiskExplainer
from ml.benchmark import TwoStagePredictor

def test_soil_moisture_plateau_transformation():
    # Low linear regime
    sm_low = transform_soil_moisture_plateau(40.0)
    assert sm_low == 0.40

    # High saturation regime (>65%)
    sm_saturated = transform_soil_moisture_plateau(80.0)
    assert sm_saturated > 0.65
    assert sm_saturated <= 1.0

def test_dataset_generation_and_spatial_groups():
    X, y, feature_names, metadata, groups = build_dataset()
    assert X.shape[0] >= 1000
    assert X.shape[1] == len(FEATURE_NAMES)
    assert len(y) == X.shape[0]
    assert np.sum(y == 1) == X.shape[0] // 2
    assert np.sum(y == 0) == X.shape[0] // 2
    assert len(groups) == X.shape[0]
    assert len(np.unique(groups)) >= 5 # Spatially distributed across NER states

def test_shap_explainer():
    explainer = RiskExplainer()
    sample_features = {
        "slope_deg": 38.0,
        "aspect_deg": 180.0,
        "elevation_m": 1200.0,
        "curvature": 0.02,
        "rainfall_1h_mm": 18.0,
        "rainfall_6h_mm": 45.0,
        "rainfall_24h_mm": 110.0,
        "rainfall_72h_mm": 210.0,
        "soil_moisture_pct": 78.0,
        "lithology_vulnerability": 0.85,
        "veg_cover_protection": 0.30
    }
    explanation = explainer.explain(sample_features)
    assert "factors" in explanation
    assert len(explanation["factors"]) == len(FEATURE_NAMES)
    assert len(explanation["top_drivers"]) == 4
    assert "Primary contributing factors" in explanation["explanation_text"]
    
    # Total percentage contribution should sum to ~100%
    total_pct = sum(f["contribution_pct"] for f in explanation["factors"])
    assert 98.0 <= total_pct <= 102.0

def test_two_stage_predictor():
    X, y, _, _, _ = build_dataset()
    n_pos = len(X) // 2
    train_idx = np.concatenate([np.arange(0, n_pos // 2), np.arange(n_pos, n_pos + n_pos // 2)])
    test_idx = np.concatenate([np.arange(n_pos // 2, n_pos // 2 + 50), np.arange(n_pos + n_pos // 2, n_pos + n_pos // 2 + 50)])
    
    clf = TwoStagePredictor()
    clf.fit(X[train_idx], y[train_idx])
    preds = clf.predict(X[test_idx])
    probs = clf.predict_proba(X[test_idx])
    assert len(preds) == len(test_idx)
    assert probs.shape == (len(test_idx), 2)
    assert np.all((probs >= 0.0) & (probs <= 1.0))
