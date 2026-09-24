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
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex items-start gap-3.5 shadow-sm">
      <div className="p-2 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5 border border-amber-200">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wider">
            Hard Mutual-Exclusion Safety Interlock Active
          </h4>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full border border-sky-200">
            <CheckCircle2 className="h-3 w-3 text-sky-600" /> Hardware + Backend Enforced
          </span>
        </div>
        <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
          <strong className="text-slate-900">Pump 1 (Tank Filling)</strong> and <strong className="text-slate-900">Pump 2 (Irrigation)</strong> cannot operate simultaneously under any condition. If either pump starts, the other is automatically cut off at both the backend state machine and the ESP32 GPIO logic level.
        </p>
        <div className="mt-2.5 flex items-center gap-3 text-xs font-mono">
          <span className={`px-2.5 py-0.5 rounded-md border font-semibold ${
            pump1Running
              ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200'
          }`}>
            GPIO 6 (Fill): {pump1Running ? 'ACTIVE (PUMP 2 LOCKED)' : 'STANDBY'}
          </span>
          <span className={`px-2.5 py-0.5 rounded-md border font-semibold ${
            pump2Running
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200'
          }`}>
            GPIO 7 (Irrigation): {pump2Running ? 'ACTIVE (PUMP 1 LOCKED)' : 'STANDBY'}
          </span>
        </div>
      </div>
    </div>
  );
};
