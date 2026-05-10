import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { addToast } = useUIStore();
  const isEdit = !!dress;

  const [form, setForm] = useState({
    code: dress?.code ?? '',
    color: dress?.color ?? '',
    size: dress?.size ?? '',
    style: dress?.style ?? '',
    price: dress?.price?.toString() ?? '0',
    notes: dress?.notes ?? '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    api.inventory.getNextCode()
      .then((code) => setForm((current) => current.code ? current : { ...current, code }))
      .catch(() => undefined);
  }, [isEdit]);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setIsDirty(true);
    if (errors[k]) setErrors((e) => { const c = { ...e }; delete c[k]; return c; });
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
          code: form.code,
          color: form.color || undefined,
          size: form.size || undefined,
          style: form.style || undefined,
          price: +form.price,
          notes: form.notes || undefined,
        });
      } else {
        await api.inventory.create({
          code: form.code,
          color: form.color || undefined,
          size: form.size || undefined,
          style: form.style || undefined,
          price: +form.price,
          notes: form.notes || undefined,
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
          {DRESS_SIZES.map((size) => (
            <option key={size} value={size} />
          ))}
        </datalist>
      </form>
    </Modal>
  );
}
