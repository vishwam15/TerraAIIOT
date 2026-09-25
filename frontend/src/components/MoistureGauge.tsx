import React from 'react';
import { Droplet, Sparkles } from 'lucide-react';

interface MoistureGaugeProps {
  moisture: number; // 0 to 100
  rawADC?: number;
  target?: number;
  autoStartThreshold?: number;
}

export const MoistureGauge: React.FC<MoistureGaugeProps> = ({
  moisture,
  rawADC = 2250,
  target = 80,
  autoStartThreshold = 30
}) => {
  const clampedMoisture = Math.max(0, Math.min(100, moisture));

  // Categorization
  let statusText = 'Optimal Moisture';
  let statusColor = 'text-emerald-400';
  let badgeBg = 'bg-emerald-500/10 border-emerald-500/30';

  if (clampedMoisture < autoStartThreshold) {
    statusText = 'Dry Soil (Auto-Trigger Zone)';
    statusColor = 'text-amber-400';
    badgeBg = 'bg-amber-500/10 border-amber-500/30';
  } else if (clampedMoisture >= target) {
    statusText = 'Saturated / Target Reached';
    statusColor = 'text-cyan-400';
    badgeBg = 'bg-cyan-500/10 border-cyan-500/30';
  }

  // Calculate SVG stroke offset for semi-circle
  const radius = 80;
  const circumference = Math.PI * radius; // 180 degree semi-circle
  const progress = (clampedMoisture / 100) * circumference;
  const strokeDashoffset = circumference - progress;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel flex flex-col items-center justify-between text-center relative overflow-hidden">
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Soil Moisture Calibration
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${badgeBg} ${statusColor}`}>
          {statusText}
        </span>
      </div>

      {/* SVG Semi-Circle Gauge */}
      <div className="relative mt-4 flex items-center justify-center">
        <svg className="w-56 h-32 overflow-visible" viewBox="0 0 200 110">
          {/* Background track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#1e293b"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Zones guide: Dry (0-30), Optimal (30-80), Saturation (80-100) */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="18"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="35%" stopColor="#10b981" />
              <stop offset="80%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Readout */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">
              {clampedMoisture.toFixed(1)}
            </span>
            <span className="text-lg font-bold text-slate-400">%</span>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Droplet className="h-3 w-3 text-emerald-400" /> Analog Moisture
          </span>
        </div>
      </div>

      {/* Calibration details */}
      <div className="mt-4 w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-800 text-xs">
        <div className="p-2 rounded bg-slate-950/60 border border-slate-800 font-mono text-left">
          <span className="text-[10px] text-slate-500 uppercase block">Raw ADC (GPIO 1)</span>
          <span className="text-sm font-bold text-slate-200">{rawADC}</span>
        </div>
        <div className="p-2 rounded bg-slate-950/60 border border-slate-800 font-mono text-left">
          <span className="text-[10px] text-slate-500 uppercase block">Scale Mapping</span>
          <span className="text-xs text-slate-300">3000(Dry)→1200(Wet)</span>
        </div>
      </div>
    </div>
  );
};
