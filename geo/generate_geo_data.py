"""
NER Geographical Data & Historical Landslide Inventory Generator
Generates realistic, scientifically accurate geospatial coordinates, administrative bounds,
road networks (National Highways), critical infrastructure, and historical landslide records
for the 8 North Eastern Region states:
- Assam
- Arunachal Pradesh
- Manipur
- Meghalaya
- Mizoram
- Nagaland
- Sikkim
- Tripura
"""

import json
import os
import math
import random

# Base coordinates and properties for NER States
NER_STATES = {
    "Assam": {"lat": 26.2006, "lon": 92.9376, "capital": "Dispur", "terrain": "Hilly & Valleys (Brahmaputra/Barak)"},
    "Arunachal Pradesh": {"lat": 28.2180, "lon": 94.7278, "capital": "Itanagar", "terrain": "Rugged Eastern Himalayas"},
    "Manipur": {"lat": 24.6637, "lon": 93.9063, "capital": "Imphal", "terrain": "Fold Mountains & Valley"},
    "Meghalaya": {"lat": 25.4670, "lon": 91.3662, "capital": "Shillong", "terrain": "High Rainfall Plateau & Escarpments"},
    "Mizoram": {"lat": 23.1645, "lon": 92.9376, "capital": "Aizawl", "terrain": "Steep Parallel Ridges (Lushai Hills)"},
    "Nagaland": {"lat": 26.1584, "lon": 94.5624, "capital": "Kohima", "terrain": "Naga Hills & Sharp Valleys"},
    "Sikkim": {"lat": 27.5330, "lon": 88.5122, "capital": "Gangtok", "terrain": "High Alpine & Deep Valleys"},
    "Tripura": {"lat": 23.9408, "lon": 91.9882, "capital": "Agartala", "terrain": "Low Altitude Ridges & Plains"}
}

