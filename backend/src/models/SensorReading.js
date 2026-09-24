const mongoose = require('mongoose');

const SensorReadingSchema = new mongoose.Schema({
  sensorId: { type: String, default: 'ESP32-S3-001', index: true },
  soilMoisture: { type: Number, required: true },
  rawADC: { type: Number },
  tankLevel: { type: Number, default: -1 }, // -1 means NO ECHO
  source: { type: String, default: 'esp32', enum: ['esp32', 'DEMO DATA', 'manual', 'simulator'] },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

SensorReadingSchema.index({ timestamp: -1, sensorId: 1 });

module.exports = mongoose.model('SensorReading', SensorReadingSchema);
