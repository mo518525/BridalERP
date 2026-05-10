import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, ShoppingBag, DollarSign, Package, Users,
  Download, FileText, Loader2, TrendingUp, TrendingDown,
  RefreshCw, Check, Calendar,
} from 'lucide-react';
import { api } from '../../lib/api';
type ToastFn = (type: 'success' | 'error', msg: string) => void;
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { todayISO } from '../../utils/formatters';
import type { FinancialReport, Transaction, Expense, Customer, Dress } from '../../types';

// Date helpers
function firstOfMonth()    { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); }
function daysAgo(n: number){ const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
function firstOfPrevMonth(){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0, 10); }
function lastOfPrevMonth() { const d = new Date(); d.setDate(0); return d.toISOString().slice(0, 10); }
function firstOfYear()     { return new Date().getFullYear() + '-01-01'; }

// CSV
function buildCsv(rows: (string | number | null | undefined)[][]): string {
  return '﻿' + rows.map(r =>
    r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n');
}

// Labels
const CAT_LABEL: Record<string, string>       = { rent:'إيجار', electricity:'كهرباء', salary:'رواتب', cleaning:'تنظيف', marketing:'تسويق', maintenance:'صيانة', other:'أخرى' };
const STATUS_LABEL: Record<string, string>    = { available:'متاح', reserved:'محجوز', rented:'مؤجر', cleaning:'تنظيف', sold:'مباع' };
const STATUS_COLOR: Record<string, string>    = { available:'#4ade80', reserved:'#fbbf24', rented:'#60a5fa', cleaning:'#c084fc', sold:'#f87171' };
const TX_STATUS_LABEL: Record<string, string> = { active:'نشط', completed:'مكتمل', cancelled:'ملغي' };
const TX_STATUS_COLOR: Record<string, string> = { active:'#60a5fa', completed:'#4ade80', cancelled:'#f87171' };
const PAYMENT_LABEL: Record<string, string>   = { cash:'نقد', card:'بطاقة', transfer:'تحويل', shamcash:'شام كاش' };
const REC_LABEL: Record<string, string>       = { none:'مرة', monthly:'شهري', weekly:'أسبوعي' };

// Types
type ReportType = 'financial' | 'transactions' | 'expenses' | 'inventory' | 'customers';

interface InventoryStats { total: number; by_status: Record<string, number>; total_inventory_value: number; }

type ReportResult =
  | { type: 'financial';    data: FinancialReport }
  | { type: 'transactions'; data: Transaction[] }
  | { type: 'expenses';     data: Expense[] }
  | { type: 'inventory';    data: { stats: InventoryStats; dresses: Dress[] } }
  | { type: 'customers';    data: Customer[] };

interface ReportDef { id: ReportType; label: string; desc: string; icon: React.ElementType; color: string; needsDates: boolean; }

const REPORT_DEFS: ReportDef[] = [
  { id: 'financial',    label: 'التقرير المالي', desc: 'الإيرادات والمصروفات وصافي الربح', icon: BarChart3,   color: '#c9a84c', needsDates: true  },
  { id: 'transactions', label: 'المعاملات',       desc: 'كل المبيعات والإيجارات',           icon: ShoppingBag, color: '#60a5fa', needsDates: true  },
  { id: 'expenses',     label: 'المصروفات',       desc: 'جميع المصروفات مصنفةً',           icon: DollarSign,  color: '#f87171', needsDates: true  },
  { id: 'inventory',    label: 'المخزون',          desc: 'حالة الفساتين الحالية',           icon: Package,     color: '#a78bfa', needsDates: false },
  { id: 'customers',    label: 'العملاء',          desc: 'قائمة العملاء وبياناتهم',         icon: Users,       color: '#34d399', needsDates: false },
];

const DATE_PRESETS = [
  { label: 'هذا الشهر',    getFrom: firstOfMonth,     getTo: todayISO        },
  { label: 'الشهر الماضي', getFrom: firstOfPrevMonth,  getTo: lastOfPrevMonth },
  { label: 'آخر 30 يوم',  getFrom: () => daysAgo(29), getTo: todayISO       },
  { label: 'آخر 90 يوم',  getFrom: () => daysAgo(89), getTo: todayISO       },
  { label: 'هذه السنة',   getFrom: firstOfYear,       getTo: todayISO       },
];

// CSV export
async function exportToCsv(result: ReportResult, from: string, to: string, toast: ToastFn) {
  const base = `${from}_${to}`;
  let filename = '';
  let rows: (string | number | null | undefined)[][] = [];

  if (result.type === 'financial') {
    filename = `تقرير_مالي_${base}.csv`;
    const r = result.data;
    rows = [
      ['الملخص', ''],
      ['إيرادات المبيعات ($)', r.sale_revenue],
      ['إيرادات التأجير ($)',  r.rental_revenue],
      ['إجمالي الإيرادات ($)', r.total_revenue],
      ['إجمالي المصروفات ($)', r.total_expenses],
      ['صافي الربح ($)',        r.net_profit],
      ['', ''],
      ['تفاصيل المعاملات'],
      ['العميل','الفستان','النوع','السعر','العربون','المتبقي','العملة','الحالة','التاريخ'],
      ...r.transactions.map(tx => [tx.customer_name, tx.dress_code, tx.transaction_type==='sale'?'بيع':'إيجار', tx.price, tx.deposit, tx.remaining, tx.currency, TX_STATUS_LABEL[tx.status]??tx.status, tx.created_at.slice(0,10)]),
      ['',''],
      ['تفاصيل المصروفات'],
      ['الفئة','المبلغ','العملة','الوصف','التاريخ','التكرار'],
      ...r.expenses.map(ex => [CAT_LABEL[ex.category]??ex.category, ex.amount, ex.currency, ex.description, ex.date, REC_LABEL[ex.recurring_type]??ex.recurring_type]),
    ];
  } else if (result.type === 'transactions') {
    filename = `تقرير_المعاملات_${base}.csv`;
    rows = [
      ['العميل','الهاتف','الفستان','المقاس','النوع','السعر','العربون','المتبقي','العملة','طريقة الدفع','الحالة','بداية الإيجار','نهاية الإيجار','تاريخ الإرجاع','تاريخ الإنشاء','ملاحظات'],
      ...result.data.map(tx => [tx.customer_name, tx.customer_phone, tx.dress_code, tx.dress_size, tx.transaction_type==='sale'?'بيع':'إيجار', tx.price, tx.deposit, tx.remaining, tx.currency, PAYMENT_LABEL[tx.payment_method]??tx.payment_method, TX_STATUS_LABEL[tx.status]??tx.status, tx.rental_start, tx.rental_end, tx.return_date, tx.created_at.slice(0,10), tx.notes]),
    ];
  } else if (result.type === 'expenses') {
    filename = `تقرير_المصروفات_${base}.csv`;
    rows = [
      ['الفئة','المبلغ','العملة','الوصف','التاريخ','التكرار'],
      ...result.data.map(ex => [CAT_LABEL[ex.category]??ex.category, ex.amount, ex.currency, ex.description, ex.date, REC_LABEL[ex.recurring_type]??ex.recurring_type]),
    ];
  } else if (result.type === 'inventory') {
    filename = `تقرير_المخزون_${base}.csv`;
    rows = [
      ['الكود','الحالة','اللون','المقاس','الأسلوب','السعر ($)','المنظف','تاريخ الإضافة'],
      ...result.data.dresses.map(d => [d.code, STATUS_LABEL[d.status]??d.status, d.color, d.size, d.style, d.price, d.cleaner_name, d.created_at.slice(0,10)]),
    ];
  } else if (result.type === 'customers') {
    filename = `تقرير_العملاء_${base}.csv`;
    rows = [
      ['الاسم','الهاتف','العنوان','ملاحظات','تاريخ التسجيل'],
      ...result.data.map(c => [c.name, c.phone, c.address, c.notes, c.created_at.slice(0,10)]),
    ];
  }

  if (!filename) return;
  try {
    const savedPath = await api.exports.saveToDownloads(filename, buildCsv(rows));
    toast('success', `تم الحفظ في: ${savedPath}`);
  } catch (e) {
    toast('error', String(e));
  }
}

// Preview table
function PTable({ headers, rows, isDark }: { headers: string[]; rows: (string | number | React.ReactNode)[][]; isDark: boolean; }) {
  const gold   = '#c9a84c';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(60,42,24,0.07)';
  const altRow = isDark ? 'rgba(255,255,255,0.025)' : 'rgba(60,42,24,0.025)';
  const textM  = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(55,38,18,0.88)';
  const textS  = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(60,42,24,0.44)';
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
      <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
        <table className="w-full text-xs" style={{ fontFamily: 'Cairo, sans-serif' }}>
          <thead className="sticky top-0 z-10">
            <tr style={{ background: isDark ? 'rgba(20,14,8,0.95)' : 'rgba(255,255,255,0.95)', borderBottom: `1px solid ${gold}44` }}>
              {headers.map((h, i) => (
                <th key={i} className="px-3 py-2.5 text-right font-bold whitespace-nowrap" style={{ color: gold }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={headers.length} className="text-center py-8" style={{ color: textS }}>لا توجد بيانات</td></tr>
            ) : rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${border}`, background: i % 2 === 1 ? altRow : 'transparent' }}>
                {row.map((cell, j) => (
                  <td key={j} className="px-3 py-2 whitespace-nowrap" style={{ color: j === 0 ? textM : textS }}>{cell ?? '—'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Section heading
function SectionTitle({ n, title, count, isDark }: { n: number; title: string; count?: number; isDark: boolean }) {
  const textM = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(55,38,18,0.88)';
  const textS = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{ background: 'rgba(201,168,76,0.18)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.35)' }}>
        {n}
      </span>
      <span className="font-bold text-sm" style={{ color: textM, fontFamily: 'Cairo, sans-serif' }}>{title}</span>
      {count !== undefined && (
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: textS, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(60,42,24,0.06)', fontFamily: 'Cairo, sans-serif' }}>
          {count}
        </span>
      )}
    </div>
  );
}

// Report previews
function FinancialPreview({ data, isDark }: { data: FinancialReport; isDark: boolean }) {
  const kpis = [
    { label: 'إيرادات المبيعات', value: data.sale_revenue,   color: '#c9a84c', icon: ShoppingBag },
    { label: 'إيرادات التأجير',  value: data.rental_revenue, color: '#60a5fa', icon: RefreshCw   },
    { label: 'إجمالي الإيرادات', value: data.total_revenue,  color: '#4ade80', icon: TrendingUp   },
    { label: 'إجمالي المصروفات', value: data.total_expenses, color: '#f87171', icon: TrendingDown  },
    { label: 'صافي الربح',        value: data.net_profit,    color: data.net_profit >= 0 ? '#4ade80' : '#f87171', icon: BarChart3 },
  ];
  const textS = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="rounded-2xl p-4 flex flex-col gap-1.5"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.60)', border: `1px solid ${color}33`, backdropFilter: 'blur(8px)' }}>
            <Icon size={15} style={{ color }} />
            <span className="text-xs leading-tight mt-0.5" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>{label}</span>
            <span className="font-black text-base" style={{ color, fontFamily: 'Cairo, sans-serif', direction: 'ltr' }}>${value.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div>
        <SectionTitle n={1} title="المعاملات" count={data.transactions.length} isDark={isDark} />
        <PTable isDark={isDark}
          headers={['العميل','الفستان','النوع','السعر','العربون','المتبقي','العملة','الحالة','التاريخ']}
          rows={data.transactions.map(tx => [
            tx.customer_name, tx.dress_code,
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ color: tx.transaction_type==='sale'?'#c9a84c':'#60a5fa', background: tx.transaction_type==='sale'?'rgba(201,168,76,0.15)':'rgba(96,165,250,0.15)' }}>
              {tx.transaction_type==='sale'?'بيع':'إيجار'}
            </span>,
            tx.price, tx.deposit, tx.remaining > 0 ? tx.remaining : '✓',
            tx.currency,
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ color: TX_STATUS_COLOR[tx.status], background: `${TX_STATUS_COLOR[tx.status]}18` }}>{TX_STATUS_LABEL[tx.status]??tx.status}</span>,
            tx.created_at.slice(0,10),
          ])}
        />
      </div>
      {data.expenses.length > 0 && (
        <div>
          <SectionTitle n={2} title="المصروفات" count={data.expenses.length} isDark={isDark} />
          <PTable isDark={isDark}
            headers={['الفئة','المبلغ','العملة','الوصف','التاريخ','التكرار']}
            rows={data.expenses.map(ex => [
              CAT_LABEL[ex.category]??ex.category, ex.amount, ex.currency, ex.description, ex.date, REC_LABEL[ex.recurring_type]??ex.recurring_type,
            ])}
          />
        </div>
      )}
    </div>
  );
}

function TransactionsPreview({ data, isDark }: { data: Transaction[]; isDark: boolean }) {
  return (
    <div>
      <SectionTitle n={1} title="قائمة المعاملات" count={data.length} isDark={isDark} />
      <PTable isDark={isDark}
        headers={['العميل','الهاتف','الفستان','المقاس','النوع','السعر','العربون','المتبقي','العملة','طريقة الدفع','الحالة','بداية الإيجار','نهاية الإيجار','التاريخ']}
        rows={data.map(tx => [
          tx.customer_name, tx.customer_phone, tx.dress_code, tx.dress_size,
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ color: tx.transaction_type==='sale'?'#c9a84c':'#60a5fa', background: tx.transaction_type==='sale'?'rgba(201,168,76,0.15)':'rgba(96,165,250,0.15)' }}>
            {tx.transaction_type==='sale'?'بيع':'إيجار'}
          </span>,
          tx.price, tx.deposit, tx.remaining > 0 ? tx.remaining : '✓',
          tx.currency, PAYMENT_LABEL[tx.payment_method]??tx.payment_method,
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ color: TX_STATUS_COLOR[tx.status], background: `${TX_STATUS_COLOR[tx.status]}18` }}>{TX_STATUS_LABEL[tx.status]??tx.status}</span>,
          tx.rental_start?.slice(0,10), tx.rental_end?.slice(0,10), tx.created_at.slice(0,10),
        ])}
      />
    </div>
  );
}

function ExpensesPreview({ data, isDark }: { data: Expense[]; isDark: boolean }) {
  const totalUSD = data.reduce((s, e) => {
    if (e.currency === 'USD') return s + e.amount;
    if (e.currency === 'TRY') return s + e.amount / (e.usd_to_try_snapshot || 34);
    return s + e.amount / (e.usd_to_syp_snapshot || 14000);
  }, 0);
  const textS = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  const textM = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(55,38,18,0.88)';

  const byCategory = Object.entries(
    data.reduce<Record<string, { count: number; usd: number }>>((acc, e) => {
      const cat = CAT_LABEL[e.category] ?? e.category;
      if (!acc[cat]) acc[cat] = { count: 0, usd: 0 };
      acc[cat].count++;
      if (e.currency === 'USD') acc[cat].usd += e.amount;
      else if (e.currency === 'TRY') acc[cat].usd += e.amount / (e.usd_to_try_snapshot || 34);
      else acc[cat].usd += e.amount / (e.usd_to_syp_snapshot || 14000);
      return acc;
    }, {})
  ).sort((a, b) => b[1].usd - a[1].usd);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: isDark ? 'rgba(248,113,113,0.08)' : 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.22)' }}>
        <TrendingDown size={20} style={{ color: '#f87171' }} />
        <div>
          <span className="text-xs" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>إجمالي المصروفات (USD)</span>
          <div className="font-black text-xl" style={{ color: '#f87171', direction: 'ltr' }}>${totalUSD.toFixed(2)}</div>
        </div>
        <div className="ms-auto text-xs" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>{data.length} مصروف</div>
      </div>

      <div>
        <SectionTitle n={1} title="توزيع حسب الفئة" isDark={isDark} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {byCategory.map(([cat, { count, usd }]) => (
            <div key={cat} className="rounded-xl p-3 flex flex-col gap-1"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)', border: '1px solid rgba(248,113,113,0.20)' }}>
              <span className="text-xs font-bold" style={{ color: textM, fontFamily: 'Cairo, sans-serif' }}>{cat}</span>
              <span className="font-black text-sm" style={{ color: '#f87171', direction: 'ltr' }}>${usd.toFixed(2)}</span>
              <span className="text-[10px]" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>{count} إدخال</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle n={2} title="تفاصيل المصروفات" count={data.length} isDark={isDark} />
        <PTable isDark={isDark}
          headers={['الفئة','المبلغ','العملة','الوصف','التاريخ','التكرار']}
          rows={data.map(ex => [CAT_LABEL[ex.category]??ex.category, ex.amount, ex.currency, ex.description, ex.date, REC_LABEL[ex.recurring_type]??ex.recurring_type])}
        />
      </div>
    </div>
  );
}

function InventoryPreview({ data, isDark }: { data: { stats: InventoryStats; dresses: Dress[] }; isDark: boolean }) {
  const textS = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  const textM = isDark ? 'rgba(255,255,255,0.85)' : 'rgba(55,38,18,0.88)';
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(STATUS_LABEL).map(([key, label]) => {
          const count = data.stats.by_status[key] ?? 0;
          const color = STATUS_COLOR[key] ?? '#fff';
          return (
            <div key={key} className="rounded-2xl p-4 flex flex-col gap-1"
              style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.60)', border: `1px solid ${color}33` }}>
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              <span className="font-black text-2xl" style={{ color }}>{count}</span>
              <span className="text-xs" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.22)' }}>
        <Package size={20} style={{ color: '#c9a84c' }} />
        <div>
          <span className="text-xs" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>إجمالي عدد الفساتين</span>
          <div className="font-black text-xl" style={{ color: '#c9a84c' }}>{data.stats.total}</div>
        </div>
        <div className="ms-auto">
          <span className="text-xs" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>قيمة المخزون</span>
          <div className="font-black text-base" style={{ color: textM, direction: 'ltr' }}>${data.stats.total_inventory_value.toFixed(0)}</div>
        </div>
      </div>
      <div>
        <SectionTitle n={1} title="قائمة الفساتين" count={data.dresses.length} isDark={isDark} />
        <PTable isDark={isDark}
          headers={['الكود','الحالة','اللون','المقاس','الأسلوب','السعر ($)','المنظف','تاريخ الإضافة']}
          rows={data.dresses.map(d => [
            d.code,
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold" style={{ color: STATUS_COLOR[d.status], background: `${STATUS_COLOR[d.status]}18` }}>{STATUS_LABEL[d.status]??d.status}</span>,
            d.color, d.size, d.style, d.price, d.cleaner_name, d.created_at.slice(0,10),
          ])}
        />
      </div>
    </div>
  );
}

function CustomersPreview({ data, isDark }: { data: Customer[]; isDark: boolean }) {
  const textS = isDark ? 'rgba(255,255,255,0.38)' : 'rgba(60,42,24,0.40)';
  return (
    <div>
      <div className="flex items-center gap-3 p-4 rounded-2xl mb-5" style={{ background: isDark ? 'rgba(52,211,153,0.08)' : 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.22)' }}>
        <Users size={20} style={{ color: '#34d399' }} />
        <span className="font-black text-xl" style={{ color: '#34d399' }}>{data.length}</span>
        <span className="text-xs" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>عميل مسجل</span>
      </div>
      <SectionTitle n={1} title="قائمة العملاء" count={data.length} isDark={isDark} />
      <PTable isDark={isDark}
        headers={['الاسم','الهاتف','العنوان','ملاحظات','تاريخ التسجيل']}
        rows={data.map(c => [c.name, c.phone, c.address, c.notes, c.created_at.slice(0,10)])}
      />
    </div>
  );
}

// Print / PDF
async function exportToPdf(result: ReportResult, from: string, to: string, activeDef: ReportDef, toast: ToastFn, shopName: string, shopLogo: string) {
  const [shopPhone, shopCity, shopAddress] = await Promise.all([
    api.settings.get('shop_phone').catch(() => null),
    api.settings.get('shop_city').catch(() => null),
    api.settings.get('shop_address').catch(() => null),
  ]);

  const getTableHtml = (headers: string[], rows: (string | number | null | undefined)[][]) => `
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r, i) => `<tr class="${i%2?'alt':''}">${r.map(c => `<td>${c ?? '—'}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

  let body = '';

  if (result.type === 'financial') {
    const r = result.data;
    body = `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-label">إيرادات المبيعات</div><div class="kpi-val gold">$${r.sale_revenue.toFixed(2)}</div></div>
        <div class="kpi"><div class="kpi-label">إيرادات التأجير</div><div class="kpi-val blue">$${r.rental_revenue.toFixed(2)}</div></div>
        <div class="kpi"><div class="kpi-label">إجمالي الإيرادات</div><div class="kpi-val green">$${r.total_revenue.toFixed(2)}</div></div>
        <div class="kpi"><div class="kpi-label">إجمالي المصروفات</div><div class="kpi-val red">$${r.total_expenses.toFixed(2)}</div></div>
        <div class="kpi profit"><div class="kpi-label">صافي الربح</div><div class="kpi-val ${r.net_profit>=0?'green':'red'}">$${r.net_profit.toFixed(2)}</div></div>
      </div>
      <h3>المعاملات (${r.transactions.length})</h3>
      ${getTableHtml(['العميل','الفستان','النوع','السعر','العربون','المتبقي','العملة','الحالة','التاريخ'],
        r.transactions.map(tx => [tx.customer_name, tx.dress_code, tx.transaction_type==='sale'?'بيع':'إيجار', tx.price, tx.deposit, tx.remaining, tx.currency, TX_STATUS_LABEL[tx.status]??tx.status, tx.created_at.slice(0,10)]))}
      ${r.expenses.length ? `<h3>المصروفات (${r.expenses.length})</h3>${getTableHtml(['الفئة','المبلغ','العملة','الوصف','التاريخ'],r.expenses.map(ex=>[CAT_LABEL[ex.category]??ex.category,ex.amount,ex.currency,ex.description,ex.date]))}` : ''}`;
  } else if (result.type === 'transactions') {
    body = getTableHtml(['العميل','الهاتف','الفستان','النوع','السعر','العربون','المتبقي','العملة','الحالة','التاريخ'],
      result.data.map(tx => [tx.customer_name, tx.customer_phone, tx.dress_code, tx.transaction_type==='sale'?'بيع':'إيجار', tx.price, tx.deposit, tx.remaining, tx.currency, TX_STATUS_LABEL[tx.status]??tx.status, tx.created_at.slice(0,10)]));
  } else if (result.type === 'expenses') {
    body = getTableHtml(['الفئة','المبلغ','العملة','الوصف','التاريخ','التكرار'],
      result.data.map(ex => [CAT_LABEL[ex.category]??ex.category, ex.amount, ex.currency, ex.description, ex.date, REC_LABEL[ex.recurring_type]??ex.recurring_type]));
  } else if (result.type === 'inventory') {
    body = getTableHtml(['الكود','الحالة','اللون','المقاس','الأسلوب','السعر ($)','تاريخ الإضافة'],
      result.data.dresses.map(d => [d.code, STATUS_LABEL[d.status]??d.status, d.color, d.size, d.style, d.price, d.created_at.slice(0,10)]));
  } else if (result.type === 'customers') {
    body = getTableHtml(['الاسم','الهاتف','العنوان','ملاحظات','تاريخ التسجيل'],
      result.data.map(c => [c.name, c.phone, c.address, c.notes, c.created_at.slice(0,10)]));
  }

  const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
  <title></title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Cairo',Arial,sans-serif;color:#1a0f04;padding:32px;font-size:12px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #c9a84c}
    .logo{display:flex;align-items:center;gap:10px}
    .logo-icon{width:44px;height:44px;background:linear-gradient(135deg,#c9a84c,#a07a2e);border-radius:10px;display:flex;align-items:center;justify-content:center;color:white;font-size:20px}
    .company-name{font-size:16px;font-weight:900;color:#1a0f04}
    .company-sub{font-size:10px;color:#7a5c2e;margin-top:2px}
    .report-title{text-align:center}
    .report-title h1{font-size:20px;font-weight:900;color:#1a0f04}
    .report-title p{font-size:11px;color:#7a5c2e;margin-top:4px}
    .date-info{text-align:left;font-size:11px;color:#7a5c2e}
    .date-info strong{color:#1a0f04}
    h3{font-size:13px;font-weight:700;margin:20px 0 8px;color:#1a0f04;padding:6px 10px;background:#fdf8ec;border-right:3px solid #c9a84c;border-radius:4px}
    table{width:100%;border-collapse:collapse;margin-bottom:16px}
    th{background:#fdf8ec;color:#7a5c2e;font-size:10px;font-weight:700;text-align:right;padding:7px 10px;border-bottom:1px solid #e8d9a0}
    td{padding:6px 10px;font-size:10px;border-bottom:1px solid #f0e8d0}
    tr.alt td{background:#faf6ec}
    .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:20px}
    .kpi{background:#fdf8ec;border:1px solid #e8d9a0;border-radius:8px;padding:12px}
    .kpi.profit{grid-column:span 2}
    .kpi-label{font-size:9px;color:#7a5c2e;margin-bottom:4px}
    .kpi-val{font-size:15px;font-weight:900;direction:ltr}
    .kpi-val.gold{color:#c9a84c}.kpi-val.blue{color:#3b82f6}.kpi-val.green{color:#16a34a}.kpi-val.red{color:#dc2626}
    .footer{margin-top:32px;padding-top:14px;border-top:2px solid #e8d9a0}
    .footer-inner{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .footer-shop{display:flex;align-items:center;gap:10px}
    .footer-logo{width:32px;height:32px;object-fit:contain;border-radius:6px}
    .footer-shop-name{font-size:12px;font-weight:800;color:#1a0f04}
    .footer-contact{display:flex;flex-direction:column;gap:3px;margin-top:4px}
    .footer-contact span{font-size:9px;color:#7a5c2e}
    .footer-report{text-align:left;font-size:9px;color:#a08050;padding-top:4px}
    @media print{body{padding:0}@page{size:A4 landscape;margin:3cm}}
  </style></head><body>
  <div class="header">
    <div class="logo">${shopLogo ? `<img src="${shopLogo}" style="width:44px;height:44px;object-fit:contain;border-radius:10px"/>` : '<div class="logo-icon">👗</div>'}<div><div class="company-name">${shopName || 'Bridal ERP'}</div></div></div>
    <div class="report-title"><h1>${activeDef.label}</h1><p>${from} — ${to}</p></div>
    <div class="date-info"><div>تاريخ الإصدار: <strong>${new Date().toLocaleDateString('ar')}</strong></div></div>
  </div>
  ${body}
  <div class="footer">
    <div class="footer-inner">
      <div class="footer-shop">
        ${shopLogo ? `<img class="footer-logo" src="${shopLogo}" alt="logo"/>` : ''}
        <div>
          <div class="footer-shop-name">${shopName || ''}</div>
          <div class="footer-contact">
            ${shopCity ? `<span>📍 ${shopCity}${shopAddress ? ' — ' + shopAddress : ''}</span>` : shopAddress ? `<span>📍 ${shopAddress}</span>` : ''}
            ${shopPhone ? `<span>📞 ${shopPhone}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="footer-report">${activeDef.label} · ${from} — ${to}</div>
    </div>
  </div>
  </body></html>`;

  const base = `${from}_${to}`;
  const filename = `${activeDef.label}_${base}`;
  try {
    const savedPath = await api.exports.savePdfToDownloads(html, filename);
    toast('success', `تم الحفظ في: ${savedPath}`);
  } catch (e) {
    toast('error', String(e));
  }
}

// Main component
export function Reports() {
  const { theme, addToast, shopName, shopLogo } = useUIStore();
  const { canViewFinance, canExport } = usePermissions();
  const isDark = theme === 'dark';

  const [activeType, setActiveType]     = useState<ReportType>('financial');
  const [activePreset, setActivePreset] = useState<string>('هذا الشهر');
  const [dateFrom, setDateFrom]         = useState(firstOfMonth());
  const [dateTo, setDateTo]             = useState(todayISO());
  const [loading, setLoading]           = useState(false);
  const [result, setResult]             = useState<ReportResult | null>(null);

  const activeDef = REPORT_DEFS.find(d => d.id === activeType)!;
  const gold   = '#c9a84c';
  const textM  = isDark ? 'rgba(255,255,255,0.88)' : 'rgba(55,38,18,0.90)';
  const textS  = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(60,42,24,0.42)';
  const border = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(60,42,24,0.09)';
  const glass  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)';
  const inputStyle: React.CSSProperties = { fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.60)', border: `1px solid ${border}`, borderRadius: 12, color: textM, outline: 'none', height: 36, paddingInline: '10px', colorScheme: isDark ? 'dark' : 'light' };

  if (!canViewFinance) {
    return (
      <div className="flex flex-col items-center justify-center h-64" style={{ color: textS }}>
        <BarChart3 size={48} className="mb-3 opacity-25" />
        <p style={{ fontFamily: 'Cairo, sans-serif' }}>ليس لديك صلاحية عرض التقارير</p>
      </div>
    );
  }

  const generate = async () => {
    setLoading(true);
    setResult(null);
    try {
      if (activeType === 'financial') {
        const data = await api.reports.getFinancialReport(dateFrom, dateTo);
        setResult({ type: 'financial', data });
      } else if (activeType === 'transactions') {
        const data = await api.transactions.getAll({ date_from: dateFrom, date_to: dateTo });
        setResult({ type: 'transactions', data });
      } else if (activeType === 'expenses') {
        const data = await api.expenses.getAll({ date_from: dateFrom, date_to: dateTo });
        setResult({ type: 'expenses', data });
      } else if (activeType === 'inventory') {
        const [stats, dresses] = await Promise.all([
          api.reports.getInventoryReport() as unknown as Promise<InventoryStats>,
          api.inventory.getAll(),
        ]);
        setResult({ type: 'inventory', data: { stats, dresses } });
      } else if (activeType === 'customers') {
        const data = await api.customers.getAll();
        setResult({ type: 'customers', data });
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const applyPreset = (preset: typeof DATE_PRESETS[number]) => {
    setActivePreset(preset.label);
    setDateFrom(preset.getFrom());
    setDateTo(preset.getTo());
    setResult(null);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: textM, fontFamily: 'Cairo, sans-serif' }}>التقارير</h1>
          <p className="text-sm mt-0.5" style={{ color: textS, fontFamily: 'Cairo, sans-serif' }}>اختر نوع التقرير والفترة الزمنية ثم قم بالتصدير</p>
        </div>
        {result && canExport && (
          <div className="flex items-center gap-2">
            <motion.button initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }}
              onClick={() => exportToCsv(result, dateFrom, dateTo, addToast)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ fontFamily:'Cairo,sans-serif', background: isDark?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.60)', border:`1px solid ${border}`, color:textM }}>
              <Download size={15} style={{ color: '#4ade80' }} /> تصدير CSV
            </motion.button>
            <motion.button initial={{ opacity:0,y:-6 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.05 }}
              onClick={() => exportToPdf(result, dateFrom, dateTo, activeDef, addToast, shopName, shopLogo)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ fontFamily:'Cairo,sans-serif', background:'rgba(201,168,76,0.15)', border:`1px solid ${gold}55`, color: gold }}>
              <FileText size={15} /> تصدير PDF
            </motion.button>
          </div>
        )}
      </div>

      {/* Report type cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {REPORT_DEFS.map(def => {
          const Icon = def.icon;
          const active = activeType === def.id;
          return (
            <motion.button key={def.id} whileHover={{ y:-3 }} whileTap={{ scale:0.97 }}
              onClick={() => { setActiveType(def.id); setResult(null); }}
              className="flex flex-col items-start gap-2 p-4 rounded-2xl text-left transition-all"
              style={{
                fontFamily: 'Cairo, sans-serif',
                background: active ? `${def.color}18` : glass,
                border: active ? `1.5px solid ${def.color}66` : `1px solid ${border}`,
                backdropFilter: 'blur(12px)',
                boxShadow: active ? `0 4px 20px ${def.color}22` : 'none',
              }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: active ? `${def.color}25` : isDark?'rgba(255,255,255,0.07)':'rgba(60,42,24,0.07)', border: `1px solid ${active ? def.color+'44' : border}` }}>
                <Icon size={17} style={{ color: active ? def.color : textS }} />
              </div>
              <div className="text-start w-full">
                <div className="text-sm font-bold leading-tight" style={{ color: active ? def.color : textM }}>{def.label}</div>
                <div className="text-[11px] mt-0.5 leading-snug" style={{ color: textS }}>{def.desc}</div>
              </div>
              {active && (
                <div className="self-end">
                  <Check size={13} style={{ color: def.color }} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Date controls (only when needed) */}
      <AnimatePresence>
        {activeDef.needsDates && (
          <motion.div key="dates" initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }} className="overflow-hidden">
            <div className="rounded-2xl p-4 space-y-3" style={{ background: glass, border:`1px solid ${border}`, backdropFilter:'blur(12px)' }}>
              {/* Presets */}
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 me-2">
                  <Calendar size={13} style={{ color: textS }} />
                  <span className="text-xs font-semibold" style={{ color: textS, fontFamily:'Cairo,sans-serif' }}>الفترة:</span>
                </div>
                {DATE_PRESETS.map(p => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className="px-3 py-1 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      fontFamily: 'Cairo, sans-serif',
                      background: activePreset === p.label ? `${activeDef.color}20` : isDark?'rgba(255,255,255,0.05)':'rgba(60,42,24,0.05)',
                      border: `1px solid ${activePreset === p.label ? activeDef.color+'55' : border}`,
                      color: activePreset === p.label ? activeDef.color : textS,
                    }}>
                    {p.label}
                  </button>
                ))}
              </div>
              {/* Custom date inputs */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs" style={{ color: textS, fontFamily:'Cairo,sans-serif' }}>مخصص:</span>
                <input type="date" value={dateFrom} style={inputStyle}
                  onChange={e => { setDateFrom(e.target.value); setActivePreset(''); setResult(null); }} />
                <span style={{ color: textS }}>—</span>
                <input type="date" value={dateTo} style={inputStyle}
                  onChange={e => { setDateTo(e.target.value); setActivePreset(''); setResult(null); }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          onClick={generate} disabled={loading}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all"
          style={{ fontFamily:'Cairo,sans-serif', background: `linear-gradient(135deg, ${activeDef.color}, ${activeDef.color}bb)`, color:'#fff', boxShadow:`0 4px 16px ${activeDef.color}44`, opacity: loading?0.7:1 }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <activeDef.icon size={16} />}
          {loading ? 'جاري الإنشاء...' : 'إنشاء التقرير'}
        </motion.button>
        {result && !loading && (
          <motion.span initial={{ opacity:0 }} animate={{ opacity:1 }}
            className="flex items-center gap-1.5 text-xs"
            style={{ color:'#4ade80', fontFamily:'Cairo,sans-serif' }}>
            <Check size={13} /> تم إنشاء التقرير
          </motion.span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center py-20 gap-3">
          <Loader2 size={32} className="animate-spin" style={{ color: activeDef.color }} />
          <span className="text-sm" style={{ color: textS, fontFamily:'Cairo,sans-serif' }}>جاري تحميل البيانات...</span>
        </div>
      )}

      {/* Preview panel */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div key={activeType}
            initial={{ opacity:0, y:14 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: glass, border:`1px solid ${activeDef.color}33`, backdropFilter:'blur(16px)' }}>
            {/* Panel header */}
            <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0" style={{ borderBottom:`1px solid ${activeDef.color}33` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background:`${activeDef.color}20`, border:`1px solid ${activeDef.color}44` }}>
                <activeDef.icon size={16} style={{ color: activeDef.color }} />
              </div>
              <div>
                <span className="font-bold text-sm" style={{ color: textM, fontFamily:'Cairo,sans-serif' }}>{activeDef.label}</span>
                {activeDef.needsDates && (
                  <span className="text-xs ms-2" style={{ color: textS, fontFamily:'Cairo,sans-serif' }}>
                    {dateFrom} — {dateTo}
                  </span>
                )}
              </div>
              {canExport && (
                <div className="ms-auto flex gap-2">
                  <button onClick={() => exportToCsv(result, dateFrom, dateTo, addToast)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ fontFamily:'Cairo,sans-serif', color:'#4ade80', background:'rgba(74,222,128,0.10)', border:'1px solid rgba(74,222,128,0.25)' }}>
                    <Download size={12} /> CSV
                  </button>
                  <button onClick={() => exportToPdf(result, dateFrom, dateTo, activeDef, addToast, shopName, shopLogo)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                    style={{ fontFamily:'Cairo,sans-serif', color: gold, background:'rgba(201,168,76,0.10)', border:`1px solid ${gold}33` }}>
                    <FileText size={12} /> PDF
                  </button>
                </div>
              )}
            </div>
            {/* Panel body */}
            <div className="p-5">
              {result.type === 'financial'    && <FinancialPreview    data={result.data} isDark={isDark} />}
              {result.type === 'transactions' && <TransactionsPreview data={result.data} isDark={isDark} />}
              {result.type === 'expenses'     && <ExpensesPreview     data={result.data} isDark={isDark} />}
              {result.type === 'inventory'    && <InventoryPreview    data={result.data} isDark={isDark} />}
              {result.type === 'customers'    && <CustomersPreview    data={result.data} isDark={isDark} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
