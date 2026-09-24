import React from 'react';
import { Waves, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TankLevelGaugeProps {
  tankLevel: number; // -1 means NO ECHO
}

export const TankLevelGauge: React.FC<TankLevelGaugeProps> = ({ tankLevel }) => {
  const isNoEcho = tankLevel === -1;
  const levelPercent = isNoEcho ? 0 : Math.max(0, Math.min(100, tankLevel));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Reservoir Water Level
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
          isNoEcho
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            : levelPercent > 20
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
        }`}>
          {isNoEcho ? 'NO ECHO / UNAVAILABLE' : `${levelPercent}% FULL`}
        </span>
      </div>

      <div className="my-4 flex items-center gap-5">
        {/* Visual Tank Graphic */}
        <div className="w-16 h-28 rounded-lg border-2 border-slate-700 bg-slate-950 p-1 flex flex-col justify-end overflow-hidden relative shadow-inner">
          {/* Depth markings */}
          <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-1 text-[8px] text-slate-600 font-mono select-none">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>

          {isNoEcho ? (
            <div className="h-full w-full flex items-center justify-center bg-amber-950/20">
              <AlertTriangle className="h-6 w-6 text-amber-400 animate-pulse" />
            </div>
          ) : (
            <div
              className="w-full bg-gradient-to-t from-cyan-600 to-teal-400 rounded transition-all duration-700 relative overflow-hidden"
              style={{ height: `${levelPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/10 animate-pulse-subtle"></div>
            </div>
          )}
        </div>

        {/* Readout & Details */}
        <div className="flex-1">
          {isNoEcho ? (
            <div>
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>NO ECHO DETECTED</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                HC-SR04 ultrasonic echo timed out (-1). The tank reading is reported as unavailable.
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 border border-slate-700">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Manual pump controls remain fully unlocked</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                  {levelPercent}%
                </span>
                <span className="text-xs font-semibold text-slate-400">capacity</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                HC-SR04 ultrasonic rangefinder on GPIO 4 (Trig) &amp; GPIO 5 (Echo).
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-xs font-mono text-slate-400">
                <Waves className="h-3.5 w-3.5 text-cyan-400" />
                <span>Estimated depth: ~{Math.round(40 - (levelPercent / 100) * 35)} cm</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span>Ultrasonic HC-SR04</span>
        <span>GPIO 4 / GPIO 5</span>
      </div>
    </div>
  );
};
