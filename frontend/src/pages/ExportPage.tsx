import React from 'react';
import { api } from '../services/api';
import { Download, Database, Activity, History } from 'lucide-react';

export const ExportPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Download className="h-5 w-5 text-sky-600" />
          <span>Backend Data Export Pipeline (Section 26)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Export full-fidelity datasets directly from MongoDB collections via backend CSV streaming endpoints
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Sensor Data */}
        <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm mac-card flex flex-col justify-between">
          <div>
            <div className="p-3 rounded-xl bg-sky-50 text-sky-700 w-fit border border-sky-200/80 shadow-xs">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-3.5">Raw Sensor Telemetry</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Contains continuous 1-second sampled soil moisture readings, raw ADC levels, HC-SR04 ultrasonic tank levels, and hardware source tags.
            </p>
            <div className="mt-3.5 p-3 rounded-xl bg-sky-50/70 border border-sky-100 font-mono text-[11px] text-slate-600">
              Columns: timestamp, soilMoisture, rawADC, tankLevel, tankStatus, sensorId, source
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-sky-100">
            <a
              href={api.getSensorCsvUrl()}
              download="terrawave_sensor_data.csv"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 shadow-md shadow-sky-500/20 transition-all duration-200 active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Download Sensors CSV</span>
            </a>
          </div>
        </div>

        {/* Card 2: Irrigation History */}
        <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm mac-card flex flex-col justify-between">
          <div>
            <div className="p-3 rounded-xl bg-blue-50 text-blue-700 w-fit border border-blue-200/80 shadow-xs">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-3.5">Irrigation History &amp; Feedback</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Historical irrigation events with pre/post moisture measurements, AI predicted runtime, actual runtime, moisture gain, and prediction error.
            </p>
            <div className="mt-3.5 p-3 rounded-xl bg-blue-50/70 border border-blue-100 font-mono text-[11px] text-slate-600">
              Columns: timestamp, triggerType, moistureBefore, targetMoisture, predictedRuntime, actualRuntime, moistureGain, predictionError
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-sky-100">
            <a
              href={api.getIrrigationCsvUrl()}
              download="terrawave_irrigation_history.csv"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all duration-200 active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Download Irrigation CSV</span>
            </a>
          </div>
        </div>

        {/* Card 3: ML Training Dataset */}
        <div className="rounded-2xl border border-sky-100 bg-white/85 p-6 glass-panel shadow-sm mac-card flex flex-col justify-between">
          <div>
            <div className="p-3 rounded-xl bg-teal-50 text-teal-700 w-fit border border-teal-200/80 shadow-xs">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-3.5">ML Training Dataset</h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              The full structured dataset used by the Python FastAPI microservice to train the Random Forest and comparative regression models.
            </p>
            <div className="mt-3.5 p-3 rounded-xl bg-teal-50/70 border border-teal-100 font-mono text-[11px] text-slate-600">
              Columns: initialMoisture, targetMoisture, moistureDeficit, pumpRuntimeSeconds, finalMoisture, moistureIncrease, soilCondition
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-sky-100">
            <a
              href={api.getTrainingCsvUrl()}
              download="terrawave_ml_training_dataset.csv"
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 transition-all duration-200 active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Download Training CSV</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
