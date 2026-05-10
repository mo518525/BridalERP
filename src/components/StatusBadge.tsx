import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import type { DressStatus, TransactionStatus, ReminderPriority } from '../types';

const STATUS_STYLES: Record<string, { cls: string; bg: string }> = {
  available:  { cls: 'text-emerald-300 border-emerald-400/30', bg: 'rgba(16,185,129,0.12)' },
  reserved:   { cls: 'text-amber-300 border-amber-400/30',     bg: 'rgba(245,158,11,0.12)' },
  rented:     { cls: 'text-blue-300 border-blue-400/30',       bg: 'rgba(59,130,246,0.12)' },
  cleaning:   { cls: 'text-purple-300 border-purple-400/30',   bg: 'rgba(168,85,247,0.12)' },
  sold:       { cls: 'text-red-300 border-red-400/30',         bg: 'rgba(239,68,68,0.12)' },
  active:     { cls: 'text-blue-300 border-blue-400/30',       bg: 'rgba(59,130,246,0.12)' },
  completed:  { cls: 'text-emerald-300 border-emerald-400/30', bg: 'rgba(16,185,129,0.12)' },
  cancelled:  { cls: 'text-white/35 border-white/15',          bg: 'rgba(255,255,255,0.06)' },
  pending:    { cls: 'text-amber-300 border-amber-400/30',     bg: 'rgba(245,158,11,0.12)' },
  done:       { cls: 'text-emerald-300 border-emerald-400/30', bg: 'rgba(16,185,129,0.12)' },
  low:        { cls: 'text-white/40 border-white/15',          bg: 'rgba(255,255,255,0.06)' },
  normal:     { cls: 'text-blue-300 border-blue-400/30',       bg: 'rgba(59,130,246,0.12)' },
  high:       { cls: 'text-orange-300 border-orange-400/30',   bg: 'rgba(249,115,22,0.12)' },
  urgent:     { cls: 'text-red-300 border-red-400/30 animate-pulse', bg: 'rgba(239,68,68,0.15)' },
};

const DEFAULT_STYLE = { cls: 'text-white/40 border-white/15', bg: 'rgba(255,255,255,0.06)' };

interface Props {
  status: DressStatus | TransactionStatus | ReminderPriority | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: Props) {
  const { t } = useTranslation();
  const label = t(`status.${status}`, { defaultValue: status });
  const s = STATUS_STYLES[status] ?? DEFAULT_STYLE;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border backdrop-blur-xl',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        s.cls,
        className
      )}
      style={{ background: s.bg }}
    >
      {label}
    </span>
  );
}
