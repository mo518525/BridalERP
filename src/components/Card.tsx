import { cn } from '../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glass?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  onClick?: () => void;
  hover?: boolean;
}

export function Card({ children, className, padding = 'md', onClick, hover = false }: CardProps) {
  const paddings = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' };
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border transition-all duration-300',
        hover && 'cursor-pointer hover:-translate-y-1 hover:border-gold-400/30',
        paddings[padding],
        className
      )}
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px) saturate(148%)',
        WebkitBackdropFilter: 'blur(16px) saturate(148%)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 18px 38px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)',
      }}
    >
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  color?: 'gold' | 'blue' | 'green' | 'red' | 'purple';
  hidden?: boolean;
}

const COLOR_MAP = {
  gold:   { icon: 'bg-gold-500/20 text-gold-300',     glow: 'rgba(201,168,76,0.20)' },
  blue:   { icon: 'bg-blue-500/20 text-blue-300',     glow: 'rgba(59,130,246,0.18)' },
  green:  { icon: 'bg-emerald-500/20 text-emerald-300', glow: 'rgba(16,185,129,0.18)' },
  red:    { icon: 'bg-red-500/20 text-red-300',       glow: 'rgba(239,68,68,0.18)' },
  purple: { icon: 'bg-purple-500/20 text-purple-300', glow: 'rgba(168,85,247,0.18)' },
};

export function StatCard({ title, value, subtitle, icon, color = 'gold', hidden }: StatCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div
      className="rounded-2xl p-5 border transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px) saturate(148%)',
        WebkitBackdropFilter: 'blur(16px) saturate(148%)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: `0 18px 38px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(255,255,255,0.04), 0 0 14px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-white/45 uppercase tracking-wide">{title}</p>
          <p className={cn('text-2xl font-bold', hidden ? 'text-white/20' : 'text-white/92')}>
            {hidden ? '•••' : value}
          </p>
          {subtitle && <p className="text-xs text-white/35">{subtitle}</p>}
        </div>
        <div className={cn('p-3 rounded-xl', c.icon)}>
          {icon}
        </div>
      </div>
    </div>
  );
}

