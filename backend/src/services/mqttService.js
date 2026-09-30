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
        'irrigation/pump2_status',
        'terrawave/irrigation/moisture',
        'terrawave/irrigation/tank_level',
        'terrawave/irrigation/pump1_status',
        'terrawave/irrigation/pump2_status'
      ], (err) => {
        if (!err) {
          console.log(`[MQTT] Subscribed to irrigation sensor & status topics (global & terrawave/ namespaces).`);
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
      const cleanTopic = topic.startsWith('terrawave/') ? topic.slice('terrawave/'.length) : topic;

      if (cleanTopic === 'irrigation/moisture') {
        const now = Date.now();
        if (now - (this.lastMoistureTimestamp || 0) < 700) {
          // Skip duplicate delivery from dual-topic or loopback echo within 700ms
          return;
        }
        this.lastMoistureTimestamp = now;

        let data;
        try {
          data = JSON.parse(rawMessage);
        } catch (e) {
          data = { soilMoisture: parseFloat(rawMessage), source: 'esp32' };
        }

        const moisture = Math.round(Number(data.soilMoisture) * 10) / 10;
        const rawADC = (data.rawADC !== undefined && data.rawADC !== null) ? Number(data.rawADC) : null;

        if (!isNaN(moisture) && moisture >= 0 && moisture <= 100) {
          console.log(`[MQTT] Soil moisture received: ${moisture.toFixed(1)}% (rawADC: ${rawADC !== null ? rawADC : 'N/A'})`);

          // Save real reading to MongoDB
          const reading = await SensorReading.create({
            sensorId: data.sensorId || 'ESP32-S3-001',
            soilMoisture: moisture,
            realMoisture: moisture,
            rawADC: rawADC,
            realData: true,
            isRealHardware: true,
            dataType: 'REAL_HARDWARE',
            sensorPin: 'GPIO_1',
            tankLevel: -1,
            source: 'esp32',
            timestamp: new Date()
          });

          // Update in-memory state and trigger automation check
          await pumpController.handleMoistureUpdate(moisture, null, 'esp32');

          // Notify frontend via WebSocket
          this.emit('telemetry', {
            type: 'moisture',
            data: reading
          });
        }

      } else if (cleanTopic === 'irrigation/tank_level') {
        let data;
        try {
          data = JSON.parse(rawMessage);
        } catch (e) {
          data = { tankLevel: parseFloat(rawMessage), source: 'esp32' };
        }

        const tankLevel = typeof data.tankLevel !== 'undefined' ? Number(data.tankLevel) : -1;
        const sensorStatus = data.status || (tankLevel >= 0 ? 'OK' : 'NO_ECHO');
        const sensorDisabled = sensorStatus === 'SENSOR_DISABLED';

        const waterLevelCm = typeof data.waterLevelCm !== 'undefined'
          ? Number(data.waterLevelCm)
          : (tankLevel >= 0 ? Math.round(((tankLevel / 100) * 8.0) * 10) / 10 : -1);

        if (sensorDisabled) {
          // Ultrasonic sensor is permanently disabled — do not write DB records every second
          // and do not trigger any pump logic. Just update in-memory state once.
          pumpController.currentTankLevel = -1;
          pumpController.waterLevelCm = -1;
          // Emit to frontend so UI shows "Sensor Disabled" instead of "NO ECHO"
          this.emit('telemetry', {
            type: 'tank_level',
            data: {
              sensorId: data.sensorId || 'ESP32-S3-001',
              soilMoisture: pumpController.currentMoisture,
              tankLevel: -1,
              waterLevelCm: -1,
              status: 'SENSOR_DISABLED',
              source: data.source || 'esp32',
              timestamp: new Date()
            }
          });
          return; // Skip DB write, skip pump logic
        }

        console.log(`[MQTT] Tank level received: ${tankLevel >= 0 ? `${tankLevel.toFixed(1)}% (${waterLevelCm.toFixed(1)} cm)` : 'NO ECHO'}`);

        // Save latest tank reading to MongoDB
        const reading = await SensorReading.create({
          sensorId: data.sensorId || 'ESP32-S3-001',
          soilMoisture: pumpController.currentMoisture,
          tankLevel: tankLevel,
          source: data.source || 'esp32',
          timestamp: new Date()
        });

        pumpController.currentTankLevel = tankLevel;
        await pumpController.handleTankLevelUpdate(waterLevelCm, data.source || 'esp32');

        this.emit('telemetry', {
          type: 'tank_level',
          data: {
            sensorId: data.sensorId || 'ESP32-S3-001',
            soilMoisture: pumpController.currentMoisture,
            tankLevel: tankLevel,
            waterLevelCm: waterLevelCm,
            status: tankLevel === -1 ? 'NO_ECHO' : 'OK',
            source: data.source || 'esp32',
            timestamp: new Date()
          }
        });


      } else if (cleanTopic === 'irrigation/pump1_status') {
        const status = rawMessage.trim().toUpperCase();
        const isOn = status === 'FILL_ON' || status === 'ON';
        console.log(`[MQTT] Pump 1 (Tank Filling) status confirmed from hardware: ${isOn ? 'ON' : 'OFF'}`);
        await pumpController.syncHardwarePumpStatus('PUMP_1', isOn);
        this.emit('pump_status', { pumpId: 'PUMP_1', action: isOn ? 'ON' : 'OFF' });

      } else if (cleanTopic === 'irrigation/pump2_status') {
        const status = rawMessage.trim().toUpperCase();
        const isOn = status === 'PUMP_ON' || status === 'ON';
        console.log(`[MQTT] Pump 2 (Irrigation) status confirmed from hardware: ${isOn ? 'ON' : 'OFF'}`);
        await pumpController.syncHardwarePumpStatus('PUMP_2', isOn);
        this.emit('pump_status', { pumpId: 'PUMP_2', action: isOn ? 'ON' : 'OFF' });
      }

    } catch (err) {
      console.error(`[MQTT] Message handling error on topic ${topic}:`, err.message);
    }
  }

  publish(topic, message) {
    if (this.client && this.isConnected) {
      this.client.publish(topic, String(message), { qos: 0 });
      if (!topic.startsWith('terrawave/')) {
        this.client.publish(`terrawave/${topic}`, String(message), { qos: 0 });
      }
    }
  }

  getESP32Status() {
    if (!this.lastSeenESP32) return 'OFFLINE';
    const diff = (Date.now() - this.lastSeenESP32) / 1000;
    return diff < 8 ? 'ONLINE' : 'OFFLINE';
  }
}

module.exports = new MQTTService();
