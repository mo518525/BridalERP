import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Sparkles, Loader2, Search, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { StatusBadge } from '../../components/StatusBadge';
import { formatDate } from '../../utils/formatters';
import type { Dress } from '../../types';

const STATUS_META: Record<string, { label: string; desc: string; color: string; bg: string }> = {
  cleaning: { label: 'قيد التنظيف', desc: 'الفستان في التنظيف حالياً', color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  done:     { label: 'جاهز',        desc: 'اضغط لتحويل الفستان إلى متاح',  color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function CleaningList() {
  const { language, addToast, theme, bumpReminders } = useUIStore();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.inventory.getAll({ status: 'cleaning' });
      setDresses(data);
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkDone = async (dress: Dress) => {
    setMarkingId(dress.id);
    try {
      await api.transactions.markCleaningDone(dress.id);
      addToast('success', `تم تحويل ${dress.code} إلى متاح`);
      bumpReminders();
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setMarkingId(null); }
  };

  const filtered = useMemo(() => {
    let result = dresses;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(d =>
        d.code.toLowerCase().includes(q) ||
        (d.color ?? '').toLowerCase().includes(q) ||
        (d.style ?? '').toLowerCase().includes(q)
      );
    }
    if (dateFrom) result = result.filter(d => d.updated_at >= dateFrom);
    if (dateTo)   result = result.filter(d => d.updated_at <= dateTo + 'T23:59:59');
    return result;
  }, [dresses, search, dateFrom, dateTo]);

  const textMuted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';

  const inputStyle: React.CSSProperties = {
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.82rem',
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.10)',
    borderRadius: 12,
    color: textMain,
    outline: 'none',
    height: 38,
    paddingInline: '10px',
    colorScheme: isDark ? 'dark' : 'light',
  } as React.CSSProperties;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            fontFamily: 'Cairo, sans-serif',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
            color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.55)',
            border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)',
          }}>
          <ArrowRight size={15} />
          رجوع
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
            التنظيف
          </h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
            {filtered.length} من {dresses.length} فستان
          </p>
        </div>
      </motion.div>

      {/* Status legend */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
        className="flex flex-wrap gap-2">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
            style={{
              fontFamily: 'Cairo, sans-serif',
              background: meta.bg,
              border: `1px solid ${meta.color}44`,
              color: meta.color,
            }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
            <span className="font-bold">{meta.label}</span>
            <span style={{ opacity: 0.65 }}>— {meta.desc}</span>
          </div>
        ))}
      </motion.div>

      {/* Smart filter */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بكود الفستان، اللون، الأسلوب..."
            style={{ ...inputStyle, paddingInlineStart: 34, width: '100%' }} />
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ ...inputStyle, width: 140 }} />
        <span style={{ color: textMuted, fontSize: '0.78rem', fontFamily: 'Cairo' }}>—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ ...inputStyle, width: 140 }} />
        {(search || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-1.5 rounded-xl text-xs"
            style={{ fontFamily: 'Cairo, sans-serif', color: '#f87171',
              background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
            مسح
          </button>
        )}
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: '#c9a84c' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24 gap-3" style={{ color: textMuted }}>
          <Sparkles size={48} className="opacity-25" />
          <p style={{ fontFamily: 'Cairo, sans-serif' }}>
            {dresses.length === 0 ? 'لا توجد فساتين في التنظيف' : 'لا توجد نتائج'}
          </p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((dress) => (
              <motion.div key={dress.id} variants={item} layout exit={{ opacity: 0, x: 10 }}>
                <motion.div whileHover={{ x: 3 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.50)',
                    border: '1px solid rgba(192,132,252,0.22)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.06)',
                  }}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-center">
                    {/* Code */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>الفستان</p>
                      <p className="text-sm font-bold" style={{ color: '#c9a84c', fontFamily: 'Cairo, sans-serif' }}>{dress.code}</p>
                    </div>
                    {/* Size */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>المقاس</p>
                      <p className="text-sm" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>{dress.size || '—'}</p>
                    </div>
                    {/* Details */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>التفاصيل</p>
                      <p className="text-xs" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                        {[dress.style, dress.color].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    {/* Cleaner */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>المنظِّف</p>
                      <p className="text-xs font-semibold" style={{ color: dress.cleaner_name ? '#c084fc' : textMuted, fontFamily: 'Cairo, sans-serif' }}>
                        {dress.cleaner_name || '—'}
                      </p>
                    </div>
                    {/* Status */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>الحالة</p>
                      <StatusBadge status={dress.status} />
                    </div>
                    {/* Date */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>آخر تحديث</p>
                      <p className="text-xs" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                        {formatDate(dress.updated_at, language)}
                      </p>
                    </div>
                    {/* Action */}
                    <div className="flex items-center">
                      <button
                        onClick={() => handleMarkDone(dress)}
                        disabled={markingId === dress.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                        style={{
                          fontFamily: 'Cairo, sans-serif',
                          background: 'rgba(74,222,128,0.12)',
                          color: '#4ade80',
                          border: '1px solid rgba(74,222,128,0.25)',
                          opacity: markingId === dress.id ? 0.5 : 1,
                          cursor: markingId === dress.id ? 'not-allowed' : 'pointer',
                        }}>
                        <CheckCircle2 size={14} />
                        {markingId === dress.id ? '...' : 'جاهز'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
