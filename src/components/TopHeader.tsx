import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, Moon, Sun, Eye, EyeOff, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/api';
import { tok } from '../utils/themeTokens';

function CurrencyCalcChip({ isDark }: { isDark: boolean }) {
  const { exchangeRates, setExchangeRates, addToast } = useUIStore();
  const [open, setOpen] = useState(false);
  const [usdToSyp, setUsdToSyp] = useState(String(exchangeRates.usd_to_syp));
  const [usdToTry, setUsdToTry] = useState(String(exchangeRates.usd_to_try));
  const [tryToSyp, setTryToSyp] = useState(String(exchangeRates.try_to_syp));
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFrom, setCalcFrom] = useState<'usd' | 'syp' | 'try'>('usd');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    setUsdToSyp(String(exchangeRates.usd_to_syp));
    setUsdToTry(String(exchangeRates.usd_to_try));
    setTryToSyp(String(exchangeRates.try_to_syp));
    setOpen(v => !v);
  };

  const handleSave = () => {
    const s = parseFloat(usdToSyp), t = parseFloat(usdToTry), ts = parseFloat(tryToSyp);
    if ([s, t, ts].some(n => isNaN(n) || n <= 0)) {
      addToast('error', 'أدخل أرقاماً صحيحة أكبر من صفر');
      return;
    }
    setExchangeRates({ usd_to_syp: s, usd_to_try: t, try_to_syp: ts });
    addToast('success', 'تم حفظ أسعار الصرف ✓');
    setOpen(false);
  };

  const liveRates = {
    usd_to_syp: parseFloat(usdToSyp) || exchangeRates.usd_to_syp,
    usd_to_try: parseFloat(usdToTry) || exchangeRates.usd_to_try,
    try_to_syp: parseFloat(tryToSyp) || exchangeRates.try_to_syp,
  };
  const amount = parseFloat(calcAmount) || 0;
  let usd = 0, syp = 0, tryL = 0;
  if (calcFrom === 'usd') { usd = amount; syp = amount * liveRates.usd_to_syp; tryL = amount * liveRates.usd_to_try; }
  if (calcFrom === 'syp') { syp = amount; usd = amount / liveRates.usd_to_syp; tryL = usd * liveRates.usd_to_try; }
  if (calcFrom === 'try') { tryL = amount; usd = amount / liveRates.usd_to_try; syp = amount * liveRates.try_to_syp; }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);

  const inp: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.55)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(60,42,24,0.12)',
    borderRadius: 10, color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)',
    fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', outline: 'none',
    padding: '5px 8px', width: '100%', colorScheme: isDark ? 'dark' : 'light',
  };
  const textMuted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,42,24,0.75)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        whileHover={hoverSoft(isDark)}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpen}
        title="محوّل العملات"
        className="relative rounded-full flex items-center justify-center"
        style={{
          ...glassPanel(isDark),
          width: 50, height: 50, borderRadius: 999,
          color: open ? '#c9a84c' : (isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,42,24,0.75)'),
        }}
      >
        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '0.78rem', fontWeight: 700, lineHeight: 1 }}>
          $↔
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            className="absolute top-full mt-2 z-50 rounded-2xl p-4"
            style={{ ...glassPanel(isDark), minWidth: 290, right: 0 }}
          >
            {/* Rate editor */}
            <p className="text-[11px] font-bold mb-2.5" style={{ color: '#c9a84c', fontFamily: 'Cairo, sans-serif' }}>أسعار الصرف</p>
            <div className="space-y-2 mb-3">
              {[
                { label: '1$ = __ ل.س',  value: usdToSyp, set: setUsdToSyp },
                { label: '1$ = __ ₺',    value: usdToTry, set: setUsdToTry },
                { label: '1₺ = __ ل.س',  value: tryToSyp, set: setTryToSyp },
              ].map(({ label, value, set }) => (
                <div key={label} className="flex items-center gap-2">
                  <label className="text-[11px] flex-shrink-0 w-28 text-end" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>{label}</label>
                  <input type="number" min="0.01" step="any" value={value} onChange={e => set(e.target.value)} style={inp} />
                </div>
              ))}
            </div>
            <button onClick={handleSave}
              className="w-full py-1.5 rounded-xl text-xs font-bold mb-4"
              style={{ background: 'linear-gradient(135deg, #c9a84c, #a8732e)', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
              حفظ أسعار الصرف
            </button>

            {/* Divider */}
            <div className="mb-3" style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' }} />

            {/* Calculator */}
            <p className="text-[11px] font-bold mb-2.5" style={{ color: '#c9a84c', fontFamily: 'Cairo, sans-serif' }}>🧮 حاسبة</p>
            <div className="flex gap-2 mb-3">
              <input
                type="number" min="0" step="any" value={calcAmount}
                onChange={e => setCalcAmount(e.target.value)}
                className="flex-1 h-9 px-3 rounded-xl text-sm font-bold"
                style={{ ...inp, fontSize: '0.95rem' }}
                placeholder="المبلغ"
              />
              <div className="flex rounded-xl overflow-hidden"
                style={{ border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.12)', background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.40)' }}>
                {(['usd', 'syp', 'try'] as const).map((cur) => {
                  const labels = { usd: '$', syp: 'ل.س', try: '₺' };
                  return (
                    <button key={cur} type="button" onClick={() => setCalcFrom(cur)}
                      className="px-2.5 py-1.5 text-[11px] font-bold transition-all"
                      style={{
                        fontFamily: 'Cairo, sans-serif',
                        background: calcFrom === cur ? 'rgba(201,168,76,0.22)' : 'transparent',
                        color: calcFrom === cur ? '#c9a84c' : textMuted,
                        borderLeft: cur !== 'usd' ? (isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)') : 'none',
                      }}>
                      {labels[cur]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              {[
                { label: 'دولار', symbol: '$',   value: usd,  active: calcFrom === 'usd', color: '#60a5fa' },
                { label: 'ل.س',   symbol: 'ل.س', value: syp,  active: calcFrom === 'syp', color: '#4ade80' },
                { label: 'ليرة',  symbol: '₺',   value: tryL, active: calcFrom === 'try', color: '#f59e0b' },
              ].map(({ label, symbol, value: val, active, color }) => (
                <div key={symbol}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{
                    background: active ? `${color}18` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'),
                    border: `1px solid ${active ? color + '35' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')}`,
                  }}>
                  <span className="text-[11px]" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>{label}</span>
                  <span className="text-sm font-bold" style={{ color: active ? color : textMain, fontFamily: 'Cairo, sans-serif' }}>
                    {fmt(val)} <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{symbol}</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const VERSES: [string, string][] = [
  ['وَتَوَكَّلْ عَلَى اللَّهِ وَكَفَىٰ بِاللَّهِ وَكِيلًا', 'سورة الأحزاب - آية 3'],
  ['إِنَّ مَعَ الْعُسْرِ يُسْرًا', 'سورة الشرح - آية 6'],
  ['وَمَنْ يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', 'سورة الطلاق - آية 3'],
  ['رَبِّ زِدْنِي عِلْمًا', 'سورة طه - آية 114'],
  ['إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', 'سورة البقرة - آية 153'],
  ['وَاللَّهُ خَيْرُ الرَّازِقِينَ', 'سورة الجمعة - آية 11'],
];

function glassPanel(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(255,255,255,0.34)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(11px) saturate(158%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(11px) saturate(158%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)'
      : '0 12px 24px rgba(122,122,122,0.08), inset 0 1px 0 rgba(255,255,255,0.84), inset 0 -1px 0 rgba(214,214,214,0.38)',
    ...extra,
  };
}

function hoverSoft(isDark: boolean) {
  return {
    boxShadow: isDark
      ? '0 24px 44px rgba(0,0,0,0.20), 0 0 0 0.5px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.13)'
      : '0 16px 28px rgba(122,122,122,0.10), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -1px 0 rgba(214,214,214,0.40)',
  };
}

function iconBubble(isDark: boolean, color: string, extra?: React.CSSProperties): React.CSSProperties {
  return {
    ...glassPanel(isDark, {
      width: 50,
      height: 50,
      borderRadius: 999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color,
    }),
    ...extra,
  };
}

export function TopHeader() {
  const { theme, setTheme, hideFinancials, toggleHideFinancials, showCurrencyCalc } = useUIStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const canGoBack = location.pathname !== '/';

  const [verseIdx, setVerseIdx] = useState(0);
  const [time, setTime] = useState(new Date());

  const isDark = theme === 'dark';
  const t = tok(isDark);

  useEffect(() => {
    // Pick a random verse each hour — seed by floored hour so it's stable within the same hour
    const hourSeed = Math.floor(Date.now() / (60 * 60 * 1000));
    setVerseIdx(hourSeed % VERSES.length);
    const id = setInterval(() => {
      const nextHour = Math.floor(Date.now() / (60 * 60 * 1000));
      setVerseIdx(nextHour % VERSES.length);
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const verse = VERSES[verseIdx];
  const roleLabel = user?.role === 'owner' ? 'المالك' : user?.role === 'employee' ? 'موظف' : 'كاشير';
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  const ampm = time.getHours() >= 12 ? 'PM' : 'AM';
  const weekday = time.toLocaleDateString('ar-SY', { weekday: 'long' });
  const monthAr = time.toLocaleDateString('ar-SY', { month: 'long' });
  const dateStr = `${weekday}، ${time.getDate()} ${monthAr} ${time.getFullYear()}`;

  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 36, delay: 0.06 }}
      className="relative flex min-h-[108px] items-start justify-between gap-6 pt-0"
      style={{ flexShrink: 0, zIndex: 20 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={verseIdx}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          whileHover={hoverSoft(isDark)}
          className="flex min-h-[96px] flex-1 items-center gap-5 rounded-[30px] px-5 py-4"
          style={{ ...glassPanel(isDark), maxWidth: 620 }}
        >
          <div className="flex-1 text-center">
            <p
              style={{
                fontFamily: 'Cairo, sans-serif',
                fontSize: '1.04rem',
                fontWeight: isDark ? 600 : 700,
                color: t.text1,
                lineHeight: 1.45,
                letterSpacing: '0.01em',
              }}
            >
              {verse[0]}
            </p>
            <p
              style={{
                fontFamily: 'Cairo, sans-serif',
                fontSize: '0.8rem',
                color: t.textMuted,
                marginTop: 6,
                fontWeight: isDark ? 500 : 700,
              }}
            >
              {verse[1]}
            </p>
          </div>

          <motion.button whileTap={{ scale: 0.95 }} className="rounded-full" style={iconBubble(isDark, t.gold)}>
            <Bookmark size={16} />
          </motion.button>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-start gap-5">
        {/* Back button — shown on any page except home */}
        {canGoBack && (
          <motion.button
            whileHover={hoverSoft(isDark)}
            whileTap={{ scale: 0.93 }}
            onClick={() => navigate(-1)}
            title="رجوع"
            className="relative rounded-full"
            style={iconBubble(isDark, t.textMuted)}
          >
            <ChevronRight size={18} />
          </motion.button>
        )}

        <div className="px-2 pt-1 text-center" style={{ direction: 'ltr' }}>
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: '2.28rem',
              fontWeight: 700,
              lineHeight: 0.98,
              color: t.text1,
              letterSpacing: '-0.05em',
            }}
          >
            {hh}:{mm}
            <span
              style={{
                fontSize: '0.88rem',
                fontWeight: isDark ? 500 : 700,
                marginInlineStart: 6,
                color: t.textMuted,
              }}
            >
              {ampm}
            </span>
          </p>
          <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.86rem', fontWeight: 500, color: t.text2, marginTop: 10, lineHeight: 1.2 }}>
            {dateStr}
          </p>
        </div>

        <motion.button
          whileHover={hoverSoft(isDark)}
          whileTap={{ scale: 0.95 }}
          onClick={toggleHideFinancials}
          title={hideFinancials ? 'إظهار الأرقام' : 'إخفاء الأرقام'}
          className="relative rounded-full"
          style={iconBubble(isDark, hideFinancials ? t.gold : t.textMuted)}
        >
          {hideFinancials ? <EyeOff size={17} /> : <Eye size={17} />}
        </motion.button>

        {showCurrencyCalc && <CurrencyCalcChip isDark={isDark} />}

        <motion.button
          whileHover={hoverSoft(isDark)}
          whileTap={{ scale: 0.95 }}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="relative rounded-full"
          style={iconBubble(isDark, t.gold)}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </motion.button>

        <motion.button
          whileHover={hoverSoft(isDark)}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-3 rounded-[26px] px-4 py-3"
          style={{ ...glassPanel(isDark) }}
        >
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
            style={{
              background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.90)',
              border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
              color: isDark ? t.text1 : t.gold,
              boxShadow: isDark
                ? '0 6px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.11), inset 0 -1px 0 rgba(0,0,0,0.07)'
                : '0 8px 16px rgba(124,124,124,0.08), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(214,214,214,0.34)',
              fontFamily: 'Cairo, sans-serif',
              fontSize: '0.94rem',
              fontWeight: 700,
            }}
          >
            {user?.name?.charAt(0) ?? 'أ'}
          </div>
          <div className="text-end">
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.9rem', fontWeight: 500, color: t.text1, lineHeight: 1.2, whiteSpace: 'nowrap' }}>
              {user?.name ?? 'أحمد المدير'}
            </p>
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.textMuted, lineHeight: 1.25, fontWeight: 500, marginTop: 4 }}>
              {roleLabel}
            </p>
          </div>
        </motion.button>
      </div>
    </motion.header>
  );
}
