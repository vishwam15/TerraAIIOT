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
    <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel flex flex-col justify-between shadow-sm hover:shadow-md transition-all duration-300">
      <div>
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-sky-100 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Cpu className="h-5 w-5 text-sky-600" />
              <span>Irrigation &amp; Pump Actuator Control Panel</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              AI-driven runtime execution with mutual exclusion and real-time countdown
            </p>
          </div>

          {/* Mode Pill */}
          <span className={`self-start sm:self-auto px-3 py-1 text-xs font-bold rounded-full border font-mono tracking-wider shadow-xs ${isAuto
            ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse'
            : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
            {isAuto ? 'MODE: AUTOMATIC (AI)' : 'MODE: MANUAL (AI-DRIVEN)'}
          </span>
        </div>

        {/* Quick Configurable Thresholds Bar */}
        <div className="mt-4 p-4 rounded-xl border border-sky-100 bg-sky-50/60 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-sky-600" />
            <span className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wide">Configurable Thresholds:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-medium">Target Moisture:</label>
              <select
                value={targetInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTargetInput(val);
                  if (onUpdateTargetMoisture) onUpdateTargetMoisture(val);
                }}
                className="bg-white border border-sky-200 text-emerald-700 font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
              >
                <option value={75}>75%</option>
                <option value={80}>80% (Default)</option>
                <option value={85}>85%</option>
                <option value={90}>90%</option>
                <option value={95}>95%</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-slate-600 font-medium">Auto Start Trigger:</label>
              <select
                value={startInput}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStartInput(val);
                  if (onUpdateStartThreshold) onUpdateStartThreshold(val);
                }}
                className="bg-white border border-sky-200 text-sky-700 font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
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
          <div className="mt-3 p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs font-mono flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{feedbackNotice}</span>
            </div>
            <button onClick={() => setFeedbackNotice(null)} className="text-amber-600 hover:text-amber-900 font-bold p-1">✕</button>
          </div>
        )}

        {/* Automatic Mode Switch Card */}
        <div className="mt-4 p-4 rounded-xl border border-sky-100 bg-white/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isAuto ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-500'}`}>
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900">Closed-Loop Automatic Mode</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-mono">
                  &lt;={autoStartThreshold}% start • &gt;={targetMoisture}% stop
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                AI continuously monitors moisture deficits and triggers pump runtime automatically
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => handleAction('auto_enable', onEnableAuto)}
              disabled={isAuto || loading === 'auto_enable'}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${isAuto
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/20'
                : 'bg-white text-slate-700 hover:bg-sky-50 border border-sky-200/80 shadow-xs'
                }`}
            >
              ON
            </button>
            <button
              onClick={() => handleAction('auto_disable', onDisableAuto)}
              disabled={!isAuto || loading === 'auto_disable'}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 ${!isAuto
                ? 'bg-slate-200 text-slate-800'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs'
                }`}
            >
              OFF
            </button>
          </div>
        </div>

        {/* Dual Actuator Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Pump 2: Irrigation Pump (GPIO 7) */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${isPump2Running
            ? 'border-sky-400 bg-sky-50/80 shadow-md shadow-sky-500/10 ring-2 ring-sky-400/20'
            : 'border-sky-100 bg-white/70 hover:border-sky-200'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-sky-700">ACTUATOR 2 • GPIO 7</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Pump 2 — Irrigation Pump</h4>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 border border-sky-300 font-mono tracking-wider">
                  ⚡ MANUAL &amp; AUTO (AI)
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border font-mono ${isPump2Running
                ? 'bg-sky-100 text-sky-800 border-sky-300 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                {isPump2Running ? 'RUNNING' : 'OFF'}
              </span>
            </div>

            {/* Countdown / Status Banner */}
            <div className="mt-3 p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-sky-600" />
                {isPump2Running ? (
                  countdownRemaining !== null && countdownRemaining > 0 ? (
                    <span className="text-sky-800 font-bold animate-pulse">
                      Running... {countdownRemaining.toFixed(1)}s remaining
                    </span>
                  ) : (
                    <span className="text-sky-800 font-bold">
                      Running ({status.pump2.runtimeSeconds}s elapsed)
                    </span>
                  )
                ) : (
                  <span className="text-slate-500">Pump OFF</span>
                )}
              </span>

              <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                AI Predicted: {predictedSec.toFixed(2)}s
              </span>
            </div>

            {/* AI Irrigation Button (Primary) */}
            <div className="mt-3.5 space-y-2">
              <button
                onClick={handleStartAIIrrigation}
                disabled={isPump2Running || loading === 'pump2_ai'}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 hover:from-sky-600 hover:to-blue-700 disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all duration-200 active:scale-[0.98] uppercase tracking-wider"
              >
                <Sparkles className="h-4 w-4" />
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
                  className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 shadow-xs"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop Pump</span>
                </button>

                <button
                  onClick={handleForceManualOn}
                  disabled={isPump2Running || loading === 'pump2_force'}
                  title="Manual immediate override bypassing AI model"
                  className="py-2 px-3 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 disabled:opacity-40 disabled:pointer-events-none border border-amber-200 flex items-center justify-center gap-1 transition-all duration-200 active:scale-95 shadow-xs"
                >
                  <Zap className="h-3 w-3 text-amber-600" />
                  <span>Force ON</span>
                </button>
              </div>
            </div>

            {isPump1Running && (
              <p className="mt-2 text-[10px] text-amber-700 font-mono flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 shrink-0 text-amber-600" />
                Starting Pump 2 will instantly cut off Pump 1 (Mutual Exclusion).
              </p>
            )}
          </div>

          {/* Pump 1: Tank Filling Pump (GPIO 6) */}
          <div className={`p-4 rounded-xl border transition-all duration-300 ${isPump1Running
            ? 'border-emerald-400 bg-emerald-50/80 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-400/20'
            : 'border-sky-100 bg-white/70 hover:border-sky-200'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-semibold text-emerald-700">ACTUATOR 1 • GPIO 6</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Pump 1 — Tank Filling Pump</h4>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 font-mono tracking-wider">
                  🔒 MANUAL ONLY — NO AUTO
                </span>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border font-mono ${isPump1Running
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                {isPump1Running ? 'RUNNING' : 'OFF'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500 p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
              <span className="flex items-center gap-1.5 font-mono">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                Runtime: <strong className="text-slate-800">{status.pump1.runtimeSeconds}s</strong>
              </span>
              <span className="text-amber-700 font-mono text-[11px] font-semibold">
                🔒 Button-controlled only
              </span>
            </div>

            <div className="mt-3.5 flex items-center gap-2">
              <button
                onClick={() => handleAction('pump1_on', onTurnFillOn)}
                disabled={isPump1Running || loading === 'pump1_on'}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 disabled:pointer-events-none text-white flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all duration-200 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Tank Fill ON</span>
              </button>
              <button
                onClick={() => handleAction('pump1_off', onTurnFillOff)}
                disabled={!isPump1Running || loading === 'pump1_off'}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 disabled:opacity-40 disabled:pointer-events-none border border-slate-200 hover:border-rose-200 flex items-center justify-center gap-1.5 transition-all duration-200 active:scale-95 shadow-xs"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Tank Fill OFF</span>
              </button>
            </div>
            {isPump2Running && (
              <p className="mt-2 text-[10px] text-amber-700 font-mono flex items-center gap-1">
                <AlertOctagon className="h-3 w-3 shrink-0 text-amber-600" />
                Turning ON will instantly cut off Pump 2 (Mutual Exclusion).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer telemetry summary */}
      <div className="mt-4 pt-3 border-t border-sky-100 flex flex-wrap items-center justify-between text-xs text-slate-500 font-mono gap-2">
        <span>Current Soil: <strong className="text-sky-700">{currentMoisture}%</strong></span>
        <span>Target: <strong className="text-blue-700">{targetMoisture}%</strong></span>
        <span>Deficit: <strong className="text-amber-700">{deficit}% pts</strong></span>
        <span>Model: <strong className="text-slate-800">{prediction?.model || 'RandomForestRegressor'}</strong></span>
        <span className="text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1">
          <ShieldCheck className="h-3.5 w-3.5 text-sky-600" /> Mutual Exclusion: Hard Lock Active
        </span>
      </div>
    </div>
  );
};
