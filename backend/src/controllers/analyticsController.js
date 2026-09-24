const SensorReading = require('../models/SensorReading');
const IrrigationCycle = require('../models/IrrigationCycle');
const PumpEvent = require('../models/PumpEvent');
const MLTrainingData = require('../models/MLTrainingData');
const mlClient = require('../services/mlClient');

exports.getAnalytics = async (req, res) => {
  try {
    // 1. Sensor aggregate stats
    const sensorStats = await SensorReading.aggregate([
      {
        $group: {
          _id: null,
          avgMoisture: { $avg: '$soilMoisture' },
          minMoisture: { $min: '$soilMoisture' },
          maxMoisture: { $max: '$soilMoisture' },
          totalReadings: { $sum: 1 }
        }
      }
    ]);

    // 2. Irrigation cycle stats
    const cycleStats = await IrrigationCycle.aggregate([
      {
        $group: {
          _id: null,
          totalCycles: { $sum: 1 },
          totalRuntimeSeconds: { $sum: '$actualRuntime' },
          avgRuntimeSeconds: { $avg: '$actualRuntime' },
          avgMoistureGain: { $avg: '$moistureGain' },
          avgPredictionError: { $avg: '$predictionError' }
        }
      }
    ]);

    // 3. Recent 30 sensor points for trend line
    const recentSensors = await SensorReading.find()
      .sort({ timestamp: -1 })
      .limit(30)
      .lean();

    // 4. Recent irrigation cycles
    const recentCycles = await IrrigationCycle.find()
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    // 5. ML Metrics
    let mlMetrics = await mlClient.getMetrics();

    res.json({
      success: true,
      data: {
        sensors: sensorStats[0] || { avgMoisture: 42, minMoisture: 20, maxMoisture: 85, totalReadings: 0 },
        irrigation: cycleStats[0] || { totalCycles: 0, totalRuntimeSeconds: 0, avgRuntimeSeconds: 0, avgMoistureGain: 0, avgPredictionError: 0 },
        recentMoistureTrend: recentSensors.reverse(),
        recentCycles: recentCycles,
        mlMetrics: mlMetrics.metrics || mlMetrics
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getIrrigationHistory = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const cycles = await IrrigationCycle.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, count: cycles.length, data: cycles });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
