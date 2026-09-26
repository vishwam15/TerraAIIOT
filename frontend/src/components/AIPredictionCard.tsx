import React from 'react';
import { Cpu, CheckCircle2, Info, Sparkles } from 'lucide-react';
import { AIPredictionResult } from '../types';

interface AIPredictionCardProps {
  prediction: AIPredictionResult | null;
  targetMoisture: number;
  currentMoisture: number;
  onRefreshPrediction?: () => void;
  isLoading?: boolean;
}

export const AIPredictionCard: React.FC<AIPredictionCardProps> = ({
  prediction,
  targetMoisture,
  currentMoisture,
  onRefreshPrediction,
  isLoading
}) => {
  const deficit = Math.max(0, Math.round((targetMoisture - currentMoisture) * 10) / 10);
  const runtime = prediction ? prediction.predicted_runtime_seconds : 0;
  const modelName = prediction?.model || 'RandomForestRegressor';
  const confidence = prediction?.confidence_r2 !== null && prediction?.confidence_r2 !== undefined
    ? `${(prediction.confidence_r2 * 100).toFixed(1)}% (R² = ${prediction.confidence_r2.toFixed(3)})`
    : 'Not available';

  return (
    <div className="rounded-2xl border border-sky-100 bg-white/85 p-5 glass-panel-glow relative overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-sky-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-100 text-sky-700 shadow-xs">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                <span>AI Irrigation Runtime Prediction</span>
                {prediction?.is_fallback || prediction?.model?.toLowerCase().includes('fallback') ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    SAFE FALLBACK MODE
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                    ML ENGINE (PORT 8000)
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Supervised regression model predicting exact pump seconds for target saturation
              </p>
            </div>
          </div>

          {onRefreshPrediction && (
            <button
              onClick={onRefreshPrediction}
              disabled={isLoading}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 transition-all duration-200 active:scale-95 flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="h-3 w-3 text-sky-600" />
              <span>{isLoading ? 'Predicting...' : 'Re-calculate'}</span>
            </button>
          )}
        </div>

        {/* Prediction Metrics 4-Box Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Soil</span>
            <div className="mt-1 text-xl font-extrabold text-slate-900 font-mono">{currentMoisture}%</div>
            <span className="text-[10px] text-sky-600 font-medium">Live Feed</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Goal</span>
            <div className="mt-1 text-xl font-extrabold text-blue-700 font-mono">{targetMoisture}%</div>
            <span className="text-[10px] text-blue-600 font-medium">Set Objective</span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 col-span-2 sm:col-span-1 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Predicted Runtime</span>
            <div className="mt-1 text-xl font-extrabold text-emerald-700 font-mono">
              {runtime.toFixed(2)} <span className="text-xs font-sans text-emerald-600">sec</span>
            </div>
            <span className="text-[10px] text-emerald-700 font-medium">Pump 2 Optimal Active Time</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Moisture Deficit</span>
            <div className="mt-1 text-xl font-extrabold text-slate-800 font-mono">+{deficit}%</div>
            <span className="text-[10px] text-slate-500">To Saturation</span>
          </div>
        </div>

        {/* Model Spec and Confidence */}
        <div className="mt-3.5 p-3 rounded-xl bg-white/70 border border-sky-100 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Architecture:</span>
            <strong className="text-slate-900 font-mono text-[11px] bg-sky-50 px-2 py-0.5 rounded border border-sky-200/70">{modelName}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">R² Validation Score:</span>
            <strong className="text-emerald-700 font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/70">{confidence}</strong>
          </div>
        </div>

        {/* AI Irrigation Explanation Box */}
        <div className="mt-3 p-3.5 rounded-xl border border-sky-100 bg-sky-50/50 text-xs">
          <div className="flex items-center gap-1.5 text-slate-800 font-semibold mb-1">
            <Info className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-[11px] uppercase tracking-wider text-sky-900 font-bold">AI Reasoning & Physics Explanation</span>
          </div>
          <p className="text-slate-600 text-xs leading-relaxed font-sans">
            {prediction?.explanation || (
              `Current moisture is ${currentMoisture}%, with a deficit of ${deficit} percentage points toward the ${targetMoisture}% target. ` +
              `The Random Forest Regressor predicts ${runtime.toFixed(2)} seconds of pump actuation. ` +
              `Sensor feedback after irrigation will be stored into MongoDB for continuous retraining.`
            )}
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="mt-4 pt-3 border-t border-sky-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-600">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Safety Bounds: Clamped [0.1s - 30.0s MAX_PUMP_RUNTIME]
        </span>
        <span className="font-mono text-slate-400">Version: {prediction?.model_version || 'v1.0'}</span>
      </div>
    </div>
  );
};