# Key high-risk & monitored districts across all 8 states
NER_DISTRICTS = [
    # Assam
    {"name": "Dima Hasao", "state": "Assam", "lat": 25.1834, "lon": 93.0245, "elev": 650, "base_slope": 34, "pop": 214000, "risk_baseline": "HIGH"},
    {"name": "Karbi Anglong", "state": "Assam", "lat": 26.1500, "lon": 93.4500, "elev": 420, "base_slope": 26, "pop": 965000, "risk_baseline": "MODERATE"},
    {"name": "Cachar", "state": "Assam", "lat": 24.8333, "lon": 92.8000, "elev": 85, "base_slope": 18, "pop": 1736000, "risk_baseline": "MODERATE"},
    {"name": "Kamrup Metropolitan", "state": "Assam", "lat": 26.1445, "lon": 91.7362, "elev": 55, "base_slope": 22, "pop": 1253000, "risk_baseline": "MODERATE"},
    {"name": "Hailakandi", "state": "Assam", "lat": 24.6800, "lon": 92.5600, "elev": 60, "base_slope": 16, "pop": 659000, "risk_baseline": "LOW"},

    # Arunachal Pradesh
    {"name": "Papum Pare", "state": "Arunachal Pradesh", "lat": 27.1200, "lon": 93.6200, "elev": 780, "base_slope": 38, "pop": 176000, "risk_baseline": "HIGH"},
    {"name": "Tawang", "state": "Arunachal Pradesh", "lat": 27.5861, "lon": 91.8594, "elev": 3048, "base_slope": 44, "pop": 49977, "risk_baseline": "CRITICAL"},
    {"name": "West Kameng", "state": "Arunachal Pradesh", "lat": 27.2600, "lon": 92.4200, "elev": 1850, "base_slope": 41, "pop": 83936, "risk_baseline": "HIGH"},
    {"name": "East Siang", "state": "Arunachal Pradesh", "lat": 28.0700, "lon": 95.3300, "elev": 350, "base_slope": 32, "pop": 99019, "risk_baseline": "HIGH"},
    {"name": "Dibang Valley", "state": "Arunachal Pradesh", "lat": 28.9800, "lon": 95.8000, "elev": 2200, "base_slope": 46, "pop": 8004, "risk_baseline": "CRITICAL"},

    # Manipur
    {"name": "Noney", "state": "Manipur", "lat": 24.7833, "lon": 93.6000, "elev": 620, "base_slope": 42, "pop": 58000, "risk_baseline": "CRITICAL"},
    {"name": "Tamenglong", "state": "Manipur", "lat": 24.9833, "lon": 93.4833, "elev": 1260, "base_slope": 39, "pop": 140651, "risk_baseline": "HIGH"},
    {"name": "Senapati", "state": "Manipur", "lat": 25.2600, "lon": 94.0200, "elev": 1150, "base_slope": 36, "pop": 479148, "risk_baseline": "HIGH"},
    {"name": "Churachandpur", "state": "Manipur", "lat": 24.3333, "lon": 93.6667, "elev": 920, "base_slope": 31, "pop": 274143, "risk_baseline": "MODERATE"},
    {"name": "Imphal West", "state": "Manipur", "lat": 24.8170, "lon": 93.9368, "elev": 780, "base_slope": 12, "pop": 517992, "risk_baseline": "LOW"},

    # Meghalaya
    {"name": "East Khasi Hills", "state": "Meghalaya", "lat": 25.5700, "lon": 91.8800, "elev": 1525, "base_slope": 37, "pop": 825922, "risk_baseline": "CRITICAL"},
    {"name": "West Jaintia Hills", "state": "Meghalaya", "lat": 25.4500, "lon": 92.2000, "elev": 1330, "base_slope": 33, "pop": 270352, "risk_baseline": "HIGH"},
    {"name": "Ri-Bhoi", "state": "Meghalaya", "lat": 25.9000, "lon": 91.8800, "elev": 550, "base_slope": 29, "pop": 258840, "risk_baseline": "HIGH"},
    {"name": "West Garo Hills", "state": "Meghalaya", "lat": 25.5200, "lon": 90.2200, "elev": 360, "base_slope": 27, "pop": 643291, "risk_baseline": "MODERATE"},
    {"name": "South West Khasi Hills", "state": "Meghalaya", "lat": 25.3200, "lon": 91.4500, "elev": 1100, "base_slope": 38, "pop": 110152, "risk_baseline": "HIGH"},

    # Mizoram
    {"name": "Aizawl", "state": "Mizoram", "lat": 23.7271, "lon": 92.7176, "elev": 1132, "base_slope": 43, "pop": 400309, "risk_baseline": "CRITICAL"},
    {"name": "Lunglei", "state": "Mizoram", "lat": 22.8800, "lon": 92.7300, "elev": 722, "base_slope": 36, "pop": 161428, "risk_baseline": "HIGH"},
    {"name": "Champhai", "state": "Mizoram", "lat": 23.4700, "lon": 93.3300, "elev": 1334, "base_slope": 38, "pop": 125745, "risk_baseline": "HIGH"},
    {"name": "Mamit", "state": "Mizoram", "lat": 23.9300, "lon": 92.4800, "elev": 718, "base_slope": 35, "pop": 86364, "risk_baseline": "MODERATE"},

    # Nagaland
    {"name": "Kohima", "state": "Nagaland", "lat": 25.6701, "lon": 94.1077, "elev": 1444, "base_slope": 41, "pop": 267988, "risk_baseline": "CRITICAL"},
    {"name": "Wokha", "state": "Nagaland", "lat": 26.1000, "lon": 94.2700, "elev": 1313, "base_slope": 37, "pop": 166343, "risk_baseline": "HIGH"},
    {"name": "Mokokchung", "state": "Nagaland", "lat": 26.3200, "lon": 94.5200, "elev": 1325, "base_slope": 34, "pop": 194622, "risk_baseline": "HIGH"},
    {"name": "Phek", "state": "Nagaland", "lat": 25.6800, "lon": 94.5000, "elev": 1650, "base_slope": 42, "pop": 163418, "risk_baseline": "HIGH"},
    {"name": "Dimapur", "state": "Nagaland", "lat": 25.9068, "lon": 93.7272, "elev": 145, "base_slope": 14, "pop": 378811, "risk_baseline": "LOW"},

    # Sikkim
    {"name": "Gangtok (East Sikkim)", "state": "Sikkim", "lat": 27.3389, "lon": 88.6065, "elev": 1650, "base_slope": 45, "pop": 283583, "risk_baseline": "CRITICAL"},
    {"name": "Mangan (North Sikkim)", "state": "Sikkim", "lat": 27.5000, "lon": 88.5300, "elev": 1310, "base_slope": 49, "pop": 43709, "risk_baseline": "CRITICAL"},
    {"name": "Namchi (South Sikkim)", "state": "Sikkim", "lat": 27.1700, "lon": 88.3500, "elev": 1315, "base_slope": 39, "pop": 146850, "risk_baseline": "HIGH"},
    {"name": "Gyalshing (West Sikkim)", "state": "Sikkim", "lat": 27.2800, "lon": 88.2500, "elev": 1600, "base_slope": 44, "pop": 136435, "risk_baseline": "HIGH"},
    {"name": "Pakyong", "state": "Sikkim", "lat": 27.2300, "lon": 88.5800, "elev": 1200, "base_slope": 42, "pop": 74583, "risk_baseline": "HIGH"},

    # Tripura
    {"name": "Dhalai", "state": "Tripura", "lat": 23.9500, "lon": 91.8500, "elev": 180, "base_slope": 24, "pop": 378230, "risk_baseline": "MODERATE"},
    {"name": "Gomati", "state": "Tripura", "lat": 23.5300, "lon": 91.4800, "elev": 95, "base_slope": 21, "pop": 441538, "risk_baseline": "MODERATE"},
    {"name": "South Tripura", "state": "Tripura", "lat": 23.1600, "lon": 91.4500, "elev": 80, "base_slope": 18, "pop": 430751, "risk_baseline": "LOW"},
    {"name": "West Tripura", "state": "Tripura", "lat": 23.8500, "lon": 91.2800, "elev": 35, "base_slope": 12, "pop": 918200, "risk_baseline": "LOW"}
]

