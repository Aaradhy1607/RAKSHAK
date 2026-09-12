"""
Official Disaster Intelligence Report Export Router
Implements Section 74 ("Report Generation") requirements:
- Produces clean, data-grounded Markdown & JSON intelligence briefings for DDMA / SDMA / MDoNER
"""

from fastapi import APIRouter, Query, Response
from datetime import datetime, timezone
from backend.services.risk_service import calculate_location_risk, DISTRICTS_CACHE, load_geo_registries
from backend.database import get_sos_incidents, get_citizen_reports

router = APIRouter(prefix="/reports-export", tags=["Report Generation"])

@router.get("/briefing")
async def generate_executive_briefing(district_name: str = Query("Dima Hasao", description="District name")):
    load_geo_registries()
    dist = next((d for d in DISTRICTS_CACHE if d["name"].lower() == district_name.lower()), DISTRICTS_CACHE[0])
    risk_data = await calculate_location_risk(dist)
    sos_list = get_sos_incidents(limit=10)
    reports = get_citizen_reports(limit=10)

    now_str = datetime.now(timezone.utc).strftime("%d %B %Y, %H:%M UTC")

    report_md = f"""# DISASTER RISK INTELLIGENCE & EARLY WARNING BRIEFING
**Ministry of Development of North Eastern Region (MDoNER) / SDMA**
*Generated on: {now_str}*

---

## 1. EXECUTIVE LOCATION PROFILE
- **Target District**: {risk_data['district']}, {risk_data['state']}
- **Geographic Coordinates**: {risk_data['latitude']:.4f}° N, {risk_data['longitude']:.4f}° E
- **Base Elevation**: {risk_data['elevation_m']} m above MSL
- **Average Slope Gradient**: {risk_data['slope_deg']}°
- **Vulnerable Population**: {risk_data['population']:,}

## 2. CURRENT AI HAZARD ASSESSMENT
- **Predicted Risk Level**: **[{risk_data['current_risk']}]**
- **Landslide Failure Probability**: **{int(risk_data['probability'] * 100)}%**
- **Emergency Priority Tier**: **{risk_data['emergency_priority']}** (Score: {risk_data['priority_score']}/100)
- **Model Confidence**: {int(risk_data['confidence'] * 100)}%
- **Data Provenance**: [{risk_data['data_nature']}]
- **Risk Trend**: {risk_data['risk_trend']}

## 3. METEOROLOGICAL & INFILTRATION TRIGGERS
- **1-Hour Peak Intensity**: {risk_data['rainfall_1h_mm']} mm/h
- **6-Hour Cumulative**: {risk_data['rainfall_6h_mm']} mm
- **24-Hour Antecedent Rainfall**: {risk_data['rainfall_24h_mm']} mm
- **72-Hour Antecedent Rainfall Index (ARI)**: {risk_data['rainfall_72h_mm']} mm
- **Current Soil Moisture Saturation**: {risk_data['soil_moisture_pct']}% ({risk_data['soil_saturation_state']})

## 4. SHAP FACTOR CONTRIBUTION (WHY THIS RISK?)
{risk_data['explanation_summary']}

Top Driving Contributors:
"""
    for f in risk_data['primary_factors'][:4]:
        report_md += f"- **{f['label']}**: {f['contribution_pct']}% attribution (Raw Value: {f['raw_value']})\n"

    report_md += f"""
## 5. MULTI-HORIZON RISK EVOLUTION
| Horizon | Rainfall Forecast (mm) | Soil Saturation (%) | Failure Probability | Predicted Risk |
| :--- | :--- | :--- | :--- | :--- |
"""
    for h in risk_data['forecast_timeline']:
        report_md += f"| {h['horizon']} | {h['rainfall_forecast_mm']} mm | {h['soil_moisture_pct']}% | {int(h['probability']*100)}% | {h['predicted_risk']} |\n"

    report_md += f"""
## 6. RECOMMENDED AUTHORITY MITIGATION ACTIONS
"""
    for act in risk_data['recommended_authority_actions']:
        report_md += f"1. {act}\n"

    report_md += f"""
## 7. ACTIVE FIELD INCIDENTS & SOS STATUS
- **Active SOS Beacons in District Catchment**: {len([s for s in sos_list if s['district'] == risk_data['district']])}
- **Citizen Field Reports Under Review**: {len([r for r in reports if r['district'] == risk_data['district']])}

---
*Official Notice issued by MDoNER AI-Powered Landslide Risk Monitoring Platform (SIH 26001). For operational emergency coordination only.*
"""
    filename = f"Landslide_Briefing_{dist['name'].replace(' ', '_')}.md"
    return Response(
        content=report_md,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
