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
  const [source, setSource] = useState<string>('esp32');
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
  const [esp32Status, setEsp32Status] = useState<string>('OFFLINE');
  const [mqttConnected, setMqttConnected] = useState<boolean>(false);
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
        const initMoisture = Number(latestRes.data.soilMoisture);
        console.log(`[Frontend] Soil moisture updated: ${initMoisture.toFixed(1)}% (Initial Load)`);
        setCurrentMoisture(initMoisture);
        if (latestRes.data.rawADC != null) setRawADC(latestRes.data.rawADC);
        setSource(latestRes.data.source || 'esp32');
        setEsp32Status(latestRes.data.esp32Status || 'OFFLINE');
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
      } else if (type === 'INITIAL_STATE') {
        if (data.pumps) setPumpStatus(data.pumps);
        if (data.esp32Status) setEsp32Status(data.esp32Status);
        if (data.mqttConnected !== undefined) setMqttConnected(data.mqttConnected);
        if (data.latestSensor) {
          const m = Number(data.latestSensor.soilMoisture);
          if (!isNaN(m)) setCurrentMoisture(m);
          if (data.latestSensor.rawADC != null) setRawADC(data.latestSensor.rawADC);
          setSource('esp32');
        }
      } else if (type === 'SENSOR_UPDATE') {
        const moisture = Number(data.soilMoisture);
        if (!isNaN(moisture) && moisture >= 0 && moisture <= 100) {
          console.log(`[Frontend] Soil moisture updated: ${moisture.toFixed(1)}%`);
          setCurrentMoisture(moisture);
        }
        if (data.rawADC != null) setRawADC(data.rawADC);
        setSource('esp32');
        setEsp32Status('ONLINE');

        setSensorHistory(prev => {
          const updated = [...prev, data];
          return updated.slice(-60); // keep last 60 seconds
        });
      } else if (type === 'PUMP_STATUS_UPDATE') {
        setPumpStatus(data);
      } else if (type === 'MQTT_PUMP_STATUS') {
        const { pumpId, action } = data;
        const isOn = action === 'ON';
        setPumpStatus(prev => ({
          ...prev,
          pump1: pumpId === 'PUMP_1' ? { ...prev.pump1, running: isOn, status: isOn ? 'ON' : 'OFF' } : (isOn ? { ...prev.pump1, running: false, status: 'OFF' } : prev.pump1),
          pump2: pumpId === 'PUMP_2' ? { ...prev.pump2, running: isOn, status: isOn ? 'ON' : 'OFF' } : (isOn ? { ...prev.pump2, running: false, status: 'OFF' } : prev.pump2)
        }));
      } else if (type === 'AI_IRRIGATION_STARTED') {
        showNotification(`AI Irrigation Started: Pump 2 running for ${data.predictedRuntime}s.`);
      } else if (type === 'IRRIGATION_CYCLE_COMPLETED') {
        showNotification(`Irrigation Cycle Finished: Moisture increased by +${data.moistureGain}%.`);
      } else if (type === 'MQTT_CONNECTION') {
        setMqttConnected(data.connected);
      }
    });

    // Fallback polling every 2s to keep UI perfectly synchronized
    const pollInterval = setInterval(async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          api.getPumpStatus(),
          api.getLatestSensors()
        ]);
        if (pRes.success) setPumpStatus(pRes.data);
        if (sRes.success && sRes.data) {
          setEsp32Status(sRes.data.esp32Status || 'OFFLINE');
          const m = Number(sRes.data.soilMoisture);
          if (!isNaN(m) && m >= 0) setCurrentMoisture(m);
          if (sRes.data.rawADC != null) setRawADC(sRes.data.rawADC);
          setSource('esp32');
        }
      } catch (e) {
        // silent
      }
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Actuator Handlers
  const handleTurnIrrigationOn = async (duration?: number, forceManual = false): Promise<any> => {
    const res = await api.turnIrrigationOn(duration, settings.aiTargetMoisture, forceManual);
    if (res.success) {
      if (res.data) setPumpStatus(res.data);
      showNotification(res.message);
    }
    return res; // Return full response so ControlPanel can read predictedRuntime for countdown
  };

  const handleTurnIrrigationOff = async (): Promise<any> => {
    const res = await api.turnIrrigationOff();
    if (res.success) {
      if (res.data) setPumpStatus(res.data);
      showNotification(res.message);
    }
    return res;
  };

  const handleTurnFillOn = async (): Promise<any> => {
    const res = await api.turnFillOn();
    if (res.success) {
      if (res.data) setPumpStatus(res.data);
      showNotification(res.message);
    }
    return res;
  };

  const handleTurnFillOff = async (): Promise<any> => {
    const res = await api.turnFillOff();
    if (res.success) {
      if (res.data) setPumpStatus(res.data);
      showNotification(res.message);
    }
    return res;
  };

  const handleEnableAuto = async (): Promise<any> => {
    const res = await api.enableAutomation();
    if (res.success) {
      if (res.data) setPumpStatus(res.data);
      showNotification(res.message);
    }
    return res;
  };

  const handleDisableAuto = async (): Promise<any> => {
    const res = await api.disableAutomation();
    if (res.success) {
      if (res.data) setPumpStatus(res.data);
      showNotification(res.message);
    }
    return res;
  };

  const handleUpdateTargetMoisture = async (target: number): Promise<void> => {
    const newSettings = { ...settings, aiTargetMoisture: target };
    setSettings(newSettings);
    await api.updateSettings({ aiTargetMoisture: target });
    fetchPrediction(currentMoisture, target);
  };

  const handleUpdateStartThreshold = async (threshold: number): Promise<void> => {
    const newSettings = { ...settings, autoStartThreshold: threshold };
    setSettings(newSettings);
    await api.updateSettings({ autoStartThreshold: threshold });
  };



  return (
    <div className="flex min-h-screen bg-gradient-to-br from-sky-50/70 via-white to-blue-50/50 text-slate-800 font-sans selection:bg-sky-200">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        esp32Online={esp32Status === 'ONLINE'}
        autoMode={pumpStatus.autoMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          currentTab={currentTab}
          source={source}
          isLive={isLive}
          esp32Status={esp32Status}
          mqttConnected={mqttConnected}
        />

        {/* Global Toast Notification */}
        {notification && (
          <div className="sticky top-16 z-30 px-6 py-2.5 bg-emerald-50/95 border-b border-emerald-200 text-emerald-800 text-xs font-mono flex items-center justify-between backdrop-blur-xl shadow-xs animate-mac-fade-in">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{notification}</span>
            </span>
            <button onClick={() => setNotification(null)} className="text-emerald-600 hover:text-emerald-950 p-1 font-bold">✕</button>
          </div>
        )}

        <main className="p-6 flex-1 overflow-y-auto custom-scrollbar animate-mac-fade-in" key={currentTab}>
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
              onUpdateTargetMoisture={handleUpdateTargetMoisture}
              onUpdateStartThreshold={handleUpdateStartThreshold}
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
              currentMoisture={currentMoisture}
              prediction={prediction}
              onTurnIrrigationOn={handleTurnIrrigationOn}
              onTurnIrrigationOff={handleTurnIrrigationOff}
              onTurnFillOn={handleTurnFillOn}
              onTurnFillOff={handleTurnFillOff}
              onEnableAuto={handleEnableAuto}
              onDisableAuto={handleDisableAuto}
              onUpdateTargetMoisture={handleUpdateTargetMoisture}
              onUpdateStartThreshold={handleUpdateStartThreshold}
            />
          )}

          {currentTab === 'ai-prediction' && (
            <PredictionSimulatorPage
              initialMoisture={currentMoisture}
              initialTarget={settings.aiTargetMoisture}
            />
          )}

          {currentTab === 'ml-analytics' && (
            <MLAnalyticsPage
              currentMoisture={currentMoisture}
              rawADC={rawADC}
              sensorHistory={sensorHistory}
              prediction={prediction}
              targetMoisture={settings.aiTargetMoisture}
              isLive={isLive}
            />
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
