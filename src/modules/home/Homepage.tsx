import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Calendar, Wallet, Truck, Sparkles,
  RotateCcw, Users, Bell, Clock, AlertTriangle, CheckCircle,
  Package, ClipboardList, Search, Loader2, X, Banknote,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { api } from '../../lib/api';
import { SaleForm } from '../sales/SaleForm';
import { RentalForm } from '../rentals/RentalForm';
import { formatCurrency, formatDate, formatDateTime, isOverdue } from '../../utils/formatters';
import type { ActivityLog, HomeSummary, Reminder, Transaction } from '../../types';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { Button } from '../../components/Button';

// Glass helper
function glass(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
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

const DressIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L9 8V11L5 22H19L15 11V8L12 2Z" />
    <path d="M9 8L5 11M15 8L19 11" />
    <path d="M9 2H15" />
  </svg>
);

// Stat chip
function StatChip({ label, value, color, isDark }: {
  label: string; value: string | number; color: string; isDark: boolean;
}) {
  return (
    <motion.div whileHover={{ y: -2 }}
      className="flex flex-col items-center gap-1 px-4 py-3 rounded-2xl text-center flex-shrink-0"
      style={glass(isDark, { minWidth: 108 })}>
      <span className="text-xl font-bold" style={{ color, fontFamily: "'Oswald', sans-serif", letterSpacing: '0.01em' }}>
        {value}
      </span>
      <span className="text-[11px]"
        style={{ color: isDark ? 'rgba(255,255,255,0.42)' : 'rgba(60,42,24,0.46)', fontFamily: 'Cairo, sans-serif' }}>
        {label}
      </span>
    </motion.div>
  );
}

// Action card
interface CardDef {
  title: string; icon: React.ReactNode;
  action: 'link' | 'popup'; to?: string; popupKey?: 'sale' | 'rental';
  accent: string;
}

function ActionCard({ card, isDark, onPopup }: {
  card: CardDef; isDark: boolean; onPopup: (k: 'sale' | 'rental') => void;
}) {
  const inner = (
    <motion.div
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.975 }}
      className="flex flex-col items-center justify-center rounded-[22px] p-5 text-center cursor-pointer gap-3"
      style={glass(isDark, { minHeight: 128 })}
    >
      <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full"
        style={{
          background: card.accent,
          border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.60)',
          boxShadow: isDark
            ? '0 6px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.10)'
            : '0 8px 16px rgba(124,124,124,0.07), inset 0 1px 0 rgba(255,255,255,0.88)',
          color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(72,50,22,0.82)',
        }}>
        {card.icon}
      </div>
      <span style={{
        fontFamily: 'Cairo, sans-serif', fontSize: '0.83rem',
        fontWeight: isDark ? 600 : 800,
        color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)',
      }}>
        {card.title}
      </span>
    </motion.div>
  );

  if (card.action === 'popup') {
    return <button onClick={() => onPopup(card.popupKey!)} className="block w-full text-start">{inner}</button>;
  }
  return <Link to={card.to!} className="block">{inner}</Link>;
}

// Reminder types
const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#e05252', high: '#e09a52', normal: '#c9a84c', low: 'rgba(255,255,255,0.40)',
};
const TYPE_ICON: Record<string, React.ReactNode> = {
  pickup: <Package size={14} />,
  return: <RotateCcw size={14} />,
  payment: <Wallet size={14} />,
  cleaning: <Sparkles size={14} />,
};

const REMINDER_TYPE_META: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  pickup:   { label: 'استلام', bg: 'rgba(96,165,250,0.16)',  color: '#60a5fa', icon: <Package size={11} /> },
  return:   { label: 'إرجاع',  bg: 'rgba(34,211,238,0.15)',  color: '#22d3ee', icon: <RotateCcw size={11} /> },
  payment:  { label: 'دفع',    bg: 'rgba(74,222,128,0.15)',  color: '#4ade80', icon: <Wallet size={11} /> },
  cleaning: { label: 'تنظيف', bg: 'rgba(192,132,252,0.16)', color: '#c084fc', icon: <Sparkles size={11} /> },
};

type PayCurrency = 'SYP' | 'USD' | 'TRY';
const PAY_CURRENCIES: PayCurrency[] = ['SYP', 'USD', 'TRY'];
const DISP_LABELS: Record<string, string> = { SYP: 'ل.س', USD: '$', TRY: '₺' };

function payToOriginal(payAmt: number, payCurr: string, tx: Transaction): number {
  const usd = tx.usd_to_syp_snapshot || 14000;
  const tryR = tx.usd_to_try_snapshot || 34;
  const orig = tx.currency || 'SYP';
  const syp = payCurr === 'SYP' ? payAmt : payCurr === 'USD' ? payAmt * usd : payAmt * (usd / tryR);
  if (orig === 'SYP') return syp;
  if (orig === 'USD') return syp / usd;
  return syp * tryR / usd;
}
function originalToPay(origAmt: number, payCurr: string, tx: Transaction): number {
  const usd = tx.usd_to_syp_snapshot || 14000;
  const tryR = tx.usd_to_try_snapshot || 34;
  const orig = tx.currency || 'SYP';
  const syp = orig === 'SYP' ? origAmt : orig === 'USD' ? origAmt * usd : origAmt * (usd / tryR);
  if (payCurr === 'SYP') return syp;
  if (payCurr === 'USD') return syp / usd;
  return syp * tryR / usd;
}
function fmtPay(val: number, curr: string): string {
  const r = curr === 'SYP' ? Math.round(val) : Math.round(val * 100) / 100;
  return `${r.toLocaleString('en-US', { maximumFractionDigits: curr === 'SYP' ? 0 : 2 })} ${DISP_LABELS[curr] ?? curr}`;
}

// Activity log helpers
type ActivityLabelKey =
  | 'sale'
  | 'rental'
  | 'reservation'
  | 'return'
  | 'cleaning'
  | 'expense'
  | 'inventory'
  | 'delivery'
  | 'reminder'
  | 'payment'
  | 'user'
  | 'system'
  | 'other';

