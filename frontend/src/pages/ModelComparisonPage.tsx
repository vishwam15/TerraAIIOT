import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ModelComparisonItem } from '../types';
import { GitCompare, Check, Sparkles, Clock, Zap, Award } from 'lucide-react';

export const ModelComparisonPage: React.FC = () => {
  const [comparisons, setComparisons] = useState<ModelComparisonItem[]>([]);
  const [activeModel, setActiveModel] = useState<string>('RandomForestRegressor');
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchComparisons = async () => {
    try {
      setLoading(true);
      const res = await api.getModelComparisons();
      if (res.success) {
        setComparisons(res.data.comparison);
        setActiveModel(res.data.active_model);
      }
    } catch (e) {
      console.error('Error fetching model comparison:', e);
    } finally {
      setLoading(false);
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
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-cyan-400" />
          <span>Multi-Model Regression Comparison (Section 19)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Objective algorithmic comparison evaluated on identical train/test splits • Choose the active production estimator
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 text-xs flex items-center gap-2 font-mono">
          <Sparkles className="h-4 w-4 shrink-0" />
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
              className={`rounded-2xl border p-5 backdrop-blur-xl transition-all duration-300 flex flex-col justify-between shadow-sm hover:shadow-md ${
                isActive
                  ? 'border-emerald-400/80 bg-emerald-50/60 ring-2 ring-emerald-400/20'
                  : 'border-sky-100 bg-white/80 hover:border-sky-300 hover:-translate-y-0.5'
              }`}
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                  <span className="text-xs font-mono font-bold text-slate-400 tracking-wider">ESTIMATOR</span>
                  {isActive && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center gap-1 font-mono shadow-xs">
                      <Check className="h-3 w-3" /> ACTIVE
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2 font-mono tracking-tight">
                  {item.model}
                </h3>

                <div className="mt-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-sky-100/60">
                    <span className="text-slate-500">R² Score:</span>
                    <strong className="text-emerald-600 font-bold">{item.r2.toFixed(4)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-sky-100/60">
                    <span className="text-slate-500">5-Fold CV R²:</span>
                    <strong className="text-sky-600 font-semibold">{item.cv_mean_r2.toFixed(4)}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-sky-100/60">
                    <span className="text-slate-500">MAE (Error):</span>
                    <span className="text-slate-800 font-semibold">{item.mae.toFixed(4)}s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-sky-100/60">
                    <span className="text-slate-500">RMSE:</span>
                    <span className="text-slate-600">{item.rmse.toFixed(4)}s</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-sky-100/60">
                    <span className="text-slate-500">Train Latency:</span>
                    <span className="text-slate-600">{item.train_time_ms}ms</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Inference:</span>
                    <span className="text-amber-600 font-medium">{item.inference_time_ms}ms</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-sky-100">
                <button
                  onClick={() => handleSelectModel(item.model)}
                  disabled={isActive || updating === item.model}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-sm ${
                    isActive
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                      : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white border border-sky-400/50 shadow-sky-500/20 hover:shadow-md'
                  }`}
                >
                  {isActive ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Current Active Model</span>
                    </>
                  ) : updating === item.model ? (
                    <span>Switching...</span>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 text-sky-200" />
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
      <div className="rounded-xl border border-sky-100 bg-sky-50">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Detailed Comparison Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-sky-50">
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
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {comparisons.map((c) => (
                <tr key={c.model} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{c.model}</td>
                  <td className="py-2.5 px-3">
                    {c.model === activeModel ? (
                      <span className="text-emerald-400 font-bold">ACTIVE</span>
                    ) : (
                      <span className="text-slate-500">STANDBY</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-cyan-400">{c.mae.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.mse.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.rmse.toFixed(4)}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">{c.r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.cv_mean_r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.train_time_ms}</td>
                  <td className="py-2.5 px-3 text-amber-400">{c.inference_time_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

