/*
  TERRAWAVE AI - SMART IRRIGATION - ESP32-S3
  ==========================================

  PUMP 1 = TANK-FILLING PUMP -> GPIO 6 (Active LOW relay)
  PUMP 2 = IRRIGATION PUMP   -> GPIO 7 (Active LOW relay)

  SOIL MOISTURE -> GPIO 1 (AOUT, 12-bit ADC)
  HC-SR04 TRIG  -> GPIO 4
  HC-SR04 ECHO  -> GPIO 5 (through voltage divider)

  HOW TO RUN:
    1. Set WIFI_SSID / WIFI_PASSWORD below.
    2. Set MQTT_BROKER to the IP of the PC running Mosquitto + backend
       (same WiFi network). Port 1884 = backend TCP proxy -> Mosquitto 1883.
    3. Board: ESP32S3 Dev Module. Library: PubSubClient.
    4. Upload, open Serial Monitor at 115200.

  MQTT TOPICS:
    Publish  : irrigation/moisture, irrigation/tank_level,
               irrigation/pump1_status, irrigation/pump2_status
    Subscribe: irrigation/cmd, irrigation/calibrate

  COMMANDS (irrigation/cmd):
    FILL_ON / FILL_OFF     -> Manual Pump 1 (always allowed, even NO ECHO)
    PUMP_ON / PUMP_OFF     -> Manual Pump 2
    AUTO_MODE_ON / _OFF    -> Set automatic irrigation mode flag

  CALIBRATION (irrigation/calibrate):
    "DRY:3000,WET:1200"

  TANK AUTO-FILL (Pump 1, tank height 8.0 cm):
    level <= 3.0 cm -> Pump 1 ON
    level >= 7.0 cm -> Pump 1 OFF
    3.0 - 7.0 cm    -> keep current state (hysteresis)
    NO ECHO / invalid -> Pump 1 never auto-starts (auto-fill in progress stops)

  SAFETY:
    - Pump 1 and Pump 2 NEVER run at the same time (hard mutual exclusion).
    - Both pumps OFF at boot.
    - Sensors + tank auto-fill keep working even if WiFi/MQTT is down.

  MOISTURE: SOIL_DRY 3000 = 0%, SOIL_WET 1200 = 100%, clamped [0,100].
  Soil + tank telemetry every 1 second (JSON).
*/

#include <WiFi.h>
#include <PubSubClient.h>

// ============================================================
// WIFI  (CHANGE THESE TO YOUR NETWORK)
// ============================================================
const char* WIFI_SSID     = "V";
const char* WIFI_PASSWORD = "12345678";

// ============================================================
// MQTT  (CHANGE BROKER IP IF YOUR PC'S IP CHANGES)
// ============================================================
const char* MQTT_BROKER    = "10.162.114.225";
const int   MQTT_PORT      = 1884;
const char* MQTT_CLIENT_ID = "ESP32S3-TerraWave";
const char* DEVICE_ID      = "ESP32-S3-001";

const char* TOPIC_COMMAND      = "irrigation/cmd";
const char* TOPIC_CALIBRATE    = "irrigation/calibrate";
const char* TOPIC_MOISTURE     = "irrigation/moisture";
const char* TOPIC_TANK_LEVEL   = "irrigation/tank_level";
const char* TOPIC_PUMP1_STATUS = "irrigation/pump1_status";
const char* TOPIC_PUMP2_STATUS = "irrigation/pump2_status";

// ============================================================
// PINS
// ============================================================
#define SOIL_PIN  1
#define TRIG_PIN  4
#define ECHO_PIN  5
#define PUMP1_PIN 6   // Tank filling
#define PUMP2_PIN 7   // Irrigation

// Relays are active LOW
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// ============================================================
// CALIBRATION & TANK
// ============================================================
// Higher ADC value = drier soil
int soilDryAdc = 3000;   // 0%
int soilWetAdc = 1200;   // 100%

