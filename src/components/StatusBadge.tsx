import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import { useUIStore } from '../store/uiStore';
import type { DressStatus, TransactionStatus, ReminderPriority } from '../types';

interface StatusDef {
  darkColor: string;
  lightColor: string;
  darkBorder: string;
  lightBorder: string;
  bg: string;
}

const STATUS_DEFS: Record<string, StatusDef> = {
  available: { darkColor: '#6ee7b7', lightColor: '#059669', darkBorder: 'rgba(52,211,153,0.30)', lightBorder: 'rgba(5,150,105,0.25)',   bg: 'rgba(16,185,129,0.10)' },
  reserved:  { darkColor: '#fcd34d', lightColor: '#b45309', darkBorder: 'rgba(252,211,77,0.30)',  lightBorder: 'rgba(180,83,9,0.25)',    bg: 'rgba(245,158,11,0.10)' },
  rented:    { darkColor: '#93c5fd', lightColor: '#1d4ed8', darkBorder: 'rgba(147,197,253,0.30)', lightBorder: 'rgba(29,78,216,0.25)',   bg: 'rgba(59,130,246,0.10)' },
  cleaning:  { darkColor: '#d8b4fe', lightColor: '#7c3aed', darkBorder: 'rgba(216,180,254,0.30)', lightBorder: 'rgba(124,58,237,0.25)',  bg: 'rgba(168,85,247,0.10)' },
  sold:      { darkColor: '#fca5a5', lightColor: '#dc2626', darkBorder: 'rgba(252,165,165,0.30)', lightBorder: 'rgba(220,38,38,0.25)',   bg: 'rgba(239,68,68,0.10)'  },
  active:    { darkColor: '#93c5fd', lightColor: '#1d4ed8', darkBorder: 'rgba(147,197,253,0.30)', lightBorder: 'rgba(29,78,216,0.25)',   bg: 'rgba(59,130,246,0.10)'  },
  completed: { darkColor: '#6ee7b7', lightColor: '#059669', darkBorder: 'rgba(52,211,153,0.30)',  lightBorder: 'rgba(5,150,105,0.25)',   bg: 'rgba(16,185,129,0.10)'  },
  cancelled: { darkColor: 'rgba(255,255,255,0.35)', lightColor: 'rgba(60,42,24,0.55)', darkBorder: 'rgba(255,255,255,0.12)', lightBorder: 'rgba(60,42,24,0.15)', bg: 'rgba(60,42,24,0.05)' },
  pending:   { darkColor: '#fcd34d', lightColor: '#b45309', darkBorder: 'rgba(252,211,77,0.30)',  lightBorder: 'rgba(180,83,9,0.25)',    bg: 'rgba(245,158,11,0.10)' },
  done:      { darkColor: '#6ee7b7', lightColor: '#059669', darkBorder: 'rgba(52,211,153,0.30)',  lightBorder: 'rgba(5,150,105,0.25)',   bg: 'rgba(16,185,129,0.10)' },
  low:       { darkColor: 'rgba(255,255,255,0.40)', lightColor: 'rgba(60,42,24,0.55)', darkBorder: 'rgba(255,255,255,0.12)', lightBorder: 'rgba(60,42,24,0.15)', bg: 'rgba(60,42,24,0.05)' },
  normal:    { darkColor: '#93c5fd', lightColor: '#1d4ed8', darkBorder: 'rgba(147,197,253,0.30)', lightBorder: 'rgba(29,78,216,0.25)',   bg: 'rgba(59,130,246,0.10)' },
  high:      { darkColor: '#fdba74', lightColor: '#c2410c', darkBorder: 'rgba(253,186,116,0.30)', lightBorder: 'rgba(194,65,12,0.25)',   bg: 'rgba(249,115,22,0.10)' },
  urgent:    { darkColor: '#fca5a5', lightColor: '#dc2626', darkBorder: 'rgba(252,165,165,0.30)', lightBorder: 'rgba(220,38,38,0.25)',   bg: 'rgba(239,68,68,0.12)'  },
};

const DEFAULT_DEF: StatusDef = {
  darkColor: 'rgba(255,255,255,0.40)', lightColor: 'rgba(60,42,24,0.55)',
  darkBorder: 'rgba(255,255,255,0.12)', lightBorder: 'rgba(60,42,24,0.15)',
  bg: 'rgba(60,42,24,0.05)',
};

interface Props {
  status: DressStatus | TransactionStatus | ReminderPriority | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: Props) {
  const { t } = useTranslation();
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const label = t(`status.${status}`, { defaultValue: status });
  const d = STATUS_DEFS[status] ?? DEFAULT_DEF;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium backdrop-blur-xl',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        status === 'urgent' && isDark ? 'animate-pulse' : '',
        className,
      )}
      style={{
        background: d.bg,
        color: isDark ? d.darkColor : d.lightColor,
        border: `1px solid ${isDark ? d.darkBorder : d.lightBorder}`,
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      {label}
    </span>
  );
}
