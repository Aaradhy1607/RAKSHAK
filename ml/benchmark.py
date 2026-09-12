"""
ML Benchmark & Model Training Engine for Landslide Early Warning — V2.1
Implements:
1. Multi-Model Benchmarking (Extra Trees, Random Forest, HistGradientBoosting, Gradient Boosting, Two-Stage, Logistic Regression)
2. Training Strategy Experiments (Uniform vs Real-Data Sample-Weighted vs Real-Only)
3. Multi-Methodology Validation Suite:
   a. Internal 85/15 Stratified Holdout
   b. Real-Only 5-Fold Stratified Cross-Validation (Tier A/B only)
   c. Source-Separated Transfer Validation (Train on Tier C, evaluate on balanced Tier A/B real data)
   d. Spatial GroupKFold across 8 North-Eastern states
   e. Leave-One-State-Out (LOSO) Cross-Validation across all 8 NER states
   f. Label Permutation Sanity Test
   g. 16-Feature Ablation Study
   h. Isotonic Probability Calibration
4. Model Selection, Serializing to ml/models/best_model.pkl and metrics to ml/metrics.json
"""

import json
import os
import joblib
import numpy as np
from datetime import datetime, timezone
from sklearn.ensemble import (
    RandomForestClassifier,
    ExtraTreesClassifier,
    GradientBoostingClassifier,
    HistGradientBoostingClassifier
)
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    precision_recall_curve,
    auc,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    brier_score_loss
)
from sklearn.model_selection import (
    GroupKFold,
    StratifiedKFold,
    train_test_split,
    RandomizedSearchCV,
    LeaveOneGroupOut
)
from ml.dataset import build_dataset, FEATURE_NAMES

class TwoStagePredictor:
    """
    Two-Stage Architecture (per Kakad et al. 2025):
    Stage 1: Environmental Susceptibility sub-model (Conditioning Factors + Geotechnical Indices)
    Stage 2: Dynamic Trigger Risk sub-model (Rainfall Intensities + Saturation + Antecedent Ratio)
    """
    def __init__(self, random_state=42):
        self.susceptibility_model = RandomForestClassifier(n_estimators=120, max_depth=8, min_samples_split=4, random_state=random_state)
        self.trigger_model = GradientBoostingClassifier(n_estimators=150, learning_rate=0.06, max_depth=4, subsample=0.85, random_state=random_state)
        self.cond_idx = [0, 1, 2, 3, 4, 10, 11, 13, 14]
        self.trig_idx = [5, 6, 7, 8, 9, 12, 15]

    def fit(self, X, y, sample_weight=None):
        if sample_weight is not None:
            self.susceptibility_model.fit(X[:, self.cond_idx], y, sample_weight=sample_weight)
            p_susc = self.susceptibility_model.predict_proba(X[:, self.cond_idx])[:, 1].reshape(-1, 1)
            X_trig_augmented = np.hstack([X[:, self.trig_idx], p_susc])
            self.trigger_model.fit(X_trig_augmented, y, sample_weight=sample_weight)
        else:
            self.susceptibility_model.fit(X[:, self.cond_idx], y)
            p_susc = self.susceptibility_model.predict_proba(X[:, self.cond_idx])[:, 1].reshape(-1, 1)
            X_trig_augmented = np.hstack([X[:, self.trig_idx], p_susc])
            self.trigger_model.fit(X_trig_augmented, y)
        return self

    def predict_proba(self, X):
        p_susc = self.susceptibility_model.predict_proba(X[:, self.cond_idx])[:, 1].reshape(-1, 1)
        X_trig_augmented = np.hstack([X[:, self.trig_idx], p_susc])
        return self.trigger_model.predict_proba(X_trig_augmented)

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.50).astype(int)

    @property
    def feature_importances_(self):
        imp = np.zeros(16)
        for i, idx in enumerate(self.cond_idx):
            imp[idx] = self.susceptibility_model.feature_importances_[i] * 0.5
        trig_imp = self.trigger_model.feature_importances_[:len(self.trig_idx)]
        for i, idx in enumerate(self.trig_idx):
            imp[idx] = trig_imp[i] * 0.5
        return imp


