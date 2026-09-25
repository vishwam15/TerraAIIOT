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
    this.pump1State = false; // Tank Filling Pump
    this.pump2State = false; // Irrigation Pump
    this.autoMode = false;
    this.pump2Timer = null;
    this.activeIrrigationCycle = null;
    this.lastIrrigationCycleEndTime = 0;
    this.cooldownSeconds = 5; // 5-second cooldown to let soil water permeate
    this.currentMoisture = 45;
    this.currentTankLevel = 72;
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
        runtimeSeconds: this.pump1State && this.pump1StartTime ? Math.round((Date.now() - this.pump1StartTime) / 1000) : 0
      },
      pump2: {
        id: 'PUMP_2',
        name: 'Irrigation Pump',
        gpio: 7,
        status: this.pump2State ? 'ON' : 'OFF',
        running: this.pump2State,
        runtimeSeconds: this.pump2State && this.pump2StartTime ? Math.round((Date.now() - this.pump2StartTime) / 1000) : 0
      },
      autoMode: this.autoMode,
      currentMoisture: this.currentMoisture,
      currentTankLevel: this.currentTankLevel,
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

  // --- HARD MUTUAL EXCLUSION CONTROLLERS ---

  async setPump1(turnOn, reason = 'manual') {
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

    // Requirement 2: If current moisture is already >= target moisture, runtime = 0 and pump must NOT start
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
      // If auto mode turned off while running auto cycle, stop pump
      await this.setPump2(false, 'auto_mode_disabled');
    }
    return this.getStatus();
  }

  // Called whenever new soil moisture telemetry arrives (every 1 second)
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

    // Check if an irrigation cycle recently stopped and is waiting for post-irrigation moisture reading
    if (this.pendingPostLearning) {
      await this.recordPostIrrigationLearning(moisture);
    }

    if (!this.autoMode) {
      return;
    }

    // AUTOMATIC MODE HYSTERESIS LOGIC:
    // Rule: moisture < 30% -> automatic irrigation starts
    // Rule: moisture > 80% -> automatic irrigation stop / Pump 2 OFF
    // Rule: Between 30% and 80%, maintain current automatic state.

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
      // Check cooldown and current pump state
      const now = Date.now();
      const timeSinceLastCycle = (now - this.lastIrrigationCycleEndTime) / 1000;
      
      if (!this.pump2State && timeSinceLastCycle >= this.cooldownSeconds && !this.activeIrrigationCycle) {
        console.log(`[AUTOMATION] Moisture (${moisture}%) is below trigger threshold (${startThreshold}%). Requesting AI prediction.`);
        
        try {
          const prediction = await mlClient.predict(moisture, targetMoisture);
          const predictedRuntime = prediction.predicted_runtime_seconds;
          
          console.log(`[AUTOMATION] AI Predicted runtime: ${predictedRuntime}s to reach target ${targetMoisture}%.`);

          // Create active irrigation cycle record
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

          // Start Pump 2 with AI predicted runtime
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
    this.activeIrrigationCycle.actualRuntime = actualDuration;
    this.activeIrrigationCycle.endTime = new Date();
    this.pendingPostLearning = this.activeIrrigationCycle;
    this.activeIrrigationCycle = null;
  }

  // Section 22: Post-Irrigation Learning
  async recordPostIrrigationLearning(afterMoisture) {
    const cycle = this.pendingPostLearning;
    this.pendingPostLearning = null;
    if (!cycle) return;

    try {
      const beforeMoisture = cycle.beforeMoisture;
      const actualRuntime = cycle.actualRuntime || 1;
      const targetMoisture = cycle.targetMoisture;
      const moistureGain = Math.round((afterMoisture - beforeMoisture) * 10) / 10;
      const gainPerSec = actualRuntime > 0 ? Math.round((moistureGain / actualRuntime) * 100) / 100 : 0;
      const predictionError = Math.round(Math.abs(targetMoisture - afterMoisture) * 10) / 10;

      // Update cycle in DB
      cycle.afterMoisture = afterMoisture;
      cycle.moistureGain = moistureGain;
      cycle.gainPerSecond = gainPerSec;
      cycle.predictionError = predictionError;
      cycle.status = 'completed';
      await cycle.save();

      // Store in irrigation_training_data collection for future model retraining
      await MLTrainingData.create({
        initialMoisture: beforeMoisture,
        targetMoisture: targetMoisture,
        moistureDeficit: Math.round((targetMoisture - beforeMoisture) * 10) / 10,
        pumpRuntimeSeconds: actualRuntime,
        finalMoisture: afterMoisture,
        moistureIncrease: moistureGain,
        soilCondition: 'moderate',
        recentMoistureChange: -0.25,
        previousPumpRuntime: actualRuntime,
        pumpId: 'PUMP_2',
        source: cycle.source === 'esp32' ? 'LIVE DATA' : 'DEMO DATA',
        timestamp: new Date()
      });

      console.log(`[LEARNING] Cycle recorded: Before ${beforeMoisture}% -> After ${afterMoisture}%. Gain: ${moistureGain}%. Error: ${predictionError}%.`);
      
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