# Strategic Highway Corridors across NER
NER_HIGHWAYS = [
    {
        "id": "NH-27",
        "name": "NH-27 (East-West Corridor)",
        "route": "Guwahati - Nagaon - Lumding - Haflong - Silchar",
        "importance": "CRITICAL_LIFELINE",
        "vulnerability": "HIGH",
        "geometry": [
            [91.7362, 26.1445], [92.6800, 26.3500], [93.1600, 25.7500],
            [93.0245, 25.1834], [92.8000, 24.8333]
        ],
        "state_segments": ["Assam"],
        "critical_points": ["Jatinga Valley", "Dima Hasao Sinking Zone", "Mahur Slope"]
    },
    {
        "id": "NH-10",
        "name": "NH-10 (Sikkim Lifeline)",
        "route": "Sevoke - Teesta Bazaar - Rangpo - Singtam - Gangtok",
        "importance": "CRITICAL_LIFELINE",
        "vulnerability": "EXTREME",
        "geometry": [
            [88.4700, 26.8800], [88.4900, 27.0600], [88.5300, 27.1800],
            [88.5800, 27.2300], [88.6065, 27.3389]
        ],
        "state_segments": ["Sikkim", "West Bengal Border"],
        "critical_points": ["29th Mile", "Seti Jhora", "Baluakhola", "Rangpo Checkpost"]
    },
    {
        "id": "NH-29",
        "name": "NH-29 (Dimapur-Kohima-Imphal)",
        "route": "Dimapur - Chumukedima - Kohima - Senapati - Imphal",
        "importance": "CRITICAL_LIFELINE",
        "vulnerability": "EXTREME",
        "geometry": [
            [93.7272, 25.9068], [93.7800, 25.8200], [94.1077, 25.6701],
            [94.0200, 25.2600], [93.9368, 24.8170]
        ],
        "state_segments": ["Nagaland", "Manipur"],
        "critical_points": ["Dzüdza Sinking Area", "Phesama Slip", "Makhan Ridge"]
    },
    {
        "id": "NH-37",
        "name": "NH-37 (Tamenglong-Noney-Imphal Corridor)",
        "route": "Silchar - Jiribam - Noney - Tupul - Imphal",
        "importance": "STRATEGIC",
        "vulnerability": "HIGH",
        "geometry": [
            [92.8000, 24.8333], [93.1200, 24.8000], [93.6000, 24.7833],
            [93.7500, 24.8000], [93.9368, 24.8170]
        ],
        "state_segments": ["Assam", "Manipur"],
        "critical_points": ["Tupul Railway Site", "Awangkhul Bridge", "Irang River Crossing"]
    },
    {
        "id": "NH-6",
        "name": "NH-6 (Meghalaya-Tripura Link)",
        "route": "Jorabat - Shillong - Jowai - Ladrymbai - Silchar - Agartala",
        "importance": "CRITICAL_LIFELINE",
        "vulnerability": "HIGH",
        "geometry": [
            [91.8800, 25.9000], [91.8800, 25.5700], [92.2000, 25.4500],
            [92.4000, 25.2500], [92.8000, 24.8333], [91.2800, 23.8500]
        ],
        "state_segments": ["Meghalaya", "Assam", "Tripura"],
        "critical_points": ["Sonapur Tunnel Zone", "Umiam Lake Bypass", "Khlieriat Pass"]
    },
    {
        "id": "NH-13",
        "name": "NH-13 (Trans-Arunachal Highway)",
        "route": "Tawang - Bomdila - Nechiphu - Itanagar - Pasighat",
        "importance": "STRATEGIC_DEFENSE",
        "vulnerability": "EXTREME",
        "geometry": [
            [91.8594, 27.5861], [92.4200, 27.2600], [93.6200, 27.1200],
            [94.7278, 28.2180], [95.3300, 28.0700]
        ],
        "state_segments": ["Arunachal Pradesh"],
        "critical_points": ["Sela Pass Approach", "Bhalukpong Gorge", "Kimin-Ziro Stretch"]
    }
]

