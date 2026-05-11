import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePermissions } from '../../hooks/usePermissions';
import { EmployeeDashboard } from './EmployeeDashboard';
import {
  ShoppingBag, Calendar, DollarSign, BarChart3, Sparkles,
  TrendingDown, TrendingUp, RotateCcw, Download, ChevronDown,
  Loader2, Eye, EyeOff, Wallet, Receipt, UserPlus, X, Lock, User,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { tok } from '../../utils/themeTokens';
import type { FinancialReport, Transaction, Expense } from '../../types';
import { GlassDatePicker } from '../../components/GlassDatePicker';

// ---- Utility helpers ----

const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function eachDayInRange(from: string, to: string): string[] {
  const days: string[] = [];
  let cur = from;
  while (cur <= to && days.length < 400) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function formatShortDate(iso: string): string {
  return iso.slice(8, 10) + '/' + iso.slice(5, 7);
}

function firstDayOfPrevMonth(): string {
  const now = new Date();
  const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// Convert a paid amount to USD using the exchange-rate snapshot frozen at transaction time.
// USD tx → already in USD; TRY → divide by usd_to_try_snapshot; SYP → divide by usd_to_syp_snapshot.
function toUSD_tx(amount: number, tx: Transaction): number {
  if (tx.currency === 'USD') return amount;
  if (tx.currency === 'TRY') return amount / (tx.usd_to_try_snapshot || 34);
  return amount / (tx.usd_to_syp_snapshot || 14000);
}

type RangePreset = 'yesterday' | '7days' | 'thismonth' | 'monthpick' | 'custom';
type MetricKey = 'revenue' | 'expense' | 'rental_revenue' | 'sale_revenue' | 'profit';

interface DateRange { from: string; to: string; }
interface ChartPoint {
  name: string;
  revenue: number;
  expense: number;
  rental_revenue: number;
  sale_revenue: number;
  profit: number;
}

function computeRange(
  preset: RangePreset,
  monthPick: number | null,
  customFrom: string,
  customTo: string,
): DateRange {
  const tod = todayIso();
  if (preset === 'yesterday') {
    const y = addDays(tod, -1);
    return { from: y, to: y };
  }
  if (preset === '7days') {
    return { from: addDays(tod, -6), to: tod };
  }
  if (preset === 'thismonth') {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return { from: `${now.getFullYear()}-${m}-01`, to: tod };
  }
  if (preset === 'monthpick' && monthPick !== null) {
    const y = new Date().getFullYear();
    const m = String(monthPick + 1).padStart(2, '0');
    const lastDay = new Date(y, monthPick + 1, 0).getDate();
    const end = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    return { from: `${y}-${m}-01`, to: end > tod ? tod : end };
  }
  if (preset === 'custom') {
    const from = customFrom || addDays(tod, -6);
    const to = customTo || tod;
    return from <= to ? { from, to } : { from: to, to: from };
  }
  return { from: addDays(tod, -6), to: tod };
}

function computePrevRange(range: DateRange): DateRange {
  const len = eachDayInRange(range.from, range.to).length;
  return { from: addDays(range.from, -len), to: addDays(range.to, -len) };
}

function trendPct(curr: number, prev: number): number {
  if (!prev) return curr > 0 ? 100 : 0;
  return round2(((curr - prev) / Math.abs(prev)) * 100);
}

// ---- Motion presets ----

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 520, damping: 46 } },
};

const stagger = (delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: delay } },
});

// ---- Glass helpers ----

function glassPanel(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.34)',
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

// ---- KpiCard ----

interface KpiProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  trend: number;
  sparkData: { d: string; v: number }[];
  isDark: boolean;
  selected: boolean;
  hidden: boolean;
  onClick: () => void;
}

