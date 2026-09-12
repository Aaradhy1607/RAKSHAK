# System Architecture & Technical Design

## 1. High-Level Architectural Principles

The platform follows a clean, decoupled **Domain-Driven Architecture**:
1. **Data Ingestion & Quality Layer**: Interacts with Open-Meteo REST APIs, pre-computed DEM rasters, and in-situ soil moisture feeds. Includes data freshness tracking and timeout/fallback logic.
2. **Machine Learning & Attribution Engine**: Employs an ensemble of Random Forest and Gradient Boosting models benchmarked against spatial/temporal holdouts. Computes SHAP factor vectors for transparent explainability.
3. **Emergency Priority Engine (EPS)**: Combines landslide failure probability with spatial vulnerability layers (population, infrastructure, strategic highway lifelines, and community isolation impact).
4. **Real-Time WebSocket Hub**: Manages bidirectional subscriptions for Command Center dashboards and mobile citizen apps.
5. **GIS Command Center Frontend**: React 19 single-page application utilizing Leaflet/MapLibre vector maps, multi-horizon timeline sliders, and local offline queueing.

---

## 2. Emergency Priority Formula

The **Emergency Priority Score (EPS)** ($0-100$) determines resource dispatch rankings:

$$\text{EPS} = \left( P_{\text{landslide}} \times 0.40 + S_{\text{population}} \times 0.20 + S_{\text{infrastructure}} \times 0.20 + S_{\text{road}} \times 0.20 \right) \times 100$$

Where:
- $P_{\text{landslide}} \in [0, 1]$: Calibrated failure probability from the ML trigger model.
- $S_{\text{population}} \in [0, 1]$: Exposed district census population normalized to regional maximums.
- $S_{\text{infrastructure}} \in [0, 1]$: Cumulative weight of hospitals, relief shelters, bridges, and tunnels in the vulnerable catchment.
- $S_{\text{road}} \in [0, 1]$: Criticality of the nearest highway corridor (e.g. NH-27 / NH-10 lifelines).

### Priority Tiers:
- **P1 (Score $\ge 75$)**: Immediate Emergency Intervention (SDRF/NDRF tactical deployment).
- **P2 (Score $50 - 74$)**: Urgent Geotechnical Field Inspection (DDMA engineering verification).
- **P3 (Score $25 - 49$)**: Active Sensor / Slope Drainage Monitoring.
- **P4 (Score $< 25$)**: Routine Background Surveillance.

---

## 3. Real-Time Event Architecture

```
[Citizen / Sensor Device]
         │
         ▼ (HTTP POST /api/sos or /api/reports)
[FastAPI Ingestion Endpoint]
         │
         ├──> [SQLite Persistent Storage]
         │
         └──> [WebSocket Hub (broadcast event)]
                     │
                     ▼ (WSS Stream)
     [Command Center Active Clients] (Map pulses radar beacon, updates audio/visual alert queue)
```

---

## 4. Offline-First PWA Synchronization

In remote mountain corridors with no cellular network:
1. Citizen reports and SOS payloads are stored in `localStorage` / `IndexedDB` with high-precision device GPS and timestamp.
2. The UI explicitly updates to `[OFFLINE (PWA CACHE)]` status.
3. When connectivity is restored, the browser's `online` event triggers an automated idempotent queue drain via `api.syncOfflineQueues()`.
