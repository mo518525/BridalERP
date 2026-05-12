import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../store/uiStore';
import { cn } from '../utils/cn';

export type SelectOption = { value: string; label: string };

interface Props {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  containerClass?: string;
  disabled?: boolean;
}

function DropdownItem({ option, selected, onSelect, isDark }: {
  option: SelectOption; selected: boolean; onSelect: () => void; isDark: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onSelect}
      className="flex items-center justify-between w-full px-3 py-2.5 gap-2 text-sm transition-none"
      style={{
        fontFamily: 'Cairo, sans-serif',
        textAlign: 'right',
        color: selected ? '#c9a84c' : (isDark ? 'rgba(255,255,255,0.82)' : 'rgba(55,38,18,0.84)'),
        background: selected
          ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.58)')
          : hover
            ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.42)')
            : 'transparent',
        border: selected
          ? (isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.72)')
          : '1px solid transparent',
        borderRadius: 12,
        boxShadow: selected
          ? (isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.07), 0 2px 6px rgba(0,0,0,0.05)'
            : 'inset 0 1px 0 rgba(255,255,255,0.90), 0 2px 6px rgba(160,160,160,0.04)')
          : 'none',
      }}
    >
      <span>{option.label}</span>
      {selected && <Check size={12} style={{ color: '#c9a84c', flexShrink: 0 }} />}
    </button>
  );
}

export function GlassSelect({
  value, onChange, options, label, placeholder, error,
  required, containerClass, disabled,
}: Props) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef   = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);

  const openDropdown = useCallback(() => {
    if (disabled) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  }, [disabled]);

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

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const btnStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: error
      ? '1px solid rgba(239,68,68,0.60)'
      : open
        ? '1px solid rgba(201,168,76,0.55)'
        : isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(60,42,24,0.12)',
    borderRadius: 12,
    color: selected
      ? (isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)')
      : (isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.55)'),
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'border-color 0.15s',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed',
    top: pos.top,
    left: pos.left,
    width: pos.width,
    zIndex: 99999,
    background: isDark
      ? 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.045) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.58) 100%)',
    backdropFilter: 'blur(26px) saturate(165%)',
    WebkitBackdropFilter: 'blur(26px) saturate(165%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.82)',
    borderRadius: 18,
    boxShadow: isDark
      ? '0 8px 18px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.07), inset 0 -1px 0 rgba(0,0,0,0.08)'
      : '0 6px 14px rgba(122,122,122,0.05), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -1px 0 rgba(214,214,214,0.28)',
    overflow: 'hidden',
    maxHeight: 240,
    overflowY: 'auto',
    padding: 6,
  };

  return (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && (
        <label style={{
          fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
          color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.75)',
        }}>
          {label}
          {required && <span style={{ color: '#f87171', marginInlineStart: 4 }}>*</span>}
        </label>
      )}
      <button
        ref={btnRef}
        type="button"
        onClick={() => open ? setOpen(false) : openDropdown()}
        className="flex items-center justify-between w-full h-10 px-3"
        style={btnStyle}
        disabled={disabled}
      >
        <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.875rem' }}>
          {selected?.label ?? placeholder ?? '— اختر —'}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.40)',
            flexShrink: 0,
            transition: 'transform 0.2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={popupRef}
              initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
              animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -4, scaleY: 0.95 }}
              transition={{ duration: 0.13, ease: 'easeOut' }}
              style={{ ...dropdownStyle, transformOrigin: 'top' }}
              onMouseDown={e => e.stopPropagation()}
            >
              {placeholder && (
                <DropdownItem
                  option={{ value: '', label: placeholder }}
                  selected={!value}
                  onSelect={() => { onChange(''); setOpen(false); }}
                  isDark={isDark}
                />
              )}
              {options.map(o => (
                <DropdownItem
                  key={o.value}
                  option={o}
                  selected={o.value === value}
                  onSelect={() => { onChange(o.value); setOpen(false); }}
                  isDark={isDark}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {error && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>{error}</p>}
    </div>
  );
}