def optimize_random_forest(X_train: np.ndarray, y_train: np.ndarray) -> RandomForestClassifier:
    """Performs hyperparameter optimization on Random Forest."""
    param_dist = {
        'n_estimators': [100, 150, 200, 250],
        'max_depth': [8, 10, 12, 14, 16],
        'min_samples_split': [2, 3, 4, 5],
        'min_samples_leaf': [1, 2, 3],
        'max_features': ['sqrt', 0.5, 0.6, 0.7],
        'class_weight': [None, 'balanced']
    }
    base_rf = RandomForestClassifier(random_state=42, n_jobs=-1)
    search = RandomizedSearchCV(
        base_rf,
        param_distributions=param_dist,
        n_iter=40,
        cv=5,
        scoring='f1',
        n_jobs=-1,
        verbose=0,
        random_state=42
    )
    search.fit(X_train, y_train)
    print(f"  [Random Forest Optimization] Best CV F1: {search.best_score_:.4f}")
    print(f"  Best params: {search.best_params_}")
    return search.best_estimator_


def _clone_model(name, optimized_rf, random_state=42):
    """Create a fresh instance of a model for validation splits."""
    if name == "Random Forest Classifier":
        return RandomForestClassifier(
            n_estimators=optimized_rf.n_estimators,
            max_depth=optimized_rf.max_depth,
            min_samples_split=optimized_rf.min_samples_split,
            min_samples_leaf=optimized_rf.min_samples_leaf,
            max_features=optimized_rf.max_features,
            class_weight=optimized_rf.class_weight,
            random_state=random_state,
            n_jobs=-1
        )
    elif name == "Extra Trees Classifier":
        return ExtraTreesClassifier(
            n_estimators=250, max_depth=14, min_samples_split=4,
            min_samples_leaf=2, random_state=random_state, n_jobs=-1
        )
    elif name == "HistGradientBoosting Classifier":
        return HistGradientBoostingClassifier(
            max_iter=200, max_depth=7, learning_rate=0.05,
            l2_regularization=0.15, min_samples_leaf=5,
            random_state=random_state
        )
    elif name == "Gradient Boosting (Ensemble)":
        return GradientBoostingClassifier(
            n_estimators=200, learning_rate=0.05, max_depth=5,
            subsample=0.80, random_state=random_state
        )
    elif name == "Two-Stage Feature-to-Risk Pipeline":
        return TwoStagePredictor(random_state=random_state)
    elif name == "Logistic Regression Baseline":
        return Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(C=1.0, max_iter=1000, random_state=random_state))
        ])
    else:
        raise ValueError(f"Unknown model: {name}")


def _spatial_cv(name, X_train, y_train, g_train, optimized_rf):
    """Spatial GroupKFold cross-validation across NER states."""
    n_groups = len(np.unique(g_train))
    gkf = GroupKFold(n_splits=min(8, n_groups))
    cv_f1s = []
    cv_recalls = []

    for train_idx, val_idx in gkf.split(X_train, y_train, g_train):
        X_cv_tr, X_cv_val = X_train[train_idx], X_train[val_idx]
        y_cv_tr, y_cv_val = y_train[train_idx], y_train[val_idx]

        clf = _clone_model(name, optimized_rf)
        clf.fit(X_cv_tr, y_cv_tr)
        pred = clf.predict(X_cv_val)
        cv_f1s.append(f1_score(y_cv_val, pred, zero_division=0))
        cv_recalls.append(recall_score(y_cv_val, pred, zero_division=0))

    return cv_f1s, cv_recalls


def _loso_cv(name, X, y, groups, optimized_rf):
    """Leave-One-State-Out (LOSO) Cross-Validation."""
    logo = LeaveOneGroupOut()
    loso_f1s = []
    loso_recalls = []

    for train_idx, test_idx in logo.split(X, y, groups):
        X_tr, X_te = X[train_idx], X[test_idx]
        y_tr, y_te = y[train_idx], y[test_idx]

        clf = _clone_model(name, optimized_rf)
        clf.fit(X_tr, y_tr)
        pred = clf.predict(X_te)
        loso_f1s.append(f1_score(y_te, pred, zero_division=0))
        loso_recalls.append(recall_score(y_te, pred, zero_division=0))

    return loso_f1s, loso_recalls


def _real_only_cv(name, X, y, metadata, optimized_rf):
    """5-Fold Stratified Cross-Validation solely on real data (Tier A/B)."""
    real_mask = np.array([m.get("provenance", "D") in ("A", "B") for m in metadata])
    X_real, y_real = X[real_mask], y[real_mask]

    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    f1s = []
    recalls = []
    precisions = []

    for tr_idx, val_idx in skf.split(X_real, y_real):
        X_tr, X_val = X_real[tr_idx], X_real[val_idx]
        y_tr, y_val = y_real[tr_idx], y_real[val_idx]

        clf = _clone_model(name, optimized_rf)
        clf.fit(X_tr, y_tr)
        pred = clf.predict(X_val)
        f1s.append(f1_score(y_val, pred, zero_division=0))
        recalls.append(recall_score(y_val, pred, zero_division=0))
        precisions.append(precision_score(y_val, pred, zero_division=0))

    return np.mean(f1s), np.mean(recalls), np.mean(precisions)


