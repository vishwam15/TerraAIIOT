import React from 'react';
import { ControlPanel } from '../components/ControlPanel';
import { MutualExclusionBanner } from '../components/MutualExclusionBanner';
import { PumpStatus, SettingsData, AIPredictionResult } from '../types';
import { ShieldCheck, AlertTriangle, Layers, Power } from 'lucide-react';

interface ControlPageProps {
  pumpStatus: PumpStatus;
  settings: SettingsData;
  currentMoisture?: number;
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

export const ControlPage: React.FC<ControlPageProps> = ({
  pumpStatus,
  settings,
  currentMoisture = 40,
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
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Power className="h-5 w-5 text-cyan-400" />
          <span>Actuator Control &amp; Safety Interlock Management</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Dual pump actuation (GPIO 6 Tank Filling / GPIO 7 Irrigation) with hardware-enforced mutual exclusion
        </p>
      </div>

      <MutualExclusionBanner
        pump1Running={pumpStatus.pump1.running}
        pump2Running={pumpStatus.pump2.running}
      />

      <ControlPanel
        status={pumpStatus}
        currentMoisture={currentMoisture}
        targetMoisture={settings.aiTargetMoisture}
        autoStartThreshold={settings.autoStartThreshold}
        prediction={prediction}
        onTurnIrrigationOn={onTurnIrrigationOn}
        onTurnIrrigationOff={onTurnIrrigationOff}
        onTurnFillOn={onTurnFillOn}
        onTurnFillOff={onTurnFillOff}
        onEnableAuto={onEnableAuto}
        onDisableAuto={onDisableAuto}
        onUpdateTargetMoisture={onUpdateTargetMoisture}
        onUpdateStartThreshold={onUpdateStartThreshold}
      />

      {/* Safety Specification & Architecture Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 glass-panel">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Mutual Exclusion Interlock (Rule 4)</span>
          </h4>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            The system guarantees Pump 1 and Pump 2 will never run at the same time:
          </p>
          <ul className="mt-2 space-y-1.5 text-xs font-mono text-slate-300 list-disc list-inside">
            <li>When Pump 1 (GPIO 6) turns ON, Pump 2 (GPIO 7) is immediately powered OFF.</li>
            <li>When Pump 2 (GPIO 7) turns ON, Pump 1 (GPIO 6) is immediately powered OFF.</li>
            <li>Enforced in both backend state controller and ESP32 firmware GPIO callbacks.</li>
            <li>Ultrasonic NO ECHO condition does NOT lock manual control of either pump.</li>
          </ul>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 glass-panel">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>Automatic Mode Hysteresis Rules</span>
          </h4>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            Closed-loop automation utilizes a hysteresis window to eliminate erratic pump oscillation:
          </p>
          <ul className="mt-2 space-y-1.5 text-xs font-mono text-slate-300 list-disc list-inside">
            <li>Trigger threshold: Soil moisture &lt; <strong>{settings.autoStartThreshold}%</strong> starts AI irrigation.</li>
            <li>Stop threshold: Soil moisture &gt; <strong>{settings.autoStopThreshold}%</strong> stops automatic irrigation.</li>
            <li>Between 30% and 80%: maintains the current state (does not turn off at 30%).</li>
            <li>5-second cooldown is enforced between cycles to allow soil water permeation.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
