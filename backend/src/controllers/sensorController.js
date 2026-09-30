const SensorReading = require('../models/SensorReading');
const pumpController = require('../services/pumpController');
const mqttService = require('../services/mqttService');

exports.getLatest = async (req, res) => {
  try {
    const esp32Status = mqttService.getESP32Status();
    // Pure hardware mode: fetch latest real telemetry from ESP32
    const latest = await SensorReading.findOne({ source: 'esp32' }).sort({ timestamp: -1 });

    const moistureVal = latest ? latest.soilMoisture : pumpController.currentMoisture;
    const rawADCVal = (latest && latest.rawADC != null) ? latest.rawADC : 0;

    res.json({
      success: true,
      data: {
        soilMoisture: moistureVal,
        rawADC: rawADCVal,
        tankLevel: -1,
        waterLevelCm: -1,
        tankStatus: 'NO ECHO',
        sensorId: latest ? latest.sensorId : 'ESP32-S3-001',
        source: 'esp32',
        timestamp: latest ? latest.timestamp : new Date(),
        esp32Status: esp32Status,
        simulatorActive: false
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const readings = await SensorReading.find({ source: 'esp32' })
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
    const readings = await SensorReading.find({ source: 'esp32' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('soilMoisture realMoisture rawADC timestamp source')
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
