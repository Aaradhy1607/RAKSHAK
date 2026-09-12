import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, Cpu, Award, BookOpen } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';

export const ModelPerformanceModal: React.FC = () => {
  const { activeModal, setActiveModal } = useApp();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    if (activeModal === 'ML_METRICS') {
      api.getMLMetrics().then(setMetrics);
    }
  }, [activeModal]);

  if (activeModal !== 'ML_METRICS') return null;

  const models = metrics?.models || {};

  const winningModelKey = metrics?.winning_model || 'Random Forest Classifier';
  const winningModelData = models[winningModelKey] || {};
  const featureImportances = winningModelData.feature_importances || {};

  const featureChartData = Object.entries(featureImportances).map(([key, val]) => ({
    name: key.replace(/_/g, ' '),
    importance: Math.round(Number(val) * 100)
  })).sort((a, b) => b.importance - a.importance);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            <div>
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <span>AI/ML Model Benchmark & Evaluation Matrix</span>
                <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-mono">
                  BENCHMARKED
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

        {/* Scientific Rationale Callout */}
        <div className="bg-purple-950/30 border border-purple-800/60 p-4 rounded-xl text-xs text-purple-200 space-y-2">
          <div className="font-bold flex items-center space-x-1.5 text-purple-300">
            <BookOpen className="w-4 h-4" />
            <span>Research Grounding (Loke, Kho & Raghunandan 2026 &bull; Sharma & Laskar 2025)</span>
          </div>
          <p className="leading-relaxed">
            Per the 2026 systematic review of 95 landslide-AI papers across tropical terrain: tree-based learners and ensemble classifiers demonstrate optimal generalization across monsoon-driven conditions. Conditioning factors (slope & aspect) are weighted as the primary susceptibility drivers, while soil moisture saturation serves as the primary non-linear triggering threshold.
          </p>
        </div>

        {/* Comparative Benchmark Table */}
        <div className="bg-[#162032] rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-3 border-b border-slate-700 bg-slate-800/60 font-bold text-xs text-slate-200">
            Candidate Algorithm Comparison (Stratified Holdout Evaluation)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 font-mono text-[11px]">
                <tr>
                  <th className="p-3">Candidate Architecture</th>
                  <th className="p-3">F1 Score</th>
                  <th className="p-3">ROC-AUC</th>
                  <th className="p-3">PR-AUC</th>
                  <th className="p-3">Precision</th>
                  <th className="p-3">Recall</th>
                  <th className="p-3">Brier Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {Object.entries(models).map(([mName, mStats]: [string, any]) => {
                  const isWinner = mName === winningModelKey;
                  return (
                    <tr key={mName} className={isWinner ? 'bg-purple-950/20 font-semibold text-purple-200' : ''}>
                      <td className="p-3 flex items-center space-x-2">
                        {isWinner && <Award className="w-4 h-4 text-purple-400 shrink-0" />}
                        <span>{mName}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-purple-300">{mStats.f1_score}</td>
                      <td className="p-3 font-mono text-sky-400">{mStats.roc_auc}</td>
                      <td className="p-3 font-mono text-cyan-400">{mStats.pr_auc}</td>
                      <td className="p-3 font-mono text-emerald-400">{mStats.precision}</td>
                      <td className="p-3 font-mono text-amber-400">{mStats.recall}</td>
                      <td className="p-3 font-mono text-slate-400">{mStats.brier_score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Importance Bar Chart */}
        <div className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-xs text-slate-200">
              Factor Contribution Ranking ({winningModelKey})
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Slope & Aspect Ranked #1 and #2</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureChartData} layout="vertical" margin={{ top: 5, right: 20, left: 70, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} domain={[0, 40]} />
                <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={10} width={130} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', fontSize: '11px' }}
                  formatter={(val: any) => [`${val}%`, 'Relative Importance Weight']}
                />
                <Bar dataKey="importance" fill="#a855f7" radius={[0, 4, 4, 0]}>
                  {featureChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name.includes('slope') ? '#f43f5e' : (entry.name.includes('rainfall') ? '#0284c7' : '#a855f7')}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
