/**
 * MQTT TCP Proxy
 * 
 * Problem: Mosquitto broker runs on 127.0.0.1:1883 (loopback only).
 * ESP32 connects over Wi-Fi (192.168.0.104) and cannot reach loopback.
 * 
 * Solution: This proxy binds to 0.0.0.0:1884 and forwards all TCP traffic
 * transparently to 127.0.0.1:1883. ESP32 connects to <PC_IP>:1884.
 * 
 * Usage: auto-started by server.js
 */

const net = require('net');

const PROXY_PORT = 1884;
const TARGET_HOST = '127.0.0.1';
const TARGET_PORT = 1883;

let proxyServer = null;
let connectionCount = 0;

function startMQTTProxy() {
  if (proxyServer) return proxyServer;

  proxyServer = net.createServer((clientSocket) => {
    const id = ++connectionCount;
    const remote = `${clientSocket.remoteAddress}:${clientSocket.remotePort}`;
    
    const targetSocket = net.connect(TARGET_PORT, TARGET_HOST);

    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);

    targetSocket.on('connect', () => {
      console.log(`[MQTT PROXY] #${id} ${remote} connected -> ${TARGET_HOST}:${TARGET_PORT}`);
    });

    const cleanup = (reason) => {
      console.log(`[MQTT PROXY] #${id} ${remote} disconnected (${reason})`);
      clientSocket.destroy();
      targetSocket.destroy();
    };

    clientSocket.on('error', (err) => cleanup(`client error: ${err.code}`));
    targetSocket.on('error', (err) => cleanup(`broker error: ${err.code}`));
    clientSocket.on('close', () => cleanup('client closed'));
    targetSocket.on('close', () => cleanup('broker closed'));
  });

  proxyServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[MQTT PROXY] Port ${PROXY_PORT} already in use. Skipping proxy start.`);
    } else {
      console.error(`[MQTT PROXY] Server error: ${err.message}`);
    }
  });

  proxyServer.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`[MQTT PROXY] ✅ Listening on 0.0.0.0:${PROXY_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`);
    console.log(`[MQTT PROXY] 📡 ESP32 should connect to: <PC_IP>:${PROXY_PORT}`);
  });

  return proxyServer;
}

function stopMQTTProxy() {
  if (proxyServer) {
    proxyServer.close();
    proxyServer = null;
    console.log('[MQTT PROXY] Stopped.');
  }
}

module.exports = { startMQTTProxy, stopMQTTProxy };
