import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ModelComparisonItem } from '../types';
import { GitCompare, Check, Sparkles } from 'lucide-react';

export const ModelComparisonPage: React.FC = () => {
  const [comparisons, setComparisons] = useState<ModelComparisonItem[]>([]);
  const [activeModel, setActiveModel] = useState<string>('RandomForestRegressor');
  const [updating, setUpdating] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchComparisons = async () => {
    try {
      const res = await api.getModelComparisons();
      if (res.success) {
        setComparisons(res.data.comparison);
        setActiveModel(res.data.active_model);
      }
    } catch (e) {
      console.error('Error fetching model comparison:', e);
    }
  };

  useEffect(() => {
    fetchComparisons();
  }, []);

  const handleSelectModel = async (modelName: string) => {
    try {
      setUpdating(modelName);
      const res = await api.setActiveModel(modelName);
      if (res.success) {
        setActiveModel(modelName);
        setNotice(`Active model switched to ${modelName}`);
        await fetchComparisons();
      }
    } catch (err: any) {
      setNotice(`Failed to switch model: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-sky-600" />
          <span>Multi-Model Regression Comparison (Section 19)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Objective algorithmic comparison evaluated on identical train/test splits • Choose the active production estimator
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 text-xs flex items-center gap-2 font-mono">
          <Sparkles className="h-4 w-4 shrink-0 text-sky-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* Model Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {comparisons.map((item) => {
          const isActive = item.model === activeModel || item.is_active;

          return (
            <div
              key={item.model}
              className={`rounded-xl border p-5 glass-panel transition-all flex flex-col justify-between shadow-sm ${
                isActive
                  ? 'border-sky-400 bg-sky-50/80 ring-2 ring-sky-300 shadow-md shadow-sky-500/10'
                  : 'border-sky-100 bg-white hover:border-sky-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-mono font-bold text-slate-400">ESTIMATOR</span>
                  {isActive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-600 text-white flex items-center gap-1 font-mono shadow-sm">
                      <Check className="h-3 w-3" /> ACTIVE
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-900 mt-2 font-mono tracking-tight">
                  {item.model}
                </h3>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">R² Score:</span>
                    <strong className="text-sky-700 font-bold">{item.r2.toFixed(4)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">5-Fold CV R²:</span>
                    <strong className="text-blue-700">{item.cv_mean_r2.toFixed(4)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">MAE (Error):</span>
                    <span className="text-slate-900 font-bold">{item.mae.toFixed(4)}s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">RMSE:</span>
                    <span className="text-slate-700">{item.rmse.toFixed(4)}s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Train Latency:</span>
                    <span className="text-slate-700">{item.train_time_ms}ms</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Inference:</span>
                    <span className="text-amber-700 font-semibold">{item.inference_time_ms}ms</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleSelectModel(item.model)}
                  disabled={isActive || updating === item.model}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                    isActive
                      ? 'bg-sky-100 text-sky-800 border border-sky-300 cursor-default'
                      : 'bg-white hover:bg-sky-600 hover:text-white text-slate-700 border border-slate-200'
                  }`}
                >
                  {isActive ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-sky-700" />
                      <span>Current Active Model</span>
                    </>
                  ) : updating === item.model ? (
                    <span>Switching...</span>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                      <span>Set as Active Model</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Matrix Table */}
      <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Detailed Comparison Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-sky-50 text-slate-700 uppercase text-[10px] border-b border-sky-100">
              <tr>
                <th className="py-2.5 px-3">Model</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">MAE (sec)</th>
                <th className="py-2.5 px-3">MSE</th>
                <th className="py-2.5 px-3">RMSE</th>
                <th className="py-2.5 px-3">R² Score</th>
                <th className="py-2.5 px-3">CV Mean R²</th>
                <th className="py-2.5 px-3">Train (ms)</th>
                <th className="py-2.5 px-3">Inference (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {comparisons.map((c) => (
                <tr key={c.model} className="hover:bg-sky-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{c.model}</td>
                  <td className="py-2.5 px-3">
                    {c.model === activeModel ? (
                      <span className="text-sky-700 font-bold bg-sky-100 px-2 py-0.5 rounded border border-sky-200">ACTIVE</span>
                    ) : (
                      <span className="text-slate-400">STANDBY</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-sky-700 font-semibold">{c.mae.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.mse.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.rmse.toFixed(4)}</td>
                  <td className="py-2.5 px-3 font-bold text-blue-700">{c.r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.cv_mean_r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.train_time_ms}</td>
                  <td className="py-2.5 px-3 text-amber-700">{c.inference_time_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