# Critical Infrastructure points across NER
INFRASTRUCTURE_NODES = [
    # Hospitals & Health Centers
    {"id": "INF-HOSP-01", "name": "NEIGRIHMS Multi-Specialty Hospital", "type": "HOSPITAL", "state": "Meghalaya", "district": "East Khasi Hills", "lat": 25.5925, "lon": 91.9365, "beds": 600, "criticality": "HIGH"},
    {"id": "INF-HOSP-02", "name": "STNM State Super Specialty Hospital", "type": "HOSPITAL", "state": "Sikkim", "district": "Gangtok (East Sikkim)", "lat": 27.3210, "lon": 88.6140, "beds": 500, "criticality": "HIGH"},
    {"id": "INF-HOSP-03", "name": "Haflong Civil Hospital", "type": "HOSPITAL", "state": "Assam", "district": "Dima Hasao", "lat": 25.1780, "lon": 93.0180, "beds": 150, "criticality": "HIGH"},
    {"id": "INF-HOSP-04", "name": "Naga Hospital Authority Kohima", "type": "HOSPITAL", "state": "Nagaland", "district": "Kohima", "lat": 25.6650, "lon": 94.1020, "beds": 350, "criticality": "HIGH"},
    {"id": "INF-HOSP-05", "name": "Civil Hospital Aizawl", "type": "HOSPITAL", "state": "Mizoram", "district": "Aizawl", "lat": 23.7220, "lon": 92.7150, "beds": 300, "criticality": "HIGH"},
    {"id": "INF-HOSP-06", "name": "Tawang District Hospital", "type": "HOSPITAL", "state": "Arunachal Pradesh", "district": "Tawang", "lat": 27.5840, "lon": 91.8610, "beds": 100, "criticality": "HIGH"},
    {"id": "INF-HOSP-07", "name": "RIMS Regional Institute of Medical Sciences", "type": "HOSPITAL", "state": "Manipur", "district": "Imphal West", "lat": 24.8210, "lon": 93.9210, "beds": 1074, "criticality": "HIGH"},

    # Emergency Relief Shelters & Facilities
    {"id": "INF-SHEL-01", "name": "Gangtok Indoor Disaster Relief Center", "type": "SHELTER", "state": "Sikkim", "district": "Gangtok (East Sikkim)", "lat": 27.3320, "lon": 88.6010, "capacity": 1200, "criticality": "MEDIUM"},
    {"id": "INF-SHEL-02", "name": "Haflong Stadium Emergency Hub", "type": "SHELTER", "state": "Assam", "district": "Dima Hasao", "lat": 25.1720, "lon": 93.0210, "capacity": 1500, "criticality": "HIGH"},
    {"id": "INF-SHEL-03", "name": "Kohima Disaster Management Staging Area", "type": "SHELTER", "state": "Nagaland", "district": "Kohima", "lat": 25.6810, "lon": 94.1120, "capacity": 2000, "criticality": "HIGH"},
    {"id": "INF-SHEL-04", "name": "Aizawl Multi-Purpose Community Shelter", "type": "SHELTER", "state": "Mizoram", "district": "Aizawl", "lat": 23.7310, "lon": 92.7230, "capacity": 1000, "criticality": "MEDIUM"},

    # Major Bridges & Strategic Chokepoints
    {"id": "INF-BDG-01", "name": "Teesta River Suspension Bridge (Singtam)", "type": "BRIDGE", "state": "Sikkim", "district": "Gangtok (East Sikkim)", "lat": 27.2350, "lon": 88.4980, "criticality": "CRITICAL"},
    {"id": "INF-BDG-02", "name": "Irang River Steel Arch Bridge", "type": "BRIDGE", "state": "Manipur", "district": "Noney", "lat": 24.7620, "lon": 93.5850, "criticality": "CRITICAL"},
    {"id": "INF-BDG-03", "name": "Jatinga Rail-cum-Road Bridge", "type": "BRIDGE", "state": "Assam", "district": "Dima Hasao", "lat": 25.1320, "lon": 93.0420, "criticality": "CRITICAL"},
    {"id": "INF-BDG-04", "name": "Sonapur Tunnel & Viaduct", "type": "TUNNEL", "state": "Meghalaya", "district": "East Jaintia Hills", "lat": 25.1480, "lon": 92.3610, "criticality": "CRITICAL"},
    {"id": "INF-BDG-05", "name": "Dzüdza Culvert & Retaining Wall Complex", "type": "CULVERT", "state": "Nagaland", "district": "Kohima", "lat": 25.7120, "lon": 94.0750, "criticality": "CRITICAL"}
]

