import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../lib/api';
import { Modal } from '../../components/Modal';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import type { Dress, Transaction } from '../../types';

interface Props { dress: Dress; onClose: () => void; }

export function DressDetail({ dress, onClose }: Props) {
  const { t } = useTranslation();
  const { language, theme } = useUIStore();
  const { isEmployee } = usePermissions();
  const isDark = theme === 'dark';
  const currency = language === 'ar' ? 'ر.س' : '€';
  const [history, setHistory] = useState<Transaction[]>([]);

  const textMain  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const textMuted = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(60,42,24,0.75)';
  const textBody  = isDark ? 'rgba(255,255,255,0.65)' : 'rgba(55,38,18,0.80)';
  const cardBg    = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(60,42,24,0.10)';
  const gold      = isDark ? '#c9a84c' : '#8f6e28';

  useEffect(() => {
    api.inventory.getHistory(dress.id).then(setHistory).catch(console.error);
  }, [dress.id]);

  const rows = [
    { label: t('inventory.dressCode'), value: dress.code },
    { label: t('inventory.status'), value: <StatusBadge status={dress.status} /> },
    { label: t('inventory.color'), value: dress.color || '—' },
    { label: t('inventory.size'), value: dress.size || '—' },
    { label: t('inventory.style'), value: dress.style || '—' },
    ...(!isEmployee ? [{ label: t('inventory.price'), value: formatCurrency(dress.price, currency, language) }] : []),
  ];

  return (
    <Modal open onClose={onClose} title={`${t('inventory.dressDetail')} — ${dress.code}`} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {rows.map((r) => (
            <div key={r.label} className="p-3 rounded-xl" style={{ background: cardBg, border: cardBorder }}>
              <p className="text-xs mb-1" style={{ color: textMuted }}>{r.label}</p>
              <div className="text-sm font-medium" style={{ color: textMain }}>{r.value}</div>
            </div>
          ))}
        </div>

        {dress.notes && (
          <div className="p-3 rounded-xl" style={{ background: cardBg, border: cardBorder }}>
            <p className="text-xs mb-1" style={{ color: textMuted }}>{t('inventory.notes')}</p>
            <p className="text-sm" style={{ color: textBody }}>{dress.notes}</p>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2" style={{ color: textMuted }}>{t('inventory.history')}</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {history.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-xl text-xs"
                  style={{ background: cardBg, border: cardBorder }}>
                  <div>
                    <span className="font-medium" style={{ color: textMain }}>
                      {tx.transaction_type === 'sale' ? t('sales.title') : t('rentals.title')}
                    </span>
                    {tx.customer_name && <span className="ms-2" style={{ color: textMuted }}>{tx.customer_name}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium" style={{ color: gold }}>{formatCurrency(tx.price, currency, language)}</span>
                    <StatusBadge status={tx.status} />
                    <span style={{ color: textMuted }}>{formatDate(tx.created_at, language)}</span>
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
