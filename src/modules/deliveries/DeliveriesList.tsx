import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, Plus, Loader2, Trash2, Package, ArrowRight, ChevronRight, Eye, Pencil } from 'lucide-react';
import { api } from '../../lib/api';
import type { CreateDressInput } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { Button } from '../../components/Button';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { Input, Select, TextArea } from '../../components/Input';
import { GlassDatePicker } from '../../components/GlassDatePicker';
import { ColorPicker } from '../../components/ColorPicker';
import { formatCurrency, formatDate, todayISO } from '../../utils/formatters';
import { DRESS_STYLES_AR } from '../../types';
import type { Delivery, Dress } from '../../types';

// Table layout
const DELIVERIES_COLS = '0.7fr 1.3fr 1.1fr 1fr 0.6fr auto';
const deliveriesHdr = (isDark: boolean): React.CSSProperties => ({
  gridTemplateColumns: DELIVERIES_COLS,
  fontFamily: 'Cairo, sans-serif',
  background: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.50)',
  backdropFilter: 'blur(16px) saturate(160%)',
  WebkitBackdropFilter: 'blur(16px) saturate(160%)',
  borderBottom: isDark ? '1px solid rgba(212,175,55,0.22)' : '1px solid rgba(143,110,40,0.20)',
  color: isDark ? 'rgba(212,175,55,0.70)' : 'rgba(143,110,40,0.85)',
  whiteSpace: 'nowrap' as const,
});

const container = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const item = {
  hidden: { opacity: 0, x: -10 },
  show:   { opacity: 1, x: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 35 } },
};

export function DeliveriesList() {
  const { t } = useTranslation();
  const { language, addToast, theme } = useUIStore();
  const isDark = theme === 'dark';
  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const textMuted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,42,24,0.65)';
  const gold      = isDark ? '#c9a84c' : '#8f6e28';
  const { canDelete } = usePermissions();
  const navigate = useNavigate();
  const currency = '$';
  const [searchParams] = useSearchParams();

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(searchParams.get('new') === '1');
  const [deleting, setDeleting] = useState<Delivery | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Details / edit state
  const [viewing, setViewing] = useState<Delivery | null>(null);
  const [editing, setEditing] = useState<Delivery | null>(null);   // add-more-dresses flow

  // After new delivery created, open dress-entry popup
  const [dressEntryState, setDressEntryState] = useState<{ deliveryId: string; count: number } | null>(null);

  const load = async () => {
    setLoading(true);
    try { setDeliveries(await api.deliveries.getAll()); }
    catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await api.deliveries.delete(deleting.id);
      addToast('success', t('messages.deleted'));
      setDeleting(null); load();
    } catch (e) { addToast('error', String(e)); }
    finally { setDeleteLoading(false); }
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
          style={{ fontFamily:'Cairo,sans-serif', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.07)', color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.75)', border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(60,42,24,0.14)' }}>
          <ArrowRight size={15} /> رجوع
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-1" style={{ color: textMain }}>
          <Truck size={22} style={{ color: gold }} /> {t('deliveries.title')}
        </h1>
        <Button variant="gold" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          {t('deliveries.addDelivery')}
        </Button>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={32} className="animate-spin text-gold-400" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="flex flex-col items-center py-24" style={{ color: textMuted }}>
          <Truck size={52} className="mb-3 opacity-30" />
          <p>{t('deliveries.noDeliveries')}</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-white/[0.10]"
          style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(16px) saturate(148%)', WebkitBackdropFilter: 'blur(16px) saturate(148%)' }}>
          {/* Sticky header */}
          <div
            className="sticky top-0 z-10 grid gap-x-4 px-4 py-2.5 text-xs font-semibold"
            style={deliveriesHdr(isDark)}
          >
            <span>{t('deliveries.deliveryNumber')}</span>
            <span>{t('deliveries.supplier')}</span>
            <span>{t('deliveries.deliveryDate')}</span>
            <span>{t('deliveries.totalCost')} ($)</span>
            <span>القطع</span>
            <span></span>
          </div>
          {/* Rows */}
          <motion.div variants={container} initial="hidden" animate="show">
            {deliveries.map((d) => (
              <motion.div key={d.id} variants={item}
                className="grid gap-x-4 px-4 py-3 border-b last:border-b-0 transition-colors hover:bg-white/[0.025]"
                style={{
                  gridTemplateColumns: DELIVERIES_COLS,
                  alignItems: 'center',
                  borderColor: 'rgba(255,255,255,0.05)',
                }}
              >
                <span className="text-sm font-bold" style={{ color: textMain }}>{d.delivery_number}</span>
                <span className="text-sm truncate" style={{ color: textMuted }}>{d.supplier || '—'}</span>
                <span className="text-sm" style={{ color: textMuted }}>{formatDate(d.delivery_date, language)}</span>
                <span className="text-sm font-bold" style={{ color: gold }}>{formatCurrency(d.total_cost, currency, language)}</span>
                <span className="text-xs flex items-center gap-1" style={{ color: textMuted }}><Package size={10} />{d.item_count}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewing(d)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: isDark ? 'rgba(34,211,238,0.6)' : '#0891b2' }}
                    title="عرض التفاصيل">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => setEditing(d)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: isDark ? 'rgba(201,168,76,0.60)' : 'rgba(143,110,40,0.70)' }}
                    title="إضافة فساتين">
                    <Pencil size={14} />
                  </button>
                  {canDelete && (
                    <button onClick={() => setDeleting(d)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: isDark ? 'rgba(248,113,113,0.60)' : 'rgba(180,28,28,0.70)' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* New delivery form */}
      {showForm && (
        <DeliveryForm
          onClose={() => setShowForm(false)}
          onSaved={(deliveryId, dressCount) => {
            setShowForm(false);
            if (dressCount > 0) {
              setDressEntryState({ deliveryId, count: dressCount });
            } else {
              load();
            }
          }}
        />
      )}

      {/* Dress entry popup after creating a new delivery */}
      {dressEntryState && (
        <DressEntryPopup
          deliveryId={dressEntryState.deliveryId}
          totalCount={dressEntryState.count}
          onClose={() => { setDressEntryState(null); load(); }}
        />
      )}

      {/* Details popup — eye icon */}
      {viewing && (
        <DeliveryDetailsModal
          delivery={viewing}
          onClose={() => setViewing(null)}
        />
      )}

      {/* Edit popup — pencil icon: add more dresses */}
      {editing && (
        <DressEntryPopup
          deliveryId={editing.id}
          totalCount={1}
          infiniteMode
          onClose={() => { setEditing(null); load(); }}
        />
      )}

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} title="حذف التسليم" message={`حذف التسليم ${deleting?.delivery_number}؟`}
        danger confirmLabel={t('actions.delete')} />
    </div>
  );
}

