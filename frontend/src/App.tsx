import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardPage } from './pages/DashboardPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { ControlPage } from './pages/ControlPage';
import { PredictionSimulatorPage } from './pages/PredictionSimulatorPage';
import { MLAnalyticsPage } from './pages/MLAnalyticsPage';
import { ModelComparisonPage } from './pages/ModelComparisonPage';
import { IrrigationHistoryPage } from './pages/IrrigationHistoryPage';
import { TimelinePage } from './pages/TimelinePage';
import { ExportPage } from './pages/ExportPage';
import { SystemHealthPage } from './pages/SystemHealthPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { wsClient } from './services/websocket';
import { SensorReading, PumpStatus, AIPredictionResult, SettingsData } from './types';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentMoisture, setCurrentMoisture] = useState<number>(38.4);
  const [rawADC, setRawADC] = useState<number>(2310);
  const [tankLevel, setTankLevel] = useState<number>(72);
  const [source, setSource] = useState<'esp32' | 'DEMO DATA' | 'manual' | 'simulator'>('DEMO DATA');
  const [sensorHistory, setSensorHistory] = useState<SensorReading[]>([]);
  const [pumpStatus, setPumpStatus] = useState<PumpStatus>({
    pump1: { id: 'PUMP_1', name: 'Tank Filling Pump', gpio: 6, status: 'OFF', running: false, runtimeSeconds: 0 },
    pump2: { id: 'PUMP_2', name: 'Irrigation Pump', gpio: 7, status: 'OFF', running: false, runtimeSeconds: 0 },
    autoMode: false,
    currentMoisture: 38.4,
    currentTankLevel: 72,
    lastCommand: 'INIT',
    mutualExclusionActive: true,
    activeCycle: null
  });
  const [prediction, setPrediction] = useState<AIPredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [simulatorActive, setSimulatorActive] = useState<boolean>(false);
  const [noEchoActive, setNoEchoActive] = useState<boolean>(false);
  const [esp32Status, setEsp32Status] = useState<string>('ONLINE');
  const [mqttConnected, setMqttConnected] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);
  const [settings, setSettings] = useState<SettingsData>({
    autoStartThreshold: 30,
    autoStopThreshold: 80,
    aiTargetMoisture: 80,
    maxPumpRuntime: 30,
    sensorUpdateInterval: 1000,
    soilDryADC: 3000,
    soilWetADC: 1200,
    activeMLModel: 'RandomForestRegressor',
    simulatorActive: false
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Initial Data Fetch
  const loadInitialData = async () => {
    try {
      const [latestRes, statusRes, historyRes, settingsRes] = await Promise.all([
        api.getLatestSensors(),
        api.getPumpStatus(),
        api.getSensorHistory(60),
        api.getSettings()
      ]);

      if (latestRes.success && latestRes.data) {
        setCurrentMoisture(latestRes.data.soilMoisture);
        setRawADC(latestRes.data.rawADC || 2300);
        setTankLevel(latestRes.data.tankLevel);
        setSource(latestRes.data.source || 'DEMO DATA');
        setSimulatorActive(latestRes.data.simulatorActive || false);
      }

      if (statusRes.success && statusRes.data) {
        setPumpStatus(statusRes.data);
      }

      if (historyRes.data) {
        setSensorHistory(historyRes.data);
      }

      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }

      // Initial prediction query
      fetchPrediction(latestRes.data?.soilMoisture || 38.4, settingsRes.data?.aiTargetMoisture || 80);
    } catch (err) {
      console.warn('Initial data load warning:', err);
    }
  };

  const fetchPrediction = async (moisture: number, target: number) => {
    try {
      setIsPredicting(true);
      const res = await api.predictPumpRuntime(moisture, target);
      if (res.success) {
        setPrediction(res.data);
      }
    } catch (e) {
      console.warn('Error fetching prediction:', e);
    } finally {
      setIsPredicting(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Connect WebSocket
    wsClient.connect();
    const unsubscribe = wsClient.subscribe((type, data) => {
      if (type === 'CONNECTION_STATUS') {
        setIsLive(data.connected);
      } else if (type === 'SENSOR_UPDATE') {
        setCurrentMoisture(data.soilMoisture);
        if (data.rawADC) setRawADC(data.rawADC);
        if (data.tankLevel !== undefined) setTankLevel(data.tankLevel);
        if (data.source) setSource(data.source);

        setSensorHistory(prev => {
          const updated = [...prev, data];
          return updated.slice(-60); // keep last 60 seconds
        });
      } else if (type === 'PUMP_STATUS_UPDATE') {
        setPumpStatus(data);
      } else if (type === 'AI_IRRIGATION_STARTED') {
        showNotification(`AI Irrigation Started: Pump 2 running for ${data.predictedRuntime}s.`);
      } else if (type === 'IRRIGATION_CYCLE_COMPLETED') {
        showNotification(`Irrigation Cycle Finished: Moisture increased by +${data.moistureGain}%.`);
      } else if (type === 'MQTT_CONNECTION') {
        setMqttConnected(data.connected);
      }
    });

    // Fallback polling every 5s
    const pollInterval = setInterval(async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          api.getPumpStatus(),
          api.getLatestSensors()
        ]);
        if (pRes.success) setPumpStatus(pRes.data);
        if (sRes.success) {
          setEsp32Status(sRes.data.esp32Status || 'ONLINE');
        }
      } catch (e) {
        // silent
      }
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Actuator Handlers
  const handleTurnIrrigationOn = async (duration?: number) => {
    const res = await api.turnIrrigationOn(duration, settings.aiTargetMoisture);
    if (res.success) {
      setPumpStatus(res.data);
      showNotification(res.message);
    }
  };

  const handleTurnIrrigationOff = async () => {
    const res = await api.turnIrrigationOff();
    if (res.success) {
      setPumpStatus(res.data);
      showNotification(res.message);
    }
  };

  const handleTurnFillOn = async () => {
    const res = await api.turnFillOn();
    if (res.success) {
      setPumpStatus(res.data);
      showNotification(res.message);
    }
  };

  const handleTurnFillOff = async () => {
    const res = await api.turnFillOff();
    if (res.success) {
      setPumpStatus(res.data);
      showNotification(res.message);
    }
  };

  const handleEnableAuto = async () => {
    const res = await api.enableAutomation();
    if (res.success) {
      setPumpStatus(res.data);
      showNotification(res.message);
    }
  };

  const handleDisableAuto = async () => {
    const res = await api.disableAutomation();
    if (res.success) {
      setPumpStatus(res.data);
      showNotification(res.message);
    }
  };

  const handleToggleSimulator = async () => {
    const res = await api.toggleSimulator();
    if (res.success) {
      setSimulatorActive(res.active);
      showNotification(`ESP32 Simulator ${res.active ? 'ACTIVATED' : 'STOPPED'}.`);
    }
  };

  const handleToggleNoEcho = async () => {
    const res = await api.toggleSimulatedNoEcho();
    if (res.success) {
      setNoEchoActive(res.noEcho);
      showNotification(`Ultrasonic NO ECHO simulation ${res.noEcho ? 'ENABLED (-1)' : 'DISABLED'}.`);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        esp32Online={esp32Status === 'ONLINE' || simulatorActive}
        autoMode={pumpStatus.autoMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          source={source}
          isLive={isLive}
          simulatorActive={simulatorActive}
          noEchoActive={noEchoActive}
          onToggleSimulator={handleToggleSimulator}
          onToggleNoEcho={handleToggleNoEcho}
          esp32Status={esp32Status}
          mqttConnected={mqttConnected}
        />

        {/* Global Toast Notification */}
        {notification && (
          <div className="sticky top-16 z-30 px-6 py-2 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between backdrop-blur-md">
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">✕</button>
          </div>
        )}

        <main className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {currentTab === 'dashboard' && (
            <DashboardPage
              currentMoisture={currentMoisture}
              rawADC={rawADC}
              tankLevel={tankLevel}
              sensorHistory={sensorHistory}
              pumpStatus={pumpStatus}
              prediction={prediction}
              settings={settings}
              onTurnIrrigationOn={handleTurnIrrigationOn}
              onTurnIrrigationOff={handleTurnIrrigationOff}
              onTurnFillOn={handleTurnFillOn}
              onTurnFillOff={handleTurnFillOff}
              onEnableAuto={handleEnableAuto}
              onDisableAuto={handleDisableAuto}
              onRefreshPrediction={() => fetchPrediction(currentMoisture, settings.aiTargetMoisture)}
              isPredicting={isPredicting}
            />
          )}

          {currentTab === 'live-monitoring' && (
            <LiveMonitoringPage
              currentMoisture={currentMoisture}
              rawADC={rawADC}
              tankLevel={tankLevel}
              sensorHistory={sensorHistory}
              source={source}
            />
          )}

          {currentTab === 'irrigation-control' && (
            <ControlPage
              pumpStatus={pumpStatus}
              settings={settings}
              onTurnIrrigationOn={handleTurnIrrigationOn}
              onTurnIrrigationOff={handleTurnIrrigationOff}
              onTurnFillOn={handleTurnFillOn}
              onTurnFillOff={handleTurnFillOff}
              onEnableAuto={handleEnableAuto}
              onDisableAuto={handleDisableAuto}
            />
          )}

          {currentTab === 'ai-prediction' && (
            <PredictionSimulatorPage
              initialMoisture={currentMoisture}
              initialTarget={settings.aiTargetMoisture}
            />
          )}

          {currentTab === 'ml-analytics' && (
            <MLAnalyticsPage />
          )}

          {currentTab === 'model-comparison' && (
            <ModelComparisonPage />
          )}

          {currentTab === 'irrigation-history' && (
            <IrrigationHistoryPage />
          )}

          {currentTab === 'sensor-timeline' && (
            <TimelinePage />
          )}

          {currentTab === 'data-export' && (
            <ExportPage />
          )}

          {currentTab === 'system-health' && (
            <SystemHealthPage />
          )}

          {currentTab === 'settings' && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={setSettings}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
