import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ShoppingBag, Loader2, CheckCircle, XCircle, ArrowRight, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/Button';
import { GlassDatePicker } from '../../components/GlassDatePicker';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/Modal';
import { formatDateTime } from '../../utils/formatters';
import { glassInput, glassInputStyle } from '../../utils/glassInput';
import type { Transaction } from '../../types';
import { SaleForm } from './SaleForm';

const SALE_CURR_LABELS: Record<string, string> = { SYP: 'ل.س', USD: '$', TRY: '₺' };
function fmtSaleAmt(amount: number, tx: Transaction): string {
  const c = tx.currency || 'SYP';
  const rounded = c === 'SYP' ? Math.round(amount) : Math.round(amount * 100) / 100;
  return `${rounded.toLocaleString('en-US', { maximumFractionDigits: c === 'SYP' ? 0 : 2 })} ${SALE_CURR_LABELS[c] ?? c}`;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  active:    { label: 'نشط',    color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  completed: { label: 'مكتمل', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  cancelled: { label: 'ملغي',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function SalesList() {
  const { addToast, theme, language } = useUIStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = theme === 'dark';

  const [sales, setSales] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [cancelling, setCancelling] = useState<Transaction | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [completing, setCompleting] = useState<Transaction | null>(null);
  const [amountPaid, setAmountPaid] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.transactions.getAll({ category: 'sale' });
      setSales(data);
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let result = sales;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(tx =>
        (tx.customer_name ?? '').toLowerCase().includes(q) ||
        (tx.dress_code ?? '').toLowerCase().includes(q) ||
        (tx.dress_size ?? '').toLowerCase().includes(q) ||
        (tx.customer_phone ?? '').includes(q)
      );
    }
    if (statusFilter) result = result.filter(tx => tx.status === statusFilter);
    if (dateFrom) result = result.filter(tx => tx.created_at >= dateFrom);
    if (dateTo)   result = result.filter(tx => tx.created_at <= dateTo + 'T23:59:59');
    return result;
  }, [sales, search, statusFilter, dateFrom, dateTo]);

  const handleCancel = async () => {
    if (!cancelling) return;
    setCancelLoading(true);
    try {
      await api.transactions.cancel(cancelling.id);
      addToast('success', 'تم إلغاء البيع');
      setCancelling(null); load();
    } catch (e) { addToast('error', String(e)); }
    finally { setCancelLoading(false); }
  };

  const handleComplete = async () => {
    if (!completing) return;
    setCompleteLoading(true);
    try {
      await api.transactions.complete(completing.id, +(amountPaid || 0));
      addToast('success', 'تم اكتمال البيع');
      setCompleting(null); setAmountPaid(''); load();
    } catch (e) { addToast('error', String(e)); }
    finally { setCompleteLoading(false); }
  };

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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all"
          style={{
            fontFamily: 'Cairo, sans-serif',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
            color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.55)',
            border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)',
          }}>
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
            المبيعات
          </h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
            {filtered.length} من {sales.length} معاملة
          </p>
        </div>
        <Button variant="gold" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          بيع جديد
        </Button>
      </motion.div>

      {/* Status chips */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.06 }}
        className="flex flex-wrap gap-2">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <button key={key}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{
              fontFamily: 'Cairo, sans-serif',
              background: statusFilter === key ? meta.bg : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)',
              border: `1px solid ${statusFilter === key ? meta.color + '44' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,42,24,0.08)'}`,
              color: statusFilter === key ? meta.color : textMuted,
              fontWeight: statusFilter === key ? 700 : 500,
            }}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
            {meta.label}
            <span className="opacity-60 text-[10px]">({sales.filter(tx => tx.status === key).length})</span>
          </button>
        ))}
      </motion.div>

      {/* Smart filter */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث باسم العميل، كود الفستان، المقاس..."
            style={{ ...inputStyle, paddingInlineStart: 34, width: '100%' }} />
        </div>
        <GlassDatePicker value={dateFrom} onChange={v => setDateFrom(v)} placeholder="من تاريخ" containerClass="w-[160px]" />
        <span style={{ color: textMuted, fontSize: '0.78rem', fontFamily: 'Cairo' }}>—</span>
        <GlassDatePicker value={dateTo} onChange={v => setDateTo(v)} placeholder="إلى تاريخ" containerClass="w-[160px]" />
        {(search || statusFilter || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }}
            className="px-3 py-1.5 rounded-xl text-xs"
            style={{ fontFamily: 'Cairo, sans-serif', color: '#f87171',
              background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
            مسح
          </button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-24" style={{ color: textMuted }}>
          <ShoppingBag size={52} className="mb-3 opacity-30" />
          <p style={{ fontFamily: 'Cairo, sans-serif' }}>
            {sales.length === 0 ? 'لا توجد مبيعات' : 'لا توجد نتائج للفلتر المحدد'}
          </p>
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
          <AnimatePresence initial={false}>
            {filtered.map((tx) => (
              <motion.div key={tx.id} variants={item} layout exit={{ opacity: 0, x: 10 }}>
                <motion.div
                  whileHover={{ x: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="rounded-2xl p-4"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.50)',
                    border: `1px solid ${STATUS_META[tx.status] ? STATUS_META[tx.status].color + '22' : 'rgba(201,168,76,0.12)'}`,
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.06)',
                  }}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 items-start">
                    {/* Customer */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>العميل</p>
                      <p className="text-sm font-semibold truncate" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                        {tx.customer_name || tx.customer_id}
                      </p>
                      {tx.customer_phone && (
                        <p className="text-xs mt-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>{tx.customer_phone}</p>
                      )}
                    </div>
                    {/* Dress */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>الفستان</p>
                      <p className="text-sm font-bold" style={{ color: '#c9a84c', fontFamily: 'Cairo, sans-serif' }}>
                        {tx.dress_code || tx.dress_id}
                      </p>
                    </div>
                    {/* Size */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>المقاس</p>
                      <p className="text-sm" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                        {tx.dress_size || '—'}
                      </p>
                    </div>
                    {/* Price */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>السعر</p>
                      <p className="text-sm font-bold" style={{ color: '#c9a84c', fontFamily: 'Cairo, sans-serif' }}>
                        {fmtSaleAmt(tx.price, tx)}
                      </p>
                      {tx.remaining > 0 && (
                        <p className="text-xs" style={{ color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>
                          متبقي: {fmtSaleAmt(tx.remaining, tx)}
                        </p>
                      )}
                    </div>
                    {/* Deposit */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>المدفوع</p>
                      <p className="text-sm" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                        {fmtSaleAmt(tx.deposit, tx)}
                      </p>
                    </div>
                    {/* Status */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>الحالة</p>
                      <StatusBadge status={tx.status} />
                    </div>
                    {/* Date */}
                    <div>
                      <p className="text-xs mb-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>التاريخ</p>
                      <p className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                        {formatDateTime(tx.created_at, language)}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {tx.status === 'active' && (
                        <>
                          {tx.remaining > 0 && (
                            <button onClick={() => { setCompleting(tx); setAmountPaid(tx.remaining.toString()); }}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#4ade80', background: 'rgba(74,222,128,0.10)' }}
                              title="تسجيل دفعة">
                              <CheckCircle size={16} />
                            </button>
                          )}
                          <button onClick={() => setCancelling(tx)}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{ color: '#f87171', background: 'rgba(248,113,113,0.10)' }}
                            title="إلغاء">
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <SaleForm open={showForm} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />

      <ConfirmDialog open={!!cancelling} onClose={() => setCancelling(null)} onConfirm={handleCancel}
        loading={cancelLoading} title="إلغاء البيع" message="هل أنت متأكد من إلغاء هذا البيع؟ سيتم إعادة الفستان للمخزون." danger confirmLabel="إلغاء البيع" />

      {completing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setCompleting(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="relative rounded-2xl p-6 w-80 border border-gold-400/[0.15] backdrop-blur-2xl"
            style={{
              background: 'rgba(12,16,26,0.90)',
              boxShadow: '0 0 0 1px rgba(201,168,76,0.06), 0 32px 64px rgba(0,0,0,0.28)',
            }}
          >
            <h3 className="text-base font-bold text-white/90 mb-4">تسجيل الدفعة</h3>
            <p className="text-sm text-white/50 mb-3">المبلغ المتبقي: <span className="font-bold text-red-400">{fmtSaleAmt(completing.remaining, completing)}</span></p>
            <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="المبلغ المدفوع"
              className={glassInput + ' mb-4'} style={glassInputStyle} />
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setCompleting(null)} className="flex-1">إلغاء</Button>
              <Button variant="primary" onClick={handleComplete} loading={completeLoading} className="flex-1">تأكيد</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
