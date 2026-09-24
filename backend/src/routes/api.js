const express = require('express');
const router = express.Router();

const sensorCtrl = require('../controllers/sensorController');
const pumpCtrl = require('../controllers/pumpControllerApi');
const mlCtrl = require('../controllers/mlController');
const analyticsCtrl = require('../controllers/analyticsController');
const exportCtrl = require('../controllers/exportController');
const systemCtrl = require('../controllers/systemController');

// --- Sensor Routes ---
router.get('/sensors/latest', sensorCtrl.getLatest);
router.get('/sensors/history', sensorCtrl.getHistory);
router.get('/soil-moisture/history', sensorCtrl.getSoilMoistureHistory);
router.get('/tank/history', sensorCtrl.getTankHistory);

// --- Pump Controls & Status ---
router.get('/pumps/status', pumpCtrl.getStatus);
router.post('/pumps/irrigation/on', pumpCtrl.turnIrrigationOn);
router.post('/pumps/irrigation/off', pumpCtrl.turnIrrigationOff);
router.post('/pumps/fill/on', pumpCtrl.turnFillOn);
router.post('/pumps/fill/off', pumpCtrl.turnFillOff);
router.get('/pumps/events', pumpCtrl.getEvents);

// --- Automation Control ---
router.post('/automation/enable', pumpCtrl.enableAutomation);
router.post('/automation/disable', pumpCtrl.disableAutomation);

// --- Machine Learning Routes ---
router.post('/ml/predict', mlCtrl.predict);
router.post('/ml/train', mlCtrl.train);
router.get('/ml/metrics', mlCtrl.getMetrics);
router.get('/ml/feature-importance', mlCtrl.getFeatureImportance);
router.get('/ml/predictions', mlCtrl.getPredictions);
router.get('/ml/models', mlCtrl.compareModels);
router.post('/ml/set-active-model', mlCtrl.setActiveModel);

// --- Analytics & History Routes ---
router.get('/analytics', analyticsCtrl.getAnalytics);
router.get('/irrigation/history', analyticsCtrl.getIrrigationHistory);

// --- Data Export Routes ---
router.get('/export/sensors.csv', exportCtrl.exportSensorsCSV);
router.get('/export/irrigation.csv', exportCtrl.exportIrrigationCSV);
router.get('/export/training.csv', exportCtrl.exportTrainingCSV);

// --- System Status & Settings ---
router.get('/system/status', systemCtrl.getSystemStatus);
router.get('/settings', systemCtrl.getSettings);
router.post('/settings', systemCtrl.updateSettings);

// --- Simulator Hooks ---
router.post('/simulator/toggle', systemCtrl.toggleSimulator);
router.post('/simulator/set-moisture', systemCtrl.setSimulatedMoisture);
router.post('/simulator/toggle-no-echo', systemCtrl.toggleSimulatedNoEcho);

// --- Node-RED Ingestion Webhooks ---
router.post('/nodered/telemetry', systemCtrl.receiveNodeRedTelemetry);
router.post('/nodered/pump-event', systemCtrl.receiveNodeRedPumpEvent);

module.exports = router;
