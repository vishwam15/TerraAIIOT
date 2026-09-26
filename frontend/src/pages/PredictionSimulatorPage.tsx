import React, { useState } from 'react';
import { api } from '../services/api';
import { AIPredictionResult } from '../types';
import { Cpu, Sparkles, Send, Info } from 'lucide-react';

interface PredictionSimulatorPageProps {
  initialMoisture?: number;
  initialTarget?: number;
}

export const PredictionSimulatorPage: React.FC<PredictionSimulatorPageProps> = ({
  initialMoisture = 40,
  initialTarget = 80
}) => {
  const [currentMoisture, setCurrentMoisture] = useState<number>(initialMoisture);
  const [targetMoisture, setTargetMoisture] = useState<number>(initialTarget);
  const [loading, setLoading] = useState<boolean>(false);
  const [prediction, setPrediction] = useState<AIPredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.predictPumpRuntime(currentMoisture, targetMoisture);
      if (res.success) {
        setPrediction(res.data);
      } else {
        setError('Prediction failed from ML Service.');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with backend.');
    } finally {
      setLoading(false);
    }
  };

  const deficit = Math.max(0, Math.round((targetMoisture - currentMoisture) * 10) / 10);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Cpu className="h-5 w-5 text-sky-600" />
          <span>Interactive AI Irrigation Runtime Simulator (Section 20)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Direct inference sandbox testing Random Forest regression predictions against configurable moisture targets
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Parameters Form (5 Cols) */}
        <div className="lg:col-span-5 rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-sky-100 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-600" />
            <span>Simulator Inputs</span>
          </h3>

          <form onSubmit={handlePredict} className="mt-5 space-y-5">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700 font-medium">Current Soil Moisture (%)</label>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{currentMoisture}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                step="1"
                value={currentMoisture}
                onChange={(e) => setCurrentMoisture(Number(e.target.value))}
                className="w-full accent-sky-600 h-2 bg-sky-100 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>5% (Extremely Dry)</span>
                <span>50%</span>
                <span>95% (Saturated)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700 font-medium">Target Soil Moisture (%)</label>
                <span className="font-mono text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{targetMoisture}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={targetMoisture}
                onChange={(e) => setTargetMoisture(Number(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-blue-100 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>50%</span>
                <span>80% (Standard)</span>
                <span>95%</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 font-medium">Calculated Moisture Deficit:</span>
                <span className="font-bold text-sky-800 font-mono text-sm">+{deficit}% points</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 hover:from-sky-600 hover:to-blue-700 text-white flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all duration-200 active:scale-[0.98] font-mono"
            >
              {loading ? (
                <span>Running ML Inference...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Predict Pump Runtime</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}
        </div>

        {/* Prediction Results & Viva Explanation (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {prediction ? (
            <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm">
              <div className="flex items-center justify-between pb-3.5 border-b border-sky-100">
                <span className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Python ML Inference Result (Port 8000)
                </span>
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  Version: {prediction.model_version}
                </span>
              </div>

              {/* 4 Cards Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Current</span>
                  <span className="text-xl font-bold text-slate-900 font-mono">{prediction.current_moisture}%</span>
                </div>
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Target</span>
                  <span className="text-xl font-bold text-blue-700 font-mono">{prediction.target_moisture}%</span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-bold">Deficit</span>
                  <span className="text-xl font-bold text-amber-700 font-mono">+{prediction.moisture_deficit}%</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 shadow-xs">
                  <span className="text-[10px] text-emerald-800 uppercase block font-bold">AI Runtime</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono">
                    {prediction.predicted_runtime_seconds}s
                  </span>
                </div>
              </div>

              {/* Viva Explanation Section (Section 43) */}
              <div className="mt-4 p-4 rounded-xl border border-sky-100 bg-sky-50/50">
                <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-mono">
                  <Info className="h-4 w-4 text-sky-600" />
                  <span>Viva Presentation Explanation</span>
                </h4>
                <div className="space-y-1.5 text-xs text-slate-600 font-sans leading-relaxed">
                  <p>• <strong className="text-slate-800">Current soil moisture:</strong> {prediction.current_moisture}%</p>
                  <p>• <strong className="text-slate-800">Target soil moisture:</strong> {prediction.target_moisture}%</p>
                  <p>• <strong className="text-slate-800">Moisture deficit:</strong> {prediction.moisture_deficit} percentage points</p>
                  <p className="text-emerald-700 font-bold">• AI predicted pump runtime: {prediction.predicted_runtime_seconds} seconds</p>
                  <p className="text-slate-500 mt-2 text-[11px] leading-normal">
                    After irrigation completes, sensor feedback will measure final moisture and compare against target to calculate actual moisture gain and prediction error for future retraining.
                  </p>
                </div>
              </div>

              {/* Model Attributes */}
              <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono pt-3 border-t border-sky-100 gap-2">
                <span>Model: <strong className="text-slate-900 bg-sky-50 px-2 py-0.5 rounded border border-sky-200/80">{prediction.model}</strong></span>
                <span>R² Confidence: <strong className="text-emerald-700 font-bold">{prediction.confidence_r2 ? (prediction.confidence_r2 * 100).toFixed(1) + '%' : 'N/A'}</strong></span>
                <span className="text-slate-600">Clamped: {prediction.safety_clamped ? 'YES (Limit)' : 'NO'}</span>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[320px] rounded-2xl border-2 border-dashed border-sky-200 bg-white/60 flex flex-col items-center justify-center p-8 text-center">
              <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 mb-3 shadow-xs">
                <Cpu className="h-8 w-8 text-sky-600" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">Ready for Inference</h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Select your soil moisture parameters on the left and click "Predict Pump Runtime" to query the active scikit-learn model.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