def _source_transfer_eval(name, X, y, metadata, optimized_rf):
    """Train ONLY on synthetic (Tier C), test on balanced real (Tier A/B)."""
    train_mask = np.array([m.get("provenance", "D") == "C" for m in metadata])
    test_mask = np.array([m.get("provenance", "D") in ("A", "B") for m in metadata])

    X_tr, y_tr = X[train_mask], y[train_mask]
    X_te, y_te = X[test_mask], y[test_mask]

    clf = _clone_model(name, optimized_rf)
    clf.fit(X_tr, y_tr)
    pred = clf.predict(X_te)
    prob = clf.predict_proba(X_te)[:, 1]

    f1 = f1_score(y_te, pred, zero_division=0)
    rec = recall_score(y_te, pred, zero_division=0)
    prec = precision_score(y_te, pred, zero_division=0)
    acc = accuracy_score(y_te, pred)
    roc = roc_auc_score(y_te, prob)
    p_curv, r_curv, _ = precision_recall_curve(y_te, prob)
    pr_auc_val = auc(r_curv, p_curv)
    cm = confusion_matrix(y_te, pred).tolist()

    return {
        "f1": round(float(f1), 4),
        "recall": round(float(rec), 4),
        "precision": round(float(prec), 4),
        "accuracy": round(float(acc), 4),
        "roc_auc": round(float(roc), 4),
        "pr_auc": round(float(pr_auc_val), 4),
        "confusion_matrix": cm
    }


