const mongoose = require('mongoose');

const MLPredictionSchema = new mongoose.Schema({
  currentMoisture: { type: Number, required: true },
  targetMoisture: { type: Number, required: true },
  moistureDeficit: { type: Number, required: true },
  predictedRuntimeSeconds: { type: Number, required: true },
  model: { type: String, default: 'RandomForestRegressor' },
  modelVersion: { type: String, default: 'v1.0' },
  confidenceR2: { type: Number },
  safetyClamped: { type: Boolean, default: false },
  explanation: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  collection: 'ml_predictions',
  timestamps: true
});

MLPredictionSchema.index({ timestamp: -1 });

module.exports = mongoose.model('MLPrediction', MLPredictionSchema);
