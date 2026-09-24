const mqtt = require('mqtt');
const EventEmitter = require('events');
const SensorReading = require('../models/SensorReading');
const PumpEvent = require('../models/PumpEvent');
const pumpController = require('./pumpController');

const MQTT_BROKER = process.env.MQTT_BROKER || 'mqtt://broker.hivemq.com:1883';

class MQTTService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isConnected = false;
    this.lastSeenESP32 = null;
    this.connect();

    // Relay commands initiated by backend / pump controller to MQTT
    pumpController.on('mqtt_publish', ({ topic, payload }) => {
      this.publish(topic, payload);
    });
  }

  connect() {
    console.log(`[MQTT] Connecting to ${MQTT_BROKER}...`);
    const clientId = `TerraWave-Backend-${Math.random().toString(16).substring(2, 8)}`;
    
    this.client = mqtt.connect(MQTT_BROKER, {
      clientId,
      clean: true,
      connectTimeout: 5000,
      reconnectPeriod: 5000
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log(`[MQTT] Connected to HiveMQ Broker.`);
      this.client.subscribe([
        'irrigation/moisture',
        'irrigation/tank_level',
        'irrigation/pump1_status',
        'irrigation/pump2_status'
      ], (err) => {
        if (!err) {
          console.log(`[MQTT] Subscribed to irrigation sensor & status topics.`);
        }
      });
      this.emit('connection_change', true);
    });

    this.client.on('message', async (topic, payload) => {
      this.handleIncomingMessage(topic, payload.toString());
    });

    this.client.on('error', (err) => {
      console.error(`[MQTT] Client error:`, err.message);
      this.isConnected = false;
      this.emit('connection_change', false);
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        console.warn(`[MQTT] Disconnected from broker.`);
      }
      this.isConnected = false;
      this.emit('connection_change', false);
    });
  }

  async handleIncomingMessage(topic, rawMessage) {
    try {
      this.lastSeenESP32 = Date.now();
      
      if (topic === 'irrigation/moisture') {
        let data;
        try {
          data = JSON.parse(rawMessage);
        } catch (e) {
          data = { soilMoisture: parseFloat(rawMessage), source: 'esp32' };
        }

        const moisture = Number(data.soilMoisture);
        if (!isNaN(moisture) && moisture >= 0 && moisture <= 100) {
          // Save reading to MongoDB
          const reading = await SensorReading.create({
            sensorId: data.sensorId || 'ESP32-S3-001',
            soilMoisture: Math.round(moisture * 10) / 10,
            rawADC: data.rawADC,
            source: data.source || 'esp32',
            timestamp: new Date()
          });

          // Trigger pump automation check
          pumpController.handleMoistureUpdate(moisture, null, data.source || 'esp32');

          // Notify frontend via WebSocket
          this.emit('telemetry', {
            type: 'moisture',
            data: reading
          });
        }

      } else if (topic === 'irrigation/tank_level') {
        let data;
        try {
          data = JSON.parse(rawMessage);
        } catch (e) {
          data = { tankLevel: parseFloat(rawMessage), source: 'esp32' };
        }

        const tankLevel = typeof data.tankLevel !== 'undefined' ? Number(data.tankLevel) : -1;
        // Save latest tank reading
        await SensorReading.create({
          sensorId: data.sensorId || 'ESP32-S3-001',
          soilMoisture: pumpController.currentMoisture,
          tankLevel: tankLevel,
          source: data.source || 'esp32',
          timestamp: new Date()
        });

        pumpController.currentTankLevel = tankLevel;

        this.emit('telemetry', {
          type: 'tank_level',
          data: {
            sensorId: data.sensorId || 'ESP32-S3-001',
            tankLevel: tankLevel,
            status: tankLevel === -1 ? 'NO ECHO' : 'OK',
            source: data.source || 'esp32',
            timestamp: new Date()
          }
        });

      } else if (topic === 'irrigation/pump1_status') {
        const status = rawMessage.trim().toUpperCase();
        const isOn = status === 'FILL_ON' || status === 'ON';
        this.emit('pump_status', { pumpId: 'PUMP_1', action: isOn ? 'ON' : 'OFF' });

      } else if (topic === 'irrigation/pump2_status') {
        const status = rawMessage.trim().toUpperCase();
        const isOn = status === 'PUMP_ON' || status === 'ON';
        this.emit('pump_status', { pumpId: 'PUMP_2', action: isOn ? 'ON' : 'OFF' });
      }

    } catch (err) {
      console.error(`[MQTT] Message handling error on topic ${topic}:`, err.message);
    }
  }

  publish(topic, message) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, String(message), { qos: 0 });
    }
  }

  getESP32Status() {
    if (!this.lastSeenESP32) return 'OFFLINE';
    const diff = (Date.now() - this.lastSeenESP32) / 1000;
    return diff < 4 ? 'ONLINE' : 'OFFLINE';
  }
}

module.exports = new MQTTService();
