import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input, Select, TextArea } from '../../components/Input';
import type { Dress } from '../../types';
import { DRESS_SIZES, DRESS_COLORS_AR, DRESS_STYLES_AR } from '../../types';

interface Props { dress: Dress | null; onClose: () => void; onSaved: () => void; }

export function DressForm({ dress, onClose, onSaved }: Props) {
  const { t } = useTranslation();
  const { addToast, theme } = useUIStore();
  const isDark = theme === 'dark';
  const isEdit = !!dress;

  const [form, setForm] = useState({
    code:  dress?.code  ?? '',
    color: dress?.color ?? '',
    size:  dress?.size  ?? '',
    style: dress?.style ?? '',
    price: dress?.price?.toString() ?? '0',
    notes: dress?.notes ?? '',
  });
  const [photoUrl, setPhotoUrl] = useState<string>(dress?.image_path || '');
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(false);
  const [isDirty,  setIsDirty]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEdit) return;
    api.inventory.getNextCode()
      .then((code) => setForm((cur) => cur.code ? cur : { ...cur, code }))
      .catch(() => undefined);
  }, [isEdit]);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setIsDirty(true);
    if (errors[k]) setErrors((e) => { const c = { ...e }; delete c[k]; return c; });
  };

  const handlePhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoUrl(ev.target?.result as string);
      setIsDirty(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.code.trim()) e.code = t('validation.required');
    if (!form.price || isNaN(+form.price) || +form.price <= 0) e.price = t('validation.invalidPrice');
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await api.inventory.update({
          id: dress.id,
          code:       form.code,
          color:      form.color  || undefined,
          size:       form.size   || undefined,
          style:      form.style  || undefined,
          price:      +form.price,
          notes:      form.notes  || undefined,
          image_path: photoUrl    || undefined,
        });
      } else {
        await api.inventory.create({
          code:       form.code,
          color:      form.color  || undefined,
          size:       form.size   || undefined,
          style:      form.style  || undefined,
          price:      +form.price,
          notes:      form.notes  || undefined,
          image_path: photoUrl    || undefined,
        });
      }
      addToast('success', t('messages.saved'));
      onSaved();
    } catch (err) {
      addToast('error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const labelColor = isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)';

  return (
    <Modal
      open
      onClose={onClose}
      isDirty={isDirty}
      title={isEdit ? t('inventory.editDress') : t('inventory.addDress')}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>{t('actions.cancel')}</Button>
          <Button variant="gold" form="dress-form" type="submit" loading={loading}>{t('actions.save')}</Button>
        </>
      }
    >
      <form id="dress-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">

        {/* Photo upload */}
        <div className="col-span-2 flex items-center gap-4">
          <div
            className="relative w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center cursor-pointer group"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.05)',
              border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.10)',
            }}
            onClick={() => fileRef.current?.click()}
          >
            {photoUrl
              ? <img src={photoUrl} alt="dress" className="w-full h-full object-cover" />
              : <Camera size={22} style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(60,42,24,0.28)' }} />
            }
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} style={{ color: '#fff' }} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium" style={{ fontFamily: 'Cairo, sans-serif', color: labelColor }}>
              صورة الفستان
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ fontFamily: 'Cairo, sans-serif', color: '#c9a84c', background: 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.25)' }}
              >
                {photoUrl ? 'تغيير الصورة' : 'رفع صورة'}
              </button>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => { setPhotoUrl(''); setIsDirty(true); }}
                  className="text-xs px-2 py-1.5 rounded-lg"
                  style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.20)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
            <p className="text-[11px]" style={{ fontFamily: 'Cairo, sans-serif', color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.35)' }}>
              JPG, PNG — يتم تخزين الصورة مع الفستان
            </p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
        </div>

        <Input
          label={t('inventory.dressCode')}
          value={form.code}
          onChange={(e) => set('code', e.target.value)}
          error={errors.code}
          required
          readOnly={!isEdit}
          hint={!isEdit ? 'يتم توليد الكود تلقائياً حسب العداد' : undefined}
          containerClass="col-span-2"
        />

        <Select label={t('inventory.color')} value={form.color} onChange={(e) => set('color', e.target.value)}
          options={DRESS_COLORS_AR.map((c) => ({ value: c, label: c }))} placeholder="اختر اللون" />

        <Input
          label={t('inventory.size')}
          value={form.size}
          onChange={(e) => set('size', e.target.value)}
          list="dress-size-options"
          placeholder="38"
          hint="اختر مقاساً رقمياً أو اكتب المقاس يدوياً"
        />

        <Select label={t('inventory.style')} value={form.style} onChange={(e) => set('style', e.target.value)}
          options={DRESS_STYLES_AR.map((s) => ({ value: s, label: s }))} placeholder="اختر الطراز" containerClass="col-span-2" />

        <Input label="سعر الشراء (مرجعي)" type="number" min="0.01" step="0.01"
          value={form.price} onChange={(e) => set('price', e.target.value)}
          error={errors.price} required containerClass="col-span-2" />

        <TextArea label={t('inventory.notes')} value={form.notes} onChange={(e) => set('notes', e.target.value)}
          containerClass="col-span-2" rows={2} />

        <datalist id="dress-size-options">
          {DRESS_SIZES.map((size) => <option key={size} value={size} />)}
        </datalist>
      </form>
    </Modal>
  );
}
