const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  autoStartThreshold: { type: Number, default: 30 },
  autoStopThreshold: { type: Number, default: 80 },
  aiTargetMoisture: { type: Number, default: 80 },
  maxPumpRuntime: { type: Number, default: 30 },
  sensorUpdateInterval: { type: Number, default: 1000 },
  soilDryADC: { type: Number, default: 3000 },
  soilWetADC: { type: Number, default: 1200 },
  activeMLModel: { type: String, default: 'RandomForestRegressor' },
  simulatorActive: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', SettingsSchema);