function KpiCard({ title, value, icon, trend, sparkData, isDark, selected, hidden, onClick }: KpiProps) {
  const t = tok(isDark);
  const pos = trend >= 0;

  const selectedShadow = isDark
    ? 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.16), 0 18px 30px rgba(0,0,0,0.28)'
    : '0 16px 30px rgba(122,122,122,0.10), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -1px 0 rgba(214,214,214,0.40)';

  return (
    <motion.div
      variants={fadeUp}
      whileHover={!selected ? { ...hoverSoft(isDark), y: -2, scale: 1.014 } : {}}
      whileTap={{ scale: 0.975 }}
      onClick={onClick}
      className="flex cursor-pointer select-none flex-col rounded-[24px]"
      style={{
        ...glassPanel(isDark),
        boxShadow: selected ? selectedShadow : glassPanel(isDark).boxShadow,
        minHeight: 148,
      }}
    >
      <div className="relative flex items-center justify-center px-4.5 pt-4">
        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.79rem', fontWeight: isDark ? 500 : 700, color: t.text2, lineHeight: 1.2, textAlign: 'center' }}>
          {title}
        </p>
        <div
          className="absolute end-4 top-3 flex h-8 w-8 items-center justify-center rounded-full"
          style={{
            color: t.gold,
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.56)',
            border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
            boxShadow: isDark
              ? '0 6px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.11), inset 0 -1px 0 rgba(0,0,0,0.07)'
              : '0 8px 16px rgba(124,124,124,0.08), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -1px 0 rgba(214,214,214,0.36)',
          }}
        >
          {icon}
        </div>
      </div>

      <div className="flex-1 px-4.5 pt-3.5">
        <AnimatePresence mode="wait">
          {hidden ? (
            <motion.p key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ fontFamily: 'Cairo, sans-serif', fontSize: '1.1rem', color: t.textFaint, letterSpacing: '0.18em' }}>
              •••
            </motion.p>
          ) : (
            <motion.p key="value" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="tabular-nums flex items-baseline gap-0.5"
              style={{ fontFamily: "'Oswald', sans-serif", fontSize: '1.72rem', fontWeight: 600, color: t.text1, lineHeight: 1.05, letterSpacing: '0.01em', direction: 'ltr', justifyContent: 'center' }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: '0.90rem', fontWeight: 500, color: t.textMuted, marginInlineEnd: 1 }}>$</span>
              {value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
            </motion.p>
          )}
        </AnimatePresence>
        <p className="mt-2 tabular-nums" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.74rem', color: pos ? t.green : t.red, fontWeight: 700 }}>
          {pos ? '+' : ''}{trend}%
          <span style={{ fontWeight: isDark ? 400 : 700, marginInlineStart: 3, color: t.textFaint, fontSize: '0.62rem' }}>عن الفترة السابقة</span>
        </p>
      </div>

      <div className="mt-auto h-9 px-2 pb-2" style={{ opacity: hidden ? 0.14 : 0.92 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`spark-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.gold} stopOpacity={0.22} />
                <stop offset="100%" stopColor={t.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={t.gold} strokeWidth={1.15} fill="none" dot={false} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ---- ChartTooltip ----

function ChartTooltip({ active, payload, label, isDark }: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
  label?: string;
  isDark: boolean;
}) {
  const t = tok(isDark);
  if (!active || !payload?.length) return null;
  const LABELS: Record<string, string> = {
    revenue: 'الإيرادات', expense: 'المصاريف',
    rental_revenue: 'الإيجار', sale_revenue: 'المبيعات', profit: 'الربح',
  };
  return (
    <div className="rounded-2xl px-3 py-2" style={glassPanel(isDark, { minWidth: 110 })}>
      {payload.map((p, i) => (
        <p key={i} className="flex items-baseline gap-0.5"
          style={{ fontFamily: "'Oswald', sans-serif", fontSize: '0.94rem', fontWeight: 600, color: t.text1, letterSpacing: '0.01em' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 500, color: t.textMuted }}>$</span>
          {p.value.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}
          {p.name && <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.62rem', color: t.textMuted, marginInlineStart: 4 }}>{LABELS[p.name] ?? p.name}</span>}
        </p>
      ))}
      <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.62rem', color: t.textMuted, marginTop: 1 }}>{label}</p>
    </div>
  );
}

// ---- ShortcutBtn ----

function ShortcutBtn({ icon, label, to, isDark, action }: { icon: React.ReactNode; label: string; to: string; isDark: boolean; action?: () => void }) {
  const t = tok(isDark);
  const inner = (
    <motion.div
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 430, damping: 28 }}
      className="flex flex-col items-center gap-2 rounded-[20px] px-3 py-3"
      style={glassPanel(isDark, { minWidth: 104 })}
      onClick={action}
    >
      <motion.div
        whileHover={hoverSoft(isDark)}
        transition={{ duration: 0.15 }}
        className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl"
        style={{
          color: t.gold,
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.56)',
          border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
          boxShadow: isDark
            ? '0 6px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.11), inset 0 -1px 0 rgba(0,0,0,0.07)'
            : '0 8px 16px rgba(124,124,124,0.08), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -1px 0 rgba(214,214,214,0.36)',
        }}
      >
        {icon}
      </motion.div>
      <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.72rem', fontWeight: isDark ? 500 : 700, color: t.text2, textAlign: 'center', lineHeight: 1.25, whiteSpace: 'nowrap' }}>
        {label}
      </p>
    </motion.div>
  );
  if (action) return inner;
  return <Link to={to}>{inner}</Link>;
}

// ---- Eye Modal ----

const KPI_TITLES = ['إجمالي الإيرادات','إجمالي المصاريف','إيرادات الإيجار','إيرادات المبيعات','صافي الربح'];

function EyeModal({
  open, onClose, report, isDark, selectedKpi,
}: {
  open: boolean; onClose: () => void; report: FinancialReport | null; isDark: boolean; selectedKpi: number;
}) {
  const t = tok(isDark);
  const { exchangeRates } = useUIStore();
  const rate = exchangeRates.usd_to_syp || 14000;

  const TX_TYPE: Record<string, string> = { rental: 'إيجار', sale: 'بيع' };

  function txAmountUSD(tx: Transaction): number {
    return round2(toUSD_tx(tx.price - tx.remaining, tx));
  }
  function expAmountUSD(ex: Expense): number {
    if (ex.currency === 'USD') return round2(ex.amount);
    if (ex.currency === 'TRY') return round2(ex.amount / (ex.usd_to_try_snapshot || 34));
    return round2(ex.amount / (ex.usd_to_syp_snapshot || rate));
  }

  // Filter data based on selected KPI
  const filteredTx = useMemo(() => {
    if (!report) return [];
    if (selectedKpi === 1) return [];                               // expenses only
    if (selectedKpi === 2) return report.transactions.filter(tx => tx.transaction_type === 'rental');
    if (selectedKpi === 3) return report.transactions.filter(tx => tx.transaction_type === 'sale');
    return report.transactions;                                     // 0=total rev, 4=profit → all
  }, [report, selectedKpi]);

  const filteredExp = useMemo(() => {
    if (!report) return [];
    if (selectedKpi === 0 || selectedKpi === 2 || selectedKpi === 3) return []; // revenue views: no expenses
    return report.expenses;                                          // 1=expenses, 4=profit → show expenses
  }, [report, selectedKpi]);

  const kpiTitle = KPI_TITLES[selectedKpi] ?? '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.54)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-[28px] p-5"
            style={{ ...glassPanel(isDark), width: 720, maxWidth: '95vw', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.text2 }}
              >
                <X size={14} />
              </button>
              <h2 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '1rem', color: t.text1 }}>
                {kpiTitle} — {report?.period_start} إلى {report?.period_end}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5" style={{ scrollbarWidth: 'none' }}>
              {/* Transactions */}
              {filteredTx.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: t.gold, marginBottom: 8 }}>
                    المعاملات ({filteredTx.length})
                  </p>
                  <div className="rounded-[16px] overflow-hidden" style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                          {['العميل','الفستان','النوع','المبلغ (USD)','التاريخ'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'center', color: t.textMuted, fontWeight: 700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTx.map((tx, i) => (
                          <tr key={tx.id} style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') }}>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.text1 }}>{tx.customer_name ?? '—'}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.text2 }}>{tx.dress_code ?? '—'}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.text2 }}>{TX_TYPE[tx.transaction_type] ?? tx.transaction_type}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.text1, fontFamily: "'Oswald', sans-serif", fontWeight: 500 }}>
                              ${txAmountUSD(tx).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.textMuted }}>{tx.created_at.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Expenses */}
              {filteredExp.length > 0 && (
                <div>
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: t.red, marginBottom: 8 }}>
                    المصاريف ({filteredExp.length})
                  </p>
                  <div className="rounded-[16px] overflow-hidden" style={{ border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.06)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                          {['الفئة','الوصف','المبلغ (USD)','التاريخ'].map(h => (
                            <th key={h} style={{ padding: '8px 12px', textAlign: 'center', color: t.textMuted, fontWeight: 700 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExp.map((ex, i) => (
                          <tr key={ex.id} style={{ background: i % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)') }}>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.text1 }}>{ex.category}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.text2 }}>{ex.description ?? '—'}</td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.red, fontFamily: "'Oswald', sans-serif", fontWeight: 500 }}>
                              ${expAmountUSD(ex).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ padding: '7px 12px', textAlign: 'center', color: t.textMuted }}>{ex.date.slice(0, 10)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {filteredTx.length === 0 && filteredExp.length === 0 && (
                <p style={{ fontFamily: 'Cairo, sans-serif', color: t.textMuted, textAlign: 'center', padding: '24px 0', fontSize: '0.84rem' }}>
                  لا توجد بيانات في هذه الفترة
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- Date Picker Bar ----

function DatePickerBar({
  preset, setPreset, monthPick, setMonthPick,
  customFrom, setCustomFrom, customTo, setCustomTo,
  isDark,
}: {
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  monthPick: number | null;
  setMonthPick: (m: number | null) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  isDark: boolean;
}) {
  const t = tok(isDark);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const today = todayIso();
  const todayMonth = new Date().getMonth();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const chipStyle = (active: boolean): React.CSSProperties => ({
    ...glassPanel(isDark),
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.74rem',
    fontWeight: 700,
    color: active ? t.gold : t.text2,
    padding: '6px 14px',
    borderRadius: 20,
    cursor: 'pointer',
    border: active ? `1px solid ${t.gold}40` : glassPanel(isDark).border,
    whiteSpace: 'nowrap' as const,
  });

  const inputStyle: React.CSSProperties = {
    ...glassPanel(isDark),
    fontFamily: "'Oswald', sans-serif",
    fontSize: '0.74rem',
    color: t.text1,
    padding: '5px 10px',
    borderRadius: 14,
    border: preset === 'custom' ? `1px solid ${t.gold}40` : glassPanel(isDark).border,
    outline: 'none',
    background: 'transparent',
    width: 108,
    cursor: 'pointer',
  };

  return (
    <div className="flex flex-wrap items-center gap-2" style={{ direction: 'rtl' }}>
      {/* Quick presets */}
      {([['yesterday', 'أمس'], ['7days', '٧ أيام'], ['thismonth', 'الشهر الحالي']] as [RangePreset, string][]).map(([p, label]) => (
        <motion.button key={p} whileTap={{ scale: 0.95 }} onClick={() => { setPreset(p); setMonthPick(null); }}
          style={chipStyle(preset === p)}>
          {label}
        </motion.button>
      ))}

      {/* Month dropdown */}
      <div ref={dropRef} style={{ position: 'relative' }}>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setDropOpen(v => !v)}
          style={{ ...chipStyle(preset === 'monthpick'), display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <span>{preset === 'monthpick' && monthPick !== null ? MONTHS_AR[monthPick] : 'اختر شهر'}</span>
          <ChevronDown size={11} style={{ transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </motion.button>
        <AnimatePresence>
          {dropOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.13 }}
              className="absolute top-full mt-1 z-30 rounded-[16px] py-1.5"
              style={{ ...glassPanel(isDark), minWidth: 120, right: 0 }}
            >
              {MONTHS_AR.map((m, i) => {
                const isFuture = i > todayMonth;
                return (
                  <button
                    key={m}
                    disabled={isFuture}
                    onClick={() => { setPreset('monthpick'); setMonthPick(i); setDropOpen(false); }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'right',
                      padding: '6px 14px',
                      fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', fontWeight: 600,
                      color: isFuture ? t.textFaint : (preset === 'monthpick' && monthPick === i ? t.gold : t.text1),
                      cursor: isFuture ? 'not-allowed' : 'pointer',
                      background: preset === 'monthpick' && monthPick === i ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)') : 'transparent',
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom date inputs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <GlassDatePicker
          value={customFrom}
          max={today}
          onChange={(v) => { setCustomFrom(v); if (v) setPreset('custom'); }}
          placeholder="من"
          containerClass="w-[150px]"
        />
        <span style={{ color: t.textMuted, fontSize: '0.7rem', fontFamily: 'Cairo, sans-serif' }}>إلى</span>
        <GlassDatePicker
          value={customTo}
          max={today}
          onChange={(v) => { setCustomTo(v); if (v) setPreset('custom'); }}
          placeholder="إلى"
          containerClass="w-[150px]"
        />
      </div>
    </div>
  );
}

// ---- LightDashboard ----

function LightDashboard({ isDark }: { isDark: boolean }) {
  const t = tok(isDark);
  const { exchangeRates, hideFinancials } = useUIStore();
  const rate = exchangeRates.usd_to_syp || 14000;
  const toUSD = (v: number) => round2(v / rate);

  // State
  const [selectedKpi, setSelectedKpi] = useState(0);
  const [preset, setPreset] = useState<RangePreset>('7days');
  const [monthPick, setMonthPick] = useState<number | null>(null);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [prevReport, setPrevReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [eyeOpen, setEyeOpen] = useState(false);

  const range = useMemo(
    () => computeRange(preset, monthPick, customFrom, customTo),
    [preset, monthPick, customFrom, customTo],
  );
  const prevRange = useMemo(() => computePrevRange(range), [range]);

  const eyeEnabled = useMemo(() => range.from >= firstDayOfPrevMonth(), [range.from]);

  // Fetch real data on range change
  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.reports.getFinancialReport(range.from, range.to),
      api.reports.getFinancialReport(prevRange.from, prevRange.to),
    ])
      .then(([r, p]) => { setReport(r); setPrevReport(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range.from, range.to, prevRange.from, prevRange.to]);

  // Build daily chart data — each tx converted to USD at its own snapshot rate
  const chartData = useMemo((): ChartPoint[] => {
    if (!report) return [];
    const map = new Map<string, { revenue: number; expense: number; rental_revenue: number; sale_revenue: number }>();
    eachDayInRange(range.from, range.to).forEach(d =>
      map.set(d, { revenue: 0, expense: 0, rental_revenue: 0, sale_revenue: 0 })
    );
    for (const tx of report.transactions) {
      const day = tx.created_at.slice(0, 10);
      const usd = toUSD_tx(tx.price - tx.remaining, tx);
      const entry = map.get(day);
      if (entry) {
        entry.revenue += usd;
        if (tx.transaction_type === 'rental') entry.rental_revenue += usd;
        else entry.sale_revenue += usd;
      }
    }
    for (const ex of report.expenses) {
      const day = ex.date.slice(0, 10);
      const entry = map.get(day);
      if (entry) {
        let expUsd: number;
        if (ex.currency === 'USD') expUsd = ex.amount;
        else if (ex.currency === 'TRY') expUsd = ex.amount / (ex.usd_to_try_snapshot || 34);
        else expUsd = ex.amount / (ex.usd_to_syp_snapshot || rate);
        entry.expense += expUsd;
      }
    }
    return [...map.entries()].map(([d, v]) => ({
      name: formatShortDate(d),
      revenue: round2(v.revenue),
      expense: round2(v.expense),
      rental_revenue: round2(v.rental_revenue),
      sale_revenue: round2(v.sale_revenue),
      profit: round2(v.revenue - v.expense),
    }));
  }, [report, range.from, range.to, rate]);

  // Aggregate tx USD totals from transactions list using snapshot rates
  function sumTxUSD(txList: Transaction[], type?: 'rental' | 'sale'): number {
    return round2(txList
      .filter(tx => !type || tx.transaction_type === type)
      .reduce((s, tx) => s + toUSD_tx(tx.price - tx.remaining, tx), 0));
  }

  const METRIC_KEYS: MetricKey[] = ['revenue', 'expense', 'rental_revenue', 'sale_revenue', 'profit'];

  // KPI totals: each tx at snapshot rate; expenses at current rate (no snapshot stored)
  const KPIS = useMemo(() => {
    const txs = report?.transactions ?? [];
    const prevTxs = prevReport?.transactions ?? [];
    // total_expenses from backend is already SUM(amount/usd_to_syp_snapshot) = USD
    const expUSD = round2(report?.total_expenses ?? 0);
    const prevExpUSD = round2(prevReport?.total_expenses ?? 0);
    const rev = sumTxUSD(txs);
    const prevRev = sumTxUSD(prevTxs);
    const rental = sumTxUSD(txs, 'rental');
    const prevRental = sumTxUSD(prevTxs, 'rental');
    const sale = sumTxUSD(txs, 'sale');
    const prevSale = sumTxUSD(prevTxs, 'sale');
    const profit = round2(rev - expUSD);
    const prevProfit = round2(prevRev - prevExpUSD);

    const vals =     [rev,     expUSD,     rental,     sale,     profit];
    const prevVals = [prevRev, prevExpUSD, prevRental, prevSale, prevProfit];
    const titles = ['إجمالي الإيرادات','إجمالي المصاريف','إيرادات الإيجار','إيرادات المبيعات','صافي الربح'];
    const icons = [<DollarSign size={14} />, <TrendingDown size={14} />, <Calendar size={14} />, <ShoppingBag size={14} />, <TrendingUp size={14} />];
    return titles.map((title, i) => ({
      title,
      value: vals[i],
      icon: icons[i],
      trend: trendPct(vals[i], prevVals[i]),
      sparkData: chartData.map(d => ({ d: d.name, v: d[METRIC_KEYS[i]] })),
    }));
  }, [report, prevReport, chartData, rate]);

  const activeMetricKey = METRIC_KEYS[selectedKpi] ?? 'revenue';

  // Adaptive Y-axis: nice round max aligned to actual data peak
  const yAxisConfig = useMemo(() => {
    const vals = chartData.map(d => d[activeMetricKey]);
    const maxVal = vals.length ? Math.max(...vals) : 0;
    if (maxVal === 0) return { domain: [0, 100] as [number, number], ticks: [0, 25, 50, 75, 100] };
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)));
    const niceMax = Math.ceil(maxVal / magnitude) * magnitude;
    const step = niceMax / 4;
    return {
      domain: [0, niceMax] as [number, number],
      ticks: [0, step, step * 2, step * 3, niceMax],
    };
  }, [chartData, activeMetricKey]);

  // Adaptive X-axis: fewer labels for long ranges
  const xInterval = useMemo(() => {
    const len = chartData.length;
    if (len <= 7) return 0;
    if (len <= 14) return 1;
    if (len <= 31) return Math.max(1, Math.floor(len / 6));
    return Math.max(1, Math.floor(len / 5));
  }, [chartData.length]);

  const [addEmpOpen, setAddEmpOpen] = useState(false);

  // Shortcuts — most important first (right side in RTL)
  const SHORTCUTS = [
    { icon: <Wallet size={17} />, label: 'بيع فستان', to: '/sales', action: undefined },
    { icon: <Calendar size={17} />, label: 'تأجير فستان', to: '/rentals', action: undefined },
    { icon: <RotateCcw size={17} />, label: 'إرجاع فستان', to: '/rentals', action: undefined },
    { icon: <Receipt size={17} />, label: 'مصاريف جديدة', to: '/expenses', action: undefined },
    { icon: <BarChart3 size={17} />, label: 'تقرير سريع', to: '/reports', action: undefined },
    { icon: <Sparkles size={17} />, label: 'تنظيف', to: '/inventory', action: undefined },
    { icon: <UserPlus size={17} />, label: 'إضافة موظف', to: '', action: () => setAddEmpOpen(true) },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} className="space-y-4">
      {/* KPI Cards */}
      <motion.div variants={stagger(0)} initial="hidden" animate="show" className="grid grid-cols-1 gap-3.5 xl:grid-cols-5">
        {KPIS.map((k, i) => (
          <KpiCard
            key={k.title}
            {...k}
            isDark={isDark}
            selected={selectedKpi === i}
            hidden={hideFinancials}
            onClick={() => setSelectedKpi(i)}
          />
        ))}
      </motion.div>

      {/* Chart Panel */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.14 }}
        className="rounded-[28px] p-4"
        style={glassPanel(isDark)}
      >
        {/* Chart header */}
        <div className="mb-3 flex items-start justify-between gap-3 flex-wrap">
          {/* Date picker */}
          <DatePickerBar
            preset={preset} setPreset={setPreset}
            monthPick={monthPick} setMonthPick={setMonthPick}
            customFrom={customFrom} setCustomFrom={setCustomFrom}
            customTo={customTo} setCustomTo={setCustomTo}
            isDark={isDark}
          />

          {/* Right side: title + controls */}
          <div className="text-end flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <h2 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: isDark ? 700 : 800, fontSize: '1.08rem', color: t.text1, lineHeight: 1.2 }}>
                {KPIS[selectedKpi]?.title ?? ''}
              </h2>
              {/* Eye detail button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => eyeEnabled && setEyeOpen(true)}
                className="flex h-6 w-6 items-center justify-center rounded-full"
                title={eyeEnabled ? 'عرض التفاصيل' : 'متاح للشهر الماضي فقط'}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.40)',
                  color: eyeEnabled ? t.gold : t.textFaint,
                  cursor: eyeEnabled ? 'pointer' : 'not-allowed',
                }}
              >
                <BarChart3 size={12} />
              </motion.button>
              {/* Export placeholder */}
              <motion.button
                whileHover={hoverSoft(isDark)} whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1 rounded-2xl px-3 py-1.5"
                style={{ ...glassPanel(isDark), fontFamily: 'Cairo, sans-serif', fontSize: '0.74rem', fontWeight: 700, color: t.gold, cursor: 'pointer' }}
              >
                <Download size={12} />
                <span>تصدير</span>
              </motion.button>
            </div>
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.74rem', fontWeight: isDark ? 700 : 800, color: t.textMuted }}>
              {range.from === range.to ? range.from : `${range.from} — ${range.to}`}
            </p>
          </div>
        </div>

        {/* Chart */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedKpi}-${range.from}-${range.to}`}
            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.18 }}
            className="h-[130px] relative"
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 size={20} style={{ color: t.gold }} />
                </motion.div>
              </div>
            )}
            <div style={{ opacity: loading ? 0.3 : 1, transition: 'opacity 0.2s' }}>
              <ResponsiveContainer width="100%" height={130}>
                <AreaChart data={chartData} margin={{ top: 12, right: 24, left: 24, bottom: 4 }}>
                  <defs>
                    <linearGradient id="chartGold" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.gold} stopOpacity={0.34} />
                      <stop offset="100%" stopColor={t.gold} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fontWeight: 700, fill: t.chartAxis, fontFamily: 'Cairo, sans-serif' }}
                    axisLine={false} tickLine={false}
                    interval={xInterval}
                    padding={{ left: 16, right: 16 }}
                  />
                  <YAxis
                    domain={yAxisConfig.domain}
                    ticks={yAxisConfig.ticks}
                    tickFormatter={(v) => {
                      if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
                      if (v >= 1000) return `$${(v / 1000).toFixed(0)}k`;
                      return `$${v % 1 === 0 ? v : v.toFixed(1)}`;
                    }}
                    tick={{ fontSize: 11, fontWeight: 700, fill: t.chartAxis, fontFamily: "'Oswald', sans-serif" }}
                    axisLine={false} tickLine={false} width={52}
                  />
                  <Tooltip content={(props) => (
                    <ChartTooltip active={props.active} payload={props.payload as { value: number; name?: string }[] | undefined} label={props.label} isDark={isDark} />
                  )} />
                  <Area
                    type="monotoneX"
                    dataKey={activeMetricKey}
                    stroke={t.gold}
                    strokeWidth={2.2}
                    fill="none"
                    dot={chartData.length <= 14 ? { fill: '#fff', r: 3, strokeWidth: 2, stroke: t.gold } : false}
                    activeDot={{ r: 5, fill: '#fff', stroke: t.gold, strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Shortcuts */}
      <motion.div
        variants={fadeUp} initial="hidden" animate="show" transition={{ delay: 0.22 }}
        className="rounded-[28px] p-3.5"
        style={glassPanel(isDark)}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {SHORTCUTS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 + i * 0.04, type: 'spring', stiffness: 460, damping: 38 }}
            >
              <ShortcutBtn {...s} isDark={isDark} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Eye detail modal */}
      <EyeModal open={eyeOpen} onClose={() => setEyeOpen(false)} report={report} isDark={isDark} selectedKpi={selectedKpi} />

      {/* Add employee modal */}
      <AddEmployeeModal open={addEmpOpen} onClose={() => setAddEmpOpen(false)} isDark={isDark} />
    </motion.div>
  );
}

