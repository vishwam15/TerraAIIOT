# TERRAWAVE AI — Smart Irrigation & AI/ML IoT Web Application

A full-stack, enterprise-grade **Smart Irrigation and Precision Agriculture Platform** engineered for an **AI for IoT Engineering Project**.

The system integrates real-time telemetry from **ESP32-S3 physical sensors** through an **MQTT Broker (HiveMQ)** and **Node-RED IoT Orchestration Gateway**, ingested by a **Node.js/Express Backend** with **MongoDB Time-Series Storage**, powered by a **Python FastAPI Supervised Machine Learning Service (Random Forest Regressor)**, and visualized via a modern **React 19 + TypeScript + Vite + Tailwind CSS Frontend**.

---

## 1. Project Overview

**TERRAWAVE AI** solves modern agricultural water conservation challenges by predicting the exact runtime required for an irrigation pump to raise soil moisture toward an optimal target (default **80%**). 

Key Highlights:
- **No Hardcoded Durations:** Pump runtime is predicted dynamically using a trained supervised machine learning regression model.
- **Continuous Analog Feedback:** Accurately interpolates analog ADC voltages from soil sensors into floating-point moisture percentages (never jumping abruptly between 0% and 100%).
- **Hard Mutual-Exclusion Safety Interlock:** Pump 1 (Tank Filling) and Pump 2 (Irrigation) can never run simultaneously.
- **Closed-Loop Automation with Hysteresis:** Triggers automatically below 30% and stops above 80% without chatter or short-cycling.
- **Post-Irrigation Learning Feedback Loop:** Every irrigation event stores pre/post moisture and actual pump duration to continuously train and refine the ML model on live ground truth.

---

## 2. System Architecture

```text
                  +-----------------------------------------+
                  |           ESP32-S3 Microcontroller      |
                  |  - Analog Soil Sensor (ADC1_CH0 / GPIO1)|
                  |  - Ultrasonic HC-SR04 (GPIO 4/5)        |
                  |  - Relay Actuator Pump 1 (GPIO 6)       |
                  |  - Relay Actuator Pump 2 (GPIO 7)       |
                  +-----------------------------------------+
                                       |
                                       | MQTT (WiFi 802.11 b/g/n)
                                       v
                  +-----------------------------------------+
                  |         HiveMQ MQTT Broker (1883)       |
                  |   Topics: irrigation/moisture, cmd, etc |
                  +-----------------------------------------+
                                       |
                                       | MQTT Sub/Pub
                                       v
                  +-----------------------------------------+
                  |         Node-RED IoT Gateway (1880)     |
                  |  - JSON Packet Parsing & Sanity Check   |
                  |  - Out-of-bounds Filter & NO ECHO Check |
                  +-----------------------------------------+
                                       |
                                       | HTTP POST / Webhooks
                                       v
+-----------------------------------------------------------------------------------+
|                        Node.js + Express Backend (Port 1607)                      |
|  - Real-Time WebSocket Broadcaster                                                |
|  - Pump State Machine & Hardware Mutual Exclusion Guard                           |
|  - Hysteresis Automation Controller (<30% start, >80% stop)                       |
|  - Post-Irrigation Learning Logger                                                |
+-----------------------------------------------------------------------------------+
       |                                       |                               |
       | Mongoose ODM                          | HTTP REST                     | WebSocket / SSE
       v                                       v                               v
+-----------------------+   +------------------------------------+   +---------------------+
|   MongoDB Database    |   |    Python FastAPI Service (8000)   |   |   React Frontend    |
|     (Port 27017)      |   |  - Random Forest Regressor         |   |    (Port 1606)      |
| - sensor_readings     |   |  - Model Benchmark Suite           |   | - Live Gauges       |
| - irrigation_cycles   |   |  - Feature Importance & Residuals  |   | - Controls          |
| - training_data       |   |  - Joblib Model Persistence        |   | - AI Simulator      |
| - system_events       |   +------------------------------------+   +---------------------+
+-----------------------+
```

---

## 3. Hardware Configuration & Wiring

### ESP32-S3 Pinout

