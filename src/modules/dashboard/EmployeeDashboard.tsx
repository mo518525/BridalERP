import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Megaphone, CheckSquare, Plus, Trash2, Check,
  ShoppingBag, RotateCcw, TrendingUp, Search, Loader2,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { tok } from '../../utils/themeTokens';
import { api } from '../../lib/api';
import { formatDate, formatCurrency } from '../../utils/formatters';
import type { Announcement, EmployeeTodo, Transaction, Dress } from '../../types';

function glass(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.38)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.94)',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 14px 28px rgba(180,180,180,0.03), inset 0 1px 0 rgba(255,255,255,0.99)',
    ...extra,
  };
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'متاح',     color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  rented:    { label: 'مؤجر',     color: '#c9a84c', bg: 'rgba(201,168,76,0.12)' },
  cleaning:  { label: 'تنظيف',    color: '#60a4dc', bg: 'rgba(96,164,220,0.12)' },
  sold:      { label: 'مباع',     color: '#9ca3af', bg: 'rgba(156,163,175,0.12)' },
  reserved:  { label: 'محجوز',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

function todayStr() { return new Date().toISOString().slice(0, 10); }
function monthStr()  { return new Date().toISOString().slice(0, 7); }
function prevMonthStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
}

export function EmployeeDashboard() {
  const { theme, addToast, language } = useUIStore();
  const { user: me } = useAuthStore();
  const isDark = theme === 'dark';
  const t = tok(isDark);
  const navigate = useNavigate();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [todos, setTodos]                 = useState<EmployeeTodo[]>([]);
  const [txns, setTxns]                   = useState<Transaction[]>([]);
  const [newTodo, setNewTodo]             = useState('');
  const [dressQuery, setDressQuery]       = useState('');
  const [dressResult, setDressResult]     = useState<Dress | null>(null);
  const [dressSearching, setDressSearching] = useState(false);
  const [dressNotFound, setDressNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.announcements.getAll().then(setAnnouncements).catch(console.error);
    api.todos.getAll().then(setTodos).catch(console.error);
    api.transactions.getAll()
      .then(all => setTxns(all.filter(tx => tx.employee_id === me?.id)))
      .catch(console.error);
  }, [me?.id]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const today      = todayStr();
  const month      = monthStr();
  const prevMonth  = prevMonthStr();

  const todayTxns  = txns.filter(tx => tx.created_at.slice(0, 10) === today);
  const monthTxns  = txns.filter(tx => tx.created_at.slice(0, 7) === month);
  const prevTxns   = txns.filter(tx => tx.created_at.slice(0, 7) === prevMonth);

  const todayRev   = todayTxns.reduce((s, tx) => s + tx.price, 0);
  const monthRev   = monthTxns.reduce((s, tx) => s + tx.price, 0);
  const prevRev    = prevTxns.reduce((s, tx) => s + tx.price, 0);
  const revDiff    = prevRev > 0 ? Math.round(((monthRev - prevRev) / prevRev) * 100) : null;

  // ── Dress search ──────────────────────────────────────────────────────────
  const searchDress = async () => {
    const q = dressQuery.trim();
    if (!q) return;
    setDressSearching(true);
    setDressResult(null);
    setDressNotFound(false);
    try {
      const results = await api.inventory.getAll({ search: q });
      const exact = results.find(d => d.code.toLowerCase() === q.toLowerCase()) ?? results[0] ?? null;
      if (exact) { setDressResult(exact); }
      else        { setDressNotFound(true); }
    } catch { setDressNotFound(true); }
    finally { setDressSearching(false); }
  };

  // ── Todo handlers ─────────────────────────────────────────────────────────
  const addTodo = async () => {
    const text = newTodo.trim();
    if (!text) return;
    try {
      const created = await api.todos.create(text);
      setTodos(prev => [...prev, created]);
      setNewTodo('');
      inputRef.current?.focus();
    } catch (e) { addToast('error', String(e)); }
  };

  const toggleTodo = async (id: string) => {
    try {
      await api.todos.toggle(id);
      setTodos(prev => prev.map(td => td.id === id ? { ...td, done: !td.done } : td));
    } catch (e) { addToast('error', String(e)); }
  };

  const deleteTodo = async (id: string) => {
    try {
      await api.todos.delete(id);
      setTodos(prev => prev.filter(td => td.id !== id));
    } catch (e) { addToast('error', String(e)); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">

      {/* Header + quick actions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, type: 'spring', stiffness: 440, damping: 38 }}
        className="rounded-[24px] px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={glass(isDark)}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: t.text1 }}>
            مرحباً، {me?.name}
          </h1>
          <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.72rem', color: t.textMuted, marginTop: 2 }}>
            {new Date().toLocaleDateString('ar-SY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {/* Quick action buttons */}
        <div className="flex gap-2">
          <button onClick={() => navigate('/sales')}
            className="flex items-center gap-2 px-4 py-2 rounded-[14px] text-sm font-semibold"
            style={{ fontFamily: 'Cairo, sans-serif', background: 'rgba(106,173,106,0.15)', color: '#6aad6a', border: '1px solid rgba(106,173,106,0.30)' }}>
            <ShoppingBag size={14} /> بيع سريع
          </button>
          <button onClick={() => navigate('/rentals')}
            className="flex items-center gap-2 px-4 py-2 rounded-[14px] text-sm font-semibold"
            style={{ fontFamily: 'Cairo, sans-serif', background: 'rgba(201,168,76,0.15)', color: t.gold, border: '1px solid rgba(201,168,76,0.30)' }}>
            <RotateCcw size={14} /> إيجار سريع
          </button>
        </div>
      </motion.div>

      {/* Stats row */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07, type: 'spring', stiffness: 440, damping: 38 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'معاملات اليوم',    value: todayTxns.length,        sub: null },
          { label: 'إيرادات اليوم',    value: `$${todayRev.toFixed(0)}`, sub: null },
          { label: 'معاملات الشهر',    value: monthTxns.length,        sub: prevTxns.length > 0 ? `الشهر الماضي: ${prevTxns.length}` : null },
          { label: 'إيرادات الشهر',    value: `$${monthRev.toFixed(0)}`, sub: revDiff !== null ? (revDiff >= 0 ? `▲ ${revDiff}%` : `▼ ${Math.abs(revDiff)}%`) : null, subColor: revDiff !== null ? (revDiff >= 0 ? '#10b981' : '#e05252') : undefined },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 + i * 0.03 }}
            className="rounded-[18px] px-4 py-3"
            style={glass(isDark)}>
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.67rem', color: t.textMuted }}>{s.label}</p>
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: t.text1, marginTop: 2 }}>{s.value}</p>
            {s.sub && <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.63rem', color: (s as any).subColor ?? t.textFaint, marginTop: 1 }}>{s.sub}</p>}
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">

        {/* Announcements */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.10, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-5" style={glass(isDark)}>
          <div className="flex items-center gap-2.5 mb-4">
            <span style={{ color: t.gold }}><Megaphone size={17} /></span>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>إعلانات الإدارة</h2>
          </div>
          {announcements.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2" style={{ color: t.textFaint }}>
              <Megaphone size={32} className="opacity-25" />
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem' }}>لا توجد إعلانات حالياً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann, i) => (
                <motion.div key={ann.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }} className="rounded-[16px] px-4 py-3"
                  style={{ background: isDark ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.06)', border: isDark ? '1px solid rgba(201,168,76,0.20)' : '1px solid rgba(201,168,76,0.18)' }}>
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: t.text1 }}>{ann.title}</p>
                  {ann.body && <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.text2, marginTop: 4, lineHeight: 1.6 }}>{ann.body}</p>}
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.63rem', color: t.textFaint, marginTop: 6 }}>{formatDate(ann.created_at, language)}</p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Right column: dress search + todos */}
        <div className="flex flex-col gap-4">

          {/* Dress search */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12, type: 'spring', stiffness: 440, damping: 38 }}
            className="rounded-[24px] p-4" style={glass(isDark)}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: t.gold }}><Search size={15} /></span>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: t.text1 }}>بحث عن فستان</h2>
            </div>
            <div className="flex gap-2">
              <input
                value={dressQuery}
                onChange={e => { setDressQuery(e.target.value); setDressResult(null); setDressNotFound(false); }}
                onKeyDown={e => e.key === 'Enter' && searchDress()}
                placeholder="رمز الفستان — مثلاً W012"
                className="flex-1 rounded-[12px] px-3 py-2 text-sm outline-none"
                style={{ fontFamily: 'Cairo, sans-serif', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)', color: t.text1 }}
              />
              <button onClick={searchDress} disabled={dressSearching || !dressQuery.trim()}
                className="flex items-center justify-center w-9 h-9 rounded-[12px] flex-shrink-0 disabled:opacity-40"
                style={{ background: 'rgba(201,168,76,0.18)', color: t.gold, border: '1px solid rgba(201,168,76,0.30)' }}>
                {dressSearching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              </button>
            </div>

            <AnimatePresence>
              {dressResult && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 rounded-[14px] px-4 py-3"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)', border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(255,255,255,0.80)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>{dressResult.code}</p>
                    <span className="px-2.5 py-0.5 rounded-full text-[0.65rem] font-semibold"
                      style={{ fontFamily: 'Cairo, sans-serif', background: STATUS_MAP[dressResult.status]?.bg ?? 'rgba(255,255,255,0.08)', color: STATUS_MAP[dressResult.status]?.color ?? t.textMuted }}>
                      {STATUS_MAP[dressResult.status]?.label ?? dressResult.status}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.72rem', color: t.textMuted }}>
                    {[dressResult.color, dressResult.size, dressResult.style].filter(Boolean).join(' · ')}
                  </p>
                  {dressResult.notes && <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.67rem', color: t.textFaint, marginTop: 2 }}>{dressResult.notes}</p>}
                </motion.div>
              )}
              {dressNotFound && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="mt-2 text-center text-xs"
                  style={{ fontFamily: 'Cairo, sans-serif', color: '#e05252' }}>
                  لم يتم العثور على فستان بهذا الرمز
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Todo list */}
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 440, damping: 38 }}
            className="rounded-[24px] p-5 flex flex-col flex-1" style={glass(isDark)}>
            <div className="flex items-center gap-2.5 mb-4">
              <span style={{ color: t.gold }}><CheckSquare size={17} /></span>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>مهامي</h2>
              <span className="mr-auto text-xs px-2 py-0.5 rounded-full"
                style={{ fontFamily: 'Cairo, sans-serif', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: t.textMuted }}>
                {todos.filter(td => !td.done).length} متبقية
              </span>
            </div>

            <div className="flex gap-2 mb-3">
              <input ref={inputRef} value={newTodo} onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="أضف مهمة جديدة..."
                className="flex-1 rounded-[12px] px-3 py-2 text-sm outline-none"
                style={{ fontFamily: 'Cairo, sans-serif', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)', color: t.text1 }} />
              <button onClick={addTodo} disabled={!newTodo.trim()}
                className="flex items-center justify-center w-9 h-9 rounded-[12px] flex-shrink-0 disabled:opacity-40"
                style={{ background: 'rgba(201,168,76,0.18)', color: t.gold, border: '1px solid rgba(201,168,76,0.30)' }}>
                <Plus size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
              <AnimatePresence initial={false}>
                {todos.length === 0 && (
                  <div className="flex flex-col items-center py-8 gap-2" style={{ color: t.textFaint }}>
                    <CheckSquare size={26} className="opacity-25" />
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem' }}>لا توجد مهام — أضف واحدة!</p>
                  </div>
                )}
                {todos.map(td => (
                  <motion.div key={td.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 20 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 group"
                    style={{ background: td.done ? (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.60)'), border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.80)' }}>
                    <button onClick={() => toggleTodo(td.id)}
                      className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center"
                      style={{ background: td.done ? 'rgba(16,185,129,0.20)' : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'), border: td.done ? '1.5px solid rgba(16,185,129,0.50)' : (isDark ? '1.5px solid rgba(255,255,255,0.15)' : '1.5px solid rgba(0,0,0,0.12)'), color: td.done ? '#10b981' : 'transparent' }}>
                      {td.done && <Check size={11} strokeWidth={3} />}
                    </button>
                    <span className="flex-1 text-sm"
                      style={{ fontFamily: 'Cairo, sans-serif', color: td.done ? t.textFaint : t.text1, textDecoration: td.done ? 'line-through' : 'none' }}>
                      {td.text}
                    </span>
                    <button onClick={() => deleteTodo(td.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: '#e05252' }}>
                      <Trash2 size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
