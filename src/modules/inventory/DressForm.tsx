import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input, TextArea } from '../../components/Input';
import type { Dress } from '../../types';

interface Props { dress: Dress | null; onClose: () => void; onSaved: () => void; }

// ─── Color helpers ────────────────────────────────────────────────────────────

const ARABIC_TO_HEX: Record<string, string> = {
  'أبيض': '#FFFFFF', 'كريمي': '#FFF4DC', 'ذهبي': '#C9A84C',
  'وردي': '#F4A0C0', 'أحمر': '#E84040', 'أزرق': '#4488EE',
  'أخضر': '#44AA66', 'بيج':  '#E8D5B0', 'فضي':  '#C4C4D0',
  'أسود': '#1A1A1A', 'أرجواني': '#9B59B6',
};

function colorToHex(val: string): string {
  if (!val) return '#D4A574';
  if (val.startsWith('#')) return val;
  return ARABIC_TO_HEX[val] ?? '#D4A574';
}

function hexToHsv(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16) / 255 || 0;
  const g = parseInt(c.slice(2, 4), 16) / 255 || 0;
  const b = parseInt(c.slice(4, 6), 16) / 255 || 0;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max, s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    if      (max === r) h = ((g - b) / (max - min) + 6) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else                h = (r - g) / (max - min) + 4;
    h *= 60;
  }
  return [h, s, v];
}

function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return '#' + [f(5), f(3), f(1)]
    .map(x => Math.round(x * 255).toString(16).padStart(2, '0'))
    .join('');
}

// ─── HSV Picker ──────────────────────────────────────────────────────────────

