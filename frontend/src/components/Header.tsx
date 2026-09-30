import React from 'react';
import { Wifi } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  source: string;
  isLive: boolean;
  esp32Status: string;
  mqttConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  source,
  isLive,
  esp32Status,
  mqttConnected
}) => {
  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard': return 'Executive Overview';
      case 'live-monitoring': return 'Real-Time Telemetry & Gauges';
      case 'irrigation-control': return 'Dual Pump Controller & Safety';
      case 'ai-prediction': return 'AI Runtime Prediction';
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

  const isRealHardware = source === 'esp32';

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

        {/* Data Source Label — always shows LIVE DATA since simulator is removed */}
        <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border shadow-xs transition-all ${
          isRealHardware
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/90'
            : 'bg-slate-50 text-slate-500 border-slate-200/80'
        }`}>
          {isRealHardware ? 'HARDWARE' : 'NO DATA'}
        </span>

        {/* ESP32 Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-sky-100 text-[11px] text-slate-700 shadow-xs">
          <span className={`h-2 w-2 rounded-full ${esp32Status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="font-medium text-slate-500 font-mono">ESP32</span>
          <span className={`text-[10px] font-mono px-1 rounded font-bold ${esp32Status === 'ONLINE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            {esp32Status === 'ONLINE' ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>

        {/* MQTT Broker Status */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 border border-sky-100 text-[11px] text-slate-700 shadow-xs">
          <Wifi className={`h-3 w-3 ${mqttConnected ? 'text-sky-600' : 'text-slate-400'}`} />
          <span className="font-medium text-slate-500">MQTT</span>
          <span className={`text-[10px] font-mono px-1 rounded font-bold ${mqttConnected ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-500'}`}>
            1883
          </span>
        </div>
      </div>
    </header>
  );
};
