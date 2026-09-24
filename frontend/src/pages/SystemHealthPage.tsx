import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemStatusData } from '../types';
import { Server, RefreshCw, Terminal, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

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
      return <CheckCircle2 className="h-4 w-4 text-sky-600" />;
    } else if (status === 'Disconnected') {
      return <XCircle className="h-4 w-4 text-slate-400" />;
    } else {
      return <AlertTriangle className="h-4 w-4 text-rose-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'Connected') {
      return 'bg-sky-50 text-sky-800 border-sky-200';
    } else if (status === 'Connected (Simulated)') {
      return 'bg-blue-50 text-blue-800 border-blue-200';
    } else if (status === 'Disconnected') {
      return 'bg-slate-100 text-slate-600 border-slate-200';
    } else {
      return 'bg-rose-50 text-rose-800 border-rose-200';
    }
  };

  const services = statusData?.services;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Server className="h-5 w-5 text-sky-600" />
            <span>End-to-End System Architecture Status (Section 36)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time health telemetry across the full IoT stack: Hardware → MQTT → Gateway → Backend → DB → ML Service
          </p>
        </div>

        <button
          onClick={fetchStatus}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-800 text-xs font-bold font-mono tracking-wider flex items-center gap-2 border border-sky-200 transition-all shrink-0 shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Services Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services && Object.entries(services).map(([key, item]) => (
          <div key={key} className="rounded-xl border border-sky-100 bg-white p-5 glass-panel flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                  PORT: {item.port}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border font-mono flex items-center gap-1 ${getStatusBadge(item.status)}`}>
                  {getStatusIcon(item.status)}
                  <span>{item.status}</span>
                </span>
              </div>

              <h3 className="text-base font-extrabold text-slate-900 mt-3 font-mono">
                {item.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                {item.details}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Protocol: {key === 'mqtt' ? 'MQTT 3.1.1' : key === 'esp32' ? 'UART/GPIO/WiFi' : 'HTTP/REST'}</span>
              <span>Layer: {key === 'esp32' ? 'Physical' : key === 'mqtt' || key === 'nodeRed' ? 'Transport' : 'Application'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Live System Logs Feed */}
      <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              System Events &amp; Safety Audit Log
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Persisted in system_events</span>
        </div>

        <div className="mt-4 max-h-72 overflow-y-auto custom-scrollbar font-mono text-xs divide-y divide-slate-100">
          {statusData?.recentLogs && statusData.recentLogs.length > 0 ? (
            statusData.recentLogs.map((log) => (
              <div key={log._id} className="py-2.5 flex items-start gap-3 hover:bg-sky-50/50 px-2 rounded-lg transition-colors">
                <span className="text-slate-400 text-[10px] shrink-0 mt-0.5">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                  log.eventType === 'PUMP_MUTUAL_EXCLUSION'
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : log.eventType === 'ERROR'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-sky-100 text-sky-800 border border-sky-300'
                }`}>
                  {log.eventType}
                </span>
                <span className="text-slate-700 leading-relaxed font-sans">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-slate-400">
              No critical system events recorded.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
