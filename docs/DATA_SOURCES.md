# Data Sources & Provenance Registry

The platform integrates real, historical, and derived datasets adhering to strict scientific labeling standards.

| Data Source | Provider / Origin | Type | Update Cadence | Purpose & Coverage | Limitations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Open-Meteo High-Resolution NWP** | Open-Meteo / ECMWF / DWD | REST API | Hourly / Real-time | Live precipitation, 1h/6h/24h/72h rainfall accumulations, multi-day hourly forecast across all 8 NER states. | Model-derived NWP precipitation; validated against IMD regional climatology. |
| **Digital Elevation Model (DEM 30m)** | SRTM / Copernicus Space / OpenTopography | Raster Geotiff | Static Baseline | Slope angle, aspect direction, elevation, profile curvature. Ranked #1 and #2 conditioning factors. | Vegetation canopy height slight smoothing on alpine peaks. |
| **Soil Moisture Telemetry** | India-WRIS / NASA SMAP & IoT In-Situ Probes | Telemetry / Ingest | 3-Hourly / Daily | Volumetric water content ($m^3/m^3$) with Sharma-Laskar (~70% saturation plateau) non-linear conversion. | Satellite coarse pixel footprint augmented with local topographical slope weighting. |
| **Historical Landslide Atlas** | Geological Survey of India (GSI) & Disaster Atlas | Geospatial Inventory | Historical Baseline | 500 verified landslide occurrence centroids across Assam, Sikkim, Manipur, Meghalaya, Nagaland, Mizoram, Arunachal, Tripura. | Reporting bias toward highway cut slopes versus inaccessible deep forests. |
| **Sentinel-1 SAR C-Band Radar** | Copernicus Open Access Hub / ESA | Interferometric SAR | 6–12 Day Revisit | Cloud-penetrating radar coherence and surface displacement monitoring. | Asynchronous orbit revisit cycle. |
| **National Highway Network & Infrastructure** | MoRTH / Survey of India / OSM | Vector GeoJSON | Operational Updates | NH-27, NH-10, NH-29, NH-37, NH-6, NH-13 highway lines, hospitals, emergency relief shelters, bridges. | Road condition updates dependent on district administration inputs. |

---

## Provenance Badging Policy
- `[OBSERVED]`: Verified ground sensor readings, GSI records, and direct Open-Meteo actual observations.
- `[FORECAST]`: Numerical weather prediction precipitation projections (+6h to +72h).
- `[MODEL PREDICTION]`: ML-derived landslide failure probabilities.
- `[SIMULATION]`: Controlled scenario demonstration mode for SIH reviews.