// ---- Add Employee Modal ----

function AddEmployeeModal({ open, onClose, isDark }: { open: boolean; onClose: () => void; isDark: boolean }) {
  const t = tok(isDark);
  const { addToast } = useUIStore();

  const [form, setForm] = useState({ name: '', username: '', password: '', confirmPassword: '', role: 'employee' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function reset() { setForm({ name: '', username: '', password: '', confirmPassword: '', role: 'employee' }); setError(''); setSuccess(''); }

  function handleClose() { reset(); onClose(); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name.trim()) return setError('الاسم الكامل مطلوب');
    if (!form.username.trim()) return setError('اسم المستخدم مطلوب');
    if (form.username.includes(' ')) return setError('اسم المستخدم لا يحتوي على مسافات');
    if (!form.password) return setError('كلمة المرور مطلوبة');
    if (form.password.length < 6) return setError('كلمة المرور 6 أحرف على الأقل');
    if (form.password !== form.confirmPassword) return setError('كلمتا المرور غير متطابقتين');
    setLoading(true);
    try {
      await api.auth.createUser({ name: form.name.trim(), username: form.username.trim(), password: form.password, role: form.role });
      setSuccess(`تم إنشاء حساب "${form.name.trim()}" بنجاح`);
      addToast('success', 'تم إضافة الموظف');
      reset();
    } catch (err) {
      setError(String(err).replace(/^Error: /, ''));
    } finally { setLoading(false); }
  }

  const fieldStyle: React.CSSProperties = {
    ...glassPanel(isDark),
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.85rem',
    color: t.text1,
    padding: '10px 14px',
    borderRadius: 14,
    outline: 'none',
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.70)',
    width: '100%',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.78rem',
    fontWeight: 700,
    color: t.textMuted,
    marginBottom: 5,
    display: 'block',
  };

  const ROLE_OPTIONS = [
    { value: 'employee', label: 'موظف' },
    { value: 'cashier', label: 'كاشير' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.54)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            onClick={(e) => e.stopPropagation()}
            className="rounded-[28px] p-6"
            style={{ ...glassPanel(isDark), width: 460, maxWidth: '95vw' }}
          >
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <button onClick={handleClose} className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.text2 }}>
                <X size={14} />
              </button>
              <div className="flex items-center gap-2">
                <h2 style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: t.text1 }}>إضافة موظف جديد</h2>
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.56)', color: t.gold }}>
                  <UserPlus size={15} />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ direction: 'rtl' }}>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label style={labelStyle}><User size={11} style={{ display: 'inline', marginLeft: 4 }} />الاسم الكامل</label>
                  <input style={fieldStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="محمد أحمد" required />
                </div>

                {/* Username */}
                <div>
                  <label style={labelStyle}><User size={11} style={{ display: 'inline', marginLeft: 4 }} />اسم المستخدم</label>
                  <input style={{ ...fieldStyle, direction: 'ltr' }} value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="mohamad.ahmad" required />
                </div>

                {/* Role */}
                <div>
                  <label style={labelStyle}>الدور الوظيفي</label>
                  <select style={fieldStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label style={labelStyle}><Lock size={11} style={{ display: 'inline', marginLeft: 4 }} />كلمة المرور</label>
                  <input style={{ ...fieldStyle, direction: 'ltr' }} type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required />
                </div>

                {/* Confirm password */}
                {form.password && (
                  <div>
                    <label style={labelStyle}><Lock size={11} style={{ display: 'inline', marginLeft: 4 }} />تأكيد كلمة المرور</label>
                    <input style={{ ...fieldStyle, direction: 'ltr' }} type="password" value={form.confirmPassword} onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))} placeholder="••••••••" />
                  </div>
                )}

                {/* Error / success */}
                {error && (
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.8rem', color: t.red, background: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)', borderRadius: 10, padding: '8px 12px' }}>
                    {error}
                  </p>
                )}
                {success && (
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.8rem', color: t.green, background: isDark ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.08)', borderRadius: 10, padding: '8px 12px' }}>
                    {success}
                  </p>
                )}

                {/* Submit */}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    type="button" whileTap={{ scale: 0.96 }} onClick={handleClose}
                    style={{ ...glassPanel(isDark), flex: 1, padding: '10px', borderRadius: 14, fontFamily: 'Cairo, sans-serif', fontSize: '0.84rem', fontWeight: 700, color: t.text2, cursor: 'pointer' }}>
                    إلغاء
                  </motion.button>
                  <motion.button
                    type="submit" whileTap={{ scale: 0.96 }} disabled={loading}
                    style={{ flex: 2, padding: '10px', borderRadius: 14, fontFamily: 'Cairo, sans-serif', fontSize: '0.84rem', fontWeight: 700, color: '#fff', background: t.gold, cursor: loading ? 'wait' : 'pointer', border: 'none', opacity: loading ? 0.7 : 1 }}>
                    {loading ? '...' : 'إضافة الموظف'}
                  </motion.button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- OwnerDashboard (internal) ----

function OwnerDashboard() {
  const { theme } = useUIStore();
  return <LightDashboard isDark={theme === 'dark'} />;
}

// ---- Dashboard (exported) ----

export function Dashboard() {
  const { isOwner } = usePermissions();
  return isOwner ? <OwnerDashboard /> : <EmployeeDashboard />;
}
