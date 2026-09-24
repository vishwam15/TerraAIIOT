import React from 'react';
import { Play, Square, Wifi, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  source: string;
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
    <header className="h-16 border-b border-sky-100 bg-white/85 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{getTabTitle(currentTab)}</span>
          </h1>
          <p className="text-xs text-sky-600/80 font-medium">TerraWave AI • Closed-Loop Irrigation Intelligence</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* LIVE Stream Pulse Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isLive ? 'bg-sky-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-[11px] font-bold tracking-wider text-sky-800">
            {isLive ? 'LIVE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Data Source Label: LIVE DATA vs DEMO DATA */}
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border shadow-sm ${
          isDemo
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
        }`}>
          {isDemo ? 'DEMO DATA' : 'LIVE DATA'}
        </span>

        {/* MQTT Broker Status (Port 1883) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-sm">
          <Wifi className={`h-3 w-3 ${mqttConnected ? 'text-sky-600' : 'text-slate-400'}`} />
          <span className="font-medium">MQTT</span>
          <span className={`text-[10px] font-mono px-1 rounded font-bold ${mqttConnected ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-500'}`}>
            1883
          </span>
        </div>

        {/* Quick Simulator Toggle */}
        <button
          onClick={onToggleSimulator}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
            simulatorActive
              ? 'bg-sky-600 text-white border-sky-600 shadow-sky-500/20'
              : 'bg-white text-slate-700 border-sky-200 hover:bg-sky-50 hover:text-sky-700'
          }`}
          title="Toggle built-in ESP32 physical dynamics simulator"
        >
          {simulatorActive ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          <span>{simulatorActive ? 'Sim Active' : 'Start Sim'}</span>
        </button>

        {/* Ultrasonic NO ECHO Simulation Toggle */}
        <button
          onClick={onToggleNoEcho}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm ${
            noEchoActive
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800'
          }`}
          title="Toggle simulated HC-SR04 ultrasonic echo loss (-1)"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span>{noEchoActive ? 'NO ECHO: ON' : 'Test NO ECHO'}</span>
        </button>
      </div>
    </header>
  );
};
