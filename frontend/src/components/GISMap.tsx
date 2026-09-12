import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import type { RiskLevel } from '../types';
import {
  Layers,
  Clock,
  Radio,
  AlertTriangle,
  Hospital,
  Truck,
  ChevronRight,
  Maximize2
} from 'lucide-react';

const RISK_COLORS: Record<RiskLevel, string> = {
  SAFE: '#10b981',     // Emerald
  LOW: '#10b981',      // Emerald
  WATCH: '#eab308',    // Yellow
  WARNING: '#f59e0b',  // Amber
  HIGH: '#ea580c',     // Orange
  CRITICAL: '#ef4444'  // Red
};

export const GISMap: React.FC = () => {
  const {
    locations,
    highways,
    infrastructure,
    citizenReports,
    sosIncidents,
    selectedDistrict,
    setSelectedDistrict,
    selectedHorizon,
    setSelectedHorizon,
    layerVisibility,
    toggleLayer,
    setOpenDrawer,
    theme,
    t
  } = useApp();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayersRef = useRef<L.Layer[]>([]);
  const layerGroupsRef = useRef<{
    districts: L.LayerGroup;
    highways: L.LayerGroup;
    infrastructure: L.LayerGroup;
    reports: L.LayerGroup;
    sos: L.LayerGroup;
  }>({
    districts: L.layerGroup(),
    highways: L.layerGroup(),
    infrastructure: L.layerGroup(),
    reports: L.layerGroup(),
    sos: L.layerGroup()
  });

  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const applyBaseTiles = (map: L.Map, isDark: boolean) => {
    // Remove existing base tile layers
    baseTileLayersRef.current.forEach(layer => map.removeLayer(layer));
    baseTileLayersRef.current = [];

    if (isDark) {
      // Dark Base: ESRI World Dark Gray Canvas (High Performance, No Watermark, No API Key Required)
      const darkBase = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS User Community',
          maxZoom: 16
        }
      ).addTo(map);

      // Dark Reference Labels Layer
      const darkLabels = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '',
          maxZoom: 16,
          pane: 'shadowPane'
        }
      ).addTo(map);

      baseTileLayersRef.current = [darkBase, darkLabels];
    } else {
      // Light Base: Clean OpenStreetMap
      const osmLight = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }
      ).addTo(map);

      baseTileLayersRef.current = [osmLight];
    }
  };

  // Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center on North East India
    const map = L.map(mapContainerRef.current, {
      center: [26.2006, 92.9376],
      zoom: 7,
      minZoom: 5,
      maxZoom: 16,
      zoomControl: false
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    applyBaseTiles(map, theme === 'dark');

    // Add layer groups
    Object.values(layerGroupsRef.current).forEach(g => g.addTo(map));

    mapInstanceRef.current = map;

    // Handle container resize cleanly
    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Base Tile on Theme Switch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    applyBaseTiles(mapInstanceRef.current, theme === 'dark');
  }, [theme]);

  // Render Districts / Risk Zones
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const group = layerGroupsRef.current.districts;
    group.clearLayers();

    if (!layerVisibility.riskPolygons) return;

    locations.forEach((loc) => {
      const color = RISK_COLORS[loc.current_risk] || '#10b981';
      const isSelected = selectedDistrict?.toLowerCase() === loc.district.toLowerCase();

      const marker = L.circleMarker([loc.latitude, loc.longitude], {
        radius: isSelected ? 22 : 16,
        color: isSelected ? '#ffffff' : color,
        weight: isSelected ? 3 : 2,
        fillColor: color,
        fillOpacity: isSelected ? 0.65 : 0.45
      });

      const btnId = `btn-select-${loc.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const popupContent = `
        <div style="font-family: sans-serif; font-size: 12px; min-width: 180px; padding: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="font-size: 13px; color: ${color};">${loc.district}</strong>
            <span style="background: ${color}22; color: ${color}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid ${color};">
              ${loc.current_risk}
            </span>
          </div>
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px;">${loc.state} &bull; Elev: ${loc.elevation_m}m</div>
          <div style="margin-bottom: 3px;">Failure Probability: <strong>${Math.round(loc.probability * 100)}%</strong></div>
          <div style="margin-bottom: 3px;">24h Rainfall: <strong>${loc.rainfall_24h_mm} mm</strong></div>
          <div style="margin-bottom: 3px;">Soil Saturation: <strong>${loc.soil_moisture_pct}%</strong></div>
          <div style="margin-bottom: 6px;">Priority: <strong style="color: #f59e0b;">${loc.emergency_priority}</strong> (Score: ${loc.priority_score})</div>
          <button id="${btnId}" style="width: 100%; background: #0284c7; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; font-weight: bold; cursor: pointer;">
            ${t('locate_on_map')}
          </button>
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on('popupopen', () => {
        const btn = document.getElementById(btnId);
        if (btn) {
          btn.onclick = () => {
            setSelectedDistrict(loc.district);
            setOpenDrawer(true);
          };
        }
      });

      marker.on('click', () => {
        setSelectedDistrict(loc.district);
        setOpenDrawer(true);
      });

      marker.addTo(group);
    });
  }, [locations, selectedDistrict, layerVisibility.riskPolygons, t]);

  // Render Strategic Highways
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const group = layerGroupsRef.current.highways;
    group.clearLayers();

    if (!layerVisibility.highways) return;

    highways.forEach((hw) => {
      if (!hw.geometry || !hw.geometry.coordinates) return;

      const latlngs = hw.geometry.coordinates.map(coord => [coord[1], coord[0]] as [number, number]);
      let color = '#38bdf8';
      let dashArray: string | undefined = undefined;

      if (hw.status === 'BLOCKED') {
        color = '#ef4444';
      } else if (hw.status === 'RESTRICTED') {
        color = '#f97316';
        dashArray = '5, 8';
      } else if (hw.status === 'AT_RISK') {
        color = '#eab308';
        dashArray = '6, 6';
      }

      const polyline = L.polyline(latlngs, {
        color: color,
        weight: 4,
        opacity: 0.85,
        dashArray: dashArray
      });

      polyline.bindPopup(`
        <div style="font-size: 12px; min-width: 170px;">
          <strong style="color: ${color}; font-size: 13px;">${hw.name}</strong>
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 4px;">${hw.route}</div>
          <div>Status: <strong>${hw.status}</strong></div>
          <div style="font-size: 11px; color: #f59e0b; margin-top: 4px;">${hw.traffic_advisory}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Alt: ${hw.alternate_evacuation_route}</div>
        </div>
      `);

      polyline.addTo(group);
    });
  }, [highways, layerVisibility.highways]);

  // Render Infrastructure
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const group = layerGroupsRef.current.infrastructure;
    group.clearLayers();

    if (!layerVisibility.infrastructure) return;

    infrastructure.forEach((inf) => {
      const isHospital = inf.type === 'HOSPITAL';
      const isShelter = inf.type === 'SHELTER';
      const color = isHospital ? '#38bdf8' : (isShelter ? '#10b981' : '#a855f7');

      const marker = L.circleMarker([inf.latitude, inf.longitude], {
        radius: 7,
        color: '#ffffff',
        weight: 1.5,
        fillColor: color,
        fillOpacity: 0.9
      });

      marker.bindPopup(`
        <div style="font-size: 12px; min-width: 160px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="color: ${color};">${inf.name}</strong>
            <span style="font-size: 10px; background: ${color}22; color: ${color}; padding: 1px 4px; border-radius: 3px;">
              ${inf.type}
            </span>
          </div>
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 3px;">Criticality: ${inf.criticality}</div>
          <div style="font-size: 11px;">Status: <strong>${inf.status || 'OPERATIONAL'}</strong></div>
          <div style="font-size: 11px; color: #cbd5e1;">Capacity: ${inf.capacity || inf.beds || 50}</div>
        </div>
      `);

      marker.addTo(group);
    });
  }, [infrastructure, layerVisibility.infrastructure]);

  // Render Citizen Reports
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const group = layerGroupsRef.current.reports;
    group.clearLayers();

    if (!layerVisibility.citizenReports) return;

    citizenReports.forEach((rep) => {
      const marker = L.circleMarker([rep.latitude, rep.longitude], {
        radius: 6,
        color: '#f97316',
        weight: 2,
        fillColor: '#fb923c',
        fillOpacity: 0.8
      });

      marker.bindPopup(`
        <div style="font-size: 12px; min-width: 170px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
            <strong style="color: #f97316;">${rep.category}</strong>
            <span style="font-size: 10px; background: #ea580c22; color: #f97316; padding: 1px 4px; border-radius: 3px;">
              ${rep.status}
            </span>
          </div>
          <div style="color: #cbd5e1; margin-bottom: 4px;">${rep.description}</div>
          <div style="font-size: 10px; color: #94a3b8;">Reported: ${new Date(rep.created_at).toLocaleTimeString()}</div>
        </div>
      `);

      marker.addTo(group);
    });
  }, [citizenReports, layerVisibility.citizenReports]);

  // Render SOS Incidents
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const group = layerGroupsRef.current.sos;
    group.clearLayers();

    if (!layerVisibility.sosBeacons) return;

    sosIncidents.filter(s => s.status !== 'RESOLVED' && s.status !== 'CANCELLED').forEach((sos) => {
      const escLevel = sos.current_escalation_level || 1;
      const beaconColor =
        escLevel >= 3 ? '#a855f7' :
        escLevel === 2 ? '#ef4444' :
        '#f59e0b';

      const radarIcon = L.divIcon({
        className: 'custom-sos-icon',
        html: `
          <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${beaconColor}; opacity: 0.7; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 14px; height: 14px; border-radius: 50%; background: ${beaconColor}; border: 2px solid #ffffff; box-shadow: 0 0 12px ${beaconColor};"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([sos.latitude, sos.longitude], { icon: radarIcon });

      const hospText = sos.risk_context?.nearest_hospital
        ? `<div style="font-size: 10px; color: #38bdf8; margin-top: 3px;">🏥 Nearest Hospital: ${sos.risk_context.nearest_hospital.name} (~${sos.risk_context.nearest_hospital.distance_km}km)</div>`
        : '';

      const shltText = sos.risk_context?.nearest_shelter
        ? `<div style="font-size: 10px; color: #34d399;">🛡️ Nearest Shelter: ${sos.risk_context.nearest_shelter.name} (~${sos.risk_context.nearest_shelter.distance_km}km)</div>`
        : '';

      marker.bindPopup(`
        <div style="font-size: 12px; min-width: 220px; color: #f8fafc; font-family: sans-serif;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: ${beaconColor}; font-size: 13px;">SOS BEACON: LEVEL ${escLevel}</strong>
            <span style="background: ${beaconColor}22; color: ${beaconColor}; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; border: 1px solid ${beaconColor};">
              ${sos.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div style="font-size: 11px; font-weight: bold; color: #ffffff; margin-bottom: 2px;">${sos.district}, ${sos.state}</div>
          <div style="color: #cbd5e1; margin-bottom: 4px; font-size: 11px; background: rgba(0,0,0,0.2); padding: 4px; border-radius: 4px;">${sos.message}</div>
          <div style="font-size: 11px; margin-bottom: 2px;">Trapped: <strong>${sos.people_affected} person(s)</strong> ${sos.contact_phone ? `&bull; Phone: ${sos.contact_phone}` : ''}</div>
          ${sos.risk_context?.probability !== undefined ? `<div style="font-size: 11px; color: #f87171;">Hazard Risk: <strong>${(sos.risk_context.probability * 100).toFixed(0)}% (${sos.risk_context.current_risk || 'CRITICAL'})</strong></div>` : ''}
          ${hospText}
          ${shltText}
          <div style="font-size: 10px; color: #94a3b8; margin-top: 4px; border-top: 1px solid #334155; padding-top: 4px;">
            GPS: (${sos.latitude.toFixed(4)}, ${sos.longitude.toFixed(4)}) &bull; ${new Date(sos.created_at).toLocaleTimeString()}
          </div>
        </div>
      `);

      marker.addTo(group);
    });
  }, [sosIncidents, layerVisibility.sosBeacons]);

  // Pan to selected district
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedDistrict) return;
    const found = locations.find(l => l.district.toLowerCase() === selectedDistrict.toLowerCase());
    if (found) {
      mapInstanceRef.current.setView([found.latitude, found.longitude], 9, { animate: true });
    }
  }, [selectedDistrict]);

  const horizons = ['Current', '+6h', '+12h', '+24h', '+48h', '+72h'];

  return (
    <div className={`relative w-full h-full flex flex-col bg-[#0b0f19] select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Top Floating Map Controls */}
      <div className="absolute top-3 left-3 z-10 flex flex-col space-y-2">
        <button
          onClick={() => setShowLayerPanel(!showLayerPanel)}
          className="bg-[#111827]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-[#334155] text-white text-xs font-semibold flex items-center space-x-2 shadow-lg hover:bg-[#1e293b] transition"
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>{t('gis_layer_mgr')}</span>
          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showLayerPanel ? 'rotate-90' : ''}`} />
        </button>

        {showLayerPanel && (
          <div className="bg-[#111827]/95 backdrop-blur-md p-3 rounded-xl border border-[#334155] text-white text-xs shadow-2xl w-64 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="font-bold text-slate-200 border-b border-slate-700/60 pb-1.5 flex items-center justify-between">
              <span>{t('active_geo_layers')}</span>
              <span className="text-[10px] text-slate-400 font-mono">NER-GIS</span>
            </div>

            <label className="flex items-center justify-between cursor-pointer py-1 hover:text-sky-300">
              <span className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                <span>{t('layer_risk_poly')}</span>
              </span>
              <input
                type="checkbox"
                checked={layerVisibility.riskPolygons}
                onChange={() => toggleLayer('riskPolygons')}
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1 hover:text-sky-300">
              <span className="flex items-center space-x-1.5">
                <Truck className="w-3.5 h-3.5 text-sky-400" />
                <span>{t('layer_highways')}</span>
              </span>
              <input
                type="checkbox"
                checked={layerVisibility.highways}
                onChange={() => toggleLayer('highways')}
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1 hover:text-sky-300">
              <span className="flex items-center space-x-1.5">
                <Hospital className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('layer_infra')}</span>
              </span>
              <input
                type="checkbox"
                checked={layerVisibility.infrastructure}
                onChange={() => toggleLayer('infrastructure')}
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1 hover:text-sky-300">
              <span className="flex items-center space-x-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                <span>{t('layer_citizen_rep')}</span>
              </span>
              <input
                type="checkbox"
                checked={layerVisibility.citizenReports}
                onChange={() => toggleLayer('citizenReports')}
                className="rounded accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1 hover:text-sky-300">
              <span className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-red-400" />
                <span>{t('layer_sos_beacons')}</span>
              </span>
              <input
                type="checkbox"
                checked={layerVisibility.sosBeacons}
                onChange={() => toggleLayer('sosBeacons')}
                className="rounded accent-sky-500"
              />
            </label>
          </div>
        )}
      </div>

      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="absolute top-3 right-14 z-10 bg-[#111827]/90 hover:bg-[#1e293b] p-2 rounded-lg border border-[#334155] text-slate-300 hover:text-white shadow-md transition"
        title="Toggle Fullscreen Map"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Bottom Floating Multi-Horizon Timeline Slider */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-[#111827]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#334155] shadow-2xl flex items-center space-x-3 text-xs max-w-[calc(100vw-32px)] overflow-x-auto">
        <div className="flex items-center space-x-1.5 text-slate-400 font-semibold pr-2 border-r border-slate-700">
          <Clock className="w-4 h-4 text-sky-400" />
          <span className="hidden sm:inline">{t('forecast_horizon')}</span>
        </div>

        <div className="flex items-center space-x-1">
          {horizons.map((h) => {
            const isActive = selectedHorizon === h;
            return (
              <button
                key={h}
                onClick={() => setSelectedHorizon(h)}
                className={`px-3 py-1 rounded-lg font-mono font-medium transition ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 scale-105'
                    : 'bg-[#1e293b] text-slate-300 hover:bg-[#334155] hover:text-white'
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 right-3 z-10 bg-[#111827]/90 backdrop-blur-md px-3 py-2 rounded-xl border border-[#334155] shadow-lg text-[11px] text-slate-300 space-y-1">
        <div className="font-bold text-[10px] text-slate-400 uppercase tracking-wider mb-1">{t('risk_scale')}</div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
          <span>{t('risk_low')}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]"></span>
          <span>{t('risk_watch')}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span>
          <span>{t('risk_warning')}</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
          <span>{t('risk_critical')}</span>
        </div>
      </div>
    </div>
  );
};
