/*
  TERRAWAVE AI - Smart Irrigation ESP32-S3 Firmware v3.0

  STATUS: Ultrasonic (HC-SR04) sensor DISABLED - sensor is damaged.
          Tank level always reported as SENSOR_DISABLED.
          All tank auto-fill logic is OFF.
          System runs on: Soil Moisture + Pump control + MQTT.

  Hardware Pinout:
  - Soil Moisture Sensor AOUT  -> GPIO 1 (ADC1_CH0)
  - [HC-SR04 DISABLED]
  - Pump 1 (Tank Filling Pump) -> GPIO 6 (Active LOW Relay)
  - Pump 2 (Irrigation Pump)   -> GPIO 7 (Active LOW Relay)

  Relay Logic (Active LOW):
  - LOW  = Relay ON  (Energized)
  - HIGH = Relay OFF (De-energized)

  Safety Rules:
  - Pump 1 and Pump 2 MUST NEVER run at the same time.
  - If Pump 1 is ON -> Pump 2 forced OFF immediately.
  - If Pump 2 is ON -> Pump 1 forced OFF immediately.

  Moisture Calibration:
  - SOIL_DRY = 3000  (Raw 12-bit ADC value for 0%  moisture)
  - SOIL_WET = 1200  (Raw 12-bit ADC value for 100% moisture)
  - Higher ADC = Drier soil
  - Output strictly clamped [0.0%, 100.0%]
  - Telemetry published every ~1 second

  Network / MQTT:
  - WiFiMulti: connects to best available known SSID automatically
  - mDNS: resolves "terrawave.local" -> PC IP (works on any LAN)
  - Fallback static IP: 10.162.114.225  (your PC on hotspot "V")
  - Backend TCP proxy: port 1884 -> Mosquitto :1883

  MQTT Topics:
  - Pub: irrigation/moisture        (soil moisture JSON, every 1s)
  - Pub: irrigation/tank_level      (always SENSOR_DISABLED)
  - Pub: irrigation/pump1_status    (FILL_ON / FILL_OFF on change)
  - Pub: irrigation/pump2_status    (PUMP_ON / PUMP_OFF on change)
  - Sub: irrigation/cmd             (PUMP_ON, PUMP_OFF, FILL_ON, FILL_OFF)
  - Sub: irrigation/calibrate       (DRY:3000,WET:1200)
*/

#include <WiFi.h>
#include <WiFiMulti.h>
#include <ESPmDNS.h>
#include <PubSubClient.h>

// ===========================================================
// WiFi — Add all networks you ever use. Connects to best one.
// ===========================================================
WiFiMulti wifiMulti;

struct KnownNetwork { const char* ssid; const char* password; };
const KnownNetwork knownNetworks[] = {
  { "V",            "12345678" },  // Mobile hotspot
    // Home router
  // Add more networks here: { "SSID", "PASSWORD" },
};

// ===========================================================
// MQTT Configuration — Cloud Broker (Universal: Works on ANY Wi-Fi)
// ===========================================================
// broker.hivemq.com allows ESP32 and PC to communicate even if on
// different Wi-Fi networks (e.g. ESP32 on TP-Link, PC on mobile hotspot V)
const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;
const char* DEVICE_ID   = "ESP32-S3-001";

// ===========================================================
// Pin Definitions
// ===========================================================
#define SOIL_PIN   1  // Soil moisture sensor ADC (GPIO 1)
#define PUMP1_PIN  6  // Tank Filling Pump relay  (Active LOW)
#define PUMP2_PIN  7  // Irrigation Pump relay    (Active LOW)

const int RELAY_ON  = LOW;   // Energize relay coil
const int RELAY_OFF = HIGH;  // De-energize relay coil

// ===========================================================
// Calibration
// ===========================================================
int soil_dry_adc = 3000;  // ADC reading for 0% moisture (dry)
int soil_wet_adc = 1200;  // ADC reading for 100% moisture (wet)

// ===========================================================
// State & Objects
// ===========================================================
WiFiClient   espClient;
PubSubClient mqttClient(espClient);

bool pump1_state = false;
bool pump2_state = false;

unsigned long last_publish_ms  = 0;
const unsigned long PUBLISH_INTERVAL_MS = 1000; // 1 second

unsigned long last_mqtt_attempt_ms = 0;
const unsigned long MQTT_RETRY_INTERVAL_MS = 5000;

// Forward declarations
void setPump1(bool on, const char* reason = "");
void setPump2(bool on, const char* reason = "");

// ===========================================================
// Soil Moisture (GPIO 1, 12-bit ADC, 5-sample average)
// ===========================================================
float readSoilMoisture(int &rawADC) {
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_PIN);
    delay(2);
  }
  rawADC = (int)(sum / 5);

  float pct = 0.0f;
  if (soil_dry_adc != soil_wet_adc) {
    pct = ((float)(soil_dry_adc - rawADC) / (float)(soil_dry_adc - soil_wet_adc)) * 100.0f;
  }
  pct = constrain(pct, 0.0f, 100.0f);
  return roundf(pct * 10.0f) / 10.0f;
}

