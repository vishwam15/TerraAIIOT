const EventEmitter = require('events');
const PumpEvent = require('../models/PumpEvent');
const IrrigationCycle = require('../models/IrrigationCycle');
const MLTrainingData = require('../models/MLTrainingData');
const SystemEvent = require('../models/SystemEvent');
const Settings = require('../models/Settings');
const mlClient = require('./mlClient');

class PumpController extends EventEmitter {
  constructor() {
    super();
    this.pump1State = false; // Tank Filling Pump (GPIO 6)
    this.pump2State = false; // Irrigation Pump (GPIO 7)
    this.autoMode = false;
    this.autoTankFillingActive = false;
    this.pump2Timer = null;
    this.activeIrrigationCycle = null;
    this.lastIrrigationCycleEndTime = 0;
    this.cooldownSeconds = 5; // 5-second cooldown to let soil water permeate
    this.currentMoisture = 45;
    this.currentTankLevel = 72; // percentage (0 - 100%)
    this.waterLevelCm = 5.8;    // water depth in cm (0.0 to 8.0 cm)
    this.lastCommand = 'INIT';
    this.pump1StartTime = null;
    this.pump2StartTime = null;
  }

  getStatus() {
    return {
      pump1: {
        id: 'PUMP_1',
        name: 'Tank Filling Pump',
        gpio: 6,
        status: this.pump1State ? 'ON' : 'OFF',
        running: this.pump1State,
        runtimeSeconds: this.pump1State && this.pump1StartTime ? Math.round((Date.now() - this.pump1StartTime) / 1000) : 0,
        mode: 'MANUAL_ONLY',
        allowsAutomatic: false
      },
      pump2: {
        id: 'PUMP_2',
        name: 'Irrigation Pump',
        gpio: 7,
        status: this.pump2State ? 'ON' : 'OFF',
        running: this.pump2State,
        runtimeSeconds: this.pump2State && this.pump2StartTime ? Math.round((Date.now() - this.pump2StartTime) / 1000) : 0,
        mode: 'MANUAL_AND_AUTOMATIC',
        allowsAutomatic: true
      },
      autoMode: this.autoMode,
      autoTankFillingActive: this.autoTankFillingActive,
      currentMoisture: this.currentMoisture,
      currentTankLevel: this.currentTankLevel,
      waterLevelCm: this.waterLevelCm,
      lastCommand: this.lastCommand,
      mutualExclusionActive: true,
      activeCycle: this.activeIrrigationCycle ? {
        id: this.activeIrrigationCycle._id,
        predictedRuntime: this.activeIrrigationCycle.predictedRuntime,
        beforeMoisture: this.activeIrrigationCycle.beforeMoisture,
        targetMoisture: this.activeIrrigationCycle.targetMoisture,
        triggerType: this.activeIrrigationCycle.triggerType
      } : null
    };
  }

  // Synchronize state when ESP32 publishes hardware confirmation via MQTT
  async syncHardwarePumpStatus(pumpId, isOn) {
    let changed = false;
    if (pumpId === 'PUMP_1') {
      // =====================================================================
      // PUMP 1 IS MANUAL ONLY — hardware state sync to ON is ALWAYS BLOCKED.
      // If the ESP32 ever reports FILL_ON (e.g. after reset with stale state,
      // relay glitch, or reconnect), we immediately command it back OFF.
      // This prevents ANY automatic turn-on via hardware MQTT echo.
      // =====================================================================
      if (isOn) {
        console.warn('[SAFETY] PUMP 1 MANUAL-ONLY: ESP32 reported FILL_ON but no manual command was issued. Forcing FILL_OFF immediately.');
        // Force hardware off
        this.emit('mqtt_publish', { topic: 'irrigation/cmd', payload: 'FILL_OFF' });
        // Ensure backend state stays OFF
        if (this.pump1State) {
          this.pump1State = false;
          this.pump1StartTime = null;
          changed = true;
        }
      } else {
        // Sync OFF state normally
        if (this.pump1State !== false) {
          this.pump1State = false;
          this.pump1StartTime = null;
          this.autoTankFillingActive = false;
          changed = true;
        }
      }
    } else if (pumpId === 'PUMP_2') {
      if (this.pump2State !== isOn) {
        this.pump2State = isOn;
        this.pump2StartTime = isOn ? Date.now() : null;
        changed = true;
      }
      // CRITICAL SAFETY RULE: Mutual exclusion enforcement
      if (isOn && this.pump1State) {
        console.warn('[SAFETY] Hardware sync: Pump 2 confirmed ON -> forcing Pump 1 OFF (Mutual Exclusion).');
        this.pump1State = false;
        this.pump1StartTime = null;
        this.autoTankFillingActive = false;
        changed = true;
        this.emit('mqtt_publish', { topic: 'irrigation/cmd', payload: 'FILL_OFF' });
      }
    }

    if (changed) {
      await PumpEvent.create({
        pumpId: pumpId,
        action: isOn ? 'ON' : 'OFF',
        reason: 'hardware_mqtt_sync',
        soilMoistureAtEvent: this.currentMoisture,
        source: 'esp32_mqtt'
      });
      this.emit('pump_change', this.getStatus());
    }
  }

