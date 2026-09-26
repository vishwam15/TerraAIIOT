import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IrrigationCycle } from '../types';
import { History, Download } from 'lucide-react';

export const IrrigationHistoryPage: React.FC = () => {
  const [cycles, setCycles] = useState<IrrigationCycle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const res = await api.getIrrigationHistory(50);
      if (res.success) {
        setCycles(res.data);
      }
    } catch (e) {
      console.error('Error fetching cycles:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCycles();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-sky-600" />
            <span>Closed-Loop Irrigation History &amp; Post-Learning Logs (Section 22)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Historical cycle outcomes: moisture gain, rate per second, and prediction error stored for retraining
          </p>
        </div>

        <a
          href={api.getIrrigationCsvUrl()}
          download="terrawave_irrigation_history.csv"
          className="px-4 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-700 text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-sky-200/80 transition-all duration-200 active:scale-95 shadow-xs shrink-0"
        >
          <Download className="h-4 w-4 text-sky-600" />
          <span>Export Irrigation CSV</span>
        </a>
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            Loading irrigation cycle records...
          </div>
        ) : cycles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            No irrigation cycles recorded yet. Trigger Pump 2 manually or enable Automatic Mode.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-sky-100/80">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-sky-50/90 text-slate-600 uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Date / Time</th>
                  <th className="py-2.5 px-3">Trigger Type</th>
                  <th className="py-2.5 px-3">Moisture Before</th>
                  <th className="py-2.5 px-3">Predicted Runtime</th>
                  <th className="py-2.5 px-3">Actual Runtime</th>
                  <th className="py-2.5 px-3">Moisture After</th>
                  <th className="py-2.5 px-3">Moisture Gain</th>
                  <th className="py-2.5 px-3">Gain / Sec</th>
                  <th className="py-2.5 px-3">Pred Error</th>
                  <th className="py-2.5 px-3">Model</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100 text-slate-700">
                {cycles.map((c) => (
                  <tr key={c._id} className="hover:bg-sky-50/50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-500">
                      {new Date(c.createdAt || c.startTime).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${c.triggerType === 'automatic'
                          ? 'bg-sky-50 text-sky-700 border-sky-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                        {c.triggerType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-amber-700">
                      {c.beforeMoisture}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {c.predictedRuntime}s
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">
                      {c.actualRuntime}s
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-700">
                      {c.afterMoisture !== undefined ? `${c.afterMoisture}%` : 'Calculating...'}
                    </td>
                    <td className="py-2.5 px-3 text-sky-700 font-bold">
                      {c.moistureGain !== undefined ? `+${c.moistureGain}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {c.gainPerSecond !== undefined ? `${c.gainPerSecond}%/s` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {c.predictionError !== undefined ? (
                        <span className={`font-semibold ${c.predictionError < 5 ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {c.predictionError}% pts
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-[10px]">
                      {c.modelUsed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
