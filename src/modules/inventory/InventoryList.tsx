import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Package, Pencil, Trash2, Eye, Loader2, Sparkles, Search,
  ArrowRight, History, X, ShoppingBag, RefreshCw, User, CalendarDays,
  Brush, TrendingUp, DollarSign, ArrowUpDown,
} from 'lucide-react';
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

const STATUS_META_BASE: Record<string, { label: string; darkColor: string; lightColor: string; bg: string }> = {
  available: { label: 'متاح',   darkColor: '#4ade80', lightColor: '#15803d', bg: 'rgba(74,222,128,0.12)' },
  reserved:  { label: 'محجوز',  darkColor: '#fbbf24', lightColor: '#b45309', bg: 'rgba(251,191,36,0.12)' },
  rented:    { label: 'مؤجَّر', darkColor: '#60a5fa', lightColor: '#1d4ed8', bg: 'rgba(96,165,250,0.12)' },
  cleaning:  { label: 'تنظيف',  darkColor: '#c084fc', lightColor: '#7c3aed', bg: 'rgba(192,132,252,0.12)' },
  sold:      { label: 'مباع',   darkColor: '#f87171', lightColor: '#dc2626', bg: 'rgba(248,113,113,0.12)' },
};

type SortMode = 'default' | 'most_rented' | 'most_revenue';

