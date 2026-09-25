import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  Power,
  RotateCcw,
  ShieldCheck,
  AlertOctagon,
  Clock,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Cpu
} from 'lucide-react';
import { PumpStatus, AIPredictionResult } from '../types';

interface ControlPanelProps {
  status: PumpStatus;
  currentMoisture?: number;
  targetMoisture?: number;
  autoStartThreshold?: number;
  prediction?: AIPredictionResult | null;
  onTurnIrrigationOn: (duration?: number, forceManual?: boolean) => Promise<any>;
  onTurnIrrigationOff: () => Promise<any>;
  onTurnFillOn: () => Promise<any>;
  onTurnFillOff: () => Promise<any>;
  onEnableAuto: () => Promise<any>;
  onDisableAuto: () => Promise<any>;
  onUpdateTargetMoisture?: (target: number) => Promise<void>;
  onUpdateStartThreshold?: (threshold: number) => Promise<void>;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  status,
  currentMoisture = 40,
  targetMoisture = 80,
  autoStartThreshold = 30,
  prediction,
  onTurnIrrigationOn,
  onTurnIrrigationOff,
  onTurnFillOn,
  onTurnFillOff,
  onEnableAuto,
  onDisableAuto,
  onUpdateTargetMoisture,
  onUpdateStartThreshold
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [countdownRemaining, setCountdownRemaining] = useState<number | null>(null);
  const [targetInput, setTargetInput] = useState<number>(targetMoisture);
  const [startInput, setStartInput] = useState<number>(autoStartThreshold);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const countdownTimerRef = useRef<any>(null);

  useEffect(() => {
    setTargetInput(targetMoisture);
  }, [targetMoisture]);

  useEffect(() => {
    setStartInput(autoStartThreshold);
  }, [autoStartThreshold]);