const float TANK_MAX_HEIGHT_CM      = 8.0f;
const float TANK_LOW_THRESHOLD_CM   = 3.0f;
const float TANK_FULL_THRESHOLD_CM  = 7.0f;

// ============================================================
// OBJECTS
// ============================================================
WiFiClient   espClient;
PubSubClient mqttClient(espClient);

// ============================================================
// STATE
// ============================================================
bool pump1Running = false;
bool pump2Running = false;
bool autoMode = false;
bool autoTankFillingActive = false;

// ============================================================
// TIMERS
// ============================================================
unsigned long lastSensorCycle = 0;
const unsigned long SENSOR_INTERVAL_MS = 1000;

unsigned long lastWifiAttempt = 0;
const unsigned long WIFI_RETRY_MS = 10000;

unsigned long lastMqttAttempt = 0;
const unsigned long MQTT_RETRY_MS = 5000;

// ============================================================
// FUNCTION DECLARATIONS
// ============================================================
void connectWiFiInitial();
void maintainConnections();
bool connectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);

float readSoilMoisture(int &rawADC);
float readUltrasonicWaterLevel(float &rawDistanceCm);

void handleTankAutoFilling(float waterLevelCm);

void setPump1(bool on);
void setPump2(bool on);
void allPumpsOFF();

void publishMoisture(float moisture, int rawADC, unsigned long now);
void publishTankLevel(float waterLevelCm);
void publishPumpStatus();
void safePublish(const char* topic, const char* payload);

// ============================================================
// SETUP
// ============================================================
void setup()
{
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("========================================");
  Serial.println("   TERRAWAVE AI - SMART IRRIGATION");
  Serial.println("           ESP32-S3 SYSTEM");
  Serial.println("========================================");

  // ADC
  analogReadResolution(12);
  pinMode(SOIL_PIN, INPUT);

  // Ultrasonic
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  digitalWrite(TRIG_PIN, LOW);

  // Relays - safety: both pumps OFF first
  pinMode(PUMP1_PIN, OUTPUT);
  pinMode(PUMP2_PIN, OUTPUT);
  digitalWrite(PUMP1_PIN, RELAY_OFF);
  digitalWrite(PUMP2_PIN, RELAY_OFF);
  pump1Running = false;
  pump2Running = false;
  Serial.println("Both pumps OFF at startup.");

  // WiFi + MQTT
  connectWiFiInitial();
  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  Serial.println("System ready.");
}

// ============================================================
// LOOP
// ============================================================
void loop()
{
  // Non-blocking WiFi / MQTT recovery (sensors & safety keep running)
  maintainConnections();
  if (mqttClient.connected())
  {
    mqttClient.loop();
  }

  unsigned long now = millis();

  if (now - lastSensorCycle >= SENSOR_INTERVAL_MS)
  {
    lastSensorCycle = now;

    // 1. Soil moisture
    int rawADC = 0;
    float moisture = readSoilMoisture(rawADC);

    // 2. Ultrasonic tank level
    float rawDistanceCm = 0.0f;
    float waterLevelCm = readUltrasonicWaterLevel(rawDistanceCm);

    // 3. Automatic tank filling (hysteresis + NO ECHO protection)
    handleTankAutoFilling(waterLevelCm);

    // 4. Telemetry
    publishMoisture(moisture, rawADC, now);
    publishTankLevel(waterLevelCm);

    // 5. Serial log
    char tankText[24];
    if (waterLevelCm < 0.0f)
    {
      strcpy(tankText, "NO ECHO");
    }
    else
    {
      snprintf(tankText, sizeof(tankText), "%.1f%%",
               (waterLevelCm / TANK_MAX_HEIGHT_CM) * 100.0f);
    }

    Serial.printf("[ESP32] Soil: %.1f%% (ADC %d) | Tank: %s (%.1f cm) | Pump1: %s | Pump2: %s | WiFi: %s | MQTT: %s\n",
                  moisture, rawADC,
                  tankText, waterLevelCm,
                  pump1Running ? "ON" : "OFF",
                  pump2Running ? "ON" : "OFF",
                  WiFi.status() == WL_CONNECTED ? "OK" : "DOWN",
                  mqttClient.connected() ? "OK" : "DOWN");
  }

  delay(10);
}

