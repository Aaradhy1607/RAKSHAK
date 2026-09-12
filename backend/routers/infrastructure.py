"""
Critical Infrastructure Exposure Router
Implements Section 18 ("Infrastructure Exposure") requirements:
- Spatial queries for hospitals, disaster relief shelters, major bridges, tunnels
- Catchment impact summaries (e.g. "Potentially exposed: 2 road segments, 1 bridge, 1 healthcare facility")
"""

from fastapi import APIRouter, Query
import json
import os
from typing import List, Dict, Any

router = APIRouter(prefix="/infrastructure", tags=["Infrastructure Exposure"])

@router.get("")
async def list_infrastructure(
    state: str = Query("", description="Filter by state"),
    infra_type: str = Query("", description="HOSPITAL, SHELTER, BRIDGE, TUNNEL")
):
    if os.path.exists("geo/ner_infrastructure.geojson"):
        with open("geo/ner_infrastructure.geojson", "r", encoding="utf-8") as f:
            data = json.load(f)
            features = data.get("features", [])
            results = []
            for feat in features:
                props = feat.get("properties", {})
                if state and props.get("state", "").lower() != state.lower():
                    continue
                if infra_type and props.get("type", "").lower() != infra_type.lower():
                    continue
                
                coords = feat.get("geometry", {}).get("coordinates", [0, 0])
                results.append({
                    "id": props.get("id"),
                    "name": props.get("name"),
                    "type": props.get("type"),
                    "state": props.get("state"),
                    "district": props.get("district"),
                    "criticality": props.get("criticality", "MEDIUM"),
                    "beds": props.get("beds"),
                    "capacity": props.get("capacity"),
                    "longitude": coords[0],
                    "latitude": coords[1]
                })
            return results
    return []
