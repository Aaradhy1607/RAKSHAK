# API Reference & Endpoint Specification

Base URL: `http://localhost:8000/api`  
Interactive OpenAPI/Swagger Docs: `http://localhost:8000/docs`

---

## 1. Risk Intelligence Endpoints

### `GET /api/risk/overview`
Returns region-wide summary statistics, active risk counts, open SOS incidents, exposed population, and data health status.

### `GET /api/risk/locations`
**Query Parameters**:
- `horizon` (optional): `Current`, `+6h`, `+12h`, `+24h`, `+48h`, `+72h` (default: `Current`)

Returns spatial risk intelligence array across all monitored districts with current probability, EPS score, primary factors, and highway exposure.

### `GET /api/risk/location/{district_name}`
Returns in-depth location intelligence, SHAP contribution factors, 6-horizon forecast timeline, and recommended authority actions.

---

## 2. Weather & Meteorology

### `GET /api/weather/live`
**Query Parameters**: `lat` (float), `lon` (float), `state` (string), `district` (string)  
Fetches live Open-Meteo precipitation, temperature, humidity, wind, and 72h accumulated rainfall.

---

## 3. Citizen Reporting & Verification

### `GET /api/reports`
Lists submitted citizen field reports.

### `POST /api/reports`
**Form Data**:
- `category` (string, required): e.g. "Landslide / Slope Collapse", "Tension Crack"
- `description` (string, optional)
- `latitude` (float, required), `longitude` (float, required)
- `district` (string), `state` (string)
- `reporter_name` (string), `reporter_phone` (string)
- `image` (file, optional): Triggers automated AI Computer Vision hazard assessment.

### `PATCH /api/reports/{id}/status`
Updates verification pipeline status (`NEW`, `AI_ASSESSED`, `UNDER_REVIEW`, `VERIFIED`, `DISPATCHED`, `RESOLVED`, `REJECTED`).

---

## 4. Emergency SOS

### `POST /api/sos`
**JSON Body**:
```json
{
  "latitude": 25.1834,
  "longitude": 93.0245,
  "accuracy_m": 5.0,
  "emergency_type": "LANDSLIDE_TRAPPED",
  "message": "Trapped vehicle near Jatinga",
  "people_affected": 4,
  "contact_phone": "+91 94350 XXXXX",
  "district": "Dima Hasao",
  "state": "Assam"
}
```
Instantly activates a pulsing radar beacon on the Command Center GIS map, alerts emergency responders, and logs an auditable timeline event.

### `PATCH /api/sos/{id}/status`
Updates response status (`DISPATCHED`, `RESOLVED`) and assigns response units (e.g. "SDRF Unit 04").

---

## 5. Highways & Infrastructure

### `GET /api/roads`
Returns major highway lines (NH-27, NH-10, NH-29, etc.) with operational statuses (`OPEN`, `AT_RISK`, `RESTRICTED`, `BLOCKED`), advisories, and alternate routes.

### `GET /api/infrastructure`
Returns hospital, relief shelter, bridge, and tunnel coordinates with capacities.

---

## 6. Simulation & Demo Controls

### `POST /api/scenario/trigger`
**Form Data**: `step_index` ($1-6$). Advances the SIH disaster demonstration scenario.

### `POST /api/scenario/reset`
Resets the platform to live telemetry mode.

---

## 7. Real-Time WebSockets

### `WSS /ws`
Subscribes client to real-time broadcasts:
- `NEW_SOS_TRIGGERED`
- `SOS_STATUS_UPDATED`
- `NEW_CITIZEN_REPORT`
- `REPORT_STATUS_UPDATED`
- `SCENARIO_STEP_UPDATED`
- `SCENARIO_RESET`
