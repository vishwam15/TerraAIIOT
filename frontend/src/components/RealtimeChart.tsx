import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';

interface RealtimeChartProps {
  data: Array<{
    timestamp: string;
    soilMoisture: number;
    tankLevel?: number;
    rawADC?: number;
  }>;
  startThreshold?: number; // default 30
  stopThreshold?: number;  // default 80
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({
  data,
  startThreshold = 30,
  stopThreshold = 80
}) => {
  // Format timestamps to local time HH:mm:ss
  const formattedData = data.map((d) => {
    const time = new Date(d.timestamp);
    const timeStr = !isNaN(time.getTime())
      ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.timestamp;
    return {
      ...d,
      timeStr,
      soilMoisture: Number(d.soilMoisture)
    };
  });

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 glass-panel">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
            <span>Soil Moisture Telemetry vs. Time</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous 1-second telemetry with AI automated irrigation thresholds
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-slate-300">Moisture (%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-400"></span>
            <span className="text-amber-400">Auto-Start ({startThreshold}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-cyan-400"></span>
            <span className="text-cyan-400">Target/Stop ({stopThreshold}%)</span>
          </div>
        </div>
      </div>

      <div className="h-72 sm:h-80 w-full pt-4">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            Waiting for live telemetry stream...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="moistureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timeStr"
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#64748b"
                tick={{ fontSize: 11 }}
                ticks={[0, 20, 30, 40, 60, 80, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '0.5rem',
                  fontSize: '0.75rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}
                labelStyle={{ color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}
                formatter={(value: any) => [`${value}%`, 'Soil Moisture']}
              />
              
              {/* 30% Auto-Start Trigger Line (Hysteresis low bound) */}
              <ReferenceLine
                y={startThreshold}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Trigger: ${startThreshold}%`,
                  position: 'insideBottomRight',
                  fill: '#f59e0b',
                  fontSize: 10,
                  fontWeight: 600
                }}
              />

              {/* 80% Auto-Stop & Target Line (Hysteresis high bound) */}
              <ReferenceLine
                y={stopThreshold}
                stroke="#06b6d4"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Target: ${stopThreshold}%`,
                  position: 'insideTopRight',
                  fill: '#06b6d4',
                  fontSize: 10,
                  fontWeight: 600
                }}
              />

              <Area
                type="monotone"
                dataKey="soilMoisture"
                fill="url(#moistureGradient)"
                stroke="transparent"
              />

              <Line
                type="monotone"
                dataKey="soilMoisture"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
