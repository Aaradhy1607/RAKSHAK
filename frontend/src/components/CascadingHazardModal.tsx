import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import type { CascadingImpactGraph } from '../types';
import {
  X,
  GitMerge,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const CascadingHazardModal: React.FC = () => {
  const { activeModal, setActiveModal } = useApp();
  const [graphData, setGraphData] = useState<CascadingImpactGraph | null>(null);

  useEffect(() => {
    if (activeModal === 'CASCADING_HAZARD') {
      api.getCascadingImpact().then(setGraphData);
    }
  }, [activeModal]);

  if (activeModal !== 'CASCADING_HAZARD') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/40 text-orange-400">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center space-x-2">
                <span>Cascading Hazard Propagation & Mitigation Chain</span>
                <span className="px-2 py-0.5 rounded bg-orange-950 text-orange-300 border border-orange-800 text-[10px] font-mono">
                  NER INTELLIGENCE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Visualizing how extreme orographic monsoon events cascade into infrastructure severance and village isolation.
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

        {/* Cascading Flow Diagram */}
        <div className="space-y-4">
          <div className="bg-[#162032] p-5 rounded-2xl border border-slate-700 space-y-4">
            <div className="font-bold text-xs text-slate-200 border-b border-slate-700 pb-2 flex items-center justify-between">
              <span>Failure Propagation Stages (Top-to-Bottom Downstream Impact)</span>
              <span className="text-[10px] text-orange-400 font-mono">DYNAMIC CHAIN</span>
            </div>

            <div className="space-y-3">
              {graphData?.nodes.map((node, index) => {
                const tierColor =
                  index === 0 ? 'border-sky-700 bg-sky-950/40 text-sky-300' :
                  index === 1 ? 'border-indigo-700 bg-indigo-950/40 text-indigo-300' :
                  index === 2 ? 'border-amber-700 bg-amber-950/40 text-amber-300' :
                  index === 3 ? 'border-orange-700 bg-orange-950/40 text-orange-300' :
                  'border-red-700 bg-red-950/40 text-red-300';

                return (
                  <div key={node.id} className="space-y-2">
                    <div className={`p-3.5 rounded-xl border flex items-center justify-between shadow-md ${tierColor}`}>
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center font-mono text-[10px] font-bold text-white shrink-0">
                          {index + 1}
                        </span>
                        <div>
                          <div className="font-bold text-xs text-white">{node.label}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Category: {node.category} &bull; Tier: {node.impact_tier}
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold">
                        {node.status}
                      </span>
                    </div>

                    {index < (graphData?.nodes.length || 0) - 1 && (
                      <div className="flex items-center justify-center py-0.5 text-slate-500">
                        <ArrowRight className="w-4 h-4 transform rotate-90 text-orange-400/70" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Targeted Mitigation Directives */}
          <div className="bg-[#162032] p-5 rounded-2xl border border-emerald-900/60 space-y-3">
            <div className="font-bold text-xs text-emerald-300 border-b border-slate-700/60 pb-2 flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Chain Interventions — How Authorities Break the Failure Propagation</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {graphData?.mitigation_interventions.map((mit, i) => (
                <div key={i} className="p-3 bg-slate-900/80 rounded-xl border border-slate-700 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{mit.stage}</span>
                    <span className="text-emerald-400 font-bold">{mit.effectiveness} Impact</span>
                  </div>
                  <p className="text-slate-200 font-medium text-xs leading-relaxed">
                    {mit.action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
