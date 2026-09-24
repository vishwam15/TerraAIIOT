import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { PumpEvent } from '../types';
import { Clock, AlertOctagon, CheckCircle2 } from 'lucide-react';

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<PumpEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.getPumpEvents(60);
      if (res.success) {
        setEvents(res.data);
      }
    } catch (e) {
      console.error('Error fetching pump events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Clock className="h-5 w-5 text-sky-600" />
          <span>Actuator Event Timeline (Section 24)</span>
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Chronological event logs showing transitions, AI runtime triggers, and mutual exclusion actions
        </p>
      </div>

      <div className="rounded-xl border border-sky-100 bg-white p-5 glass-panel shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            Loading actuator timeline...
          </div>
        ) : events.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs font-mono">
            No pump events recorded yet. Actuate Pump 1 or Pump 2 to generate events.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-sky-200">
            {events.map((evt) => {
              const isON = evt.action === 'ON';
              const isPump2 = evt.pumpId === 'PUMP_2';
              const isMutualExclusion = evt.reason === 'mutual_exclusion_cutoff';
              const isAIComplete = evt.reason === 'ai_runtime_complete';

              return (
                <div key={evt._id} className="relative flex items-start gap-4">
                  {/* Indicator Dot */}
                  <span
                    className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${
                      isMutualExclusion
                        ? 'bg-amber-500 ring-4 ring-amber-100'
                        : isON
                          ? isPump2 ? 'bg-sky-500 ring-4 ring-sky-100' : 'bg-blue-600 ring-4 ring-blue-100'
                          : 'bg-slate-300'
                    }`}
                  />

                  {/* Card Content */}
                  <div className="flex-1 p-3.5 rounded-xl border border-sky-100 bg-sky-50/50 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[11px]">
                          {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className="text-slate-300">•</span>
                        <strong className={isPump2 ? 'text-sky-700' : 'text-blue-700'}>
                          {evt.pumpId === 'PUMP_2' ? 'Pump 2 (Irrigation)' : 'Pump 1 (Tank Fill)'}
                        </strong>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isON ? 'bg-sky-600 text-white shadow-sm' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {evt.action}
                        </span>
                      </div>

                      <p className="text-slate-600 mt-1 text-[11px]">
                        Reason: <span className="text-slate-900 font-semibold">{evt.reason}</span>
                        {evt.soilMoistureAtEvent !== undefined && (
                          <span className="ml-3 text-slate-600">
                            Soil Moisture: <strong className="text-sky-700">{evt.soilMoistureAtEvent}%</strong>
                          </span>
                        )}
                        {evt.durationSeconds !== undefined && evt.durationSeconds > 0 && (
                          <span className="ml-3 text-blue-700 font-bold">
                            Runtime: {evt.durationSeconds}s
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isMutualExclusion && (
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300 flex items-center gap-1">
                          <AlertOctagon className="h-3 w-3 text-amber-600" /> MUTUAL EXCLUSION CUTOFF
                        </span>
                      )}
                      {isAIComplete && (
                        <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-300 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-sky-600" /> AI RUNTIME EXECUTED
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