// ===========================================================
// Pump Controllers — Hard Mutual Exclusion (Active LOW)
// ===========================================================
void setPump1(bool on, const char* reason) {
  if (on) {
    // SAFETY: Immediately cut Pump 2 before energizing Pump 1
    if (pump2_state) {
      digitalWrite(PUMP2_PIN, RELAY_OFF);
      pump2_state = false;
      mqttClient.publish("irrigation/pump2_status", "PUMP_OFF");
      Serial.println("[SAFETY] Pump 2 cut by mutual exclusion (Pump 1 ON).");
    }
  }
  digitalWrite(PUMP1_PIN, on ? RELAY_ON : RELAY_OFF);
  pump1_state = on;
  mqttClient.publish("irrigation/pump1_status", on ? "FILL_ON" : "FILL_OFF");
  mqttClient.publish("terrawave/irrigation/pump1_status", on ? "FILL_ON" : "FILL_OFF");
  Serial.printf("[PUMP 1] %s%s%s\n",
    on ? "ON" : "OFF",
    reason[0] ? " | reason: " : "",
    reason);
}

void setPump2(bool on, const char* reason) {
  if (on) {
    // SAFETY: Immediately cut Pump 1 before energizing Pump 2
    if (pump1_state) {
      digitalWrite(PUMP1_PIN, RELAY_OFF);
      pump1_state = false;
      mqttClient.publish("irrigation/pump1_status", "FILL_OFF");
      mqttClient.publish("terrawave/irrigation/pump1_status", "FILL_OFF");
      Serial.println("[SAFETY] Pump 1 cut by mutual exclusion (Pump 2 ON).");
    }
  }
  digitalWrite(PUMP2_PIN, on ? RELAY_ON : RELAY_OFF);
  pump2_state = on;
  mqttClient.publish("irrigation/pump2_status", on ? "PUMP_ON" : "PUMP_OFF");
  mqttClient.publish("terrawave/irrigation/pump2_status", on ? "PUMP_ON" : "PUMP_OFF");
  Serial.printf("[PUMP 2] %s%s%s\n",
    on ? "ON" : "OFF",
    reason[0] ? " | reason: " : "",
    reason);
}

// ===========================================================
// MQTT Callback — handles all commands from backend/frontend
// ===========================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  msg.trim();
  Serial.printf("[MQTT RECV] %s -> %s\n", topic, msg.c_str());

  String t = String(topic);
  if (t == "irrigation/cmd" || t == "terrawave/irrigation/cmd") {
    if      (msg == "PUMP_ON")  setPump2(true,  "backend_cmd");
    else if (msg == "PUMP_OFF") setPump2(false, "backend_cmd");
    else if (msg == "FILL_ON")  setPump1(true,  "backend_cmd");
    else if (msg == "FILL_OFF") setPump1(false, "backend_cmd");
    else if (msg == "AUTO_MODE_ON")  Serial.println("[MODE] Auto ON (handled backend-side).");
    else if (msg == "AUTO_MODE_OFF") Serial.println("[MODE] Auto OFF (handled backend-side).");

  } else if (t == "irrigation/calibrate" || t == "terrawave/irrigation/calibrate") {
    // Format: "DRY:3000,WET:1200"
    int dIdx = msg.indexOf("DRY:");
    int wIdx = msg.indexOf("WET:");
    if (dIdx != -1) {
      int comma = msg.indexOf(',', dIdx);
      int val = (comma != -1) ? msg.substring(dIdx + 4, comma).toInt()
                              : msg.substring(dIdx + 4).toInt();
      if (val > 100 && val <= 4095) { soil_dry_adc = val; }
    }
    if (wIdx != -1) {
      int val = msg.substring(wIdx + 4).toInt();
      if (val > 0 && val < soil_dry_adc) { soil_wet_adc = val; }
    }
    Serial.printf("[CALIB] DryADC=%d  WetADC=%d\n", soil_dry_adc, soil_wet_adc);
  }
}

