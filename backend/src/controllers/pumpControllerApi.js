const pumpController = require('../services/pumpController');
const PumpEvent = require('../models/PumpEvent');

exports.getStatus = (req, res) => {
  res.json({ success: true, data: pumpController.getStatus() });
};

exports.turnIrrigationOn = async (req, res) => {
  try {
    const { forceManual, durationSeconds, targetMoisture } = req.body;

    // Emergency / manual override mode (Section 11)
    if (forceManual === true) {
      const duration = durationSeconds ? Number(durationSeconds) : null;
      const status = await pumpController.setPump2(true, 'force_manual_override', duration);
      return res.json({
        success: true,
        message: 'Irrigation Pump 2 FORCE STARTED (Manual Override Mode). Tank pump (Pump 1) held OFF (Mutual Exclusion).',
        data: status
      });
    }

    // Default primary mode: AI-Predicted Irrigation (Section 2, 10, 11)
    const result = await pumpController.startAiIrrigation(targetMoisture);

    if (!result.started) {
      return res.json({
        success: false,
        message: result.message,
        data: pumpController.getStatus(),
        prediction: {
          predicted_runtime_seconds: 0.0,
          current_moisture: result.currentMoisture,
          target_moisture: result.targetMoisture,
          explanation: result.message
        }
      });
    }

    res.json({
      success: true,
      message: `AI Irrigation started: Current Moisture ${result.currentMoisture}%, Target ${result.targetMoisture}%, AI Predicted Runtime ${result.predictedRuntime.toFixed(2)} seconds.`,
      data: result.status,
      prediction: result.prediction,
      predictedRuntime: result.predictedRuntime,
      currentMoisture: result.currentMoisture,
      targetMoisture: result.targetMoisture
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
