import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, ChevronRight, CalendarDays, RotateCcw,
  Wallet, Sparkles, CheckCircle, Trash2, AlertTriangle, Plus,
  User, Tag, FileText, X, Truck,
} from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { tok } from '../../utils/themeTokens';
import { api } from '../../lib/api';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input, Select, TextArea } from '../../components/Input';
import { GlassDatePicker } from '../../components/GlassDatePicker';
import { formatDate, isOverdue, todayISO } from '../../utils/formatters';
import type { Reminder, CalendarEvent } from '../../types';

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

type DisplayType = 'rental_start' | 'rental_end' | 'payment' | 'cleaning' | 'delivery' | 'reminder';

const EVENT_COLORS_BASE: Record<DisplayType, { bg: string; lightBg: string; darkText: string; lightText: string; icon: React.ReactNode; label: string }> = {
  rental_start: { bg: 'rgba(201,168,76,0.18)',  lightBg: 'rgba(143,110,40,0.13)',  darkText: '#c9a84c', lightText: '#8f6e28', icon: <CalendarDays size={10} />, label: 'تأجير' },
  rental_end:   { bg: 'rgba(120,180,120,0.18)', lightBg: 'rgba(30,110,53,0.11)',   darkText: '#6aad6a', lightText: '#1e6e35', icon: <RotateCcw size={10} />,   label: 'إرجاع' },
  payment:      { bg: 'rgba(180,120,200,0.18)', lightBg: 'rgba(124,58,237,0.11)',  darkText: '#b07ac8', lightText: '#7c3aed', icon: <Wallet size={10} />,       label: 'دفعة' },
  cleaning:     { bg: 'rgba(100,160,220,0.18)', lightBg: 'rgba(29,111,168,0.11)',  darkText: '#60a4dc', lightText: '#1d6fa8', icon: <Sparkles size={10} />,    label: 'تنظيف' },
  delivery:     { bg: 'rgba(240,160,80,0.18)',  lightBg: 'rgba(194,65,12,0.10)',   darkText: '#e09a52', lightText: '#c2410c', icon: <Truck size={10} />,        label: 'توصيل' },
  reminder:     { bg: 'rgba(255,120,120,0.18)', lightBg: 'rgba(220,38,38,0.10)',   darkText: '#e07070', lightText: '#dc2626', icon: <AlertTriangle size={10} />, label: 'موعد' },
};

function resolveType(raw: string): DisplayType {
  if (raw in EVENT_COLORS_BASE) return raw as DisplayType;
  if (raw === 'return')  return 'rental_end';
  if (raw === 'rental')  return 'rental_start';
  if (raw === 'pickup')  return 'rental_start';
  if (raw === 'payment') return 'payment';
  if (raw === 'cleaning') return 'cleaning';
  return 'reminder';
}

type CellEvent =
  | { kind: 'cal'; data: CalendarEvent }
  | { kind: 'reminder'; data: Reminder };

const CUSTOM_REMINDER_TYPES_KEY = 'reminder_custom_types';
function loadCustomReminderTypes(): string[] {
  try { return JSON.parse(localStorage.getItem(CUSTOM_REMINDER_TYPES_KEY) || '[]'); }
  catch { return []; }
}
function saveCustomReminderTypes(types: string[]) {
  localStorage.setItem(CUSTOM_REMINDER_TYPES_KEY, JSON.stringify(types));
}

const DAYS_AR   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'منخفض' }, { value: 'normal', label: 'عادي' },
  { value: 'high', label: 'مرتفع' }, { value: 'urgent', label: 'عاجل' },
];
const PREDEFINED_TYPE_OPTIONS = [
  { value: 'pickup', label: 'استلام' }, { value: 'return', label: 'إرجاع' },
  { value: 'payment', label: 'دفع' }, { value: 'cleaning', label: 'تنظيف' },
];
const PREDEFINED_TYPE_VALUES = new Set(PREDEFINED_TYPE_OPTIONS.map(o => o.value));

function AddReminderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { addToast, theme } = useUIStore();
  const isDark = theme === 'dark';
  const [form, setForm] = useState({ reminder_type: 'pickup', title: '', description: '', date: todayISO() });
  const [customType, setCustomType] = useState('');
  const [customTypes, setCustomTypes] = useState<string[]>(loadCustomReminderTypes);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setIsDirty(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const finalType = form.reminder_type === 'other' ? customType.trim() : form.reminder_type;
    if (!finalType) return;

    if (form.reminder_type === 'other' && finalType && !customTypes.includes(finalType) && !PREDEFINED_TYPE_VALUES.has(finalType)) {
      const updated = [...customTypes, finalType];
      setCustomTypes(updated);
      saveCustomReminderTypes(updated);
    }

    setLoading(true);
    try {
      await api.reminders.create({ reminder_type: finalType, title: form.title,
        description: form.description || undefined, date: form.date, priority: 'normal' });
      addToast('success', 'تم إضافة التذكير');
      onSaved();
    } catch (err) { addToast('error', String(err)); }
    finally { setLoading(false); }
  };

  const typeOptions = [
    ...PREDEFINED_TYPE_OPTIONS,
    ...customTypes.map(c => ({ value: c, label: c })),
    { value: 'other', label: 'أخرى (مخصص)…' },
  ];

  return (
    <Modal open onClose={onClose} isDirty={isDirty} title="إضافة تذكير" size="md"
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button variant="gold" form="rem-form" type="submit" loading={loading}>حفظ</Button></>}>
      <form id="rem-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="العنوان" value={form.title} onChange={e => set('title', e.target.value)} required />
        <div className="flex flex-col gap-1.5">
          <Select label="النوع" value={form.reminder_type} onChange={e => set('reminder_type', e.target.value)} options={typeOptions} />
          {form.reminder_type === 'other' && (
            <input
              autoFocus
              placeholder="اكتب نوع الموعد…"
              value={customType}
              onChange={e => { setCustomType(e.target.value); setIsDirty(true); }}
              className="h-10 px-3 text-sm rounded-xl outline-none"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
                border: isDark ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(201,168,76,0.40)',
                color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)',
                fontFamily: 'Cairo, sans-serif',
              }}
            />
          )}
        </div>
        <GlassDatePicker label="التاريخ" value={form.date} onChange={v => set('date', v)} required />
        <TextArea label="الوصف" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
      </form>
    </Modal>
  );
}

