import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Droplets,
  Cpu,
  BarChart3,
  GitCompare,
  History,
  Clock,
  Download,
  Server,
  Settings,
  Waves
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  esp32Online: boolean;
  autoMode: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  esp32Online,
  autoMode
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'irrigation-control', label: 'Irrigation Control', icon: Droplets, badge: autoMode ? 'AUTO' : undefined },
    { id: 'ai-prediction', label: 'AI Prediction', icon: Cpu },
    { id: 'ml-analytics', label: 'AI / ML Analytics', icon: BarChart3 },
    { id: 'model-comparison', label: 'Model Comparison', icon: GitCompare },
    { id: 'irrigation-history', label: 'Irrigation History', icon: History },
    { id: 'sensor-timeline', label: 'Sensor & Timeline', icon: Clock },
    { id: 'data-export', label: 'Data Export', icon: Download },
    { id: 'system-health', label: 'System Logs & Health', icon: Server },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-20 backdrop-blur-md">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Waves className="h-6 w-6 text-slate-950 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-white">TERRAWAVE</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-widest bg-emerald-500/20 text-emerald-400 rounded border border-emerald-500/30">AI</span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Smart Irrigation IoT</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer ESP32 Hardware Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${esp32Online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs text-slate-300 font-medium">
              {esp32Online ? 'ESP32-S3 Online' : 'ESP32 Offline'}
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">GPIO 1,4,5,6,7</span>
        </div>
      </div>
    </aside>
  );
};
