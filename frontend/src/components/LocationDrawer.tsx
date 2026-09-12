import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  X,
  TrendingUp,
  CloudRain,
  Activity,
  FileDown,
  ShieldCheck,
  Truck,
  Zap,
  Sparkles,
  Globe,
  RefreshCw,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip
} from 'recharts';

export const LocationDrawer: React.FC = () => {
  const {
    selectedLocationDetail,
    openDrawer,
    setOpenDrawer,
    t
  } = useApp();

  const [aiAdvisory, setAiAdvisory] = useState<any>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);

  if (!openDrawer || !selectedLocationDetail) return null;

  const loc = selectedLocationDetail;

  const handleFetchAIAdvisory = async () => {
    setLoadingAdvisory(true);
    try {
      const res = await api.getAIAdvisory(loc.district);
      setAiAdvisory(res);
    } catch {}
    setLoadingAdvisory(false);
  };

  const riskColor =
    loc.current_risk === 'CRITICAL' ? '#ef4444' :
    loc.current_risk === 'HIGH' ? '#ea580c' :
    loc.current_risk === 'WARNING' ? '#f59e0b' :
    loc.current_risk === 'WATCH' ? '#eab308' : '#10b981';

  const trendData = loc.forecast_timeline.map(h => ({
    name: h.horizon,
    probability: Math.round(h.probability * 100),
    rainfall: h.rainfall_forecast_mm,
    soilMoisture: h.soil_moisture_pct
  }));

  const handleDownloadReport = () => {
    window.open(`/api/reports-export/briefing?district_name=${encodeURIComponent(loc.district)}`, '_blank');
  };

  return (
    <div className="w-full sm:w-96 lg:w-[420px] max-w-[85vw] h-full bg-[#111827] border-l border-[#334155] flex flex-col text-slate-100 z-20 shadow-2xl overflow-y-auto shrink-0 min-h-0 min-w-0">
      {/* Header */}
      <div className="p-4 border-b border-[#334155] bg-[#0b0f19] sticky top-0 z-10 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span
              className="px-2 py-0.5 rounded text-[11px] font-bold border uppercase font-mono"
              style={{
                backgroundColor: `${riskColor}22`,
                color: riskColor,
                borderColor: riskColor
              }}
            >
              {loc.current_risk} RISK
            </span>
            <span className="text-xs text-slate-400 font-mono">[{loc.data_nature}]</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">{loc.district}</h2>
          <p className="text-xs text-slate-400">
            {loc.state} &bull; Pop: {loc.population.toLocaleString()} &bull; Elev: {loc.elevation_m}m
          </p>
        </div>

        <button
          onClick={() => setOpenDrawer(false)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-5 text-xs">
        {/* KPI Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#162032] p-3 rounded-xl border border-[#334155]">
            <div className="text-slate-400 text-[11px] font-medium flex items-center justify-between">
              <span>Failure Probability</span>
              <Activity className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-bold mt-1" style={{ color: riskColor }}>
              {Math.round(loc.probability * 100)}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              <span>Trend: {loc.risk_trend}</span>
            </div>
          </div>

          <div className="bg-[#162032] p-3 rounded-xl border border-[#334155]">
            <div className="text-slate-400 text-[11px] font-medium flex items-center justify-between">
              <span>Emergency Priority</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1 flex items-baseline space-x-1">
              <span>{loc.emergency_priority}</span>
              <span className="text-xs font-normal text-slate-400 font-mono">({loc.priority_score}/100)</span>
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5 truncate font-medium">
              {loc.emergency_priority === 'P1' ? 'Immediate Tactical Response' :
               loc.emergency_priority === 'P2' ? 'Critical Response Required' :
               loc.emergency_priority === 'P3' ? 'Elevated / Warning Monitoring' :
               loc.emergency_priority === 'P4' ? 'Advisory / Watch Monitoring' : 'Routine Surveillance'}
            </div>
          </div>
        </div>

        {/* Priority Explanation */}
        <div className="bg-amber-950/30 border border-amber-800/50 p-2.5 rounded-lg text-amber-200/90 text-[11px] leading-relaxed">
          <strong>EPS Formula Rationale:</strong> {loc.priority_explanation}
        </div>

        {/* Meteorological Trigger Stats */}
        <div className="bg-[#162032] p-3 rounded-xl border border-[#334155] space-y-2.5">
          <div className="font-bold text-slate-200 flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="flex items-center space-x-1.5">
              <CloudRain className="w-4 h-4 text-sky-400" />
              <span>Hydrological & Soil Triggers</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-normal">[OBSERVED]</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400">1h Intensity:</span>
              <span className="font-bold text-slate-200 ml-1.5">{loc.rainfall_1h_mm} mm/h</span>
            </div>
            <div>
              <span className="text-slate-400">6h Cumulative:</span>
              <span className="font-bold text-slate-200 ml-1.5">{loc.rainfall_6h_mm} mm</span>
            </div>
            <div>
              <span className="text-slate-400">24h Rainfall:</span>
              <span className="font-bold text-sky-400 ml-1.5">{loc.rainfall_24h_mm} mm</span>
            </div>
            <div>
              <span className="text-slate-400">72h ARI Index:</span>
              <span className="font-bold text-slate-200 ml-1.5">{loc.rainfall_72h_mm} mm</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-700/50">
            <div className="flex justify-between items-center mb-1 text-[11px]">
              <span className="text-slate-400">Soil Moisture Saturation:</span>
              <span className="font-bold text-slate-200">{loc.soil_moisture_pct}%</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  loc.soil_moisture_pct > 70 ? 'bg-red-500' : (loc.soil_moisture_pct > 55 ? 'bg-amber-500' : 'bg-emerald-500')
                }`}
                style={{ width: `${Math.min(100, loc.soil_moisture_pct)}%` }}
              />
            </div>
            <div className="text-[10px] text-slate-400 mt-1">
              State: <strong className="text-slate-300">{loc.soil_saturation_state}</strong> (Sharma-Laskar ~70% plateau rule active)
            </div>
          </div>
        </div>

        {/* SHAP Factor Contribution Waterfall */}
        <div className="bg-[#162032] p-3 rounded-xl border border-[#334155] space-y-2.5">
          <div className="font-bold text-slate-200 flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-purple-400" />
              <span>{t('drawer_factors_title')}</span>
            </span>
            <span className="text-[10px] text-purple-400 font-mono">XAI ENGINE</span>
          </div>

          <p className="text-[11px] text-slate-300 italic">
            "{loc.explanation_summary}"
          </p>

          <div className="space-y-2 pt-1">
            {loc.primary_factors.slice(0, 4).map((f) => (
              <div key={f.feature_key} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-300">{f.label}</span>
                  <span className="font-bold font-mono text-purple-300">+{f.contribution_pct}%</span>
                </div>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-sky-400 h-full rounded-full"
                    style={{ width: `${Math.min(100, f.contribution_pct * 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Multi-Horizon Risk Trend Chart */}
        <div className="bg-[#162032] p-3 rounded-xl border border-[#334155] space-y-2">
          <div className="font-bold text-slate-200 flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>{t('drawer_timeline_title')}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Now &rarr; +72h</span>
          </div>

          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="probGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={riskColor} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={riskColor} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', fontSize: '11px', borderRadius: '8px' }}
                  formatter={(val: any, name: any) => [`${val}%`, name === 'probability' ? 'Risk Probability' : name]}
                />
                <Area type="monotone" dataKey="probability" stroke={riskColor} fillOpacity={1} fill="url(#probGradient)" strokeWidth={2} dot={{ fill: riskColor, r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Infrastructure & Highway Impact Summary */}
        <div className="bg-[#162032] p-3 rounded-xl border border-[#334155] space-y-2">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5 border-b border-slate-700/60 pb-1.5">
            <Truck className="w-4 h-4 text-amber-400" />
            <span>Exposed Infrastructure & Corridors</span>
          </div>

          <div className="space-y-1.5 text-[11px]">
            {loc.nearby_highways.map((hw: any) => (
              <div key={hw.properties?.id || hw.id} className="p-1.5 bg-slate-800/80 rounded border border-slate-700 flex justify-between items-center">
                <span className="font-semibold text-sky-300">{hw.properties?.name || hw.name}</span>
                <span className="text-[10px] text-amber-400 font-mono uppercase">Vulnerable Lifeline</span>
              </div>
            ))}
            {loc.nearby_infrastructure.map((inf: any) => (
              <div key={inf.properties?.id || inf.id} className="p-1.5 bg-slate-800/80 rounded border border-slate-700 flex justify-between items-center">
                <span className="text-slate-200 truncate">{inf.properties?.name || inf.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono uppercase">{inf.properties?.type || inf.type}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Village Isolation & Lifeline Impact Card if present */}
        {loc.isolation_impact && (
          <div className="bg-[#162032] p-3 rounded-xl border border-indigo-800/70 space-y-2.5">
            <div className="font-bold text-indigo-300 flex items-center justify-between border-b border-slate-700/60 pb-1.5">
              <span className="flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-indigo-400" />
                <span>Village Isolation & Cut-Off Threat</span>
              </span>
              <span className="text-[10px] text-indigo-300 font-mono">
                {loc.isolation_impact.highway_id}
              </span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="text-amber-400 font-semibold flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Cut-Off Villages ({loc.isolation_impact.cut_off_villages.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {loc.isolation_impact.cut_off_villages.map((v, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-[10px] border border-slate-700">
                    {v}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="text-red-400 font-semibold flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Severed Critical Services:</span>
              </div>
              <ul className="list-disc pl-4 text-slate-300 text-[10px] space-y-0.5">
                {loc.isolation_impact.critical_services_severed.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-2 bg-slate-900/90 rounded-lg border border-slate-700/80 text-[10px] text-slate-300 flex items-center justify-between">
              <span>Isolated Pop Est: <strong className="text-white">{loc.isolation_impact.isolated_population_est.toLocaleString()}</strong></span>
              <span className="font-mono text-indigo-300 font-bold">
                Lifeline Score: {loc.isolation_impact.lifeline_connectivity_score || 85}/100
              </span>
            </div>
          </div>
        )}

        {/* AI Geotechnical Live Directive */}
        <div className="bg-[#162032] p-3 rounded-xl border border-purple-800/60 space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
            <span className="font-bold text-slate-200 flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Gemini 3.7 Disaster Advisory</span>
            </span>
            <button
              onClick={handleFetchAIAdvisory}
              disabled={loadingAdvisory}
              className="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-900 border border-purple-700 text-purple-300 text-[10px] font-mono flex items-center space-x-1 transition cursor-pointer"
            >
              {loadingAdvisory ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Globe className="w-3 h-3" />
                  <span>{aiAdvisory ? 'Regenerate' : t('btn_generate_ai_advisory')}</span>
                </>
              )}
            </button>
          </div>

          {aiAdvisory ? (
            <div className="p-2.5 bg-purple-950/20 border border-purple-900/50 rounded-lg space-y-1.5 text-[11px] leading-relaxed animate-in fade-in duration-200">
              <div className="text-[10px] text-purple-400 font-mono flex items-center justify-between">
                <span>[{aiAdvisory.source}]</span>
                {aiAdvisory.grounding_active && (
                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px]">
                    SEARCH GROUNDED
                  </span>
                )}
              </div>
              <p className="text-slate-200">{aiAdvisory.advisory}</p>
            </div>
          ) : (
            <p className="text-[11px] text-slate-400 italic">
              Tap '{t('btn_generate_ai_advisory')}' to synthesize an operational geotechnical directive with real-time IMD search grounding.
            </p>
          )}
        </div>

        {/* Recommended Authority Actions */}
        <div className="bg-[#162032] p-3 rounded-xl border border-[#334155] space-y-2">
          <div className="font-bold text-slate-200 flex items-center space-x-1.5 border-b border-slate-700/60 pb-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{t('drawer_actions_title')}</span>
          </div>

          <ol className="space-y-1.5 text-[11px] text-slate-300 list-decimal pl-4">
            {loc.recommended_authority_actions.map((act, idx) => (
              <li key={idx} className="leading-tight">{act}</li>
            ))}
          </ol>
        </div>

        {/* Export Briefing Button */}
        <button
          onClick={handleDownloadReport}
          className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-sky-600/30 cursor-pointer"
        >
          <FileDown className="w-4 h-4" />
          <span>{t('btn_download_briefing')}</span>
        </button>
      </div>
    </div>
  );
};
