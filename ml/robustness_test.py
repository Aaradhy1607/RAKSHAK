"""
RAKSHAK Robustness & External Validation Suite
Tests:
1. Gaussian noise injection (5%, 10%, 20%)
2. Missing feature simulation (zero-out each feature)
3. Boundary condition edge cases
4. False negative/positive analysis
5. External holdout (train on C/D only, test on A/B only)
"""

import json
import numpy as np
import joblib
from collections import Counter
from sklearn.metrics import (
    accuracy_score, f1_score, recall_score, precision_score,
    confusion_matrix
)
from sklearn.model_selection import train_test_split
from ml.dataset import build_dataset, FEATURE_NAMES

def run_robustness_test():
    print("=" * 70)
    print("RAKSHAK ROBUSTNESS & EXTERNAL VALIDATION SUITE")
    print("=" * 70)

    X, y, feature_names, metadata, groups = build_dataset(target_samples=3600, random_state=42)

    # Load trained model
    try:
        model = joblib.load("ml/models/best_model.pkl")
        model_name = type(model).__name__
    except Exception as e:
        print(f"ERROR: Could not load model: {e}")
        return

    print(f"\nModel: {model_name}")
    print(f"Dataset: {X.shape[0]} records, {X.shape[1]} features")

    # Recreate the same train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )

    # Baseline performance
    y_pred_base = model.predict(X_test)
    base_f1 = f1_score(y_test, y_pred_base)
    base_recall = recall_score(y_test, y_pred_base)
    base_acc = accuracy_score(y_test, y_pred_base)

    print(f"\nBaseline Performance:")
    print(f"  F1: {base_f1*100:.2f}% | Recall: {base_recall*100:.2f}% | Accuracy: {base_acc*100:.2f}%")

    report = {
        "model": model_name,
        "baseline": {
            "f1": round(float(base_f1), 4),
            "recall": round(float(base_recall), 4),
            "accuracy": round(float(base_acc), 4),
        }
    }

    # ---- 1. Gaussian Noise Injection ----
    print(f"\n--- 1. GAUSSIAN NOISE INJECTION ---")
    noise_results = {}
    for noise_pct in [5, 10, 20]:
        noise_level = noise_pct / 100.0
        feature_stds = np.std(X_test, axis=0)
        noise = np.random.RandomState(42).randn(*X_test.shape) * feature_stds * noise_level
        X_noisy = X_test + noise
        X_noisy = np.clip(X_noisy, 0, None)  # Features should be non-negative

        y_noisy_pred = model.predict(X_noisy)
        noisy_f1 = f1_score(y_test, y_noisy_pred)
        noisy_recall = recall_score(y_test, y_noisy_pred)
        f1_drop = base_f1 - noisy_f1

        stability = "STABLE" if f1_drop < 0.03 else ("MODERATE" if f1_drop < 0.08 else "FRAGILE")

        print(f"  Noise {noise_pct}%: F1={noisy_f1*100:.2f}% (drop: {f1_drop*100:+.2f}%) | Recall={noisy_recall*100:.2f}% -> {stability}")
        noise_results[f"{noise_pct}pct"] = {
            "f1": round(float(noisy_f1), 4),
            "recall": round(float(noisy_recall), 4),
            "f1_drop": round(float(f1_drop), 4),
            "stability": stability
        }

    report["noise_injection"] = noise_results

    # ---- 2. Missing Feature Simulation ----
    print(f"\n--- 2. MISSING FEATURE SIMULATION ---")
    print(f"  (Zeroing out each feature one at a time)")
    missing_results = {}
    for i, fname in enumerate(feature_names):
        X_missing = X_test.copy()
        X_missing[:, i] = 0.0

        y_missing_pred = model.predict(X_missing)
        miss_f1 = f1_score(y_test, y_missing_pred)
        f1_drop = base_f1 - miss_f1

        flag = ""
        if f1_drop > 0.05:
            flag = " <- CRITICAL DEPENDENCY"
        elif f1_drop > 0.02:
            flag = " <- Important"

        missing_results[fname] = {
            "f1_without": round(float(miss_f1), 4),
            "f1_drop": round(float(f1_drop), 4)
        }

        if f1_drop > 0.01 or f1_drop < -0.01:
            print(f"  Zero {fname:30s} -> F1: {miss_f1*100:.2f}% (drop: {f1_drop*100:+.2f}%){flag}")

    report["missing_feature"] = missing_results

    # ---- 3. Boundary Condition Testing ----
    print(f"\n--- 3. BOUNDARY CONDITION EDGE CASES ---")
    boundary_cases = [
        {
            "name": "Dry Cliff (steep, no rain)",
            "features": [55.0, 0.5, 0.5, 2000, 0.05, 0, 0, 0, 0, 0.1, 0.3, 0.2, 0, 0.14, 0.24, 0],
            "expected": 0
        },
        {
            "name": "Flat Monsoon (gentle, extreme rain)",
            "features": [3.0, 0.0, 1.0, 50, -0.02, 50, 120, 250, 550, 0.9, 0.4, 0.3, 2.2, 0.047, 0.28, 0.2],
            "expected": 0
        },
        {
            "name": "Fragile Road Cut (steep shale, moderate rain)",
            "features": [48.0, 0.7, 0.7, 800, 0.06, 30, 65, 100, 220, 0.82, 0.85, 0.15, 2.2, 0.91, 0.72, 0.3],
            "expected": 1
        },
        {
            "name": "Forested Gneiss Ridge (steep, hard rock, dense canopy)",
            "features": [45.0, -0.5, 0.5, 1500, -0.03, 8, 25, 80, 180, 0.68, 0.20, 0.90, 2.25, 0.68, 0.02, 0.1],
            "expected": 0
        },
        {
            "name": "Extreme Saturation Failure (dense forest, extreme rain on weak rock)",
            "features": [40.0, 0.3, 0.8, 1200, 0.04, 45, 100, 200, 450, 0.95, 0.80, 0.65, 2.25, 0.80, 0.28, 0.22],
            "expected": 1
        },
        {
            "name": "Tea Garden Stable Slope",
            "features": [22.0, 0.0, 1.0, 600, 0.01, 5, 15, 50, 110, 0.55, 0.45, 0.65, 2.2, 0.22, 0.16, 0.1],
            "expected": 0
        },
    ]

    boundary_results = []
    correct = 0
    for case in boundary_cases:
        X_bc = np.array([case["features"]], dtype=np.float32)
        pred = model.predict(X_bc)[0]
        prob = model.predict_proba(X_bc)[0, 1]
        match = bool(pred == case["expected"])
        if match:
            correct += 1
        status = "CORRECT" if match else "WRONG"

        print(f"  {case['name']:50s} -> Pred: {pred} (prob: {prob:.3f}) Expected: {case['expected']} [{status}]")
        boundary_results.append({
            "name": case["name"],
            "predicted": int(pred),
            "probability": round(float(prob), 4),
            "expected": int(case["expected"]),
            "correct": bool(match)
        })

    print(f"\n  Boundary score: {correct}/{len(boundary_cases)} correct")
    report["boundary_tests"] = {
        "results": boundary_results,
        "score": f"{correct}/{len(boundary_cases)}"
    }

    # ---- 4. False Negative/Positive Analysis ----
    print(f"\n--- 4. ERROR ANALYSIS ---")
    cm = confusion_matrix(y_test, y_pred_base)
    tn, fp, fn, tp = cm.ravel()
    print(f"  Confusion Matrix:")
    print(f"    TN={tn} FP={fp}")
    print(f"    FN={fn} TP={tp}")

    # Analyze false negatives
    fn_mask = (y_test == 1) & (y_pred_base == 0)
    fp_mask = (y_test == 0) & (y_pred_base == 1)

    if np.sum(fn_mask) > 0:
        print(f"\n  False Negatives ({np.sum(fn_mask)} missed landslides):")
        fn_features = X_test[fn_mask]
        for j, fname in enumerate(feature_names):
            vals = fn_features[:, j]
            if len(vals) > 0:
                if fname in ["slope_deg", "rainfall_24h_mm", "rainfall_72h_mm", "soil_moisture_effective", "veg_cover_protection"]:
                    print(f"    {fname:30s}: mean={np.mean(vals):.2f}, range=[{np.min(vals):.2f}, {np.max(vals):.2f}]")
    else:
        print(f"\n  [OK] Zero false negatives on held-out test set!")

    if np.sum(fp_mask) > 0:
        print(f"\n  False Positives ({np.sum(fp_mask)} false alarms):")
        fp_features = X_test[fp_mask]
        for j, fname in enumerate(feature_names):
            vals = fp_features[:, j]
            if len(vals) > 0:
                if fname in ["slope_deg", "rainfall_24h_mm", "rainfall_72h_mm", "soil_moisture_effective", "veg_cover_protection"]:
                    print(f"    {fname:30s}: mean={np.mean(vals):.2f}, range=[{np.min(vals):.2f}, {np.max(vals):.2f}]")
    else:
        print(f"\n  [OK] Zero false positives on held-out test set!")

    report["error_analysis"] = {
        "true_negatives": int(tn),
        "false_positives": int(fp),
        "false_negatives": int(fn),
        "true_positives": int(tp)
    }

    # ---- 5. External Holdout (Train on C/D, Test on A/B) ----
    print(f"\n--- 5. EXTERNAL HOLDOUT (Synthetic -> Real) ---")

    train_mask = np.array([m.get("provenance", "D") in ("C", "D") for m in metadata])
    test_mask = np.array([m.get("provenance", "D") in ("A", "B") for m in metadata])

    n_real = np.sum(test_mask)
    n_synth = np.sum(train_mask)

    if n_real >= 10:
        X_ext_tr, y_ext_tr = X[train_mask], y[train_mask]
        X_ext_te, y_ext_te = X[test_mask], y[test_mask]

        from sklearn.ensemble import ExtraTreesClassifier
        ext_clf = ExtraTreesClassifier(n_estimators=250, max_depth=14, min_samples_split=4, min_samples_leaf=2, random_state=42, n_jobs=-1)
        ext_clf.fit(X_ext_tr, y_ext_tr)
        ext_pred = ext_clf.predict(X_ext_te)
        ext_prob = ext_clf.predict_proba(X_ext_te)[:, 1]

        ext_f1 = f1_score(y_ext_te, ext_pred, zero_division=0)
        ext_recall = recall_score(y_ext_te, ext_pred, zero_division=0)
        ext_prec = precision_score(y_ext_te, ext_pred, zero_division=0)
        ext_acc = accuracy_score(y_ext_te, ext_pred)
        ext_cm = confusion_matrix(y_ext_te, ext_pred).tolist()

        print(f"  Train: {n_synth} synthetic (C/D) | Test: {n_real} real (A/B)")
        print(f"  Real test class distribution: pos={np.sum(y_ext_te==1)}, neg={np.sum(y_ext_te==0)}")
        print(f"  F1: {ext_f1*100:.2f}% | Recall: {ext_recall*100:.2f}% | Precision: {ext_prec*100:.2f}% | Accuracy: {ext_acc*100:.2f}%")
        print(f"  Confusion matrix: {ext_cm}")

        report["external_holdout"] = {
            "train_size": int(n_synth),
            "test_size": int(n_real),
            "f1": round(float(ext_f1), 4),
            "recall": round(float(ext_recall), 4),
            "precision": round(float(ext_prec), 4),
            "accuracy": round(float(ext_acc), 4),
            "confusion_matrix": ext_cm
        }
    else:
        print(f"  Insufficient real data ({n_real} records). Skipping.")
        report["external_holdout"] = {"skipped": True, "reason": f"Only {n_real} real records"}

    # ---- Save Report ----
    with open("ml/robustness_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, default=lambda o: bool(o) if isinstance(o, (np.bool_, bool)) else (int(o) if isinstance(o, (np.integer, int)) else float(o)))

    print(f"\n{'='*70}")
    print("ROBUSTNESS TEST COMPLETE")
    print(f"Report saved to ml/robustness_report.json")
    print(f"{'='*70}")

    return report

if __name__ == "__main__":
    run_robustness_test()
