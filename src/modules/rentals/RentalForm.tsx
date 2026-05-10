import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { api } from '../../lib/api';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Modal } from '../../components/Modal';
import { Button } from '../../components/Button';
import { Input, TextArea } from '../../components/Input';
import { GlassSelect } from '../../components/GlassSelect';
import { formatNumber, todayISO } from '../../utils/formatters';
import type { Dress } from '../../types';

interface Props { open: boolean; onClose: () => void; onSaved: () => void; }

type Currency = 'SYP' | 'USD' | 'TRY';
const CURRENCY_LABELS: Record<Currency, string> = { SYP: 'ل.س', USD: '$', TRY: '₺' };
const CURRENCY_SIZES: Record<Currency, string> = { SYP: '11px', USD: '15px', TRY: '15px' };
const CURRENCIES: Currency[] = ['SYP', 'USD', 'TRY'];

const PAYMENT_OPTIONS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'shamcash', label: 'شام كاش' },
  { value: 'transfer', label: 'تحويل بنكي' },
];

function toSYP(amount: number, currency: Currency, rates: { usd_to_syp: number; usd_to_try: number }): number {
  if (currency === 'SYP') return amount;
  if (currency === 'USD') return amount * rates.usd_to_syp;
  return amount * (rates.usd_to_syp / rates.usd_to_try);
}

function fromSYP(syp: number, to: Currency, rates: { usd_to_syp: number; usd_to_try: number }): number {
  if (to === 'SYP') return syp;
  const usd = syp / rates.usd_to_syp;
  if (to === 'USD') return usd;
  return usd * rates.usd_to_try;
}

function fmtAmount(n: number, currency: Currency): string {
  const rounded = currency === 'SYP' ? Math.round(n) : Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-US', { maximumFractionDigits: currency === 'SYP' ? 0 : 2 });
}

function toAllCurrencies(amount: number, from: Currency, rates: { usd_to_syp: number; usd_to_try: number }) {
  const syp = toSYP(amount, from, rates);
  const usd = syp / rates.usd_to_syp;
  const tryAmount = usd * rates.usd_to_try;
  return { syp, usd, tryAmount };
}

// ─── Currency picker ──────────────────────────────────────────────────────────

function CurrencyPicker({ value, onChange, isDark }: {
  value: Currency; onChange: (c: Currency) => void; isDark: boolean;
}) {
  return (
    <div className="flex gap-0.5 flex-shrink-0">
      {CURRENCIES.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)}
          className="px-2 py-1 rounded-lg font-bold transition-all"
          style={{
            fontFamily: c === 'SYP' ? 'Cairo, sans-serif' : 'system-ui, sans-serif',
            fontSize: CURRENCY_SIZES[c],
            background: value === c ? 'rgba(201,168,76,0.22)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)',
            color: value === c ? '#c9a84c' : isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,42,24,0.45)',
            border: value === c ? '1px solid rgba(201,168,76,0.40)' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)',
          }}>
          {CURRENCY_LABELS[c]}
        </button>
      ))}
    </div>
  );
}

// ─── Dress combobox ───────────────────────────────────────────────────────────

