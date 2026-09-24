import React, { useState } from 'react';
import {
  Play,
  Square,
  Power,
  RotateCcw,
  ShieldCheck,
  AlertOctagon,
  Clock,
  Sparkles
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
  const [manualDuration, setManualDuration] = useState<number>(3);

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
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Irrigation & Pump Control Panel</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct actuator controls with mutual exclusion enforcement
            </p>
          </div>

          {/* Mode Pill */}
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
            isAuto
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
              : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}>
            {isAuto ? 'MODE: AUTOMATIC (AI)' : 'MODE: MANUAL'}
          </span>
        </div>

        {/* Automatic Mode Switch Card */}
        <div className="mt-4 p-3.5 rounded-lg border border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isAuto ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-400'}`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Closed-Loop Automatic Mode</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  &lt;30% start • &gt;80% stop
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AI continuously evaluates moisture deficits and triggers timed micro-irrigation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAction('auto_enable', onEnableAuto)}
              disabled={isAuto || loading === 'auto_enable'}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                isAuto
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              ON
            </button>
            <button
              onClick={() => handleAction('auto_disable', onDisableAuto)}
              disabled={!isAuto || loading === 'auto_disable'}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                !isAuto
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
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
              ? 'border-cyan-500/50 bg-cyan-950/20 shadow-md shadow-cyan-950/50'
              : 'border-slate-800 bg-slate-950/40'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-400">ACTUATOR 2 • GPIO 7</span>
                <h4 className="text-sm font-bold text-white mt-0.5">Pump 2 — Irrigation Pump</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${
                isPump2Running
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isPump2Running ? 'RUNNING' : 'OFF'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3 text-slate-500" />
                Runtime: <strong className="text-slate-200">{status.pump2.runtimeSeconds}s</strong>
              </span>
              {status.activeCycle && (
                <span className="text-cyan-400 font-mono text-[11px]">
                  Target: {status.activeCycle.predictedRuntime}s
                </span>
              )}
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                onClick={() => handleAction('pump2_on', () => onTurnIrrigationOn(manualDuration))}
                disabled={isPump2Running || loading === 'pump2_on'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center gap-1.5 shadow-sm shadow-cyan-900/50 transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Irrigation ON</span>
              </button>
              <button
                onClick={() => handleAction('pump2_off', onTurnIrrigationOff)}
                disabled={!isPump2Running || loading === 'pump2_off'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Irrigation OFF</span>
              </button>
            </div>
            {isPump1Running && (
              <p className="mt-2 text-[10px] text-amber-400/80 font-mono flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 shrink-0" />
                Turning ON will instantly cut off Pump 1 (Mutual Exclusion).
              </p>
            )}
          </div>

          {/* Pump 1: Tank Filling Pump (GPIO 6) */}
          <div className={`p-4 rounded-xl border transition-all ${
            isPump1Running
              ? 'border-emerald-500/50 bg-emerald-950/20 shadow-md shadow-emerald-950/50'
              : 'border-slate-800 bg-slate-950/40'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-400">ACTUATOR 1 • GPIO 6</span>
                <h4 className="text-sm font-bold text-white mt-0.5">Pump 1 — Tank Filling Pump</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${
                isPump1Running
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isPump1Running ? 'RUNNING' : 'OFF'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3 text-slate-500" />
                Runtime: <strong className="text-slate-200">{status.pump1.runtimeSeconds}s</strong>
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Tank: {status.currentTankLevel === -1 ? 'NO ECHO' : `${status.currentTankLevel}%`}
              </span>
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                onClick={() => handleAction('pump1_on', onTurnFillOn)}
                disabled={isPump1Running || loading === 'pump1_on'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-900/50 transition-all"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Tank Fill ON</span>
              </button>
              <button
                onClick={() => handleAction('pump1_off', onTurnFillOff)}
                disabled={!isPump1Running || loading === 'pump1_off'}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Tank Fill OFF</span>
              </button>
            </div>
            {isPump2Running && (
              <p className="mt-2 text-[10px] text-amber-400/80 font-mono flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 shrink-0" />
                Turning ON will instantly cut off Pump 2 (Mutual Exclusion).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer telemetry summary */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono">
        <span>Current Moisture: <strong className="text-emerald-400">{status.currentMoisture}%</strong></span>
        <span>Last MQTT Cmd: <strong className="text-slate-200">{status.lastCommand}</strong></span>
        <span className="text-amber-400/90 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Mutual Exclusion: Hard Lock
        </span>
      </div>
    </div>
  );
};