  // --- HARD MUTUAL EXCLUSION CONTROLLERS ---

  async setPump1(turnOn, reason = 'manual') {
    // =========================================================
    // PUMP 1 IS STRICTLY MANUAL ONLY
    // Any automated / non-manual attempt to turn ON Pump 1 is
    // hard-blocked here regardless of where the call originates.
    // Turning OFF is ALWAYS allowed (safety override).
    // Allowed ON reasons: 'manual' or anything containing 'manual'
    // ALL other reasons (auto, ai, threshold, cutoff, etc.) are BLOCKED for ON.
    // =========================================================
    if (turnOn) {
      const reasonLower = (reason || '').toLowerCase();
      const isManual = reasonLower === 'manual' || reasonLower.includes('manual');
      if (!isManual) {
        console.warn(`[SAFETY] PUMP 1 MANUAL-ONLY: Blocked automated ON attempt. Reason='${reason}'`);
        return this.getStatus();
      }
    }

    if (turnOn) {
      // Hard mutual exclusion: Pump 2 must be OFF before Pump 1 starts
      if (this.pump2State) {
        console.warn('[SAFETY] Mutual exclusion triggered: Stopping Pump 2 before starting Pump 1.');
        await this.setPump2(false, 'mutual_exclusion_cutoff');
        await SystemEvent.create({
          eventType: 'PUMP_MUTUAL_EXCLUSION',
          message: 'Pump 2 stopped automatically to allow Pump 1 activation (Hard Mutual Exclusion Rule).',
          details: { pumpStopped: 'PUMP_2', pumpStarted: 'PUMP_1' }
        });
      }
      this.pump1State = true;
      this.pump1StartTime = Date.now();
      this.lastCommand = 'FILL_ON';
    } else {
      this.pump1State = false;
      this.pump1StartTime = null;
      this.autoTankFillingActive = false;
      this.lastCommand = 'FILL_OFF';
    }

    // Log to DB
    await PumpEvent.create({
      pumpId: 'PUMP_1',
      action: turnOn ? 'ON' : 'OFF',
      reason: reason,
      soilMoistureAtEvent: this.currentMoisture,
      source: 'backend'
    });

    this.emit('pump_change', this.getStatus());
    this.emit('mqtt_publish', { topic: 'irrigation/cmd', payload: turnOn ? 'FILL_ON' : 'FILL_OFF' });
    this.emit('mqtt_publish', { topic: 'irrigation/pump1_status', payload: turnOn ? 'FILL_ON' : 'FILL_OFF' });
    return this.getStatus();
  }

