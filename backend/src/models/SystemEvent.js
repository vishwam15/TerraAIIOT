const mongoose = require('mongoose');

const SystemEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true }, // 'INFO', 'WARNING', 'ERROR', 'PUMP_MUTUAL_EXCLUSION', 'AI_DECISION'
  message: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  source: { type: String, default: 'backend' },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  collection: 'system_events',
  timestamps: true
});

SystemEventSchema.index({ timestamp: -1 });

module.exports = mongoose.model('SystemEvent', SystemEventSchema);
