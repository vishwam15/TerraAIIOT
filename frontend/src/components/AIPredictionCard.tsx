import React from 'react';
import { Cpu, ArrowRight, CheckCircle2, AlertCircle, Info, Sparkles } from 'lucide-react';
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
    <div className="rounded-xl border border-emerald-500/30 bg-slate-900/90 p-5 glass-panel-glow relative overflow-hidden flex flex-col justify-between">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>AI Irrigation Runtime Prediction</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ML INFERENCE
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Supervised regression model predicting exact pump seconds for soil saturation
              </p>
            </div>
          </div>

          {onRefreshPrediction && (
            <button
              onClick={onRefreshPrediction}
              disabled={isLoading}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="h-3 w-3 text-emerald-400" />
              <span>{isLoading ? 'Predicting...' : 'Re-calculate'}</span>
            </button>
          )}
        </div>

        {/* Prediction Metrics 4-Box Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Moisture</span>
            <div className="mt-1 text-xl font-extrabold text-white font-mono">{currentMoisture}%</div>
            <span className="text-[10px] text-slate-500 font-mono">Live Sensor Feed</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Target Moisture</span>
            <div className="mt-1 text-xl font-extrabold text-cyan-400 font-mono">{targetMoisture}%</div>
            <span className="text-[10px] text-slate-500 font-mono">Configurable Goal</span>
          </div>

          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 col-span-2 sm:col-span-1 shadow-inner">
            <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">Predicted Runtime</span>
            <div className="mt-1 text-2xl font-extrabold text-emerald-400 font-mono">
              {runtime.toFixed(2)} <span className="text-xs font-sans text-emerald-300">sec</span>
            </div>
            <span className="text-[10px] text-emerald-400/80 font-mono">Pump 2 Active Time</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Expected Post-Moisture</span>
            <div className="mt-1 text-xl font-extrabold text-white font-mono">{targetMoisture}%</div>
            <span className="text-[10px] text-slate-500 font-mono">Deficit: {deficit}% pts</span>
          </div>
        </div>

        {/* Model Spec and Confidence */}
        <div className="mt-4 p-3 rounded-lg bg-slate-950/40 border border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">ML Architecture:</span>
            <strong className="text-white font-mono">{modelName}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Model Validation Score:</span>
            <strong className="text-emerald-400 font-mono">{confidence}</strong>
          </div>
        </div>

        {/* Section 43: AI Irrigation Explanation Box */}
        <div className="mt-3.5 p-3 rounded-lg border border-slate-800 bg-slate-950/70 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-1">
            <Info className="h-3.5 w-3.5 text-cyan-400" />
            <span>AI Reasoning & Explanation (Viva Ready)</span>
          </div>
          <p className="text-slate-400 leading-relaxed font-sans">
            {prediction?.explanation || (
              `Current moisture is ${currentMoisture}%, with a deficit of ${deficit} percentage points toward the ${targetMoisture}% target. ` +
              `The Random Forest Regressor predicts ${runtime.toFixed(2)} seconds of pump actuation. ` +
              `Sensor feedback after irrigation will be stored into MongoDB for continuous retraining.`
            )}
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5 text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          Safety Bounds: Clamped [0.1s - 30.0s MAX_PUMP_RUNTIME]
        </span>
        <span className="font-mono text-slate-500">Version: {prediction?.model_version || 'v1.0'}</span>
      </div>
    </div>
  );
};
