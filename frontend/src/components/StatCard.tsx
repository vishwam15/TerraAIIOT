import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme: 'emerald' | 'cyan' | 'blue' | 'amber' | 'rose' | 'purple';
  statusBadge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  colorScheme,
  statusBadge,
  highlight = false
}) => {
  const colorStyles = {
    emerald: {
      bg: 'from-emerald-50/50 via-white to-white border-emerald-100',
      iconBg: 'bg-emerald-100 text-emerald-700',
      valueColor: 'text-slate-900'
    },
    cyan: {
      bg: 'from-sky-50/60 via-white to-white border-sky-100',
      iconBg: 'bg-sky-100 text-sky-700',
      valueColor: 'text-slate-900'
    },
    blue: {
      bg: 'from-blue-50/60 via-white to-white border-blue-100',
      iconBg: 'bg-blue-100 text-blue-700',
      valueColor: 'text-slate-900'
    },
    amber: {
      bg: 'from-amber-50/50 via-white to-white border-amber-100',
      iconBg: 'bg-amber-100 text-amber-700',
      valueColor: 'text-slate-900'
    },
    rose: {
      bg: 'from-rose-50/50 via-white to-white border-rose-100',
      iconBg: 'bg-rose-100 text-rose-700',
      valueColor: 'text-slate-900'
    },
    purple: {
      bg: 'from-indigo-50/50 via-white to-white border-indigo-100',
      iconBg: 'bg-indigo-100 text-indigo-700',
      valueColor: 'text-slate-900'
    }
  };

  const badgeStyles = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  const scheme = colorStyles[colorScheme];

  return (
    <div className={`rounded-2xl border p-4 bg-gradient-to-b ${scheme.bg} glass-panel relative overflow-hidden transition-all duration-300 mac-card hover:-translate-y-1 hover:shadow-lg hover:shadow-sky-500/10 ${
      highlight ? 'ring-2 ring-sky-400 shadow-md shadow-sky-500/15' : ''
    }`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate">
          {title}
        </span>
        <div className={`p-2 rounded-xl shrink-0 ${scheme.iconBg} shadow-xs`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5 flex-wrap">
        <span className={`text-2xl lg:text-3xl font-extrabold ${scheme.valueColor} tracking-tight font-mono`}>
          {value}
        </span>
        {unit && <span className="text-sm font-bold text-slate-500">{unit}</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs gap-2 pt-1 border-t border-sky-100/50">
        <span className="text-slate-500 font-mono text-[11px] truncate">{subtitle}</span>
        {statusBadge && (
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider shrink-0 font-mono ${badgeStyles[statusBadge.variant]}`}>
            {statusBadge.text}
          </span>
        )}
      </div>
    </div>
  );
};
