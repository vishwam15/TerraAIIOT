import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { IrrigationCycle } from '../types';
import { History, Droplet, ArrowRight, CheckCircle2, Download } from 'lucide-react';

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
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-400" />
            <span>Closed-Loop Irrigation History &amp; Post-Learning Logs (Section 22)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical cycle outcomes: moisture gain, rate per second, and prediction error stored for retraining
          </p>
        </div>

        <a
          href={api.getIrrigationCsvUrl()}
          download="terrawave_irrigation_history.csv"
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-slate-700 transition-all shrink-0"
        >
          <Download className="h-4 w-4 text-emerald-400" />
          <span>Export Irrigation CSV</span>
        </a>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel">
        {loading ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            Loading irrigation cycle records...
          </div>
        ) : cycles.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs font-mono">
            No irrigation cycles recorded yet. Trigger Pump 2 manually or enable Automatic Mode.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
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
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {cycles.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400">
                      {new Date(c.createdAt || c.startTime).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${c.triggerType === 'automatic'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                        {c.triggerType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-amber-400">
                      {c.beforeMoisture}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {c.predictedRuntime}s
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {c.actualRuntime}s
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-emerald-400">
                      {c.afterMoisture !== undefined ? `${c.afterMoisture}%` : 'Calculating...'}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-400 font-bold">
                      {c.moistureGain !== undefined ? `+${c.moistureGain}%` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {c.gainPerSecond !== undefined ? `${c.gainPerSecond}%/s` : '—'}
                    </td>
                    <td className="py-2.5 px-3">
                      {c.predictionError !== undefined ? (
                        <span className={`font-semibold ${c.predictionError < 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
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