// Delivery Form
function DeliveryForm({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (deliveryId: string, dressCount: number) => void;
}) {
  const { t } = useTranslation();
  const { addToast } = useUIStore();
  const [form, setForm] = useState({
    delivery_number: '',
    supplier: '',
    delivery_date: todayISO(),
    total_cost: '',
    dress_count: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [numberLoading, setNumberLoading] = useState(true);

  const set = (k: string, v: string) => { setForm((f) => ({ ...f, [k]: v })); setIsDirty(true); };

  useEffect(() => {
    api.deliveries.getNextNumber()
      .then((num) => setForm((f) => ({ ...f, delivery_number: num })))
      .catch(() => undefined)
      .finally(() => setNumberLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.delivery_number.trim()) return;
    setLoading(true);
    try {
      const delivery = await api.deliveries.create({
        delivery_number: form.delivery_number,
        supplier: form.supplier || undefined,
        delivery_date: form.delivery_date,
        total_cost: +(form.total_cost || 0),
        notes: form.notes || undefined,
        dress_ids: [],
      });
      addToast('success', t('messages.saved'));
      onSaved(delivery.id, +(form.dress_count || 0));
    } catch (err) { addToast('error', String(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} isDirty={isDirty} title={t('deliveries.addDelivery')} size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button>
          <Button variant="gold" form="del-form" type="submit" loading={loading}>{t('actions.save')}</Button>
        </>
      }>
      <form id="del-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Auto-assigned delivery number */}
        <div>
          <label className="block text-xs font-semibold text-white/50 mb-1.5">{t('deliveries.deliveryNumber')}</label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5">
            {numberLoading
              ? <Loader2 size={14} className="animate-spin text-gold-400" />
              : <span className="text-base font-bold tracking-widest text-gold-400">{form.delivery_number}</span>
            }
            <span className="text-xs text-white/30 mr-auto">يتم التعيين تلقائياً</span>
          </div>
        </div>

        <Input
          label="عدد الفساتين في هذه الشحنة"
          type="number"
          min="0"
          step="1"
          value={form.dress_count}
          onChange={(e) => set('dress_count', e.target.value)}
          hint="بعد الحفظ ستتمكن من إدخال بيانات كل فستان"
        />

        <Input label={t('deliveries.supplier')} value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
        <GlassDatePicker label={t('deliveries.deliveryDate')} value={form.delivery_date} onChange={(v) => set('delivery_date', v)} required />
        <Input label={t('deliveries.totalCost')} type="number" min="0" step="0.01" value={form.total_cost} onChange={(e) => set('total_cost', e.target.value)} />
        <TextArea label={t('inventory.notes')} value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
      </form>
    </Modal>
  );
}

// Delivery Details Modal (eye icon)
function DeliveryDetailsModal({ delivery, onClose }: { delivery: Delivery; onClose: () => void }) {
  const { language, addToast, theme } = useUIStore();
  const isDark = theme === 'dark';
  const currency = '$';
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.deliveries.getDresses(delivery.id)
      .then(setDresses)
      .catch((e) => addToast('error', String(e)))
      .finally(() => setLoading(false));
  }, [delivery.id]);

  return (
    <Modal open onClose={onClose} title={`تفاصيل الشحنة — ${delivery.delivery_number}`} size="lg"
      footer={<Button variant="ghost" onClick={onClose}>إغلاق</Button>}>
      {/* Delivery meta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 pb-4 border-b border-white/[0.08]">
        {[
          { label: 'المورد', value: delivery.supplier || '—' },
          { label: 'تاريخ الاستلام', value: formatDate(delivery.delivery_date, language) },
          { label: 'إجمالي التكلفة', value: formatCurrency(delivery.total_cost, currency, language) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="text-xs text-white/35 mb-0.5">{label}</p>
            <p className="text-sm font-semibold text-white/80">{value}</p>
          </div>
        ))}
      </div>

      {/* Dresses list */}
      <div>
        <p className="text-xs font-semibold text-white/40 mb-3 flex items-center gap-1.5">
          <Package size={12} /> الفساتين في هذه الشحنة ({dresses.length})
        </p>
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 size={24} className="animate-spin text-gold-400" />
          </div>
        ) : dresses.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-white/25">
            <Package size={36} className="mb-2 opacity-30" />
            <p className="text-sm">لا توجد فساتين مسجلة في هذه الشحنة</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {dresses.map((dr) => (
              <div key={dr.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                {/* Color swatch */}
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 ring-1 ring-white/15"
                  style={{ background: dr.color || 'rgba(255,255,255,0.12)' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white/85">{dr.code}</p>
                  <p className="text-xs text-white/40">
                    {[dr.style, dr.size && `مقاس ${dr.size}`].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gold-400 flex-shrink-0">
                  {formatCurrency(dr.price, currency, language)}
                </p>
                <div className="flex-shrink-0">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: statusBg(dr.status), color: statusFg(dr.status, isDark) }}>
                    {statusLabel(dr.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// Dress Entry Popup (new delivery + edit/add-more)
type DressEntry = {
  code: string;
  color: string;
  size: string;
  style: string;
  price: string;
  notes: string;
};

const emptyDress = (): DressEntry => ({ code: '', color: '', size: '', style: '', price: '', notes: '' });

function DressEntryPopup({
  deliveryId,
  totalCount,
  infiniteMode = false,
  onClose,
}: {
  deliveryId: string;
  totalCount: number;
  infiniteMode?: boolean;
  onClose: () => void;
}) {
  const { addToast } = useUIStore();
  const [current, setCurrent] = useState(1);
  const [form, setForm] = useState<DressEntry>(emptyDress());
  const [saving, setSaving] = useState(false);
  const [codeLoading, setCodeLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);

  const loadNextCode = () => {
    setCodeLoading(true);
    api.inventory.getNextCode()
      .then((code) => setForm((f) => ({ ...f, code })))
      .catch(() => undefined)
      .finally(() => setCodeLoading(false));
  };

  useEffect(() => { loadNextCode(); }, []);

  const set = (k: keyof DressEntry, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.code.trim()) { addToast('error', 'كود الفستان مطلوب'); return; }
    if (!form.price || isNaN(+form.price) || +form.price <= 0) { addToast('error', 'السعر غير صحيح'); return; }
    setSaving(true);
    try {
      const input: CreateDressInput = {
        code: form.code,
        color: form.color || undefined,
        size: form.size || undefined,
        style: form.style || undefined,
        price: +form.price,
        notes: form.notes || undefined,
      };
      const dress = await api.inventory.create(input);
      await api.deliveries.addDress(deliveryId, dress.id);
      setSavedCount((c) => c + 1);

      if (!infiniteMode && current >= totalCount) {
        addToast('success', `تم حفظ ${totalCount} فستان`);
        onClose();
      } else {
        addToast('success', infiniteMode ? 'تم حفظ الفستان' : `تم حفظ الفستان ${current} من ${totalCount}`);
        setCurrent((c) => c + 1);
        setForm(emptyDress());
        loadNextCode();
      }
    } catch (err) { addToast('error', String(err)); }
    finally { setSaving(false); }
  };

  const handleSkip = () => {
    if (!infiniteMode && current >= totalCount) { onClose(); return; }
    setCurrent((c) => c + 1);
    setForm(emptyDress());
    loadNextCode();
  };

  const progress = infiniteMode ? 0 : Math.round((current - 1) / totalCount * 100);
  const isLast = !infiniteMode && current >= totalCount;

  return (
    <Modal
      open
      onClose={onClose}
      title={infiniteMode ? 'إضافة فساتين للشحنة' : `إدخال الفساتين — شحنة`}
      size="lg"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <div className="flex items-center gap-3">
            {!infiniteMode && (
              <button onClick={handleSkip} className="text-sm text-white/40 hover:text-white/70 transition-colors px-3 py-1.5">
                تخطي
              </button>
            )}
            {savedCount > 0 && (
              <span className="text-xs text-white/40">تم حفظ {savedCount} فستان</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>إغلاق</Button>
            <Button variant="gold" loading={saving} onClick={handleSave} icon={<ChevronRight size={16} />}>
              {infiniteMode ? 'حفظ وإضافة آخر' : isLast ? 'حفظ وإنهاء' : 'حفظ والتالي'}
            </Button>
          </div>
        </div>
      }
    >
      {/* Progress bar (only for fixed count) */}
      {!infiniteMode && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-white/45 mb-1.5">
            <span>الفستان {current} من {totalCount}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #d4af37, #f0d060)' }}
            />
          </div>
        </div>
      )}

      {infiniteMode && (
        <p className="text-xs text-white/40 mb-4">أضف فساتين واحداً تلو الآخر. اضغط إغلاق عند الانتهاء.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Code — read-only */}
        <div className="col-span-2">
          <label className="block text-xs font-semibold text-white/50 mb-1.5">كود الفستان</label>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5">
            {codeLoading
              ? <Loader2 size={14} className="animate-spin text-gold-400" />
              : <span className="text-base font-bold tracking-widest text-gold-400">{form.code}</span>
            }
            <span className="text-xs text-white/30 mr-auto">يتم التعيين تلقائياً</span>
          </div>
        </div>

        {/* RGB Color Picker */}
        <ColorPicker
          label="اللون"
          value={form.color}
          onChange={(hex) => set('color', hex)}
          containerClass="col-span-2"
        />

        <Input
          label="المقاس"
          value={form.size}
          onChange={(e) => set('size', e.target.value)}
          placeholder="38"
        />

        <Select
          label="الطراز"
          value={form.style}
          onChange={(e) => set('style', e.target.value)}
          options={DRESS_STYLES_AR.map((s) => ({ value: s, label: s }))}
          placeholder="اختر الطراز"
        />

        <Input
          label="السعر"
          type="number"
          min="0.01"
          step="0.01"
          value={form.price}
          onChange={(e) => set('price', e.target.value)}
          required
          containerClass="col-span-2"
        />

        <TextArea
          label="ملاحظات"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          containerClass="col-span-2"
        />
      </div>
    </Modal>
  );
}

// helpers
function statusLabel(s: string) {
  const m: Record<string, string> = {
    available: 'متاح', reserved: 'محجوز', rented: 'مؤجر',
    cleaning: 'تنظيف', sold: 'مباع',
  };
  return m[s] ?? s;
}
function statusBg(s: string) {
  const m: Record<string, string> = {
    available: 'rgba(34,197,94,0.12)', reserved: 'rgba(234,179,8,0.12)',
    rented: 'rgba(59,130,246,0.12)', cleaning: 'rgba(168,85,247,0.12)',
    sold: 'rgba(239,68,68,0.12)',
  };
  return m[s] ?? 'rgba(255,255,255,0.08)';
}
function statusFg(s: string, isDark = true) {
  const dark: Record<string, string> = {
    available: '#4ade80', reserved: '#fbbf24', rented: '#60a5fa',
    cleaning: '#c084fc', sold: '#f87171',
  };
  const light: Record<string, string> = {
    available: '#15803d', reserved: '#b45309', rented: '#1d4ed8',
    cleaning: '#7c3aed', sold: '#dc2626',
  };
  return (isDark ? dark : light)[s] ?? (isDark ? 'rgba(255,255,255,0.6)' : 'rgba(60,42,24,0.55)');
}
