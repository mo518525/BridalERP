import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, Trash2, AlertTriangle, Loader2, Plus, ArrowRight, Banknote } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/Button';
import { StatusBadge } from '../../components/StatusBadge';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { Input, Select, TextArea } from '../../components/Input';
import { GlassDatePicker } from '../../components/GlassDatePicker';
import { formatDate, isOverdue, todayISO } from '../../utils/formatters';
import type { Reminder, Transaction } from '../../types';
import { cn } from '../../utils/cn';

const TYPE_ICONS: Record<string, string> = {
  pickup: '📦', return: '↩️', payment: '💰', cleaning: '🧹',
};

const TYPE_OPTIONS = [
  { value: 'pickup', label: 'استلام' }, { value: 'return', label: 'إرجاع' },
  { value: 'payment', label: 'دفع' }, { value: 'cleaning', label: 'تنظيف' },
];

// Table layout
const REMINDERS_COLS = 'auto 2fr 0.8fr 1fr auto';
const REMINDERS_HDR: React.CSSProperties = {
  gridTemplateColumns: REMINDERS_COLS,
  fontFamily: 'Cairo, sans-serif',
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(16px) saturate(160%)',
  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
  borderBottom: '1px solid rgba(212,175,55,0.22)',
  color: 'rgba(212,175,55,0.55)',
  whiteSpace: 'nowrap' as const,
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
const item = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function RemindersList() {
  const { t } = useTranslation();
  const { language, addToast, bumpReminders } = useUIStore();
  const navigate = useNavigate();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [deleting, setDeleting] = useState<Reminder | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [fetchingSettle, setFetchingSettle] = useState<string | null>(null);
  const [settlingPayment, setSettlingPayment] = useState<{ reminder: Reminder; tx: Transaction } | null>(null);
  const [settleLoading, setSettleLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.reminders.getAll(filterStatus || undefined);
      setReminders(data);
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const markDone = async (id: string) => {
    try {
      await api.reminders.markDone(id);
      addToast('success', 'تم التحديد كمنتهٍ');
      bumpReminders();
      load();
    } catch (e) { addToast('error', String(e)); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.reminders.delete(deleting.id);
      addToast('success', t('messages.deleted'));
      bumpReminders();
      setDeleting(null); load();
    } catch (e) { addToast('error', String(e)); }
    finally { setDeleteLoading(false); }
  };

  const handleSettleClick = async (r: Reminder) => {
    if (!r.transaction_id) return;
    setFetchingSettle(r.id);
    try {
      const tx = await api.transactions.getOne(r.transaction_id);
      setSettlingPayment({ reminder: r, tx });
    } catch (e) { addToast('error', String(e)); }
    finally { setFetchingSettle(null); }
  };

  const handleSettle = async () => {
    if (!settlingPayment) return;
    setSettleLoading(true);
    try {
      await api.transactions.complete(settlingPayment.tx.id, settlingPayment.tx.remaining);
      addToast('success', 'تمت تسوية الدفع بنجاح');
      bumpReminders();
      setSettlingPayment(null);
      load();
    } catch (e) { addToast('error', String(e)); }
    finally { setSettleLoading(false); }
  };

  const overdueCount = reminders.filter((r) => isOverdue(r.date) && r.status === 'pending').length;

  return (
    <div className="space-y-5">
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
          <h1 className="text-2xl font-bold text-white/90 flex items-center gap-2">
            <Bell size={22} className="text-gold-400" /> {t('reminders.title')}
          </h1>
          {overdueCount > 0 && (
            <p className="text-sm text-red-400 mt-0.5 flex items-center gap-1">
              <AlertTriangle size={13} /> {overdueCount} تذكير متأخر
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-2">
            {(['pending', 'done', ''] as const).map((s) => (
              <motion.button
                key={s}
                whileTap={{ scale: 0.96 }}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                  filterStatus === s
                    ? 'bg-gradient-to-r from-gold-400 to-gold-600 text-white border-transparent'
                    : 'border-white/12 text-white/55 hover:text-white/80 hover:border-white/20'
                )}
                style={filterStatus !== s ? { background: 'rgba(255,255,255,0.07)' } : {}}
              >
                {s === 'pending' ? 'معلق' : s === 'done' ? 'منتهي' : 'الكل'}
              </motion.button>
            ))}
          </div>
          <Button variant="gold" size="sm" icon={<Plus size={14} />} onClick={() => setShowForm(true)}>
            {t('reminders.addReminder')}
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold-400" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-white/30">
          <Bell size={52} className="mb-3 opacity-30" />
          <p>{t('reminders.noReminders')}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-white/[0.10]"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10 grid gap-x-4 px-4 py-2.5 text-xs font-semibold"
            style={REMINDERS_HDR}
          >
            <span></span>
            <span>العنوان</span>
            <span>النوع</span>
            <span>التاريخ</span>
            <span></span>
          </div>
          {/* Rows */}
          <motion.div variants={container} initial="hidden" animate="show">
            {reminders.map((r) => {
              const overdue = isOverdue(r.date) && r.status === 'pending';
              return (
                <motion.div key={r.id} variants={item}
                  className="grid gap-x-4 px-4 py-3 border-b last:border-b-0 transition-colors"
                  style={{
                    gridTemplateColumns: REMINDERS_COLS,
                    alignItems: 'center',
                    borderColor: 'rgba(255,255,255,0.05)',
                    background: overdue ? 'rgba(239,68,68,0.06)' : 'transparent',
                    borderRight: overdue ? '3px solid rgba(239,68,68,0.55)' : '3px solid transparent',
                  }}
                >
                  {/* Icon */}
                  <span className="text-xl w-8 text-center">{TYPE_ICONS[r.reminder_type] || '🔔'}</span>
                  {/* Title + customer */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-white/90 truncate">{r.title}</span>
                      {overdue && (
                        <span className="text-[10px] text-red-300 border border-red-400/25 px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: 'rgba(239,68,68,0.12)' }}>
                          متأخر
                        </span>
                      )}
                    </div>
                    {r.customer_name && <p className="text-xs text-white/40 mt-0.5 truncate">العميل: {r.customer_name}</p>}
                    {r.description && <p className="text-xs text-white/30 mt-0.5 truncate">{r.description}</p>}
                  </div>
                  {/* Type */}
                  <span className="text-xs text-white/50" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    {TYPE_OPTIONS.find((o) => o.value === r.reminder_type)?.label || r.reminder_type}
                  </span>
                  {/* Date */}
                  <span className="text-xs text-white/40" style={{ fontFamily: 'Cairo, sans-serif' }}>
                    {formatDate(r.date, language)}
                  </span>
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {r.status === 'pending' && r.reminder_type === 'payment' && r.transaction_id && (
                      <button
                        onClick={() => handleSettleClick(r)}
                        disabled={fetchingSettle === r.id}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'rgba(251,191,36,0.75)' }}
                        title="تسوية الدفع"
                      >
                        {fetchingSettle === r.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Banknote size={14} />}
                      </button>
                    )}
                    {r.status === 'pending' && (
                      <button onClick={() => markDone(r.id)}
                        className="p-1.5 rounded-lg text-emerald-400/70 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        title={t('actions.markDone')}>
                        <CheckCircle size={15} />
                      </button>
                    )}
                    <button onClick={() => setDeleting(r)}
                      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      )}

      {showForm && (
        <ReminderForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} title="حذف التذكير" message={`حذف: ${deleting?.title}؟`}
        danger confirmLabel={t('actions.delete')} />

      <ConfirmDialog
        open={!!settlingPayment}
        onClose={() => setSettlingPayment(null)}
        onConfirm={handleSettle}
        loading={settleLoading}
        title="تسوية الدفع"
        message={settlingPayment
          ? (() => {
              const tx = settlingPayment.tx;
              const c = tx.currency || 'SYP';
              const labels: Record<string, string> = { SYP: 'ل.س', USD: '$', TRY: '₺' };
              const rounded = c === 'SYP' ? Math.round(tx.remaining) : Math.round(tx.remaining * 100) / 100;
              const fmt = `${rounded.toLocaleString('en-US', { maximumFractionDigits: c === 'SYP' ? 0 : 2 })} ${labels[c] ?? c}`;
              return `تسوية المبلغ المتبقي ${fmt} من العميل ${tx.customer_name}؟`;
            })()
          : ''}
        confirmLabel="تسوية"
      />
    </div>
  );
}

function ReminderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { addToast } = useUIStore();
  const [form, setForm] = useState({
    reminder_type: 'pickup', title: '', description: '',
    date: todayISO(),
  });
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const set = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setIsDirty(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setLoading(true);
    try {
      await api.reminders.create({
        reminder_type: form.reminder_type, title: form.title,
        description: form.description || undefined, date: form.date, priority: 'normal',
      });
      addToast('success', 'تم إضافة التذكير');
      onSaved();
    } catch (err) { addToast('error', String(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} isDirty={isDirty} title="إضافة تذكير" size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button variant="gold" form="reminder-form" type="submit" loading={loading}>حفظ</Button>
        </>
      }
    >
      <form id="reminder-form" onSubmit={handleSubmit} className="space-y-4">
        <Input label="العنوان" value={form.title} onChange={(e) => set('title', e.target.value)} required />
        <Select label="النوع" value={form.reminder_type} onChange={(e) => set('reminder_type', e.target.value)} options={TYPE_OPTIONS} />
        <GlassDatePicker label="التاريخ" value={form.date} onChange={(v) => set('date', v)} required />
        <TextArea label="الوصف" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
      </form>
    </Modal>
  );
}
