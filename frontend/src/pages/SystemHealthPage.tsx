import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemStatusData } from '../types';
import { Server, Wifi, Cpu, Database, RefreshCw, Terminal, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export const SystemHealthPage: React.FC = () => {
  const [statusData, setStatusData] = useState<SystemStatusData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.getSystemStatus();
      if (res.success) {
        setStatusData(res.data);
      }
    } catch (e) {
      console.error('Error fetching system status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === 'Connected' || status === 'Connected (Simulated)') {
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    } else if (status === 'Disconnected') {
      return <XCircle className="h-4 w-4 text-slate-500" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-rose-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Connected') {
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    } else if (status === 'Connected (Simulated)') {
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
    } else if (status === 'Disconnected') {
      return 'bg-slate-800 text-slate-400 border-slate-700';
    } else {
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const services = statusData?.services;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-emerald-400" />
            <span>End-to-End System Architecture Status (Section 36)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time health telemetry across the full IoT stack: Hardware → MQTT → Gateway → Backend → DB → ML Service
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-slate-700 transition-all shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Services Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services && Object.entries(services).map(([key, item]) => (
          <div key={key} className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                  PORT: {item.port}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono flex items-center gap-1 ${getStatusBadge(item.status)}`}>
                  {getStatusIcon(item.status)}
                  <span>{item.status}</span>
                </span>
              </div>

              <h3 className="text-base font-bold text-white mt-3 font-mono">
                {item.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {item.details}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex justify-between">
              <span>Protocol: {key === 'mqtt' ? 'MQTT 3.1.1' : key === 'esp32' ? 'UART/GPIO/WiFi' : 'HTTP/REST'}</span>
              <span>Layer: {key === 'esp32' ? 'Physical' : key === 'mqtt' || key === 'nodeRed' ? 'Transport' : 'Application'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live System Logs Feed */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              System Events &amp; Safety Audit Log
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-500">Persisted in system_events</span>
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto custom-scrollbar font-mono text-xs divide-y divide-slate-800/60">
          {statusData?.recentLogs && statusData.recentLogs.length > 0 ? (
            statusData.recentLogs.map((log) => (
              <div key={log._id} className="py-2.5 flex items-start gap-3 hover:bg-slate-950/40 px-2 rounded">
                <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${log.eventType === 'PUMP_MUTUAL_EXCLUSION'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : log.eventType === 'ERROR'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}>
                  {log.eventType}
                </span>
                <span className="text-slate-300 leading-relaxed">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-500">
              No critical system events recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