  // AI-controlled irrigation initiation (Requirement 2 & 11)
  async startAiIrrigation(targetMoistureParam = null) {
    const settings = await Settings.findOne() || {
      autoStartThreshold: 30,
      autoStopThreshold: 80,
      aiTargetMoisture: 80,
      maxPumpRuntime: 30
    };

    const targetMoisture = (targetMoistureParam !== null && targetMoistureParam !== undefined)
      ? Number(targetMoistureParam)
      : (settings.aiTargetMoisture || 80);

    const currentMoisture = Number(this.currentMoisture);

    // If current moisture is already >= target moisture, runtime = 0 and pump must NOT start
    if (currentMoisture >= targetMoisture) {
      console.log(`[AI Irrigation] Current moisture (${currentMoisture}%) >= Target (${targetMoisture}%). Pump will NOT start.`);
      return {
        success: false,
        started: false,
        currentMoisture,
        targetMoisture,
        predictedRuntime: 0.0,
        message: `Current moisture (${currentMoisture}%) is already at or above target (${targetMoisture}%). Irrigation pump will not start.`
      };
    }

    // Predict runtime using ML microservice (with safe fallback)
    const prediction = await mlClient.predict(currentMoisture, targetMoisture);
    const predictedRuntime = Number(prediction.predicted_runtime_seconds);

    if (predictedRuntime <= 0) {
      return {
        success: false,
        started: false,
        currentMoisture,
        targetMoisture,
        predictedRuntime: 0.0,
        message: 'Predicted pump runtime is 0 seconds.'
      };
    }

    // Clamp with configurable MAX_PUMP_RUNTIME safety boundary
    const maxLimit = settings.maxPumpRuntime || 30;
    const safeDuration = Math.min(maxLimit, Math.max(0.1, predictedRuntime));

    // Hard mutual exclusion: Pump 1 must be OFF before Pump 2 starts
    if (this.pump1State) {
      console.warn('[SAFETY] Mutual exclusion triggered: Stopping Pump 1 before starting Pump 2.');
      await this.setPump1(false, 'mutual_exclusion_cutoff');
      await SystemEvent.create({
        eventType: 'PUMP_MUTUAL_EXCLUSION',
        message: 'Pump 1 stopped automatically to allow Pump 2 activation (Hard Mutual Exclusion Rule).',
        details: { pumpStopped: 'PUMP_1', pumpStarted: 'PUMP_2' }
      });
    }

    // Clear prior timer if any
    if (this.pump2Timer) {
      clearTimeout(this.pump2Timer);
      this.pump2Timer = null;
    }

    // Create active irrigation cycle record in MongoDB
    this.activeIrrigationCycle = await IrrigationCycle.create({
      pumpId: 'PUMP_2',
      triggerType: 'manual',
      beforeMoisture: currentMoisture,
      targetMoisture: targetMoisture,
      predictedRuntime: safeDuration,
      actualRuntime: 0,
      modelUsed: prediction.model || 'RandomForestRegressor',
      status: 'in_progress',
      startTime: new Date(),
      source: 'backend'
    });

    this.pump2State = true;
    this.pump2StartTime = Date.now();
    this.lastCommand = 'PUMP_ON';

    console.log(`[AI Irrigation] Started Pump 2 for predicted ${safeDuration}s (Current: ${currentMoisture}%, Target: ${targetMoisture}%)`);

    // Log to DB
    await PumpEvent.create({
      pumpId: 'PUMP_2',
      action: 'ON',
      reason: 'ai_manual_trigger',
      soilMoistureAtEvent: currentMoisture,
      durationSeconds: safeDuration,
      source: 'backend'
    });

    // Schedule automatic shutdown after predicted duration
    this.pump2Timer = setTimeout(async () => {
      console.log(`[AI Irrigation] Predicted duration (${safeDuration}s) reached. Automatically stopping Pump 2.`);
      await this.setPump2(false, 'ai_runtime_complete');
    }, safeDuration * 1000);

    this.emit('pump_change', this.getStatus());
    this.emit('mqtt_publish', { topic: 'irrigation/cmd', payload: 'PUMP_ON' });
    this.emit('mqtt_publish', { topic: 'irrigation/pump2_status', payload: 'PUMP_ON' });
    this.emit('ai_irrigation_started', {
      cycleId: this.activeIrrigationCycle._id,
      moistureBefore: currentMoisture,
      targetMoisture: targetMoisture,
      predictedRuntime: safeDuration,
      explanation: prediction.explanation
    });

    return {
      success: true,
      started: true,
      currentMoisture,
      targetMoisture,
      predictedRuntime: safeDuration,
      prediction,
      status: this.getStatus()
    };
  }