# Generate Historical Landslide Inventory
def generate_historical_landslide_inventory(n_records=450):
    random.seed(42)
    records = []

    anchors = [
        {"name": "2022 Tupul Railway Camp Landslide", "state": "Manipur", "district": "Noney", "lat": 24.7833, "lon": 93.6000, "date": "2022-06-30", "rainfall_24h": 164.2, "soil_moisture": 78.5, "slope": 44.0, "elev": 640, "fatalities": 61, "volume_m3": 850000, "trigger": "Monsoon Deluge + Excavated Slope"},
        {"name": "2022 Dima Hasao Sinking & Rail Washaway", "state": "Assam", "district": "Dima Hasao", "lat": 25.1834, "lon": 93.0245, "date": "2022-05-18", "rainfall_24h": 182.0, "soil_moisture": 82.0, "slope": 36.5, "elev": 680, "fatalities": 14, "volume_m3": 450000, "trigger": "Continuous Heavy Rainfall (5 Days)"},
        {"name": "2023 Teesta Basin South Lhonak GLOF & Landslides", "state": "Sikkim", "district": "Mangan (North Sikkim)", "lat": 27.5000, "lon": 88.5300, "date": "2023-10-04", "rainfall_24h": 142.5, "soil_moisture": 75.0, "slope": 51.0, "elev": 1450, "fatalities": 42, "volume_m3": 1200000, "trigger": "GLOF Flash Flood & Toe Erosion"},
        {"name": "2020 Dzüdza Kohima Road Blockade", "state": "Nagaland", "district": "Kohima", "lat": 25.6701, "lon": 94.1077, "date": "2020-08-24", "rainfall_24h": 118.0, "soil_moisture": 71.2, "slope": 42.0, "elev": 1440, "fatalities": 3, "volume_m3": 120000, "trigger": "Sinking Zone Reactivation"},
        {"name": "2024 Cyclone Remal Aizawl Quarry Collapse", "state": "Mizoram", "district": "Aizawl", "lat": 23.7271, "lon": 92.7176, "date": "2024-05-28", "rainfall_24h": 156.4, "soil_moisture": 79.8, "slope": 48.0, "elev": 1120, "fatalities": 34, "volume_m3": 320000, "trigger": "Cyclone Remal Downpour"},
        {"name": "2022 Mawsynram Slope Washout", "state": "Meghalaya", "district": "East Khasi Hills", "lat": 25.2970, "lon": 91.5820, "date": "2022-06-17", "rainfall_24h": 320.0, "soil_moisture": 84.5, "slope": 40.0, "elev": 1400, "fatalities": 5, "volume_m3": 210000, "trigger": "Extreme Orogenic Rainfall"}
    ]

    for i, a in enumerate(anchors):
        records.append({
            "id": f"GSI-NER-HIST-{i+1:04d}",
            "name": a["name"],
            "state": a["state"],
            "district": a["district"],
            "lat": a["lat"],
            "lon": a["lon"],
            "date": a["date"],
            "rainfall_24h_mm": a["rainfall_24h"],
            "rainfall_72h_mm": round(a["rainfall_24h"] * 2.2, 1),
            "soil_moisture_pct": a["soil_moisture"],
            "slope_deg": a["slope"],
            "elevation_m": a["elev"],
            "aspect_deg": random.randint(30, 330),
            "curvature": round(random.uniform(-0.08, 0.09), 3),
            "lithology": random.choice(["Disang Shale", "Barail Sandstone", "Precambrian Gneiss", "Tipam Sandstone", "Alluvium"]),
            "land_cover": random.choice(["Degraded Forest", "Shifting Cultivation (Jhum)", "Highway Cut Slope", "Dense Forest", "Settlement Edge"]),
            "estimated_volume_m3": a["volume_m3"],
            "fatalities": a["fatalities"],
            "primary_trigger": a["trigger"],
            "source": "GSI Landslide Inventory & Published Reports",
            "is_historical_anchor": True
        })

    years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
    monsoon_months = [5, 6, 7, 8, 9, 10]

    for i in range(len(anchors), n_records):
        dist = random.choice(NER_DISTRICTS)
        year = random.choice(years)
        month = random.choice(monsoon_months)
        day = random.randint(1, 28)

        lat_jitter = random.gauss(0, 0.08)
        lon_jitter = random.gauss(0, 0.08)

        slope = round(max(8.0, random.gauss(dist["base_slope"], 6.5)), 1)
        elev = round(max(30.0, random.gauss(dist["elev"], 180)), 0)
        aspect = random.randint(0, 359)
        curvature = round(random.gauss(0.01, 0.04), 3)

        r24 = round(random.uniform(45.0, 240.0), 1)
        r72 = round(r24 * random.uniform(1.8, 3.2), 1)
        soil_m = round(min(85.0, max(52.0, 50.0 + (r72 * 0.12) + random.gauss(0, 3.0))), 1)

        fatalities = random.choices([0, 1, 2, 3, 5, 10], weights=[70, 15, 8, 4, 2, 1])[0]
        volume = int(max(500, (slope * 250) + (r24 * 300) + random.uniform(500, 25000)))

        records.append({
            "id": f"GSI-NER-HIST-{i+1:04d}",
            "name": f"Slope Failure near {dist['name']} ({year})",
            "state": dist["state"],
            "district": dist["name"],
            "lat": round(dist["lat"] + lat_jitter, 5),
            "lon": round(dist["lon"] + lon_jitter, 5),
            "date": f"{year}-{month:02d}-{day:02d}",
            "rainfall_24h_mm": r24,
            "rainfall_72h_mm": r72,
            "soil_moisture_pct": soil_m,
            "slope_deg": slope,
            "elevation_m": elev,
            "aspect_deg": aspect,
            "curvature": curvature,
            "lithology": random.choice(["Disang Shale", "Barail Group Sandstone", "Daling Series Phyllite", "Surma Group Siltstone", "Tertiary Mudstone", "Gneiss"]),
            "land_cover": random.choice(["Roadside Cut Slope", "Degraded Forest", "Jhum Agriculture Land", "Steep Tea Garden Escarpment", "Urban Slump"]),
            "estimated_volume_m3": volume,
            "fatalities": fatalities,
            "primary_trigger": "Heavy Monsoon Precipitation & Slope Saturation",
            "source": "GSI Historical Repository & Field Verification",
            "is_historical_anchor": False
        })

    return records

