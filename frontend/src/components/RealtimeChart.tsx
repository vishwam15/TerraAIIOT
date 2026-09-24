import React from 'react';
import {
  ResponsiveContainer,
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
    <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-wide flex items-center gap-2">
            <span>Soil Moisture Telemetry vs. Time</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous 1-second telemetry with AI automated irrigation thresholds
          </p>
        </div>

        {/* Legend pills */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-sky-50 px-2 py-1 rounded-md border border-sky-200">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600"></span>
            <span className="text-sky-800 font-semibold">Moisture (%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-amber-500"></span>
            <span className="text-amber-700 font-semibold">Auto-Start ({startThreshold}%)</span>
          </div>
          <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-blue-600"></span>
            <span className="text-blue-700 font-semibold">Target/Stop ({stopThreshold}%)</span>
          </div>
        </div>
      </div>

      <div className="h-72 sm:h-80 w-full pt-4">
        {formattedData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-sm">
            Waiting for live telemetry stream...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={formattedData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="moistureGradientBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="timeStr"
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickMargin={8}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#94a3b8"
                tick={{ fontSize: 11, fill: '#64748b' }}
                ticks={[0, 20, 30, 40, 60, 80, 100]}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#bae6fd',
                  borderRadius: '0.75rem',
                  fontSize: '0.75rem',
                  color: '#0f172a',
                  boxShadow: '0 10px 25px -5px rgba(2, 132, 199, 0.15)'
                }}
                labelStyle={{ color: '#475569', marginBottom: '0.25rem', fontWeight: 600 }}
                formatter={(value: any) => [`${value}%`, 'Soil Moisture']}
              />
              
              {/* 30% Auto-Start Trigger Line (Hysteresis low bound) */}
              <ReferenceLine
                y={startThreshold}
                stroke="#d97706"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Trigger: ${startThreshold}%`,
                  position: 'insideBottomRight',
                  fill: '#d97706',
                  fontSize: 11,
                  fontWeight: 700
                }}
              />

              {/* 80% Auto-Stop & Target Line (Hysteresis high bound) */}
              <ReferenceLine
                y={stopThreshold}
                stroke="#2563eb"
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: `Target: ${stopThreshold}%`,
                  position: 'insideTopRight',
                  fill: '#2563eb',
                  fontSize: 11,
                  fontWeight: 700
                }}
              />

              <Area
                type="monotone"
                dataKey="soilMoisture"
                fill="url(#moistureGradientBlue)"
                stroke="transparent"
              />

              <Line
                type="monotone"
                dataKey="soilMoisture"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
