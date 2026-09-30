const SensorReading = require('../models/SensorReading');
const pumpController = require('./pumpController');

function getMqttService() {
  return require('./mqttService');
}

class ESP32Simulator {
  constructor() {
    this.isActive = false;
    this.timer = null;
    this.moisture = 0;
    this.tankLevel = -1;
    this.noEchoSimulated = false;
  }

  start() {
    console.log('[SIMULATOR] Simulator permanently disabled. System is in Pure Hardware Mode.');
    this.isActive = false;
  }

  stop() {
    this.isActive = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async step() {
    return;
  }

  setMoisture() {}
  toggleNoEcho() { return false; }
}

module.exports = new ESP32Simulator();



