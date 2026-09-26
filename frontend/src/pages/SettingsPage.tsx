import React, { useState } from 'react';
import { api } from '../services/api';
import { SettingsData } from '../types';
import { Settings, Save, CheckCircle2, Sliders, ShieldCheck } from 'lucide-react';

interface SettingsPageProps {
  settings: SettingsData;
  onUpdateSettings: (newSettings: SettingsData) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [formData, setFormData] = useState<SettingsData>(settings);
  const [saving, setSaving] = useState<boolean>(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessNotice(null);
      const res = await api.updateSettings(formData);
      if (res.success) {
        onUpdateSettings(res.data);
        setSuccessNotice('System thresholds saved and applied successfully across backend controllers.');
      }
    } catch (err: any) {
      console.error('Error updating settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-sky-600" />
          <span>System Settings &amp; Hysteresis Configuration (Section 37)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Adjust closed-loop thresholds, AI target objectives, and pump safety timeouts persisted in MongoDB
        </p>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 font-mono shadow-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-sky-100 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-sky-600" />
              <span>Closed-Loop Hysteresis Thresholds</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700">Automatic Irrigation Start Trigger (%)</label>
                <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{formData.autoStartThreshold}%</span>
              </div>
              <input
                type="number"
                min="10"
                max="50"
                value={formData.autoStartThreshold}
                onChange={(e) => setFormData({ ...formData, autoStartThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
              />
              <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                When soil moisture drops below this value, closed-loop irrigation triggers (Default: 30%)
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700">Automatic Irrigation Stop Threshold (%)</label>
                <span className="font-mono text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{formData.autoStopThreshold}%</span>
              </div>
              <input
                type="number"
                min="60"
                max="95"
                value={formData.autoStopThreshold}
                onChange={(e) => setFormData({ ...formData, autoStopThreshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
              />
              <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                When soil moisture rises above this value, automatic irrigation stops (Default: 80%)
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700">AI Model Target Moisture (%)</label>
                <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{formData.aiTargetMoisture}%</span>
              </div>
              <input
                type="number"
                min="60"
                max="95"
                value={formData.aiTargetMoisture}
                onChange={(e) => setFormData({ ...formData, aiTargetMoisture: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
              />
              <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                The objective moisture percentage input to the ML runtime predictor (Default: 80%)
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-5 border-t border-sky-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-3 border-b border-sky-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Safety &amp; Telemetry Limits</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700">Maximum Pump Runtime Clamping Limit (Seconds)</label>
                <span className="font-mono text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">{formData.maxPumpRuntime}s</span>
              </div>
              <input
                type="number"
                min="5"
                max="120"
                value={formData.maxPumpRuntime}
                onChange={(e) => setFormData({ ...formData, maxPumpRuntime: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
              />
              <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                Hard ceiling preventing over-watering or continuous pump run (Default: 30s)
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <label className="text-slate-700">Sensor Update Frequency (Milliseconds)</label>
                <span className="font-mono text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">{formData.sensorUpdateInterval}ms</span>
              </div>
              <input
                type="number"
                min="500"
                max="10000"
                step="500"
                value={formData.sensorUpdateInterval}
                onChange={(e) => setFormData({ ...formData, sensorUpdateInterval: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-sky-200 bg-white text-slate-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 shadow-xs"
              />
              <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                ESP32 telemetry publishing cadence (Default: 1000ms = 1 second)
              </span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-cyan-500 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all duration-200 active:scale-[0.98]"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
