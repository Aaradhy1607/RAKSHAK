"""
RAKSHAK Dataset Quality & Leakage Audit
Performs comprehensive checks for artificial shortcuts, data leakage,
feature separation, and provenance integrity.
"""

import json
import numpy as np
from collections import Counter
from sklearn.tree import DecisionTreeClassifier
from sklearn.model_selection import cross_val_score
from ml.dataset import build_dataset, FEATURE_NAMES

def run_data_audit():
    print("=" * 70)
    print("RAKSHAK DATASET QUALITY & LEAKAGE AUDIT")
    print("=" * 70)

    X, y, feature_names, metadata, groups = build_dataset(target_samples=3600, random_state=42)
    n_total = len(y)
    n_pos = int(np.sum(y == 1))
    n_neg = int(np.sum(y == 0))

    print(f"\nDataset Size: {n_total} (Positives: {n_pos}, Negatives: {n_neg})")

    # ---- 1. Provenance Audit ----
    print("\n--- 1. PROVENANCE AUDIT ---")
    prov_counts = Counter()
    prov_by_class = {"pos": Counter(), "neg": Counter()}
    for i, m in enumerate(metadata):
        p = m.get("provenance", "D")
        prov_counts[p] += 1
        if y[i] == 1:
            prov_by_class["pos"][p] += 1
        else:
            prov_by_class["neg"][p] += 1

    for p_type in ["A", "B", "C", "D"]:
        cnt = prov_counts.get(p_type, 0)
        pct = (cnt / n_total) * 100
        print(f"  Type {p_type}: {cnt} records ({pct:.1f}%)")
    
    print(f"\n  Positive class provenance:")
    for p_type in ["A", "B", "C", "D"]:
        cnt = prov_by_class["pos"].get(p_type, 0)
        pct = (cnt / n_pos) * 100 if n_pos > 0 else 0
        print(f"    Type {p_type}: {cnt} ({pct:.1f}%)")
    
    print(f"  Negative class provenance:")
    for p_type in ["A", "B", "C", "D"]:
        cnt = prov_by_class["neg"].get(p_type, 0)
        pct = (cnt / n_neg) * 100 if n_neg > 0 else 0
        print(f"    Type {p_type}: {cnt} ({pct:.1f}%)")

    real_total = prov_counts.get("A", 0) + prov_counts.get("B", 0)
    print(f"\n  Total Real/Derived (A+B): {real_total} ({(real_total/n_total)*100:.1f}%)")
    print(f"  Total Synthetic (C+D): {n_total - real_total} ({((n_total - real_total)/n_total)*100:.1f}%)")

    # ---- 2. Duplicate Detection ----
    print("\n--- 2. DUPLICATE DETECTION ---")
    unique_rows, counts = np.unique(X, axis=0, return_counts=True)
    n_exact_dupes = n_total - len(unique_rows)
    print(f"  Exact duplicate feature vectors: {n_exact_dupes}")

    # Near-duplicate scan
    X_norm = (X - np.mean(X, axis=0)) / (np.std(X, axis=0) + 1e-8)
    n_near_dupes = 0
    checked_pairs = set()
    for i in range(min(800, n_total)):
        dists = np.linalg.norm(X_norm - X_norm[i], axis=1)
        near = np.where((dists > 0) & (dists < 0.05))[0]
        for j in near:
            pair = (min(i, j), max(i, j))
            if pair not in checked_pairs:
                checked_pairs.add(pair)
                n_near_dupes += 1
    print(f"  Near-duplicate pairs (dist < 0.05): {n_near_dupes}")

    # ---- 3. Feature Distribution Overlap Analysis ----
    print("\n--- 3. FEATURE DISTRIBUTION OVERLAP ANALYSIS ---")
    X_pos = X[y == 1]
    X_neg = X[y == 0]

    print(f"  {'Feature':30s} | {'Pos Mean':>9s} {'Pos Std':>8s} | {'Neg Mean':>9s} {'Neg Std':>8s} | {'Overlap':>8s}")
    print("  " + "-" * 95)

    overlap_issues = []
    for i, fname in enumerate(feature_names):
        pos_m, pos_s = np.mean(X_pos[:, i]), np.std(X_pos[:, i])
        neg_m, neg_s = np.mean(X_neg[:, i]), np.std(X_neg[:, i])

        # Compute overlap coefficient (simple Bhattacharyya-inspired)
        combined_std = max(0.001, (pos_s + neg_s) / 2)
        separation = abs(pos_m - neg_m) / combined_std
        overlap_score = max(0.0, 1.0 - separation / 4.0)  # 0=no overlap, 1=complete overlap

        status = "OK" if overlap_score > 0.2 else "LOW OVERLAP"
        if overlap_score < 0.15:
            overlap_issues.append(fname)
            status = "** SHORTCUT RISK"

        print(f"  {fname:30s} | {pos_m:9.2f} {pos_s:8.2f} | {neg_m:9.2f} {neg_s:8.2f} | {overlap_score:8.3f} {status}")

    if overlap_issues:
        print(f"\n  ** Features with low overlap (potential shortcuts): {overlap_issues}")
    else:
        print(f"\n  [OK] All features have reasonable overlap between classes")

    # ---- 4. Single-Feature Shortcut Detection ----
    print("\n--- 4. SINGLE-FEATURE SHORTCUT DETECTION ---")
    print("  Testing whether any single feature can classify with >85% accuracy:")

    shortcut_found = False
    for i, fname in enumerate(feature_names):
        single_X = X[:, i:i+1]
        dt = DecisionTreeClassifier(max_depth=3, random_state=42)
        scores = cross_val_score(dt, single_X, y, cv=5, scoring="accuracy")
        mean_acc = np.mean(scores) * 100

        flag = ""
        if mean_acc > 85:
            flag = " ** SHORTCUT DETECTED!"
            shortcut_found = True
        elif mean_acc > 75:
            flag = " >> MODERATE"

        if mean_acc > 70 or flag:
            print(f"  {fname:30s} -> Single-feature Accuracy: {mean_acc:.1f}%{flag}")

    if not shortcut_found:
        print("  [OK] No single feature achieves >85% accuracy. Vegetation shortcut is broken.")

    # ---- 5. Vegetation Distribution Analysis ----
    print("\n--- 5. VEGETATION DISTRIBUTION ANALYSIS ---")
    veg_idx = feature_names.index("veg_cover_protection")
    pos_veg = X_pos[:, veg_idx]
    neg_veg = X_neg[:, veg_idx]

    print(f"  Positive class veg_cover: mean={np.mean(pos_veg):.3f}, std={np.std(pos_veg):.3f}, "
          f"min={np.min(pos_veg):.3f}, max={np.max(pos_veg):.3f}")
    print(f"  Negative class veg_cover: mean={np.mean(neg_veg):.3f}, std={np.std(neg_veg):.3f}, "
          f"min={np.min(neg_veg):.3f}, max={np.max(neg_veg):.3f}")

    # Distribution bins
    bins = [(0.0, 0.2), (0.2, 0.4), (0.4, 0.6), (0.6, 0.8), (0.8, 1.0)]
    print(f"\n  Vegetation distribution by class:")
    print(f"  {'Bin':12s} | {'Positive':>10s} | {'Negative':>10s}")
    for lo, hi in bins:
        pos_in = np.sum((pos_veg >= lo) & (pos_veg < hi))
        neg_in = np.sum((neg_veg >= lo) & (neg_veg < hi))
        print(f"  [{lo:.1f}-{hi:.1f})   | {pos_in:>10d} | {neg_in:>10d}")

    # ---- 6. State Distribution ----
    print("\n--- 6. STATE DISTRIBUTION ---")
    state_counts = Counter()
    for m in metadata:
        state_counts[m.get("state", "Unknown")] += 1
    for st, cnt in sorted(state_counts.items(), key=lambda x: -x[1]):
        print(f"  {st}: {cnt}")

    # ---- 7. Generate Audit Report ----
    report = {
        "dataset_size": n_total,
        "positive_samples": n_pos,
        "negative_samples": n_neg,
        "provenance": {k: v for k, v in sorted(prov_counts.items())},
        "real_data_pct": round((real_total / n_total) * 100, 1),
        "exact_duplicates": int(n_exact_dupes),
        "near_duplicates": int(n_near_dupes),
        "shortcut_features": overlap_issues,
        "vegetation_shortcut_broken": not shortcut_found,
        "state_distribution": dict(state_counts),
    }

    with open("ml/data_audit_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"\n[OK] Audit report saved to ml/data_audit_report.json")
    print("=" * 70)
    print("AUDIT COMPLETE")
    print("=" * 70)

    return report

if __name__ == "__main__":
    run_data_audit()
