import React from 'react';
import { Radio, Play, Square, Wifi, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  source: 'esp32' | 'DEMO DATA' | 'manual' | 'simulator';
  isLive: boolean;
  simulatorActive: boolean;
  noEchoActive: boolean;
  onToggleSimulator: () => void;
  onToggleNoEcho: () => void;
  esp32Status: string;
  mqttConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  source,
  isLive,
  simulatorActive,
  noEchoActive,
  onToggleSimulator,
  onToggleNoEcho,
  esp32Status,
  mqttConnected
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Executive Overview';
      case 'live-monitoring': return 'Real-Time Telemetry & Gauges';
      case 'irrigation-control': return 'Dual Pump Controller & Safety';
      case 'ai-prediction': return 'AI Runtime Prediction & Simulator';
      case 'ml-analytics': return 'Supervised ML Model Analytics (Random Forest)';
      case 'model-comparison': return 'Multi-Model Benchmark & Selection';
      case 'irrigation-history': return 'Irrigation Logs & Post-Learning Data';
      case 'sensor-timeline': return 'Sensor History & Pump Event Timeline';
      case 'data-export': return 'CSV Data Export Pipeline';
      case 'system-health': return 'Microservice Health & IoT Logs';
      case 'settings': return 'System Thresholds & Calibration';
      default: return 'Dashboard';
    }
  };

  const isDemo = source === 'DEMO DATA' || simulatorActive;

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>{getTabTitle(currentTab)}</span>
          </h1>
          <p className="text-xs text-slate-400">TerraWave AI • Closed-Loop Irrigation Intelligence</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* LIVE Stream Pulse Indicator */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">
          <span className={`relative flex h-2.5 w-2.5`}>
            {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-[11px] font-bold tracking-wider text-slate-200">
            {isLive ? 'LIVE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Data Source Label: LIVE DATA vs DEMO DATA */}
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
          isDemo
            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        }`}>
          {isDemo ? 'DEMO DATA' : 'LIVE DATA'}
        </span>

        {/* MQTT Broker Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300">
          <Wifi className={`h-3 w-3 ${mqttConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>MQTT</span>
          <span className={`text-[10px] font-mono px-1 rounded ${mqttConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>
            {mqttConnected ? '1883' : 'OFF'}
          </span>
        </div>

        {/* Quick Simulator Toggle */}
        <button
          onClick={onToggleSimulator}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            simulatorActive
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Toggle built-in ESP32 physical dynamics simulator"
        >
          {simulatorActive ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          <span>{simulatorActive ? 'Sim Active' : 'Start Sim'}</span>
        </button>

        {/* Ultrasonic NO ECHO Simulation Toggle */}
        <button
          onClick={onToggleNoEcho}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            noEchoActive
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="Toggle simulated HC-SR04 ultrasonic echo loss (-1)"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          <span>{noEchoActive ? 'NO ECHO Sim: ON' : 'Test NO ECHO'}</span>
        </button>
      </div>
    </header>
  );
};
