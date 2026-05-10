import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
  containerClass?: string;
}

// colour math
function hexToHsv(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  if (c.length !== 6) return [0, 0, 1];
  const n = parseInt(c, 16);
  let r = ((n >> 16) & 255) / 255;
  let g = ((n >> 8)  & 255) / 255;
  let b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s, v];
}

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) {        g = c; b = x; }
  else if (h < 240) {        g = x; b = c; }
  else if (h < 300) { r = x;        b = c; }
  else              { r = c;        b = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  if (c.length !== 6) return [0, 0, 0];
  const n = parseInt(c, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// const PALETTE = [
  '#ffffff', '#f5f0e8', '#f0d060', '#f8c8d4',
  '#e8a0a0', '#a0c4e8', '#a0d4a0', '#d4b896',
  '#c0c0c0', '#1a1a2e', '#6b4c9a', '#c0392b',
];

export function ColorPicker({ value, onChange, label, containerClass }: Props) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => value ? hexToHsv(value) : [0, 0, 1]);
  const [hexInput, setHexInput] = useState(value || '#ffffff');
  const panelRef  = useRef<HTMLDivElement>(null);
  const svRef     = useRef<HTMLDivElement>(null);
  const hueRef    = useRef<HTMLDivElement>(null);
  const dragging  = useRef<'sv' | 'hue' | null>(null);

  useEffect(() => {
    if (value) { setHsv(hexToHsv(value)); setHexInput(value); }
  }, [value]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  const emit = useCallback((h: number, s: number, v: number) => {
    const hex = hsvToHex(h, s, v);
    setHexInput(hex);
    onChange(hex);
  }, [onChange]);

  // SV picker drag
  const updateSv = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    const next: [number, number, number] = [hsv[0], s, v];
    setHsv(next);
    emit(...next);
  }, [hsv, emit]);

  // Hue drag
  const updateHue = useCallback((e: MouseEvent | React.MouseEvent) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = Math.max(0, Math.min(359, ((e.clientX - rect.left) / rect.width) * 360));
    const next: [number, number, number] = [h, hsv[1], hsv[2]];
    setHsv(next);
    emit(...next);
  }, [hsv, emit]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (dragging.current === 'sv')  updateSv(e);
      if (dragging.current === 'hue') updateHue(e);
    };
    const up = () => { dragging.current = null; };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [updateSv, updateHue]);

  const handleHexInput = (raw: string) => {
    setHexInput(raw);
    const clean = raw.startsWith('#') ? raw : '#' + raw;
    if (/^#[0-9a-fA-F]{6}$/.test(clean)) {
      const next = hexToHsv(clean);
      setHsv(next);
      onChange(clean.toLowerCase());
    }
  };

  const [h, s, v] = hsv;
  const pureHue = hsvToHex(h, 1, 1);
  const currentHex = hsvToHex(h, s, v);
  const textDark = luminance(currentHex) > 140;

  // SV cursor position
  const svX = s * 100;
  const svY = (1 - v) * 100;
  // Hue cursor position
  const hueX = (h / 360) * 100;

  return (
    <div className={containerClass} style={{ position: 'relative', userSelect: 'none' }}>
      {label && (
        <label className="block text-xs font-semibold text-white/50 mb-1.5">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: open ? '1px solid rgba(212,175,55,0.45)' : '1px solid rgba(255,255,255,0.10)',
          boxShadow: open ? '0 0 0 2px rgba(212,175,55,0.15)' : 'none',
        }}
      >
        {value ? (
          <>
            <span className="w-6 h-6 rounded-full flex-shrink-0 ring-1 ring-white/20"
              style={{ background: currentHex }} />
            <span className="text-sm font-mono text-white/80 flex-1 text-start">{currentHex}</span>
          </>
        ) : (
          <>
            <span className="w-6 h-6 rounded-full flex-shrink-0 ring-1 ring-white/20"
              style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }} />
            <span className="text-sm text-white/35 flex-1 text-start">اختر اللون بالتمرير</span>
          </>
        )}
        <span className="text-xs text-white/25">← اسحب</span>
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute z-50 mt-2 rounded-2xl p-4 space-y-3"
          style={{
            width: '100%',
            minWidth: 280,
            background: 'rgba(14,14,22,0.95)',
            backdropFilter: 'blur(28px) saturate(160%)',
            WebkitBackdropFilter: 'blur(28px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
          }}
        >
          {/* SV picker area */}
          <div
            ref={svRef}
            onMouseDown={(e) => { dragging.current = 'sv'; updateSv(e); }}
            className="relative rounded-xl overflow-hidden cursor-crosshair"
            style={{ height: 180 }}
          >
            {/* Saturation layer */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to right, #fff, ${pureHue})` }} />
            {/* Value layer */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} />
            {/* Cursor */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{
                left: `${svX}%`,
                top: `${svY}%`,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)',
                background: currentHex,
              }}
            />
          </div>

          {/* Hue slider */}
          <div
            ref={hueRef}
            onMouseDown={(e) => { dragging.current = 'hue'; updateHue(e); }}
            className="relative rounded-full cursor-ew-resize"
            style={{
              height: 14,
              background: 'linear-gradient(to right, #f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)',
            }}
          >
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 border-white pointer-events-none"
              style={{
                left: `${hueX}%`,
                background: pureHue,
                boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.4)',
              }}
            />
          </div>

          {/* Preview + Hex input */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex-shrink-0 ring-1 ring-white/10"
              style={{ background: currentHex }}
            >
              <div className="w-full h-full flex items-center justify-center text-[10px] font-mono font-bold"
                style={{ color: textDark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.8)' }}>
                {currentHex}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-white/35 mb-1">Hex</p>
              <input
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                maxLength={7}
                className="w-full px-2 py-1.5 rounded-lg text-sm font-mono text-white/85 bg-white/[0.07] border border-white/10 outline-none focus:border-gold-400/40"
                placeholder="#rrggbb"
              />
            </div>
          </div>

          {/* Quick palette */}
          <div>
            <p className="text-[10px] text-white/30 mb-2">ألوان سريعة</p>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => { const next = hexToHsv(col); setHsv(next); setHexInput(col); onChange(col); }}
                  className="w-6 h-6 rounded-full ring-1 ring-white/12 hover:scale-110 transition-transform"
                  style={{ background: col }}
                  title={col}
                />
              ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-1 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={() => { setOpen(false); onChange(''); setHexInput(''); }}
              className="flex items-center gap-1 text-xs text-white/30 hover:text-red-400 transition-colors"
            >
              <X size={11} /> بدون لون
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-3 py-1 rounded-lg font-semibold"
              style={{ background: 'rgba(212,175,55,0.15)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.25)' }}
            >
              تأكيد
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
