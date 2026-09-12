import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  AlertTriangle,
  Camera,
  MapPin,
  PhoneCall,
  ShieldAlert,
  CheckCircle2,
  Radio,
  CloudRain,
  Info,
  Hospital,
  Compass,
  RefreshCw,
  UserCheck,
  FileText
} from 'lucide-react';
import type { SOSIncident, CitizenReport } from '../types';

export const CitizenView: React.FC = () => {
  const {
    locations,
    sosIncidents,
    triggerSOS,
    submitReport,
    isOffline,
    t
  } = useApp();

  const { user, isAuthenticated } = useAuth();

  const [sosStatus, setSosStatus] = useState<'IDLE' | 'CONFIRMING' | 'CAPTURING' | 'TRIGGERED'>('IDLE');
  const [sosMessage, setSosMessage] = useState('Landslide debris blocking road; urgent assistance requested.');
  const [peopleAffected, setPeopleAffected] = useState(1);
  const [phone, setPhone] = useState(user?.phone || '');
  const [activeSOSIncident, setActiveSOSIncident] = useState<SOSIncident | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [manualDistrict, setManualDistrict] = useState(user?.jurisdiction || (locations.length > 0 ? locations[0].district : ''));
  const [deviceCoords, setDeviceCoords] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'IDLE' | 'LOCATING' | 'AVAILABLE' | 'UNAVAILABLE'>('IDLE');

  const [showReportModal, setShowReportModal] = useState(false);
  const [category, setCategory] = useState('Landslide / Slope Collapse');
  const [reportDesc, setReportDesc] = useState('');
  const [reportDistrict, setReportDistrict] = useState(user?.jurisdiction || (locations.length > 0 ? locations[0].district : ''));
  const [reportPhone, setReportPhone] = useState(user?.phone || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [reportSuccessMsg, setReportSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Personal activity tracking
  const [myReports, setMyReports] = useState<CitizenReport[]>([]);
  const [mySOSList, setMySOSList] = useState<SOSIncident[]>([]);
  const [isLoadingPersonal, setIsLoadingPersonal] = useState(false);

  // Detect genuine device GPS coordinates with fallback notification
  const acquireDeviceGPS = useCallback(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      setGeoStatus('LOCATING');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDeviceCoords({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10.0
          });
          setGeoStatus('AVAILABLE');
          setGeoError(null);
        },
        (err) => {
          console.warn('Geolocation unavailable or denied', err);
          setGeoStatus('UNAVAILABLE');
          setGeoError('GPS Location unavailable or permission denied. Please select your region/district.');
        },
        { timeout: 8000, enableHighAccuracy: true }
      );
    } else {
      setGeoStatus('UNAVAILABLE');
      setGeoError('GPS hardware / API not supported. Please select your region/district.');
    }
  }, []);

  useEffect(() => {
    acquireDeviceGPS();
  }, [acquireDeviceGPS]);

  const loadPersonalActivity = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingPersonal(true);
    try {
      const [reps, soses] = await Promise.all([
        api.getMyCitizenReports(),
        api.getMySOSIncidents()
      ]);
      setMyReports(reps);
      setMySOSList(soses);
    } catch (err) {
      console.warn('Failed to load personal reports/sos:', err);
    } finally {
      setIsLoadingPersonal(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadPersonalActivity();
  }, [loadPersonalActivity]);

  const primaryRiskDistrict = locations.find(l => l.current_risk === 'CRITICAL' || l.current_risk === 'WARNING') || locations[0];

  // Match live SOS updates from AppContext if currently tracking
  const currentTrackedSOS = activeSOSIncident
    ? sosIncidents.find(s => s.id === activeSOSIncident.id) || activeSOSIncident
    : null;

  const executeSOSTrigger = async (coords: { lat: number; lon: number; accuracy: number }, districtName?: string) => {
    setSosStatus('CAPTURING');
    setGeoError(null);

    const targetDistrictName = districtName || manualDistrict || (primaryRiskDistrict ? primaryRiskDistrict.district : 'UNSPECIFIED_DISTRICT');
    const distObj = locations.find(l => l.district.toLowerCase() === targetDistrictName.toLowerCase());
    const finalDistrict = distObj ? distObj.district : targetDistrictName;
    const finalState = distObj ? distObj.state : 'North Eastern Region';

    try {
      const res = await triggerSOS({
        latitude: coords.lat,
        longitude: coords.lon,
        accuracy_m: coords.accuracy,
        emergency_type: 'CITIZEN_DISTRESS_LANDSLIDE',
        message: sosMessage,
        people_affected: peopleAffected,
        contact_phone: phone,
        district: finalDistrict,
        state: finalState
      });

      if (res.sos_incident) {
        setActiveSOSIncident(res.sos_incident);
      }
      setSosStatus('TRIGGERED');
      loadPersonalActivity();
    } catch (err: any) {
      setGeoError(`Transmission issue: ${err?.message || 'Check connection'}. Saved offline if network dropped.`);
      setSosStatus('CONFIRMING');
    }
  };

  const handleTriggerSOS = async () => {
    if (deviceCoords) {
      // Use genuine GPS coordinates
      await executeSOSTrigger(deviceCoords, manualDistrict);
    } else if (navigator.geolocation) {
      setSosStatus('CAPTURING');
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const liveCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            accuracy: pos.coords.accuracy || 10.0
          };
          setDeviceCoords(liveCoords);
          setGeoStatus('AVAILABLE');
          await executeSOSTrigger(liveCoords, manualDistrict);
        },
        async (err) => {
          console.warn('GPS permission denied or timeout', err);
          setGeoStatus('UNAVAILABLE');
          setGeoError('GPS Location unavailable. Using selected district center coordinates.');
          const distObj = locations.find(l => l.district.toLowerCase() === manualDistrict.toLowerCase()) || primaryRiskDistrict;
          if (distObj) {
            await executeSOSTrigger({
              lat: distObj.latitude,
              lon: distObj.longitude,
              accuracy: 50.0
            }, distObj.district);
          } else {
            setGeoError('Please select an active region before transmitting SOS.');
            setSosStatus('CONFIRMING');
          }
        },
        { timeout: 6000, enableHighAccuracy: true }
      );
    } else {
      const distObj = locations.find(l => l.district.toLowerCase() === manualDistrict.toLowerCase()) || primaryRiskDistrict;
      if (distObj) {
        await executeSOSTrigger({
          lat: distObj.latitude,
          lon: distObj.longitude,
          accuracy: 50.0
        }, distObj.district);
      } else {
        setGeoError('Please select an active region before transmitting SOS.');
        setSosStatus('CONFIRMING');
      }
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const targetDistrictName = reportDistrict || manualDistrict || (primaryRiskDistrict ? primaryRiskDistrict.district : '');
    const distObj = locations.find(l => l.district.toLowerCase() === targetDistrictName.toLowerCase()) || primaryRiskDistrict;

    const fd = new FormData();
    fd.append('category', category);
    fd.append('description', reportDesc);
    if (deviceCoords) {
      fd.append('latitude', String(deviceCoords.lat));
      fd.append('longitude', String(deviceCoords.lon));
      fd.append('accuracy_m', String(deviceCoords.accuracy));
    } else if (distObj) {
      fd.append('latitude', String(distObj.latitude));
      fd.append('longitude', String(distObj.longitude));
      fd.append('accuracy_m', '50.0');
    }
    if (distObj) {
      fd.append('district', distObj.district);
      fd.append('state', distObj.state);
    } else {
      fd.append('district', 'UNSPECIFIED_DISTRICT');
      fd.append('state', 'UNSPECIFIED_STATE');
    }
    fd.append('reporter_phone', reportPhone);
    if (selectedFile) {
      fd.append('image', selectedFile);
    }

    const res = await submitReport(fd);
    setIsSubmitting(false);
    setReportSuccessMsg(res.message || 'Report logged successfully!');
    loadPersonalActivity();
    setTimeout(() => {
      setShowReportModal(false);
      setReportSuccessMsg(null);
      setReportDesc('');
      setSelectedFile(null);
    }, 2500);
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto overflow-x-hidden min-h-0 min-w-0">
      <div className="max-w-2xl mx-auto p-4 space-y-6 select-none pb-16">
      {isOffline && (
        <div className="bg-amber-950/70 border border-amber-700/80 p-3 rounded-xl flex items-center space-x-2 text-amber-200 text-xs">
          <Info className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            <strong>Offline Mode Active:</strong> You can still report hazards and trigger SOS. Submissions will be cached safely on your device and transmitted immediately upon network recovery.
          </span>
        </div>
      )}

      {/* Emergency SOS Master Action Card */}
      <div className="bg-gradient-to-br from-red-950/90 to-slate-900 border-2 border-red-600/80 p-6 rounded-2xl shadow-2xl shadow-red-950/60 text-center space-y-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-900/60 border border-red-500 text-red-200 text-xs font-bold uppercase tracking-wider animate-pulse">
            <Radio className="w-3.5 h-3.5" />
            <span>RAKSHAK Rapid Emergency Dispatch</span>
          </div>

          {/* Honest Geolocation Sensor State */}
          {geoStatus === 'AVAILABLE' && deviceCoords ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600 text-[10px] font-mono">
              <MapPin className="w-3 h-3 text-emerald-400" />
              <span>LIVE GPS ({deviceCoords.lat.toFixed(3)}, {deviceCoords.lon.toFixed(3)})</span>
            </span>
          ) : geoStatus === 'LOCATING' ? (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-700 text-[10px] font-mono">
              <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
              <span>ACQUIRING GPS...</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-mono">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>LOCATION UNAVAILABLE &bull; SELECT REGION</span>
            </span>
          )}
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight">
          STRANDED OR IN DANGER?
        </h2>
        <p className="text-xs text-slate-300 max-w-md mx-auto">
          One tap instantly transmits your real GPS or chosen regional coordinates, attaches live AI Landslide Risk Intelligence, and simultaneously alerts the Level 1 Primary Response Team (SDRF & DDMA).
        </p>

        {sosStatus === 'IDLE' && (
          <button
            onClick={() => setSosStatus('CONFIRMING')}
            className="w-full sm:w-80 h-16 mx-auto bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-sm sm:text-base rounded-2xl shadow-xl shadow-red-600/40 flex items-center justify-center space-x-2 px-4 transition transform active:scale-95 cursor-pointer"
          >
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <span className="truncate">{t('sos_panic_btn')}</span>
          </button>
        )}

        {sosStatus === 'CAPTURING' && (
          <div className="bg-slate-900/90 border border-red-500 p-6 rounded-xl text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-red-400 animate-spin mx-auto" />
            <div className="font-bold text-sm text-white">Acquiring Live GPS & Attaching Risk Intelligence...</div>
            <p className="text-xs text-slate-400">Communicating with SDRF Command Grid & Telecom Dispatch</p>
          </div>
        )}

        {sosStatus === 'CONFIRMING' && (
          <div className="bg-slate-900/90 border border-red-500/80 p-4 rounded-xl space-y-3 text-left animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-sm text-red-400 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('sos_confirm_prompt')}</span>
            </h3>

            {geoError && (
              <div className="text-[11px] bg-amber-950/60 border border-amber-800 p-2 rounded text-amber-200">
                {geoError}
              </div>
            )}

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Target Emergency Region / District:</label>
              <select
                value={manualDistrict}
                onChange={(e) => setManualDistrict(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                {locations.map(l => (
                  <option key={l.id} value={l.district}>{l.district}, {l.state} ({l.current_risk} Risk)</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Emergency Situation / Distress Note:</label>
              <input
                type="text"
                value={sosMessage}
                onChange={(e) => setSosMessage(e.target.value)}
                placeholder="E.g. Rockfall debris blocked car; need extraction"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-300 block mb-1">People Trapped / Affected:</label>
                <select
                  value={peopleAffected}
                  onChange={(e) => setPeopleAffected(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value={1}>1 Person</option>
                  <option value={2}>2 - 4 People</option>
                  <option value={8}>5 - 15 People (Mini-Bus / Convoy)</option>
                  <option value={30}>15+ People (Mass Incident)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 block mb-1">Contact Mobile (Optional):</label>
                <input
                  type="tel"
                  placeholder="+91 94350 XXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                onClick={handleTriggerSOS}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg text-xs shadow-lg transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Transmit Emergency SOS Now</span>
              </button>
              <button
                onClick={() => setSosStatus('IDLE')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Live Emergency Context Card after SOS triggered */}
        {sosStatus === 'TRIGGERED' && currentTrackedSOS && (
          <div className="bg-slate-900/95 border-2 border-emerald-500/80 p-5 rounded-xl text-left space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
                <h3 className="font-black text-sm text-white">LIVE INCIDENT ACTIVE: {currentTrackedSOS.id}</h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                currentTrackedSOS.status === 'ACKNOWLEDGED' || currentTrackedSOS.status === 'RESPONSE_IN_PROGRESS'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                  : currentTrackedSOS.status === 'RESOLVED'
                  ? 'bg-slate-800 text-slate-300'
                  : 'bg-red-950 text-red-400 border border-red-600 animate-pulse'
              }`}>
                {currentTrackedSOS.status.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Attached Risk Context Card */}
            {currentTrackedSOS.risk_context && (
              <div className="bg-[#111827] border border-[#334155] p-3.5 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="font-semibold text-slate-200 flex items-center space-x-1">
                    <Compass className="w-3.5 h-3.5 text-sky-400" />
                    <span>Attached Risk Context</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {currentTrackedSOS.risk_context.data_freshness || 'Real-time Telemetry'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="bg-[#1e293b] p-2 rounded">
                    <span className="text-slate-400 block text-[10px]">Hazard Risk</span>
                    <strong className="text-red-400 text-xs">
                      {currentTrackedSOS.risk_context.current_risk || 'RISK ASSESSED'} (
                      {currentTrackedSOS.risk_context.probability !== undefined
                        ? `${(currentTrackedSOS.risk_context.probability * 100).toFixed(0)}%`
                        : 'DATA UNAVAILABLE'}
                      )
                    </strong>
                  </div>

                  <div className="bg-[#1e293b] p-2 rounded">
                    <span className="text-slate-400 block text-[10px]">24h Rain / Soil</span>
                    <strong className="text-slate-200 text-xs">
                      {currentTrackedSOS.risk_context.rainfall_24h_mm !== undefined && currentTrackedSOS.risk_context.soil_moisture_pct !== undefined
                        ? `${currentTrackedSOS.risk_context.rainfall_24h_mm} mm \u2022 ${currentTrackedSOS.risk_context.soil_moisture_pct}%`
                        : 'TELEMETRY UNAVAILABLE'}
                    </strong>
                  </div>

                  <div className="bg-[#1e293b] p-2 rounded col-span-2 sm:col-span-1">
                    <span className="text-slate-400 block text-[10px]">Model Confidence</span>
                    <strong className="text-sky-400 text-xs">
                      {currentTrackedSOS.risk_context.confidence !== undefined
                        ? `${(currentTrackedSOS.risk_context.confidence * 100).toFixed(0)}% (Ensemble)`
                        : 'N/A'}
                    </strong>
                  </div>
                </div>

                {/* Nearest Hospital & Shelter */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {currentTrackedSOS.risk_context.nearest_hospital && (
                    <div className="bg-[#1e293b]/70 border border-slate-700 p-2 rounded flex items-center space-x-2 text-[11px]">
                      <Hospital className="w-4 h-4 text-sky-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 truncate">{currentTrackedSOS.risk_context.nearest_hospital.name}</div>
                        <div className="text-[10px] text-slate-400">Hospital: ~{currentTrackedSOS.risk_context.nearest_hospital.distance_km} km away</div>
                      </div>
                    </div>
                  )}

                  {currentTrackedSOS.risk_context.nearest_shelter && (
                    <div className="bg-[#1e293b]/70 border border-slate-700 p-2 rounded flex items-center space-x-2 text-[11px]">
                      <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 truncate">{currentTrackedSOS.risk_context.nearest_shelter.name}</div>
                        <div className="text-[10px] text-slate-400">Shelter: ~{currentTrackedSOS.risk_context.nearest_shelter.distance_km} km away</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Status Timeline Progress */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Level 1 Primary Response Team (SDRF & DDMA) Alerted Simultaneously</span>
              </div>
              <div className="text-[11px] text-slate-400 pl-5">
                Current Escalation Level: <strong>Level {currentTrackedSOS.current_escalation_level || 1}</strong> &bull; GPS Location: ({currentTrackedSOS.latitude.toFixed(4)}, {currentTrackedSOS.longitude.toFixed(4)})
              </div>
            </div>

            {/* Helpline Actions */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-800">
              <a
                href="tel:1077"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call State Disaster Helpline (1077)</span>
              </a>
              <a
                href="tel:112"
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg shadow transition border border-slate-700"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call National Emergency (112)</span>
              </a>
              <button
                onClick={() => setSosStatus('IDLE')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition cursor-pointer ml-auto"
              >
                Dismiss View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Risk Near Me Card */}
      {primaryRiskDistrict && (
        <div className="bg-[#162032] border border-[#334155] p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm text-white">Current Landslide Risk in Your Region</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                primaryRiskDistrict.current_risk === 'CRITICAL' ? 'bg-red-950 text-red-400 border border-red-700' :
                primaryRiskDistrict.current_risk === 'WARNING' ? 'bg-orange-950 text-orange-400 border border-orange-700' :
                'bg-yellow-950 text-yellow-400 border border-yellow-700'
              }`}
            >
              {primaryRiskDistrict.current_risk}
            </span>
          </div>

          <div className="text-sm font-semibold text-slate-200">
            {primaryRiskDistrict.district}, {primaryRiskDistrict.state}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {primaryRiskDistrict.current_risk === 'CRITICAL' || primaryRiskDistrict.current_risk === 'WARNING'
              ? `Heavy monsoon precipitation (${primaryRiskDistrict.rainfall_24h_mm}mm in last 24h) is rapidly saturating steep slopes (${primaryRiskDistrict.slope_deg}°). High risk of roadside cut-slope failure.`
              : `Normal baseline terrain monitoring. 24h rainfall is ${primaryRiskDistrict.rainfall_24h_mm}mm.`}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="bg-slate-800/80 p-2 rounded-lg flex items-center space-x-2 text-slate-300">
              <CloudRain className="w-4 h-4 text-sky-400" />
              <span>Rain: <strong>{primaryRiskDistrict.rainfall_24h_mm} mm</strong></span>
            </div>
            <div className="bg-slate-800/80 p-2 rounded-lg flex items-center space-x-2 text-slate-300">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Soil Saturation: <strong>{primaryRiskDistrict.soil_moisture_pct}%</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* Citizen Hazard Reporting Quick Trigger */}
      <div className="bg-[#162032] border border-[#334155] p-5 rounded-2xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Camera className="w-4 h-4 text-orange-400" />
            <h3 className="font-bold text-sm text-white">Report Visible Hazard</h3>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
          >
            Submit Field Report
          </button>
        </div>
        <p className="text-xs text-slate-300">
          Spotted road cracks, falling boulders, or slope subsidence? Capture photo evidence and submit to assist DDMA emergency triage.
        </p>
      </div>

      {/* Authenticated Citizen / My Activity Tracker */}
      {isAuthenticated && (
        <div className="bg-[#162032] border border-[#334155] p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <div className="flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm text-white flex items-center space-x-1.5">
                  <span>My Distress Beacons & Field Reports</span>
                  <span className="px-2 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono">
                    {user?.name || user?.email}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Track the real-time authority response, verification, and dispatch status of your submitted incidents.
                </p>
              </div>
            </div>
            <button
              onClick={loadPersonalActivity}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
              title="Refresh My Activity"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPersonal ? 'animate-spin text-sky-400' : ''}`} />
            </button>
          </div>

          {/* My SOS Beacons */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <Radio className="w-3.5 h-3.5 text-red-400" />
              <span>Emergency SOS Beacons ({mySOSList.length})</span>
            </div>

            {mySOSList.length === 0 ? (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                No active SOS distress beacons recorded under your account.
              </div>
            ) : (
              <div className="space-y-2">
                {mySOSList.map((sos) => (
                  <div
                    key={sos.id}
                    className="bg-slate-900/80 border border-slate-700/80 p-3 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-red-400">{sos.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sos.status === 'ACKNOWLEDGED' || sos.status === 'RESPONSE_IN_PROGRESS'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                            : sos.status === 'RESOLVED'
                            ? 'bg-slate-800 text-slate-400'
                            : 'bg-red-950 text-red-400 border border-red-700 animate-pulse'
                        }`}>
                          {sos.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(sos.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2 rounded border border-slate-800/80">
                      {sos.message}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>District: <strong className="text-slate-200">{sos.district}</strong></span>
                      <span>People affected: <strong className="text-slate-200">{sos.people_affected}</strong></span>
                      <span>Assigned Team: <strong className="text-sky-300">{sos.assigned_team || 'SDRF Quick Response'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Field Hazard Reports */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-400" />
              <span>My Hazard Reports ({myReports.length})</span>
            </div>

            {myReports.length === 0 ? (
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
                You haven't filed any hazard reports yet.
              </div>
            ) : (
              <div className="space-y-2">
                {myReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="bg-slate-900/80 border border-slate-700/80 p-3 rounded-xl space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-200">{rep.category}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rep.verification_status === 'VERIFIED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-600' :
                          rep.verification_status === 'REJECTED' ? 'bg-red-950 text-red-400 border border-red-600' :
                          'bg-amber-950 text-amber-400 border border-amber-600'
                        }`}>
                          {rep.verification_status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(rep.created_at || rep.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300">
                      {rep.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Location: <strong className="text-slate-200">{rep.district}, {rep.state}</strong></span>
                      {rep.verified_by_officer && (
                        <span>Verified by: <strong className="text-emerald-300">{rep.verified_by_officer}</strong></span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for Citizen Hazard Reporting */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#162032] border border-[#334155] max-w-md w-full p-6 rounded-2xl space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <Camera className="w-5 h-5 text-orange-400" />
                <span>Field Hazard Report</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {reportSuccessMsg ? (
              <div className="p-4 bg-emerald-950/80 border border-emerald-500 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-bold text-sm text-white">{reportSuccessMsg}</div>
                <p className="text-xs text-slate-300">Preliminary AI classification in progress.</p>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">Hazard Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    <option value="Landslide / Slope Collapse">Landslide / Slope Collapse</option>
                    <option value="Road Blockage / Debris">Road Blockage / Debris</option>
                    <option value="Ground Crack / Tension Fissure">Ground Crack / Tension Fissure</option>
                    <option value="Rockfall / Boulders on Highway">Rockfall / Boulders on Highway</option>
                    <option value="Slope Subsidence / Sinking Ground">Slope Subsidence / Sinking Ground</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Region / District:</label>
                  <select
                    value={reportDistrict}
                    onChange={(e) => setReportDistrict(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                  >
                    {locations.map((loc) => (
                      <option key={loc.district} value={loc.district}>
                        {loc.district}, {loc.state}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[10px] text-slate-400">
                    {deviceCoords ? (
                      <span className="text-emerald-400">GPS Attached: {deviceCoords.lat.toFixed(4)}, {deviceCoords.lon.toFixed(4)}</span>
                    ) : (
                      <span className="text-amber-400">No GPS signal. Submitting with selected district centroid.</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Observation Details:</label>
                  <textarea
                    rows={3}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Describe slope condition, length of crack, or highway chokepoint..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Contact Phone (Optional):</label>
                  <input
                    type="tel"
                    value={reportPhone}
                    onChange={(e) => setReportPhone(e.target.value)}
                    placeholder="+91 94350 XXXXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">Upload Photo (Optional):</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-slate-300 text-xs"
                  />
                </div>

                <div className="flex space-x-2 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Uploading & Analyzing...' : 'Submit Report'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
