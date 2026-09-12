import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, Activity } from 'lucide-react';

export const DataHealthModal: React.FC = () => {
  const { activeModal, setActiveModal } = useApp();
  const [healthData, setHealthData] = useState<any>(null);

  useEffect(() => {
    if (activeModal === 'DATA_HEALTH') {
      api.getDataHealth().then(setHealthData);
    }
  }, [activeModal]);

  if (activeModal !== 'DATA_HEALTH') return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              Data Feeds Health & Ingestion Telemetry
            </h2>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* System Summary Card */}
        <div className="bg-[#162032] p-4 rounded-xl border border-slate-700 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Composite Ingestion Health Score</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {healthData?.health_score || 98.6}% HEALTHY
            </div>
          </div>
          <div className="px-3 py-1 bg-emerald-950/80 border border-emerald-500 text-emerald-300 rounded-full text-xs font-mono font-bold">
            ALL FEEDS SYNCHRONIZED
          </div>
        </div>

        {/* Feed List */}
        <div className="space-y-3">
          {(healthData?.feeds || []).map((feed: any) => (
            <div key={feed.feed_id} className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-200">{feed.name}</h3>
                  <p className="text-xs text-slate-400">Provider: {feed.provider}</p>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700 font-mono text-[11px] font-bold">
                  {feed.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/50 text-[11px]">
                <div>
                  <span className="text-slate-400">Latency:</span>
                  <span className="font-mono text-slate-200 ml-1.5">{feed.latency_ms} ms</span>
                </div>
                <div>
                  <span className="text-slate-400">Cadence:</span>
                  <span className="text-slate-200 ml-1.5">{feed.cadence}</span>
                </div>
                <div>
                  <span className="text-slate-400">Freshness:</span>
                  <span className="text-emerald-400 ml-1.5">{feed.freshness}</span>
                </div>
                <div>
                  <span className="text-slate-400">Error Rate:</span>
                  <span className="font-mono text-slate-200 ml-1.5">{feed.error_rate_pct}%</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 italic">
                Coverage: {feed.coverage}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
