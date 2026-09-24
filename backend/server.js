require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer, WebSocket } = require('ws');

const { connectDB } = require('./src/services/db');
const mqttService = require('./src/services/mqttService');
const pumpController = require('./src/services/pumpController');
const simulator = require('./src/services/simulator');
const apiRoutes = require('./src/routes/api');

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
  res.json({
    app: 'TerraWave AI Backend Service',
    version: '1.0.0',
    port: PORT,
    status: 'online',
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

wss.on('connection', (ws) => {
  // Send current status immediately upon connection
  ws.send(JSON.stringify({
    type: 'INITIAL_STATE',
    data: {
      pumps: pumpController.getStatus(),
      mqttConnected: mqttService.isConnected,
      esp32Status: mqttService.getESP32Status(),
      simulatorActive: simulator.isActive
    },
    timestamp: new Date()
  }));
});

// Boot Server
async function startServer() {
  await connectDB();
  
  // Start simulator by default so judges/professors see live dynamic telemetry immediately
  simulator.start();

  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 TerraWave AI Backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket stream active on ws://localhost:${PORT}`);
    console.log(`🔗 REST API Base: http://localhost:${PORT}/api`);
    console.log(`=======================================================`);
  });
}

startServer();