| Peripheral | ESP32-S3 Pin | Function / Notes |
| :--- | :--- | :--- |
| **Soil Moisture Sensor AOUT** | `GPIO 1` | Analog ADC1 Channel 0. High ADC = dry soil. |
| **HC-SR04 TRIG** | `GPIO 4` | 10µs ultrasonic trigger pulse. |
| **HC-SR04 ECHO** | `GPIO 5` | Ultrasonic return pulse measurement. |
| **Pump 1 (Tank Filling)** | `GPIO 6` | Relay Active HIGH. Controlled manually from UI. |
| **Pump 2 (Irrigation Pump)** | `GPIO 7` | Relay Active HIGH. Controlled manually or by AI. |

### Calibration Formulas

```cpp
#define SOIL_DRY 3000   // Raw ADC reading in dry air (~0% moisture)
#define SOIL_WET 1200   // Raw ADC reading in saturated soil (~100% moisture)

// Linear analog interpolation:
float moisture = ((float)(SOIL_DRY - rawADC) / (float)(SOIL_DRY - SOIL_WET)) * 100.0f;
```

---

## 4. MQTT Architecture

* **Broker:** `broker.hivemq.com`
* **Port:** `1883`

### Topics

| Topic | Direction | Payload Example / Schema |
| :--- | :--- | :--- |
| `irrigation/moisture` | ESP32 → Backend | `{"sensorId":"ESP32-S3-001","soilMoisture":38.4,"rawADC":2310,"source":"esp32"}` |
| `irrigation/tank_level` | ESP32 → Backend | `{"sensorId":"ESP32-S3-001","tankLevel":72.5,"status":"OK"}` or `tankLevel: -1` |
| `irrigation/pump1_status` | Bidirectional | `FILL_ON` / `FILL_OFF` |
| `irrigation/pump2_status` | Bidirectional | `PUMP_ON` / `PUMP_OFF` |
| `irrigation/cmd` | Backend → ESP32 | `PUMP_ON`, `PUMP_OFF`, `FILL_ON`, `FILL_OFF`, `AUTO_MODE_ON`, `AUTO_MODE_OFF` |

---

## 5. Node-RED Setup

The Node-RED flow configuration is stored in `node-red/flows.json`.

1. Open Node-RED editor at `http://localhost:1880`.
2. Click **Menu (top right) → Import**.
3. Select or paste the contents of `node-red/flows.json`.
4. Click **Deploy**.
5. The gateway will subscribe to HiveMQ, parse and validate incoming sensor packets, filter invalid readings, format ultrasonic timeouts, and forward them via HTTP POST to `http://localhost:1607/api/nodered/telemetry`.

---

## 6. Ports Configuration

| Service | Protocol | Host / Port |
| :--- | :--- | :--- |
| **React Frontend (Vite)** | HTTP | `http://localhost:1606` |
| **Node.js / Express Backend** | HTTP / WS | `http://localhost:1607` (API: `/api`, WS: `/ws`) |
| **Python FastAPI ML Microservice** | HTTP | `http://127.0.0.1:8000` |
| **MQTT Broker** | TCP | `broker.hivemq.com:1883` |
| **Node-RED Gateway** | HTTP | `http://localhost:1880` |
| **MongoDB Database** | TCP | `mongodb://127.0.0.1:27017/terrawave` |

---

## 7. Installation & Quick Start

### Step 1: Clone & Prerequisites
Ensure Python (>= 3.10), Node.js (>= 18), and MongoDB are installed and running.

### Step 2: Start the Python ML Service
```bash
cd ml-service
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Step 3: Start the Node.js Backend
```bash
cd ../backend
npm install
node server.js
```

### Step 4: Start the React Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open **`http://localhost:1606`** in your browser.

---

## 8. Machine Learning Pipeline & Training

### Model Architecture
- **Primary Algorithm:** `RandomForestRegressor` (`n_estimators=100`, `max_depth=8`, `random_state=42`).
- **Input Features:**
  1. `initialMoisture`: Current soil moisture reading.
  2. `targetMoisture`: Desired moisture level (default 80%).
  3. `moistureDeficit`: Difference (`targetMoisture - initialMoisture`).
  4. `recentMoistureChange`: Natural evaporation rate.
  5. `previousPumpRuntime`: Duration of the last irrigation cycle.