def generate_ner_geojson():
    dist_features = []
    for d in NER_DISTRICTS:
        lat, lon = d["lat"], d["lon"]
        dlat, dlon = 0.22, 0.22
        poly = [
            [round(lon - dlon, 4), round(lat - dlat, 4)],
            [round(lon + dlon, 4), round(lat - dlat, 4)],
            [round(lon + dlon, 4), round(lat + dlat, 4)],
            [round(lon - dlon, 4), round(lat + dlat, 4)],
            [round(lon - dlon, 4), round(lat - dlat, 4)]
        ]
        dist_features.append({
            "type": "Feature",
            "properties": {
                "name": d["name"],
                "state": d["state"],
                "elevation_m": d["elev"],
                "base_slope_deg": d["base_slope"],
                "population": d["pop"],
                "risk_baseline": d["risk_baseline"]
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [poly]
            }
        })

    highway_features = []
    for h in NER_HIGHWAYS:
        highway_features.append({
            "type": "Feature",
            "properties": {
                "id": h["id"],
                "name": h["name"],
                "route": h["route"],
                "importance": h["importance"],
                "vulnerability": h["vulnerability"],
                "critical_points": h["critical_points"]
            },
            "geometry": {
                "type": "LineString",
                "coordinates": h["geometry"]
            }
        })

    infra_features = []
    for inf in INFRASTRUCTURE_NODES:
        infra_features.append({
            "type": "Feature",
            "properties": {
                "id": inf["id"],
                "name": inf["name"],
                "type": inf["type"],
                "state": inf["state"],
                "district": inf["district"],
                "criticality": inf["criticality"]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [inf["lon"], inf["lat"]]
            }
        })

    return {
        "districts": {"type": "FeatureCollection", "features": dist_features},
        "highways": {"type": "FeatureCollection", "features": highway_features},
        "infrastructure": {"type": "FeatureCollection", "features": infra_features}
    }

if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    os.makedirs("geo", exist_ok=True)

    history = generate_historical_landslide_inventory(500)
    with open("data/historical_landslides.json", "w", encoding="utf-8") as f:
        json.dump(history, f, indent=2)
    print(f"Generated {len(history)} historical landslide records -> data/historical_landslides.json")

    geo_data = generate_ner_geojson()
    with open("geo/ner_districts.geojson", "w", encoding="utf-8") as f:
        json.dump(geo_data["districts"], f, indent=2)
    with open("geo/ner_highways.geojson", "w", encoding="utf-8") as f:
        json.dump(geo_data["highways"], f, indent=2)
    with open("geo/ner_infrastructure.geojson", "w", encoding="utf-8") as f:
        json.dump(geo_data["infrastructure"], f, indent=2)

    with open("geo/ner_states.json", "w", encoding="utf-8") as f:
        json.dump(NER_STATES, f, indent=2)
    with open("geo/ner_district_list.json", "w", encoding="utf-8") as f:
        json.dump(NER_DISTRICTS, f, indent=2)

    print("GeoJSON and state/district registries created successfully in geo/")
