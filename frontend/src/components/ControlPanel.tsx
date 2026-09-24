import React, { useState } from 'react';
import {
  Play,
  Square,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';
import { PumpStatus } from '../types';

interface ControlPanelProps {
  status: PumpStatus;
  onTurnIrrigationOn: (duration?: number) => Promise<void>;
  onTurnIrrigationOff: () => Promise<void>;
  onTurnFillOn: () => Promise<void>;
  onTurnFillOff: () => Promise<void>;
  onEnableAuto: () => Promise<void>;
  onDisableAuto: () => Promise<void>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  status,
  onTurnIrrigationOn,
  onTurnIrrigationOff,
  onTurnFillOn,
  onTurnFillOff,
  onEnableAuto,
  onDisableAuto
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [manualDuration] = useState<number>(3);

  const handleAction = async (actionKey: string, fn: () => Promise<void>) => {
    try {
      setLoading(actionKey);
      await fn();
    } finally {
      setLoading(null);
    }
  };

  const isPump1Running = status.pump1.running;
  const isPump2Running = status.pump2.running;
  const isAuto = status.autoMode;

  return (
    <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel flex flex-col justify-between shadow-sm">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-wide flex items-center gap-2">
              <span>Irrigation &amp; Pump Control Panel</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct actuator controls with mutual exclusion enforcement
            </p>
          </div>

          {/* Mode Pill */}
          <span className={`px-3 py-1 text-xs font-bold rounded-full border shadow-sm ${
            isAuto
              ? 'bg-sky-100 text-sky-800 border-sky-300'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {isAuto ? 'MODE: AUTOMATIC (AI)' : 'MODE: MANUAL'}
          </span>
        </div>

        {/* Automatic Mode Switch Card */}
        <div className="mt-4 p-3.5 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/70 to-blue-50/40 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAuto ? 'bg-sky-500 text-white shadow-sm' : 'bg-slate-100 text-slate-500'}`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Closed-Loop Automatic Mode</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-white border border-sky-200 text-sky-800 font-mono font-bold">
                  &lt;30% start • &gt;80% stop
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                AI continuously evaluates moisture deficits and triggers timed micro-irrigation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAction('auto_enable', onEnableAuto)}
              disabled={isAuto || loading === 'auto_enable'}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                isAuto
                  ? 'bg-sky-600 text-white shadow-sky-600/20'
                  : 'bg-white text-slate-700 hover:bg-sky-50 border border-slate-200'
              }`}
            >
              ON
            </button>
            <button
              onClick={() => handleAction('auto_disable', onDisableAuto)}
              disabled={!isAuto || loading === 'auto_disable'}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isAuto
                  ? 'bg-slate-700 text-white'
                  : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              OFF
            </button>
          </div>
        </div>

        {/* Dual Actuator Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Pump 2: Irrigation Pump (GPIO 7) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isPump2Running
              ? 'border-sky-400 bg-sky-50/80 shadow-md shadow-sky-500/10'
              : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-sky-700">ACTUATOR 2 • GPIO 7</span>
                <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">Pump 2 — Irrigation Pump</h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border font-mono ${
                isPump2Running
                  ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                  : 'bg-slate-200/70 text-slate-600 border-slate-300'
              }`}>
                {isPump2Running ? 'RUNNING' : 'OFF'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Runtime: <strong className="text-slate-900 font-bold">{status.pump2.runtimeSeconds}s</strong>
              </span>
              {status.activeCycle && (
                <span className="text-sky-700 font-mono text-[11px] font-semibold">
                  Target: {status.activeCycle.predictedRuntime}s
                </span>
              )}
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                onClick={() => handleAction('pump2_on', () => onTurnIrrigationOn(manualDuration))}
                disabled={isPump2Running || loading === 'pump2_on'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center gap-1.5 shadow-sm shadow-sky-600/30 transition-all font-mono"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Irrigation ON</span>
              </button>
              <button
                onClick={() => handleAction('pump2_off', onTurnIrrigationOff)}
                disabled={!isPump2Running || loading === 'pump2_off'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-300 flex items-center justify-center gap-1.5 transition-all font-mono"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Irrigation OFF</span>
              </button>
            </div>
            {isPump1Running && (
              <p className="mt-2 text-[10px] text-amber-700 font-mono font-medium flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 shrink-0 text-amber-500" />
                Turning ON will instantly cut off Pump 1 (Mutual Exclusion).
              </p>
            )}
          </div>

          {/* Pump 1: Tank Filling Pump (GPIO 6) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isPump1Running
              ? 'border-blue-400 bg-blue-50/80 shadow-md shadow-blue-500/10'
              : 'border-slate-200 bg-slate-50/50'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-blue-700">ACTUATOR 1 • GPIO 6</span>
                <h4 className="text-sm font-extrabold text-slate-900 mt-0.5">Pump 1 — Tank Filling Pump</h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border font-mono ${
                isPump1Running
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-200/70 text-slate-600 border-slate-300'
              }`}>
                {isPump1Running ? 'RUNNING' : 'OFF'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                Runtime: <strong className="text-slate-900 font-bold">{status.pump1.runtimeSeconds}s</strong>
              </span>
              <span className="text-slate-600 font-mono text-[11px]">
                Tank: {status.currentTankLevel === -1 ? 'NO ECHO' : `${status.currentTankLevel}%`}
              </span>
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                onClick={() => handleAction('pump1_on', onTurnFillOn)}
                disabled={isPump1Running || loading === 'pump1_on'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center gap-1.5 shadow-sm shadow-blue-600/30 transition-all font-mono"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Tank Fill ON</span>
              </button>
              <button
                onClick={() => handleAction('pump1_off', onTurnFillOff)}
                disabled={!isPump1Running || loading === 'pump1_off'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-300 flex items-center justify-center gap-1.5 transition-all font-mono"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Tank Fill OFF</span>
              </button>
            </div>
            {isPump2Running && (
              <p className="mt-2 text-[10px] text-amber-700 font-mono font-medium flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 shrink-0 text-amber-500" />
                Turning ON will instantly cut off Pump 2 (Mutual Exclusion).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer telemetry summary */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 font-mono">
        <span>Current Moisture: <strong className="text-sky-700 font-bold">{status.currentMoisture}%</strong></span>
        <span>Last Command: <strong className="text-slate-800">{status.lastCommand}</strong></span>
        <span className="text-amber-800 font-semibold flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-600" /> Mutual Exclusion: Hard Lock
        </span>
      </div>
    </div>
  );
};
