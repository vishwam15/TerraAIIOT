import React from 'react';
import { LucideIcon } from 'lucide-react';

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
      bg: 'from-emerald-500/10 to-transparent border-emerald-500/20 text-emerald-400',
      iconBg: 'bg-emerald-500/20 text-emerald-400'
    },
    cyan: {
      bg: 'from-cyan-500/10 to-transparent border-cyan-500/20 text-cyan-400',
      iconBg: 'bg-cyan-500/20 text-cyan-400'
    },
    blue: {
      bg: 'from-blue-500/10 to-transparent border-blue-500/20 text-blue-400',
      iconBg: 'bg-blue-500/20 text-blue-400'
    },
    amber: {
      bg: 'from-amber-500/10 to-transparent border-amber-500/20 text-amber-400',
      iconBg: 'bg-amber-500/20 text-amber-400'
    },
    rose: {
      bg: 'from-rose-500/10 to-transparent border-rose-500/20 text-rose-400',
      iconBg: 'bg-rose-500/20 text-rose-400'
    },
    purple: {
      bg: 'from-purple-500/10 to-transparent border-purple-500/20 text-purple-400',
      iconBg: 'bg-purple-500/20 text-purple-400'
    }
  };

  const badgeStyles = {
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    danger: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    info: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    neutral: 'bg-slate-700 text-slate-300 border-slate-600'
  };

  const scheme = colorStyles[colorScheme];

  return (
    <div className={`rounded-xl border p-4 bg-gradient-to-b ${scheme.bg} glass-panel relative overflow-hidden transition-all duration-300 hover:border-slate-600 ${
      highlight ? 'ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/40' : ''
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className={`p-2 rounded-lg ${scheme.iconBg}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
          {value}
        </span>
        {unit && <span className="text-sm font-semibold text-slate-400">{unit}</span>}
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs">
        <span className="text-slate-400 font-mono">{subtitle}</span>
        {statusBadge && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${badgeStyles[statusBadge.variant]}`}>
            {statusBadge.text}
          </span>
        )}
      </div>
    </div>
  );
};