interface DressStatMap {
  [dress_id: string]: { rental_count: number; sale_count: number; total_revenue: number };
}

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
  const { canDelete, isEmployee } = usePermissions();
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
  const { addToast } = useUIStore();

  // Filter state
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [sortMode, setSortMode]         = useState<SortMode>('default');
  const [statsMap, setStatsMap]         = useState<DressStatMap>({});
  const [statsLoading, setStatsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.inventory.getAll();
      setDresses(data);
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const rows = await api.inventory.getAllDressStats();
      const map: DressStatMap = {};
      for (const r of rows) map[r.dress_id] = r;
      setStatsMap(map);
    } catch (e) { addToast('error', String(e)); }
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    if (sortMode !== 'default') loadStats();
  }, [sortMode]);

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

    if (sortMode === 'most_rented') {
      result = [...result].sort((a, b) =>
        ((statsMap[b.id]?.rental_count ?? 0) - (statsMap[a.id]?.rental_count ?? 0))
      );
    } else if (sortMode === 'most_revenue') {
      result = [...result].sort((a, b) =>
        ((statsMap[b.id]?.total_revenue ?? 0) - (statsMap[a.id]?.total_revenue ?? 0))
      );
    }
    return result;
  }, [dresses, search, statusFilter, dateFrom, dateTo, sortMode, statsMap]);

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

  const textMuted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.75)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const STATUS_META = Object.fromEntries(Object.entries(STATUS_META_BASE).map(([k, v]) => [k, { ...v, color: isDark ? v.darkColor : v.lightColor }]));

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

  const SORT_OPTIONS: { key: SortMode; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'most_rented',  label: 'الأكثر إيجاراً', icon: <TrendingUp size={12} />, color: isDark ? '#60a5fa' : '#1d4ed8' },
    { key: 'most_revenue', label: 'الأعلى إيراداً',  icon: <DollarSign size={12} />, color: isDark ? '#4ade80' : '#15803d' },
  ];

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

      {/* Search + sort bar */}
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

        {/* Sort by stats */}
        <div className="flex items-center gap-1.5">
          <ArrowUpDown size={13} style={{ color: textMuted }} />
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key}
              onClick={() => setSortMode(sortMode === opt.key ? 'default' : opt.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: sortMode === opt.key ? `${opt.color}18` : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)',
                border: `1px solid ${sortMode === opt.key ? opt.color + '55' : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,42,24,0.08)'}`,
                color: sortMode === opt.key ? opt.color : textMuted,
                fontWeight: sortMode === opt.key ? 700 : 500,
              }}>
              {opt.icon}{opt.label}
              {statsLoading && sortMode === opt.key && <Loader2 size={10} className="animate-spin" />}
            </button>
          ))}
        </div>

        {(search || statusFilter || dateFrom || dateTo || sortMode !== 'default') && (
          <button onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setSortMode('default'); }}
            className="px-3 py-1.5 rounded-xl text-xs"
            style={{ fontFamily: 'Cairo, sans-serif', color: isDark ? '#f87171' : '#dc2626',
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
                <DressCard
                  dress={dress}
                  currency={currency}
                  isDark={isDark}
                  stats={statsMap[dress.id]}
                  showStats={sortMode !== 'default'}
                  isEmployee={isEmployee}
                  onView={() => setViewing(dress)}
                  onEdit={() => { setEditing(dress); setShowForm(true); }}
                  onDelete={canDelete ? () => setDeleting(dress) : undefined}
                  onCleaningDone={dress.status === 'cleaning' ? () => handleMarkCleaning(dress) : undefined}
                  onHistory={isEmployee ? undefined : () => setHistoryDress(dress)}
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
      {historyDress && <DressHistoryModal dress={historyDress} onClose={() => setHistoryDress(null)} isEmployee={isEmployee} />}
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
  dress: Dress;
  currency: string;
  isDark: boolean;
  stats?: { rental_count: number; sale_count: number; total_revenue: number };
  showStats: boolean;
  isEmployee?: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onCleaningDone?: () => void;
  onHistory?: () => void;
}

// ─── Dress History Modal ──────────────────────────────────────────────────────

type CleaningEvent = { id: string; description: string; created_at: string; user_name?: string };

type TimelineEntry =
  | { kind: 'transaction'; data: Transaction }
  | { kind: 'cleaning';     data: CleaningEvent };

type DisplayCur = 'USD' | 'SYP' | 'TRY';

// dress.price is stored in SYP. Convert it to USD using the tx snapshot.
function dressCostUSD(dressPriceSYP: number, tx: Transaction): number {
  return dressPriceSYP / (tx.usd_to_syp_snapshot || 14000);
}

// Convert a transaction amount to USD using its frozen snapshot.
function txAmountToUSD(amount: number, tx: Transaction): number {
  if (tx.currency === 'USD') return amount;
  if (tx.currency === 'TRY') return amount / (tx.usd_to_try_snapshot || 34);
  return amount / (tx.usd_to_syp_snapshot || 14000);
}

// Render a USD amount in the chosen display currency using the tx snapshot.
function dispAmount(usd: number, cur: DisplayCur, tx: Transaction): string {
  let val: number;
  if (cur === 'USD') val = usd;
  else if (cur === 'TRY') val = usd * (tx.usd_to_try_snapshot || 34);
  else val = usd * (tx.usd_to_syp_snapshot || 14000);

  if (cur === 'USD') return `$${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (cur === 'TRY') return `₺${Math.round(val).toLocaleString()}`;
  return `${Math.round(val).toLocaleString()} SYP`;
}

// Render a USD total using the live exchange rate (for the stats bar).
function dispTotal(usd: number, cur: DisplayCur, liveRate: number, liveTry: number): string {
  let val: number;
  if (cur === 'USD') val = usd;
  else if (cur === 'TRY') val = usd * liveTry;
  else val = usd * liveRate;

  if (cur === 'USD') return `$${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (cur === 'TRY') return `₺${Math.round(val).toLocaleString()}`;
  return `${Math.round(val).toLocaleString()} SYP`;
}

function DressHistoryModal({ dress, onClose, isEmployee }: { dress: Dress; onClose: () => void; isEmployee?: boolean }) {
  const { language, theme, exchangeRates } = useUIStore();
  const isDark = theme === 'dark';
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [stats, setStats] = useState<{ rental_count: number; sale_count: number; cleaning_count: number; total_revenue: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Single display currency — controls all numbers in the modal
  const [displayCur, setDisplayCur] = useState<DisplayCur>('USD');

  const liveRate = exchangeRates.usd_to_syp || 14000;
  const liveTry  = exchangeRates.usd_to_try  || 34;

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.inventory.getHistory(dress.id),
      api.inventory.getDressStats(dress.id),
      api.inventory.getCleaningEvents(dress.id),
    ]).then(([txs, s, cleanings]) => {
      const entries: TimelineEntry[] = [
        ...txs.map(t => ({ kind: 'transaction' as const, data: t })),
        ...cleanings.map(c => ({ kind: 'cleaning' as const, data: c })),
      ].sort((a, b) => b.data.created_at.localeCompare(a.data.created_at));
      setTimeline(entries);
      setStats(s);
    }).catch(e => {
      setError(String(e));
    }).finally(() => setLoading(false));
  }, [dress.id]);

  // Total profit in USD across all non-cancelled transactions
  const totalProfitUSD = useMemo(() => {
    return timeline
      .filter(e => e.kind === 'transaction' && (e as { kind: 'transaction'; data: Transaction }).data.status !== 'cancelled')
      .reduce((sum, e) => {
        const tx = (e as { kind: 'transaction'; data: Transaction }).data;
        return sum + txAmountToUSD(tx.price, tx) - dressCostUSD(dress.price, tx);
      }, 0);
  }, [timeline, dress.price]);

  const textMuted = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.75)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const gold = '#c9a84c';

  const typeLabel   = (tx: Transaction) => tx.transaction_type === 'sale' ? 'بيع' : 'إيجار';
  const typeColor   = (tx: Transaction) => tx.transaction_type === 'sale' ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#60a5fa' : '#1d4ed8');
  const statusLabel = (s: string) => ({ active: 'نشط', completed: 'مكتمل', cancelled: 'ملغي' }[s] ?? s);
  const statusColor = (s: string) => isDark
    ? ({ active: '#60a5fa', completed: '#4ade80', cancelled: '#f87171' }[s] ?? '#fff')
    : ({ active: '#1d4ed8', completed: '#15803d', cancelled: '#dc2626' }[s] ?? 'rgba(55,38,18,0.85)');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
          className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl overflow-hidden"
          style={{
            background: isDark ? 'rgba(20,14,8,0.96)' : 'rgba(255,255,255,0.97)',
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

          {/* Stats + currency toggle */}
          {stats && (
            <div className="flex items-center gap-3 px-6 py-2.5 flex-shrink-0 flex-wrap"
              style={{ borderBottom: `1px solid ${gold}22`, background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(201,168,76,0.04)' }}>
              <StatChip icon={<RefreshCw size={12} />} label="إيجار" value={stats.rental_count} color={isDark ? '#60a5fa' : '#1d4ed8'} />
              <StatChip icon={<ShoppingBag size={12} />} label="بيع" value={stats.sale_count} color={isDark ? '#4ade80' : '#15803d'} />
              <StatChip icon={<Brush size={12} />} label="تنظيف" value={stats.cleaning_count} color={isDark ? '#c084fc' : '#7c3aed'} />

              {/* Total profit */}
              <div className="text-xs font-bold" style={{ color: totalProfitUSD >= 0 ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#f87171' : '#dc2626'), fontFamily: 'Cairo, sans-serif' }}>
                ربح: {dispTotal(totalProfitUSD, displayCur, liveRate, liveTry)}
              </div>

              {/* Currency toggle — single row of pills, ms-auto pushes it right */}
              <div className="ms-auto flex items-center gap-1 rounded-xl p-1"
                style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                {(['USD', 'SYP', 'TRY'] as DisplayCur[]).map(c => (
                  <button key={c} onClick={() => setDisplayCur(c)}
                    className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition-all"
                    style={{
                      fontFamily: 'mono',
                      background: displayCur === c ? gold : 'transparent',
                      color: displayCur === c ? '#1a0e00' : textMuted,
                    }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cleaning in-progress banner */}
          {dress.status === 'cleaning' && dress.cleaner_name && (
            <div className="mx-6 mt-3 px-4 py-2.5 rounded-xl flex items-center gap-2 flex-shrink-0"
              style={{ background: 'rgba(192,132,252,0.12)', border: '1px solid rgba(192,132,252,0.28)' }}>
              <Brush size={14} style={{ color: isDark ? '#c084fc' : '#7c3aed' }} />
              <span className="text-xs font-semibold" style={{ color: isDark ? '#c084fc' : '#7c3aed', fontFamily: 'Cairo, sans-serif' }}>
                قيد التنظيف الآن — {dress.cleaner_name}
              </span>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={28} className="animate-spin" style={{ color: gold }} />
              </div>
            ) : error ? (
              <div className="flex flex-col items-center py-16 gap-3" style={{ color: isDark ? '#f87171' : '#dc2626' }}>
                <X size={36} className="opacity-40" />
                <p className="text-sm text-center" style={{ fontFamily: 'Cairo, sans-serif' }}>{error}</p>
              </div>
            ) : timeline.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3" style={{ color: textMuted }}>
                <History size={40} className="opacity-25" />
                <p className="text-sm" style={{ fontFamily: 'Cairo, sans-serif' }}>لا يوجد سجل لهذا الفستان</p>
              </div>
            ) : (
              timeline.map((entry, i) => {
                if (entry.kind === 'cleaning') {
                  const c = entry.data;
                  return (
                    <motion.div key={c.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-2xl p-3.5 flex items-center gap-3"
                      style={{
                        background: isDark ? 'rgba(192,132,252,0.06)' : 'rgba(192,132,252,0.08)',
                        border: isDark ? '1px solid rgba(192,132,252,0.20)' : '1px solid rgba(192,132,252,0.25)',
                        borderInlineStart: '3px solid #c084fc66',
                      }}
                    >
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(192,132,252,0.18)' }}>
                        <Brush size={13} style={{ color: isDark ? '#c084fc' : '#7c3aed' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold" style={{ color: isDark ? '#c084fc' : '#7c3aed', fontFamily: 'Cairo, sans-serif' }}>
                          تنظيف مكتمل
                        </span>
                        {c.user_name && (
                          <span className="text-xs ms-2" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                            — {c.user_name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif', direction: 'ltr' }}>
                        {c.created_at.slice(0, 10)}
                      </span>
                    </motion.div>
                  );
                }

                const tx = entry.data;
                return (
                  <motion.div key={tx.id}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="rounded-2xl p-4 flex flex-col gap-2.5"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.60)',
                      border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)',
                      borderInlineStart: `3px solid ${typeColor(tx)}66`,
                    }}
                  >
                    {/* Row 1: type badge + status + date */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold"
                        style={{ color: typeColor(tx), background: `${typeColor(tx)}18` }}>
                        {tx.transaction_type === 'sale' ? <ShoppingBag size={11} /> : <RefreshCw size={11} />}
                        {typeLabel(tx)}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ color: statusColor(tx.status), background: `${statusColor(tx.status)}18` }}>
                        {statusLabel(tx.status)}
                      </span>
                      <span className="text-xs ms-auto opacity-60" style={{ color: textMain, fontFamily: 'Cairo, sans-serif', direction: 'ltr' }}>
                        {tx.created_at.slice(0, 10)}
                      </span>
                    </div>

                    {/* Row 2: customer */}
                    <div className="flex items-center gap-2">
                      <User size={13} style={{ color: textMuted }} />
                      <span className="text-sm font-semibold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                        {tx.customer_name ?? '—'}
                      </span>
                      {tx.customer_phone && (
                        <span className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif', direction: 'ltr' }}>
                          {tx.customer_phone}
                        </span>
                      )}
                    </div>

                    {/* Row 3: rental dates */}
                    {tx.transaction_type === 'rental' && tx.rental_start && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <CalendarDays size={13} style={{ color: textMuted }} />
                        <span className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                          {formatDate(tx.rental_start, language)}
                          {tx.rental_end ? ` — ${formatDate(tx.rental_end, language)}` : ''}
                        </span>
                        {tx.return_date && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                            style={{ color: isDark ? '#4ade80' : '#15803d', background: 'rgba(74,222,128,0.12)', fontFamily: 'Cairo, sans-serif' }}>
                            أُرجع: {tx.return_date.slice(0, 10)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Row 4: pickup date */}
                    {tx.pickup_date && (
                      <div className="flex items-center gap-2">
                        <TrendingUp size={13} style={{ color: textMuted }} />
                        <span className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                          تسليم: <span className="font-semibold" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>{tx.pickup_date.slice(0, 10)}</span>
                        </span>
                      </div>
                    )}

                    {/* Row 5: purchase / sale / profit — 3 tiles */}
                    {(() => {
                      const revenueUSD = txAmountToUSD(tx.price, tx);
                      const costUSD    = dressCostUSD(dress.price, tx);
                      const profitUSD  = revenueUSD - costUSD;
                      const profitColor = profitUSD >= 0 ? (isDark ? '#4ade80' : '#15803d') : (isDark ? '#f87171' : '#dc2626');
                      return (
                        <div className={`grid gap-2 mt-0.5 ${isEmployee ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {!isEmployee && (
                          <div className="flex flex-col items-center rounded-xl px-2 py-1.5 gap-0.5"
                            style={{ background: isDark ? 'rgba(248,113,113,0.07)' : 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}>
                            <span className="text-[9px] font-semibold" style={{ color: isDark ? '#f87171' : '#dc2626', fontFamily: 'Cairo, sans-serif' }}>ثمن الشراء</span>
                            <span className="text-xs font-bold" style={{ color: isDark ? '#f87171' : '#dc2626', fontFamily: 'Cairo, sans-serif' }}>{dispAmount(costUSD, displayCur, tx)}</span>
                          </div>
                          )}
                          <div className="flex flex-col items-center rounded-xl px-2 py-1.5 gap-0.5"
                            style={{ background: isDark ? `${typeColor(tx)}0d` : `${typeColor(tx)}12`, border: `1px solid ${typeColor(tx)}30` }}>
                            <span className="text-[9px] font-semibold" style={{ color: typeColor(tx), fontFamily: 'Cairo, sans-serif' }}>
                              {tx.transaction_type === 'sale' ? 'سعر البيع' : 'سعر الإيجار'}
                            </span>
                            <span className="text-xs font-bold" style={{ color: typeColor(tx), fontFamily: 'Cairo, sans-serif' }}>{dispAmount(revenueUSD, displayCur, tx)}</span>
                          </div>
                          {!isEmployee && (
                          <div className="flex flex-col items-center rounded-xl px-2 py-1.5 gap-0.5"
                            style={{ background: isDark ? `${profitColor}0d` : `${profitColor}12`, border: `1px solid ${profitColor}30` }}>
                            <span className="text-[9px] font-semibold" style={{ color: profitColor, fontFamily: 'Cairo, sans-serif' }}>الربح</span>
                            <span className="text-xs font-bold" style={{ color: profitColor, fontFamily: 'Cairo, sans-serif' }}>
                              {profitUSD >= 0 ? '+' : ''}{dispAmount(profitUSD, displayCur, tx)}
                            </span>
                          </div>
                          )}
                        </div>
                      );
                    })()}
                    {tx.remaining > 0 && (
                      <p className="text-[10px]" style={{ color: isDark ? '#f87171' : '#dc2626', fontFamily: 'Cairo, sans-serif' }}>
                        متبقي: {dispAmount(txAmountToUSD(tx.remaining, tx), displayCur, tx)}
                      </p>
                    )}

                    {/* Notes */}
                    {tx.notes && (
                      <p className="text-xs italic" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
                        {tx.notes}
                      </p>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 flex-shrink-0 flex items-center justify-end"
            style={{ borderTop: `1px solid ${gold}22` }}>
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

function StatChip({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: number; color: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs"
      style={{ background: `${color}12`, border: `1px solid ${color}33`, color, fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>
      {icon}
      <span style={{ opacity: 0.7, fontWeight: 400 }}>{label}:</span>
      {value}
    </div>
  );
}

// ─── DressCard ────────────────────────────────────────────────────────────────

function DressCard({
  dress, currency, isDark, stats, showStats, isEmployee,
  onView, onEdit, onDelete, onCleaningDone, onHistory,
}: DressCardProps) {
  const { language } = useUIStore();
  const { t } = useTranslation();
  const textMuted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.75)';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const gold = '#c9a84c';

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
      <div className="h-32 relative overflow-hidden flex-shrink-0"
        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)' }}>
        {dress.image_path ? (
          <img src={dress.image_path} alt={dress.code}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} style={{ color: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,42,24,0.08)' }} />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute top-2 start-2">
          <StatusBadge status={dress.status} size="sm" />
        </div>
        {/* Rental count badge (when sort-by-stats active) */}
        {showStats && stats && (
          <div className="absolute top-2 end-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
            style={{ background: 'rgba(96,165,250,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}>
            <RefreshCw size={9} />
            {stats.rental_count}×
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-3 pt-2.5 pb-1.5 flex flex-col gap-1">
        {/* Row 1: Code + Price */}
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-semibold text-sm truncate" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
            {dress.code}
          </span>
          {!isEmployee && (
            <span className="text-xs flex-shrink-0" style={{ color: isDark ? gold : '#8f6e28', fontFamily: 'Cairo, sans-serif', fontWeight: 750 }}>
              {formatCurrency(dress.price, currency, language)}
            </span>
          )}
        </div>

        {/* Row 2: Details + Stats on same line */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] truncate" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>
            {[dress.style, dress.color, dress.size].filter(Boolean).join(' · ') || '—'}
          </p>
          {showStats && stats && (
            <div className="flex items-center gap-1.5 flex-shrink-0 text-[10px]" style={{ fontFamily: 'Cairo, sans-serif' }}>
              <span style={{ color: isDark ? '#60a5fa' : '#1d4ed8' }}>{stats.rental_count} إيجار</span>
              {stats.sale_count > 0 && <span style={{ color: isDark ? '#4ade80' : '#15803d' }}>{stats.sale_count} بيع</span>}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center px-1 pb-1 mt-auto"
        style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(60,42,24,0.05)' }}>
        <ActionBtn onClick={onView} icon={<Eye size={11} />} label={t('actions.view')} textMuted={textMuted} textMain={textMain} />
        <ActionBtn onClick={onEdit} icon={<Pencil size={11} />} label={t('actions.edit')} textMuted={textMuted} textMain={textMain} />
        {!isEmployee && onHistory && (
          <ActionBtn onClick={onHistory} icon={<History size={11} />} label="سجل" textMuted={textMuted} textMain={isDark ? gold : '#8f6e28'} />
        )}
        {onCleaningDone && (
          <button onClick={onCleaningDone} className="p-1.5 rounded-lg flex items-center gap-1"
            style={{ color: isDark ? '#c084fc' : '#7c3aed' }}>
            <Sparkles size={11} />
          </button>
        )}
        {onDelete && (
          <button onClick={onDelete} className="p-1.5 rounded-lg"
            style={{ color: isDark ? 'rgba(248,113,113,0.45)' : 'rgba(180,28,28,0.55)' }}
            onMouseEnter={e => (e.currentTarget.style.color = isDark ? '#f87171' : '#dc2626')}
            onMouseLeave={e => (e.currentTarget.style.color = isDark ? 'rgba(248,113,113,0.45)' : 'rgba(180,28,28,0.55)')}>
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function ActionBtn({ onClick, icon, label, textMuted, textMain }: {
  onClick: () => void; icon: React.ReactNode; label: string; textMuted: string; textMain: string;
}) {
  return (
    <button onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 p-1.5 rounded-lg text-[11px] transition-colors"
      style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}
      onMouseEnter={e => (e.currentTarget.style.color = textMain)}
      onMouseLeave={e => (e.currentTarget.style.color = textMuted)}>
      {icon} {label}
    </button>
  );
}