  async setPump2(turnOn, reason = 'manual', durationSeconds = null, targetMoisture = 80) {
    if (turnOn) {
      // Hard mutual exclusion: Pump 1 must be OFF before Pump 2 starts
      if (this.pump1State) {
        console.warn('[SAFETY] Mutual exclusion triggered: Stopping Pump 1 before starting Pump 2.');
        await this.setPump1(false, 'mutual_exclusion_cutoff');
        await SystemEvent.create({
          eventType: 'PUMP_MUTUAL_EXCLUSION',
          message: 'Pump 1 stopped automatically to allow Pump 2 activation (Hard Mutual Exclusion Rule).',
          details: { pumpStopped: 'PUMP_1', pumpStarted: 'PUMP_2' }
        });
      }

      this.pump2State = true;
      this.pump2StartTime = Date.now();
      this.lastCommand = 'PUMP_ON';

      // Always track irrigation cycle for machine learning model continuous training
      if (!this.activeIrrigationCycle) {
        try {
          this.activeIrrigationCycle = await IrrigationCycle.create({
            pumpId: 'PUMP_2',
            triggerType: reason.includes('force') ? 'manual_override' : (reason.includes('ai') ? 'ai_predicted' : 'manual'),
            beforeMoisture: this.currentMoisture,
            targetMoisture: targetMoisture || 80,
            predictedRuntime: durationSeconds || 0,
            actualRuntime: 0,
            modelUsed: 'RandomForestRegressor',
            status: 'in_progress',
            startTime: new Date(),
            source: 'esp32'
          });
        } catch (cycleErr) {
          console.warn('[CYCLE] Error creating cycle record:', cycleErr.message);
        }
      }

      // Clear any prior timer
      if (this.pump2Timer) {
        clearTimeout(this.pump2Timer);
        this.pump2Timer = null;
      }

      // If duration is specified or predicted, schedule auto-off
      if (durationSeconds && durationSeconds > 0) {
        const settings = await Settings.findOne() || { maxPumpRuntime: 30 };
        const safeDuration = Math.min(settings.maxPumpRuntime, Math.max(0.1, durationSeconds));

        console.log(`[PumpController] Scheduling Pump 2 shutdown in ${safeDuration}s (${reason})`);

        this.pump2Timer = setTimeout(async () => {
          console.log(`[PumpController] Runtime duration (${safeDuration}s) reached. Stopping Pump 2.`);
          await this.setPump2(false, 'ai_runtime_complete');
        }, safeDuration * 1000);
      }
    } else {
      if (this.pump2Timer) {
        clearTimeout(this.pump2Timer);
        this.pump2Timer = null;
      }

      const actualDuration = this.pump2StartTime ? Math.round(((Date.now() - this.pump2StartTime) / 1000) * 100) / 100 : 0;
      this.pump2State = false;
      this.pump2StartTime = null;
      this.lastCommand = 'PUMP_OFF';
      this.lastIrrigationCycleEndTime = Date.now();

      // Finalize active irrigation cycle for post-irrigation learning
      if (this.activeIrrigationCycle) {
        this.finalizeIrrigationCycle(actualDuration);
      }
    }

    // Log to DB
    await PumpEvent.create({
      pumpId: 'PUMP_2',
      action: turnOn ? 'ON' : 'OFF',
      reason: reason,
      soilMoistureAtEvent: this.currentMoisture,
      durationSeconds: durationSeconds,
      source: 'backend'
    });

    this.emit('pump_change', this.getStatus());
    this.emit('mqtt_publish', { topic: 'irrigation/cmd', payload: turnOn ? 'PUMP_ON' : 'PUMP_OFF' });
    this.emit('mqtt_publish', { topic: 'irrigation/pump2_status', payload: turnOn ? 'PUMP_ON' : 'PUMP_OFF' });
    return this.getStatus();
  }

  // --- AUTOMATION MODE & HYSTERESIS ---

  async setAutoMode(enable) {
    this.autoMode = enable;
    this.lastCommand = enable ? 'AUTO_MODE_ON' : 'AUTO_MODE_OFF';
    this.emit('pump_change', this.getStatus());
    this.emit('mqtt_publish', { topic: 'irrigation/cmd', payload: enable ? 'AUTO_MODE_ON' : 'AUTO_MODE_OFF' });

    await SystemEvent.create({
      eventType: 'INFO',
      message: `Automatic Irrigation Mode ${enable ? 'ENABLED' : 'DISABLED'}.`,
      details: { autoMode: enable }
    });

    if (!enable && this.pump2State && this.activeIrrigationCycle?.triggerType === 'automatic') {
      await this.setPump2(false, 'auto_mode_disabled');
    }
    return this.getStatus();
  }

