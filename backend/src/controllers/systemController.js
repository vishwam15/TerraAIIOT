const mongoose = require('mongoose');
const Settings = require('../models/Settings');
const SystemEvent = require('../models/SystemEvent');
const SensorReading = require('../models/SensorReading');
const PumpEvent = require('../models/PumpEvent');
const pumpController = require('../services/pumpController');
const mqttService = require('../services/mqttService');
const mlClient = require('../services/mlClient');
const simulator = require('../services/simulator');

exports.getSystemStatus = async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    const mlHealth = await mlClient.checkHealth();
    const mlStatus = mlHealth.status === 'healthy' ? 'Connected' : 'Error';
    const mqttStatus = mqttService.isConnected ? 'Connected' : 'Disconnected';
    const esp32Status = mqttService.getESP32Status() === 'ONLINE' ? 'Connected' : (simulator.isActive ? 'Connected (Simulated)' : 'Disconnected');
    // Node-RED connects to MQTT, so if MQTT is up, Node-RED gateway channel is healthy
    const nodeRedStatus = mqttService.isConnected ? 'Connected' : 'Disconnected';

    const recentLogs = await SystemEvent.find().sort({ timestamp: -1 }).limit(20).lean();

    const backendPort = String(process.env.PORT || '1607');

    res.json({
      success: true,
      data: {
        services: {
          esp32: { name: 'ESP32-S3 Firmware', status: esp32Status, port: 'GPIO 1,4,5,6,7', details: esp32Status === 'Connected' ? 'Telemetry active' : 'Offline / Waiting MQTT' },
          mqtt: { name: 'HiveMQ MQTT Broker', status: mqttStatus, port: '1883', details: 'broker.hivemq.com' },
          nodeRed: { name: 'Node-RED Gateway', status: nodeRedStatus, port: '1880', details: 'MQTT Validation & HTTP Forwarder' },
          backend: { name: 'Node.js/Express Backend', status: 'Connected', port: backendPort, details: 'REST & WebSocket Hub' },
          mongodb: { name: 'MongoDB Database', status: mongoStatus, port: '27017', details: 'Collections & Indexes active' },
          mlService: { name: 'Python FastAPI ML Engine', status: mlStatus, port: '8000', details: `Active Model: ${mlHealth.active_model || 'RandomForestRegressor'}` }
        },
        simulatorActive: simulator.isActive,
        recentLogs: recentLogs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { autoStartThreshold, autoStopThreshold, aiTargetMoisture, maxPumpRuntime, sensorUpdateInterval } = req.body;

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    if (autoStartThreshold !== undefined) settings.autoStartThreshold = Number(autoStartThreshold);
    if (autoStopThreshold !== undefined) settings.autoStopThreshold = Number(autoStopThreshold);
    if (aiTargetMoisture !== undefined) settings.aiTargetMoisture = Number(aiTargetMoisture);
    if (maxPumpRuntime !== undefined) settings.maxPumpRuntime = Number(maxPumpRuntime);
    if (sensorUpdateInterval !== undefined) settings.sensorUpdateInterval = Number(sensorUpdateInterval);

    await settings.save();

    await SystemEvent.create({
      eventType: 'INFO',
      message: 'System settings updated successfully.',
      details: req.body
    });

    res.json({ success: true, message: 'Settings updated successfully.', data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.toggleSimulator = async (req, res) => {
  try {
    if (simulator.isActive) {
      simulator.stop();
    } else {
      simulator.start();
    }
    await Settings.findOneAndUpdate({}, { simulatorActive: simulator.isActive });
    res.json({ success: true, active: simulator.isActive });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.setSimulatedMoisture = (req, res) => {
  const { moisture } = req.body;
  if (moisture !== undefined) {
    simulator.setMoisture(Number(moisture));
    res.json({ success: true, currentMoisture: simulator.moisture });
  } else {
    res.status(400).json({ success: false, error: 'moisture is required' });
  }
};

exports.toggleSimulatedNoEcho = (req, res) => {
  const state = simulator.toggleNoEcho();
  res.json({ success: true, noEcho: state });
};

// Node-RED Webhook Receiver
exports.receiveNodeRedTelemetry = async (req, res) => {
  try {
    const { sensorId, soilMoisture, rawADC, tankLevel, source } = req.body;
    if (typeof soilMoisture !== 'undefined') {
      const reading = await SensorReading.create({
        sensorId: sensorId || 'ESP32-S3-001',
        soilMoisture: Number(soilMoisture),
        rawADC: rawADC,
        tankLevel: tankLevel !== undefined ? Number(tankLevel) : -1,
        source: source || 'esp32',
        timestamp: new Date()
      });
      await pumpController.handleMoistureUpdate(Number(soilMoisture), tankLevel, source || 'esp32');
    }
    res.json({ success: true, message: 'Node-RED telemetry ingested' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.receiveNodeRedPumpEvent = async (req, res) => {
  try {
    const { pumpId, action } = req.body;
    if (pumpId && action) {
      await PumpEvent.create({
        pumpId: pumpId === 'PUMP_1' ? 'PUMP_1' : 'PUMP_2',
        action: action.toUpperCase() === 'ON' ? 'ON' : 'OFF',
        reason: 'node_red_relay',
        soilMoistureAtEvent: pumpController.currentMoisture,
        source: 'node_red'
      });
    }
    res.json({ success: true, message: `Node-RED pump event ${pumpId} -> ${action} recorded` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
