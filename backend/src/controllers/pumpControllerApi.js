const pumpController = require('../services/pumpController');
const PumpEvent = require('../models/PumpEvent');

exports.getStatus = (req, res) => {
  res.json({ success: true, data: pumpController.getStatus() });
};

exports.turnIrrigationOn = async (req, res) => {
  try {
    const duration = req.body.durationSeconds ? Number(req.body.durationSeconds) : null;
    const targetMoisture = req.body.targetMoisture ? Number(req.body.targetMoisture) : 80;
    const status = await pumpController.setPump2(true, 'manual', duration, targetMoisture);
    res.json({
      success: true,
      message: 'Irrigation Pump (Pump 2) started successfully. Tank pump (Pump 1) held OFF (Mutual Exclusion).',
      data: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.turnIrrigationOff = async (req, res) => {
  try {
    const status = await pumpController.setPump2(false, 'manual');
    res.json({
      success: true,
      message: 'Irrigation Pump (Pump 2) stopped.',
      data: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.turnFillOn = async (req, res) => {
  try {
    const status = await pumpController.setPump1(true, 'manual');
    res.json({
      success: true,
      message: 'Tank Filling Pump (Pump 1) started successfully. Irrigation pump (Pump 2) held OFF (Mutual Exclusion).',
      data: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.turnFillOff = async (req, res) => {
  try {
    const status = await pumpController.setPump1(false, 'manual');
    res.json({
      success: true,
      message: 'Tank Filling Pump (Pump 1) stopped.',
      data: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.enableAutomation = async (req, res) => {
  try {
    const status = await pumpController.setAutoMode(true);
    res.json({
      success: true,
      message: 'Automatic Irrigation Mode ENABLED (AI Closed-loop control active).',
      data: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.disableAutomation = async (req, res) => {
  try {
    const status = await pumpController.setAutoMode(false);
    res.json({
      success: true,
      message: 'Automatic Irrigation Mode DISABLED.',
      data: status
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getEvents = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const events = await PumpEvent.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, count: events.length, data: events });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