- **Predicted Output:** `pumpRuntimeSeconds` (float).
- **Safety Envelope:** Predictions are clamped strictly within `[0.1s, 30.0s]`.

### Training on Actual Sensor Data
Click **"Train Model on Sensor Data"** in the UI or call `POST /api/ml/train`. The backend aggregates historical ground-truth irrigation records from MongoDB, sends them to the Python service, re-evaluates all 4 models, computes authentic R², MAE, and RMSE metrics, and persists the model via `joblib`.

---

## 9. Actuator Safety & Mutual Exclusion

1. **Hardware Rule:** Pump 1 and Pump 2 must NEVER run at the same time.
2. **Interlock Enforcement:**
   - If Pump 1 is running and Pump 2 receives an ON command, Pump 1 is instantly cut off before Pump 2 is energized.
   - If Pump 2 is running and Pump 1 receives an ON command, Pump 2 is instantly cut off before Pump 1 is energized.
   - Enforced simultaneously in Node.js backend controllers and ESP32 GPIO logic.
3. **Ultrasonic Resilience:** If the HC-SR04 reports `NO ECHO` (`-1`), the tank status is flagged as unavailable in amber without locking or disabling manual pump control.

---

## 10. API Endpoints Reference

### Sensors
- `GET /api/sensors/latest`: Returns latest telemetry reading and ESP32 health.
- `GET /api/sensors/history`: Recent 60 readings for graphs.
- `GET /api/soil-moisture/history`: Historical moisture and raw ADC.
- `GET /api/tank/history`: Historical ultrasonic water levels.

### Actuators & Automation
- `GET /api/pumps/status`: Live state of Pump 1, Pump 2, active cycle, and auto mode.
- `POST /api/pumps/irrigation/on`: Starts Pump 2 (enforces Pump 1 OFF).
- `POST /api/pumps/irrigation/off`: Stops Pump 2.
- `POST /api/pumps/fill/on`: Starts Pump 1 (enforces Pump 2 OFF).
- `POST /api/pumps/fill/off`: Stops Pump 1.
- `POST /api/automation/enable`: Enables AI closed-loop auto mode.
- `POST /api/automation/disable`: Disables auto mode.
- `GET /api/pumps/events`: Chronological actuator transition audit log.

### Machine Learning
- `POST /api/ml/predict`: Runs inference (`current_moisture`, `target_moisture`).
- `POST /api/ml/train`: Retrains models on MongoDB historical irrigation dataset.
- `GET /api/ml/metrics`: Returns authentic MAE, MSE, RMSE, and R² scores.
- `GET /api/ml/feature-importance`: Relative feature contributions.
- `GET /api/ml/models`: Side-by-side benchmark comparison.
- `POST /api/ml/set-active-model`: Switches production estimator.

### Data Export (CSV)
- `GET /api/export/sensors.csv`: Downloads full sensor telemetry in CSV.
- `GET /api/export/irrigation.csv`: Downloads historical irrigation cycles with pre/post feedback in CSV.
- `GET /api/export/training.csv`: Downloads full ML training dataset in CSV.

---

## 11. Troubleshooting

| Issue | Cause | Resolution |
| :--- | :--- | :--- |
| **ESP32 reports NO ECHO** | Loose ultrasonic ECHO wire or obstacle | Verify GPIO 4 (Trig) and GPIO 5 (Echo). Manual pump control remains operational. |
| **Port Conflict on 1606/1607** | Prior process occupying port | Run `netstat -ano \| findstr 1606` and terminate the PID. |
| **ML Service Unreachable** | FastAPI not running on 8000 | Verify `python -m uvicorn main:app --port 8000` is active. Backend will automatically fall back to resilient physical equations. |
| **MongoDB connection error** | Mongo service not started | Run `net start MongoDB` or verify `mongodb://127.0.0.1:27017`. |
