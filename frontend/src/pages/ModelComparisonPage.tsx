import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ModelComparisonItem } from '../types';
import { GitCompare, Check, Sparkles, Clock, Zap, Award, LineChart as ChartIcon, RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';

export const ModelComparisonPage: React.FC = () => {
  const [comparisons, setComparisons] = useState<ModelComparisonItem[]>([]);
  const [activeModel, setActiveModel] = useState<string>('RandomForestRegressor');
  const [, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [minuteData, setMinuteData] = useState<any[]>([]);
  const [visibleModels, setVisibleModels] = useState<Record<string, boolean>>({
    RandomForestRegressor: true,
    GradientBoostingRegressor: true,
    DecisionTreeRegressor: true,
    LinearRegression: true
  });
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  const fetchMinuteAnalytics = async () => {
    try {
      setRefreshing(true);
      const res = await api.getMinuteAnalytics(30, 80);
      if (res.success && res.data) {
        // Flatten predictions for Recharts
        const formatted = res.data.map((d: any) => ({
          timeStr: d.timeStr,
          timestamp: d.timestamp,
          avgMoisture: d.avgMoisture,
          sampleCount: d.sampleCount,
          RandomForestRegressor: d.predictions?.RandomForestRegressor ?? 0,
          GradientBoostingRegressor: d.predictions?.GradientBoostingRegressor ?? 0,
          DecisionTreeRegressor: d.predictions?.DecisionTreeRegressor ?? 0,
          LinearRegression: d.predictions?.LinearRegression ?? 0
        }));
        setMinuteData(formatted);
      }
    } catch (err) {
      console.warn('Error fetching minute analytics:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchComparisons();
    fetchMinuteAnalytics();
    const interval = setInterval(fetchMinuteAnalytics, 30000); // refresh every 30s
    return () => clearInterval(interval);
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

  const toggleModelVisibility = (modelName: string) => {
    setVisibleModels(prev => ({ ...prev, [modelName]: !prev[modelName] }));
  };

  const macTooltipStyle = {
    backgroundColor: '#ffffff',
    borderColor: '#bae6fd',
    borderRadius: '0.75rem',
    fontSize: '0.75rem',
    color: '#0f172a',
    boxShadow: '0 8px 24px -4px rgba(2, 132, 199, 0.12)'
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-sky-600" />
            <span>Multi-Model Regression Comparison &amp; Per-Minute Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Per-minute time-based performance comparison across all 4 machine learning estimators • Evaluated on real sensor data
          </p>
        </div>

        <button
          onClick={fetchMinuteAnalytics}
          disabled={refreshing}
          className="px-3.5 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-mono font-bold flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh Minute Data</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-800 text-xs flex items-center gap-2 font-mono shadow-xs">
          <Sparkles className="h-4 w-4 shrink-0 text-sky-600" />
          <span>{notice}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🚀 PER-MINUTE TIME-BASED MULTI-MODEL PREDICTION GRAPH                     */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border-2 border-sky-300 bg-white/95 p-6 glass-panel shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-sky-100 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ChartIcon className="h-4 w-4 text-sky-600" />
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                Per-Minute ML Model Prediction Timeline (Time-Based)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-50 text-sky-700 border border-sky-200">
                1 Min / Tick
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Compares predicted pump runtimes (seconds) minute-by-minute as soil moisture fluctuates over time
            </p>
          </div>

          {/* Model Display Toggles */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <button
              onClick={() => toggleModelVisibility('RandomForestRegressor')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                visibleModels.RandomForestRegressor
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              <span>Random Forest</span>
            </button>

            <button
              onClick={() => toggleModelVisibility('GradientBoostingRegressor')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                visibleModels.GradientBoostingRegressor
                  ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-xs'
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              <span>Gradient Boosting</span>
            </button>

            <button
              onClick={() => toggleModelVisibility('DecisionTreeRegressor')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                visibleModels.DecisionTreeRegressor
                  ? 'bg-amber-50 text-amber-800 border-amber-300 shadow-xs'
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              <span>Decision Tree</span>
            </button>

            <button
              onClick={() => toggleModelVisibility('LinearRegression')}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                visibleModels.LinearRegression
                  ? 'bg-sky-50 text-sky-800 border-sky-300 shadow-xs'
                  : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-sky-500"></span>
              <span>Linear Regression</span>
            </button>
          </div>
        </div>

        {/* Per-Minute Chart */}
        <div className="h-80 sm:h-96 w-full pt-4">
          {minuteData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-mono">
              Loading minute-by-minute model analytics...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={minuteData} margin={{ top: 10, right: 30, left: -5, bottom: 10 }}>
                <defs>
                  <linearGradient id="moistureGradientMinute" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                
                {/* Per-Minute Timestamp on X-Axis */}
                <XAxis
                  dataKey="timeStr"
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: '#475569', fontFamily: 'monospace' }}
                  tickMargin={8}
                />

                {/* Left Axis: Soil Moisture % */}
                <YAxis
                  yAxisId="moisture"
                  domain={[0, 100]}
                  stroke="#0284c7"
                  tick={{ fontSize: 10, fill: '#0284c7', fontFamily: 'monospace' }}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                />

                {/* Right Axis: Predicted Runtime (Seconds) */}
                <YAxis
                  yAxisId="runtime"
                  orientation="right"
                  domain={[0, 'auto']}
                  stroke="#6b7280"
                  tick={{ fontSize: 10, fill: '#374151', fontFamily: 'monospace' }}
                  unit="s"
                />

                <Tooltip
                  contentStyle={macTooltipStyle}
                  formatter={(val: any, name: any) => {
                    if (name === 'Average Soil Moisture') return [`${val}%`, 'Soil Moisture'];
                    return [`${val}s`, name];
                  }}
                  labelFormatter={(label) => `Time (Minute): ${label}`}
                />

                {/* Target Moisture Line */}
                <ReferenceLine
                  yAxisId="moisture"
                  y={80}
                  stroke="#0284c7"
                  strokeDasharray="4 4"
                  label={{ value: 'Target 80%', fill: '#0284c7', fontSize: 10, position: 'insideTopLeft' }}
                />

                {/* Background Moisture Area */}
                <Area
                  yAxisId="moisture"
                  type="monotone"
                  dataKey="avgMoisture"
                  name="Average Soil Moisture"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  fill="url(#moistureGradientMinute)"
                  fillOpacity={1}
                />

                {/* Model 1: Random Forest (Green) */}
                {visibleModels.RandomForestRegressor && (
                  <Line
                    yAxisId="runtime"
                    type="monotone"
                    dataKey="RandomForestRegressor"
                    name="Random Forest Regressor"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 3, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {/* Model 2: Gradient Boosting (Purple) */}
                {visibleModels.GradientBoostingRegressor && (
                  <Line
                    yAxisId="runtime"
                    type="monotone"
                    dataKey="GradientBoostingRegressor"
                    name="Gradient Boosting Regressor"
                    stroke="#8b5cf6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#8b5cf6' }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {/* Model 3: Decision Tree (Amber) */}
                {visibleModels.DecisionTreeRegressor && (
                  <Line
                    yAxisId="runtime"
                    type="monotone"
                    dataKey="DecisionTreeRegressor"
                    name="Decision Tree Regressor"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    dot={{ r: 2.5, fill: '#f59e0b' }}
                    activeDot={{ r: 5 }}
                  />
                )}

                {/* Model 4: Linear Regression (Blue) */}
                {visibleModels.LinearRegression && (
                  <Line
                    yAxisId="runtime"
                    type="monotone"
                    dataKey="LinearRegression"
                    name="Linear Regression"
                    stroke="#0284c7"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 2.5, fill: '#0284c7' }}
                    activeDot={{ r: 5 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

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
      <div className="rounded-xl border border-sky-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Detailed Model Comparison Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-sky-50 text-slate-700">
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
                      <span className="text-emerald-600 font-bold">ACTIVE</span>
                    ) : (
                      <span className="text-slate-400">STANDBY</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-sky-700 font-semibold">{c.mae.toFixed(4)}s</td>
                  <td className="py-2.5 px-3">{c.mse.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.rmse.toFixed(4)}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-600">{c.r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.cv_mean_r2.toFixed(4)}</td>
                  <td className="py-2.5 px-3">{c.train_time_ms}</td>
                  <td className="py-2.5 px-3 text-amber-600">{c.inference_time_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