// ===========================================================
// MQTT Reconnect (non-blocking, throttled)
// ===========================================================
void reconnectMQTT() {
  if (millis() - last_mqtt_attempt_ms < MQTT_RETRY_INTERVAL_MS) return;
  last_mqtt_attempt_ms = millis();

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);

  String clientId = "ESP32S3-TW-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  Serial.printf("[MQTT] Connecting to %s:%d as %s ...", MQTT_BROKER, MQTT_PORT, clientId.c_str());

  if (mqttClient.connect(clientId.c_str())) {
    Serial.println(" Connected!");
    mqttClient.subscribe("irrigation/cmd");
    mqttClient.subscribe("irrigation/calibrate");
    mqttClient.subscribe("terrawave/irrigation/cmd");
    mqttClient.subscribe("terrawave/irrigation/calibrate");

    // SAFETY: Pump 1 is MANUAL ONLY — always force OFF on reconnect.
    if (pump1_state) {
      digitalWrite(PUMP1_PIN, RELAY_OFF);
      pump1_state = false;
      Serial.println("[SAFETY] Reconnect: Pump 1 forced OFF (Manual-Only rule).");
    }
    mqttClient.publish("irrigation/pump1_status", "FILL_OFF");
    mqttClient.publish("terrawave/irrigation/pump1_status", "FILL_OFF");
    mqttClient.publish("irrigation/pump2_status", pump2_state ? "PUMP_ON" : "PUMP_OFF");
    mqttClient.publish("terrawave/irrigation/pump2_status", pump2_state ? "PUMP_ON" : "PUMP_OFF");

    // Tell backend tank sensor is permanently disabled
    const char* tankMsg = "{\"sensorId\":\"ESP32-S3-001\",\"tankLevel\":-1,\"waterLevelCm\":-1,\"status\":\"SENSOR_DISABLED\",\"source\":\"esp32\"}";
    mqttClient.publish("irrigation/tank_level", tankMsg);
    mqttClient.publish("terrawave/irrigation/tank_level", tankMsg);
  } else {
    Serial.printf(" Failed (rc=%d). Retry in %lus\n",
      mqttClient.state(), MQTT_RETRY_INTERVAL_MS / 1000);
  }
}

// ===========================================================
// SETUP
// ===========================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n=======================================================");
  Serial.println(" TerraWave AI - ESP32-S3 Firmware v3.0");
  Serial.println(" Ultrasonic: DISABLED (sensor damaged)");
  Serial.println(" Active: Soil Moisture + Pump Control + HiveMQ Cloud");
  Serial.println("=======================================================");

  // Configure 12-bit ADC
  analogReadResolution(12);
  pinMode(SOIL_PIN, INPUT);

  // Relay pins — BOTH PUMPS OFF on boot (RELAY_OFF = HIGH = coil de-energized)
  pinMode(PUMP1_PIN, OUTPUT);
  pinMode(PUMP2_PIN, OUTPUT);
  digitalWrite(PUMP1_PIN, RELAY_OFF);
  digitalWrite(PUMP2_PIN, RELAY_OFF);
  pump1_state = false;
  pump2_state = false;
  Serial.println("[BOOT] Pumps 1 & 2 set to OFF (RELAY_OFF=HIGH).");

  // Register all known Wi-Fi networks
  for (size_t i = 0; i < sizeof(knownNetworks) / sizeof(knownNetworks[0]); i++) {
    wifiMulti.addAP(knownNetworks[i].ssid, knownNetworks[i].password);
    Serial.printf("[WIFI] Registered: %s\n", knownNetworks[i].ssid);
  }

  Serial.print("[WIFI] Connecting to best available network");
  int tries = 0;
  while (wifiMulti.run() != WL_CONNECTED && tries < 40) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected: %s  IP: %s\n",
      WiFi.SSID().c_str(), WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] No network found yet. Will retry in loop.");
  }

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(30);
}

// ===========================================================
// LOOP
// ===========================================================
void loop() {
  // Maintain Wi-Fi (auto-reconnects, tries all registered SSIDs)
  uint8_t wifiStatus = wifiMulti.run();

  if (wifiStatus == WL_CONNECTED) {
    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();
  }

  unsigned long now = millis();
  if (now - last_publish_ms >= PUBLISH_INTERVAL_MS) {
    last_publish_ms = now;

    // --- Read Soil Moisture ---
    int rawADC = 0;
    float moisture = readSoilMoisture(rawADC);

    // --- Publish Moisture JSON ---
    if (mqttClient.connected()) {
      char buf[192];

      // Soil moisture (published every second to terrawave namespace)
      snprintf(buf, sizeof(buf),
        "{\"sensorId\":\"%s\",\"soilMoisture\":%.1f,\"rawADC\":%d,"
        "\"timestamp\":%lu,\"source\":\"esp32\"}",
        DEVICE_ID, moisture, rawADC, (unsigned long)(now / 1000));
      mqttClient.publish("terrawave/irrigation/moisture", buf);

      // Tank level — always SENSOR_DISABLED (ultrasonic is damaged)
      const char* tankMsg = "{\"sensorId\":\"ESP32-S3-001\",\"tankLevel\":-1,\"waterLevelCm\":-1,\"status\":\"SENSOR_DISABLED\",\"source\":\"esp32\"}";
      mqttClient.publish("terrawave/irrigation/tank_level", tankMsg);
    }

    // --- Serial Telemetry ---
    Serial.printf("[TELEM] Moisture: %.1f%% (ADC=%d) | P1: %s | P2: %s | SSID: %s | MQTT: %s\n",
      moisture, rawADC,
      pump1_state ? "ON" : "OFF",
      pump2_state ? "ON" : "OFF",
      (wifiStatus == WL_CONNECTED) ? WiFi.SSID().c_str() : "---",
      mqttClient.connected() ? "OK" : "DISCONNECTED");
  }
}
