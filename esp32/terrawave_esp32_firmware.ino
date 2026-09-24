/*
  TERRAWAVE AI - Smart Irrigation ESP32-S3 Firmware
  
  Hardware Pinout:
  - Soil Moisture Sensor AOUT  -> GPIO 1 (ADC1_CH0)
  - HC-SR04 Ultrasonic TRIG    -> GPIO 4
  - HC-SR04 Ultrasonic ECHO    -> GPIO 5
  - Pump 1 (Tank Filling)      -> GPIO 6 (Relay Active HIGH)
  - Pump 2 (Irrigation Pump)   -> GPIO 7 (Relay Active HIGH)
  
  Calibration:
  - SOIL_DRY = 3000 (Raw ADC, dry soil = 0%)
  - SOIL_WET = 1200 (Raw ADC, saturated soil = 100%)
  
  MQTT Broker: broker.hivemq.com (Port 1883)
  Topics:
  - Pub: irrigation/moisture, irrigation/tank_level, irrigation/pump1_status, irrigation/pump2_status
  - Sub: irrigation/cmd
*/

#include <WiFi.h>
#include <PubSubClient.h>

// WiFi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// MQTT Configuration
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;
const char* device_id = "ESP32-S3-001";

// Pin Definitions
#define SOIL_PIN       1
#define TRIG_PIN       4
#define ECHO_PIN       5
#define PUMP1_PIN      6  // Tank Filling Pump
#define PUMP2_PIN      7  // Irrigation Pump

// Calibration Constants
#define SOIL_DRY       3000
#define SOIL_WET       1200
#define TANK_MIN_CM    5    // 100% full
#define TANK_MAX_CM    40   // 0% empty

WiFiClient espClient;
PubSubClient client(espClient);

// States
bool pump1_state = false;
bool pump2_state = false;
bool auto_mode = false;
unsigned long last_sensor_publish = 0;
const unsigned long SENSOR_INTERVAL_MS = 1000; // 1 second interval

// Ultrasonic measurement
float readUltrasonicTankLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // 30ms timeout (~5 meters max)
  
  if (duration <= 0) {
    // NO ECHO / SENSOR UNAVAILABLE
    return -1.0;
  }
  
  float distanceCm = duration * 0.0343 / 2.0;
  if (distanceCm < 2.0 || distanceCm > 400.0) {
    return -1.0;
  }
  
  // Convert distance to 0-100% tank level
  float tankPercent = ((TANK_MAX_CM - distanceCm) / (TANK_MAX_CM - TANK_MIN_CM)) * 100.0;
  if (tankPercent < 0) tankPercent = 0.0;
  if (tankPercent > 100) tankPercent = 100.0;
  
  return tankPercent;
}

// Soil Moisture calculation with high precision analog interpolation (higher raw ADC = drier soil)
float readSoilMoisture(int &rawADC) {
  // Take 5 averaged ADC samples to eliminate high-frequency noise
  long sum = 0;
  for (int i = 0; i < 5; i++) {
    sum += analogRead(SOIL_PIN);
    delay(2);
  }
  rawADC = sum / 5;
  
  // Linear continuous interpolation: 3000 (dry) -> 0.0%, 1200 (wet) -> 100.0%
  float moisture = ((float)(SOIL_DRY - rawADC) / (float)(SOIL_DRY - SOIL_WET)) * 100.0f;
  if (moisture < 0.0f) moisture = 0.0f;
  if (moisture > 100.0f) moisture = 100.0f;
  
  // Round to 1 decimal place for stable telemetry
  return round(moisture * 10.0f) / 10.0f;
}

// Hard Mutual-Exclusion Pump Controllers
void setPump1(bool on) {
  if (on) {
    // Mutual exclusion: Pump 2 must be OFF before Pump 1 starts
    digitalWrite(PUMP2_PIN, LOW);
    if (pump2_state) {
      pump2_state = false;
      client.publish("irrigation/pump2_status", "PUMP_OFF");
      Serial.println("[SAFETY] Pump 2 stopped due to mutual exclusion.");
    }
  }
  digitalWrite(PUMP1_PIN, on ? HIGH : LOW);
  pump1_state = on;
  client.publish("irrigation/pump1_status", on ? "FILL_ON" : "FILL_OFF");
  Serial.printf("[PUMP 1 - FILL] Set to %s\n", on ? "ON" : "OFF");
}

