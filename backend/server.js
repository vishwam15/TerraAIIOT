require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');

const os = require('os');
const { connectDB } = require('./src/services/db');
const mqttService = require('./src/services/mqttService');
const pumpController = require('./src/services/pumpController');
const simulator = require('./src/services/simulator');
const apiRoutes = require('./src/routes/api');
const { startMQTTProxy } = require('./src/services/mqttProxy');

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 1607;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Root healthcheck
app.get('/', (req, res) => {
  const localIP = getLocalIP();
  res.json({
    app: 'TerraWave AI Backend Service',
    version: '2.0.0',
    port: PORT,
    status: 'online',
    localIP,
    mqttProxy: `${localIP}:1884`,
    mdns: 'terrawave.local:1884',
    timestamp: new Date()
  });
});

// WebSocket Server for Real-Time Sensor & Event Streaming
const wss = new WebSocketServer({ server });

function broadcast(eventType, payload) {
  const msg = JSON.stringify({ type: eventType, data: payload, timestamp: new Date() });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Forward internal events to all connected WebSocket clients
pumpController.on('pump_change', (status) => broadcast('PUMP_STATUS_UPDATE', status));
pumpController.on('ai_irrigation_started', (data) => broadcast('AI_IRRIGATION_STARTED', data));
pumpController.on('cycle_completed', (data) => broadcast('IRRIGATION_CYCLE_COMPLETED', data));
pumpController.on('simulated_telemetry', (reading) => broadcast('SENSOR_UPDATE', reading));

mqttService.on('telemetry', ({ type, data }) => broadcast('SENSOR_UPDATE', data));
mqttService.on('pump_status', (data) => broadcast('MQTT_PUMP_STATUS', data));
mqttService.on('connection_change', (connected) => broadcast('MQTT_CONNECTION', { connected }));

wss.on('connection', async (ws) => {
  // Send current status and latest telemetry immediately upon connection
  let latestSensor = null;
  try {
    const SensorReading = require('./src/models/SensorReading');
    latestSensor = await SensorReading.findOne().sort({ timestamp: -1 });
  } catch (e) {}

  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: {
      pumps: pumpController.getStatus(),
      mqttConnected: mqttService.isConnected,
      esp32Status: typeof mqttService.getESP32Status === 'function'
        ? mqttService.getESP32Status()
        : 'UNKNOWN',
      simulatorActive: simulator.isActive,
      latestSensor: latestSensor ? {
        soilMoisture: latestSensor.soilMoisture,
        rawADC: latestSensor.rawADC,
        tankLevel: latestSensor.tankLevel,
        source: latestSensor.source,
        timestamp: latestSensor.timestamp
      } : null
    },
    timestamp: new Date()
  }));
});

// Boot Server
async function startServer() {
  await connectDB();

  // Start MQTT TCP Proxy: bridges 0.0.0.0:1884 -> 127.0.0.1:1883
  // Allows ESP32 on Wi-Fi to reach the local Mosquitto broker
  startMQTTProxy();
  
  // Do NOT auto-start simulator — real ESP32 hardware takes priority
  console.log('[SERVER] Real ESP32 hardware telemetry mode ready. Simulator idle.');

  const localIP = getLocalIP();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 TerraWave AI Backend  http://localhost:${PORT}`);
    console.log(`📡 WebSocket             ws://localhost:${PORT}`);
    console.log(`🔗 REST API              http://localhost:${PORT}/api`);
    console.log(`📡 Local Wi-Fi IP        ${localIP}`);
    console.log(`🔌 ESP32 MQTT proxy      ${localIP}:1884`);
    console.log(`=======================================================`);

    // Broadcast mDNS so ESP32 firmware resolves "terrawave.local" -> this PC's current IP.
    // Works on ANY network — ESP32 never needs a hardcoded IP again.
    try {
      const { Bonjour } = require('bonjour-service');
      const bonjour = new Bonjour();
      bonjour.publish({ name: 'terrawave', type: 'mqtt', port: 1884 });
      console.log(`🌐 mDNS  terrawave.local:1884  (ESP32 auto-discovers this PC on any LAN)`);
    } catch (e) {
      console.warn(`[mDNS] Bonjour unavailable: ${e.message}`);
    }
  });
}

startServer();