const ACTIVITY_LABEL_META: Record<ActivityLabelKey, { label: string; bg: string; color: string }> = {
  sale:      { label: 'بيع',      bg: 'rgba(201,168,76,0.18)', color: '#c9a84c' },
  rental:    { label: 'تأجير',    bg: 'rgba(96,165,250,0.16)', color: '#60a5fa' },
  reservation:{ label: 'حجز',     bg: 'rgba(59,130,246,0.14)', color: '#60a5fa' },
  return:    { label: 'إرجاع',    bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
  cleaning:  { label: 'تنظيف',    bg: 'rgba(192,132,252,0.16)', color: '#c084fc' },
  expense:   { label: 'مصروف',    bg: 'rgba(248,113,113,0.14)', color: '#f87171' },
  inventory: { label: 'فستان',    bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' },
  delivery:  { label: 'توريد',    bg: 'rgba(45,212,191,0.15)', color: '#2dd4bf' },
  reminder:  { label: 'تذكير',    bg: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  payment:   { label: 'دفعة',     bg: 'rgba(74,222,128,0.15)', color: '#4ade80' },
  user:      { label: 'مستخدم',   bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.62)' },
  system:    { label: 'سيستم',    bg: 'rgba(148,163,184,0.14)', color: '#cbd5e1' },
  other:     { label: 'أخرى',     bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.58)' },
};

const ENTITY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  dress:       { label: 'فستان',   icon: <DressIcon size={13} /> },
  transaction: { label: 'معاملة',  icon: <ShoppingBag size={13} /> },
  expense:     { label: 'مصروف',   icon: <Wallet size={13} /> },
  reminder:    { label: 'تذكير',   icon: <Bell size={13} /> },
  delivery:    { label: 'توريد',   icon: <Truck size={13} /> },
  user:        { label: 'مستخدم',  icon: <Users size={13} /> },
  system:      { label: 'سيستم',   icon: <ClipboardList size={13} /> },
};

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}
function weekStart() {
  const d = todayStart(); d.setDate(d.getDate() - 6); return d;
}

type QuickRange = 'all' | 'today' | 'week';

function resolveLogLabel(log: Pick<ActivityLog, 'action' | 'entity_type' | 'description'>): ActivityLabelKey {
  const action = log.action.toLowerCase();
  const entity = log.entity_type.toLowerCase();
  const description = log.description.toLowerCase();

  if (action.includes('sale')) return 'sale';
  if (action.includes('reserve')) return 'reservation';
  if (action.includes('rental') || action.includes('reserve')) return 'rental';
  if (action.includes('return')) return 'return';
  if (action.includes('cleaning')) return 'cleaning';
  if (action.includes('expense') || entity === 'expense') return 'expense';
  if (action.includes('dress') || entity === 'dress') return 'inventory';
  if (action.includes('delivery') || entity === 'delivery') return 'delivery';
  if (action.includes('reminder') || entity === 'reminder') return 'reminder';
  if (action.includes('payment') || action.includes('complete_transaction')) return 'payment';
  if (action.includes('login') || entity === 'user') return 'user';
  if (action.includes('system') || action.includes('settings') || entity === 'system') return 'system';
  if (description.includes('بيع')) return 'sale';
  if (description.includes('حجز')) return 'reservation';
  if (description.includes('تأجير')) return 'rental';
  if (description.includes('إرجاع') || description.includes('ارجاع')) return 'return';
  if (description.includes('تنظيف')) return 'cleaning';
  if (description.includes('مصروف')) return 'expense';
  if (description.includes('توريد')) return 'delivery';
  if (description.includes('سيستم') || description.includes('النظام')) return 'system';

  return 'other';
}

function shouldHideActivityLog(log: Pick<ActivityLog, 'action' | 'entity_type'>) {
  const action = log.action.toLowerCase();
  const entity = log.entity_type.toLowerCase();
  return action.includes('customer') || entity === 'customer';
}

function hoursAgoIso(hoursAgo: number) {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

function createDemoActivityLogs(): ActivityLog[] {
  return [
    {
      id: 'demo-system-1',
      action: 'system_update',
      entity_type: 'system',
      description: 'تم تحديث إعدادات النظام وحفظ التغييرات العامة',
      user_name: 'Demo',
      created_at: hoursAgoIso(1),
    },
    {
      id: 'demo-cleaning-1',
      action: 'send_to_cleaning',
      entity_type: 'dress',
      entity_id: 'W014',
      description: 'تم إرسال الفستان W014 إلى التنظيف بعد الإرجاع',
      user_name: 'Demo',
      created_at: hoursAgoIso(2),
    },
    {
      id: 'demo-delivery-1',
      action: 'create_delivery',
      entity_type: 'delivery',
      entity_id: 'DLV-2026-018',
      description: 'تم تسجيل توريد جديد من المورد الملكي بقيمة 8,400 ر.س',
      user_name: 'Demo',
      created_at: hoursAgoIso(4),
    },
    {
      id: 'demo-reservation-1',
      action: 'reserve_dress',
      entity_type: 'transaction',
      entity_id: 'RSV-11',
      description: 'تم حجز الفستان W033 لموعد نهاية الأسبوع',
      user_name: 'Demo',
      created_at: hoursAgoIso(6),
    },
    {
      id: 'demo-payment-1',
      action: 'complete_transaction',
      entity_type: 'transaction',
      entity_id: 'TX-991',
      description: 'تم دفع 900 ر.س وإقفال المعاملة بنجاح',
      user_name: 'Demo',
      created_at: hoursAgoIso(8),
    },
    {
      id: 'demo-inventory-1',
      action: 'create_dress',
      entity_type: 'dress',
      entity_id: 'W120',
      description: 'تمت إضافة فستان جديد للمخزون بالكود W120',
      user_name: 'Demo',
      created_at: hoursAgoIso(26),
    },
    {
      id: 'demo-reminder-1',
      action: 'create_reminder',
      entity_type: 'reminder',
      entity_id: 'RM-202',
      description: 'تم إنشاء تذكير لمتابعة دفعة العميل مساءً',
      user_name: 'Demo',
      created_at: hoursAgoIso(32),
    },
  ];
}

function matchesSmartDateFilter(value: string, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(currentWeekStart.getDate() - 6);

  const sameDay = (other: Date) => startOfDay.getTime() === other.getTime();

  if (['today', 'heute', 'اليوم'].includes(q)) return sameDay(today);
  if (['yesterday', 'gestern', 'امس', 'أمس'].includes(q)) return sameDay(yesterday);
  if (['week', 'this week', 'diese woche', 'الاسبوع', 'الأسبوع', 'هذا الأسبوع'].includes(q)) {
    return startOfDay >= currentWeekStart && startOfDay <= now;
  }
  if (['month', 'this month', 'dieser monat', 'الشهر', 'هذا الشهر'].includes(q)) {
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  const yearMatch = q.match(/^\d{4}$/);
  if (yearMatch) return date.getFullYear() === Number.parseInt(q, 10);

  const isoMatch = q.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return (
      date.getFullYear() === Number.parseInt(isoMatch[1], 10) &&
      date.getMonth() + 1 === Number.parseInt(isoMatch[2], 10) &&
      date.getDate() === Number.parseInt(isoMatch[3], 10)
    );
  }

  const dayFirstMatch = q.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dayFirstMatch) {
    return (
      date.getDate() === Number.parseInt(dayFirstMatch[1], 10) &&
      date.getMonth() + 1 === Number.parseInt(dayFirstMatch[2], 10) &&
      date.getFullYear() === Number.parseInt(dayFirstMatch[3], 10)
    );
  }

  const monthYearMatch = q.match(/^(\d{1,2})[./-](\d{4})$/);
  if (monthYearMatch) {
    return (
      date.getMonth() + 1 === Number.parseInt(monthYearMatch[1], 10) &&
      date.getFullYear() === Number.parseInt(monthYearMatch[2], 10)
    );
  }

  const dayMonthMatch = q.match(/^(\d{1,2})[./-](\d{1,2})$/);
  if (dayMonthMatch) {
    return (
      date.getDate() === Number.parseInt(dayMonthMatch[1], 10) &&
      date.getMonth() + 1 === Number.parseInt(dayMonthMatch[2], 10)
    );
  }

  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const dateTokens = [
    `${yyyy}-${mm}-${dd}`,
    `${dd}/${mm}/${yyyy}`,
    `${dd}.${mm}.${yyyy}`,
    `${dd}-${mm}-${yyyy}`,
    `${mm}/${yyyy}`,
    `${dd}/${mm}`,
    `${dd}.${mm}`,
    yyyy,
  ];

  return dateTokens.some((token) => token.includes(q));
}

// Detail drawer
function DetailRow({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: 'rgba(255,255,255,0.42)', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', fontWeight: 600,
        color: color ?? 'rgba(255,255,255,0.88)', textAlign: 'end' }}>
        {value}
      </span>
    </div>
  );
}

