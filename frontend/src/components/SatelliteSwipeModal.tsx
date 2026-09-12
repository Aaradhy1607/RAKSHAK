import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Eye, Sliders, Info } from 'lucide-react';

export const SatelliteSwipeModal: React.FC = () => {
  const { activeModal, setActiveModal } = useApp();
  const [swipePos, setSwipePos] = useState<number>(50); // percentage

  if (activeModal !== 'SATELLITE_SWIPE') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>Sentinel-1 SAR / Optical Surface Deformation Swipe</span>
                <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-mono">
                  RADAR INTERFEROMETRY
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Callout */}
        <div className="bg-slate-800/80 border border-slate-700 p-3 rounded-xl flex items-center space-x-3 text-xs text-slate-300">
          <Info className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            <strong>Cloud-Penetrating C-Band SAR:</strong> Compares Pre-Monsoon Coherence Baseline vs Post-Downpour InSAR phase decorrelation along the vulnerable NH-27 Barail Mountain corridor. Drag the slider to reveal surface disturbance zones.
          </span>
        </div>

        {/* Interactive Swipe Canvas */}
        <div className="relative w-full h-80 rounded-xl overflow-hidden border border-slate-700 bg-slate-950 select-none">
          {/* AFTER (Background) */}
          <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-slate-900 to-amber-950 flex flex-col items-center justify-center text-center p-4">
            <div className="w-48 h-48 rounded-full bg-red-600/20 border-2 border-red-500 border-dashed animate-pulse flex items-center justify-center">
              <div className="p-3 bg-red-900/90 rounded-lg text-red-200 text-xs font-bold border border-red-500 shadow-xl">
                POST-MONSOON<br/>
                <span className="text-[10px] font-mono text-red-300">Severe InSAR Decorrelation</span><br/>
                <span className="text-[9px] text-white">Surface Slump &gt; 1.4m</span>
              </div>
            </div>
            <div className="absolute bottom-3 right-4 px-2 py-1 bg-red-950/80 rounded border border-red-700 text-red-300 text-xs font-mono font-bold">
              [AFTER] Post-Deluge SAR Pass (Orbit 128)
            </div>
          </div>

          {/* BEFORE (Foreground with clip-path) */}
          <div
            className="absolute inset-0 bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 flex flex-col items-center justify-center text-center p-4 transition-none"
            style={{ clipPath: `polygon(0 0, ${swipePos}% 0, ${swipePos}% 100%, 0 100%)` }}
          >
            <div className="w-48 h-48 rounded-full bg-emerald-600/10 border border-emerald-500/40 flex items-center justify-center">
              <div className="p-3 bg-emerald-900/80 rounded-lg text-emerald-200 text-xs font-bold border border-emerald-500 shadow-xl">
                PRE-MONSOON<br/>
                <span className="text-[10px] font-mono text-emerald-300">Stable Coherence Phase</span><br/>
                <span className="text-[9px] text-white">Deformation Rate &lt; 2mm/yr</span>
              </div>
            </div>
            <div className="absolute bottom-3 left-4 px-2 py-1 bg-emerald-950/80 rounded border border-emerald-700 text-emerald-300 text-xs font-mono font-bold">
              [BEFORE] Dry Baseline SAR Pass (Orbit 084)
            </div>
          </div>

          {/* Vertical Divider Line */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center shadow-2xl z-10"
            style={{ left: `${swipePos}%` }}
          >
            <div className="w-6 h-6 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg text-[10px] font-bold">
              <Sliders className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Range Slider Control */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>&larr; Show Pre-Monsoon Baseline</span>
            <span className="font-mono font-bold text-sky-400">{swipePos}%</span>
            <span>Show Post-Monsoon Deformation &rarr;</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={swipePos}
            onChange={(e) => setSwipePos(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
          />
        </div>
      </div>
    </div>
  );
};
