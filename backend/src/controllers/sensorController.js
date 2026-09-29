const SensorReading = require('../models/SensorReading');
const pumpController = require('../services/pumpController');
const mqttService = require('../services/mqttService');
const simulator = require('../services/simulator');

exports.getLatest = async (req, res) => {
  try {
    const esp32Status = mqttService.getESP32Status();
    let latest = null;

    // 1. If ESP32 is currently online or has ever published real data, prioritize real reading
    latest = await SensorReading.findOne({ source: 'esp32' }).sort({ timestamp: -1 });

    // 2. Only if no real ESP32 reading exists and simulator is explicitly active, use simulator reading
    if (!latest && simulator.isActive) {
      latest = await SensorReading.findOne().sort({ timestamp: -1 });
    }

    const moistureVal = latest ? latest.soilMoisture : pumpController.currentMoisture;
    const sourceVal = latest ? latest.source : (esp32Status === 'ONLINE' ? 'esp32' : (simulator.isActive ? 'DEMO DATA' : 'esp32'));

    // Console log format: [API] Latest soil moisture: 42.6%
    console.log(`[API] Latest soil moisture: ${Number(moistureVal).toFixed(1)}%`);

    res.json({
      success: true,
      data: {
        soilMoisture: moistureVal,
        rawADC: (latest && latest.rawADC != null) ? latest.rawADC : 2250,
        tankLevel: latest ? latest.tankLevel : pumpController.currentTankLevel,
        waterLevelCm: pumpController.waterLevelCm,
        tankStatus: (latest && latest.tankLevel === -1) ? 'NO ECHO' : 'OK',
        sensorId: latest ? latest.sensorId : 'ESP32-S3-001',
        source: sourceVal,
        timestamp: latest ? latest.timestamp : new Date(),
        esp32Status: esp32Status,
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
    // Prioritize real ESP32 readings if available
    let readings = await SensorReading.find({ source: 'esp32' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    if (readings.length === 0) {
      readings = await SensorReading.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    }

    res.json({ success: true, count: readings.length, data: readings.reverse() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getSoilMoistureHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 60, 300);
    let readings = await SensorReading.find({ source: 'esp32' })
      .sort({ timestamp: -1 })
      .limit(limit)
      .select('soilMoisture rawADC timestamp source')
      .lean();

    if (readings.length === 0) {
      readings = await SensorReading.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('soilMoisture rawADC timestamp source')
        .lean();
    }

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