function DetailPanel({ title, onClose, children, isDark }: {
  title: string; onClose: () => void; children: React.ReactNode; isDark: boolean;
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-sm rounded-2xl"
          style={{
            background: isDark ? 'rgba(18,16,26,0.96)' : 'rgba(255,255,255,0.96)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.10)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          }}
        >
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)' }}>
            <h3 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.95rem', fontWeight: 700,
              color: isDark ? 'rgba(255,255,255,0.90)' : 'rgba(55,38,18,0.90)' }}>
              {title}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg"
              style={{ color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.40)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-3 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {children}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Page
export function Homepage() {
  const { theme, language, addToast, remindersRefreshKey, bumpReminders, exchangeRates } = useUIStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const fmtUSD = (v: number) =>
    `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showSale, setShowSale] = useState(false);
  const [showRental, setShowRental] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [reminderTypeFilter, setReminderTypeFilter] = useState('');
  const [reminderTimeFilter, setReminderTimeFilter] = useState('');
  const [reminderSearch, setReminderSearch] = useState('');
  const [completingReminder, setCompletingReminder] = useState<Reminder | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [settleFetching, setSettleFetching] = useState<string | null>(null);
  const [settleData, setSettleData] = useState<{ reminder: Reminder; tx: Transaction } | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);
  const [payCurrency, setPayCurrency] = useState<PayCurrency>('SYP');
  const [payAmount, setPayAmount] = useState('');
  const [returningReminder, setReturningReminder] = useState<Reminder | null>(null);
  const [returnNeedsCleaning, setReturnNeedsCleaning] = useState(false);
  const [returnCleanerName, setReturnCleanerName] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [cleaningReminder, setCleaningReminder] = useState<Reminder | null>(null);
  const [cleaningDressId, setCleaningDressId] = useState<string | null>(null);
  const [cleaningLoading, setCleaningLoading] = useState(false);
  const [cleaningFetching, setCleaningFetching] = useState<string | null>(null);

  // Activity log state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logDateQuery, setLogDateQuery] = useState('');
  const [logLabel, setLogLabel] = useState<ActivityLabelKey | ''>('');
  const [logQuick, setLogQuick] = useState<QuickRange>('all');
  const demoLogs = useMemo(() => createDemoActivityLogs(), []);

  const load = () => {
    api.home.getSummary().then(setSummary).catch(() => null);
    api.reminders.getAll(undefined).then(setReminders).catch(() => null);
    setLogsLoading(true);
    api.activity.getLog(300).then(setLogs).catch(() => null).finally(() => setLogsLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Sync: when RemindersList (or any page) bumps the key, refresh reminders + summary here
  useEffect(() => {
    if (remindersRefreshKey > 0) {
      api.reminders.getAll(undefined).then(setReminders).catch(() => null);
      api.home.getSummary().then(setSummary).catch(() => null);
    }
  }, [remindersRefreshKey]);

  // Poll reminders every 15 s so the field stays current
  useEffect(() => {
    const id = setInterval(() => {
      api.reminders.getAll(undefined).then(setReminders).catch(() => null);
      api.home.getSummary().then(setSummary).catch(() => null);
    }, 15000);
    return () => clearInterval(id);
  }, []);

  const visibleLogs = useMemo(() => {
    return [...demoLogs, ...logs]
      .filter((log) => !shouldHideActivityLog(log))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [demoLogs, logs]);

  const handlePopup = (k: 'sale' | 'rental') => k === 'sale' ? setShowSale(true) : setShowRental(true);

  const handleCompleteButton = async (r: Reminder) => {
    if (r.reminder_type === 'payment' && r.transaction_id) {
      setSettleFetching(r.id);
      try {
        const tx = await api.transactions.getOne(r.transaction_id);
        const c = (tx.currency || 'SYP') as PayCurrency;
        const roundedRem = c === 'SYP' ? Math.round(tx.remaining) : Math.round(tx.remaining * 100) / 100;
        if (roundedRem <= 0) {
          // Already fully paid — just close the reminder
          await api.reminders.markDone(r.id);
          addToast('success', 'تم السداد بالكامل — تم حذف التذكير');
          bumpReminders();
          load();
          return;
        }
        setPayCurrency(c);
        setPayAmount(roundedRem.toString());
        setSettleData({ reminder: r, tx });
      } catch (e) { addToast('error', String(e)); }
      finally { setSettleFetching(null); }
    } else if (r.reminder_type === 'return' && r.transaction_id) {
      setReturnNeedsCleaning(false);
      setReturnCleanerName('');
      setReturningReminder(r);
    } else if (r.reminder_type === 'cleaning' && r.transaction_id) {
      setCleaningFetching(r.id);
      try {
        const tx = await api.transactions.getOne(r.transaction_id);
        setCleaningDressId(tx.dress_id);
        setCleaningReminder(r);
      } catch (e) { addToast('error', String(e)); }
      finally { setCleaningFetching(null); }
    } else {
      setCompletingReminder(r);
    }
  };

  const handleConfirmReturn = async () => {
    if (!returningReminder?.transaction_id) return;
    setReturnLoading(true);
    try {
      await api.transactions.processReturn({
        transaction_id: returningReminder.transaction_id,
        needs_cleaning: returnNeedsCleaning,
        cleaner_name: returnNeedsCleaning && returnCleanerName.trim() ? returnCleanerName.trim() : undefined,
      });
      addToast('success', 'تم إرجاع الفستان وتسوية الحساب');
      setReturningReminder(null);
      bumpReminders();
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setReturnLoading(false); }
  };

  const handleConfirmCleaning = async () => {
    if (!cleaningReminder) return;
    setCleaningLoading(true);
    try {
      if (cleaningDressId) {
        try {
          await api.transactions.markCleaningDone(cleaningDressId);
        } catch {
          // Dress already returned to available — just remove the stale reminder
        }
      }
      await api.reminders.markDone(cleaningReminder.id);
      addToast('success', 'تم الانتهاء من التنظيف وإعادة الفستان للمخزون');
      setCleaningReminder(null);
      setCleaningDressId(null);
      bumpReminders();
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setCleaningLoading(false); }
  };

  const handleConfirmDone = async () => {
    if (!completingReminder) return;
    setCompleteLoading(true);
    try {
      await api.reminders.markDone(completingReminder.id);
      addToast('success', 'تم إنهاء التذكير');
      setCompletingReminder(null);
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setCompleteLoading(false); }
  };

  const handleSettle = async () => {
    if (!settleData) return;
    const amtInOriginal = payToOriginal(parseFloat(payAmount) || 0, payCurrency, settleData.tx);
    const clamped = Math.min(amtInOriginal, settleData.tx.remaining);
    if (clamped <= 0) return;
    setSettleLoading(true);
    try {
      await api.transactions.complete(settleData.tx.id, clamped);
      addToast('success', 'تمت تسوية الدفع');
      setSettleData(null);
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setSettleLoading(false); }
  };

  const CARDS: CardDef[] = [
    { title: 'بيع فستان',    icon: <ShoppingBag size={22} />, action: 'popup', popupKey: 'sale',
      accent: isDark ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.16)' },
    { title: 'تأجير فستان',  icon: <Calendar size={22} />,    action: 'popup', popupKey: 'rental',
      accent: isDark ? 'rgba(99,179,237,0.20)' : 'rgba(99,179,237,0.15)' },
    { title: 'المرتجعات',    icon: <RotateCcw size={22} />,   action: 'link',  to: '/rentals',
      accent: isDark ? 'rgba(110,200,120,0.20)' : 'rgba(110,200,120,0.15)' },
    { title: 'التنظيف',      icon: <Sparkles size={22} />,    action: 'link',  to: '/cleaning',
      accent: isDark ? 'rgba(192,132,252,0.20)' : 'rgba(192,132,252,0.15)' },
    { title: 'الفساتين',     icon: <DressIcon size={22} />,   action: 'link',  to: '/inventory',
      accent: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.46)' },
    { title: 'العملاء',      icon: <Users size={22} />,       action: 'link',  to: '/customers',
      accent: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.46)' },
    { title: 'المصروفات',    icon: <Wallet size={22} />,      action: 'link',  to: '/expenses',
      accent: isDark ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.12)' },
    { title: 'التوريدات',    icon: <Truck size={22} />,       action: 'link',  to: '/deliveries',
      accent: isDark ? 'rgba(6,182,212,0.20)' : 'rgba(6,182,212,0.14)' },
  ];

  const overdueCount = reminders.filter(r => isOverdue(r.date)).length;

  const filteredReminders = useMemo(() => {
    let result = reminders;
    if (reminderTypeFilter) result = result.filter(r => r.reminder_type === reminderTypeFilter);
    if (reminderTimeFilter === 'overdue') {
      result = result.filter(r => isOverdue(r.date));
    } else if (reminderTimeFilter === 'today') {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const n = new Date(t); n.setDate(n.getDate() + 1);
      result = result.filter(r => { const d = new Date(r.date); return d >= t && d < n; });
    } else if (reminderTimeFilter === 'week') {
      const t = new Date(); t.setHours(0, 0, 0, 0);
      const n = new Date(t); n.setDate(n.getDate() + 7);
      result = result.filter(r => { const d = new Date(r.date); return d >= t && d <= n; });
    }
    if (reminderSearch.trim()) {
      const q = reminderSearch.trim().toLowerCase();
      result = result.filter(r =>
        r.title.toLowerCase().includes(q) ||
        (r.customer_name ?? '').toLowerCase().includes(q) ||
        (r.dress_code ?? '').toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const aO = isOverdue(a.date) ? 0 : 1;
      const bO = isOverdue(b.date) ? 0 : 1;
      if (aO !== bO) return aO - bO;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }, [reminders, reminderTypeFilter, reminderTimeFilter, reminderSearch]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    let result = visibleLogs;

    if (logQuick === 'today') {
      const start = todayStart();
      result = result.filter(l => new Date(l.created_at) >= start);
    } else if (logQuick === 'week') {
      const start = weekStart();
      result = result.filter(l => new Date(l.created_at) >= start);
    }

    if (logLabel) result = result.filter((log) => resolveLogLabel(log) === logLabel);

    if (logDateQuery.trim()) result = result.filter((log) => matchesSmartDateFilter(log.created_at, logDateQuery));

    return result.slice(0, 80);
  }, [visibleLogs, logQuick, logLabel, logDateQuery]);

  const HIDDEN_LOG_LABELS = new Set(['inventory', 'reservation', 'payment', 'reminder']);

  const availableLogLabels = useMemo(() => {
    return [...new Set(visibleLogs.map((log) => resolveLogLabel(log)))].filter(
      (label): label is Exclude<ActivityLabelKey, 'other'> =>
        label !== 'other' && !HIDDEN_LOG_LABELS.has(label)
    );
  }, [visibleLogs]);

  const textColor = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';

  const chipStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.74rem',
    fontWeight: isDark ? 600 : 700,
    padding: '4px 12px',
    borderRadius: 999,
    cursor: 'pointer',
    transition: 'all 0.15s',
    border: active
      ? '1px solid rgba(201,168,76,0.50)'
      : isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)',
    background: active
      ? 'rgba(201,168,76,0.18)'
      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.40)',
    color: active ? '#c9a84c' : mutedColor,
  });

  const inputStyle: React.CSSProperties = {
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.78rem',
    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
    border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)',
    borderRadius: 12,
    padding: '5px 10px',
    color: textColor,
    outline: 'none',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} className="space-y-6">

      {/* Stats bar */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04, type: 'spring', stiffness: 420, damping: 36 }}
          className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin"
        >
          <StatChip label="إيجارات نشطة"   value={summary.active_rentals}    color={isDark ? '#5ab0e8' : '#3a88c0'} isDark={isDark} />
          <StatChip label="إيرادات اليوم"  value={fmtUSD(summary.today_revenue)} color={isDark ? '#c9a84c' : '#a87830'} isDark={isDark} />
          <StatChip label="مدفوعات معلقة" value={fmtUSD(summary.pending_payments)} color="#e05252" isDark={isDark} />
          <StatChip label="فساتين متاحة"  value={summary.available_dresses}  color={isDark ? '#4caf7a' : '#2e8c58'} isDark={isDark} />
          <StatChip label="قيد التنظيف"   value={summary.cleaning_dresses}   color={isDark ? 'rgba(255,255,255,0.50)' : 'rgba(60,42,24,0.45)'} isDark={isDark} />
          <StatChip label="تذكيرات"        value={summary.pending_reminders}  color={summary.pending_reminders > 0 ? '#e09a52' : (isDark ? 'rgba(255,255,255,0.50)' : 'rgba(60,42,24,0.45)')} isDark={isDark} />
          <StatChip label="معاملات اليوم" value={summary.today_transactions} color={isDark ? 'rgba(255,255,255,0.50)' : 'rgba(60,42,24,0.45)'} isDark={isDark} />
        </motion.div>
      )}

      {/* Action cards */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: 'spring', stiffness: 420, damping: 36 }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3"
      >
        {CARDS.map((card) => (
          <ActionCard key={card.title} card={card} isDark={isDark} onPopup={handlePopup} />
        ))}
      </motion.div>

      {/* Reminders */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, type: 'spring', stiffness: 420, damping: 36 }}
        className="rounded-[24px] p-4"
        style={glass(isDark)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '1rem', fontWeight: isDark ? 700 : 800,
              color: isDark ? 'rgba(255,255,255,0.90)' : 'rgba(60,42,24,0.88)' }}>
              التذكيرات
            </h2>
            {reminders.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,42,24,0.06)', color: mutedColor, fontFamily: 'Cairo, sans-serif' }}>
                {filteredReminders.length}{filteredReminders.length !== reminders.length ? `/${reminders.length}` : ''}
              </span>
            )}
            {overdueCount > 0 && (
              <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(224,82,82,0.14)', color: '#e05252', border: '1px solid rgba(224,82,82,0.22)', fontFamily: 'Cairo, sans-serif' }}>
                <AlertTriangle size={9} /> {overdueCount} متأخر
              </span>
            )}
          </div>
          <button onClick={() => navigate('/reminders')}
            className="text-xs px-3 py-1 rounded-xl"
            style={{ color: isDark ? 'rgba(201,168,76,0.80)' : '#a87830',
              background: isDark ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.09)' }}>
            عرض الكل
          </button>
        </div>

        {/* Smart filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Type filter */}
          <div className="flex gap-1.5 flex-wrap">
            {([
              { key: '', label: 'الكل' },
              { key: 'pickup',   label: 'استلام' },
              { key: 'return',   label: 'إرجاع'  },
              { key: 'payment',  label: 'دفع'    },
              { key: 'cleaning', label: 'تنظيف'  },
            ] as const).map(opt => {
              const active = reminderTypeFilter === opt.key;
              const meta = opt.key ? REMINDER_TYPE_META[opt.key] : null;
              return (
                <button key={opt.key} onClick={() => setReminderTypeFilter(active && opt.key ? '' : opt.key)}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                  style={{
                    fontFamily: 'Cairo, sans-serif', fontWeight: 600,
                    background: active ? (meta?.bg ?? 'rgba(201,168,76,0.18)') : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.40)'),
                    color: active ? (meta?.color ?? '#c9a84c') : mutedColor,
                    border: active
                      ? `1px solid ${meta?.color ?? '#c9a84c'}55`
                      : isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)',
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="w-px h-3 flex-shrink-0" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(60,42,24,0.12)' }} />

          {/* Time filter */}
          <div className="flex gap-1.5">
            {([
              { key: '',        label: 'الكل'     },
              { key: 'overdue', label: 'متأخر'    },
              { key: 'today',   label: 'اليوم'    },
              { key: 'week',    label: 'الأسبوع'  },
            ] as const).map(opt => {
              const active = reminderTimeFilter === opt.key;
              const isOverdueChip = opt.key === 'overdue';
              return (
                <button key={opt.key} onClick={() => setReminderTimeFilter(active && opt.key ? '' : opt.key)}
                  className="text-[11px] px-2.5 py-1 rounded-full transition-all"
                  style={{
                    fontFamily: 'Cairo, sans-serif', fontWeight: 600,
                    background: active
                      ? (isOverdueChip ? 'rgba(224,82,82,0.16)' : 'rgba(201,168,76,0.18)')
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.40)'),
                    color: active ? (isOverdueChip ? '#e05252' : '#c9a84c') : mutedColor,
                    border: active
                      ? (isOverdueChip ? '1px solid rgba(224,82,82,0.35)' : '1px solid rgba(201,168,76,0.40)')
                      : isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)',
                  }}>
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[100px] max-w-[160px]">
            <Search size={11} className="absolute end-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: mutedColor }} />
            <input value={reminderSearch} onChange={e => setReminderSearch(e.target.value)}
              placeholder="بحث..."
              style={{
                width: '100%', fontFamily: 'Cairo, sans-serif', fontSize: '0.73rem',
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)',
                border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)',
                borderRadius: 20, padding: '4px 24px 4px 10px',
                color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(55,38,18,0.85)',
                outline: 'none',
              }} />
          </div>
        </div>

        {/* List */}
        {filteredReminders.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2"
            style={{ color: isDark ? 'rgba(255,255,255,0.24)' : 'rgba(60,42,24,0.26)' }}>
            <CheckCircle size={28} className="opacity-40" />
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem' }}>
              {reminders.length === 0 ? 'لا توجد تذكيرات' : 'لا نتائج للفلتر الحالي'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
            {filteredReminders.map((r) => {
              const overdue = isOverdue(r.date);
              const typeMeta = REMINDER_TYPE_META[r.reminder_type] ?? {
                label: r.reminder_type,
                bg: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.55)',
                icon: <Bell size={11} />,
              };
              return (
                <motion.div key={r.id} whileHover={{ x: 2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  onClick={() => setSelectedReminder(r)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[14px] cursor-pointer"
                  style={{
                    background: overdue
                      ? (isDark ? 'rgba(224,82,82,0.07)' : 'rgba(224,82,82,0.04)')
                      : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.38)'),
                    border: isDark
                      ? `1px solid ${overdue ? 'rgba(224,82,82,0.18)' : 'rgba(255,255,255,0.06)'}`
                      : '1px solid transparent',
                  }}
                >
                  {/* Type label pill */}
                  <span className="flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: typeMeta.bg, color: typeMeta.color, fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>
                    {typeMeta.icon}
                    {typeMeta.label}
                  </span>

                  {/* Title + customer + dress */}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold"
                      style={{ color: isDark ? 'rgba(255,255,255,0.84)' : 'rgba(55,38,18,0.86)', fontFamily: 'Cairo, sans-serif' }}>
                      {r.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {r.customer_name && (
                        <p className="text-xs truncate" style={{ color: mutedColor, fontFamily: 'Cairo, sans-serif' }}>
                          {r.customer_name}
                        </p>
                      )}
                      {r.dress_code && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                          style={{ background: 'rgba(201,168,76,0.14)', color: '#c9a84c' }}>
                          {r.dress_code}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1 flex-shrink-0 text-[11px]"
                    style={{ color: overdue ? '#e05252' : mutedColor, fontFamily: 'Cairo, sans-serif' }}>
                    {overdue && <AlertTriangle size={9} />}
                    <Clock size={9} />
                    {formatDate(r.date, language)}
                  </div>

                  {/* Complete button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleCompleteButton(r); }}
                    disabled={settleFetching === r.id || cleaningFetching === r.id}
                    className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                    style={{
                      background: r.reminder_type === 'cleaning'
                        ? 'rgba(192,132,252,0.13)'
                        : 'rgba(74,222,128,0.13)',
                      color: r.reminder_type === 'cleaning' ? '#c084fc' : '#4ade80',
                      border: r.reminder_type === 'cleaning'
                        ? '1px solid rgba(192,132,252,0.28)'
                        : '1px solid rgba(74,222,128,0.28)',
                    }}
                    title={r.reminder_type === 'payment' ? 'تسوية الدفع' : r.reminder_type === 'cleaning' ? 'إتمام التنظيف' : 'إنهاء التذكير'}
                  >
                    {(settleFetching === r.id || cleaningFetching === r.id)
                      ? <Loader2 size={14} className="animate-spin" />
                      : r.reminder_type === 'payment' ? <Banknote size={14} />
                      : r.reminder_type === 'cleaning' ? <Sparkles size={14} />
                      : <CheckCircle size={14} />}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Activity log */}
      <motion.section
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.20, type: 'spring', stiffness: 420, damping: 36 }}
        className="rounded-[24px] p-4"
        style={glass(isDark)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,42,24,0.60)' }} />
            <h2 style={{ fontFamily: 'Cairo, sans-serif', fontSize: '1rem', fontWeight: isDark ? 700 : 800,
              color: isDark ? 'rgba(255,255,255,0.90)' : 'rgba(60,42,24,0.88)' }}>
              سجل النشاطات
            </h2>
            {filteredLogs.length > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,42,24,0.06)', color: mutedColor }}>
                {filteredLogs.length}
              </span>
            )}
          </div>
          {/* Smart date filter */}
          <div className="relative flex items-center">
            <Search size={12} className="absolute end-2.5" style={{ color: mutedColor, pointerEvents: 'none' }} />
            <input
              value={logDateQuery}
              onChange={e => setLogDateQuery(e.target.value)}
              placeholder="تاريخ ذكي: اليوم، الأسبوع، 06/05/2026..."
              style={{ ...inputStyle, paddingInlineEnd: 28, width: 220 }}
            />
          </div>
        </div>

        {/* Smart filters */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Quick range */}
          <div className="flex gap-1.5">
            {(['all', 'today', 'week'] as const).map((q) => (
              <button key={q} onClick={() => setLogQuick(q)}
                style={chipStyle(logQuick === q)}>
                {q === 'all' ? 'الكل' : q === 'today' ? 'اليوم' : 'الأسبوع'}
              </button>
            ))}
          </div>

          <div className="w-px h-4 mx-1" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(60,42,24,0.12)' }} />

          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setLogLabel('')} style={chipStyle(logLabel === '')}>الكل</button>
            {availableLogLabels.map(labelKey => (
              <button key={labelKey} onClick={() => setLogLabel(labelKey === logLabel ? '' : labelKey)}
                style={chipStyle(logLabel === labelKey)}>
                {ACTIVITY_LABEL_META[labelKey].label}
              </button>
            ))}
          </div>

          {(logLabel || logDateQuery) && (
            <>
              <div className="w-px h-4 mx-1" style={{ background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(60,42,24,0.12)' }} />
              <button
                onClick={() => { setLogLabel(''); setLogDateQuery(''); setLogQuick('all'); }}
                style={chipStyle(false)}
              >
                مسح الفلاتر
              </button>
            </>
          )}
        </div>

        {logDateQuery && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.44)',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)',
                color: mutedColor,
                fontFamily: 'Cairo, sans-serif',
              }}>
              فلتر التاريخ: {logDateQuery}
            </span>
          </div>
        )}

        {/* Log entries */}
        {logsLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={22} className="animate-spin" style={{ color: '#c9a84c' }} />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center py-12 gap-2"
            style={{ color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(60,42,24,0.24)' }}>
            <ClipboardList size={32} className="opacity-30" />
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem' }}>لا توجد نشاطات</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[420px] overflow-y-auto scrollbar-thin">
            <AnimatePresence initial={false}>
              {filteredLogs.map((log, i) => {
                const activityLabel = ACTIVITY_LABEL_META[resolveLogLabel(log)];
                const entity = ENTITY_META[log.entity_type];
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ delay: i < 12 ? i * 0.025 : 0, type: 'spring', stiffness: 500, damping: 40 }}
                    onClick={() => setSelectedLog(log)}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-[14px] cursor-pointer"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.38)',
                      border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                    }}
                  >
                    {/* Activity label */}
                    <span className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: activityLabel.bg,
                        color: activityLabel.color,
                        fontFamily: 'Cairo, sans-serif',
                        minWidth: 40,
                        textAlign: 'center',
                      }}>
                      {activityLabel.label}
                    </span>

                    {/* Entity icon */}
                    {entity && (
                      <span className="flex-shrink-0" style={{ color: mutedColor }}>
                        {entity.icon}
                      </span>
                    )}

                    {/* Description */}
                    <p className="flex-1 min-w-0 truncate text-sm"
                      style={{ fontFamily: 'Cairo, sans-serif', color: isDark ? 'rgba(255,255,255,0.78)' : 'rgba(55,38,18,0.82)' }}>
                      {log.description}
                    </p>

                    {/* User */}
                    {log.user_name && (
                      <span className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full hidden sm:block"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.05)',
                          color: mutedColor,
                          fontFamily: 'Cairo, sans-serif',
                        }}>
                        {log.user_name}
                      </span>
                    )}

                    {/* Timestamp */}
                    <span className="flex-shrink-0 text-[10px]"
                      style={{ color: mutedColor, fontFamily: 'Cairo, sans-serif', direction: 'ltr' }}>
                      {formatDateTime(log.created_at, language)}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.section>

      {/* Popups */}
      <SaleForm open={showSale} onClose={() => setShowSale(false)} onSaved={() => { setShowSale(false); load(); }} />
      <RentalForm open={showRental} onClose={() => setShowRental(false)} onSaved={() => { setShowRental(false); load(); }} />

      {/* Reminder detail */}
      {selectedReminder && (() => {
        const typeMeta = REMINDER_TYPE_META[selectedReminder.reminder_type];
        return (
          <DetailPanel title={selectedReminder.title} onClose={() => setSelectedReminder(null)} isDark={isDark}>
            {typeMeta && (
              <div className="flex items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ background: typeMeta.bg, color: typeMeta.color, fontFamily: 'Cairo, sans-serif' }}>
                  {typeMeta.icon} {typeMeta.label}
                </span>
                {isOverdue(selectedReminder.date) && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(224,82,82,0.14)', color: '#e05252', fontFamily: 'Cairo, sans-serif' }}>
                    متأخر
                  </span>
                )}
              </div>
            )}
            {selectedReminder.description && (
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.83rem',
                color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,42,24,0.65)', marginBottom: 12, lineHeight: 1.6 }}>
                {selectedReminder.description}
              </p>
            )}
            <DetailRow label="التاريخ" value={formatDate(selectedReminder.date, language)}
              color={isOverdue(selectedReminder.date) ? '#f87171' : undefined} />
            {selectedReminder.customer_name && (
              <DetailRow label="العميل" value={selectedReminder.customer_name} />
            )}
            <DetailRow label="تاريخ الإنشاء" value={formatDateTime(selectedReminder.created_at, language)} />
            <div className="flex gap-2 mt-4">
              {selectedReminder.reminder_type === 'payment' && selectedReminder.transaction_id && (
                <button
                  onClick={() => { setSelectedReminder(null); handleCompleteButton(selectedReminder); }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: 'rgba(74,222,128,0.14)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', fontFamily: 'Cairo, sans-serif' }}>
                  تسوية الدفع
                </button>
              )}
              <button
                onClick={() => { const r = selectedReminder; setSelectedReminder(null); handleCompleteButton(r); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.07)', color: mutedColor, border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.10)', fontFamily: 'Cairo, sans-serif' }}>
                {selectedReminder.reminder_type === 'return' ? 'تسجيل الإرجاع' : 'إنهاء التذكير'}
              </button>
            </div>
          </DetailPanel>
        );
      })()}

      {/* Return dress modal */}
      {returningReminder && (
        <Modal open onClose={() => setReturningReminder(null)} title="تأكيد الإرجاع" size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setReturningReminder(null)} disabled={returnLoading}>إلغاء</Button>
              <Button variant="primary" onClick={handleConfirmReturn} loading={returnLoading}>تأكيد الإرجاع</Button>
            </>
          }
        >
          <div className="space-y-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <p style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,42,24,0.65)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              إرجاع الفستان
              {returningReminder.dress_code && (
                <strong style={{ color: '#c9a84c' }}> {returningReminder.dress_code} </strong>
              )}
              {returningReminder.customer_name && (
                <>من <strong style={{ color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.88)' }}>{returningReminder.customer_name}</strong></>
              )}
              . سيتم إغلاق الحساب تلقائياً.
            </p>
            <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)' }}>
              <input type="checkbox" checked={returnNeedsCleaning} onChange={e => setReturnNeedsCleaning(e.target.checked)}
                className="w-4 h-4 rounded" style={{ accentColor: '#c9a84c' }} />
              <span className="text-sm" style={{ color: isDark ? 'rgba(255,255,255,0.70)' : 'rgba(60,42,24,0.70)' }}>يحتاج تنظيف</span>
            </label>
            {returnNeedsCleaning && (
              <input value={returnCleanerName} onChange={e => setReturnCleanerName(e.target.value)}
                placeholder="اسم المنظِّف (اختياري)..."
                style={{
                  width: '100%', fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem',
                  background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)',
                  border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.10)',
                  borderRadius: 10, color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)',
                  outline: 'none', padding: '8px 12px',
                }} />
            )}
          </div>
        </Modal>
      )}

      {/* Cleaning complete modal */}
      {cleaningReminder && (
        <Modal open onClose={() => { setCleaningReminder(null); setCleaningDressId(null); }} title="إتمام التنظيف" size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => { setCleaningReminder(null); setCleaningDressId(null); }} disabled={cleaningLoading}>إلغاء</Button>
              <Button variant="primary" onClick={handleConfirmCleaning} loading={cleaningLoading}>تأكيد الانتهاء</Button>
            </>
          }
        >
          <div className="space-y-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <p style={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(60,42,24,0.65)', fontSize: '0.88rem', lineHeight: 1.6 }}>
              الانتهاء من تنظيف الفستان
              {cleaningReminder.dress_code && (
                <strong style={{ color: '#c9a84c' }}> {cleaningReminder.dress_code} </strong>
              )}
              {cleaningReminder.customer_name && (
                <>الخاص بـ <strong style={{ color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.88)' }}>{cleaningReminder.customer_name}</strong></>
              )}
              . سيتم إعادة الفستان إلى المخزون تلقائياً.
            </p>
            <div className="px-3 py-2.5 rounded-xl flex items-center gap-2"
              style={{ background: 'rgba(192,132,252,0.10)', border: '1px solid rgba(192,132,252,0.25)' }}>
              <Sparkles size={14} style={{ color: '#c084fc', flexShrink: 0 }} />
              <span className="text-sm" style={{ color: '#c084fc' }}>سيتم تغيير حالة الفستان إلى "متاح"</span>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm done (non-payment) */}
      <ConfirmDialog
        open={!!completingReminder}
        onClose={() => setCompletingReminder(null)}
        onConfirm={handleConfirmDone}
        loading={completeLoading}
        title="إنهاء التذكير"
        message={`إنهاء التذكير: ${completingReminder?.title}؟`}
        confirmLabel="إنهاء"
      />

      {/* Settle payment modal (full, with currency picker) */}
      {settleData && (
        <Modal open onClose={() => setSettleData(null)} title="تسوية الدفع" size="sm"
          footer={
            <>
              <Button variant="ghost" onClick={() => setSettleData(null)} disabled={settleLoading}>إلغاء</Button>
              <Button variant="gold" onClick={handleSettle} loading={settleLoading}
                disabled={!(parseFloat(payAmount) > 0)}>
                تسوية
              </Button>
            </>
          }
        >
          {(() => {
            const tx = settleData.tx;
            const origCurr = (tx.currency || 'SYP') as PayCurrency;
            const amtInOriginal = payToOriginal(parseFloat(payAmount) || 0, payCurrency, tx);
            const isDiff = payCurrency !== origCurr;
            return (
              <div className="space-y-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
                {/* Remaining */}
                <div className="px-3 py-2.5 rounded-xl"
                  style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)' }}>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.50)' }}>المبلغ المتبقي</p>
                  <p className="text-lg font-bold" style={{ color: '#f87171' }}>
                    {fmtPay(tx.remaining, tx.currency || 'SYP')}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {tx.customer_name}
                  </p>
                </div>
                {/* Currency picker */}
                <div>
                  <p className="text-sm mb-2" style={{ color: 'rgba(255,255,255,0.55)' }}>عملة الدفع</p>
                  <div className="flex gap-1.5">
                    {PAY_CURRENCIES.map(c => (
                      <button key={c} type="button"
                        onClick={() => {
                          setPayCurrency(c);
                          const conv = originalToPay(tx.remaining, c, tx);
                          setPayAmount((c === 'SYP' ? Math.round(conv) : Math.round(conv * 100) / 100).toString());
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
                  <input type="number" min="0" step="any" value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl outline-none text-sm"
                    style={{
                      fontFamily: 'Cairo, sans-serif',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: 'rgba(255,255,255,0.88)', colorScheme: 'dark',
                    }} />
                </div>
                {/* Conversion hint */}
                {isDiff && parseFloat(payAmount) > 0 && (
                  <div className="px-3 py-2 rounded-xl text-sm"
                    style={{ background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>يعادل بسعر يوم العقد: </span>
                    <span style={{ color: '#c9a84c', fontWeight: 700 }}>{fmtPay(amtInOriginal, origCurr)}</span>
                    {amtInOriginal > tx.remaining + 0.001 && (
                      <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                        يتجاوز المتبقي — سيُحسب {fmtPay(tx.remaining, tx.currency || 'SYP')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}

      {/* Activity log detail */}
      {selectedLog && (() => {
        const activityLabel = ACTIVITY_LABEL_META[resolveLogLabel(selectedLog)];
        const entity = ENTITY_META[selectedLog.entity_type];
        let parsedMeta: Record<string, unknown> | null = null;
        try { if (selectedLog.metadata) parsedMeta = JSON.parse(selectedLog.metadata); } catch {}
        return (
          <DetailPanel title="تفاصيل النشاط" onClose={() => setSelectedLog(null)} isDark={isDark}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ background: activityLabel.bg, color: activityLabel.color, fontFamily: 'Cairo, sans-serif' }}>
                {activityLabel.label}
              </span>
              {entity && (
                <span className="flex items-center gap-1 text-xs"
                  style={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,42,24,0.45)', fontFamily: 'Cairo, sans-serif' }}>
                  {entity.icon} {entity.label}
                </span>
              )}
            </div>
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem',
              color: isDark ? 'rgba(255,255,255,0.80)' : 'rgba(55,38,18,0.80)', marginBottom: 12, lineHeight: 1.6 }}>
              {selectedLog.description}
            </p>
            {selectedLog.user_name && <DetailRow label="المستخدم" value={selectedLog.user_name} />}
            {selectedLog.entity_id && <DetailRow label="المعرّف" value={
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', opacity: 0.7 }}>{selectedLog.entity_id}</span>
            } />}
            <DetailRow label="الوقت" value={formatDateTime(selectedLog.created_at, language)} />
            {parsedMeta && Object.keys(parsedMeta).length > 0 && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.72rem',
                  color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(60,42,24,0.35)', marginBottom: 6 }}>
                  بيانات إضافية
                </p>
                {Object.entries(parsedMeta).map(([k, v]) => (
                  <DetailRow key={k} label={k} value={String(v)} />
                ))}
              </div>
            )}
          </DetailPanel>
        );
      })()}
    </motion.div>
  );
}
