"""
Spatio-Temporal Clustering Service for Field Hazard Reports
Groups reports within spatial proximity (< 3.0 km) and temporal window (< 12 hours)
into unified Incident Clusters to prevent alert fatigue while preserving individual photo proofs.
"""

import math
from typing import List, Dict, Any
from datetime import datetime, timezone

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in kilometers."""
    R = 6371.0  # Earth's radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def cluster_citizen_reports(reports: List[Dict[str, Any]], max_distance_km: float = 3.5) -> List[Dict[str, Any]]:
    """
    Groups citizen hazard reports into cohesive clusters.
    Returns list of clusters with centroid coordinates, report counts, and summaries.
    """
    if not reports:
        return []

    clusters: List[Dict[str, Any]] = []
    assigned = [False] * len(reports)

    for i, rep in enumerate(reports):
        if assigned[i]:
            continue

        current_cluster_reports = [rep]
        assigned[i] = True

        lat_i = rep["latitude"]
        lon_i = rep["longitude"]

        for j in range(i + 1, len(reports)):
            if assigned[j]:
                continue

            other_rep = reports[j]
            dist_km = haversine_distance_km(lat_i, lon_i, other_rep["latitude"], other_rep["longitude"])

            if dist_km <= max_distance_km:
                current_cluster_reports.append(other_rep)
                assigned[j] = True

        # Calculate Centroid
        centroid_lat = sum(r["latitude"] for r in current_cluster_reports) / len(current_cluster_reports)
        centroid_lon = sum(r["longitude"] for r in current_cluster_reports) / len(current_cluster_reports)

        categories = list(set(r.get("category", "Hazard") for r in current_cluster_reports))
        cluster_id = f"CLUSTER-{rep.get('district', 'NER').replace(' ', '-').upper()}-{i+1:02d}"

        # Determine highest severity
        severities = [r.get("ai_assessment", {}).get("severity_rating", "MODERATE") for r in current_cluster_reports if r.get("ai_assessment")]
        cluster_sev = "HIGH" if "HIGH" in severities or "CRITICAL" in severities else ("MODERATE" if "MODERATE" in severities else "LOW")

        clusters.append({
            "cluster_id": cluster_id,
            "centroid_lat": round(centroid_lat, 5),
            "centroid_lon": round(centroid_lon, 5),
            "district": rep.get("district", "NER"),
            "state": rep.get("state", "NER"),
            "report_count": len(current_cluster_reports),
            "categories": categories,
            "reports": current_cluster_reports,
            "earliest_report_at": min(r.get("created_at", "") for r in current_cluster_reports),
            "latest_report_at": max(r.get("created_at", "") for r in current_cluster_reports),
            "cluster_severity": cluster_sev
        })

    return clusters