export function CalendarPage() {
  const { theme, language } = useUIStore();
  const { canDelete } = usePermissions();
  const isDark = theme === 'dark';
  const t = tok(isDark);
  const EVENT_COLORS = Object.fromEntries(Object.entries(EVENT_COLORS_BASE).map(([k, v]) => {
    const text = isDark ? v.darkText : v.lightText;
    return [k, { ...v, text, activeBg: isDark ? v.bg : v.lightBg, iconBg: `${text}30` }];
  })) as Record<DisplayType, { bg: string; lightBg: string; activeBg: string; iconBg: string; darkText: string; lightText: string; text: string; icon: React.ReactNode; label: string }>;

  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<number | null>(today.getDate());

  const [calEvents, setCalEvents]       = useState<CalendarEvent[]>([]);
  const [reminders, setReminders]       = useState<Reminder[]>([]);
  const [tab, setTab]                   = useState<'events' | 'reminders'>('reminders');
  const [showAddForm, setShowAddForm]   = useState(false);
  const [detailDay, setDetailDay]       = useState<number | null>(null);
  const [detailReminder, setDetailReminder] = useState<Reminder | null>(null);
  const [summaryType, setSummaryType]   = useState<DisplayType | null>(null);
  const [deleting, setDeleting]         = useState<Reminder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadReminders = () => api.reminders.getAll().then(setReminders).catch(console.error);

  const loadCalEvents = (y: number, m: number) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${y}-${pad(m + 1)}-01`;
    const to   = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
    api.calendar.getEvents(from, to).then(setCalEvents).catch(console.error);
  };

  useEffect(() => { loadReminders(); }, []);
  useEffect(() => { loadCalEvents(year, month); }, [year, month]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); setSelected(null); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y+1); } else setMonth(m => m+1); setSelected(null); };

  // calEvents already includes reminders (get_calendar_events queries reminders table too)
  const eventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return calEvents.filter(ev => ev.date.startsWith(dateStr));
  };

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

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
  const selectedEvents = selected ? eventsForDay(selected) : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.22 }} className="space-y-4">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04, type: 'spring', stiffness: 440, damping: 38 }}
        className="flex items-center justify-between rounded-[24px] px-5 py-4"
        style={glassPanel(isDark)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {(Object.entries(EVENT_COLORS) as [DisplayType, typeof EVENT_COLORS[DisplayType]][]).map(([type, c]) => (
            <div key={type} className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full" style={{ background: c.iconBg, color: c.text }}>{c.icon}</span>
              <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.70rem', color: t.textMuted }}>{c.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 rounded-[14px] px-4 py-2 font-semibold"
            style={{
              fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem',
              background: isDark ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.16)',
              color: isDark ? '#d4aa58' : '#a87830',
              border: isDark ? '1px solid rgba(201,168,76,0.35)' : '1px solid rgba(201,168,76,0.30)',
              boxShadow: '0 2px 10px rgba(201,168,76,0.15)',
            }}>
            <Plus size={15} /> إضافة موعد
          </motion.button>
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

        {/* Calendar Grid */}
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
                const dayEvs = eventsForDay(day);
                const active  = selected === day;
                const todayC  = isToday(day);
                return (
                  <motion.button key={day} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(active ? null : day)}
                    onDoubleClick={e => { e.stopPropagation(); if (dayEvs.length > 0) setDetailDay(day); }}
                    className="relative flex flex-col items-center rounded-[14px] px-1 py-2"
                    style={{
                      minHeight: 60,
                      background: active ? (isDark ? 'rgba(201,168,76,0.18)' : 'rgba(201,168,76,0.12)') : todayC ? (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.60)') : 'transparent',
                      border: active ? `1px solid ${isDark ? 'rgba(201,168,76,0.40)' : 'rgba(201,168,76,0.35)'}` : todayC ? (isDark ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.90)') : '1px solid transparent',
                    }}>
                    <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: todayC || active ? 700 : 400, color: active ? t.gold : todayC ? t.text1 : t.text2 }}>
                      {day}
                    </span>
                    {dayEvs.length > 0 && (
                      <div className="mt-1 flex flex-col items-center gap-0.5 w-full px-0.5">
                        {dayEvs.slice(0, 2).map((ev, i) => {
                          const type = resolveType(ev.event_type);
                          const c = EVENT_COLORS[type];
                          const label = type === 'reminder' ? ev.event_type : c.label;
                          return (
                            <span key={i} className="flex items-center gap-0.5 rounded-[5px] px-1 w-full justify-center"
                              style={{ background: c.activeBg, color: c.text, fontSize: '0.58rem', fontFamily: 'Cairo, sans-serif', lineHeight: '1.5' }}>
                              {c.icon}
                              <span className="truncate max-w-[36px]">{label}</span>
                            </span>
                          );
                        })}
                        {dayEvs.length > 2 && (
                          <span style={{ fontSize: '0.58rem', color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>+{dayEvs.length - 2}</span>
                        )}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right panel */}
        <motion.div
          initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.14, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] flex flex-col"
          style={glassPanel(isDark)}
        >
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

            {/* Reminders tab */}
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
                  pendingReminders.map(r => {
                    const overdue = isOverdue(r.date);
                    return (
                      <motion.div key={r.id} whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        onClick={() => setDetailReminder(r)}
                        className="flex items-start gap-2 rounded-[14px] px-3 py-2.5 cursor-pointer"
                        style={{
                          background: overdue ? (isDark ? 'rgba(224,82,82,0.08)' : 'rgba(224,82,82,0.05)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.42)'),
                          border: isDark ? `1px solid ${overdue ? 'rgba(224,82,82,0.20)' : 'rgba(255,255,255,0.07)'}` : '1px solid rgba(0,0,0,0.04)',
                        }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: t.text1, fontFamily: 'Cairo, sans-serif' }}>{r.title}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: overdue ? '#e05252' : t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
                            {formatDate(r.date, language)}
                          </p>
                          {r.customer_name && (
                            <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
                              <User size={9} /> {r.customer_name}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-0.5" onClick={e => e.stopPropagation()}>
                          <button onClick={() => markDone(r.id)} className="p-1 rounded-lg" style={{ color: '#4caf7a' }} title="تم">
                            <CheckCircle size={13} />
                          </button>
                          {canDelete && (
                            <button onClick={() => setDeleting(r)} className="p-1 rounded-lg" style={{ color: '#e05252' }} title="حذف">
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

            {/* Events tab */}
            {tab === 'events' && (
              <>
                {!selected && (
                  <p className="text-center py-8" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.textFaint }}>
                    انقر على يوم لعرض الأحداث · انقر مرتين لعرض التفاصيل
                  </p>
                )}
                {selected && selectedEvents.length === 0 && (
                  <p className="text-center py-8" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.textFaint }}>
                    لا توجد أحداث في هذا اليوم
                  </p>
                )}
                {selected && selectedEvents.map((ev, i) => {
                  const type = resolveType(ev.event_type);
                  const c = EVENT_COLORS[type];
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="rounded-[14px] px-3 py-2.5 space-y-1"
                      style={{ background: c.activeBg, border: `1px solid ${c.text}28` }}>
                      <div className="flex items-center gap-2">
                        <span style={{ color: c.text }}>{c.icon}</span>
                        <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: t.text1 }}>{ev.title}</span>
                      </div>
                      {ev.customer_name && (
                        <p className="flex items-center gap-1 text-[0.70rem] pr-5" style={{ color: t.text2, fontFamily: 'Cairo, sans-serif' }}>
                          <User size={10} style={{ color: c.text }} /> {ev.customer_name}
                        </p>
                      )}
                      {ev.dress_code && (
                        <p className="flex items-center gap-1 text-[0.70rem] pr-5" style={{ color: t.text2, fontFamily: 'Cairo, sans-serif' }}>
                          <Tag size={10} style={{ color: c.text }} /> {ev.dress_code}
                        </p>
                      )}
                    </motion.div>
                  );
                })}

                {/* Month summary */}
                <div className="mt-4 pt-3 space-y-1" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.67rem', fontWeight: 700, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.06em', paddingBottom: 4 }}>
                    ملخص الشهر
                  </p>
                  {(Object.entries(EVENT_COLORS) as [DisplayType, typeof EVENT_COLORS[DisplayType]][]).map(([type, c]) => {
                    const count = calEvents.filter(ev => resolveType(ev.event_type) === type).length;
                    if (count === 0) return null;
                    return (
                      <motion.button key={type} whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setSummaryType(type)}
                        className="flex items-center justify-between w-full rounded-[10px] px-2 py-1.5"
                        style={{ background: summaryType === type ? c.activeBg : 'transparent', border: `1px solid ${summaryType === type ? c.text + '30' : 'transparent'}` }}>
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: c.iconBg, color: c.text }}>{c.icon}</span>
                          <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.74rem', color: t.text2 }}>{c.label}</span>
                        </div>
                        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.88rem', fontWeight: 700, color: c.text }}>{count}</span>
                      </motion.button>
                    );
                  })}
                  {calEvents.length === 0 && (
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.74rem', color: t.textFaint, textAlign: 'center', padding: '8px 0' }}>
                      لا توجد أحداث هذا الشهر
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      {showAddForm && <AddReminderForm onClose={() => setShowAddForm(false)} onSaved={() => { setShowAddForm(false); loadReminders(); loadCalEvents(year, month); }} />}

      {/* Day detail popup (double-click) */}
      <AnimatePresence>
        {detailDay !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(5px)' }}
            onClick={() => setDetailDay(null)}>
            <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="rounded-[22px] p-5 w-full space-y-3 overflow-y-auto"
              style={isDark
                ? glassPanel(isDark, { maxWidth: 400, maxHeight: '80vh' })
                : { ...glassPanel(isDark, { maxWidth: 400, maxHeight: '80vh' }), background: 'rgba(255,255,255,0.94)' }}>
              <div className="flex items-center justify-between">
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: t.text1 }}>
                  {detailDay} {MONTHS_AR[month]} {year}
                </h2>
                <button onClick={() => setDetailDay(null)} className="w-7 h-7 flex items-center justify-center rounded-full"
                  style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', color: t.textMuted }}>
                  <X size={14} />
                </button>
              </div>
              {eventsForDay(detailDay).map((ev, i) => {
                const type = resolveType(ev.event_type);
                const c = EVENT_COLORS[type];
                const typeLabel = type === 'reminder' ? ev.event_type : c.label;
                return (
                  <div key={i} className="rounded-[14px] px-4 py-3 space-y-2"
                    style={{ background: c.activeBg, border: `1px solid ${c.text}28` }}>
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full flex-shrink-0"
                        style={{ background: c.iconBg, color: c.text }}>{c.icon}</span>
                      <div>
                        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.84rem', fontWeight: 700, color: t.text1 }}>{ev.title}</p>
                        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.68rem', color: c.text }}>{typeLabel}</p>
                      </div>
                    </div>
                    <div className="space-y-1 pr-8">
                      {ev.customer_name && (
                        <p className="flex items-center gap-1.5 text-[0.74rem]" style={{ color: t.text2, fontFamily: 'Cairo, sans-serif' }}>
                          <User size={11} style={{ color: c.text }} /> {ev.customer_name}
                        </p>
                      )}
                      {ev.dress_code && (
                        <p className="flex items-center gap-1.5 text-[0.74rem]" style={{ color: t.text2, fontFamily: 'Cairo, sans-serif' }}>
                          <Tag size={11} style={{ color: c.text }} /> {ev.dress_code}
                        </p>
                      )}
                      {ev.description && (
                        <p className="flex items-start gap-1.5 text-[0.74rem]" style={{ color: t.text2, fontFamily: 'Cairo, sans-serif' }}>
                          <FileText size={11} style={{ color: c.text, marginTop: 2, flexShrink: 0 }} /> {ev.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reminder detail popup */}
      <AnimatePresence>
        {detailReminder && (() => {
          const r = detailReminder;
          const overdue = isOverdue(r.date);
          const typeLabel: Record<string, string> = { pickup: 'استلام', return: 'إرجاع', payment: 'دفع', cleaning: 'تنظيف' };
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(5px)' }}
              onClick={() => setDetailReminder(null)}>
              <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                onClick={e => e.stopPropagation()}
                className="rounded-[22px] p-5 w-full space-y-4"
                style={glassPanel(isDark, { maxWidth: 380 })}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.68rem', color: t.textMuted, marginBottom: 4 }}>{typeLabel[r.reminder_type] ?? r.reminder_type}</p>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: t.text1 }}>{r.title}</h2>
                  </div>
                  <button onClick={() => setDetailReminder(null)} className="w-7 h-7 flex items-center justify-center rounded-full mt-0.5 flex-shrink-0"
                    style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', color: t.textMuted }}>
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-2">
                  {[
                    { icon: <CalendarDays size={13} />, label: 'التاريخ',  value: formatDate(r.date, language), color: overdue ? '#e05252' : t.gold },
                    r.customer_name ? { icon: <User size={13} />,     label: 'العميل',  value: r.customer_name, color: t.gold } : null,
                    r.dress_code    ? { icon: <Tag size={13} />,      label: 'الفستان', value: r.dress_code,    color: t.gold } : null,
                    r.description   ? { icon: <FileText size={13} />, label: 'الوصف',   value: r.description,   color: t.gold } : null,
                  ].filter(Boolean).map((row, i) => row && (
                    <div key={i} className="flex items-start gap-3 rounded-[12px] px-3 py-2.5"
                      style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.80)' }}>
                      <span style={{ color: (row as { color: string }).color, marginTop: 1 }}>{(row as { icon: React.ReactNode }).icon}</span>
                      <div>
                        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.65rem', color: t.textMuted }}>{(row as { label: string }).label}</p>
                        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.80rem', fontWeight: 600, color: t.text1 }}>{(row as { value: string }).value}</p>
                      </div>
                    </div>
                  ))}
                  {overdue && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[0.70rem] px-2 py-0.5 rounded-full" style={{ fontFamily: 'Cairo, sans-serif', background: 'rgba(224,82,82,0.14)', color: '#e05252' }}>متأخر</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="gold" onClick={() => { markDone(r.id); setDetailReminder(null); }}>تم</Button>
                  <Button variant="ghost" onClick={() => setDetailReminder(null)}>إغلاق</Button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Summary type popup */}
      <AnimatePresence>
        {summaryType && (() => {
          const c = EVENT_COLORS[summaryType];
          const events = calEvents.filter(ev => resolveType(ev.event_type) === summaryType);
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(5px)' }}
              onClick={() => setSummaryType(null)}>
              <motion.div initial={{ scale: 0.92, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 16 }}
                transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                onClick={e => e.stopPropagation()}
                className="rounded-[22px] p-5 w-full space-y-3 overflow-y-auto"
                style={glassPanel(isDark, { maxWidth: 420, maxHeight: '80vh' })}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: c.bg, color: c.text }}>{c.icon}</span>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: t.text1 }}>
                      {c.label} — {MONTHS_AR[month]}
                    </h2>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ fontFamily: 'Cairo, sans-serif', background: c.bg, color: c.text }}>{events.length}</span>
                  </div>
                  <button onClick={() => setSummaryType(null)} className="w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)', color: t.textMuted }}>
                    <X size={14} />
                  </button>
                </div>
                {events.map((ev, i) => {
                  const d = new Date(ev.date);
                  return (
                    <div key={i} className="rounded-[14px] px-4 py-3 space-y-2"
                      style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.80)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', fontWeight: 700, color: t.text1 }}>{ev.title}</p>
                        <span className="text-[0.70rem] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ fontFamily: "'Playfair Display', serif", background: c.bg, color: c.text, fontWeight: 700 }}>
                          {d.getDate()} {MONTHS_AR[d.getMonth()]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {ev.customer_name && (
                          <p className="flex items-center gap-1 text-[0.72rem]" style={{ color: t.text2, fontFamily: 'Cairo, sans-serif' }}>
                            <User size={10} style={{ color: c.text }} /> {ev.customer_name}
                          </p>
                        )}
                        {ev.dress_code && (
                          <p className="flex items-center gap-1 text-[0.72rem]" style={{ color: t.text2, fontFamily: 'Cairo, sans-serif' }}>
                            <Tag size={10} style={{ color: c.text }} /> {ev.dress_code}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {events.length === 0 && (
                  <p className="text-center py-6" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', color: t.textFaint }}>لا توجد أحداث</p>
                )}
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} title="حذف التذكير" message={`حذف: ${deleting?.title}؟`}
        danger confirmLabel="حذف" />
    </motion.div>
  );
}
