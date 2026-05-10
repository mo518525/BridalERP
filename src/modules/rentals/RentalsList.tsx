import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, Loader2, RotateCcw, AlertTriangle, Search, Phone, Banknote } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { formatDate, isOverdue, getDaysUntil, toWesternDigits } from '../../utils/formatters';
import type { Transaction } from '../../types';
import { RentalForm } from './RentalForm';

type PayCurrency = 'SYP' | 'USD' | 'TRY';
const DISP_LABELS: Record<string, string> = { SYP: 'ل.س', USD: '$', TRY: '₺' };
const PAY_CURRENCIES: PayCurrency[] = ['SYP', 'USD', 'TRY'];

// Convert any amount in payCurrency → tx original currency (using stored historical rates)
function payToOriginal(payAmt: number, payCurr: string, tx: Transaction): number {
  const usd = tx.usd_to_syp_snapshot || 14000;
  const tryR = tx.usd_to_try_snapshot || 34;
  const orig = tx.currency || 'SYP';
  // pay → SYP
  const syp = payCurr === 'SYP' ? payAmt : payCurr === 'USD' ? payAmt * usd : payAmt * (usd / tryR);
  // SYP → original
  if (orig === 'SYP') return syp;
  if (orig === 'USD') return syp / usd;
  return syp * tryR / usd;
}

// Convert tx original amount → payCurrency
function originalToPay(origAmt: number, payCurr: string, tx: Transaction): number {
  const usd = tx.usd_to_syp_snapshot || 14000;
  const tryR = tx.usd_to_try_snapshot || 34;
  const orig = tx.currency || 'SYP';
  // original → SYP
  const syp = orig === 'SYP' ? origAmt : orig === 'USD' ? origAmt * usd : origAmt * (usd / tryR);
  // SYP → payCurr
  if (payCurr === 'SYP') return syp;
  if (payCurr === 'USD') return syp / usd;
  return syp * tryR / usd;
}

function fmtPay(val: number, curr: string): string {
  const r = curr === 'SYP' ? Math.round(val) : Math.round(val * 100) / 100;
  return `${r.toLocaleString('en-US', { maximumFractionDigits: curr === 'SYP' ? 0 : 2 })} ${DISP_LABELS[curr] ?? curr}`;
}


// ─── Table layout ─────────────────────────────────────────────────────────────
// cols: العميل | الهاتف | الفستان | المقاس | الفترة | السعر | مستحق | الحالة | actions
const RENTALS_COLS = 'repeat(8, 1fr) 120px';
const RENTALS_HDR: React.CSSProperties = {
  gridTemplateColumns: RENTALS_COLS,
  fontFamily: 'Cairo, sans-serif',
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(16px) saturate(160%)',
  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
  borderBottom: '1px solid rgba(212,175,55,0.22)',
  color: 'rgba(212,175,55,0.55)',
  whiteSpace: 'nowrap' as const,
};

