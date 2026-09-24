import React from 'react';
import { MoistureGauge } from '../components/MoistureGauge';
import { TankLevelGauge } from '../components/TankLevelGauge';
import { SensorReading } from '../types';
import { Activity } from 'lucide-react';

interface LiveMonitoringPageProps {
  currentMoisture: number;
  rawADC: number;
  tankLevel: number;
  sensorHistory: SensorReading[];
  source: string;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  currentMoisture,
  rawADC,
  tankLevel,
  sensorHistory,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Activity className="h-5 w-5 text-sky-600" />
          <span>Real-Time Sensor Telemetry &amp; Physical Gauges</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          High-frequency 1-second sampling from ESP32-S3 analog ADC and HC-SR04 ultrasonic sensors
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MoistureGauge
          moisture={currentMoisture}
          rawADC={rawADC}
          target={80}
          autoStartThreshold={30}
        />
        <TankLevelGauge tankLevel={tankLevel} />
      </div>

      {/* Live Raw Sensor Stream Table */}
      <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-wider uppercase">
              Recent Telemetry Buffer (1s Ingestion)
            </h3>
            <p className="text-xs text-slate-500">Incoming packets persisted to MongoDB sensor_readings</p>
          </div>
          <span className="text-xs font-mono text-sky-700 font-bold flex items-center gap-1.5 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-ping"></span>
            Streaming Live
          </span>
        </div>

        <div className="overflow-x-auto mt-4 max-h-96 custom-scrollbar">
          <table className="w-full text-left text-xs">
            <thead className="bg-sky-50/70 text-slate-700 font-mono uppercase text-[10px] sticky top-0 border-b border-sky-100">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Sensor ID</th>
                <th className="py-2.5 px-3">Soil Moisture</th>
                <th className="py-2.5 px-3">Raw ADC (GPIO 1)</th>
                <th className="py-2.5 px-3">Tank Level</th>
                <th className="py-2.5 px-3">Ultrasonic Echo</th>
                <th className="py-2.5 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {sensorHistory.slice(-20).reverse().map((reading, idx) => (
                <tr key={idx} className="hover:bg-sky-50/50 transition-colors">
                  <td className="py-2.5 px-3 text-slate-500">
                    {new Date(reading.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">
                    {reading.sensorId}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-sky-700">
                      {Number(reading.soilMoisture).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500">
                    {reading.rawADC || 'N/A'}
                  </td>
                  <td className="py-2.5 px-3">
                    {reading.tankLevel === -1 ? (
                      <span className="text-amber-700 font-bold">NO ECHO</span>
                    ) : (
                      <span className="text-blue-700 font-semibold">{reading.tankLevel}%</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    {reading.tankLevel === -1 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        Timeout (-1)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">
                        ECHO OK
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      reading.source === 'LIVE DATA' || reading.source === 'esp32'
                        ? 'bg-sky-100 text-sky-800 border border-sky-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {reading.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
