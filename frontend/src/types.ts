export interface SensorReading {
  _id?: string;
  sensorId: string;
  soilMoisture: number;
  rawADC?: number;
  tankLevel: number;
  source: string;
  timestamp: string;
}

export interface PumpInfo {
  id: string;
  name: string;
  gpio: number;
  status: 'ON' | 'OFF';
  running: boolean;
  runtimeSeconds: number;
}

export interface PumpStatus {
  pump1: PumpInfo;
  pump2: PumpInfo;
  autoMode: boolean;
  currentMoisture: number;
  currentTankLevel: number;
  lastCommand: string;
  mutualExclusionActive: boolean;
  activeCycle: {
    id: string;
    predictedRuntime: number;
    beforeMoisture: number;
    targetMoisture: number;
    triggerType: string;
  } | null;
}

export interface AIPredictionResult {
  predicted_runtime_seconds: number;
  raw_prediction?: number;
  model: string;
  model_version: string;
  confidence_r2: number | null;
  moisture_deficit: number;
  current_moisture: number;
  target_moisture: number;
  safety_clamped: boolean;
  is_fallback?: boolean;
  explanation: string;
}

export interface MLMetrics {
  mae: number;
  mse: number;
  rmse: number;
  r2: number;
  cv_mean_r2: number;
  train_time_ms: number;
  inference_time_ms: number;
  feature_importance: Record<string, number>;
  actual_vs_pred: Array<{ actual: number; predicted: number; error: number }>;
  error_distribution: Array<{ bin: string; rangeMid?: number; count: number }>;
  residual_points?: number[];
}

export interface MLMetricsResponse {
  model: string;
  model_version: string;
  last_trained: string;
  training_samples: number;
  metrics: MLMetrics;
}

export interface ModelComparisonItem {
  model: string;
  is_active: boolean;
  mae: number;
  mse: number;
  rmse: number;
  r2: number;
  cv_mean_r2: number;
  train_time_ms: number;
  inference_time_ms: number;
}

export interface IrrigationCycle {
  _id: string;
  pumpId: string;
  triggerType: 'automatic' | 'manual';
  beforeMoisture: number;
  targetMoisture: number;
  predictedRuntime: number;
  actualRuntime: number;
  afterMoisture?: number;
  moistureGain?: number;
  gainPerSecond?: number;
  predictionError?: number;
  modelUsed: string;
  status: string;
  startTime: string;
  endTime?: string;
  source: string;
  createdAt: string;
}

export interface PumpEvent {
  _id: string;
  pumpId: string;
  action: 'ON' | 'OFF';
  reason: string;
  durationSeconds?: number;
  soilMoistureAtEvent?: number;
  source: string;
  timestamp: string;
}

export interface ServiceStatus {
  name: string;
  status: 'Connected' | 'Disconnected' | 'Error' | 'Connected (Simulated)';
  port: string;
  details: string;
}

export interface SystemStatusData {
  services: {
    esp32: ServiceStatus;
    mqtt: ServiceStatus;
    nodeRed: ServiceStatus;
    backend: ServiceStatus;
    mongodb: ServiceStatus;
    mlService: ServiceStatus;
  };
  simulatorActive: boolean;
  recentLogs: Array<{
    _id: string;
    eventType: string;
    message: string;
    details?: any;
    timestamp: string;
  }>;
}

export interface SettingsData {
  autoStartThreshold: number;
  autoStopThreshold: number;
  aiTargetMoisture: number;
  maxPumpRuntime: number;
  sensorUpdateInterval: number;
  soilDryADC: number;
  soilWetADC: number;
  activeMLModel: string;
  simulatorActive: boolean;
}
