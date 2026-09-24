import React from 'react';
import {
  Droplets,
  Target,
  Waves,
  Cpu,
  Power,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { MutualExclusionBanner } from '../components/MutualExclusionBanner';
import { RealtimeChart } from '../components/RealtimeChart';
import { ControlPanel } from '../components/ControlPanel';
import { AIPredictionCard } from '../components/AIPredictionCard';
import { MoistureGauge } from '../components/MoistureGauge';
import { TankLevelGauge } from '../components/TankLevelGauge';
import { SensorReading, PumpStatus, AIPredictionResult, SettingsData } from '../types';

interface DashboardPageProps {
  currentMoisture: number;
  rawADC: number;
  tankLevel: number;
  sensorHistory: SensorReading[];
  pumpStatus: PumpStatus;
  prediction: AIPredictionResult | null;
  settings: SettingsData;
  onTurnIrrigationOn: (duration?: number) => Promise<void>;
  onTurnIrrigationOff: () => Promise<void>;
  onTurnFillOn: () => Promise<void>;
  onTurnFillOff: () => Promise<void>;
  onEnableAuto: () => Promise<void>;
  onDisableAuto: () => Promise<void>;
  onRefreshPrediction: () => void;
  isPredicting: boolean;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  currentMoisture,
  rawADC,
  tankLevel,
  sensorHistory,
  pumpStatus,
  prediction,
  settings,
  onTurnIrrigationOn,
  onTurnIrrigationOff,
  onTurnFillOn,
  onTurnFillOff,
  onEnableAuto,
  onDisableAuto,
  onRefreshPrediction,
  isPredicting
}) => {
  const isPump1Running = pumpStatus.pump1.running;
  const isPump2Running = pumpStatus.pump2.running;
  const isAuto = pumpStatus.autoMode;
  const isNoEcho = tankLevel === -1;

  return (
    <div className="space-y-6">
      {/* Mutual Exclusion Alert Banner */}
      <MutualExclusionBanner
        pump1Running={isPump1Running}
        pump2Running={isPump2Running}
      />

      {/* Top 6 Summary Cards (Section 12) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Current Soil Moisture */}
        <StatCard
          title="Soil Moisture"
          value={currentMoisture.toFixed(1)}
          unit="%"
          subtitle={`ADC: ${rawADC}`}
          icon={Droplets}
          colorScheme="emerald"
          statusBadge={{
            text: currentMoisture < settings.autoStartThreshold ? 'DRY' : currentMoisture > settings.autoStopThreshold ? 'WET' : 'OPTIMAL',
            variant: currentMoisture < settings.autoStartThreshold ? 'warning' : 'success'
          }}
          highlight={currentMoisture < settings.autoStartThreshold}
        />

        {/* Target Moisture */}
        <StatCard
          title="Target Moisture"
          value={settings.aiTargetMoisture}
          unit="%"
          subtitle="AI Objective"
          icon={Target}
          colorScheme="cyan"
          statusBadge={{
            text: 'CONFIGURED',
            variant: 'info'
          }}
        />

        {/* Tank Level */}
        <StatCard
          title="Tank Level"
          value={isNoEcho ? 'NO ECHO' : `${tankLevel}%`}
          subtitle={isNoEcho ? 'Ultrasonic Timeout' : 'HC-SR04 Active'}
          icon={Waves}
          colorScheme={isNoEcho ? 'amber' : 'blue'}
          statusBadge={{
            text: isNoEcho ? 'NO ECHO' : tankLevel > 20 ? 'NORMAL' : 'LOW',
            variant: isNoEcho ? 'warning' : tankLevel > 20 ? 'success' : 'danger'
          }}
        />

        {/* Irrigation Pump (Pump 2) */}
        <StatCard
          title="Irrigation Pump"
          value={isPump2Running ? 'RUNNING' : 'OFF'}
          subtitle={isPump2Running ? `${pumpStatus.pump2.runtimeSeconds}s active` : 'GPIO 7 (Standby)'}
          icon={Power}
          colorScheme={isPump2Running ? 'cyan' : 'emerald'}
          statusBadge={{
            text: isPump2Running ? 'ACTIVE' : 'IDLE',
            variant: isPump2Running ? 'info' : 'neutral'
          }}
          highlight={isPump2Running}
        />

        {/* Tank Pump (Pump 1) */}
        <StatCard
          title="Tank Pump"
          value={isPump1Running ? 'RUNNING' : 'OFF'}
          subtitle={isPump1Running ? `${pumpStatus.pump1.runtimeSeconds}s active` : 'GPIO 6 (Standby)'}
          icon={Power}
          colorScheme={isPump1Running ? 'emerald' : 'blue'}
          statusBadge={{
            text: isPump1Running ? 'ACTIVE' : 'IDLE',
            variant: isPump1Running ? 'success' : 'neutral'
          }}
          highlight={isPump1Running}
        />

        {/* Mode */}
        <StatCard
          title="Operation Mode"
          value={isAuto ? 'AUTOMATIC' : 'MANUAL'}
          subtitle={isAuto ? 'AI Closed-Loop' : 'User Control'}
          icon={Sparkles}
          colorScheme={isAuto ? 'purple' : 'emerald'}
          statusBadge={{
            text: isAuto ? 'HYSTERESIS' : 'MANUAL',
            variant: isAuto ? 'info' : 'neutral'
          }}
        />
      </div>

      {/* Row 2: Realtime Line Chart & AI Prediction Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RealtimeChart
            data={sensorHistory}
            startThreshold={settings.autoStartThreshold}
            stopThreshold={settings.autoStopThreshold}
          />
        </div>
        <div className="lg:col-span-1">
          <AIPredictionCard
            prediction={prediction}
            targetMoisture={settings.aiTargetMoisture}
            currentMoisture={currentMoisture}
            onRefreshPrediction={onRefreshPrediction}
            isLoading={isPredicting}
          />
        </div>
      </div>

      {/* Row 3: Actuator Control Panel & Physical Telemetry Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ControlPanel
            status={pumpStatus}
            onTurnIrrigationOn={onTurnIrrigationOn}
            onTurnIrrigationOff={onTurnIrrigationOff}
            onTurnFillOn={onTurnFillOn}
            onTurnFillOff={onTurnFillOff}
            onEnableAuto={onEnableAuto}
            onDisableAuto={onDisableAuto}
          />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <MoistureGauge
            moisture={currentMoisture}
            rawADC={rawADC}
            target={settings.aiTargetMoisture}
            autoStartThreshold={settings.autoStartThreshold}
          />
          <TankLevelGauge tankLevel={tankLevel} />
        </div>
      </div>
    </div>
  );
};
