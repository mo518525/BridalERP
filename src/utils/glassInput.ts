// Glass input fields
export const glassInput = [
  'w-full h-10 px-3 rounded-xl border border-white/14',
  'text-white/88 placeholder:text-white/30 text-sm',
  'focus:outline-none focus:border-gold-400/55 focus:ring-1 focus:ring-gold-400/30',
  'transition-colors',
].join(' ');

export const glassInputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px) saturate(148%)',
  WebkitBackdropFilter: 'blur(16px) saturate(148%)',
};

export const glassSelect = [
  'h-10 px-3 rounded-xl border border-white/14',
  'text-white/88 text-sm',
  'focus:outline-none focus:border-gold-400/55 focus:ring-1 focus:ring-gold-400/30',
  'transition-colors',
].join(' ');

export const glassTextarea = [
  'w-full px-3 py-2.5 rounded-xl border border-white/14 resize-none',
  'text-white/88 placeholder:text-white/30 text-sm',
  'focus:outline-none focus:border-gold-400/55 focus:ring-1 focus:ring-gold-400/30',
  'transition-colors',
].join(' ');

export const glassLabel = 'text-sm font-medium text-white/55';

// Glass panel (cards, rows, list items)
export const glassPanelStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px) saturate(148%)',
  WebkitBackdropFilter: 'blur(16px) saturate(148%)',
  border: '1px solid rgba(255,255,255,0.14)',
  boxShadow: '0 18px 38px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)',
};

export const glassPanelHoverStyle: React.CSSProperties = {
  ...glassPanelStyle,
  border: '1px solid rgba(201,168,76,0.25)',
  boxShadow: '0 0 24px rgba(201,168,76,0.12), 0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
};

// Inner row (inside modals, cards)
export const glassRowStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px) saturate(148%)',
  WebkitBackdropFilter: 'blur(16px) saturate(148%)',
  border: '1px solid rgba(255,255,255,0.10)',
};

