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

const POPUP_H = 300;
const POPUP_W = 270;

export function GlassDatePicker({
  value, onChange, label, placeholder, error, required,
  containerClass, disabled, min, max,
}: GlassDatePickerProps) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, above: false });
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const btnRef  = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  const todayStr = toDateStr(todayDate);

  const computePos = useCallback(() => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const w = Math.max(r.width, POPUP_W);
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < POPUP_H + 16 && r.top > POPUP_H + 16;
    // Clamp horizontal so popup never overflows screen
    let left = r.left;
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
    const top = above ? r.top - POPUP_H - 6 : r.bottom + 4;
    setPos({ top, left, width: w, above });
  }, []);

  const openPicker = useCallback(() => {
    if (disabled) return;
    computePos();
    const d = parseDate(value);
    setViewYear(d?.getFullYear() ?? todayDate.getFullYear());
    setViewMonth(d?.getMonth() ?? todayDate.getMonth());
    setOpen(true);
  }, [disabled, value, computePos]);

  const [viewYear,  setViewYear]  = useState(() => parseDate(value)?.getFullYear()  ?? todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseDate(value)?.getMonth()    ?? todayDate.getMonth());

  // Close on outside click — exclude both trigger and popup
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const inBtn   = btnRef.current?.contains(e.target as Node);
      const inPopup = popupRef.current?.contains(e.target as Node);
      if (!inBtn && !inPopup) setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    return () => document.removeEventListener('mousedown', handler, true);
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
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev  = new Date(viewYear, viewMonth, 0).getDate();
  const cells: Date[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push(new Date(viewYear, viewMonth - 1, daysInPrev - i));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length < 42) cells.push(new Date(viewYear, viewMonth + 1, cells.length - firstDay - daysInMonth + 1));

  const minDate = parseDate(min ?? '');
  const maxDate = parseDate(max ?? '');
  const isOff   = (d: Date) => (minDate && d < minDate) || (maxDate && d > maxDate) || false;

  const selectDate = (d: Date) => { if (isOff(d)) return; onChange(toDateStr(d)); setOpen(false); };

  // ─── styles (match GlassSelect exactly) ──────────────────────────────────
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const textMuted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.38)';

  const navBtnSt: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.50)',
    color: textMuted,
    flexShrink: 0,
  };

  const triggerSt: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: error
      ? '1px solid rgba(239,68,68,0.60)'
      : open
        ? '1px solid rgba(201,168,76,0.55)'
        : isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(60,42,24,0.12)',
    borderRadius: 12,
    color: value ? textMain : textMuted,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'border-color 0.15s',
  };

  // Same glass recipe as GlassSelect's dropdownStyle
  const popupSt: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    width: pos.width,
    zIndex: 99999,
    background: isDark
      ? 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.045) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,255,255,0.68) 100%)',
    backdropFilter: 'blur(26px) saturate(165%)',
    WebkitBackdropFilter: 'blur(26px) saturate(165%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.82)',
    borderRadius: 18,
    boxShadow: isDark
      ? '0 8px 18px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.08)'
      : '0 6px 14px rgba(122,122,122,0.05), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -1px 0 rgba(214,214,214,0.28)',
    padding: '10px 10px 8px',
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
        style={triggerSt}
        disabled={disabled}
      >
        <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.875rem' }}>
          {value ? formatDisplay(value) : (placeholder ?? 'اختر تاريخاً')}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {value && !disabled && (
            <span
              onMouseDown={e => { e.stopPropagation(); onChange(''); setOpen(false); }}
              style={{ color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.30)', display: 'flex', cursor: 'pointer' }}
            >
              <X size={11} />
            </span>
          )}
          <Calendar size={13} style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,42,24,0.35)', flexShrink: 0 }} />
        </div>
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, y: pos.above ? 6 : -6, scaleY: 0.96 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, scaleY: 0.96 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{ ...popupSt, transformOrigin: pos.above ? 'bottom' : 'top' }}
              onMouseDown={e => e.stopPropagation()}
            >
              {/* Month navigation */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <button type="button" onClick={prevMonth} style={navBtnSt}><ChevronRight size={12} /></button>
                <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.84rem', fontWeight: 700, color: textMain }}>
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                <button type="button" onClick={nextMonth} style={navBtnSt}><ChevronLeft size={12} /></button>
              </div>

              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
                {DAYS.map(d => (
                  <div key={d} style={{ textAlign: 'center', fontSize: '0.64rem', fontFamily: 'Cairo, sans-serif', fontWeight: 600, color: textMuted }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                {cells.map((cell, i) => {
                  const isSelected  = toDateStr(cell) === value;
                  const isToday     = toDateStr(cell) === todayStr;
                  const isOtherMon  = cell.getMonth() !== viewMonth;
                  const isDisabled  = !!isOff(cell);
                  const hov         = hoveredIdx === i && !isDisabled && !isOtherMon;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectDate(cell)}
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(-1)}
                      disabled={isDisabled}
                      style={{
                        height: 28,
                        borderRadius: 7,
                        fontSize: '0.78rem',
                        fontFamily: 'Cairo, sans-serif',
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        border: isToday && !isSelected ? '1px solid rgba(201,168,76,0.50)' : '1px solid transparent',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(201,168,76,0.92), rgba(176,138,44,0.92))'
                          : hov
                            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(201,168,76,0.10)')
                            : 'transparent',
                        boxShadow: isSelected ? '0 3px 8px rgba(201,168,76,0.30)' : 'none',
                        color: isSelected ? '#fff'
                          : isOtherMon || isDisabled ? (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(60,42,24,0.18)')
                          : isToday ? '#c9a84c'
                          : textMain,
                        fontWeight: isSelected || isToday ? 700 : 400,
                        transition: 'background 0.1s',
                      }}
                    >
                      {cell.getDate()}
                    </button>
                  );
                })}
              </div>

              {/* Today shortcut */}
              <button
                type="button"
                onClick={() => selectDate(todayDate)}
                style={{
                  marginTop: 8, width: '100%', padding: '5px 0', borderRadius: 10,
                  fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem',
                  color: '#c9a84c',
                  border: '1px solid rgba(201,168,76,0.28)',
                  background: 'rgba(201,168,76,0.08)',
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
