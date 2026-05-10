import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';
import { ar as arLocale } from 'date-fns/locale';

const EASTERN_ARABIC_DIGITS = /[٠-٩]/g;
const PERSIAN_DIGITS = /[۰-۹]/g;

export function toWesternDigits(value: string): string {
  return value
    .replace(EASTERN_ARABIC_DIGITS, (digit) => String(digit.charCodeAt(0) - 1632))
    .replace(PERSIAN_DIGITS, (digit) => String(digit.charCodeAt(0) - 1776));
}

export function formatNumber(amount: number, options?: Intl.NumberFormatOptions): string {
  if (isNaN(amount)) return '0';
  return new Intl.NumberFormat('en-US', {
    numberingSystem: 'latn',
    ...options,
  }).format(amount);
}

export function formatCurrency(amount: number, currency = 'ر.س', locale = 'ar'): string {
  if (isNaN(amount)) return `0 ${currency}`;
  const formatted = formatNumber(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${currency}`;
}

export function formatDate(dateStr: string | undefined, locale = 'ar'): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return toWesternDigits(format(date, 'dd/MM/yyyy', { locale: locale === 'ar' ? arLocale : undefined }));
  } catch { return toWesternDigits(dateStr); }
}

export function formatDateTime(dateStr: string | undefined, locale = 'ar'): string {
  if (!dateStr) return '';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return toWesternDigits(format(date, 'dd/MM/yyyy HH:mm', { locale: locale === 'ar' ? arLocale : undefined }));
  } catch { return toWesternDigits(dateStr); }
}

export function formatRelative(dateStr: string, locale = 'ar'): string {
  try {
    return toWesternDigits(formatDistanceToNow(parseISO(dateStr), {
      addSuffix: true,
      locale: locale === 'ar' ? arLocale : undefined,
    }));
  } catch { return toWesternDigits(dateStr); }
}

export function maskAmount(amount: number, hidden: boolean, currency = 'ر.س'): string {
  if (hidden) return `*** ${currency}`;
  return formatCurrency(amount, currency);
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function isOverdue(dateStr: string): boolean {
  try {
    return parseISO(dateStr) < new Date();
  } catch { return false; }
}

export function getDaysUntil(dateStr: string): number {
  try {
    const diff = parseISO(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  } catch { return 0; }
}
