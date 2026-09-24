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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-sky-600" />
          <span>System Settings &amp; Hysteresis Configuration (Section 37)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Adjust closed-loop thresholds, AI target objectives, and pump safety timeouts persisted in MongoDB
        </p>
      </div>

      {successNotice && (
        <div className="p-3.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-800 text-xs flex items-center gap-2 font-mono">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" />
          <span>{successNotice}</span>
        </div>
      )}

      <div className="rounded-xl border border-sky-100 bg-white p-6 glass-panel max-w-2xl shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-sky-600" />
              <span>Closed-Loop Hysteresis Thresholds</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <label className="text-slate-700">Automatic Irrigation Start Trigger (%)</label>
                <span className="font-mono text-amber-700 font-bold">{formData.autoStartThreshold}%</span>
              </div>
              <input
                type="number"
                min="10"
                max="50"
                value={formData.autoStartThreshold}
                onChange={(e) => setFormData({ ...formData, autoStartThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                When soil moisture drops below this value, closed-loop irrigation triggers (Default: 30%)
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <label className="text-slate-700">Automatic Irrigation Stop Threshold (%)</label>
                <span className="font-mono text-blue-700 font-bold">{formData.autoStopThreshold}%</span>
              </div>
              <input
                type="number"
                min="60"
                max="95"
                value={formData.autoStopThreshold}
                onChange={(e) => setFormData({ ...formData, autoStopThreshold: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                When soil moisture rises above this value, automatic irrigation stops (Default: 80%)
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <label className="text-slate-700">AI Model Target Moisture (%)</label>
                <span className="font-mono text-sky-700 font-bold">{formData.aiTargetMoisture}%</span>
              </div>
              <input
                type="number"
                min="60"
                max="95"
                value={formData.aiTargetMoisture}
                onChange={(e) => setFormData({ ...formData, aiTargetMoisture: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                The objective moisture percentage input to the ML runtime predictor (Default: 80%)
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-sky-600" />
              <span>Safety &amp; Telemetry Limits</span>
            </h3>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <label className="text-slate-700">Maximum Pump Runtime Clamping Limit (Seconds)</label>
                <span className="font-mono text-rose-700 font-bold">{formData.maxPumpRuntime}s</span>
              </div>
              <input
                type="number"
                min="5"
                max="120"
                value={formData.maxPumpRuntime}
                onChange={(e) => setFormData({ ...formData, maxPumpRuntime: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                Hard ceiling preventing over-watering or continuous pump run (Default: 30s)
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <label className="text-slate-700">Sensor Update Frequency (Milliseconds)</label>
                <span className="font-mono text-slate-500">{formData.sensorUpdateInterval}ms</span>
              </div>
              <input
                type="number"
                min="500"
                max="10000"
                step="500"
                value={formData.sensorUpdateInterval}
                onChange={(e) => setFormData({ ...formData, sensorUpdateInterval: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:border-sky-500 focus:bg-white focus:outline-none transition-colors"
              />
              <span className="text-[10px] text-slate-400 font-mono">
                ESP32 telemetry publishing cadence (Default: 1000ms = 1 second)
              </span>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 transition-all"
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
