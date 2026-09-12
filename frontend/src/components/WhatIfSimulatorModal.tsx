import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { WhatIfScenarioResult } from '../types';
import {
  X,
  Sliders,
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Radio,
  ExternalLink,
  ShieldAlert,
  Users,
  CloudRain
} from 'lucide-react';

export const WhatIfSimulatorModal: React.FC = () => {
  const { activeModal, setActiveModal, setSelectedDistrict, setOpenDrawer } = useApp();

  const [rainfallSurge, setRainfallSurge] = useState<number>(30); // +30%
  const [soilSaturation, setSoilSaturation] = useState<number>(75); // 75%
  const [blockedHighways, setBlockedHighways] = useState<string[]>(['NH-27']);
  const [targetState, setTargetState] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<WhatIfScenarioResult | null>(null);

  const reqIdRef = useRef<number>(0);

  const runSimulation = useCallback(async (
    surge: number,
    soil: number,
    highways: string[],
    state: string
  ) => {
    const currentReqId = ++reqIdRef.current;
    setIsSimulating(true);
    try {
      const multiplier = 1.0 + (surge / 100.0);
      const res = await api.simulateWhatIf({
        rainfall_multiplier: multiplier,
        soil_saturation_override: soil,
        blocked_highways: highways,
        target_state: state || undefined
      });
      if (currentReqId === reqIdRef.current) {
        setSimulationResult(res);
      }
    } catch (e) {
      if (currentReqId === reqIdRef.current) {
        console.error('What-If simulation failed', e);
      }
    } finally {
      if (currentReqId === reqIdRef.current) {
        setIsSimulating(false);
      }
    }
  }, []);

  // Initial simulation run on modal mount
  useEffect(() => {
    if (activeModal === 'WHAT_IF' && !simulationResult) {
      runSimulation(rainfallSurge, soilSaturation, blockedHighways, targetState);
    }
  }, [activeModal, runSimulation, rainfallSurge, soilSaturation, blockedHighways, targetState, simulationResult]);

  if (activeModal !== 'WHAT_IF') return null;

  const toggleHighway = (hwId: string) => {
    const newHighways = blockedHighways.includes(hwId)
      ? blockedHighways.filter(id => id !== hwId)
      : [...blockedHighways, hwId];
    setBlockedHighways(newHighways);
  };

  const handleManualRun = () => {
    runSimulation(rainfallSurge, soilSaturation, blockedHighways, targetState);
  };

  const handleReset = () => {
    setRainfallSurge(0);
    setSoilSaturation(55);
    setBlockedHighways([]);
    setTargetState('');
    runSimulation(0, 55, [], '');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  What-If Disaster Scenario Simulator Studio
                </h2>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 text-[10px] font-mono font-bold flex items-center space-x-1">
                  <Radio className="w-3 h-3 animate-pulse" />
                  <span>[SIMULATION]</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Explore hypothetical climate stress-tests, extreme precipitation surges, and lifeline disruptions across NER.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simulator Control Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Controls Panel */}
          <div className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-4 text-xs">
            <div className="font-bold text-slate-200 border-b border-slate-700 pb-2 flex items-center justify-between">
              <span>Scenario Parameters</span>
              <span className="text-[10px] text-slate-400 font-mono">HYPOTHETICAL STRESS TEST</span>
            </div>

            {/* Rainfall Surge Slider */}
            <div>
              <div className="flex justify-between mb-1.5 text-[11px]">
                <span className="text-slate-300">Monsoon Rainfall Surge:</span>
                <span className="font-bold font-mono text-sky-400">
                  {rainfallSurge >= 0 ? `+${rainfallSurge}%` : `${rainfallSurge}%`} above normal
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="150"
                step="5"
                value={rainfallSurge}
                onChange={(e) => setRainfallSurge(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>Reduced (-50%)</span>
                <span>Baseline (0%)</span>
                <span>Extreme (+150%)</span>
              </div>
            </div>

            {/* Soil Moisture Override Slider */}
            <div>
              <div className="flex justify-between mb-1.5 text-[11px]">
                <span className="text-slate-300">Soil Saturation Override:</span>
                <span className="font-bold font-mono text-amber-400">{soilSaturation}% (Plateau Index)</span>
              </div>
              <input
                type="range"
                min="30"
                max="95"
                step="1"
                value={soilSaturation}
                onChange={(e) => setSoilSaturation(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                <span>Dry/Normal (30%)</span>
                <span>70% Plateau</span>
                <span>Super-saturated (95%)</span>
              </div>
            </div>

            {/* Simulated Blocked Highways */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 text-[11px]">
                Simulate Highway Corridors Severed:
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {['NH-27', 'NH-10', 'NH-29', 'NH-37', 'NH-6', 'NH-13'].map((hw) => (
                  <label
                    key={hw}
                    className={`p-2 rounded-lg border text-[11px] flex items-center justify-between cursor-pointer transition ${
                      blockedHighways.includes(hw)
                        ? 'bg-red-950/60 border-red-700 text-red-200'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{hw}</span>
                    <input
                      type="checkbox"
                      checked={blockedHighways.includes(hw)}
                      onChange={() => toggleHighway(hw)}
                      className="accent-red-500"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* State Filter */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5 text-[11px]">
                Scope Region:
              </label>
              <select
                value={targetState}
                onChange={(e) => setTargetState(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="">All 8 NER States (Full Regional Simulation)</option>
                <option value="Assam">Assam</option>
                <option value="Meghalaya">Meghalaya</option>
                <option value="Sikkim">Sikkim</option>
                <option value="Manipur">Manipur</option>
                <option value="Nagaland">Nagaland</option>
                <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                <option value="Mizoram">Mizoram</option>
                <option value="Tripura">Tripura</option>
              </select>
            </div>

            {/* Actions */}
            <div className="pt-2 flex space-x-2">
              <button
                onClick={handleManualRun}
                disabled={isSimulating}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center space-x-2 transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isSimulating ? 'Recalculating Risk...' : 'Run Simulation'}</span>
              </button>
              <button
                onClick={handleReset}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition cursor-pointer"
                title="Reset to Baseline"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Results Projection Panel */}
          <div className="lg:col-span-2 space-y-4">
            {simulationResult ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Impact Delta KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-[#162032] p-3 rounded-xl border border-red-900/60">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Critical Zones</span>
                      <ShieldAlert className="w-3 h-3 text-red-400" />
                    </div>
                    <div className="text-xl font-black text-red-400 mt-0.5">
                      {simulationResult.projected_critical_count}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        (was {simulationResult.baseline_critical_count})
                      </span>
                    </div>
                    <div className="text-[9px] text-red-300 mt-0.5 font-mono">
                      {simulationResult.projected_critical_count >= simulationResult.baseline_critical_count
                        ? `+${simulationResult.projected_critical_count - simulationResult.baseline_critical_count} Escalated`
                        : `${simulationResult.projected_critical_count - simulationResult.baseline_critical_count} De-escalated`}
                    </div>
                  </div>

                  <div className="bg-[#162032] p-3 rounded-xl border border-amber-900/60">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Exposed Population</span>
                      <Users className="w-3 h-3 text-amber-400" />
                    </div>
                    <div className="text-xl font-black text-amber-400 mt-0.5">
                      {simulationResult.projected_exposed_pop.toLocaleString()}
                    </div>
                    <div className="text-[9px] text-amber-300 mt-0.5 font-mono">
                      {simulationResult.projected_exposed_pop >= simulationResult.baseline_exposed_pop
                        ? `+${(simulationResult.projected_exposed_pop - simulationResult.baseline_exposed_pop).toLocaleString()} At Risk`
                        : `${(simulationResult.projected_exposed_pop - simulationResult.baseline_exposed_pop).toLocaleString()} Reduced`}
                    </div>
                  </div>

                  <div className="bg-[#162032] p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Precipitation Delta</span>
                      <CloudRain className="w-3 h-3 text-sky-400" />
                    </div>
                    <div className="text-xl font-black text-sky-400 mt-0.5">
                      {simulationResult.rainfall_surge_pct >= 0 ? `+${simulationResult.rainfall_surge_pct}%` : `${simulationResult.rainfall_surge_pct}%`}
                    </div>
                    <div className="text-[9px] text-sky-300 mt-0.5 font-mono">
                      {simulationResult.rainfall_surge_pct > 50 ? 'Orographic Cloudburst' : 'Monsoon Forcing'}
                    </div>
                  </div>

                  <div className="bg-[#162032] p-3 rounded-xl border border-slate-700">
                    <div className="text-[10px] text-slate-400">Data Provenance</div>
                    <div className="text-sm font-black text-amber-400 mt-1 font-mono">
                      [SIMULATION]
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      Isolated from Baseline
                    </div>
                  </div>
                </div>

                {/* Cascading Disaster Impact Chain */}
                <div className="bg-[#162032] p-3.5 rounded-xl border border-slate-700 space-y-2">
                  <div className="font-bold text-xs text-slate-200 flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Projected Cascading Failure Chain</span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300 pl-2">
                    {simulationResult.cascading_impact_chain.map((chain, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="font-mono text-amber-400 font-bold">{idx + 1}.</span>
                        <span>{chain}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Projected Districts Comparison Matrix */}
                <div className="bg-[#162032] rounded-xl border border-slate-700 overflow-hidden text-xs">
                  <div className="p-3 bg-slate-800/80 font-bold text-slate-200 flex justify-between items-center border-b border-slate-700">
                    <div className="flex items-center space-x-2">
                      <span>Regional Landslide Susceptibility: Baseline vs. Simulation</span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-mono">Simulated Horizon: +24h</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-800">
                    {simulationResult.projected_locations.map((loc) => {
                      const simProbPct = Math.round(loc.probability * 100);
                      const baseProbPct = Math.round((loc.baseline_probability ?? loc.probability) * 100);
                      const deltaPct = loc.risk_delta_pct !== undefined ? loc.risk_delta_pct : (simProbPct - baseProbPct);

                      const riskBadge =
                        loc.current_risk === 'CRITICAL' ? 'bg-red-950 text-red-400 border-red-700' :
                        loc.current_risk === 'HIGH' ? 'bg-orange-950 text-orange-400 border-orange-700' :
                        loc.current_risk === 'WARNING' ? 'bg-amber-950 text-amber-400 border-amber-700' :
                        loc.current_risk === 'WATCH' ? 'bg-yellow-950 text-yellow-400 border-yellow-700' :
                        'bg-emerald-950 text-emerald-400 border-emerald-700';

                      const baseBadge =
                        loc.baseline_risk === 'CRITICAL' ? 'text-red-400' :
                        loc.baseline_risk === 'HIGH' ? 'text-orange-400' :
                        loc.baseline_risk === 'WARNING' ? 'text-amber-400' :
                        loc.baseline_risk === 'WATCH' ? 'text-yellow-400' :
                        'text-emerald-400';

                      return (
                        <div
                          key={loc.id}
                          className="p-2.5 flex items-center justify-between hover:bg-slate-800/60 transition"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-white flex items-center space-x-2">
                              <span>{loc.district}</span>
                              <span className="text-[10px] text-slate-400">({loc.state})</span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                              <span>Sim: Rain {loc.rainfall_24h_mm}mm, Soil {loc.soil_moisture_pct}%</span>
                              <span>&bull;</span>
                              <span>Base: {baseProbPct}% ({loc.baseline_risk ?? 'BASE'})</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2.5">
                            {/* Delta Indicator */}
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400 font-mono">
                                Base: <span className={baseBadge}>{baseProbPct}%</span>
                              </div>
                              <div className="flex items-center space-x-1 justify-end">
                                {deltaPct > 0 ? (
                                  <span className="text-[11px] font-bold font-mono text-red-400 flex items-center">
                                    <TrendingUp className="w-3 h-3 mr-0.5" />
                                    +{Math.abs(deltaPct)}%
                                  </span>
                                ) : deltaPct < 0 ? (
                                  <span className="text-[11px] font-bold font-mono text-emerald-400 flex items-center">
                                    <TrendingDown className="w-3 h-3 mr-0.5" />
                                    -{Math.abs(deltaPct)}%
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-slate-400 flex items-center">
                                    <Minus className="w-3 h-3 mr-0.5" />
                                    0%
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Simulated Result Badge */}
                            <div className="text-center min-w-[70px]">
                              <div className="font-mono text-xs font-bold text-white">
                                {simProbPct}% Prob
                              </div>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border block mt-0.5 ${riskBadge}`}>
                                {loc.current_risk}
                              </span>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedDistrict(loc.district);
                                setOpenDrawer(true);
                                setActiveModal(null);
                              }}
                              className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] transition cursor-pointer flex items-center space-x-1"
                              title="Inspect district detailed telemetry"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[300px] bg-[#162032] rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <Sliders className="w-10 h-10 text-slate-600 animate-pulse" />
                <div className="font-bold text-slate-300 text-sm">
                  Initializing What-If Scenario Matrix...
                </div>
                <p className="text-xs max-w-md text-slate-400">
                  Simulating multi-district landslide susceptibility spikes, highway lifeline cuts, and village connectivity loss using real geotechnical terrain conditioning matrices.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
