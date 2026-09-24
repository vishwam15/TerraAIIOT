import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface MutualExclusionBannerProps {
  pump1Running: boolean;
  pump2Running: boolean;
}

export const MutualExclusionBanner: React.FC<MutualExclusionBannerProps> = ({
  pump1Running,
  pump2Running
}) => {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 backdrop-blur-sm flex items-start gap-3.5 shadow-sm">
      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-amber-200 uppercase tracking-wider">
            Hard Mutual-Exclusion Safety Interlock Active
          </h4>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
            <CheckCircle2 className="h-3 w-3" /> Hardware + Backend Enforced
          </span>
        </div>
        <p className="text-xs text-amber-300/90 mt-1 leading-relaxed">
          <strong className="text-white">Pump 1 (Tank Filling)</strong> and <strong className="text-white">Pump 2 (Irrigation)</strong> cannot operate simultaneously under any condition. If either pump starts, the other is automatically cut off at both the backend state machine and the ESP32 GPIO logic level.
        </p>
        <div className="mt-2.5 flex items-center gap-4 text-xs font-mono">
          <span className={`px-2 py-0.5 rounded border ${
            pump1Running
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            GPIO 6 (Fill): {pump1Running ? 'ACTIVE (PUMP 2 LOCKED)' : 'STANDBY'}
          </span>
          <span className={`px-2 py-0.5 rounded border ${
            pump2Running
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            GPIO 7 (Irrigation): {pump2Running ? 'ACTIVE (PUMP 1 LOCKED)' : 'STANDBY'}
          </span>
        </div>
      </div>
    </div>
  );
};
