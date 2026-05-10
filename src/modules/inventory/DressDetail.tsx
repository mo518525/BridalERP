import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useUIStore } from '../../store/uiStore';
import type { Dress, Transaction } from '../../types';

interface Props { dress: Dress; onClose: () => void; }

export function DressDetail({ dress, onClose }: Props) {
  const { t } = useTranslation();
  const { language } = useUIStore();
  const currency = language === 'ar' ? 'ر.س' : '€';
  const [history, setHistory] = useState<Transaction[]>([]);

  useEffect(() => {
    api.inventory.getHistory(dress.id).then(setHistory).catch(console.error);
  }, [dress.id]);

  const rows = [
    { label: t('inventory.dressCode'), value: dress.code },
    { label: t('inventory.status'), value: <StatusBadge status={dress.status} /> },
    { label: t('inventory.color'), value: dress.color || '—' },
    { label: t('inventory.size'), value: dress.size || '—' },
    { label: t('inventory.style'), value: dress.style || '—' },
    { label: t('inventory.price'), value: formatCurrency(dress.price, currency, language) },
  ];

  return (
    <Modal open onClose={onClose} title={`${t('inventory.dressDetail')} — ${dress.code}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => (
            <div key={r.label} className="p-3 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <p className="text-xs text-white/35 mb-1">{r.label}</p>
              <div className="text-sm font-medium text-white/80">{r.value}</div>
            </div>
          ))}
        </div>

        {dress.notes && (
          <div className="p-3 rounded-xl border border-white/8" style={{ background: 'rgba(255,255,255,0.04)' }}>
            <p className="text-xs text-white/35 mb-1">{t('inventory.notes')}</p>
            <p className="text-sm text-white/65">{dress.notes}</p>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/65 mb-2">{t('inventory.history')}</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl border border-white/8 text-xs"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <div>
                    <span className="font-medium text-white/75">
                      {tx.transaction_type === 'sale' ? t('sales.title') : t('rentals.title')}
                    </span>
                    {tx.customer_name && <span className="text-white/40 ms-2">{tx.customer_name}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gold-400 font-medium">{formatCurrency(tx.price, currency, language)}</span>
                    <StatusBadge status={tx.status} />
                    <span className="text-white/35">{formatDate(tx.created_at, language)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