// ============================================================
// WIFI
// ============================================================
void connectWiFiInitial()
{
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.print("WiFi connected. IP address: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("WiFi not connected yet. Running offline, will keep retrying.");
  }

  lastWifiAttempt = millis();
}

void maintainConnections()
{
  unsigned long now = millis();

  if (WiFi.status() != WL_CONNECTED)
  {
    if (now - lastWifiAttempt >= WIFI_RETRY_MS)
    {
      lastWifiAttempt = now;
      Serial.println("WiFi lost. Reconnecting...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
    return;
  }

  if (!mqttClient.connected())
  {
    if (now - lastMqttAttempt >= MQTT_RETRY_MS)
    {
      lastMqttAttempt = now;
      connectMQTT();
    }
  }
}

// ============================================================
// MQTT CONNECTION
// ============================================================
bool connectMQTT()
{
  Serial.print("Connecting to MQTT broker ");
  Serial.print(MQTT_BROKER);
  Serial.print(":");
  Serial.print(MQTT_PORT);
  Serial.print(" ...");

  String clientId = MQTT_CLIENT_ID;
  clientId += "-";
  clientId += String((uint32_t)ESP.getEfuseMac(), HEX);

  if (mqttClient.connect(clientId.c_str()))
  {
    Serial.println(" connected.");

    mqttClient.subscribe(TOPIC_COMMAND);
    mqttClient.subscribe(TOPIC_CALIBRATE);

    // Report actual hardware pump state (pumps are NOT changed on reconnect)
    publishPumpStatus();
    return true;
  }

  Serial.print(" failed, rc=");
  Serial.print(mqttClient.state());
  Serial.println(". Will retry in 5s.");
  return false;
}

// ============================================================
// MQTT CALLBACK
// ============================================================
void mqttCallback(char* topic, byte* payload, unsigned int length)
{
  String message = "";
  for (unsigned int i = 0; i < length; i++)
  {
    message += (char)payload[i];
  }
  message.trim();

  Serial.println();
  Serial.println("========== MQTT MESSAGE ==========");
  Serial.printf("Topic   : %s\n", topic);
  Serial.printf("Payload : %s\n", message.c_str());

  String t = String(topic);

  if (t == TOPIC_COMMAND)
  {
    // Manual pump commands are ALWAYS permitted (even during NO ECHO)
    if (message == "PUMP_ON")
    {
      setPump2(true);
    }
    else if (message == "PUMP_OFF")
    {
      setPump2(false);
    }
    else if (message == "FILL_ON")
    {
      autoTankFillingActive = false;   // manual override
      setPump1(true);
    }
    else if (message == "FILL_OFF")
    {
      autoTankFillingActive = false;
      setPump1(false);
    }
    else if (message == "AUTO_MODE_ON")
    {
      autoMode = true;
      Serial.println("[MODE] Automatic Irrigation Mode ENABLED.");
    }
    else if (message == "AUTO_MODE_OFF")
    {
      autoMode = false;
      Serial.println("[MODE] Automatic Irrigation Mode DISABLED.");
    }
    else
    {
      Serial.println("Unknown command.");
    }
  }
  else if (t == TOPIC_CALIBRATE)
  {
    // Format: "DRY:3000,WET:1200"
    int dryIdx = message.indexOf("DRY:");
    int wetIdx = message.indexOf("WET:");

    if (dryIdx != -1)
    {
      int comma = message.indexOf(',', dryIdx);
      int val = (comma != -1)
                  ? message.substring(dryIdx + 4, comma).toInt()
                  : message.substring(dryIdx + 4).toInt();
      if (val > 0) soilDryAdc = val;
    }
    if (wetIdx != -1)
    {
      int comma = message.indexOf(',', wetIdx);
      int val = (comma != -1)
                  ? message.substring(wetIdx + 4, comma).toInt()
                  : message.substring(wetIdx + 4).toInt();
      if (val > 0) soilWetAdc = val;
    }

    Serial.printf("[CALIBRATION UPDATED] Dry ADC: %d | Wet ADC: %d\n", soilDryAdc, soilWetAdc);
  }

  Serial.println("==================================");
}

// ============================================================
// SOIL MOISTURE (5-sample average, linear, clamped 0-100%)
// ============================================================
float readSoilMoisture(int &rawADC)
{
  long sum = 0;
  for (int i = 0; i < 5; i++)
  {
    sum += analogRead(SOIL_PIN);
    delay(2);
  }
  rawADC = (int)(sum / 5);

  float moisture = 0.0f;
  if (soilDryAdc != soilWetAdc)
  {
    moisture = ((float)(soilDryAdc - rawADC) / (float)(soilDryAdc - soilWetAdc)) * 100.0f;
  }

  if (moisture < 0.0f)   moisture = 0.0f;
  if (moisture > 100.0f) moisture = 100.0f;

  return round(moisture * 10.0f) / 10.0f;
}

// ============================================================
// ULTRASONIC WATER LEVEL
// Returns level in cm [0.0 - 8.0], or -1.0 on NO ECHO / invalid
// ============================================================
float readUltrasonicWaterLevel(float &rawDistanceCm)
{
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);

  if (duration <= 0)
  {
    rawDistanceCm = -1.0f;
    return -1.0f;   // NO ECHO
  }

  float distanceCm = (float)duration * 0.0343f / 2.0f;
  rawDistanceCm = distanceCm;

  if (distanceCm < 0.5f || distanceCm > 25.0f)
  {
    return -1.0f;   // invalid / out of range
  }

  float waterLevelCm = TANK_MAX_HEIGHT_CM - distanceCm;

  if (waterLevelCm < 0.0f) waterLevelCm = 0.0f;
  if (waterLevelCm > TANK_MAX_HEIGHT_CM) waterLevelCm = TANK_MAX_HEIGHT_CM;

  return round(waterLevelCm * 10.0f) / 10.0f;
}

// ============================================================
// AUTOMATIC TANK FILLING (hysteresis + NO ECHO protection)
// ============================================================
void handleTankAutoFilling(float waterLevelCm)
{
  // NO ECHO / invalid: never auto-start Pump 1.
  // If an AUTO fill was running, stop it (level unknown).
  if (waterLevelCm < 0.0f)
  {
    if (pump1Running && autoTankFillingActive)
    {
      Serial.println("[AUTO FILL SAFETY] NO ECHO during auto-fill. Stopping Pump 1.");
      setPump1(false);
      autoTankFillingActive = false;
    }
    return;
  }

  if (waterLevelCm <= TANK_LOW_THRESHOLD_CM)
  {
    if (!pump1Running)
    {
      Serial.printf("[AUTO FILL] Level low (%.1f cm <= %.1f cm). Pump 1 ON.\n",
                    waterLevelCm, TANK_LOW_THRESHOLD_CM);
      autoTankFillingActive = true;
      setPump1(true);
    }
  }
  else if (waterLevelCm >= TANK_FULL_THRESHOLD_CM)
  {
    if (pump1Running)
    {
      Serial.printf("[AUTO FILL] Level full (%.1f cm >= %.1f cm). Pump 1 OFF.\n",
                    waterLevelCm, TANK_FULL_THRESHOLD_CM);
      setPump1(false);
      autoTankFillingActive = false;
    }
  }
  // 3.0 - 7.0 cm: hysteresis, keep current state
}

// ============================================================
// PUMP CONTROL (hard mutual exclusion, active LOW)
// ============================================================
void setPump1(bool on)
{
  if (on)
  {
    // Pump 2 must be OFF before Pump 1 energizes
    digitalWrite(PUMP2_PIN, RELAY_OFF);
    if (pump2Running)
    {
      pump2Running = false;
      Serial.println("[SAFETY] Pump 2 stopped (mutual exclusion) before starting Pump 1.");
      safePublish(TOPIC_PUMP2_STATUS, "PUMP_OFF");
    }
  }

  digitalWrite(PUMP1_PIN, on ? RELAY_ON : RELAY_OFF);
  pump1Running = on;

  Serial.printf("[PUMP 1 - FILL] %s\n", on ? "ON" : "OFF");
  safePublish(TOPIC_PUMP1_STATUS, on ? "FILL_ON" : "FILL_OFF");
}

void setPump2(bool on)
{
  if (on)
  {
    // Pump 1 must be OFF before Pump 2 energizes
    digitalWrite(PUMP1_PIN, RELAY_OFF);
    if (pump1Running)
    {
      pump1Running = false;
      autoTankFillingActive = false;
      Serial.println("[SAFETY] Pump 1 stopped (mutual exclusion) before starting Pump 2.");
      safePublish(TOPIC_PUMP1_STATUS, "FILL_OFF");
    }
  }

  digitalWrite(PUMP2_PIN, on ? RELAY_ON : RELAY_OFF);
  pump2Running = on;

  Serial.printf("[PUMP 2 - IRRIGATION] %s\n", on ? "ON" : "OFF");
  safePublish(TOPIC_PUMP2_STATUS, on ? "PUMP_ON" : "PUMP_OFF");
}

void allPumpsOFF()
{
  digitalWrite(PUMP1_PIN, RELAY_OFF);
  digitalWrite(PUMP2_PIN, RELAY_OFF);
  pump1Running = false;
  pump2Running = false;
  autoTankFillingActive = false;
  Serial.println("SAFETY: BOTH PUMPS OFF.");
  publishPumpStatus();
}

// ============================================================
// PUBLISHING
// ============================================================
void safePublish(const char* topic, const char* payload)
{
  if (mqttClient.connected())
  {
    mqttClient.publish(topic, payload);
  }
}

void publishMoisture(float moisture, int rawADC, unsigned long now)
{
  char payload[160];
  snprintf(payload, sizeof(payload),
           "{\"sensorId\":\"%s\",\"soilMoisture\":%.1f,\"rawADC\":%d,\"timestamp\":%lu,\"source\":\"esp32\"}",
           DEVICE_ID, moisture, rawADC, now / 1000);
  safePublish(TOPIC_MOISTURE, payload);
}

void publishTankLevel(float waterLevelCm)
{
  char payload[192];

  if (waterLevelCm < 0.0f)
  {
    snprintf(payload, sizeof(payload),
             "{\"sensorId\":\"%s\",\"tankLevel\":-1,\"waterLevelCm\":-1,\"status\":\"NO ECHO\",\"source\":\"esp32\"}",
             DEVICE_ID);
  }
  else
  {
    float tankPercent = (waterLevelCm / TANK_MAX_HEIGHT_CM) * 100.0f;
    if (tankPercent > 100.0f) tankPercent = 100.0f;

    snprintf(payload, sizeof(payload),
             "{\"sensorId\":\"%s\",\"tankLevel\":%.1f,\"waterLevelCm\":%.1f,\"status\":\"OK\",\"source\":\"esp32\"}",
             DEVICE_ID, tankPercent, waterLevelCm);
  }

  safePublish(TOPIC_TANK_LEVEL, payload);
}

void publishPumpStatus()
{
  safePublish(TOPIC_PUMP1_STATUS, pump1Running ? "FILL_ON" : "FILL_OFF");
  safePublish(TOPIC_PUMP2_STATUS, pump2Running ? "PUMP_ON" : "PUMP_OFF");
}
