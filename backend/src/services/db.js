const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Settings = require('../models/Settings');
const MLTrainingData = require('../models/MLTrainingData');
const SensorReading = require('../models/SensorReading');
const PumpEvent = require('../models/PumpEvent');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/terrawave';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);
    await seedInitialData();
  } catch (err) {
    console.error(`[MongoDB] Connection error: ${err.message}`);
    console.log(`[MongoDB] Running in resilient mode. Retrying connection in 5 seconds...`);
    setTimeout(connectDB, 5000);
  }
}

async function seedInitialData() {
  try {
    // 1. Ensure default settings exist
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        autoStartThreshold: 30,
        autoStopThreshold: 80,
        aiTargetMoisture: 80,
        maxPumpRuntime: 30,
        sensorUpdateInterval: 1000,
        soilDryADC: 3000,
        soilWetADC: 1200,
        activeMLModel: 'RandomForestRegressor',
        simulatorActive: false
      });
      console.log('[MongoDB] Created default system settings.');
    }

    // 2. Seed ML Training Data if empty
    const trainingCount = await MLTrainingData.countDocuments();
    if (trainingCount === 0) {
      const sampleJsonPath = path.join(__dirname, '../../../data/sample/irrigation_training_data.json');
      if (fs.existsSync(sampleJsonPath)) {
        const raw = fs.readFileSync(sampleJsonPath, 'utf8');
        const records = JSON.parse(raw);
        await MLTrainingData.insertMany(records);
        console.log(`[MongoDB] Seeded ${records.length} training records into irrigation_training_data.`);
      }
    }

    // 3. Seed initial historical sensor readings if empty (for rich initial charts)
    const sensorCount = await SensorReading.countDocuments();
    if (sensorCount === 0) {
      const initialReadings = [];
      const now = Date.now();
      let currentMoisture = 38;
      for (let i = 60; i >= 0; i--) {
        currentMoisture = Math.max(25, Math.min(65, currentMoisture + (Math.random() * 2 - 1.1)));
        const rawADC = Math.round(3000 - (currentMoisture / 100) * (3000 - 1200));
        initialReadings.push({
          sensorId: 'ESP32-S3-001',
          soilMoisture: Math.round(currentMoisture * 10) / 10,
          rawADC: rawADC,
          tankLevel: Math.round(72 + Math.sin(i / 10) * 5),
          source: 'DEMO DATA',
          timestamp: new Date(now - i * 5000)
        });
      }
      await SensorReading.insertMany(initialReadings);
      console.log(`[MongoDB] Seeded ${initialReadings.length} initial sensor history readings.`);
    }

    // 4. Seed initial pump event logs if empty
    const eventCount = await PumpEvent.countDocuments();
    if (eventCount === 0) {
      const sampleEvents = [
        {
          pumpId: 'PUMP_2',
          action: 'ON',
          reason: 'auto_trigger',
          soilMoistureAtEvent: 26.5,
          source: 'esp32',
          timestamp: new Date(Date.now() - 3600000)
        },
        {
          pumpId: 'PUMP_2',
          action: 'OFF',
          reason: 'ai_runtime_complete',
          durationSeconds: 2.45,
          soilMoistureAtEvent: 78.2,
          source: 'esp32',
          timestamp: new Date(Date.now() - 3597500)
        },
        {
          pumpId: 'PUMP_1',
          action: 'ON',
          reason: 'manual',
          soilMoistureAtEvent: 78.0,
          source: 'manual',
          timestamp: new Date(Date.now() - 1800000)
        },
        {
          pumpId: 'PUMP_1',
          action: 'OFF',
          reason: 'manual',
          durationSeconds: 12.0,
          soilMoistureAtEvent: 78.0,
          source: 'manual',
          timestamp: new Date(Date.now() - 1788000)
        }
      ];
      await PumpEvent.insertMany(sampleEvents);
      console.log(`[MongoDB] Seeded initial pump events.`);
    }

  } catch (err) {
    console.error('[MongoDB] Error during seeding:', err.message);
  }
}

module.exports = { connectDB };
