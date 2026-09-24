import React from 'react';
import { api } from '../services/api';
import { Download, Database, Activity, History } from 'lucide-react';

export const ExportPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Download className="h-5 w-5 text-sky-600" />
          <span>Backend Data Export Pipeline (Section 26)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Export full-fidelity datasets directly from MongoDB collections via backend CSV streaming endpoints
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Sensor Data */}
        <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div>
            <div className="p-3 rounded-xl bg-sky-100 text-sky-700 w-fit">
              <Activity className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-3">Raw Sensor Telemetry</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Contains continuous 1-second sampled soil moisture readings, raw ADC levels, HC-SR04 ultrasonic tank levels, and hardware source tags.
            </p>
            <div className="mt-3 p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 text-[11px] font-mono text-slate-600">
              Columns: timestamp, soilMoisture, rawADC, tankLevel, tankStatus, sensorId, source
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <a
              href={api.getSensorCsvUrl()}
              download="terrawave_sensor_data.csv"
              className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download Sensors CSV</span>
            </a>
          </div>
        </div>

        {/* Card 2: Irrigation History */}
        <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div>
            <div className="p-3 rounded-xl bg-blue-100 text-blue-700 w-fit">
              <History className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-3">Irrigation History &amp; Feedback</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Historical irrigation events with pre/post moisture measurements, AI predicted runtime, actual runtime, moisture gain, and prediction error.
            </p>
            <div className="mt-3 p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 text-[11px] font-mono text-slate-600">
              Columns: timestamp, triggerType, moistureBefore, targetMoisture, predictedRuntime, actualRuntime, moistureAfter, moistureGain, gainPerSecond, predictionError
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <a
              href={api.getIrrigationCsvUrl()}
              download="terrawave_irrigation_history.csv"
              className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all"
            >
              <Download className="h-4 w-4" />
              <span>Download Irrigation CSV</span>
            </a>
          </div>
        </div>

        {/* Card 3: ML Training Dataset */}
        <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel flex flex-col justify-between shadow-sm">
          <div>
            <div className="p-3 rounded-xl bg-indigo-100 text-indigo-700 w-fit">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-3">ML Training Dataset</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              The full structured dataset used by the Python FastAPI microservice to train the Random Forest and comparative regression models.
            </p>
            <div className="mt-3 p-2.5 rounded-lg bg-sky-50/60 border border-sky-100 text-[11px] font-mono text-slate-600">
              Columns: initialMoisture, targetMoisture, moistureDeficit, pumpRuntimeSeconds, finalMoisture, moistureIncrease, soilCondition, source
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <a
              href={api.getTrainingCsvUrl()}
              download="terrawave_ml_training_dataset.csv"
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono tracking-wider flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
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
