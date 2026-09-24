const mlClient = require('../services/mlClient');
const MLPrediction = require('../models/MLPrediction');
const MLTrainingData = require('../models/MLTrainingData');
const Settings = require('../models/Settings');

exports.predict = async (req, res) => {
  try {
    const { current_moisture, target_moisture = 80, recent_moisture_change = -0.25, previous_pump_runtime = 2.0 } = req.body;
    
    if (typeof current_moisture === 'undefined' || isNaN(current_moisture)) {
      return res.status(400).json({ success: false, error: 'current_moisture is required and must be a number.' });
    }

    const prediction = await mlClient.predict(
      current_moisture,
      target_moisture,
      recent_moisture_change,
      previous_pump_runtime
    );

    // Save prediction record
    await MLPrediction.create({
      currentMoisture: current_moisture,
      targetMoisture: target_moisture,
      moistureDeficit: prediction.moisture_deficit || (target_moisture - current_moisture),
      predictedRuntimeSeconds: prediction.predicted_runtime_seconds,
      model: prediction.model || 'RandomForestRegressor',
      modelVersion: prediction.model_version || 'v1.0',
      confidenceR2: prediction.confidence_r2,
      safetyClamped: prediction.safety_clamped,
      explanation: prediction.explanation
    });

    res.json({ success: true, data: prediction });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.train = async (req, res) => {
  try {
    // Fetch latest training records from MongoDB
    const records = await MLTrainingData.find().sort({ timestamp: -1 }).limit(1000).lean();
    
    const formatted = records.map(r => ({
      initialMoisture: r.initialMoisture,
      targetMoisture: r.targetMoisture,
      moistureDeficit: r.moistureDeficit,
      pumpRuntimeSeconds: r.pumpRuntimeSeconds,
      finalMoisture: r.finalMoisture,
      moistureIncrease: r.moistureIncrease,
      soilCondition: r.soilCondition || 'moderate',
      recentMoistureChange: r.recentMoistureChange || -0.25,
      previousPumpRuntime: r.previousPumpRuntime || 2.0,
      source: r.source || 'LIVE DATA'
    }));

    const result = await mlClient.train(formatted.length > 0 ? formatted : null);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getMetrics = async (req, res) => {
  try {
    const data = await mlClient.getMetrics();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getFeatureImportance = async (req, res) => {
  try {
    const data = await mlClient.getFeatureImportance();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPredictions = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const predictions = await MLPrediction.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, count: predictions.length, data: predictions });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.compareModels = async (req, res) => {
  try {
    const data = await mlClient.compareModels();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.setActiveModel = async (req, res) => {
  try {
    const { model_name } = req.body;
    if (!model_name) {
      return res.status(400).json({ success: false, error: 'model_name is required.' });
    }
    const result = await mlClient.setActiveModel(model_name);
    await Settings.findOneAndUpdate({}, { activeMLModel: model_name }, { upsert: true });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
