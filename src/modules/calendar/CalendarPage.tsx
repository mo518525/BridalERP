import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CalendarDays, ShoppingBag, RotateCcw,
  Wallet, Sparkles, Bell, CheckCircle, Trash2, AlertTriangle, Plus,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { tok } from '../../utils/themeTokens';
import { api } from '../../lib/api';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input, Select, TextArea } from '../../components/Input';
import { formatDate, isOverdue, todayISO } from '../../utils/formatters';
import type { Reminder } from '../../types';
import { cn } from '../../utils/cn';

function glassPanel(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.36)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.94)',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 14px 28px rgba(180,180,180,0.03), inset 0 1px 0 rgba(255,255,255,0.99)',
    ...extra,
  };
}

type EventType = 'rental' | 'return' | 'payment' | 'cleaning';

interface CalEvent { day: number; title: string; type: EventType; }

const EVENT_COLORS: Record<EventType, { bg: string; text: string; icon: React.ReactNode }> = {
  rental:   { bg: 'rgba(201,168,76,0.18)',  text: '#c9a84c', icon: <CalendarDays size={10} /> },
  return:   { bg: 'rgba(120,180,120,0.18)', text: '#6aad6a', icon: <RotateCcw size={10} /> },
  payment:  { bg: 'rgba(180,120,200,0.18)', text: '#b07ac8', icon: <Wallet size={10} /> },
  cleaning: { bg: 'rgba(100,160,220,0.18)', text: '#60a4dc', icon: <Sparkles size={10} /> },
};

const SAMPLE_EVENTS: CalEvent[] = [
  { day: 3,  title: 'تأجير فستان — سارة',   type: 'rental' },
  { day: 3,  title: 'دفعة متبقية',           type: 'payment' },
  { day: 7,  title: 'إرجاع فستان BR-0153',  type: 'return' },
  { day: 10, title: 'تنظيف 3 فساتين',       type: 'cleaning' },
  { day: 12, title: 'تأجير فستان — منى',    type: 'rental' },
  { day: 14, title: 'إرجاع فستان BR-0102',  type: 'return' },
  { day: 17, title: 'بيع فستان — ليلى',     type: 'rental' },
  { day: 20, title: 'تنظيف فستان BR-0099',  type: 'cleaning' },
  { day: 22, title: 'تأجير فستان — نور',    type: 'rental' },
  { day: 25, title: 'إرجاع فستان BR-0178',  type: 'return' },
  { day: 27, title: 'دفعة أولى',            type: 'payment' },
];

const DAYS_AR    = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MONTHS_AR  = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفض' }, { value: 'normal', label: 'عادي' },
  { value: 'high', label: 'مرتفع' }, { value: 'urgent', label: 'عاجل' },
];
const TYPE_OPTIONS = [
  { value: 'pickup', label: 'استلام' }, { value: 'return', label: 'إرجاع' },
  { value: 'payment', label: 'دفع' }, { value: 'cleaning', label: 'تنظيف' },
];

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#e05252', high: '#e09a52', normal: '#c9a84c', low: 'rgba(150,150,150,0.7)',
};

// ─── Add Reminder Form (inline) ───────────────────────────────────────────────

function AddReminderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { addToast } = useUIStore();
  const [form, setForm] = useState({ reminder_type: 'pickup', title: '', description: '', date: todayISO(), priority: 'normal' });
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setIsDirty(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    try {
      await api.reminders.create({ reminder_type: form.reminder_type, title: form.title,
        description: form.description || undefined, date: form.date, priority: form.priority });
      addToast('success', 'تم إضافة التذكير');
      onSaved();
    } catch (err) { addToast('error', String(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} isDirty={isDirty} title="إضافة تذكير" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button variant="gold" form="rem-form" type="submit" loading={loading}>حفظ</Button></>}>
      <form id="rem-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="العنوان" value={form.title} onChange={e => set('title', e.target.value)} required />
        <div className="grid grid-cols-2 gap-4">
          <Select label="النوع" value={form.reminder_type} onChange={e => set('reminder_type', e.target.value)} options={TYPE_OPTIONS} />
          <Select label="الأولوية" value={form.priority} onChange={e => set('priority', e.target.value)} options={PRIORITY_OPTIONS} />
        </div>
        <Input label="التاريخ" type="date" value={form.date} onChange={e => set('date', e.target.value)} required />
        <TextArea label="الوصف" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      </form>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const { theme, language } = useUIStore();
  const { canDelete } = usePermissions();
  const isDark = theme === 'dark';
  const t = tok(isDark);

  const today = new Date();
  const [year, setYear]     = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [selected, setSelected] = useState<number | null>(today.getDate());

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tab, setTab] = useState<'events' | 'reminders'>('reminders');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadReminders = () => {
    api.reminders.getAll().then(setReminders).catch(console.error);
  };
  useEffect(() => { loadReminders(); }, []);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); setSelected(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); setSelected(null); };

  const eventsForDay = (day: number) => SAMPLE_EVENTS.filter(e => e.day === day);
  const selectedEvents = selected ? eventsForDay(selected) : [];
  const isToday = (day: number) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const markDone = async (id: string) => {
    try { await api.reminders.markDone(id); loadReminders(); }
    catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try { await api.reminders.delete(deleting.id); setDeleting(null); loadReminders(); }
    catch (e) { console.error(e); }
    finally { setDeleteLoading(false); }
  };

  const pendingReminders = reminders.filter(r => r.status === 'pending');
  const overdueCount = pendingReminders.filter(r => isOverdue(r.date)).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} className="space-y-4">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, type: 'spring', stiffness: 440, damping: 38 }}
        className="flex items-center justify-between rounded-[24px] px-5 py-4"
        style={glassPanel(isDark)}
      >
        <div className="flex items-center gap-3">
          {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([type, c]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: c.bg, color: c.text }}>
                {c.icon}
              </span>
              <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.70rem', color: t.textMuted }}>
                {{ rental: 'تأجير', return: 'إرجاع', payment: 'دفعة', cleaning: 'تنظيف' }[type]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.18rem', fontWeight: 700, color: t.text1 }}>
            {MONTHS_AR[month]} {year}
          </h1>
          <div className="flex items-center gap-1">
            {([prevMonth, nextMonth] as (() => void)[]).map((fn, i) => (
              <motion.button key={i} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={fn}
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ color: t.gold, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.50)', border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.90)' }}>
                {i === 0 ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">

        {/* ── Calendar Grid ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-4"
          style={glassPanel(isDark)}
        >
          <div className="mb-2 grid grid-cols-7 gap-1">
            {DAYS_AR.map(d => (
              <div key={d} className="py-1 text-center"
                style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.70rem', fontWeight: 700, color: t.textMuted }}>
                {d.slice(0, 3)}
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${year}-${month}`}
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="grid grid-cols-7 gap-1"
            >
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const events = eventsForDay(day);
                const active  = selected === day;
                const todayC  = isToday(day);
                return (
                  <motion.button key={day} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(active ? null : day)}
                    className="relative flex flex-col items-center rounded-[14px] px-1 py-2"
                    style={{
                      minHeight: 60,
                      background: active ? (isDark ? 'rgba(201,168,76,0.18)' : 'rgba(201,168,76,0.12)') : todayC ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.60)') : 'transparent',
                      border: active ? `1px solid ${isDark ? 'rgba(201,168,76,0.40)' : 'rgba(201,168,76,0.35)'}` : todayC ? (isDark ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.90)') : '1px solid transparent',
                    }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: todayC || active ? 700 : 400, color: active ? t.gold : todayC ? t.text1 : t.text2 }}>
                      {day}
                    </span>
                    {events.length > 0 && (
                      <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                        {events.slice(0, 3).map((e, i) => (
                          <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_COLORS[e.type].text }} />
                        ))}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── Right panel: Events + Reminders ───────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.14, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] flex flex-col"
          style={glassPanel(isDark)}
        >
          {/* Tab bar */}
          <div className="flex border-b gap-1 p-3 pb-2" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
            {([
              { key: 'reminders', label: `التذكيرات${pendingReminders.length > 0 ? ` (${pendingReminders.length})` : ''}` },
              { key: 'events', label: selected ? `${selected} ${MONTHS_AR[month]}` : 'الأحداث' },
            ] as { key: 'reminders' | 'events'; label: string }[]).map(tb => (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={{
                  fontFamily: 'Cairo, sans-serif',
                  background: tab === tb.key ? (isDark ? 'rgba(201,168,76,0.18)' : 'rgba(201,168,76,0.12)') : 'transparent',
                  color: tab === tb.key ? (isDark ? '#d4aa58' : '#a87830') : t.textMuted,
                }}>
                {tb.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-2">

            {/* ── Reminders tab ─────────────────────────────────────── */}
            {tab === 'reminders' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  {overdueCount > 0 && (
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(224,82,82,0.14)', color: '#e05252', border: '1px solid rgba(224,82,82,0.20)' }}>
                      <AlertTriangle size={9} /> {overdueCount} متأخر
                    </span>
                  )}
                  <button onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-xl ms-auto"
                    style={{ background: isDark ? 'rgba(201,168,76,0.14)' : 'rgba(201,168,76,0.10)', color: isDark ? '#d4aa58' : '#a87830' }}>
                    <Plus size={11} /> إضافة
                  </button>
                </div>

                {pendingReminders.length === 0 ? (
                  <div className="flex flex-col items-center py-10 gap-2" style={{ color: t.textFaint }}>
                    <CheckCircle size={28} className="opacity-40" />
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem' }}>لا توجد تذكيرات</p>
                  </div>
                ) : (
                  pendingReminders.map((r) => {
                    const overdue = isOverdue(r.date);
                    return (
                      <motion.div key={r.id} whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className="flex items-start gap-2 rounded-[14px] px-3 py-2.5"
                        style={{
                          background: overdue ? (isDark ? 'rgba(224,82,82,0.08)' : 'rgba(224,82,82,0.05)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.42)'),
                          border: isDark ? `1px solid ${overdue ? 'rgba(224,82,82,0.20)' : 'rgba(255,255,255,0.07)'}` : '1px solid transparent',
                        }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: t.text1, fontFamily: 'Cairo, sans-serif' }}>{r.title}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: overdue ? '#e05252' : t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
                            {formatDate(r.date, language)}
                          </p>
                        </div>
                        <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: PRIORITY_COLOR[r.priority] }} />
                        <div className="flex gap-0.5">
                          <button onClick={() => markDone(r.id)} className="p-1 rounded-lg transition-colors"
                            style={{ color: '#4caf7a' }} title="تم">
                            <CheckCircle size={13} />
                          </button>
                          {canDelete && (
                            <button onClick={() => setDeleting(r)} className="p-1 rounded-lg transition-colors"
                              style={{ color: '#e05252' }} title="حذف">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </>
            )}

            {/* ── Events tab ────────────────────────────────────────── */}
            {tab === 'events' && (
              <>
                {!selected && (
                  <p className="text-center py-8" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.textFaint }}>
                    انقر على يوم لعرض الأحداث
                  </p>
                )}
                {selected && selectedEvents.length === 0 && (
                  <p className="text-center py-8" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.textFaint }}>
                    لا توجد أحداث في هذا اليوم
                  </p>
                )}
                {selected && selectedEvents.map((e, i) => {
                  const c = EVENT_COLORS[e.type];
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5"
                      style={{ background: c.bg, border: `1px solid ${c.text}28` }}>
                      <span style={{ color: c.text }}>{c.icon}</span>
                      <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', fontWeight: 500, color: t.text1 }}>
                        {e.title}
                      </span>
                    </motion.div>
                  );
                })}

                {/* Month summary */}
                <div className="mt-4 pt-3 space-y-2" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.67rem', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    ملخص الشهر
                  </p>
                  {(Object.entries(EVENT_COLORS) as [EventType, typeof EVENT_COLORS[EventType]][]).map(([type, c]) => {
                    const count = SAMPLE_EVENTS.filter(e => e.type === type).length;
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: c.bg, color: c.text }}>{c.icon}</span>
                          <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.74rem', color: t.text2 }}>
                            {{ rental: 'تأجير', return: 'إرجاع', payment: 'دفعة', cleaning: 'تنظيف' }[type]}
                          </span>
                        </div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: 700, color: c.text }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {showAddForm && <AddReminderForm onClose={() => setShowAddForm(false)} onSaved={() => { setShowAddForm(false); loadReminders(); }} />}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} title="حذف التذكير" message={`حذف: ${deleting?.title}؟`}
        danger confirmLabel="حذف" />
    </motion.div>
  );
}
