const mongoose = require('mongoose');

const IrrigationCycleSchema = new mongoose.Schema({
  pumpId: { type: String, default: 'PUMP_2', index: true },
  triggerType: { type: String, enum: ['automatic', 'manual'], default: 'automatic' },
  beforeMoisture: { type: Number, required: true },
  targetMoisture: { type: Number, default: 80 },
  predictedRuntime: { type: Number, required: true },
  actualRuntime: { type: Number, default: 0 },
  afterMoisture: { type: Number },
  moistureGain: { type: Number },
  gainPerSecond: { type: Number },
  predictionError: { type: Number }, // |targetMoisture - afterMoisture|
  modelUsed: { type: String, default: 'RandomForestRegressor' },
  status: { type: String, enum: ['in_progress', 'completed', 'cancelled'], default: 'in_progress' },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  source: { type: String, default: 'LIVE DATA' }
}, {
  timestamps: true
});

IrrigationCycleSchema.index({ createdAt: -1, pumpId: 1 });

module.exports = mongoose.model('IrrigationCycle', IrrigationCycleSchema);
