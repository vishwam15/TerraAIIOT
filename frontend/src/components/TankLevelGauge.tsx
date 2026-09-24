import React from 'react';
import { Waves, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TankLevelGaugeProps {
  tankLevel: number; // -1 means NO ECHO
}

export const TankLevelGauge: React.FC<TankLevelGaugeProps> = ({ tankLevel }) => {
  const isNoEcho = tankLevel === -1;
  const levelPercent = isNoEcho ? 0 : Math.max(0, Math.min(100, tankLevel));

  return (
    <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Reservoir Water Level
        </span>
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono ${
          isNoEcho
            ? 'bg-amber-50 text-amber-800 border-amber-200'
            : levelPercent > 20
              ? 'bg-sky-50 text-sky-800 border-sky-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {isNoEcho ? 'NO ECHO / UNAVAILABLE' : `${levelPercent}% FULL`}
        </span>
      </div>

      <div className="my-4 flex items-center gap-5">
        {/* Visual Tank Graphic */}
        <div className="w-16 h-28 rounded-lg border-2 border-slate-300 bg-slate-100 p-1 flex flex-col justify-end overflow-hidden relative shadow-inner">
          {/* Depth markings */}
          <div className="absolute inset-y-0 right-1 flex flex-col justify-between py-1 text-[8px] text-slate-400 font-mono select-none">
            <span>100</span>
            <span>75</span>
            <span>50</span>
            <span>25</span>
            <span>0</span>
          </div>

          {isNoEcho ? (
            <div className="h-full w-full flex items-center justify-center bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-500 animate-pulse" />
            </div>
          ) : (
            <div
              className="w-full bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-400 rounded transition-all duration-700 relative overflow-hidden shadow-sm"
              style={{ height: `${levelPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse-subtle"></div>
            </div>
          )}
        </div>

        {/* Readout & Details */}
        <div className="flex-1">
          {isNoEcho ? (
            <div>
              <div className="flex items-center gap-1.5 text-amber-700 font-bold text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>NO ECHO DETECTED</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                HC-SR04 ultrasonic echo timed out (-1). The tank reading is reported as unavailable.
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-[11px] text-slate-700 border border-slate-200 font-semibold">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
                <span>Manual pump controls remain fully unlocked</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                  {levelPercent}%
                </span>
                <span className="text-xs font-bold text-slate-500">capacity</span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                HC-SR04 ultrasonic rangefinder on GPIO 4 (Trig) &amp; GPIO 5 (Echo).
              </p>
              <div className="mt-2.5 flex items-center gap-2 text-xs font-mono text-sky-700 font-semibold">
                <Waves className="h-3.5 w-3.5 text-sky-600" />
                <span>Estimated depth: ~{Math.round(40 - (levelPercent / 100) * 35)} cm</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 font-mono flex items-center justify-between">
        <span>Ultrasonic HC-SR04</span>
        <span>GPIO 4 / GPIO 5</span>
      </div>
    </div>
  );
};