// ─── Status legend ────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { key: '',              label: 'الكل',              desc: '',                             color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.06)' },
  { key: 'active',        label: 'نشط',               desc: 'الفستان عند العميل',           color: '#4ade80',               bg: 'rgba(74,222,128,0.12)'  },
  { key: 'active_unpaid', label: 'نشط · دفع مفتوح',  desc: 'مبلغ متبقٍ لم يُسدَّد',       color: '#f87171',               bg: 'rgba(239,68,68,0.12)'   },
  { key: 'active_paid',   label: 'نشط · مدفوع',      desc: 'مدفوع والفستان لم يُرجَع بعد', color: '#a78bfa',               bg: 'rgba(167,139,250,0.12)' },
  { key: 'completed',     label: 'مكتمل',             desc: 'الفستان أُعيد وأُغلق الحساب', color: '#60a5fa',               bg: 'rgba(96,165,250,0.12)'  },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function RentalsList() {
  const { language, addToast, theme } = useUIStore();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const [rentals, setRentals] = useState<Transaction[]>([]);
  const [openSales, setOpenSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [returning, setReturning] = useState<Transaction | null>(null);
  const [needsCleaning, setNeedsCleaning] = useState(false);
  const [cleanerName, setCleanerName] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [settling, setSettling] = useState<Transaction | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [payCurrency, setPayCurrency] = useState<PayCurrency>('SYP');
  const [payAmount, setPayAmount] = useState('');

  // Smart filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rentalsData, salesData] = await Promise.all([
        api.transactions.getAll({ category: 'rental' }),
        api.transactions.getAll({ category: 'sale', status: 'active' }),
      ]);
      setRentals(rentalsData);
      setOpenSales(salesData.filter(tx => {
        const rem = tx.currency === 'SYP' ? Math.round(tx.remaining) : Math.round(tx.remaining * 100) / 100;
        return rem > 0;
      }));
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openSettle = (tx: Transaction) => {
    setSettling(tx);
    const c = (tx.currency || 'SYP') as PayCurrency;
    setPayCurrency(c);
    const r = c === 'SYP' ? Math.round(tx.remaining) : Math.round(tx.remaining * 100) / 100;
    setPayAmount(r.toString());
  };

  const handleSettle = async () => {
    if (!settling) return;
    const amtInOriginal = payToOriginal(parseFloat(payAmount) || 0, payCurrency, settling);
    const clamped = Math.min(amtInOriginal, settling.remaining);
    if (clamped <= 0) return;
    setSettleLoading(true);
    try {
      await api.transactions.complete(settling.id, clamped);
      addToast('success', 'تمت تسوية الدفع بنجاح');
      setSettling(null);
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setSettleLoading(false); }
  };

  const handleReturn = async () => {
    if (!returning) return;
    setReturnLoading(true);
    try {
      await api.transactions.processReturn({
        transaction_id: returning.id,
        needs_cleaning: needsCleaning,
        cleaner_name: needsCleaning && cleanerName.trim() ? cleanerName.trim() : undefined,
      });
      addToast('success', 'تم إرجاع الفستان بنجاح');
      setReturning(null); setCleanerName(''); load();
    } catch (e) { addToast('error', String(e)); }
    finally { setReturnLoading(false); }
  };

  // ── Client-side filtering ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = rentals;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(tx =>
        (tx.customer_name ?? '').toLowerCase().includes(q) ||
        (tx.dress_code ?? '').toLowerCase().includes(q) ||
        tx.status.toLowerCase().includes(q) ||
        (FILTER_OPTIONS.find(f => f.key === tx.status)?.label ?? '').includes(q)
      );
    }
    if (statusFilter === 'active')        result = result.filter(tx => tx.status === 'active');
    else if (statusFilter === 'active_unpaid') result = result.filter(tx => tx.status === 'active' && tx.remaining > 0);
    else if (statusFilter === 'active_paid')   result = result.filter(tx => tx.status === 'active' && tx.remaining <= 0);
    else if (statusFilter === 'completed')     result = result.filter(tx => tx.status === 'completed');
    if (dateFrom) result = result.filter(tx => tx.rental_start && tx.rental_start >= dateFrom);
    if (dateTo) result = result.filter(tx => tx.rental_start && tx.rental_start <= dateTo + 'T23:59:59');
    return result;
  }, [rentals, search, statusFilter, dateFrom, dateTo]);

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
      {/* ── Header ──────────────────────────────────────────────────── */}
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
            المؤجر
          </h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
            {filtered.length} من {rentals.length} تأجير
          </p>
        </div>
      </motion.div>

      {/* ── Status legend ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
        className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map((opt) => {
          const active = statusFilter === opt.key;
          const count = opt.key === ''              ? rentals.length
                      : opt.key === 'active'        ? rentals.filter(t => t.status === 'active').length
                      : opt.key === 'active_unpaid' ? rentals.filter(t => t.status === 'active' && t.remaining > 0).length
                      : opt.key === 'active_paid'   ? rentals.filter(t => t.status === 'active' && t.remaining <= 0).length
                      : rentals.filter(t => t.status === opt.key).length;
          return (
            <button key={opt.key}
              onClick={() => setStatusFilter(active ? '' : opt.key)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: active ? opt.bg : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? opt.color + '55' : 'rgba(255,255,255,0.08)'}`,
                color: active ? opt.color : textMuted,
                fontWeight: active ? 700 : 500,
              }}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: opt.color }} />
              <span>{opt.label}</span>
              {opt.desc && <span style={{ opacity: 0.55 }}>— {opt.desc}</span>}
              <span className="opacity-50 text-[10px]">({count})</span>
            </button>
          );
        })}
      </motion.div>

      {/* ── Smart search bar ─────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex flex-wrap gap-2 items-center">
        {/* Text search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالعميل، كود الفستان، الحالة..."
            style={{ ...inputStyle, paddingInlineStart: 34, width: '100%' }} />
        </div>
        {/* Date from */}
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ ...inputStyle, width: 140 }} />
        <span style={{ color: textMuted, fontSize: '0.78rem', fontFamily: 'Cairo' }}>—</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ ...inputStyle, width: 140 }} />
        {(search || statusFilter || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-1.5 rounded-xl text-xs"
            style={{ fontFamily: 'Cairo, sans-serif', color: '#f87171',
              background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
            مسح
          </button>
        )}
      </motion.div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: '#c9a84c' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24" style={{ color: textMuted }}>
          <Calendar size={52} className="mb-3 opacity-30" />
          <p style={{ fontFamily: 'Cairo, sans-serif' }}>لا توجد تأجيرات</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-white/[0.10]"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          {/* Sticky header */}
          <div className="sticky top-0 z-10 grid gap-x-6 px-6 py-2.5 text-xs font-semibold"
            style={RENTALS_HDR}>
            <span>العميل</span><span>الهاتف</span><span>الفستان</span><span>المقاس</span>
            <span>الفترة</span>
            <span>السعر</span>
            <span>مستحق</span><span>الحالة</span><span></span>
          </div>
          {/* Rows */}
          <AnimatePresence initial={false}>
            {filtered.map((tx) => {
              const overdue = tx.rental_end && isOverdue(tx.rental_end) && tx.status === 'active';
              const daysLeft = tx.rental_end ? getDaysUntil(tx.rental_end) : null;
              return (
                <motion.div
                  key={tx.id} variants={item} layout exit={{ opacity: 0, x: 10 }}
                  className="grid gap-x-6 px-6 py-3 border-b last:border-b-0 transition-colors"
                  style={{
                    gridTemplateColumns: RENTALS_COLS, alignItems: 'center',
                    borderColor: 'rgba(255,255,255,0.05)',
                    background: overdue ? 'rgba(239,68,68,0.07)' : 'transparent',
                    borderRight: overdue ? '3px solid rgba(239,68,68,0.55)' : '3px solid transparent',
                  }}
                >
                  {/* Customer */}
                  <div>
                    <p className="text-sm font-semibold truncate" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>{tx.customer_name}</p>
                    {overdue && <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color: '#f87171' }}><AlertTriangle size={10} />تأخر الإرجاع</p>}
                  </div>
                  {/* Phone */}
                  {tx.customer_phone ? (
                    <p className="flex items-center gap-1 text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                      <Phone size={10} />{toWesternDigits(tx.customer_phone)}
                    </p>
                  ) : <span className="text-xs" style={{ color: textMuted }}>—</span>}
                  {/* Dress */}
                  <span className="text-sm font-bold" style={{ color: '#c9a84c' }}>{tx.dress_code}</span>
                  {/* Size */}
                  <span className="text-sm" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>{tx.dress_size || '—'}</span>
                  {/* Period */}
                  <div className="text-xs space-y-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                    <div>{formatDate(tx.rental_start, language)}</div>
                    <div>{formatDate(tx.rental_end, language)}</div>
                    {daysLeft !== null && tx.status === 'active' && (
                      <div className="font-semibold" style={{ color: overdue ? '#f87171' : '#4ade80' }}>
                        {overdue ? `متأخر ${Math.abs(daysLeft)} يوم` : `${daysLeft} يوم متبقي`}
                      </div>
                    )}
                  </div>
                  {/* Price */}
                  <div className="text-sm font-bold" style={{ color: '#c9a84c' }}>
                    {fmtPay(tx.price, tx.currency || 'SYP')}
                  </div>
                  {/* Open payment */}
                  <div>
                    {(tx.currency === 'SYP' ? Math.round(tx.remaining) : Math.round(tx.remaining * 100) / 100) > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold" style={{ color: '#f87171' }}>
                          {fmtPay(tx.remaining, tx.currency || 'SYP')}
                        </span>
                        <Button variant="secondary" size="sm"
                          className="h-7 px-2 text-xs w-fit"
                          style={{ background: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.38)', color: '#f87171', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: 'inset 0 1px 0 rgba(239,68,68,0.20)' }}
                          icon={<Banknote size={11} />}
                          onClick={() => openSettle(tx)}>
                          تسوية
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>✓ مدفوع</span>
                    )}
                  </div>
                  {/* Status */}
                  <StatusBadge status={tx.status} className="justify-self-start" />
                  {/* Action */}
                  <div className="flex items-center justify-center">
                    {tx.status === 'active' && (
                      <Button variant="secondary" size="sm"
                        className="h-7 px-2 text-xs w-fit"
                        icon={<RotateCcw size={11} />}
                        onClick={() => { setReturning(tx); setNeedsCleaning(false); }}>
                        إرجاع
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── Open sales (unpaid) ─────────────────────────────────────── */}
      {openSales.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10, type: 'spring', stiffness: 400, damping: 38 }}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>مبيعات بدفع مفتوح</h2>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.22)', fontFamily: 'Cairo, sans-serif' }}>
              {openSales.length}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/[0.10]"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {/* Header */}
            <div className="sticky top-0 z-10 grid gap-x-6 px-6 py-2.5 text-xs font-semibold"
              style={{ ...RENTALS_HDR, gridTemplateColumns: 'repeat(5, 1fr) 120px 100px' }}>
              <span>العميل</span><span>الهاتف</span><span>الفستان</span>
              <span>السعر</span><span>المدفوع</span><span>مستحق</span><span></span>
            </div>
            <AnimatePresence initial={false}>
              {openSales.map((tx) => (
                <motion.div key={tx.id} variants={item} layout exit={{ opacity: 0, x: 10 }}
                  className="grid gap-x-6 px-6 py-3 border-b last:border-b-0"
                  style={{
                    gridTemplateColumns: 'repeat(5, 1fr) 120px 100px',
                    alignItems: 'center',
                    borderColor: 'rgba(255,255,255,0.05)',
                    borderRight: '3px solid rgba(248,113,113,0.40)',
                  }}
                >
                  <div>
                    <p className="text-sm font-semibold truncate" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>{tx.customer_name}</p>
                  </div>
                  {tx.customer_phone
                    ? <p className="flex items-center gap-1 text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}><Phone size={10} />{toWesternDigits(tx.customer_phone)}</p>
                    : <span className="text-xs" style={{ color: textMuted }}>—</span>}
                  <span className="text-sm font-bold" style={{ color: '#c9a84c' }}>{tx.dress_code}</span>
                  <span className="text-sm font-bold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>{fmtPay(tx.price, tx.currency || 'SYP')}</span>
                  <span className="text-sm" style={{ color: '#4ade80', fontFamily: 'Cairo, sans-serif' }}>{fmtPay(tx.deposit, tx.currency || 'SYP')}</span>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold" style={{ color: '#f87171' }}>{fmtPay(tx.remaining, tx.currency || 'SYP')}</span>
                    <Button variant="secondary" size="sm"
                      className="h-7 px-2 text-xs w-fit"
                      style={{ background: 'rgba(239,68,68,0.18)', borderColor: 'rgba(239,68,68,0.38)', color: '#f87171', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                      icon={<Banknote size={11} />}
                      onClick={() => openSettle(tx)}>
                      تسوية
                    </Button>
                  </div>
                  <div />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* ── Rental form popup ───────────────────────────────────────── */}
      <RentalForm open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />

      {/* ── Settle payment modal ────────────────────────────────────── */}
      {settling && (
        <Modal open onClose={() => setSettling(null)} title="تسوية الدفع" size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setSettling(null)} disabled={settleLoading}>إلغاء</Button>
              <Button variant="gold" onClick={handleSettle} loading={settleLoading}
                disabled={!(parseFloat(payAmount) > 0)}>
                تسوية
              </Button>
            </>
          }
        >
          {(() => {
            const origCurr = (settling.currency || 'SYP') as PayCurrency;
            const amtInOriginal = payToOriginal(parseFloat(payAmount) || 0, payCurrency, settling);
            const isDifferentCurr = payCurrency !== origCurr;
            return (
              <div className="space-y-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
                {/* Remaining info */}
                <div className="px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)' }}>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>المبلغ المتبقي</p>
                  <p className="text-lg font-bold" style={{ color: '#f87171' }}>
                    {fmtPay(settling.remaining, settling.currency || 'SYP')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    العميل: {settling.customer_name}
                  </p>
                </div>

                {/* Payment currency picker */}
                <div>
                  <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>عملة الدفع</p>
                  <div className="flex gap-1.5">
                    {PAY_CURRENCIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => {
                          setPayCurrency(c);
                          const converted = originalToPay(settling.remaining, c, settling);
                          const r = c === 'SYP' ? Math.round(converted) : Math.round(converted * 100) / 100;
                          setPayAmount(r.toString());
                        }}
                        className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
                        style={{
                          background: payCurrency === c ? 'rgba(201,168,76,0.22)' : 'rgba(255,255,255,0.07)',
                          color: payCurrency === c ? '#c9a84c' : 'rgba(255,255,255,0.45)',
                          border: payCurrency === c ? '1px solid rgba(201,168,76,0.40)' : '1px solid rgba(255,255,255,0.10)',
                        }}>
                        {DISP_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount input */}
                <div>
                  <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>المبلغ المدفوع</p>
                  <input
                    type="number" min="0" step="any"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl outline-none text-sm"
                    style={{
                      fontFamily: 'Cairo, sans-serif',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: 'rgba(255,255,255,0.88)',
                      colorScheme: 'dark',
                    }}
                  />
                </div>

                {/* Conversion hint if paying in different currency */}
                {isDifferentCurr && parseFloat(payAmount) > 0 && (
                  <div className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>يعادل بسعر يوم العقد: </span>
                    <span style={{ color: '#c9a84c', fontWeight: 700 }}>{fmtPay(amtInOriginal, origCurr)}</span>
                    {amtInOriginal > settling.remaining + 0.001 && (
                      <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                        يتجاوز المتبقي — سيُحسب {fmtPay(settling.remaining, settling.currency || 'SYP')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ── Return confirm ──────────────────────────────────────────── */}
      {returning && (
        <Modal open onClose={() => { setReturning(null); setCleanerName(''); }} title="تأكيد الإرجاع" size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setReturning(null); setCleanerName(''); }} disabled={returnLoading}>إلغاء</Button>
              <Button variant="primary" onClick={handleReturn} loading={returnLoading}>تأكيد</Button>
            </>
          }
        >
          <div className="space-y-4">
            <p style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,42,24,0.65)', fontFamily: 'Cairo, sans-serif' }}>
              إرجاع الفستان <strong style={{ color: '#c9a84c' }}>{returning.dress_code}</strong> من{' '}
              <strong style={{ color: isDark ? 'rgba(255,255,255,0.90)' : 'rgba(55,38,18,0.90)' }}>{returning.customer_name}</strong>
            </p>
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)' }}>
              <input type="checkbox" checked={needsCleaning} onChange={e => setNeedsCleaning(e.target.checked)}
                className="w-4 h-4 rounded" style={{ accentColor: '#c9a84c' }} />
              <span className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(60,42,24,0.70)', fontFamily: 'Cairo, sans-serif' }}>
                يحتاج تنظيف
              </span>
            </label>
            {needsCleaning && (
              <>
                <p className="text-xs p-2 rounded-lg" style={{ color: '#c084fc', background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.20)', fontFamily: 'Cairo, sans-serif' }}>
                  سيتم تحويل الفستان لقائمة التنظيف
                </p>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,42,24,0.60)', fontFamily: 'Cairo, sans-serif' }}>
                    اسم المنظِّف (اختياري)
                  </label>
                  <input
                    value={cleanerName}
                    onChange={e => setCleanerName(e.target.value)}
                    placeholder="أدخل اسم المنظِّف..."
                    style={{
                      width: '100%',
                      fontFamily: 'Cairo, sans-serif',
                      fontSize: '0.85rem',
                      background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)',
                      border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.10)',
                      borderRadius: 10,
                      color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)',
                      outline: 'none',
                      padding: '8px 12px',
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
