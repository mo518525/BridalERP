import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { cn } from '../utils/cn';

const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS   = ['ح','ن','ث','ر','خ','ج','س']; // Sun → Sat

export interface GlassDatePickerProps {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  containerClass?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  className?: string;
  style?: React.CSSProperties;
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplay(s: string): string {
  const d = parseDate(s);
  if (!d) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function DayCell({ date, selected, isToday, otherMonth, disabled, isDark, onSelect, onHover, hovered }: {
  date: Date; selected: boolean; isToday: boolean; otherMonth: boolean;
  disabled: boolean; isDark: boolean; onSelect: () => void;
  onHover: (v: boolean) => void; hovered: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      disabled={disabled}
      style={{
        height: 32,
        borderRadius: 9,
        fontSize: '0.8rem',
        fontFamily: 'Cairo, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: isToday && !selected
          ? '1px solid rgba(201,168,76,0.55)'
          : '1px solid transparent',
        background: selected
          ? 'linear-gradient(135deg, rgba(201,168,76,0.90), rgba(180,145,55,0.90))'
          : hovered && !disabled && !otherMonth
            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)')
            : 'transparent',
        boxShadow: selected
          ? '0 4px 10px rgba(201,168,76,0.28), inset 0 1px 0 rgba(255,255,255,0.22)'
          : 'none',
        color: selected
          ? '#fff'
          : otherMonth || disabled
            ? (isDark ? 'rgba(255,255,255,0.18)' : 'rgba(60,42,24,0.22)')
            : isToday
              ? '#c9a84c'
              : (isDark ? 'rgba(255,255,255,0.84)' : 'rgba(55,38,18,0.86)'),
        fontWeight: selected || isToday ? 700 : 400,
        transition: 'background 0.12s, box-shadow 0.12s',
      }}
    >
      {date.getDate()}
    </button>
  );
}

export function GlassDatePicker({
  value, onChange, label, placeholder, error, required,
  containerClass, disabled, min, max,
}: GlassDatePickerProps) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const btnRef = useRef<HTMLButtonElement>(null);

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(todayDate);

  const computePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const top = spaceBelow < 320 ? r.top - 4 : r.bottom + 4;
    setPos({ top, left: r.left, width: Math.max(r.width, 290) });
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    computePos();
    const d = parseDate(value);
    setViewYear(d?.getFullYear() ?? todayDate.getFullYear());
    setViewMonth(d?.getMonth() ?? todayDate.getMonth());
    setOpen(true);
  }, [disabled, value, computePos]);

  const selected = parseDate(value);
  const [viewYear, setViewYear] = useState(selected?.getFullYear() ?? todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.getMonth() ?? todayDate.getMonth());

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close, true);
    return () => document.removeEventListener('mousedown', close, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', computePos, true);
    window.addEventListener('resize', computePos);
    return () => { window.removeEventListener('scroll', computePos, true); window.removeEventListener('resize', computePos); };
  }, [open, computePos]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  // Build 6-row grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();
  const cells: Date[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push(new Date(viewYear, viewMonth - 1, daysInPrev - i));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length < 42) cells.push(new Date(viewYear, viewMonth + 1, cells.length - firstDay - daysInMonth + 1));

  const minDate = parseDate(min ?? '');
  const maxDate = parseDate(max ?? '');
  const isOff = (d: Date) => (minDate && d < minDate) || (maxDate && d > maxDate) || false;

  const selectDate = (d: Date) => { if (isOff(d)) return; onChange(toDateStr(d)); setOpen(false); };

  const navBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)',
    color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.55)',
  };

  const triggerStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: error
      ? '1px solid rgba(239,68,68,0.60)'
      : open
        ? '1px solid rgba(201,168,76,0.55)'
        : isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(60,42,24,0.12)',
    borderRadius: 12,
    color: value
      ? (isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)')
      : (isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.35)'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'border-color 0.15s',
  };

  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    width: pos.width,
    zIndex: 99999,
    background: isDark
      ? 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.05) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.86) 0%, rgba(255,255,255,0.72) 100%)',
    backdropFilter: 'blur(28px) saturate(170%)',
    WebkitBackdropFilter: 'blur(28px) saturate(170%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.82)',
    borderRadius: 20,
    boxShadow: isDark
      ? '0 10px 22px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 8px 18px rgba(100,80,40,0.08), inset 0 1px 0 rgba(255,255,255,0.90)',
    padding: '14px 12px 10px',
  };

  return (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && (
        <label style={{
          fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
          color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)',
        }}>
          {label}{required && <span style={{ color: '#f87171', marginInlineStart: 4 }}>*</span>}
        </label>
      )}

      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openPicker()}
        className="flex items-center justify-between w-full h-10 px-3"
        style={triggerStyle}
        disabled={disabled}
      >
        <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.875rem' }}>
          {value ? formatDisplay(value) : (placeholder ?? 'اختر تاريخاً')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {value && !disabled && (
            <span
              onMouseDown={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
              style={{ color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.30)', display: 'flex', cursor: 'pointer' }}
            >
              <X size={12} />
            </span>
          )}
          <Calendar size={14} style={{ color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.38)', flexShrink: 0 }} />
        </div>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              style={{ ...popupStyle, transformOrigin: 'top' }}
              onMouseDown={e => e.stopPropagation()}
            >
              {/* Month navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <button type="button" onClick={prevMonth} style={navBtnStyle}>
                  <ChevronRight size={13} />
                </button>
                <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.9rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.90)' : 'rgba(55,38,18,0.90)' }}>
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button type="button" onClick={nextMonth} style={navBtnStyle}>
                  <ChevronLeft size={13} />
                </button>
              </div>

              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.68rem', fontFamily: 'Cairo, sans-serif', fontWeight: 600, color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(60,42,24,0.30)', paddingBottom: 2 }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                {cells.map((cell, i) => (
                  <DayCell
                    key={i}
                    date={cell}
                    selected={toDateStr(cell) === value}
                    isToday={toDateStr(cell) === todayStr}
                    otherMonth={cell.getMonth() !== viewMonth}
                    disabled={!!isOff(cell)}
                    isDark={isDark}
                    onSelect={() => selectDate(cell)}
                    onHover={v => setHoveredIdx(v ? i : -1)}
                    hovered={hoveredIdx === i}
                  />
                ))}
              </div>

              {/* Today shortcut */}
              <button
                type="button"
                onClick={() => selectDate(todayDate)}
                style={{
                  marginTop: 10, width: '100%', padding: '5px 0', borderRadius: 10,
                  fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem',
                  color: isDark ? 'rgba(201,168,76,0.75)' : 'rgba(160,128,40,0.80)',
                  border: isDark ? '1px solid rgba(201,168,76,0.20)' : '1px solid rgba(201,168,76,0.22)',
                  background: isDark ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.07)',
                  cursor: 'pointer',
                }}
              >
                اليوم
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {error && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>{error}</p>}
    </div>
  );
}