  // --- PUMP 1 TANK TELEMETRY (AUTOMATIC TANK-FILLING PERMANENTLY DISABLED) ---
  async handleTankLevelUpdate(waterLevelCm, source = 'esp32') {
    this.waterLevelCm = waterLevelCm;
    // autoTankFillingActive is permanently false — Pump 1 never auto-starts.
    // This function only updates the in-memory water level reading.
    this.autoTankFillingActive = false;
  }

  // Called whenever new soil moisture telemetry arrives (approximately every 1 second)
  async handleMoistureUpdate(moisture, tankLevel = null, source = 'esp32') {
    this.currentMoisture = moisture;
    if (tankLevel !== null) this.currentTankLevel = tankLevel;

    // Fetch dynamic thresholds from DB
    const settings = await Settings.findOne() || {
      autoStartThreshold: 30,
      autoStopThreshold: 80,
      aiTargetMoisture: 80,
      maxPumpRuntime: 30
    };

    const startThreshold = settings.autoStartThreshold || 30;
    const stopThreshold = settings.autoStopThreshold || 80;
    const targetMoisture = settings.aiTargetMoisture || 80;

    // Track post-irrigation moisture absorption during the observation window
    if (this.pendingPostLearning) {
      this.pendingPostLearning.peakMoisture = Math.max(
        this.pendingPostLearning.peakMoisture || 0,
        moisture
      );
      this.pendingPostLearning.ticksObserved = (this.pendingPostLearning.ticksObserved || 0) + 1;
    }

    if (!this.autoMode) {
      return;
    }

    // Automatic stopping rule:
    if (moisture >= stopThreshold) {
      if (this.pump2State) {
        console.log(`[AUTOMATION] Moisture (${moisture}%) reached stop threshold (${stopThreshold}%). Stopping Pump 2.`);
        await this.setPump2(false, 'auto_stop');
      }
      return;
    }

    // Automatic trigger rule:
    if (moisture <= startThreshold) {
      const now = Date.now();
      const timeSinceLastCycle = (now - this.lastIrrigationCycleEndTime) / 1000;

      if (!this.pump2State && timeSinceLastCycle >= this.cooldownSeconds && !this.activeIrrigationCycle) {
        console.log(`[AUTOMATION] Moisture (${moisture}%) is below trigger threshold (${startThreshold}%). Requesting AI prediction.`);

        try {
          const prediction = await mlClient.predict(moisture, targetMoisture);
          const predictedRuntime = prediction.predicted_runtime_seconds;

          console.log(`[AUTOMATION] AI Predicted runtime: ${predictedRuntime}s to reach target ${targetMoisture}%.`);

          this.activeIrrigationCycle = await IrrigationCycle.create({
            pumpId: 'PUMP_2',
            triggerType: 'automatic',
            beforeMoisture: moisture,
            targetMoisture: targetMoisture,
            predictedRuntime: predictedRuntime,
            actualRuntime: 0,
            modelUsed: prediction.model || 'RandomForestRegressor',
            status: 'in_progress',
            startTime: new Date(),
            source: source
          });

          // Start Pump 2 with AI predicted runtime (enforces mutual exclusion with Pump 1)
          await this.setPump2(true, 'auto_trigger', predictedRuntime, targetMoisture);

          this.emit('ai_irrigation_started', {
            cycleId: this.activeIrrigationCycle._id,
            moistureBefore: moisture,
            targetMoisture: targetMoisture,
            predictedRuntime: predictedRuntime,
            explanation: prediction.explanation
          });

        } catch (err) {
          console.error(`[AUTOMATION] Error executing AI irrigation cycle:`, err.message);
        }
      }
    }
  }

  finalizeIrrigationCycle(actualDuration) {
    if (!this.activeIrrigationCycle) return;
    const cycle = this.activeIrrigationCycle;
    cycle.actualRuntime = actualDuration;
    cycle.endTime = new Date();
    
    // Hold cycle for 6-second soil absorption window to allow moisture sensor to respond
    this.pendingPostLearning = cycle;
    this.pendingPostLearning.peakMoisture = this.currentMoisture;
    this.pendingPostLearning.ticksObserved = 0;
    this.activeIrrigationCycle = null;

    console.log(`[AI/ML LEARNING] Irrigation cycle ended (duration: ${actualDuration}s). Observing soil absorption for 6s before training...`);

    setTimeout(async () => {
      if (this.pendingPostLearning && this.pendingPostLearning._id.toString() === cycle._id.toString()) {
        const finalMoisture = Math.max(this.currentMoisture, this.pendingPostLearning.peakMoisture || this.currentMoisture);
        await this.recordPostIrrigationLearning(finalMoisture);
      }
    }, 6000);
  }

