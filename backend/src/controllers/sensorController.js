const SensorReading = require('../models/SensorReading');
const pumpController = require('../services/pumpController');
const mqttService = require('../services/mqttService');
const simulator = require('../services/simulator');

exports.getLatest = async (req, res) => {
  try {
    const latest = await SensorReading.findOne().sort({ timestamp: -1 });
    const pumpStatus = pumpController.getStatus();
    
    res.json({
      success: true,
      data: {
        soilMoisture: latest ? latest.soilMoisture : pumpController.currentMoisture,
        rawADC: latest ? latest.rawADC : 2250,
        tankLevel: latest ? latest.tankLevel : pumpController.currentTankLevel,
        tankStatus: (latest && latest.tankLevel === -1) ? 'NO ECHO' : 'OK',
        sensorId: latest ? latest.sensorId : 'ESP32-S3-001',
        source: latest ? latest.source : 'DEMO DATA',
        timestamp: latest ? latest.timestamp : new Date(),
        esp32Status: mqttService.getESP32Status(),
        simulatorActive: simulator.isActive
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const readings = await SensorReading.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, count: readings.length, data: readings.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSoilMoistureHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 300);
    const readings = await SensorReading.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('soilMoisture rawADC timestamp source')
      .lean();
    res.json({ success: true, count: readings.length, data: readings.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTankHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 300);
    const readings = await SensorReading.find({ tankLevel: { $ne: null } })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('tankLevel timestamp source')
      .lean();
    res.json({ success: true, count: readings.length, data: readings.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
