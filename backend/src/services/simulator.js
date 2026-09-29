const SensorReading = require('../models/SensorReading');
const pumpController = require('./pumpController');

function getMqttService() {
  return require('./mqttService');
}

class ESP32Simulator {
  constructor() {
    this.isActive = false;
    this.timer = null;
    this.moisture = 34.0;
    this.tankLevel = 74.0;
    this.noEchoSimulated = false;
    this.dryADC = 3000;
    this.wetADC = 1200;
  }

  start() {
    if (this.isActive) return;
    const mqtt = getMqttService();
    if (mqtt.getESP32Status && mqtt.getESP32Status() === 'ONLINE') {
      console.log('[SIMULATOR] Cannot start simulator: Real ESP32 is online.');
      return;
    }
    this.isActive = true;
    console.log('[SIMULATOR] ESP32-S3 Hardware Simulation Mode ACTIVATED (Source: DEMO DATA)');
    
    this.timer = setInterval(async () => {
      this.step();
    }, 1000);
  }

  stop() {
    if (!this.isActive) return;
    this.isActive = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[SIMULATOR] ESP32-S3 Hardware Simulation Mode DEACTIVATED');
  }

  async step() {
    // Live hardware telemetry takes precedence over simulator (Requirement 28)
    const mqtt = getMqttService();
    if (mqtt.getESP32Status && mqtt.getESP32Status() === 'ONLINE') {
      return;
    }

    const pump1 = pumpController.pump1State; // Tank filling pump
    const pump2 = pumpController.pump2State; // Irrigation pump

    // 1. Moisture physics
    if (pump2) {
      // Pump 2 running: moisture increases rapidly (approx +19.5% per second)
      this.moisture = Math.min(99.0, this.moisture + (19.0 + (Math.random() * 1.5 - 0.75)));
      // Tank water consumed
      this.tankLevel = Math.max(10.0, this.tankLevel - 0.8);
    } else {
      // Natural evaporation / root absorption (~ -0.06% per sec with slight noise)
      this.moisture = Math.max(15.0, this.moisture - (0.05 + Math.random() * 0.03));
    }

    // 2. Tank filling physics
    if (pump1) {
      this.tankLevel = Math.min(100.0, this.tankLevel + 2.5);
    }

    this.moisture = Math.round(this.moisture * 10) / 10;
    this.tankLevel = Math.round(this.tankLevel * 10) / 10;

    // Convert to raw ADC: 3000 (dry) to 1200 (wet)
    const rawADC = Math.round(this.dryADC - (this.moisture / 100) * (this.dryADC - this.wetADC));

    const effectiveTank = this.noEchoSimulated ? -1 : this.tankLevel;

    try {
      // Store in MongoDB as DEMO DATA
      const reading = await SensorReading.create({
        sensorId: 'ESP32-S3-SIM',
        soilMoisture: this.moisture,
        rawADC: rawADC,
        tankLevel: effectiveTank,
        source: 'DEMO DATA',
        timestamp: new Date()
      });

      // Forward to pump automation controller
      await pumpController.handleMoistureUpdate(this.moisture, effectiveTank, 'DEMO DATA');

      // Emit through controller event bus
      pumpController.emit('simulated_telemetry', reading);

    } catch (err) {
      console.error('[SIMULATOR] Error saving simulated reading:', err.message);
    }
  }

  setMoisture(val) {
    this.moisture = Math.max(5, Math.min(100, Number(val)));
  }

  toggleNoEcho(enable = null) {
    this.noEchoSimulated = enable !== null ? enable : !this.noEchoSimulated;
    return this.noEchoSimulated;
  }
}

module.exports = new ESP32Simulator();
