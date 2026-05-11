import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Pencil, Trash2, Eye, Loader2, Sparkles, Search, ArrowRight, History, X, ShoppingBag, RefreshCw, User, CalendarDays, Brush } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../../components/Button';
import { GlassDatePicker } from '../../components/GlassDatePicker';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog } from '../../components/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { Dress, Transaction } from '../../types';
import { DressForm } from './DressForm';
import { DressDetail } from './DressDetail';

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  available: { label: 'متاح',   color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
  reserved:  { label: 'محجوز',  color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  rented:    { label: 'مؤجَّر', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  cleaning:  { label: 'تنظيف',  color: '#c084fc', bg: 'rgba(192,132,252,0.12)' },
  sold:      { label: 'مباع',   color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
};

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function InventoryList() {
  const { t } = useTranslation();
  const { language, theme } = useUIStore();
  const { canDelete } = usePermissions();
  const navigate = useNavigate();
  const isDark = theme === 'dark';
  const currency = '$';

  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Dress | null>(null);
  const [viewing, setViewing] = useState<Dress | null>(null);
  const [deleting, setDeleting] = useState<Dress | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [historyDress, setHistoryDress] = useState<Dress | null>(null);
  const [dressStats, setDressStats] = useState<Record<string, { count: number; total: number }>>({});
  const { addToast } = useUIStore();

  // Smart filter state
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom]       = useState('');
  const [dateTo, setDateTo]           = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.inventory.getAll();
      setDresses(data);
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute per-dress booking stats from all transactions
  useEffect(() => {
    api.transactions.getAll().then(txs => {
      const stats: Record<string, { count: number; total: number }> = {};
      for (const tx of txs) {
        if (!tx.dress_id || tx.status === 'cancelled') continue;
        const s = stats[tx.dress_id] ?? (stats[tx.dress_id] = { count: 0, total: 0 });
        s.count++;
        s.total += tx.price || 0;
      }
      setDressStats(stats);
    }).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = dresses;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(d =>
        d.code.toLowerCase().includes(q) ||
        (d.color ?? '').toLowerCase().includes(q) ||
        (d.style ?? '').toLowerCase().includes(q) ||
        (d.size ?? '').toLowerCase().includes(q) ||
        (d.notes ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter(d => d.status === statusFilter);
    if (dateFrom) result = result.filter(d => d.created_at >= dateFrom);
    if (dateTo)   result = result.filter(d => d.created_at <= dateTo + 'T23:59:59');
    return result;
  }, [dresses, search, statusFilter, dateFrom, dateTo]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.inventory.delete(deleting.id);
      addToast('success', t('messages.deleted'));
      setDeleting(null);
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setDeleteLoading(false); }
  };

  const handleMarkCleaning = async (dress: Dress) => {
    try {
      await api.transactions.markCleaningDone(dress.id);
      addToast('success', 'تم تحديث الحالة إلى متاح');
      load();
    } catch (e) { addToast('error', String(e)); }
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
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ fontFamily:'Cairo,sans-serif', background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.60)', border:'1px solid rgba(255,255,255,0.10)' }}>
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
            {t('inventory.title')}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
            {filtered.length} من {dresses.length} فستان
          </p>
        </div>
        <Button variant="gold" icon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true); }}>
          {t('inventory.addDress')}
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
            <span className="opacity-60 text-[10px]">
              ({dresses.filter(d => d.status === key).length})
            </span>
          </button>
        ))}
      </motion.div>

      {/* Smart search bar */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
        className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="بحث بكود الفستان، اللون، الأسلوب، المقاس..."
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
        <div className="flex flex-col items-center justify-center py-24" style={{ color: textMuted }}>
          <Package size={52} className="mb-3 opacity-30" />
          <p className="text-lg font-medium" style={{ fontFamily: 'Cairo, sans-serif' }}>
            {dresses.length === 0 ? t('inventory.noResults') : 'لا توجد نتائج للفلتر المحدد'}
          </p>
        </div>
      ) : (
        <motion.div
          variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          <AnimatePresence initial={false}>
            {filtered.map((dress) => (
              <motion.div key={dress.id} variants={item} layout exit={{ opacity: 0, scale: 0.95 }}>
                <DressCard dress={dress} currency={currency} isDark={isDark}
                  stats={dressStats[dress.id]}
                  onView={() => setViewing(dress)}
                  onEdit={() => { setEditing(dress); setShowForm(true); }}
                  onDelete={canDelete ? () => setDeleting(dress) : undefined}
                  onCleaningDone={dress.status === 'cleaning' ? () => handleMarkCleaning(dress) : undefined}
                  onHistory={() => setHistoryDress(dress)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {showForm && (
        <DressForm
          dress={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
      {viewing && <DressDetail dress={viewing} onClose={() => setViewing(null)} />}
      {historyDress && <DressHistoryModal dress={historyDress} onClose={() => setHistoryDress(null)} />}
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)}
        onConfirm={handleDelete} loading={deleteLoading}
        title={t('inventory.deleteDress')}
        message={`${t('messages.confirmDelete')}\n${deleting?.code}`}
        danger confirmLabel={t('actions.delete')}
      />
    </div>
  );
}

interface DressCardProps {
  dress: Dress; currency: string; isDark: boolean;
  stats?: { count: number; total: number };
  onView: () => void; onEdit: () => void;
  onDelete?: () => void; onCleaningDone?: () => void; onHistory: () => void;
}

// Dress History Modal
function DressHistoryModal({ dress, onClose }: { dress: Dress; onClose: () => void }) {
  const { language, theme } = useUIStore();
  const isDark = theme === 'dark';
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.inventory.getHistory(dress.id)
      .then(setTransactions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dress.id]);

  const textMuted = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.42)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const gold = '#c9a84c';

  const typeLabel = (t: Transaction) => t.transaction_type === 'sale' ? 'بيع' : 'إيجار';
  const typeColor = (t: Transaction) => t.transaction_type === 'sale' ? '#4ade80' : '#60a5fa';
  const statusLabel = (s: string) => ({ active: 'نشط', completed: 'مكتمل', cancelled: 'ملغي' }[s] ?? s);
  const statusColor = (s: string) => ({ active: '#60a5fa', completed: '#4ade80', cancelled: '#f87171' }[s] ?? '#fff');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-3xl overflow-hidden"
          style={{
            background: isDark ? 'rgba(20,14,8,0.92)' : 'rgba(255,255,255,0.94)',
            border: `1px solid ${gold}44`,
            boxShadow: '0 32px 64px rgba(0,0,0,0.28)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
            style={{ borderBottom: `1px solid ${gold}33` }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${gold}22`, border: `1px solid ${gold}44` }}>
                <History size={18} style={{ color: gold }} />
              </div>
              <div>
                <h2 className="font-bold text-base" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                  سجل الفستان — {dress.code}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                  {[dress.style, dress.color, dress.size].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
              style={{ color: textMuted, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Current status banner */}
          {dress.status === 'cleaning' && dress.cleaner_name && (
            <div className="mx-6 mt-4 px-4 py-2.5 rounded-xl flex items-center gap-2 flex-shrink-0"
              style={{ background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.28)' }}>
              <Brush size={14} style={{ color: '#c084fc' }} />
              <span className="text-xs font-semibold" style={{ color: '#c084fc', fontFamily: 'Cairo, sans-serif' }}>
                قيد التنظيف — {dress.cleaner_name}
              </span>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin" style={{ color: gold }} />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3" style={{ color: textMuted }}>
                <History size={40} className="opacity-25" />
                <p className="text-sm" style={{ fontFamily: 'Cairo, sans-serif' }}>لا يوجد سجل لهذا الفستان</p>
              </div>
            ) : (
              transactions.map((tx, i) => (
                <motion.div key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl p-4 flex flex-col gap-2"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)',
                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)',
                    borderRight: `3px solid ${typeColor(tx)}55`,
                  }}
                >
                  {/* Row 1: type + status + date */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ color: typeColor(tx), background: `${typeColor(tx)}18` }}>
                      {tx.transaction_type === 'sale'
                        ? <ShoppingBag size={11} />
                        : <RefreshCw size={11} />}
                      {typeLabel(tx)}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ color: statusColor(tx.status), background: `${statusColor(tx.status)}18` }}>
                      {statusLabel(tx.status)}
                    </span>
                    <span className="text-xs ms-auto" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                      {tx.created_at.slice(0, 10)}
                    </span>
                  </div>

                  {/* Row 2: customer */}
                  <div className="flex items-center gap-2">
                    <User size={12} style={{ color: textMuted }} />
                    <span className="text-sm font-semibold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                      {tx.customer_name ?? '—'}
                    </span>
                    {tx.customer_phone && (
                      <span className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif', direction: 'ltr' }}>
                        {tx.customer_phone}
                      </span>
                    )}
                  </div>

                  {/* Row 3: dates for rental */}
                  {tx.transaction_type === 'rental' && tx.rental_start && (
                    <div className="flex items-center gap-2">
                      <CalendarDays size={12} style={{ color: textMuted }} />
                      <span className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                        {formatDate(tx.rental_start, language)} — {tx.rental_end ? formatDate(tx.rental_end, language) : '?'}
                      </span>
                      {tx.return_date && (
                        <span className="text-xs ms-2" style={{ color: '#4ade80', fontFamily: 'Cairo, sans-serif' }}>
                          أُرجع: {tx.return_date.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Row 4: price */}
                  <div className="flex items-center gap-4 text-xs" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    <span style={{ color: textMuted }}>
                      السعر: <span className="font-bold" style={{ color: gold }}>
                        {formatCurrency(tx.price, tx.currency === 'USD' ? '$' : tx.currency === 'TRY' ? '₺' : 'SYP', language)}
                      </span>
                    </span>
                    {tx.deposit > 0 && (
                      <span style={{ color: textMuted }}>
                        عربون: <span className="font-semibold" style={{ color: '#4ade80' }}>
                          {formatCurrency(tx.deposit, tx.currency === 'USD' ? '$' : tx.currency === 'TRY' ? '₺' : 'SYP', language)}
                        </span>
                      </span>
                    )}
                    {tx.remaining > 0 && (
                      <span style={{ color: textMuted }}>
                        متبقي: <span className="font-semibold" style={{ color: '#f87171' }}>
                          {formatCurrency(tx.remaining, tx.currency === 'USD' ? '$' : tx.currency === 'TRY' ? '₺' : 'SYP', language)}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {tx.notes && (
                    <p className="text-xs italic" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                      {tx.notes}
                    </p>
                  )}
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 flex-shrink-0 flex items-center justify-between"
            style={{ borderTop: `1px solid ${gold}22` }}>
            <div className="flex items-center gap-3">
              <span className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                {transactions.filter(t => t.status !== 'cancelled').length} حجز
              </span>
              {transactions.length > 0 && (
                <span className="text-xs font-bold" style={{ color: gold, fontFamily: 'Cairo, sans-serif' }}>
                  إجمالي الإيرادات: {transactions.filter(t => t.status !== 'cancelled').reduce((s, t) => s + (t.price || 0), 0).toLocaleString()} $
                </span>
              )}
            </div>
            <button onClick={onClose}
              className="px-4 py-1.5 rounded-xl text-sm font-semibold"
              style={{ fontFamily: 'Cairo, sans-serif', color: textMuted,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.08)' }}>
              إغلاق
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// DressCard
function DressCard({ dress, currency, isDark, stats, onView, onEdit, onDelete, onCleaningDone, onHistory }: DressCardProps) {
  const { language } = useUIStore();
  const { t } = useTranslation();
  const textMuted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="rounded-2xl border overflow-hidden flex flex-col cursor-pointer group"
      style={{
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.50)',
        border: isDark ? '1px solid rgba(255,255,255,0.13)' : '1px solid transparent',
        backdropFilter: 'blur(16px) saturate(148%)',
        WebkitBackdropFilter: 'blur(16px) saturate(148%)',
        boxShadow: isDark
          ? '0 12px 28px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.07)'
          : '0 6px 18px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.84)',
      }}
    >
      {/* Image */}
      <div className="h-28 relative overflow-hidden flex-shrink-0"
        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)' }}>
        {dress.image_path ? (
          <img src={dress.image_path} alt={dress.code} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={28} style={{ color: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(60,42,24,0.10)' }} />
          </div>
        )}
        <div className="absolute top-1.5 start-1.5"><StatusBadge status={dress.status} size="sm" /></div>
        {/* History badge */}
        {stats && stats.count > 0 && (
          <button
            onClick={e => { e.stopPropagation(); onHistory(); }}
            className="absolute top-1.5 end-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(201,168,76,0.88)', color: '#fff', backdropFilter: 'blur(8px)' }}
            title={`${stats.count} حجز — إجمالي ${formatCurrency(stats.total, currency, language)}`}
          >
            <History size={9} />
            {stats.count}
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-col gap-1 p-2.5">
        <div className="flex items-center justify-between gap-1">
          <span className="font-bold text-sm truncate" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>{dress.code}</span>
        </div>
        {(dress.color || dress.style || dress.size) && (
          <p className="text-[11px] truncate" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
            {[dress.style, dress.color, dress.size].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
            <span className="font-semibold" style={{ color: '#c9a84c' }}>{formatCurrency(dress.price, currency, language)}</span>
          </span>
          {stats && stats.count > 0 && (
            <span className="text-[10px]" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
              {stats.count} حجز · <span style={{ color: '#4ade80' }}>{formatCurrency(stats.total, currency, language)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center px-1 pb-1"
        style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(60,42,24,0.05)' }}>
        <button onClick={onView} className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg text-[11px]"
          style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.color = textMain)}
          onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
          <Eye size={11} /> {t('actions.view')}
        </button>
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg text-[11px]"
          style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.color = textMain)}
          onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
          <Pencil size={11} /> {t('actions.edit')}
        </button>
        <button onClick={onHistory} className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg text-[11px] relative"
          style={{ color: '#c9a84c88', fontFamily: 'Cairo, sans-serif' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#c9a84c')}
          onMouseLeave={e => (e.currentTarget.style.color = '#c9a84c88')}>
          <History size={11} /> سجل
        </button>
        {onCleaningDone && (
          <button onClick={onCleaningDone} className="p-1.5 rounded-lg"
            style={{ color: '#c084fc' }}>
            <Sparkles size={11} />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-1.5 rounded-lg"
            style={{ color: 'rgba(248,113,113,0.55)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.55)')}>
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
