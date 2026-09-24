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
    <div className="rounded-xl border border-sky-200 bg-white p-5 glass-panel-glow relative overflow-hidden flex flex-col justify-between shadow-sm">
      {/* Top Banner */}
      <div>
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
                <span>AI Irrigation Runtime Prediction</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  ML INFERENCE
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Supervised regression model predicting exact pump seconds for soil saturation
              </p>
            </div>
          </div>

          {onRefreshPrediction && (
            <button
              onClick={onRefreshPrediction}
              disabled={isLoading}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5 text-sky-600" />
              <span>{isLoading ? 'Predicting...' : 'Re-calculate'}</span>
            </button>
          )}
        </div>

        {/* Prediction Metrics 4-Box Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Moisture</span>
            <div className="mt-1 text-xl font-extrabold text-slate-900 font-mono">{currentMoisture}%</div>
            <span className="text-[10px] text-slate-400 font-mono">Live Sensor Feed</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Moisture</span>
            <div className="mt-1 text-xl font-extrabold text-blue-700 font-mono">{targetMoisture}%</div>
            <span className="text-[10px] text-slate-400 font-mono">Configurable Goal</span>
          </div>

          <div className="p-3 rounded-xl bg-gradient-to-br from-sky-600 to-blue-700 text-white col-span-2 sm:col-span-1 shadow-md shadow-sky-600/20">
            <span className="text-[10px] font-bold text-sky-100 uppercase tracking-wider">Predicted Runtime</span>
            <div className="mt-1 text-2xl font-black font-mono">
              {runtime.toFixed(2)} <span className="text-xs font-sans text-sky-200">sec</span>
            </div>
            <span className="text-[10px] text-sky-200 font-mono">Pump 2 Active Time</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expected Post-Moisture</span>
            <div className="mt-1 text-xl font-extrabold text-slate-900 font-mono">{targetMoisture}%</div>
            <span className="text-[10px] text-slate-500 font-mono">Deficit: {deficit}% pts</span>
          </div>
        </div>

        {/* Model Spec and Confidence */}
        <div className="mt-4 p-3 rounded-xl bg-sky-50/70 border border-sky-200 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">ML Architecture:</span>
            <strong className="text-slate-900 font-mono font-bold">{modelName}</strong>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Model Validation Score:</span>
            <strong className="text-sky-800 font-mono font-bold">{confidence}</strong>
          </div>
        </div>

        {/* Section 43: AI Irrigation Explanation Box */}
        <div className="mt-3.5 p-3.5 rounded-xl border border-sky-200 bg-sky-50/60 text-xs">
          <div className="flex items-center gap-1.5 text-sky-900 font-bold mb-1">
            <Info className="h-4 w-4 text-sky-600" />
            <span>AI Reasoning &amp; Explanation (Viva Ready)</span>
          </div>
          <p className="text-slate-700 leading-relaxed font-sans">
            {prediction?.explanation || (
              `Current moisture is ${currentMoisture}%, with a deficit of ${deficit} percentage points toward the ${targetMoisture}% target. ` +
              `The Random Forest Regressor predicts ${runtime.toFixed(2)} seconds of pump actuation. ` +
              `Sensor feedback after irrigation will be stored into MongoDB for continuous retraining.`
            )}
          </p>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
          Safety Bounds: Clamped [0.1s - 30.0s MAX_PUMP_RUNTIME]
        </span>
        <span className="font-mono text-slate-400">Version: {prediction?.model_version || 'v1.0'}</span>
      </div>
    </div>
  );
};
