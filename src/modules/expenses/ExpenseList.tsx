import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, DollarSign, Pencil, Trash2, Loader2, RefreshCw, ArrowRight, Search } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../../components/Button';
import { GlassSelect } from '../../components/GlassSelect';
import { GlassDatePicker } from '../../components/GlassDatePicker';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { Input, Select, TextArea } from '../../components/Input';
import { formatCurrency, formatDate, todayISO } from '../../utils/formatters';
import type { Expense, FilterParams, RecurringType } from '../../types';

const CATEGORY_OPTIONS = [
  { value: 'rent', label: 'إيجار' },
  { value: 'electricity', label: 'كهرباء' },
  { value: 'salary', label: 'رواتب' },
  { value: 'cleaning', label: 'تنظيف' },
  { value: 'marketing', label: 'تسويق' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'other', label: 'أخرى' },
];

const RECURRING_OPTIONS: { value: RecurringType; label: string }[] = [
  { value: 'none', label: 'مرة واحدة' },
  { value: 'monthly', label: 'شهري' },
  { value: 'weekly', label: 'أسبوعي' },
];

const RECURRING_META: Record<RecurringType, { label: string; color: string; bg: string }> = {
  none: { label: 'مرة واحدة', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  monthly: { label: 'شهري', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  weekly: { label: 'أسبوعي', color: '#34d399', bg: 'rgba(52,211,153,0.12)' },
};

// Table layout
const EXPENSES_COLS = '1fr 1fr 1fr 1fr 2fr auto';
const EXPENSES_HDR: React.CSSProperties = {
  gridTemplateColumns: EXPENSES_COLS,
  fontFamily: 'Cairo, sans-serif',
  background: 'rgba(255,255,255,0.055)',
  backdropFilter: 'blur(16px) saturate(160%)',
  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
  borderBottom: '1px solid rgba(212,175,55,0.22)',
  color: 'rgba(212,175,55,0.55)',
  whiteSpace: 'nowrap' as const,
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.03 } } };
const item = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function ExpenseList() {
  const { t } = useTranslation();
  const { language, addToast, theme } = useUIStore();
  const { canDelete, canViewFinance } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDark = theme === 'dark';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterParams>({});
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const total = expenses.reduce((sum, e) => {
    let usd: number;
    if (e.currency === 'USD') usd = e.amount;
    else if (e.currency === 'TRY') usd = e.amount / (e.usd_to_try_snapshot || 34);
    else usd = e.amount / (e.usd_to_syp_snapshot || 14000);
    return sum + usd;
  }, 0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.expenses.getAll(filter);
      setExpenses(data);
    } catch (error) {
      addToast('error', String(error));
    } finally {
      setLoading(false);
    }
  }, [addToast, filter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(load, filter.search?.trim() ? 250 : 0);
    return () => window.clearTimeout(timeoutId);
  }, [load, filter.search, filter.category, filter.date_from, filter.date_to, filter.recurring_type]);

  const recurringCounts = useMemo(() => {
    return expenses.reduce<Record<RecurringType, number>>((counts, expense) => {
      const key = expense.recurring_type as RecurringType;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, { none: 0, monthly: 0, weekly: 0 });
  }, [expenses]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.expenses.delete(deleting.id);
      addToast('success', t('messages.deleted'));
      setDeleting(null);
      load();
    } catch (error) {
      addToast('error', String(error));
    } finally {
      setDeleteLoading(false);
    }
  };

  const updateFilter = (patch: Partial<FilterParams>) => {
    setFilter((current) => ({ ...current, ...patch }));
  };

  const resetFilters = () => {
    setFilter({});
  };

  const textMuted = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  const textMain = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';

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
  };

  if (!canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/30">
        <DollarSign size={48} className="mb-3 opacity-30" />
        <p>{t('noPermission')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold"
          style={{ fontFamily: 'Cairo,sans-serif', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <ArrowRight size={15} /> رجوع
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white/90">{t('expenses.title')}</h1>
          <p className="text-sm text-white/40 mt-0.5">
            إجمالي: <span className="text-red-400 font-semibold">{formatCurrency(total, '$', language)}</span>
          </p>
        </div>
        <Button variant="gold" icon={<Plus size={16} />} onClick={() => { setEditing(null); setShowForm(true); }}>
          {t('expenses.addExpense')}
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="flex flex-wrap gap-2">
        {RECURRING_OPTIONS.map((option) => {
          const meta = RECURRING_META[option.value];
          const active = filter.recurring_type === option.value;
          return (
            <button
              key={option.value}
              onClick={() => updateFilter({ recurring_type: active ? undefined : option.value })}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: active ? meta.bg : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)',
                border: `1px solid ${active ? `${meta.color}44` : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(60,42,24,0.08)'}`,
                color: active ? meta.color : textMuted,
                fontWeight: active ? 700 : 500,
              }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: meta.color }} />
              {meta.label}
              <span className="opacity-60 text-[10px]">({recurringCounts[option.value] ?? 0})</span>
            </button>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="flex flex-wrap gap-2 items-center"
      >
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: textMuted }} />
          <input
            value={filter.search || ''}
            onChange={(event) => updateFilter({ search: event.target.value || undefined })}
            placeholder="ابحث بالفئة، الوصف، التاريخ، المبلغ أو نوع التكرار..."
            style={{ ...inputStyle, paddingInlineStart: 34, width: '100%' }}
          />
        </div>

        <GlassSelect
          value={filter.category || ''}
          onChange={(value) => updateFilter({ category: value || undefined })}
          options={CATEGORY_OPTIONS}
          placeholder="كل الفئات"
          containerClass="w-[150px] min-w-[150px]"
        />

        <GlassDatePicker value={filter.date_from || ''} onChange={(v) => updateFilter({ date_from: v || undefined })} placeholder="من تاريخ" containerClass="w-[160px]" />
        <span style={{ color: textMuted, fontSize: '0.78rem', fontFamily: 'Cairo' }}>—</span>
        <GlassDatePicker value={filter.date_to || ''} onChange={(v) => updateFilter({ date_to: v || undefined })} placeholder="إلى تاريخ" containerClass="w-[160px]" />

        {(filter.search || filter.category || filter.date_from || filter.date_to || filter.recurring_type) && (
          <button
            onClick={resetFilters}
            className="px-3 py-1.5 rounded-xl text-xs"
            style={{ fontFamily: 'Cairo, sans-serif', color: '#f87171', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}
          >
            مسح
          </button>
        )}
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold-400" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-white/30">
          <DollarSign size={52} className="mb-3 opacity-30" />
          <p>{t('expenses.noExpenses')}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-white/[0.10]"
          style={{ background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.35)' }}>
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10 grid gap-x-4 px-4 py-2.5 text-xs font-semibold"
            style={EXPENSES_HDR}
          >
            <span>الفئة</span>
            <span>المبلغ</span>
            <span>التاريخ</span>
            <span>التكرار</span>
            <span>الوصف</span>
            <span></span>
          </div>
          {/* Rows */}
          <motion.div variants={container} initial="hidden" animate="show">
          {expenses.map((expense) => {
            const recurringMeta = RECURRING_META[(expense.recurring_type || 'none') as RecurringType] ?? RECURRING_META.none;
            return (
              <motion.div key={expense.id} variants={item}
                className="grid gap-x-4 px-4 py-3 border-b last:border-b-0 transition-colors"
                style={{
                  gridTemplateColumns: EXPENSES_COLS,
                  alignItems: 'center',
                  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(60,42,24,0.06)',
                  borderRight: `3px solid ${recurringMeta.color}55`,
                }}
              >
                {/* Category */}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: recurringMeta.bg }}>
                    {expense.recurring_type !== 'none'
                      ? <RefreshCw size={13} style={{ color: recurringMeta.color }} />
                      : <DollarSign size={13} style={{ color: recurringMeta.color }} />}
                  </div>
                  <span className="text-sm font-semibold" style={{ color: textMain, fontFamily: 'Cairo, sans-serif' }}>
                    {CATEGORY_OPTIONS.find((c) => c.value === expense.category)?.label || expense.category}
                  </span>
                </div>
                {/* Amount */}
                <span className="text-sm font-bold text-red-400">{formatCurrency(expense.amount, expense.currency === 'USD' ? '$' : expense.currency === 'TRY' ? '₺' : 'SYP', language)}</span>
                {/* Date */}
                <span className="text-xs" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>{formatDate(expense.date, language)}</span>
                {/* Recurring */}
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold w-fit"
                  style={{ color: recurringMeta.color, background: recurringMeta.bg }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: recurringMeta.color }} />
                  {recurringMeta.label}
                </span>
                {/* Description */}
                <span className="text-xs truncate" style={{ color: textMuted, fontFamily: 'Cairo, sans-serif' }}>{expense.description || '—'}</span>
                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(expense); setShowForm(true); }}
                    className="p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/8 transition-colors">
                    <Pencil size={13} />
                  </button>
                  {canDelete && (
                    <button onClick={() => setDeleting(expense)}
                      className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
          </motion.div>
        </div>
      )}

      {showForm && (
        <ExpenseForm
          expense={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title={t('expenses.addExpense')}
        message={`حذف المصروف: ${deleting?.description || deleting?.category}؟`}
        danger
        confirmLabel={t('actions.delete')}
      />
    </div>
  );
}

interface FormProps { expense: Expense | null; onClose: () => void; onSaved: () => void; }

function ExpenseForm({ expense, onClose, onSaved }: FormProps) {
  const { t } = useTranslation();
  const { addToast, exchangeRates, theme } = useUIStore();
  const isDark = theme === 'dark';
  const [form, setForm] = useState({
    category: expense?.category ?? 'rent',
    amount: expense?.amount?.toString() ?? '',
    currency: expense?.currency ?? 'USD',
    description: expense?.description ?? '',
    date: expense?.date ?? todayISO(),
    recurring_type: (expense?.recurring_type ?? 'none') as RecurringType,
  });
  const EXPENSE_CURRENCIES = [
    { code: 'USD', label: '$',   size: '15px', font: 'system-ui, sans-serif' },
    { code: 'SYP', label: 'ل.س', size: '11px', font: 'Cairo, sans-serif'     },
    { code: 'TRY', label: '₺',   size: '15px', font: 'system-ui, sans-serif' },
  ] as const;
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const set = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setIsDirty(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.amount || isNaN(+form.amount) || +form.amount <= 0) return;
    setLoading(true);
    try {
      if (expense) {
        await api.expenses.update(expense.id, form.category, +form.amount, form.description || undefined, form.date, form.recurring_type);
      } else {
        await api.expenses.create({
          category: form.category,
          amount: +form.amount,
          currency: form.currency,
          description: form.description || undefined,
          date: form.date,
          recurring_type: form.recurring_type,
          usd_to_syp_snapshot: exchangeRates.usd_to_syp || 14000,
          usd_to_try_snapshot: exchangeRates.usd_to_try || 34,
        });
      }
      addToast('success', t('messages.saved'));
      onSaved();
    } catch (error) {
      addToast('error', String(error));
    } finally {
      setLoading(false);
    }
  };

  const textColor = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const labelColor = isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)';

  return (
    <Modal
      open
      onClose={onClose}
      isDirty={isDirty}
      title={expense ? t('expenses.editExpense') : t('expenses.addExpense')}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
          <Button variant="gold" form="exp-form" type="submit" loading={loading}>{t('actions.save')}</Button>
        </>
      }
    >
      <form id="exp-form" onSubmit={handleSubmit} className="space-y-4">
        <Select label={t('expenses.category')} value={form.category} onChange={(event) => set('category', event.target.value)} options={CATEGORY_OPTIONS} required />

        {/* Amount + currency picker */}
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif', color: labelColor }}>
            {t('expenses.amount')} <span style={{ color: '#f87171' }}>*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number" min="0.01" step="any" required
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0"
              className="flex-1 h-10 px-3 text-sm rounded-xl outline-none"
              style={{
                background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
                border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(60,42,24,0.12)',
                color: textColor,
                fontFamily: 'Cairo, sans-serif',
                colorScheme: isDark ? 'dark' : 'light',
              }}
            />
            <div className="flex gap-0.5 flex-shrink-0">
              {EXPENSE_CURRENCIES.map(({ code, label, size, font }) => (
                <button key={code} type="button"
                  onClick={() => set('currency', code)}
                  className="px-2.5 py-1 rounded-lg font-bold transition-all"
                  style={{
                    fontFamily: font,
                    fontSize: size,
                    background: form.currency === code ? 'rgba(201,168,76,0.22)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
                    color: form.currency === code ? '#c9a84c' : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,42,24,0.45)',
                    border: form.currency === code ? '1px solid rgba(201,168,76,0.40)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)',
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <GlassDatePicker label={t('expenses.date')} value={form.date} onChange={(v) => set('date', v)} required />
        <TextArea label={t('expenses.description')} value={form.description} onChange={(event) => set('description', event.target.value)} rows={2} />
        <Select label={t('expenses.recurring')} value={form.recurring_type} onChange={(event) => set('recurring_type', event.target.value)} options={RECURRING_OPTIONS} />
      </form>
    </Modal>
  );
}
