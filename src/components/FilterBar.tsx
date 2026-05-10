import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import type { FilterParams } from '../types';

interface FilterChipProps { label: string; onRemove: () => void; }
export function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-gold-400/30 text-gold-300"
      style={{ background: 'rgba(201,168,76,0.12)' }}>
      {label}
      <button onClick={onRemove} className="hover:text-gold-200 transition-colors"><X size={10} /></button>
    </span>
  );
}

interface FilterBarProps {
  value: FilterParams;
  onChange: (f: FilterParams) => void;
  statusOptions?: { value: string; label: string }[];
  categoryOptions?: { value: string; label: string }[];
  showDateRange?: boolean;
  placeholder?: string;
}

const glassInput = [
  'w-full h-10 rounded-xl border border-white/12 text-white/85 placeholder:text-white/30',
  'text-sm focus:outline-none focus:border-gold-400/50 focus:ring-1 focus:ring-gold-400/30 transition-colors',
  'backdrop-blur-xl',
].join(' ');

const glassInputStyle = {
  background: 'rgba(255,255,255,0.07)',
};

export function FilterBar({ value, onChange, statusOptions, categoryOptions, showDateRange, placeholder }: FilterBarProps) {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  const update = (patch: Partial<FilterParams>) => onChange({ ...value, ...patch });
  const hasActiveFilters = !!(value.status || value.category || value.date_from || value.date_to);
  const chips: { label: string; key: keyof FilterParams }[] = [];
  if (value.status) chips.push({ label: t(`status.${value.status}`, { defaultValue: value.status }), key: 'status' });
  if (value.category) chips.push({ label: value.category, key: 'category' });
  if (value.date_from) chips.push({ label: `من: ${value.date_from}`, key: 'date_from' });
  if (value.date_to) chips.push({ label: `إلى: ${value.date_to}`, key: 'date_to' });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            value={value.search || ''}
            onChange={(e) => update({ search: e.target.value })}
            placeholder={placeholder ?? t('actions.search')}
            className={cn(glassInput, 'ps-9 pe-3')}
            style={glassInputStyle}
          />
          {value.search && (
            <button onClick={() => update({ search: '' })} className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70">
              <X size={14} />
            </button>
          )}
        </div>

        {(statusOptions || categoryOptions || showDateRange) && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-all backdrop-blur-xl',
              showFilters || hasActiveFilters
                ? 'border-gold-400/40 text-gold-300'
                : 'border-white/12 text-white/60 hover:border-gold-400/30 hover:text-white/80'
            )}
            style={{ background: showFilters || hasActiveFilters ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.07)' }}
          >
            <SlidersHorizontal size={16} />
            {t('actions.filter')}
            {hasActiveFilters && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-gold-500 text-white text-[10px] font-bold">
                {chips.length}
              </span>
            )}
          </button>
        )}

        {hasActiveFilters && (
          <button
            onClick={() => onChange({ search: value.search })}
            className="h-10 px-3 rounded-xl text-sm text-white/40 hover:text-red-400 transition-colors"
          >
            {t('actions.reset')}
          </button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 rounded-xl border border-white/10 backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          {statusOptions && (
            <select
              value={value.status || ''}
              onChange={(e) => update({ status: e.target.value || undefined })}
              className="h-8 px-2 rounded-lg border border-white/12 text-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400 backdrop-blur-xl"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <option value="">الكل</option>
              {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {categoryOptions && (
            <select
              value={value.category || ''}
              onChange={(e) => update({ category: e.target.value || undefined })}
              className="h-8 px-2 rounded-lg border border-white/12 text-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400 backdrop-blur-xl"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <option value="">كل الفئات</option>
              {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          )}
          {showDateRange && (
            <>
              <input type="date" value={value.date_from || ''} onChange={(e) => update({ date_from: e.target.value || undefined })}
                className="h-8 px-2 rounded-lg border border-white/12 text-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400 backdrop-blur-xl"
                style={{ background: 'rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
              <input type="date" value={value.date_to || ''} onChange={(e) => update({ date_to: e.target.value || undefined })}
                className="h-8 px-2 rounded-lg border border-white/12 text-white/80 text-xs focus:outline-none focus:ring-1 focus:ring-gold-400 backdrop-blur-xl"
                style={{ background: 'rgba(255,255,255,0.08)', colorScheme: 'dark' }} />
            </>
          )}
        </div>
      )}

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={() => update({ [c.key]: undefined })} />
          ))}
        </div>
      )}
    </div>
  );
}