void setPump2(bool on) {
  if (on) {
    // Mutual exclusion: Pump 1 must be OFF before Pump 2 starts
    digitalWrite(PUMP1_PIN, LOW);
    if (pump1_state) {
      pump1_state = false;
      client.publish("irrigation/pump1_status", "FILL_OFF");
      Serial.println("[SAFETY] Pump 1 stopped due to mutual exclusion.");
    }
  }
  digitalWrite(PUMP2_PIN, on ? HIGH : LOW);
  pump2_state = on;
  client.publish("irrigation/pump2_status", on ? "PUMP_ON" : "PUMP_OFF");
  Serial.printf("[PUMP 2 - IRRIGATION] Set to %s\n", on ? "ON" : "OFF");
}

// MQTT Message Callback
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  message.trim();
  Serial.printf("[MQTT RECV] Topic: %s | Payload: %s\n", topic, message.c_str());
  
  if (String(topic) == "irrigation/cmd") {
    if (message == "PUMP_ON") {
      setPump2(true);
    } else if (message == "PUMP_OFF") {
      setPump2(false);
    } else if (message == "FILL_ON") {
      setPump1(true);
    } else if (message == "FILL_OFF") {
      setPump1(false);
    } else if (message == "AUTO_MODE_ON") {
      auto_mode = true;
      Serial.println("[MODE] Automatic mode enabled.");
    } else if (message == "AUTO_MODE_OFF") {
      auto_mode = false;
      Serial.println("[MODE] Automatic mode disabled.");
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Connecting to HiveMQ Broker...");
    String clientId = "ESP32S3-TerraWave-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println(" Connected!");
      client.subscribe("irrigation/cmd");
      // Publish initial state
      client.publish("irrigation/pump1_status", pump1_state ? "FILL_ON" : "FILL_OFF");
      client.publish("irrigation/pump2_status", pump2_state ? "PUMP_ON" : "PUMP_OFF");
    } else {
      Serial.print(" Failed, rc=");
      Serial.print(client.state());
      Serial.println(" Retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  
  pinMode(SOIL_PIN, INPUT);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(PUMP1_PIN, OUTPUT);
  pinMode(PUMP2_PIN, OUTPUT);
  
  // Safe initial state
  digitalWrite(PUMP1_PIN, LOW);
  digitalWrite(PUMP2_PIN, LOW);
  
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  int wifiTimeout = 0;
  while (WiFi.status() != WL_CONNECTED && wifiTimeout < 30) {
    delay(500);
    Serial.print(".");
    wifiTimeout++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected! IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\nWiFi connection timed out, running offline logic.");
  }
  
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!client.connected()) {
      reconnect();
    }
    client.loop();
  }
  
  unsigned long now = millis();
  if (now - last_sensor_publish >= SENSOR_INTERVAL_MS) {
    last_sensor_publish = now;
    
    int rawADC = 0;
    float moisture = readSoilMoisture(rawADC);
    float tankLevel = readUltrasonicTankLevel();
    
    // Publish Soil Moisture JSON with 1 decimal precision
    char moisturePayload[128];
    snprintf(moisturePayload, sizeof(moisturePayload),
             "{\"sensorId\":\"%s\",\"soilMoisture\":%.1f,\"rawADC\":%d,\"timestamp\":%lu,\"source\":\"esp32\"}",
             device_id, moisture, rawADC, (unsigned long)(now / 1000));
    client.publish("irrigation/moisture", moisturePayload);
    
    // Publish Tank Level JSON
    char tankPayload[128];
    if (tankLevel < 0) {
      snprintf(tankPayload, sizeof(tankPayload),
               "{\"sensorId\":\"%s\",\"tankLevel\":-1,\"status\":\"NO ECHO\",\"source\":\"esp32\"}",
               device_id);
    } else {
      snprintf(tankPayload, sizeof(tankPayload),
               "{\"sensorId\":\"%s\",\"tankLevel\":%.1f,\"status\":\"OK\",\"source\":\"esp32\"}",
               device_id, tankLevel);
    }
    client.publish("irrigation/tank_level", tankPayload);
    
    Serial.printf("[TELEMETRY] Moisture: %d%% (ADC %d) | Tank: %s\n",
                  moisture, rawADC, (tankLevel < 0 ? "NO ECHO" : String(tankLevel, 1).c_str()));
  }
}
