const mongoose = require('mongoose');

const PumpEventSchema = new mongoose.Schema({
  pumpId: { type: String, required: true, enum: ['PUMP_1', 'PUMP_2'], index: true },
  action: { type: String, required: true, enum: ['ON', 'OFF'] },
  reason: { type: String, default: 'manual' }, // 'manual', 'auto_trigger', 'auto_stop', 'mutual_exclusion_cutoff', 'safety_timeout', 'ai_runtime_complete'
  durationSeconds: { type: Number },
  soilMoistureAtEvent: { type: Number },
  source: { type: String, default: 'backend' },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: true
});

PumpEventSchema.index({ timestamp: -1, pumpId: 1 });

module.exports = mongoose.model('PumpEvent', PumpEventSchema);