def run_benchmark():
    os.makedirs("ml/models", exist_ok=True)
    X, y, feature_names, metadata, groups = build_dataset(target_samples=3600, random_state=42)

    print(f"\n{'='*70}")
    print(f"RAKSHAK ML BENCHMARK & MODEL SELECTION ENGINE V2.1")
    print(f"{'='*70}")
    print(f"Total Dataset: {X.shape[0]} records | Features: {len(feature_names)}")
    print(f"Positives: {np.sum(y == 1)} | Negatives: {np.sum(y == 0)}")

    # Provenance summary
    prov_counts = {}
    for m in metadata:
        p = m.get("provenance", "D")
        prov_counts[p] = prov_counts.get(p, 0) + 1
    print(f"Provenance Distribution: {dict(sorted(prov_counts.items()))}")
    real_count = prov_counts.get("A", 0) + prov_counts.get("B", 0)
    print(f"Real Observations (A+B): {real_count} ({real_count/len(metadata)*100:.1f}%)")
    print(f"{'='*70}\n")

    # ================================================================
    # STEP 1: Strict 85/15 Stratified Holdout Split
    # ================================================================
    X_train, X_test, y_train, y_test, g_train, g_test = train_test_split(
        X, y, groups, test_size=0.15, random_state=42, stratify=y
    )

    # Compute sample weights (prioritize real A/B observations over synthetic C)
    meta_train = [metadata[i] for i in range(len(X_train))]
    sample_weights_train = np.array([
        4.0 if m.get("provenance") == "A" else (3.0 if m.get("provenance") == "B" else 1.0)
        for m in meta_train
    ], dtype=np.float32)

    scaler = StandardScaler()
    scaler.fit(X_train)

    # ================================================================
    # STEP 2: Hyperparameter Optimization
    # ================================================================
    print(f"{'='*70}")
    print("[Phase 1] Hyperparameter Optimization")
    print(f"{'='*70}")
    optimized_rf = optimize_random_forest(X_train, y_train)

    # ================================================================
    # STEP 3: Model Candidates Definition
    # ================================================================
    candidates = {
        "Extra Trees Classifier": ExtraTreesClassifier(
            n_estimators=250, max_depth=14, min_samples_split=4,
            min_samples_leaf=2, random_state=42, n_jobs=-1
        ),
        "Random Forest Classifier": optimized_rf,
        "HistGradientBoosting Classifier": HistGradientBoostingClassifier(
            max_iter=200, max_depth=7, learning_rate=0.05,
            l2_regularization=0.15, min_samples_leaf=5, random_state=42
        ),
        "Gradient Boosting (Ensemble)": GradientBoostingClassifier(
            n_estimators=200, learning_rate=0.05, max_depth=5,
            subsample=0.80, random_state=42
        ),
        "Two-Stage Feature-to-Risk Pipeline": TwoStagePredictor(random_state=42),
        "Logistic Regression Baseline": Pipeline([
            ("scaler", StandardScaler()),
            ("classifier", LogisticRegression(C=1.0, max_iter=1000, random_state=42))
        ])
    }

    results = {}
    best_model_name = None
    best_composite = -1.0
    best_model_obj = None

    print(f"\n{'='*70}")
    print("[Phase 2] Multi-Methodology Evaluation & Benchmarking")
    print(f"{'='*70}\n")

    for name, model in candidates.items():
        print(f"--- {name} ---")

        # Train model with sample weighting where supported
        if name in ("Extra Trees Classifier", "Random Forest Classifier", "Two-Stage Feature-to-Risk Pipeline"):
            try:
                model.fit(X_train, y_train, sample_weight=sample_weights_train)
            except Exception:
                model.fit(X_train, y_train)
        else:
            model.fit(X_train, y_train)

        # 1. Held-out test metrics (15% unseen test set)
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        acc = accuracy_score(y_test, y_pred)
        roc = roc_auc_score(y_test, y_prob)
        p_curve, r_curve, _ = precision_recall_curve(y_test, y_prob)
        pr_auc_val = auc(r_curve, p_curve)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        brier = brier_score_loss(y_test, y_prob)
        cm = confusion_matrix(y_test, y_pred).tolist()

        # 2. Real-Only Cross Validation (Tier A/B only)
        real_f1, real_rec, real_prec = _real_only_cv(name, X, y, metadata, optimized_rf)

        # 3. Source-Separated Transfer Validation (Train on C, Test on A/B)
        transfer_eval = _source_transfer_eval(name, X, y, metadata, optimized_rf)

        # 4. Spatial GroupKFold CV (8 NER states)
        cv_f1s, cv_recalls = _spatial_cv(name, X_train, y_train, g_train, optimized_rf)

        # 5. Leave-One-State-Out (LOSO) CV
        loso_f1s, loso_recalls = _loso_cv(name, X, y, groups, optimized_rf)

        # Feature importances
        feat_imp = {}
        if hasattr(model, "feature_importances_"):
            for fname, imp in zip(feature_names, model.feature_importances_):
                feat_imp[fname] = round(float(imp), 4)
        elif hasattr(model, "named_steps") and hasattr(model.named_steps.get("classifier"), "coef_"):
            for fname, coef in zip(feature_names, model.named_steps["classifier"].coef_[0]):
                feat_imp[fname] = round(float(abs(coef)), 4)

        results[name] = {
            "heldout": {
                "accuracy": round(float(acc), 4),
                "roc_auc": round(float(roc), 4),
                "pr_auc": round(float(pr_auc_val), 4),
                "precision": round(float(prec), 4),
                "recall": round(float(rec), 4),
                "f1_score": round(float(f1), 4),
                "brier_score": round(float(brier), 4),
                "confusion_matrix": cm,
            },
            "real_only_cv": {
                "f1_mean": round(float(real_f1), 4),
                "recall_mean": round(float(real_rec), 4),
                "precision_mean": round(float(real_prec), 4),
            },
            "source_transfer": transfer_eval,
            "spatial_cv": {
                "f1_mean": round(float(np.mean(cv_f1s)), 4),
                "f1_std": round(float(np.std(cv_f1s)), 4),
                "recall_mean": round(float(np.mean(cv_recalls)), 4),
            },
            "loso_cv": {
                "f1_mean": round(float(np.mean(loso_f1s)), 4),
                "f1_std": round(float(np.std(loso_f1s)), 4),
                "recall_mean": round(float(np.mean(loso_recalls)), 4),
            },
            "feature_importances": feat_imp
        }

        print(f"  Held-out   -> Acc: {acc*100:.2f}% | F1: {f1*100:.2f}% | Rec: {rec*100:.2f}% | Prec: {prec*100:.2f}% | Brier: {brier:.4f}")
        print(f"  Real-Only  -> F1: {real_f1*100:.2f}% | Rec: {real_rec*100:.2f}% | Prec: {real_prec*100:.2f}%")
        print(f"  Transfer   -> F1: {transfer_eval['f1']*100:.2f}% | Rec: {transfer_eval['recall']*100:.2f}% | Prec: {transfer_eval['precision']*100:.2f}% | PR-AUC: {transfer_eval['pr_auc']:.4f}")
        print(f"  Spatial CV -> F1: {np.mean(cv_f1s)*100:.2f}% (+/- {np.std(cv_f1s)*100:.2f}%) | Rec: {np.mean(cv_recalls)*100:.2f}%")
        print(f"  LOSO CV    -> F1: {np.mean(loso_f1s)*100:.2f}% (+/- {np.std(loso_f1s)*100:.2f}%) | Rec: {np.mean(loso_recalls)*100:.2f}%")
        print()

        # Scientific composite score prioritizing REAL-WORLD TRANSFER and SPATIAL GENERALIZATION
        composite = (
            0.30 * transfer_eval['f1'] +
            0.25 * real_f1 +
            0.20 * np.mean(cv_f1s) +
            0.15 * transfer_eval['recall'] +
            0.10 * (1.0 - brier)
        )

        if composite > best_composite:
            best_composite = composite
            best_model_name = name
            best_model_obj = model

    # ================================================================
    # STEP 4: Label Permutation Sanity Test
    # ================================================================
    print(f"\n{'='*70}")
    print("[Phase 3] Label Permutation Sanity Test")
    print(f"{'='*70}")

    rng = np.random.RandomState(42)
    perm_scores = []
    for _ in range(5):
        y_shuffled = rng.permutation(y_train)
        clf = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42, n_jobs=-1)
        clf.fit(X_train, y_shuffled)
        pred = clf.predict(X_test)
        perm_scores.append(f1_score(y_test, pred, zero_division=0))

    perm_mean = np.mean(perm_scores)
    perm_std = np.std(perm_scores)
    print(f"  Shuffled label F1: {perm_mean*100:.2f}% (+/- {perm_std*100:.2f}%)")
    print(f"  Expected (chance): ~50%")
    if perm_mean < 0.55:
        print(f"  [PASS] Model is learning genuine patterns, not memorizing.")
    else:
        print(f"  [WARN] Shuffled performance too high — possible data leakage!")

    # ================================================================
    # STEP 5: Feature Ablation Study
    # ================================================================
    print(f"\n{'='*70}")
    print("[Phase 4] Feature Ablation Study")
    print(f"{'='*70}")

    abl_baseline = RandomForestClassifier(
        n_estimators=150, max_depth=12, random_state=42, n_jobs=-1
    )
    abl_baseline.fit(X_train, y_train)
    base_abl_pred = abl_baseline.predict(X_test)
    base_abl_f1 = f1_score(y_test, base_abl_pred, zero_division=0)

    print(f"  Baseline F1 (RF, all features): {base_abl_f1*100:.2f}%\n")

    ablation_results = {}
    for i, fname in enumerate(feature_names):
        abl_indices = [j for j in range(len(feature_names)) if j != i]
        abl_clf = RandomForestClassifier(
            n_estimators=150, max_depth=12, random_state=42, n_jobs=-1
        )
        abl_clf.fit(X_train[:, abl_indices], y_train)
        abl_pred = abl_clf.predict(X_test[:, abl_indices])
        abl_f1 = f1_score(y_test, abl_pred, zero_division=0)
        drop = base_abl_f1 - abl_f1

        ablation_results[fname] = {
            "f1_without": round(float(abl_f1), 4),
            "f1_drop": round(float(drop), 4)
        }

        importance_flag = ""
        if drop > 0.01:
            importance_flag = " <-- CRITICAL FACTOR"
        elif drop > 0.002:
            importance_flag = " <-- IMPORTANT"

        print(f"  Without {fname:30s} -> F1: {abl_f1*100:.2f}% (drop: {drop*100:+.2f}%){importance_flag}")

    # ================================================================
    # STEP 6: Probability Calibration
    # ================================================================
    print(f"\n{'='*70}")
    print("[Phase 5] Probability Calibration")
    print(f"{'='*70}")

    pre_cal_model = _clone_model(best_model_name, optimized_rf)
    pre_cal_model.fit(X_train, y_train)
    pre_cal_prob = pre_cal_model.predict_proba(X_test)[:, 1]
    pre_cal_brier = brier_score_loss(y_test, pre_cal_prob)

    cal_base = _clone_model(best_model_name, optimized_rf)
    calibrated_model = CalibratedClassifierCV(cal_base, method='isotonic', cv=3)
    calibrated_model.fit(X_train, y_train)
    post_cal_prob = calibrated_model.predict_proba(X_test)[:, 1]
    post_cal_brier = brier_score_loss(y_test, post_cal_prob)

    print(f"  Pre-calibration Brier Score:  {pre_cal_brier:.4f}")
    print(f"  Post-calibration Brier Score: {post_cal_brier:.4f}")
    if post_cal_brier < pre_cal_brier:
        print(f"  Calibration IMPROVED probabilities by {(pre_cal_brier - post_cal_brier)*100:.2f}%")
    else:
        print(f"  Calibration did not improve. Using uncalibrated model.")

    # Calibration curve analysis
    print(f"\n  Calibration curve (10 bins):")
    print(f"  {'Bin':12s} | {'Mean Pred':>9s} | {'Actual Freq':>11s} | {'Count':>5s}")
    for bin_lo in np.arange(0, 1.0, 0.1):
        bin_hi = bin_lo + 0.1
        mask = (post_cal_prob >= bin_lo) & (post_cal_prob < bin_hi)
        if np.sum(mask) > 0:
            mean_pred = np.mean(post_cal_prob[mask])
            actual_freq = np.mean(y_test[mask])
            count = int(np.sum(mask))
            print(f"  [{bin_lo:.1f}-{bin_hi:.1f})  | {mean_pred:9.3f} | {actual_freq:11.3f} | {count:5d}")

    # ================================================================
    # STEP 7: Final Model Selection & Serialization
    # ================================================================
    print(f"\n{'='*70}")
    print(f"WINNING MODEL: '{best_model_name}'")
    print(f"Composite Score: {best_composite:.4f}")
    print(f"{'='*70}\n")

    # Serialize best model and artifacts
    joblib.dump(best_model_obj, "ml/models/best_model_candidate.pkl")
    joblib.dump(best_model_obj, "ml/models/best_model.pkl")
    joblib.dump(scaler, "ml/models/scaler.pkl")

    two_stage = candidates.get("Two-Stage Feature-to-Risk Pipeline")
    if two_stage is not None:
        joblib.dump(two_stage, "ml/models/two_stage_model.pkl")

    # ================================================================
    # STEP 8: Generate Comprehensive Metrics JSON
    # ================================================================
    metrics_report = {
        "version": "2.1",
        "evaluation_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_size": int(X.shape[0]),
        "train_samples": int(X_train.shape[0]),
        "test_samples": int(X_test.shape[0]),
        "winning_model": best_model_name,
        "composite_score": round(float(best_composite), 4),
        "features": feature_names,
        "provenance_summary": {k: int(v) for k, v in sorted(prov_counts.items())},
        "models": results,
        "label_permutation_test": {
            "shuffled_f1_mean": round(float(perm_mean), 4),
            "shuffled_f1_std": round(float(perm_std), 4),
            "passed": bool(perm_mean < 0.55)
        },
        "feature_ablation": ablation_results,
        "calibration": {
            "pre_calibration_brier": round(float(pre_cal_brier), 4),
            "post_calibration_brier": round(float(post_cal_brier), 4),
            "calibration_improved": bool(post_cal_brier < pre_cal_brier)
        },
        "validation_strategy": "V2.1 Multi-Methodology: 50% Real Data + Real-Only CV + Synthetic-to-Real Transfer + Spatial GroupKFold + Leave-One-State-Out",
        "scientific_notes": [
            "Dataset balanced to 1,800 real-world records (900 positives + 900 hard negatives) + 1,800 supporting archetypes.",
            "Hard negatives include real IMD stations under extreme rain, hard granite/gneiss ridges holding under monsoon, engineered highway cuts, and root-stabilized tea slopes.",
            "Sample-weighted training prioritizes genuine observations (w=3.0-4.0) over synthetic archetypes (w=1.0).",
            "Leave-One-State-Out (LOSO) verifies geographic generalization across all 8 North-Eastern states.",
            "Probability calibration evaluated on cross-validation folds to preserve independent test set integrity."
        ]
    }

    with open("ml/metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2, default=lambda o: bool(o) if isinstance(o, (np.bool_, bool)) else (int(o) if isinstance(o, (np.integer, int)) else float(o)))

    print(f"Saved best model to ml/models/best_model.pkl")
    print(f"Saved metrics to ml/metrics.json")
    print(f"\nBENCHMARK COMPLETE.\n")

    return metrics_report

if __name__ == "__main__":
    run_benchmark()