function DressCombobox({ dresses, loadError, value, onSelect, isDark, error }: {
  dresses: Dress[]; loadError: boolean; value: string;
  onSelect: (d: Dress | null) => void; isDark: boolean; error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = dresses.find(d => d.id === value) ?? null;

  const openDropdown = useCallback(() => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close, true);
    return () => document.removeEventListener('mousedown', close, true);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      if (inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setPos({ top: r.bottom + 4, left: r.left, width: r.width });
      }
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => { window.removeEventListener('scroll', reposition, true); window.removeEventListener('resize', reposition); };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = dresses.filter(d => {
    if (!q) return true;
    return (
      d.code.toLowerCase().includes(q) ||
      (d.color ?? '').toLowerCase().includes(q) ||
      (d.size ?? '').toLowerCase().includes(q) ||
      (d.style ?? '').toLowerCase().includes(q)
    );
  }).slice(0, 25);

  const inputStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
    backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
    border: error ? '1px solid rgba(239,68,68,0.60)' : open
      ? '1px solid rgba(201,168,76,0.55)'
      : isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(60,42,24,0.12)',
    borderRadius: 12,
    color: isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)',
    transition: 'border-color 0.15s',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999,
    background: isDark ? 'rgba(18,16,24,0.97)' : 'rgba(255,255,255,0.98)',
    backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.10)',
    borderRadius: 14,
    boxShadow: isDark ? '0 20px 50px rgba(0,0,0,0.50)' : '0 20px 50px rgba(0,0,0,0.14)',
    overflow: 'hidden', maxHeight: 260, overflowY: 'auto',
  };

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
          color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}>
          الفستان <span style={{ color: '#f87171' }}>*</span>
        </label>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
          style={{ background: isDark ? 'rgba(201,168,76,0.10)' : 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.30)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: '#c9a84c', fontFamily: 'Cairo, sans-serif' }}>
              {selected.code}
              {selected.color && <span style={{ fontWeight: 400, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,42,24,0.55)' }}> · {selected.color}</span>}
              {selected.size && <span style={{ fontWeight: 400, color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,42,24,0.55)' }}> · {selected.size}</span>}
            </p>
            <p className="text-xs mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.40)', fontFamily: 'Cairo, sans-serif' }}>
              السعر المرجعي: {formatNumber(selected.price)} ل.س
            </p>
          </div>
          <button type="button" onClick={() => onSelect(null)} className="p-1 rounded-lg"
            style={{ color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.40)' }}>
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
        color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}>
        الفستان <span style={{ color: '#f87171' }}>*</span>
      </label>
      <div className="relative">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.30)' }} />
        <input ref={inputRef} value={query} onChange={e => setQuery(e.target.value)}
          onFocus={openDropdown} onClick={() => !open && openDropdown()}
          placeholder="ابحث بالكود، اللون، المقاس..."
          className="w-full h-10 ps-9 pe-3 text-sm outline-none"
          style={{ ...inputStyle, fontFamily: 'Cairo, sans-serif' }} />
      </div>
      {error && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>{error}</p>}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div initial={{ opacity: 0, y: -6, scaleY: 0.95 }} animate={{ opacity: 1, y: 0, scaleY: 1 }}
              exit={{ opacity: 0, y: -4, scaleY: 0.95 }} transition={{ duration: 0.13, ease: 'easeOut' }}
              style={{ ...dropdownStyle, transformOrigin: 'top' }}>
              {loadError ? (
                <div className="px-3 py-4 text-center text-sm" style={{ color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>
                  تعذّر تحميل الفساتين
                </div>
              ) : dresses.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm"
                  style={{ color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.35)', fontFamily: 'Cairo, sans-serif' }}>
                  لا توجد فساتين متاحة للتأجير
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm"
                  style={{ color: isDark ? 'rgba(255,255,255,0.30)' : 'rgba(60,42,24,0.35)', fontFamily: 'Cairo, sans-serif' }}>
                  لا توجد نتائج لـ "{query}"
                </div>
              ) : filtered.map(d => <DressRow key={d.id} dress={d} isDark={isDark} onSelect={() => { onSelect(d); setOpen(false); setQuery(''); }} />)}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

function DressRow({ dress, isDark, onSelect }: { dress: Dress; isDark: boolean; onSelect: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onSelect} className="flex items-center justify-between w-full px-3 py-2.5 gap-2 text-sm text-start"
      style={{ fontFamily: 'Cairo, sans-serif', background: hover ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.05)') : 'transparent' }}>
      <div className="flex-1 min-w-0">
        <span className="font-bold" style={{ color: '#c9a84c' }}>{dress.code}</span>
        {dress.color && <span style={{ color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}> · {dress.color}</span>}
        {dress.size && <span style={{ color: isDark ? 'rgba(255,255,255,0.50)' : 'rgba(60,42,24,0.50)' }}> · {dress.size}</span>}
        {dress.style && <span style={{ color: isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.40)', fontSize: '0.75rem' }}> · {dress.style}</span>}
      </div>
      <span className="flex-shrink-0 text-xs font-semibold"
        style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(60,42,24,0.55)' }}>
        {formatNumber(dress.price)} ل.س
      </span>
    </button>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function RentalForm({ open, onClose, onSaved }: Props) {
  const { addToast, theme, exchangeRates } = useUIStore();
  const { user } = useAuthStore();
  const isDark = theme === 'dark';

  const [dresses, setDresses] = useState<Dress[]>([]);
  const [dressLoadError, setDressLoadError] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [dressId, setDressId] = useState('');
  const [price, setPrice] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<Currency>('SYP');
  const [deposit, setDeposit] = useState('');
  const [depositCurrency, setDepositCurrency] = useState<Currency>('SYP');
  const [remainingCurrency, setRemainingCurrency] = useState<Currency>('SYP');
  const [rentalStart, setRentalStart] = useState(todayISO());
  const [rentalEnd, setRentalEnd] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerName(''); setPhone(''); setDressId('');
    setPrice(''); setPriceCurrency('SYP');
    setDeposit(''); setDepositCurrency('SYP'); setRemainingCurrency('SYP');
    setRentalStart(todayISO()); setRentalEnd('');
    setPaymentMethod('cash'); setNotes(''); setErrors({});
    setDressLoadError(false);
    api.inventory.getAll({ status: 'available' })
      .then(d => setDresses(d))
      .catch(() => setDressLoadError(true));
  }, [open]);

  const priceInSYP = price && !isNaN(+price) ? toSYP(+price, priceCurrency, exchangeRates) : 0;
  const depositInSYP = deposit && !isNaN(+deposit) ? toSYP(+deposit, depositCurrency, exchangeRates) : 0;
  const remainingInSYP = priceInSYP - depositInSYP;

  const days = rentalStart && rentalEnd
    ? Math.max(0, Math.ceil((new Date(rentalEnd).getTime() - new Date(rentalStart).getTime()) / 86400000))
    : 0;

  const hasContent = customerName.trim() !== '' || dressId !== '' || price !== '' || deposit !== '' || notes.trim() !== '';

  const handleDressSelect = (d: Dress | null) => {
    if (d) {
      setDressId(d.id);
      setErrors(e => { const c = { ...e }; delete c.dress_id; return c; });
    } else {
      setDressId('');
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = 'اسم العميل مطلوب';
    if (!dressId) e.dress_id = 'الرجاء اختيار فستان';
    if (!price || isNaN(+price) || +price <= 0) e.price = 'السعر مطلوب';
    if (deposit && isNaN(+deposit)) e.deposit = 'مبلغ غير صحيح';
    if (depositInSYP > priceInSYP) e.deposit = 'العربون يتجاوز السعر';
    if (!rentalStart) e.rentalStart = 'تاريخ الاستلام مطلوب';
    if (!rentalEnd) e.rentalEnd = 'تاريخ الإرجاع مطلوب';
    if (rentalStart && rentalEnd && rentalEnd <= rentalStart) e.rentalEnd = 'تاريخ الإرجاع قبل الاستلام';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const existing = await api.customers.getAll(customerName.trim()).catch(() => [] as Awaited<ReturnType<typeof api.customers.getAll>>);
      const match = existing.find(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase());
      const customerId = match
        ? match.id
        : (await api.customers.create({ name: customerName.trim() })).id;

      // Calculate exchange rate for price currency, then normalize deposit to price currency
      const rateForPrice = priceCurrency === 'SYP' ? 1
        : priceCurrency === 'USD' ? exchangeRates.usd_to_syp
        : exchangeRates.usd_to_syp / exchangeRates.usd_to_try;
      // Convert deposit to price currency
      const depositInPriceCurr = rateForPrice > 0
        ? depositInSYP / rateForPrice
        : depositInSYP;
      const priceVal = parseFloat(price) || 0;

      await api.transactions.createRental({
        customer_id: customerId,
        dress_id: dressId,
        price: priceVal,
        deposit: parseFloat(depositInPriceCurr.toFixed(priceCurrency === 'SYP' ? 0 : 4)),
        payment_method: paymentMethod,
        rental_start: rentalStart,
        rental_end: rentalEnd,
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        employee_id: user?.id,
        currency: priceCurrency,
        exchange_rate_to_syp: rateForPrice,
        usd_to_syp_snapshot: exchangeRates.usd_to_syp,
        usd_to_try_snapshot: exchangeRates.usd_to_try,
      });
      addToast('success', 'تم تسجيل التأجير بنجاح');
      onSaved();
    } catch (err) {
      addToast('error', String(err));
    } finally {
      setLoading(false);
    }
  };

  const textColor = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(60,42,24,0.45)';

  const conversionHint = (amount: string, from: Currency) => {
    if (!amount || isNaN(+amount) || +amount <= 0 || from === 'SYP') return null;
    const { syp, usd, tryAmount } = toAllCurrencies(+amount, from, exchangeRates);
    return (
      <div className="flex gap-3 flex-wrap">
        <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(55,38,18,0.75)', fontFamily: 'Cairo, sans-serif' }}>≈ {fmtAmount(syp, 'SYP')} <span style={{ fontWeight: 400, fontSize: '0.70rem' }}>ل.س</span></span>
        {from !== 'USD' && <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(55,38,18,0.75)', fontFamily: 'Cairo, sans-serif' }}>≈ {fmtAmount(usd, 'USD')} <span style={{ fontWeight: 400, fontSize: '0.70rem', fontFamily: 'system-ui' }}>$</span></span>}
        {from !== 'TRY' && <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(55,38,18,0.75)', fontFamily: 'Cairo, sans-serif' }}>≈ {fmtAmount(tryAmount, 'TRY')} <span style={{ fontWeight: 400, fontSize: '0.70rem', fontFamily: 'system-ui' }}>₺</span></span>}
      </div>
    );
  };

  const numInputStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.60)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(60,42,24,0.12)',
    color: textColor, fontFamily: 'Cairo, sans-serif', colorScheme: isDark ? 'dark' as const : 'light' as const,
  };

  return (
    <Modal open={open} onClose={onClose} isDirty={hasContent} title="تأجير جديد" size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>إلغاء</Button>
          <Button variant="gold" form="rental-form" type="submit" loading={loading}>تأكيد التأجير</Button>
        </>
      }
    >
      <form id="rental-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Customer + phone */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="اسم العميل" value={customerName}
            onChange={e => { setCustomerName(e.target.value); setErrors(er => { const c = { ...er }; delete c.customerName; return c; }); }}
            placeholder="أدخل اسم العميل..." error={errors.customerName} required />
          <Input label="رقم الهاتف" value={phone}
            onChange={e => setPhone(e.target.value)} placeholder="مثل: 09XXXXXXXX" />
        </div>

        {/* Dress search */}
        <DressCombobox dresses={dresses} loadError={dressLoadError} value={dressId}
          onSelect={handleDressSelect} isDark={isDark} error={errors.dress_id} />

        {/* Price */}
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
            color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}>
            السعر <span style={{ color: '#f87171' }}>*</span>
          </label>
          <div className="flex gap-2">
            <input type="number" min="0" step="any" value={price}
              onChange={e => { setPrice(e.target.value); setErrors(er => { const c = { ...er }; delete c.price; return c; }); }}
              placeholder="0" className="flex-1 h-10 px-3 text-sm rounded-xl outline-none"
              style={{ ...numInputStyle, border: errors.price ? '1px solid rgba(239,68,68,0.60)' : numInputStyle.border }} />
            <CurrencyPicker value={priceCurrency} onChange={setPriceCurrency} isDark={isDark} />
          </div>
          {errors.price && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>{errors.price}</p>}
          {conversionHint(price, priceCurrency)}
        </div>

        {/* Deposit */}
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
            color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}>
            العربون
          </label>
          <div className="flex gap-2">
            <input type="number" min="0" step="any" value={deposit}
              onChange={e => { setDeposit(e.target.value); setErrors(er => { const c = { ...er }; delete c.deposit; return c; }); }}
              placeholder="0" className="flex-1 h-10 px-3 text-sm rounded-xl outline-none"
              style={{ ...numInputStyle, border: errors.deposit ? '1px solid rgba(239,68,68,0.60)' : numInputStyle.border }} />
            <CurrencyPicker value={depositCurrency} onChange={setDepositCurrency} isDark={isDark} />
          </div>
          {errors.deposit && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>{errors.deposit}</p>}
          {conversionHint(deposit, depositCurrency)}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
              color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}>
              تاريخ الاستلام <span style={{ color: '#f87171' }}>*</span>
            </label>
            <input type="date" value={rentalStart}
              onChange={e => { setRentalStart(e.target.value); setErrors(er => { const c = { ...er }; delete c.rentalStart; return c; }); }}
              className="h-10 px-3 text-sm rounded-xl outline-none"
              style={{ ...numInputStyle, border: errors.rentalStart ? '1px solid rgba(239,68,68,0.60)' : numInputStyle.border }} />
            {errors.rentalStart && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>{errors.rentalStart}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
              color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}>
              تاريخ الإرجاع <span style={{ color: '#f87171' }}>*</span>
              {days > 0 && <span style={{ marginInlineStart: 6, fontSize: '0.72rem', color: '#c9a84c', fontWeight: 400 }}>{days} يوم</span>}
            </label>
            <input type="date" value={rentalEnd}
              onChange={e => { setRentalEnd(e.target.value); setErrors(er => { const c = { ...er }; delete c.rentalEnd; return c; }); }}
              className="h-10 px-3 text-sm rounded-xl outline-none"
              style={{ ...numInputStyle, border: errors.rentalEnd ? '1px solid rgba(239,68,68,0.60)' : numInputStyle.border }} />
            {errors.rentalEnd && <p style={{ fontSize: '0.75rem', color: '#f87171', fontFamily: 'Cairo, sans-serif' }}>{errors.rentalEnd}</p>}
          </div>
        </div>

        {/* Remaining */}
        <div className="flex flex-col gap-1.5">
          <label style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: 'Cairo, sans-serif',
            color: isDark ? 'rgba(255,255,255,0.60)' : 'rgba(60,42,24,0.60)' }}>
            المتبقي
          </label>
          <div className="flex gap-2 items-center">
            <div className="flex-1 flex items-center h-10 px-3 rounded-xl"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(60,42,24,0.04)',
                border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.08)' }}>
              <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.88rem', fontWeight: 700,
                color: remainingInSYP > 0 ? '#f87171' : remainingInSYP === 0 && priceInSYP > 0 ? '#4ade80' : mutedColor }}>
                {priceInSYP > 0
                  ? `${fmtAmount(fromSYP(Math.max(0, remainingInSYP), remainingCurrency, exchangeRates), remainingCurrency)} ${CURRENCY_LABELS[remainingCurrency]}`
                  : '—'}
              </span>
            </div>
            <CurrencyPicker value={remainingCurrency} onChange={setRemainingCurrency} isDark={isDark} />
          </div>
        </div>

        {/* Payment method */}
        <GlassSelect label="طريقة الدفع" value={paymentMethod}
          onChange={setPaymentMethod} options={PAYMENT_OPTIONS} />

        {/* Notes */}
        <TextArea label="ملاحظات" value={notes}
          onChange={e => setNotes(e.target.value)} rows={2} placeholder="أي ملاحظات إضافية..." />

      </form>
    </Modal>
  );
}
