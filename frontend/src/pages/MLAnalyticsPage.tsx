import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MLMetricsResponse } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  BarChart3,
  RefreshCw,
  Cpu,
  CheckCircle2
} from 'lucide-react';

export const MLAnalyticsPage: React.FC = () => {
  const [metricsData, setMetricsData] = useState<MLMetricsResponse | null>(null);
  const [, setLoading] = useState<boolean>(true);
  const [training, setTraining] = useState<boolean>(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await api.getMLMetrics();
      if (res.success) {
        setMetricsData(res.data);
      }
    } catch (e) {
      console.error('Error fetching metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRetrainOnSensors = async () => {
    try {
      setTraining(true);
      setTrainMessage(null);
      const res = await api.trainModel();
      if (res.success) {
        setTrainMessage(res.data?.message || 'Retrained model on actual sensor data successfully!');
        await fetchMetrics();
      }
    } catch (err: any) {
      setTrainMessage(`Retraining failed: ${err.message}`);
    } finally {
      setTraining(false);
    }
  };

  const metrics = metricsData?.metrics;

  // Format Feature Importance array for Recharts
  const featureData = metrics?.feature_importance
    ? Object.entries(metrics.feature_importance).map(([key, val]) => ({
      feature: key,
      importance: val
    })).sort((a, b) => b.importance - a.importance)
    : [];

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
      {/* Page Header with Real-Time Retrain CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-sky-600" />
            <span>AI / ML Analytics &amp; Supervised Learning Pipeline (Section 18)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real scikit-learn regression metrics without simulated epochs • Ground truth from connected hardware
          </p>
        </div>

        {/* Retrain on Actual Sensor Data Button */}
        <button
          onClick={handleRetrainOnSensors}
          disabled={training}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${training ? 'animate-spin' : ''}`} />
          <span>{training ? 'Training Model...' : 'Train Model on Sensor Data'}</span>
        </button>
      </div>

      {trainMessage && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 font-mono shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{trainMessage}</span>
        </div>
      )}

      {/* Model Spec Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-2xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-xs mac-card">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Model Architecture</span>
          <span className="text-sm font-bold text-slate-900 mt-1 block font-mono">
            {metricsData?.model || 'RandomForest'}
          </span>
          <span className="text-[10px] text-sky-600 font-mono">n_estimators=100</span>
        </div>

        <div className="p-4 rounded-2xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-xs mac-card">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Training Samples</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block font-mono">
            {metricsData?.training_samples || 0}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">MongoDB records</span>
        </div>

        <div className="p-4 rounded-2xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-xs mac-card">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">R² Score (Accuracy)</span>
          <span className="text-xl font-extrabold text-emerald-700 mt-1 block font-mono">
            {metrics?.r2 ? metrics.r2.toFixed(4) : 'N/A'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">CV: {metrics?.cv_mean_r2 ? metrics.cv_mean_r2.toFixed(3) : 'N/A'}</span>
        </div>

        <div className="p-4 rounded-2xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-xs mac-card">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">MAE (Mean Abs Error)</span>
          <span className="text-xl font-extrabold text-sky-700 mt-1 block font-mono">
            {metrics?.mae ? `${metrics.mae.toFixed(3)}s` : 'N/A'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Pump runtime err</span>
        </div>

        <div className="p-4 rounded-2xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-xs mac-card">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">RMSE (Root MSE)</span>
          <span className="text-xl font-extrabold text-indigo-700 mt-1 block font-mono">
            {metrics?.rmse ? `${metrics.rmse.toFixed(3)}s` : 'N/A'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">MSE: {metrics?.mse ? metrics.mse.toFixed(4) : 'N/A'}</span>
        </div>

        <div className="p-4 rounded-2xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-xs mac-card">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Inference Latency</span>
          <span className="text-xl font-extrabold text-amber-700 mt-1 block font-mono">
            {metrics?.inference_time_ms ? `${metrics.inference_time_ms}ms` : '<1ms'}
          </span>
          <span className="text-[10px] text-slate-500 font-mono">FastAPI latency</span>
        </div>
      </div>

      {/* Notice on Real Tree Regression vs Fake Epoch Loss */}
      <div className="p-4 rounded-2xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-xs flex items-start gap-3">
        <Cpu className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-slate-900">Rigorous ML Architecture Note:</strong> Random Forest Regressors optimize tree split impurity (MSE criteria) via bootstrap ensemble aggregation, not gradient descent backpropagation over epochs. In accordance with Section 18, we display authentic regression metrics (MAE, MSE, RMSE, R², Residuals, and Feature Importance) rather than deceptive fake epoch curves.
        </div>
      </div>

      {/* Row 2: Feature Importance Bar Chart & Error Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance */}
        <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm">
          <div className="pb-3 border-b border-sky-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Random Forest Feature Importance (%)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Relative contribution of physical features to predicted pump runtime</p>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={macTooltipStyle}
                  formatter={(val: any) => [`${val}%`, 'Importance']}
                />
                <Bar dataKey="importance" fill="#0284c7" radius={[0, 6, 6, 0]}>
                  {featureData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#0284c7' : index === 1 ? '#0ea5e9' : '#38bdf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Prediction Error / Residual Distribution */}
        <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm">
          <div className="pb-3 border-b border-sky-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Prediction Error Distribution (Residuals)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Histogram of error residuals between actual and predicted seconds</p>
          </div>

          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics?.error_distribution || []} margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="bin"
                  stroke="#94a3b8"
                  tick={{ fontSize: 9, fill: '#64748b' }}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={macTooltipStyle}
                  formatter={(val: any) => [val, 'Sample Count']}
                />
                <Bar dataKey="count" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Actual vs Predicted Runtime Scatter Plot */}
      <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-sky-100 gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Actual vs. Predicted Pump Runtime (Test Set Validation)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Points clustering along the diagonal line indicate high model predictive fidelity
            </p>
          </div>
          <span className="text-xs font-mono text-sky-800 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200 font-bold self-start sm:self-auto">
            Target Line: y = x (Ideal Model)
          </span>
        </div>

        <div className="h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                type="number"
                dataKey="actual"
                name="Actual Duration"
                unit="s"
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: '#64748b' }}
                domain={[0, 'auto']}
              />
              <YAxis
                type="number"
                dataKey="predicted"
                name="Predicted Duration"
                unit="s"
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: '#64748b' }}
                domain={[0, 'auto']}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={macTooltipStyle}
                formatter={(val: any, name: any) => [`${val}s`, name]}
              />
              <ReferenceLine stroke="#f59e0b" strokeDasharray="3 3" segment={[{ x: 0, y: 0 }, { x: 5, y: 5 }]} />
              <Scatter
                name="Test Samples"
                data={metrics?.actual_vs_pred || []}
                fill="#0284c7"
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