function HsvPicker({ hex, onChange, isDark }: {
  hex: string; onChange: (hex: string) => void; isDark: boolean;
}) {
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(hex));
  const svRef  = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const dragSv  = useRef(false);
  const dragHue = useRef(false);

  // Sync when external hex changes
  useEffect(() => { setHsv(hexToHsv(hex)); }, [hex]);

  // Draw SV square
  useEffect(() => {
    const cv = svRef.current; if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const w = cv.width, h = cv.height;
    ctx.clearRect(0, 0, w, h);
    // Hue base → white gradient (horizontal)
    const hg = ctx.createLinearGradient(0, 0, w, 0);
    hg.addColorStop(0, '#fff');
    hg.addColorStop(1, `hsl(${hsv[0]},100%,50%)`);
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);
    // White → black gradient (vertical)
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Cursor
    const cx = hsv[1] * w;
    const cy = (1 - hsv[2]) * h;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv]);

  // Draw hue strip
  useEffect(() => {
    const cv = hueRef.current; if (!cv) return;
    const ctx = cv.getContext('2d')!;
    const w = cv.width, h = cv.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 12; i++) grad.addColorStop(i / 12, `hsl(${i * 30},100%,50%)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Cursor line
    const cx = (hsv[0] / 360) * w;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.roundRect(cx - 2, 1, 4, h - 2, 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [hsv[0]]);

  const applySv = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    const next: [number, number, number] = [hsv[0], s, v];
    setHsv(next);
    onChange(hsvToHex(...next));
  }, [hsv, onChange]);

  const applyHue = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const h = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    const next: [number, number, number] = [h, hsv[1], hsv[2]];
    setHsv(next);
    onChange(hsvToHex(...next));
  }, [hsv, onChange]);

  const border = isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.12)';
  const previewHex = hsvToHex(...hsv);

  return (
    <div className="flex flex-col gap-2.5">
      {/* SV square */}
      <canvas
        ref={svRef} width={280} height={160}
        className="rounded-xl w-full"
        style={{ display: 'block', height: 160, cursor: 'crosshair', border, touchAction: 'none' }}
        onPointerDown={e => { dragSv.current = true; e.currentTarget.setPointerCapture(e.pointerId); applySv(e); }}
        onPointerMove={e => { if (dragSv.current) applySv(e); }}
        onPointerUp={() => { dragSv.current = false; }}
      />

      {/* Hue strip */}
      <canvas
        ref={hueRef} width={280} height={18}
        className="rounded-lg w-full"
        style={{ display: 'block', height: 18, cursor: 'ew-resize', border, touchAction: 'none' }}
        onPointerDown={e => { dragHue.current = true; e.currentTarget.setPointerCapture(e.pointerId); applyHue(e); }}
        onPointerMove={e => { if (dragHue.current) applyHue(e); }}
        onPointerUp={() => { dragHue.current = false; }}
      />

      {/* Preview row */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex-shrink-0"
          style={{ background: previewHex, border, boxShadow: '0 2px 8px rgba(0,0,0,0.20)' }} />
        <code className="text-xs font-mono tracking-wider"
          style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,42,24,0.75)' }}>
          {previewHex.toUpperCase()}
        </code>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

const DRESS_TYPES = ['فستان زفاف', 'فستان خطوبة', 'فستان سهرة'];

export function DressForm({ dress, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { addToast, theme } = useUIStore();
  const isDark = theme === 'dark';
  const isEdit = !!dress;

  const [form, setForm] = useState({
    code:  dress?.code  ?? '',
    color: colorToHex(dress?.color ?? ''),
    size:  dress?.size  ?? '',
    style: dress?.style ?? '',
    price: dress?.price?.toString() ?? '0',
    notes: dress?.notes ?? '',
  });
  const [photoUrl,      setPhotoUrl]      = useState<string>(dress?.image_path || '');
  const [errors,        setErrors]        = useState<Record<string, string>>({});
  const [loading,       setLoading]       = useState(false);
  const [isDirty,       setIsDirty]       = useState(false);
  const [showPicker,    setShowPicker]    = useState(false);
  const [sizeSuggests,  setSizeSuggests]  = useState<string[]>([]);
  const [customType,    setCustomType]    = useState(
    DRESS_TYPES.includes(dress?.style ?? '') ? '' : (dress?.style ?? '')
  );
  const [typeMode,      setTypeMode]      = useState<'preset' | 'custom'>(
    DRESS_TYPES.includes(dress?.style ?? '') || !dress?.style ? 'preset' : 'custom'
  );
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-generate code for new dresses
  useEffect(() => {
    if (isEdit) return;
    api.inventory.getNextCode()
      .then((code) => setForm(cur => cur.code ? cur : { ...cur, code }))
      .catch(() => undefined);
  }, [isEdit]);

  // Load size suggestions from existing dresses
  useEffect(() => {
    api.inventory.getAll().then(dresses => {
      // Count frequency of each size
      const freq: Record<string, number> = {};
      for (const d of dresses) {
        if (d.size) freq[d.size] = (freq[d.size] ?? 0) + 1;
      }
      const top3 = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([s]) => s);

      // Last 2 added dresses (sorted by created_at desc)
      const recent = [...dresses]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 2)
        .map(d => d.size)
        .filter((s): s is string => !!s);

      const seen = new Set(top3);
      const extra = recent.filter(s => !seen.has(s));
      setSizeSuggests([...top3, ...extra].slice(0, 5));
    }).catch(() => undefined);
  }, []);

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setIsDirty(true);
    if (errors[k]) setErrors(e => { const c = { ...e }; delete c[k]; return c; });
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPhotoUrl(ev.target?.result as string); setIsDirty(true); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = t('validation.required');
    if (!form.price || isNaN(+form.price) || +form.price <= 0) e.price = t('validation.invalidPrice');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const styleVal = typeMode === 'preset' ? form.style : customType;
    try {
      if (isEdit) {
        await api.inventory.update({
          id: dress.id,
          code:       form.code,
          color:      form.color  || undefined,
          size:       form.size   || undefined,
          style:      styleVal    || undefined,
          price:      +form.price,
          notes:      form.notes  || undefined,
          image_path: photoUrl    || undefined,
        });
      } else {
        await api.inventory.create({
          code:       form.code,
          color:      form.color  || undefined,
          size:       form.size   || undefined,
          style:      styleVal    || undefined,
          price:      +form.price,
          notes:      form.notes  || undefined,
          image_path: photoUrl    || undefined,
        });
      }
      addToast('success', t('messages.saved'));
      onSaved();
    } catch (err) {
      addToast('error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,42,24,0.75)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const border    = isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)';
  const fieldBg   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.60)';
  const gold      = '#c9a84c';

  return (
    <Modal
      open onClose={onClose} isDirty={isDirty}
      title={isEdit ? t('inventory.editDress') : t('inventory.addDress')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{t('actions.cancel')}</Button>
          <Button variant="gold" form="dress-form" type="submit" loading={loading}>{t('actions.save')}</Button>
        </>
      }
    >
      <form id="dress-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

        {/* Photo upload */}
        <div className="flex items-center gap-4">
          <div
            className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer group"
            style={{ background: fieldBg, border }}
            onClick={() => fileRef.current?.click()}
          >
            {photoUrl
              ? <img src={photoUrl} alt="dress" className="w-full h-full object-cover" />
              : <Camera size={22} style={{ color: textMuted }} />
            }
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} style={{ color: '#fff' }} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium" style={{ fontFamily: 'Cairo, sans-serif', color: textMuted }}>صورة الفستان</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ fontFamily: 'Cairo, sans-serif', color: gold, background: `${gold}18`, border: `1px solid ${gold}33` }}>
                {photoUrl ? 'تغيير الصورة' : 'رفع صورة'}
              </button>
              {photoUrl && (
                <button type="button" onClick={() => { setPhotoUrl(''); setIsDirty(true); }}
                  className="text-xs px-2 py-1.5 rounded-lg"
                  style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            <p className="text-[11px]" style={{ fontFamily: 'Cairo, sans-serif', color: textMuted }}>
              JPG, PNG — يتم تخزين الصورة مع الفستان
            </p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
        </div>

        {/* Code */}
        <Input
          label={t('inventory.dressCode')}
          value={form.code}
          onChange={e => set('code', e.target.value)}
          error={errors.code}
          required
          readOnly={!isEdit}
          hint={!isEdit ? 'يتم توليد الكود تلقائياً حسب العداد' : undefined}
        />

        {/* ── Color ── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ fontFamily: 'Cairo, sans-serif', color: textMuted }}>
            {t('inventory.color')}
          </label>
          {/* Swatch + toggle button */}
          <button
            type="button"
            onClick={() => setShowPicker(v => !v)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-sm transition-all"
            style={{ background: fieldBg, border, fontFamily: 'Cairo, sans-serif', color: textMain }}
          >
            <div className="w-6 h-6 rounded-lg flex-shrink-0"
              style={{ background: form.color, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
            <span className="flex-1 text-start font-mono text-xs" style={{ color: textMuted }}>
              {form.color.toUpperCase()}
            </span>
            {showPicker ? <ChevronUp size={14} style={{ color: textMuted }} /> : <ChevronDown size={14} style={{ color: textMuted }} />}
          </button>

          {/* HSV picker (collapsible) */}
          {showPicker && (
            <div className="rounded-2xl p-4"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.70)', border }}>
              <HsvPicker
                hex={form.color}
                onChange={hex => { set('color', hex); }}
                isDark={isDark}
              />
            </div>
          )}
        </div>

        {/* ── Size ── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ fontFamily: 'Cairo, sans-serif', color: textMuted }}>
            {t('inventory.size')}
          </label>
          {/* Suggestion chips */}
          {sizeSuggests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sizeSuggests.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('size', s)}
                  className="px-2.5 py-0.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    fontFamily: 'Cairo, sans-serif',
                    background: form.size === s
                      ? `${gold}28`
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
                    border: form.size === s
                      ? `1px solid ${gold}55`
                      : `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,42,24,0.10)'}`,
                    color: form.size === s ? gold : textMuted,
                    // First 3 = most common (slightly highlighted), last 2 = recent
                    opacity: i >= 3 ? 0.75 : 1,
                  }}>
                  {s}
                  {i >= 3 && (
                    <span className="ms-1 text-[9px] opacity-60">حديث</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <input
            value={form.size}
            onChange={e => set('size', e.target.value)}
            placeholder="اكتب المقاس يدوياً (مثلاً 38)"
            className="rounded-xl px-3 py-2 text-sm w-full outline-none"
            style={{
              fontFamily: 'Cairo, sans-serif',
              background: fieldBg,
              border,
              color: textMain,
              colorScheme: isDark ? 'dark' : 'light',
            }}
          />
        </div>

        {/* ── Type (النوع) ── */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ fontFamily: 'Cairo, sans-serif', color: textMuted }}>
            النوع
          </label>
          {/* Preset chips */}
          <div className="flex flex-wrap gap-2">
            {DRESS_TYPES.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => { setTypeMode('preset'); set('style', type); }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                style={{
                  fontFamily: 'Cairo, sans-serif',
                  background: typeMode === 'preset' && form.style === type
                    ? `${gold}28`
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
                  border: typeMode === 'preset' && form.style === type
                    ? `1px solid ${gold}55`
                    : `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,42,24,0.10)'}`,
                  color: typeMode === 'preset' && form.style === type ? gold : textMuted,
                }}>
                {type}
              </button>
            ))}
            {/* "Other" toggle */}
            <button
              type="button"
              onClick={() => { setTypeMode('custom'); set('style', ''); }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: typeMode === 'custom'
                  ? 'rgba(96,165,250,0.15)'
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
                border: typeMode === 'custom'
                  ? '1px solid rgba(96,165,250,0.40)'
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,42,24,0.10)'}`,
                color: typeMode === 'custom' ? '#60a5fa' : textMuted,
              }}>
              نوع آخر…
            </button>
          </div>
          {/* Custom input (visible only in custom mode) */}
          {typeMode === 'custom' && (
            <input
              value={customType}
              onChange={e => { setCustomType(e.target.value); setIsDirty(true); }}
              placeholder="اكتب نوع الفستان يدوياً"
              className="rounded-xl px-3 py-2 text-sm w-full outline-none"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: fieldBg,
                border,
                color: textMain,
                colorScheme: isDark ? 'dark' : 'light',
              }}
              autoFocus
            />
          )}
        </div>

        {/* Price */}
        <Input
          label="سعر الشراء (مرجعي)"
          type="number" min="0.01" step="0.01"
          value={form.price}
          onChange={e => set('price', e.target.value)}
          error={errors.price}
          required
        />

        {/* Notes */}
        <TextArea
          label={t('inventory.notes')}
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={2}
        />
      </form>
    </Modal>
  );
}
