"""
Road Network & Highway Risk Intelligence Router
Implements Section 17 ("Road Risk Intelligence") requirements:
- Highway segment vulnerability, blockage statuses (Open, At Risk, Restricted, Blocked)
- Strategic lifeline chokepoints and alternate evacuation routing metadata
"""

from fastapi import APIRouter
import json
import os
from typing import List, Dict, Any

router = APIRouter(prefix="/roads", tags=["Road Risk Intelligence"])

@router.get("")
async def list_highway_risks():
    if os.path.exists("geo/ner_highways.geojson"):
        with open("geo/ner_highways.geojson", "r", encoding="utf-8") as f:
            highways_data = json.load(f)
            features = highways_data.get("features", [])
            
            # Enrich highway segments with dynamic operational statuses
            results = []
            for f_feat in features:
                props = f_feat.get("properties", {})
                hw_id = props.get("id")
                vuln = props.get("vulnerability", "HIGH")
                
                # Dynamic status
                if hw_id in ["NH-27", "NH-10"]:
                    status = "AT_RISK"
                    blockage_reported = False
                    advisory = "Caution: Active rockfall monitoring in effect. Heavy commercial vehicles restricted after 18:00 hrs."
                    alternate_route = "SH-19 via Umrangso or Rail bypass (where operational)"
                elif hw_id == "NH-29":
                    status = "RESTRICTED"
                    blockage_reported = True
                    advisory = "Single-lane traffic movement at Dzüdza sinking zone. SDRF traffic marshals deployed."
                    alternate_route = "Old Kohima-Pfutsero bypass corridor"
                else:
                    status = "OPEN"
                    blockage_reported = False
                    advisory = "Normal monsoon traffic flow. Maintain speed limit < 40 km/h."
                    alternate_route = "Standard highway alignment"

                results.append({
                    "id": hw_id,
                    "name": props.get("name"),
                    "route": props.get("route"),
                    "importance": props.get("importance"),
                    "vulnerability": vuln,
                    "status": status,
                    "blockage_reported": blockage_reported,
                    "critical_chokepoints": props.get("critical_points", []),
                    "state_segments": props.get("state_segments", []),
                    "traffic_advisory": advisory,
                    "alternate_evacuation_route": alternate_route,
                    "geometry": f_feat.get("geometry")
                })
            return results
    return []

@router.get("/isolation-analysis")
async def get_village_isolation_analysis():
    """Returns comprehensive Lifeline Connectivity & Village Isolation Risk Matrix for major corridors."""
    corridor_impacts = [
        {
            "highway_id": "NH-27",
            "highway_name": "NH-27 (East-West Corridor / Dima Hasao Link)",
            "route": "Guwahati - Haflong - Silchar",
            "status": "AT_RISK",
            "lifeline_score": 62.0,
            "cut_off_villages": ["Jatinga", "Mahur", "Harangajao", "Maibang", "Lower Haflong"],
            "isolated_population_est": 68000,
            "critical_services_severed": [
                "Haflong Civil Hospital (Primary Secondary Referral)",
                "Broad-Gauge Goods Train Connection",
                "Fuel Tanker Supply to Barak Valley & Mizoram"
            ],
            "alternate_relief_routes": [
                "SH-19 via Umrangso-Lanka bypass",
                "Emergency Broad-Gauge Rail evacuation wagon",
                "Helicopter Airdrop Zone: Haflong DSA Ground"
            ]
        },
        {
            "highway_id": "NH-10",
            "highway_name": "NH-10 (Sikkim Lifeline)",
            "route": "Sevoke - Teesta Bazaar - Singtam - Gangtok",
            "status": "AT_RISK",
            "lifeline_score": 54.0,
            "cut_off_villages": ["Teesta Bazaar", "Melli", "Rangpo", "Singtam", "Dikchu"],
            "isolated_population_est": 42000,
            "critical_services_severed": [
                "STNM Multi-Specialty Hospital Referral Route",
                "Pharma Manufacturing Freight Transit",
                "Essential Food Grain Supply to Gangtok"
            ],
            "alternate_relief_routes": [
                "Gorubathan - Lava - Algarah - Reshi bypass (light vehicles)",
                "Helicopter Airdrop Zone: Libing Military Helipad"
            ]
        },
        {
            "highway_id": "NH-29",
            "highway_name": "NH-29 (Dimapur-Kohima-Imphal)",
            "route": "Dimapur - Chumukedima - Kohima - Imphal",
            "status": "RESTRICTED",
            "lifeline_score": 48.0,
            "cut_off_villages": ["Zubza", "Phesama", "Khuzama", "Medziphema Valley"],
            "isolated_population_est": 55000,
            "critical_services_severed": [
                "Naga Hospital Authority Kohima Access",
                "Manipur Inter-State Commercial Logistics"
            ],
            "alternate_relief_routes": [
                "Old Kohima - Pfutsero - Tadubi bypass",
                "Helicopter Airdrop Zone: Kohima Science College Ground"
            ]
        },
        {
            "highway_id": "NH-37",
            "highway_name": "NH-37 (Jiribam-Noney-Imphal Corridor)",
            "route": "Silchar - Jiribam - Noney - Imphal",
            "status": "OPEN",
            "lifeline_score": 78.0,
            "cut_off_villages": ["Tupul", "Noney Centre", "Awangkhul", "Rengpang", "Khongsang"],
            "isolated_population_est": 34000,
            "critical_services_severed": [
                "Jiribam-Imphal Highway Transit",
                "Railway Project Construction Material Flow"
            ],
            "alternate_relief_routes": [
                "Bishnupur - Khoupum road (Jeepable only)",
                "Helicopter Airdrop Zone: Tupul Railway Helipad"
            ]
        },
        {
            "highway_id": "NH-6",
            "highway_name": "NH-6 (Meghalaya-Tripura Link)",
            "route": "Shillong - Jowai - Khliehriat - Silchar - Agartala",
            "status": "OPEN",
            "lifeline_score": 82.0,
            "cut_off_villages": ["Sonapur Tunnel Area", "Lumshnong", "Khliehriat", "Ratacherra"],
            "isolated_population_est": 48000,
            "critical_services_severed": [
                "Tripura & Mizoram Petroleum Lifeline",
                "Cement Transport Corridor"
            ],
            "alternate_relief_routes": [
                "Pangram - Lumshnong rural diversion",
                "Helicopter Airdrop Zone: Jowai Polo Ground Helipad"
            ]
        },
        {
            "highway_id": "NH-13",
            "highway_name": "NH-13 (Trans-Arunachal Highway)",
            "route": "Tawang - Bomdila - Nechiphu - Itanagar",
            "status": "AT_RISK",
            "lifeline_score": 60.0,
            "cut_off_villages": ["Sela Approach", "Jang", "Dirang Valley", "Bhalukpong Gorge", "Rupa"],
            "isolated_population_est": 29000,
            "critical_services_severed": [
                "Strategic Defense Convoy Lifeline",
                "Tawang District Hospital Patient Referral Route"
            ],
            "alternate_relief_routes": [
                "Shergaon - Rupa - Kalaktang military diversion",
                "Helicopter Airdrop Zone: Tawang High-Altitude Helipad"
            ]
        }
    ]
    return corridor_impacts
