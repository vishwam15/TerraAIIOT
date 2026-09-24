const SensorReading = require('../models/SensorReading');
const IrrigationCycle = require('../models/IrrigationCycle');
const MLTrainingData = require('../models/MLTrainingData');
const pumpController = require('../services/pumpController');

function escapeCSV(val) {
  if (val === null || typeof val === 'undefined') return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

exports.exportSensorsCSV = async (req, res) => {
  try {
    const readings = await SensorReading.find().sort({ timestamp: -1 }).limit(1000).lean();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="terrawave_sensor_data.csv"');

    const headers = ['timestamp', 'soilMoisture', 'rawADC', 'tankLevel', 'tankStatus', 'sensorId', 'source'];
    let csv = headers.join(',') + '\n';

    for (const r of readings) {
      const row = [
        escapeCSV(new Date(r.timestamp).toISOString()),
        escapeCSV(r.soilMoisture),
        escapeCSV(r.rawADC || ''),
        escapeCSV(r.tankLevel === -1 ? 'NO ECHO' : r.tankLevel),
        escapeCSV(r.tankLevel === -1 ? 'NO ECHO' : 'OK'),
        escapeCSV(r.sensorId),
        escapeCSV(r.source)
      ];
      csv += row.join(',') + '\n';
    }

    res.send(csv);
  } catch (err) {
    res.status(500).send(`Error exporting sensor CSV: ${err.message}`);
  }
};

exports.exportIrrigationCSV = async (req, res) => {
  try {
    const cycles = await IrrigationCycle.find().sort({ createdAt: -1 }).limit(1000).lean();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="terrawave_irrigation_history.csv"');

    const headers = [
      'timestamp',
      'triggerType',
      'moistureBefore',
      'targetMoisture',
      'predictedRuntime',
      'actualRuntime',
      'moistureAfter',
      'moistureGain',
      'gainPerSecond',
      'predictionError',
      'modelUsed',
      'status'
    ];
    let csv = headers.join(',') + '\n';

    for (const c of cycles) {
      const row = [
        escapeCSV(new Date(c.createdAt).toISOString()),
        escapeCSV(c.triggerType),
        escapeCSV(c.beforeMoisture),
        escapeCSV(c.targetMoisture),
        escapeCSV(c.predictedRuntime),
        escapeCSV(c.actualRuntime),
        escapeCSV(c.afterMoisture || ''),
        escapeCSV(c.moistureGain || ''),
        escapeCSV(c.gainPerSecond || ''),
        escapeCSV(c.predictionError || ''),
        escapeCSV(c.modelUsed),
        escapeCSV(c.status)
      ];
      csv += row.join(',') + '\n';
    }

    res.send(csv);
  } catch (err) {
    res.status(500).send(`Error exporting irrigation CSV: ${err.message}`);
  }
};

exports.exportTrainingCSV = async (req, res) => {
  try {
    const records = await MLTrainingData.find().sort({ timestamp: -1 }).limit(2000).lean();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="terrawave_ml_training_dataset.csv"');

    const headers = [
      'timestamp',
      'initialMoisture',
      'targetMoisture',
      'moistureDeficit',
      'pumpRuntimeSeconds',
      'finalMoisture',
      'moistureIncrease',
      'soilCondition',
      'recentMoistureChange',
      'previousPumpRuntime',
      'pumpId',
      'source'
    ];
    let csv = headers.join(',') + '\n';

    for (const r of records) {
      const row = [
        escapeCSV(new Date(r.timestamp).toISOString()),
        escapeCSV(r.initialMoisture),
        escapeCSV(r.targetMoisture),
        escapeCSV(r.moistureDeficit),
        escapeCSV(r.pumpRuntimeSeconds),
        escapeCSV(r.finalMoisture || ''),
        escapeCSV(r.moistureIncrease || ''),
        escapeCSV(r.soilCondition),
        escapeCSV(r.recentMoistureChange),
        escapeCSV(r.previousPumpRuntime),
        escapeCSV(r.pumpId),
        escapeCSV(r.source)
      ];
      csv += row.join(',') + '\n';
    }

    res.send(csv);
  } catch (err) {
    res.status(500).send(`Error exporting training CSV: ${err.message}`);
  }
};
