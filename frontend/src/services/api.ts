import {
  SensorReading,
  PumpStatus,
  AIPredictionResult,
  MLMetricsResponse,
  ModelComparisonItem,
  IrrigationCycle,
  PumpEvent,
  SystemStatusData,
  SettingsData
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:1607/api';

export const api = {
  // Sensors
  async getLatestSensors(): Promise<any> {
    const res = await fetch(`${API_BASE}/sensors/latest`);
    return res.json();
  },

  async getSensorHistory(limit = 60): Promise<{ success: boolean; count: number; data: SensorReading[] }> {
    const res = await fetch(`${API_BASE}/sensors/history?limit=${limit}`);
    return res.json();
  },

  async getSoilMoistureHistory(limit = 60): Promise<any> {
    const res = await fetch(`${API_BASE}/soil-moisture/history?limit=${limit}`);
    return res.json();
  },

  async getTankHistory(limit = 60): Promise<any> {
    const res = await fetch(`${API_BASE}/tank/history?limit=${limit}`);
    return res.json();
  },

  // Pumps
  async getPumpStatus(): Promise<{ success: boolean; data: PumpStatus }> {
    const res = await fetch(`${API_BASE}/pumps/status`);
    return res.json();
  },

  async turnIrrigationOn(durationSeconds?: number, targetMoisture = 80, forceManual = false): Promise<any> {
    const res = await fetch(`${API_BASE}/pumps/irrigation/on`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ durationSeconds, targetMoisture, forceManual })
    });
    return res.json();
  },

  async turnIrrigationOff(): Promise<any> {
    const res = await fetch(`${API_BASE}/pumps/irrigation/off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async turnFillOn(): Promise<any> {
    const res = await fetch(`${API_BASE}/pumps/fill/on`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async turnFillOff(): Promise<any> {
    const res = await fetch(`${API_BASE}/pumps/fill/off`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return res.json();
  },

  async getPumpEvents(limit = 50): Promise<{ success: boolean; count: number; data: PumpEvent[] }> {
    const res = await fetch(`${API_BASE}/pumps/events?limit=${limit}`);
    return res.json();
  },

  // Automation
  async enableAutomation(): Promise<any> {
    const res = await fetch(`${API_BASE}/automation/enable`, { method: 'POST' });
    return res.json();
  },

  async disableAutomation(): Promise<any> {
    const res = await fetch(`${API_BASE}/automation/disable`, { method: 'POST' });
    return res.json();
  },

  // Machine Learning
  async predictPumpRuntime(currentMoisture: number, targetMoisture = 80): Promise<{ success: boolean; data: AIPredictionResult }> {
    const res = await fetch(`${API_BASE}/ml/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_moisture: currentMoisture, target_moisture: targetMoisture })
    });
    return res.json();
  },

  async trainModel(): Promise<any> {
    const res = await fetch(`${API_BASE}/ml/train`, { method: 'POST' });
    return res.json();
  },

  async getMLMetrics(): Promise<{ success: boolean; data: MLMetricsResponse }> {
    const res = await fetch(`${API_BASE}/ml/metrics`);
    return res.json();
  },

  async getFeatureImportance(): Promise<any> {
    const res = await fetch(`${API_BASE}/ml/feature-importance`);
    return res.json();
  },

  async getModelComparisons(): Promise<{ success: boolean; data: { active_model: string; comparison: ModelComparisonItem[] } }> {
    const res = await fetch(`${API_BASE}/ml/models`);
    return res.json();
  },

  async setActiveModel(modelName: string): Promise<any> {
    const res = await fetch(`${API_BASE}/ml/set-active-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_name: modelName })
    });
    return res.json();
  },

  // Analytics & History
  async getAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/analytics`);
    return res.json();
  },

  async getIrrigationHistory(limit = 50): Promise<{ success: boolean; count: number; data: IrrigationCycle[] }> {
    const res = await fetch(`${API_BASE}/irrigation/history?limit=${limit}`);
    return res.json();
  },

  // Export URLs for CSV downloads (direct download links)
  getSensorCsvUrl(): string {
    return `${API_BASE}/export/sensors.csv`;
  },

  getIrrigationCsvUrl(): string {
    return `${API_BASE}/export/irrigation.csv`;
  },

  getTrainingCsvUrl(): string {
    return `${API_BASE}/export/training.csv`;
  },

  // System & Settings
  async getSystemStatus(): Promise<{ success: boolean; data: SystemStatusData }> {
    const res = await fetch(`${API_BASE}/system/status`);
    return res.json();
  },

  async getSettings(): Promise<{ success: boolean; data: SettingsData }> {
    const res = await fetch(`${API_BASE}/settings`);
    return res.json();
  },

  async updateSettings(settings: Partial<SettingsData>): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  // Simulator Hooks
  async toggleSimulator(): Promise<{ success: boolean; active: boolean }> {
    const res = await fetch(`${API_BASE}/simulator/toggle`, { method: 'POST' });
    return res.json();
  },

  async setSimulatedMoisture(moisture: number): Promise<any> {
    const res = await fetch(`${API_BASE}/simulator/set-moisture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moisture })
    });
    return res.json();
  },

  async toggleSimulatedNoEcho(): Promise<{ success: boolean; noEcho: boolean }> {
    const res = await fetch(`${API_BASE}/simulator/toggle-no-echo`, { method: 'POST' });
    return res.json();
  }
};