  async recordPostIrrigationLearning(afterMoisture) {
    const cycle = this.pendingPostLearning;
    this.pendingPostLearning = null;
    if (!cycle) return;

    try {
      const beforeMoisture = cycle.beforeMoisture;
      const actualRuntime = Math.max(0.1, cycle.actualRuntime || 1);
      const targetMoisture = cycle.targetMoisture || 80;
      const moistureGain = Math.round((afterMoisture - beforeMoisture) * 10) / 10;
      const gainPerSec = actualRuntime > 0 ? Math.round((moistureGain / actualRuntime) * 100) / 100 : 0;
      const predictionError = Math.round(Math.abs(targetMoisture - afterMoisture) * 10) / 10;
      const moistureDeficit = Math.round(Math.max(0.1, targetMoisture - beforeMoisture) * 10) / 10;

      cycle.afterMoisture = afterMoisture;
      cycle.moistureGain = moistureGain;
      cycle.gainPerSecond = gainPerSec;
      cycle.predictionError = predictionError;
      cycle.status = 'completed';
      await cycle.save();

      // Save real sensor cycle to MongoDB collection 'irrigation_training_data'
      await MLTrainingData.create({
        initialMoisture: beforeMoisture,
        targetMoisture: targetMoisture,
        moistureDeficit: moistureDeficit,
        pumpRuntimeSeconds: actualRuntime,
        finalMoisture: afterMoisture,
        moistureIncrease: moistureGain,
        soilCondition: 'moderate',
        recentMoistureChange: -0.25,
        previousPumpRuntime: actualRuntime,
        pumpId: 'PUMP_2',
        source: 'LIVE SENSOR DATA',
        timestamp: new Date()
      });

      console.log(`[AI/ML LEARNING] Real cycle saved: Before=${beforeMoisture}% -> After=${afterMoisture}%, Gain=${moistureGain}%, Runtime=${actualRuntime}s.`);

      // AUTOMATIC CLOSED-LOOP RETRAINING: Retrain Python AI/ML models on real sensor data!
      try {
        console.log('[AI/ML RETRAINING] Auto-triggering Python ML model training with newly collected real sensor data...');
        const allRecords = await MLTrainingData.find().sort({ timestamp: -1 }).limit(1000).lean();
        const formatted = allRecords.map(r => ({
          initialMoisture: r.initialMoisture,
          targetMoisture: r.targetMoisture,
          moistureDeficit: r.moistureDeficit,
          pumpRuntimeSeconds: r.pumpRuntimeSeconds,
          finalMoisture: r.finalMoisture,
          moistureIncrease: r.moistureIncrease,
          soilCondition: r.soilCondition || 'moderate',
          recentMoistureChange: r.recentMoistureChange || -0.25,
          previousPumpRuntime: r.previousPumpRuntime || 2.0,
          source: r.source || 'LIVE SENSOR DATA'
        }));

        const trainResult = await mlClient.train(formatted);
        console.log(`[AI/ML RETRAINING] SUCCESS! Model ${trainResult.active_model} retrained on ${trainResult.total_samples || formatted.length} samples. R2: ${trainResult.metrics?.r2}`);
        
        this.emit('ml_model_retrained', {
          success: true,
          metrics: trainResult.metrics,
          activeModel: trainResult.active_model,
          totalSamples: trainResult.total_samples || formatted.length,
          lastCycle: { beforeMoisture, afterMoisture, actualRuntime, moistureGain }
        });
      } catch (trainErr) {
        console.warn('[AI/ML RETRAINING] Auto-retrain error:', trainErr.message);
      }

      this.emit('cycle_completed', {
        id: cycle._id,
        beforeMoisture,
        afterMoisture,
        moistureGain,
        gainPerSec,
        predictionError,
        actualRuntime
      });

    } catch (err) {
      console.error('[LEARNING] Error saving post-irrigation learning record:', err.message);
    }
  }
}

module.exports = new PumpController();
