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
    <aside className="w-64 bg-white/95 border-r border-sky-100 flex flex-col justify-between shrink-0 h-screen sticky top-0 z-20 backdrop-blur-md shadow-sm">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-sky-100 flex items-center gap-3 bg-gradient-to-r from-sky-50/50 to-white">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
            <Waves className="h-6 w-6 font-bold" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-wider text-slate-900">TERRAWAVE</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-widest bg-sky-100 text-sky-700 rounded border border-sky-200">AI</span>
            </div>
            <p className="text-[11px] text-sky-600/80 font-medium">Smart Irrigation IoT</p>
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
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-bold border border-sky-200 shadow-sm shadow-sky-500/5'
                    : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-sky-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer ESP32 Hardware Status */}
      <div className="p-4 border-t border-sky-100 bg-sky-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${esp32Online ? 'bg-sky-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-xs text-slate-700 font-semibold">
              {esp32Online ? 'ESP32-S3 Online' : 'ESP32 Offline'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">GPIO 1,4,5,6,7</span>
        </div>
      </div>
    </aside>
  );
};
