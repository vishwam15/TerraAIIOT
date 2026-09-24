const mongoose = require('mongoose');

const MLTrainingDataSchema = new mongoose.Schema({
  initialMoisture: { type: Number, required: true },
  targetMoisture: { type: Number, required: true },
  moistureDeficit: { type: Number, required: true },
  pumpRuntimeSeconds: { type: Number, required: true },
  finalMoisture: { type: Number },
  moistureIncrease: { type: Number },
  soilCondition: { type: String, default: 'moderate' },
  recentMoistureChange: { type: Number, default: -0.25 },
  previousPumpRuntime: { type: Number, default: 2.0 },
  pumpId: { type: String, default: 'PUMP_2' },
  source: { type: String, default: 'DEMO DATA', index: true },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  collection: 'irrigation_training_data',
  timestamps: true
});

MLTrainingDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('MLTrainingData', MLTrainingDataSchema);