  // Synchronize countdown when Pump 2 turns off
  useEffect(() => {
    if (!status.pump2.running && countdownRemaining !== null) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setCountdownRemaining(null);
    }
  }, [status.pump2.running]);

  const startCountdown = (duration: number) => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    const endTime = Date.now() + duration * 1000;
    setCountdownRemaining(duration);

    countdownTimerRef.current = setInterval(() => {
      const remainingMs = endTime - Date.now();
      if (remainingMs <= 0) {
        clearInterval(countdownTimerRef.current);
        setCountdownRemaining(0);
        setTimeout(() => setCountdownRemaining(null), 1500);
      } else {
        setCountdownRemaining(Math.max(0, Math.round(remainingMs / 100) / 10));
      }
    }, 100);
  };

  const handleAction = async (actionKey: string, fn: () => Promise<any>) => {
    try {
      setLoading(actionKey);
      await fn();
    } finally {
      setLoading(null);
    }
  };

  // Requirement 2: Manual AI-Controlled Irrigation Start
  const handleStartAIIrrigation = async () => {
    if (currentMoisture >= targetMoisture) {
      setFeedbackNotice(`Cannot start pump: Current moisture (${currentMoisture}%) is already at or above target (${targetMoisture}%). Predicted runtime = 0 seconds.`);
      setTimeout(() => setFeedbackNotice(null), 5000);
      return;
    }

    try {
      setLoading('pump2_ai');
      setFeedbackNotice(null);
      const res = await onTurnIrrigationOn(undefined, false);

      if (res && res.predictedRuntime) {
        startCountdown(res.predictedRuntime);
      } else if (prediction && prediction.predicted_runtime_seconds > 0) {
        startCountdown(prediction.predicted_runtime_seconds);
      }
    } finally {
      setLoading(null);
    }
  };

  // Requirement 11: Emergency Manual Override
  const handleForceManualOn = async () => {
    try {
      setLoading('pump2_force');
      await onTurnIrrigationOn(undefined, true);
    } finally {
      setLoading(null);
    }
  };

  const handleSaveThresholds = async () => {
    try {
      setLoading('thresholds');
      if (onUpdateTargetMoisture && targetInput !== targetMoisture) {
        await onUpdateTargetMoisture(targetInput);
      }
      if (onUpdateStartThreshold && startInput !== autoStartThreshold) {
        await onUpdateStartThreshold(startInput);
      }
      setFeedbackNotice(`Thresholds updated: Start <= ${startInput}%, Target = ${targetInput}%`);
      setTimeout(() => setFeedbackNotice(null), 4000);
    } finally {
      setLoading(null);
    }
  };

  const isPump1Running = status.pump1.running;
  const isPump2Running = status.pump2.running;
  const isAuto = status.autoMode;
  const deficit = Math.max(0, Math.round((targetMoisture - currentMoisture) * 10) / 10);
  const predictedSec = prediction?.predicted_runtime_seconds ?? (deficit > 0 ? Math.round((1.0 + deficit * 0.025) * 100) / 100 : 0);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel flex flex-col justify-between">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" />
              <span>Irrigation &amp; Pump Actuator Control Panel</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              AI-driven runtime execution with mutual exclusion and real-time countdown
            </p>
          </div>

          {/* Mode Pill */}
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full border font-mono ${isAuto
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
              : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}>
            {isAuto ? 'MODE: AUTOMATIC (AI)' : 'MODE: MANUAL (AI-DRIVEN)'}
          </span>
        </div>

        {/* Quick Configurable Thresholds Bar (Section 3, 10, 17) */}
        <div className="mt-4 p-3.5 rounded-lg border border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-white font-mono uppercase">Configurable Thresholds:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <label className="text-slate-400">Target Moisture:</label>
              <select
                value={targetInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTargetInput(val);
                  if (onUpdateTargetMoisture) onUpdateTargetMoisture(val);
                }}
                className="bg-slate-900 border border-slate-700 text-emerald-400 font-bold rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value={75}>75%</option>
                <option value={80}>80% (Default)</option>
                <option value={85}>85%</option>
                <option value={90}>90%</option>
                <option value={95}>95%</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-400">Auto Start Trigger:</label>
              <select
                value={startInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStartInput(val);
                  if (onUpdateStartThreshold) onUpdateStartThreshold(val);
                }}
                className="bg-slate-900 border border-slate-700 text-cyan-400 font-bold rounded px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value={20}>20%</option>
                <option value={25}>25%</option>
                <option value={30}>30% (Default)</option>
                <option value={35}>35%</option>
                <option value={40}>40%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Feedback Alert Notice */}
        {feedbackNotice && (
          <div className="mt-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{feedbackNotice}</span>
            </div>
            <button onClick={() => setFeedbackNotice(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

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
                  &lt;={autoStartThreshold}% start • &gt;={targetMoisture}% stop
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                AI continuously monitors moisture deficits and triggers pump runtime automatically
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAction('auto_enable', onEnableAuto)}
              disabled={isAuto || loading === 'auto_enable'}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${isAuto
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}
            >
              ON
            </button>
            <button
              onClick={() => handleAction('auto_disable', onDisableAuto)}
              disabled={!isAuto || loading === 'auto_disable'}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${!isAuto
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
          <div className={`p-4 rounded-xl border transition-all ${isPump2Running
              ? 'border-cyan-500/60 bg-cyan-950/30 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-500/30'
              : 'border-slate-800 bg-slate-950/40'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-400">ACTUATOR 2 • GPIO 7</span>
                <h4 className="text-sm font-bold text-white mt-0.5">Pump 2 — Irrigation Pump</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${isPump2Running
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}>
                {isPump2Running ? 'RUNNING' : 'OFF'}
              </span>
            </div>

            {/* Countdown / Status Banner */}
            <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                {isPump2Running ? (
                  countdownRemaining !== null && countdownRemaining > 0 ? (
                    <span className="text-cyan-300 font-bold animate-pulse">
                      Pump running... {countdownRemaining.toFixed(1)} sec remaining
                    </span>
                  ) : (
                    <span className="text-cyan-300 font-bold">
                      Pump running ({status.pump2.runtimeSeconds}s elapsed)
                    </span>
                  )
                ) : (
                  <span className="text-slate-400">Pump OFF</span>
                )}
              </span>

              <span className="text-emerald-400 font-bold text-[11px]">
                AI Predicted: {predictedSec.toFixed(2)}s
              </span>
            </div>

            {/* AI Irrigation Button (Primary) */}
            <div className="mt-3.5 space-y-2">
              <button
                onClick={handleStartAIIrrigation}
                disabled={isPump2Running || loading === 'pump2_ai'}
                className="w-full py-2.5 px-3 rounded-lg text-xs font-bold font-mono bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-cyan-950/50 transition-all uppercase tracking-wider"
              >
                <Sparkles className="h-4 w-4 fill-current" />
                <span>
                  {loading === 'pump2_ai'
                    ? 'Inference & Starting...'
                    : `Start AI Irrigation (${predictedSec.toFixed(2)}s)`}
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction('pump2_off', onTurnIrrigationOff)}
                  disabled={!isPump2Running || loading === 'pump2_off'}
                  className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 disabled:opacity-40 disabled:pointer-events-none border border-slate-700 flex items-center justify-center gap-1.5 transition-all"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop Pump</span>
                </button>

                <button
                  onClick={handleForceManualOn}
                  disabled={isPump2Running || loading === 'pump2_force'}
                  title="Manual immediate override bypassing AI model"
                  className="py-2 px-2.5 rounded-lg text-[11px] font-bold bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 disabled:opacity-40 disabled:pointer-events-none border border-amber-600/40 flex items-center justify-center gap-1 transition-all"
                >
                  <Zap className="h-3 w-3 text-amber-400" />
                  <span>Force ON</span>
                </button>
              </div>
            </div>

            {isPump1Running && (
              <p className="mt-2 text-[10px] text-amber-400/80 font-mono flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 shrink-0" />
                Starting Pump 2 will instantly cut off Pump 1 (Mutual Exclusion).
              </p>
            )}
          </div>

          {/* Pump 1: Tank Filling Pump (GPIO 6) */}
          <div className={`p-4 rounded-xl border transition-all ${isPump1Running
              ? 'border-emerald-500/50 bg-emerald-950/20 shadow-md shadow-emerald-950/50'
              : 'border-slate-800 bg-slate-950/40'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-400">ACTUATOR 1 • GPIO 6</span>
                <h4 className="text-sm font-bold text-white mt-0.5">Pump 1 — Tank Filling Pump</h4>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border font-mono ${isPump1Running
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
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono gap-2">
        <span>Current Moisture: <strong className="text-emerald-400">{currentMoisture}%</strong></span>
        <span>Target: <strong className="text-cyan-400">{targetMoisture}%</strong></span>
        <span>Deficit: <strong className="text-amber-400">{deficit}% pts</strong></span>
        <span>Model: <strong className="text-slate-200">{prediction?.model || 'RandomForestRegressor'}</strong></span>
        <span className="text-amber-400/90 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5" /> Mutual Exclusion: Hard Lock Active
        </span>
      </div>
    </div>
  );
};
