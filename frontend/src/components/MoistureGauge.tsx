import React from 'react';
import { Droplet } from 'lucide-react';

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
  let statusColor = 'text-sky-800';
  let badgeBg = 'bg-sky-50 border-sky-200';
  
  if (clampedMoisture < autoStartThreshold) {
    statusText = 'Dry Soil (Auto-Trigger Zone)';
    statusColor = 'text-amber-800';
    badgeBg = 'bg-amber-50 border-amber-200';
  } else if (clampedMoisture >= target) {
    statusText = 'Saturated / Target Reached';
    statusColor = 'text-blue-800';
    badgeBg = 'bg-blue-50 border-blue-200';
  }

  // Calculate SVG stroke offset for semi-circle
  const radius = 80;
  const circumference = Math.PI * radius; // 180 degree semi-circle
  const progress = (clampedMoisture / 100) * circumference;
  const strokeDashoffset = circumference - progress;

  return (
    <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel flex flex-col items-center justify-between text-center relative overflow-hidden shadow-sm">
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Soil Moisture Calibration
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${badgeBg} ${statusColor}`}>
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
            stroke="#e2e8f0"
            strokeWidth="18"
            strokeLinecap="round"
          />

          {/* Zones guide */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradientBlue)"
            strokeWidth="18"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          <defs>
            <linearGradient id="gaugeGradientBlue" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="30%" stopColor="#0ea5e9" />
              <stop offset="80%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Readout */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
              {clampedMoisture.toFixed(1)}
            </span>
            <span className="text-lg font-bold text-slate-500">%</span>
          </div>
          <span className="text-xs text-sky-700 font-semibold flex items-center gap-1 font-mono">
            <Droplet className="h-3.5 w-3.5 text-sky-600 fill-current" /> Analog Moisture
          </span>
        </div>
      </div>

      {/* Calibration details */}
      <div className="mt-4 w-full grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
        <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 font-mono text-left">
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Raw ADC (GPIO 1)</span>
          <span className="text-sm font-bold text-slate-900">{rawADC}</span>
        </div>
        <div className="p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 font-mono text-left">
          <span className="text-[10px] text-slate-500 font-semibold uppercase block">Scale Mapping</span>
          <span className="text-xs text-slate-800 font-bold">3000(Dry)→1200(Wet)</span>
        </div>
      </div>
    </div>
  );
};
