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
    <header className="h-16 border-b border-sky-100/90 bg-white/75 backdrop-blur-2xl px-6 flex items-center justify-between sticky top-0 z-10 shadow-[0_2px_15px_rgba(2,132,199,0.03)]">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{getTabTitle(currentTab)}</span>
          </h1>
          <p className="text-[11px] text-sky-600 font-medium tracking-wide">TerraWave AI • Closed-Loop Irrigation Intelligence</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* LIVE Stream Pulse Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 border border-sky-200/80 shadow-xs">
          <span className="relative flex h-2 w-2">
            {isLive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-sky-500' : 'bg-rose-500'}`}></span>
          </span>
          <span className="text-[10px] font-bold tracking-wider text-sky-800 font-mono">
            {isLive ? 'LIVE' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Data Source Label */}
        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border shadow-xs transition-all ${isDemo
            ? 'bg-amber-50 text-amber-700 border-amber-200/90'
            : 'bg-emerald-50 text-emerald-700 border-emerald-200/90'
          }`}>
          {isDemo ? 'DEMO DATA' : 'LIVE DATA'}
        </span>

        {/* MQTT Broker Status (Port 1883) */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-sky-100 text-[11px] text-slate-700 shadow-xs">
          <Wifi className={`h-3 w-3 ${mqttConnected ? 'text-sky-600' : 'text-slate-400'}`} />
          <span className="font-medium text-slate-500">MQTT</span>
          <span className={`text-[10px] font-mono px-1 rounded font-bold ${mqttConnected ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'}`}>
            1883
          </span>
        </div>

        {/* Quick Simulator Toggle */}
        <button
          onClick={onToggleSimulator}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 border shadow-xs ${simulatorActive
              ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white border-sky-400/50 shadow-sky-500/20'
              : 'bg-white text-slate-700 border-sky-200/80 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300'
            }`}
          title="Toggle built-in ESP32 physical dynamics simulator"
        >
          {simulatorActive ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
          <span>{simulatorActive ? 'Sim Active' : 'Start Sim'}</span>
        </button>

        {/* Ultrasonic NO ECHO Simulation Toggle */}
        <button
          onClick={onToggleNoEcho}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 border shadow-xs ${noEchoActive
              ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
              : 'bg-white text-slate-600 border-sky-200/80 hover:bg-sky-50 hover:text-slate-900'
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
