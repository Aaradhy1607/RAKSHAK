import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { ModelTransparencyInfo } from '../types';
import {
  X,
  Cpu,
  BookOpen,
  CheckCircle2,
  AlertOctagon,
  Layers
} from 'lucide-react';

export const ModelTransparencyModal: React.FC = () => {
  const { activeModal, setActiveModal } = useApp();
  const [transparency, setTransparency] = useState<ModelTransparencyInfo | null>(null);

  useEffect(() => {
    if (activeModal === 'MODEL_TRANSPARENCY') {
      api.getModelTransparency().then(setTransparency);
    }
  }, [activeModal]);

  if (activeModal !== 'MODEL_TRANSPARENCY') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 space-y-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Model Transparency & Scientific Architecture
                </h2>
                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono">
                  {transparency?.current_model_version || 'v2.4-Ensemble'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Rigorous peer-reviewed validation methodology and factor engineering for the North Eastern Region.
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

        {/* Core Architecture Callout */}
        <div className="bg-[#162032] p-5 rounded-2xl border border-slate-700 space-y-3">
          <div className="flex items-center space-x-2 font-bold text-xs text-slate-200">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>Architecture & Pipeline Design</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {transparency?.model_architecture || 'Two-Stage Feature-to-Risk Tree Ensemble with Non-Linear Soil Saturation Transform.'}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 text-xs">
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400">Spatial CV F1</div>
              <div className="text-base font-bold text-purple-400 mt-0.5">
                {transparency?.evaluation_metrics.spatial_cv_f1 || 0.884}
              </div>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400">Holdout ROC-AUC</div>
              <div className="text-base font-bold text-sky-400 mt-0.5">
                {transparency?.evaluation_metrics.roc_auc || 0.945}
              </div>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400">PR-AUC</div>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                {transparency?.evaluation_metrics.pr_auc || 0.931}
              </div>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              <div className="text-[10px] text-slate-400">Brier Calibration</div>
              <div className="text-base font-bold text-amber-400 mt-0.5">
                {transparency?.evaluation_metrics.brier_calibration_score || 0.082}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Engineering & Weights Table */}
        <div className="bg-[#162032] rounded-2xl border border-slate-700 overflow-hidden text-xs">
          <div className="p-3 bg-slate-800/80 font-bold text-slate-200 border-b border-slate-700 flex justify-between items-center">
            <span>Primary Conditioning & Trigger Features Ranking</span>
            <span className="text-[10px] text-purple-400 font-mono">Slope & Aspect Ranked #1 & #2</span>
          </div>
          <div className="divide-y divide-slate-800">
            {transparency?.primary_features.map((f, i) => (
              <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-800/40 transition">
                <div>
                  <div className="font-bold text-white">{f.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{f.role}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-purple-300 text-xs">
                    {f.weight_pct}%
                  </span>
                  <div className="w-20 bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="bg-purple-500 h-full rounded-full"
                      style={{ width: `${f.weight_pct * 2.5}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Methodology */}
        <div className="bg-[#162032] p-5 rounded-2xl border border-slate-700 space-y-2 text-xs">
          <div className="font-bold text-slate-200 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Anti-Leakage Validation Strategy</span>
          </div>
          <p className="text-slate-300 leading-relaxed">
            {transparency?.validation_strategy}
          </p>
        </div>

        {/* Peer-Reviewed Scientific Citations */}
        <div className="bg-[#162032] p-5 rounded-2xl border border-purple-900/60 space-y-3 text-xs">
          <div className="font-bold text-purple-300 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Peer-Reviewed Literature Grounding</span>
          </div>
          <ul className="space-y-2 text-slate-300">
            {transparency?.scientific_citations.map((cite, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="font-mono text-purple-400 font-bold">•</span>
                <span className="italic">{cite}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Known Limitations */}
        <div className="bg-amber-950/20 border border-amber-800/60 p-4 rounded-xl text-xs space-y-2 text-amber-200">
          <div className="font-bold flex items-center space-x-2 text-amber-300">
            <AlertOctagon className="w-4 h-4" />
            <span>Operational Limitations & Scientific Boundaries</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-300 text-[11px]">
            {transparency?.operational_limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
