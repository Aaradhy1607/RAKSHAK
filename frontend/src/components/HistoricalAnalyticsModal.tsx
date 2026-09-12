import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { X, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#38bdf8', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#a855f7', '#ec4899'];

export const HistoricalAnalyticsModal: React.FC = () => {
  const { activeModal, setActiveModal } = useApp();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (activeModal === 'HISTORICAL') {
      api.getHistoricalAnalytics().then(setData);
    }
  }, [activeModal]);

  if (activeModal !== 'HISTORICAL') return null;

  const stateData = data?.state_breakdown
    ? Object.entries(data.state_breakdown).map(([name, count]) => ({ name, count }))
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#334155] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl text-slate-100 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold text-white">
              Historical Landslide Inventory & Monsoon Seasonality (GSI & ISRO Records)
            </h2>
          </div>
          <button
            onClick={() => setActiveModal(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#162032] p-4 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400">Total Verified Historical Events</div>
            <div className="text-2xl font-bold text-sky-400 mt-1">
              {data?.total_verified_historical_incidents || 500} Records
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">NER Spatial Inventory (2015-2025)</div>
          </div>

          <div className="bg-[#162032] p-4 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400">Peak Failure Season</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">June - September</div>
            <div className="text-[10px] text-slate-400 mt-0.5">82% of incidents occur in peak SW monsoon</div>
          </div>

          <div className="bg-[#162032] p-4 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400">Primary Failure Trigger</div>
            <div className="text-2xl font-bold text-red-400 mt-1">&gt;120mm / 24h Rain</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Coupled with slope saturation inflection</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* State Distribution */}
          <div className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-slate-200">Historical Landslides by State (NER)</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stateData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', fontSize: '11px' }}
                    formatter={(val: any) => [`${val} events`, 'Incidents']}
                  />
                  <Bar dataKey="count" fill="#38bdf8" radius={[0, 4, 4, 0]}>
                    {stateData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Seasonality Trend */}
          <div className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3">
            <h3 className="font-bold text-xs text-slate-200">Monthly Landslide Occurrence Seasonality</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.monthly_seasonality || []} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#334155', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="incidents" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Trigger Distribution */}
        <div className="bg-[#162032] p-4 rounded-xl border border-slate-700 space-y-3">
          <h3 className="font-bold text-xs text-slate-200">Trigger Mechanism Breakdown</h3>
          <div className="space-y-2">
            {(data?.trigger_distribution || []).map((t: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">{t.trigger}</span>
                  <span className="font-mono font-bold text-sky-400">{t.percentage}%</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: `${t.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
