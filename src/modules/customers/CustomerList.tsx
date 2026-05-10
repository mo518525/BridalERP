import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, Pencil, Trash2, History, Loader2, Phone, MapPin, ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../../components/Button';
import { FilterBar } from '../../components/FilterBar';
import { ConfirmDialog, Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate, toWesternDigits } from '../../utils/formatters';
import { glassInput, glassInputStyle, glassLabel } from '../../utils/glassInput';
import type { Customer, Transaction } from '../../types';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function CustomerList() {
  const { t } = useTranslation();
  const { language, addToast } = useUIStore();
  const { canDelete } = usePermissions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [history, setHistory] = useState<{ customer: Customer; txs: Transaction[] } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.customers.getAll(search || undefined);
      setCustomers(data);
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.customers.delete(deleting.id);
      addToast('success', t('messages.deleted'));
      setDeleting(null); load();
    } catch (e) { addToast('error', String(e)); }
    finally { setDeleteLoading(false); }
  };

  const loadHistory = async (c: Customer) => {
    try {
      const txs = await api.customers.getHistory(c.id);
      setHistory({ customer: c, txs });
    } catch (e) { addToast('error', String(e)); }
  };

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
          <h1 className="text-2xl font-bold text-white/90">{t('customers.title')}</h1>
          <p className="text-sm text-white/40 mt-0.5">{t('customers.totalCustomers')}: {customers.length}</p>
        </div>
      </motion.div>

      <FilterBar value={{ search }} onChange={(f) => setSearch(f.search || '')}
        placeholder={t('customers.searchCustomers')} />

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold-400" />
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center py-24 text-white/30">
          <Users size={52} className="mb-3 opacity-30" />
          <p>{t('customers.noCustomers')}</p>
        </div>
      ) : (
        <motion.div
          variants={container} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {customers.map((c) => (
            <motion.div key={c.id} variants={item}>
              <motion.div
                whileHover={{ y: -3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="rounded-2xl border border-white/[0.13] p-4 flex flex-col gap-3"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(16px) saturate(148%)',
                  WebkitBackdropFilter: 'blur(16px) saturate(148%)',
                  boxShadow: '0 18px 38px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)',
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-gold-300 text-sm flex-shrink-0"
                      style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }}>
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white/90">{c.name}</p>
                      {c.phone && <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5"><Phone size={10} />{toWesternDigits(c.phone)}</p>}
                      {c.address && <p className="text-xs text-white/35 flex items-center gap-1"><MapPin size={10} />{c.address}</p>}
                    </div>
                  </div>
                </div>
                {c.notes && (
                  <p className="text-xs text-white/40 px-3 py-2 rounded-xl border border-white/8"
                    style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {c.notes}
                  </p>
                )}
                <div className="flex items-center gap-1 pt-1 border-t border-white/8">
                  <button onClick={() => loadHistory(c)}
                    className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-white/40 hover:text-white/75 hover:bg-white/8 transition-colors text-xs">
                    <History size={12} /> السجل
                  </button>
                  <button onClick={() => { setEditing(c); setShowForm(true); }}
                    className="flex-1 flex items-center justify-center gap-1 p-2 rounded-lg text-white/40 hover:text-white/75 hover:bg-white/8 transition-colors text-xs">
                    <Pencil size={12} /> {t('actions.edit')}
                  </button>
                  {canDelete && (
                    <button onClick={() => setDeleting(c)}
                      className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {showForm && (
        <CustomerForm customer={editing} onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }} />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} title={t('customers.editCustomer')} message={`حذف العميل: ${deleting?.name}؟`}
        danger confirmLabel={t('actions.delete')} />

      {history && (
        <Modal open onClose={() => setHistory(null)} title={`سجل ${history.customer.name}`} size="lg">
          {history.txs.length === 0 ? (
            <p className="text-center text-white/35 py-8">{t('messages.noData')}</p>
          ) : (
            <div className="space-y-2">
              {history.txs.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl border border-white/8 text-sm"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div>
                    <span className="font-medium text-white/80">
                      {tx.transaction_type === 'sale' ? 'بيع' : 'تأجير'} — {tx.dress_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-gold-400 font-bold">{formatCurrency(tx.price, '$', language)}</span>
                    <StatusBadge status={tx.status} />
                    <span className="text-white/35 text-xs">{formatDate(tx.created_at, language)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

interface FormProps { customer: Customer | null; onClose: () => void; onSaved: () => void; }
function CustomerForm({ customer, onClose, onSaved }: FormProps) {
  const { t } = useTranslation();
  const { addToast } = useUIStore();
  const [form, setForm] = useState({ name: customer?.name ?? '', phone: customer?.phone ?? '', address: customer?.address ?? '', notes: customer?.notes ?? '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const set = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setIsDirty(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErrors({ name: t('validation.required') }); return; }
    setLoading(true);
    try {
      if (customer) {
        await api.customers.update(customer.id, form.name, form.phone || undefined, form.address || undefined, form.notes || undefined);
      } else {
        await api.customers.create({ name: form.name, phone: form.phone || undefined, address: form.address || undefined, notes: form.notes || undefined });
      }
      addToast('success', t('messages.saved'));
      onSaved();
    } catch (err) { addToast('error', String(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} isDirty={isDirty} title={customer ? t('customers.editCustomer') : t('customers.addCustomer')} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button><Button variant="gold" form="customer-form" type="submit" loading={loading}>{t('actions.save')}</Button></>}>
      <form id="customer-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className={glassLabel}>{t('customers.name')} *</label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)}
            className={glassInput} style={glassInputStyle} />
          {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
        </div>
        {([['phone', t('customers.phone')], ['address', t('customers.address')], ['notes', t('customers.notes')]] as [string, string][]).map(([k, lbl]) => (
          <div key={k} className="flex flex-col gap-1.5">
            <label className={glassLabel}>{lbl}</label>
            <input value={(form as Record<string, string>)[k]} onChange={(e) => set(k, e.target.value)}
              className={glassInput} style={glassInputStyle} />
          </div>
        ))}
      </form>
    </Modal>
  );
}

