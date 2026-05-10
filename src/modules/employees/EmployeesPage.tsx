import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Pencil, Trash2, ShoppingBag, RotateCcw,
  KeyRound, X, CheckCircle, AlertTriangle, Shield, TrendingUp,
  Clock, ChevronLeft, Megaphone, Send,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useUIStore } from '../../store/uiStore';
import { tok } from '../../utils/themeTokens';
import { api } from '../../lib/api';
import { Button } from '../../components/Button';
import { Input, Select } from '../../components/Input';
import { Modal, ConfirmDialog } from '../../components/Modal';
import { formatDate, formatCurrency, isOverdue } from '../../utils/formatters';
import type { User, Transaction, Reminder, Announcement } from '../../types';

function glass(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.38)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.94)',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 14px 28px rgba(180,180,180,0.03), inset 0 1px 0 rgba(255,255,255,0.99)',
    ...extra,
  };
}

const ROLE_OPTIONS = [
  { value: 'employee', label: 'موظف' },
  { value: 'cashier', label: 'كاشير' },
];
const ROLE_MAP: Record<string, string> = { owner: 'مالك', employee: 'موظف', cashier: 'كاشير' };
const ROLE_COLOR: Record<string, { bg: string; text: string }> = {
  owner:    { bg: 'rgba(201,168,76,0.18)',  text: '#c9a84c' },
  employee: { bg: 'rgba(100,160,220,0.18)', text: '#60a4dc' },
  cashier:  { bg: 'rgba(120,180,120,0.18)', text: '#6aad6a' },
};

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="flex items-center justify-center rounded-full font-bold flex-shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,rgba(201,168,76,0.30),rgba(201,168,76,0.12))', border: '1.5px solid rgba(201,168,76,0.35)', color: '#c9a84c', fontSize: size * 0.38 }}>
      {initials || '؟'}
    </div>
  );
}

function StatCard({ icon, label, value, sub, isDark }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; isDark: boolean }) {
  const t = tok(isDark);
  return (
    <div className="rounded-[18px] px-4 py-3 flex items-center gap-3" style={glass(isDark)}>
      <span style={{ color: t.gold, opacity: 0.85 }}>{icon}</span>
      <div>
        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.68rem', color: t.textMuted }}>{label}</p>
        <p style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: t.text1 }}>{value}</p>
        {sub && <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.65rem', color: t.textFaint }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Password change modal ────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, userId, isOwnerReset }: { onClose: () => void; userId: string; isOwnerReset?: boolean }) {
  const { addToast } = useUIStore();
  const [old, setOld] = useState('');
  const [next, setNext] = useState('');
  const [conf, setConf] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== conf) { setErr('كلمتا المرور غير متطابقتان'); return; }
    if (next.length < 4) { setErr('كلمة المرور قصيرة جداً'); return; }
    setLoading(true); setErr('');
    try {
      if (isOwnerReset) {
        await api.auth.updateUser(userId, '', '', true, next);
      } else {
        await api.auth.changeOwnPassword(old, next);
      }
      addToast('success', 'تم تغيير كلمة المرور');
      onClose();
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} title="تغيير كلمة المرور" size="sm"
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button variant="gold" form="pw-form" type="submit" loading={loading}>حفظ</Button></>}>
      <form id="pw-form" onSubmit={submit} className="space-y-3">
        {err && <p className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>{err}</p>}
        {!isOwnerReset && <Input label="كلمة المرور الحالية" type="password" value={old} onChange={e => setOld(e.target.value)} required />}
        <Input label="كلمة المرور الجديدة" type="password" value={next} onChange={e => setNext(e.target.value)} required />
        <Input label="تأكيد كلمة المرور" type="password" value={conf} onChange={e => setConf(e.target.value)} required />
      </form>
    </Modal>
  );
}

// ─── User form (add / edit) ───────────────────────────────────────────────────
function UserForm({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: (u: User) => void }) {
  const { addToast } = useUIStore();
  const [form, setForm] = useState({ name: user?.name ?? '', username: user?.username ?? '', role: user?.role === 'owner' ? 'employee' : (user?.role ?? 'employee'), active: user?.active ?? true, password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const set = (k: string, v: string | boolean) => { setForm(f => ({ ...f, [k]: v })); setIsDirty(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setErr('الاسم مطلوب'); return; }
    if (!user && !form.password) { setErr('كلمة المرور مطلوبة'); return; }
    if (form.password && form.password !== form.confirm) { setErr('كلمتا المرور غير متطابقتان'); return; }
    setLoading(true); setErr('');
    try {
      if (user) {
        await api.auth.updateUser(user.id, form.name, form.role, form.active, form.password || undefined);
        onSaved({ ...user, name: form.name, role: form.role as User['role'], active: form.active });
      } else {
        const created = await api.auth.createUser({ name: form.name, username: form.username, password: form.password, role: form.role });
        onSaved(created);
      }
      addToast('success', 'تم الحفظ');
    } catch (e) { setErr(String(e)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} isDirty={isDirty} title={user ? 'تعديل الموظف' : 'إضافة موظف'} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>إلغاء</Button><Button variant="gold" form="emp-form" type="submit" loading={loading}>حفظ</Button></>}>
      <form id="emp-form" onSubmit={submit} className="space-y-4">
        {err && <p className="text-xs text-red-400 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}>{err}</p>}
        <Input label="الاسم الكامل" value={form.name} onChange={e => set('name', e.target.value)} required />
        {!user && <Input label="اسم المستخدم" value={form.username} onChange={e => set('username', e.target.value)} required />}
        <Select label="الدور" value={form.role} onChange={e => set('role', e.target.value)} options={ROLE_OPTIONS} />
        {!user && <>
          <Input label="كلمة المرور" type="password" value={form.password} onChange={e => set('password', e.target.value)} required />
          <Input label="تأكيد كلمة المرور" type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
        </>}
        {user && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-yellow-500" />
            <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.85rem', color: 'rgba(255,255,255,0.65)' }}>حساب نشط</span>
          </label>
        )}
      </form>
    </Modal>
  );
}

// ─── Employee detail panel (owner view) ──────────────────────────────────────
function EmployeeDetail({ emp, txns, reminders, isDark, onClose, onEdit, onDelete }: {
  emp: User; txns: Transaction[]; reminders: Reminder[]; isDark: boolean;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const t = tok(isDark);
  const [showPw, setShowPw] = useState(false);
  const myTxns = txns.filter(tx => tx.employee_id === emp.id);
  const revenue = myTxns.reduce((s, tx) => s + tx.price, 0);
  const myReminders = reminders.filter(r => r.status === 'pending');
  const overdue = myReminders.filter(r => isOverdue(r.date)).length;
  const rc = ROLE_COLOR[emp.role] ?? ROLE_COLOR.employee;

  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="rounded-[24px] flex flex-col overflow-hidden"
      style={glass(isDark, { height: '100%' })}>

      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3">
          <Avatar name={emp.name} size={40} />
          <div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: t.text1 }}>{emp.name}</p>
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.70rem', color: t.textMuted }}>@{emp.username}</p>
          </div>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full"
          style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: t.textMuted }}>
          <X size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4 pb-3">
        {[
          { label: 'المعاملات', value: myTxns.length, icon: <ShoppingBag size={14} /> },
          { label: 'الإيرادات $', value: revenue.toFixed(0), icon: <TrendingUp size={14} /> },
        ].map(s => (
          <div key={s.label} className="rounded-[14px] px-3 py-2.5" style={{ background: isDark ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.07)', border: isDark ? '1px solid rgba(201,168,76,0.18)' : '1px solid rgba(201,168,76,0.18)' }}>
            <div className="flex items-center gap-1.5 mb-0.5" style={{ color: t.gold }}>{s.icon}<span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.65rem', color: t.textMuted }}>{s.label}</span></div>
            <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.1rem', color: t.text1 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 px-4 pb-3">
        <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 rounded-[12px] py-2 text-[0.75rem] font-semibold"
          style={{ fontFamily: 'Cairo, sans-serif', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', color: t.text2 }}>
          <Pencil size={13} /> تعديل
        </button>
        <button onClick={() => setShowPw(true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-[12px] py-2 text-[0.75rem] font-semibold"
          style={{ fontFamily: 'Cairo, sans-serif', background: isDark ? 'rgba(201,168,76,0.12)' : 'rgba(201,168,76,0.10)', color: t.gold }}>
          <KeyRound size={13} /> إعادة كلمة المرور
        </button>
        <button onClick={onDelete} className="flex items-center justify-center rounded-[12px] px-3 py-2"
          style={{ background: 'rgba(224,82,82,0.10)', color: '#e05252' }}>
          <Trash2 size={14} />
        </button>
      </div>

      {/* Recent transactions */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 pb-4 space-y-2">
        <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.67rem', fontWeight: 700, color: t.textMuted, letterSpacing: '0.06em', paddingBottom: 6 }}>
          آخر المعاملات
        </p>
        {myTxns.length === 0 && (
          <p className="text-center py-8" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem', color: t.textFaint }}>لا توجد معاملات</p>
        )}
        {myTxns.slice(0, 12).map(tx => (
          <div key={tx.id} className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5"
            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.80)' }}>
            <span style={{ color: tx.transaction_type === 'rental' ? '#c9a84c' : '#6aad6a' }}>
              {tx.transaction_type === 'rental' ? <RotateCcw size={13} /> : <ShoppingBag size={13} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="truncate" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.77rem', fontWeight: 600, color: t.text1 }}>{tx.customer_name ?? '—'}</p>
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.65rem', color: t.textMuted }}>{tx.dress_code ?? '—'} · {formatDate(tx.created_at)}</p>
            </div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.82rem', fontWeight: 700, color: t.gold }}>${tx.price.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} userId={emp.id} isOwnerReset />}
    </motion.div>
  );
}

// ─── OWNER VIEW ───────────────────────────────────────────────────────────────
function OwnerView() {
  const { theme, addToast, language } = useUIStore();
  const isDark = theme === 'dark';
  const t = tok(isDark);
  const { user: me } = useAuthStore();

  const [users, setUsers]       = useState<User[]>([]);
  const [txns, setTxns]         = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle]           = useState('');
  const [annBody, setAnnBody]             = useState('');
  const [annLoading, setAnnLoading]       = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    api.auth.getUsers().then(setUsers).catch(console.error);
    api.transactions.getAll().then(setTxns).catch(console.error);
    api.reminders.getAll().then(setReminders).catch(console.error);
    api.announcements.getAll().then(setAnnouncements).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const employees = users.filter(u => u.id !== me?.id);
  const active = employees.filter(u => u.active).length;

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim()) return;
    setAnnLoading(true);
    try {
      const created = await api.announcements.create(annTitle.trim(), annBody.trim() || undefined);
      setAnnouncements(prev => [created, ...prev]);
      setAnnTitle('');
      setAnnBody('');
      addToast('success', 'تم نشر الإعلان');
    } catch (e) { addToast('error', String(e)); }
    finally { setAnnLoading(false); }
  };

  const deleteAnnouncement = async (id: string) => {
    try {
      await api.announcements.delete(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      addToast('success', 'تم حذف الإعلان');
    } catch (e) { addToast('error', String(e)); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try { await api.auth.deleteUser(deleting.id); load(); setDeleting(null); if (selected?.id === deleting.id) setSelected(null); addToast('success', 'تم الحذف'); }
    catch (e) { addToast('error', String(e)); }
    finally { setDeleteLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, type: 'spring', stiffness: 440, damping: 38 }}
        className="flex items-center justify-between rounded-[24px] px-5 py-4" style={glass(isDark)}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: t.gold }}>
            <Users size={18} />
          </div>
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: t.text1 }}>الموظفون</h1>
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.70rem', color: t.textMuted }}>{active} نشط · {employees.length} إجمالاً</p>
          </div>
        </div>
        <Button variant="gold" icon={<Plus size={14} />} onClick={() => { setEditing(null); setShowForm(true); }}>إضافة موظف</Button>
      </motion.div>

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[1fr_320px]' : ''}`}>

        {/* Employee cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 auto-rows-max">
          {employees.map((emp, i) => {
            const myTxns = txns.filter(tx => tx.employee_id === emp.id);
            const revenue = myTxns.reduce((s, tx) => s + tx.price, 0);
            const rc = ROLE_COLOR[emp.role] ?? ROLE_COLOR.employee;
            const isSelected = selected?.id === emp.id;
            return (
              <motion.div key={emp.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                onClick={() => setSelected(isSelected ? null : emp)}
                className="rounded-[20px] p-4 cursor-pointer"
                style={glass(isDark, { border: isSelected ? `1px solid ${isDark ? 'rgba(201,168,76,0.45)' : 'rgba(201,168,76,0.35)'}` : undefined })}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={emp.name} size={44} />
                    <div>
                      <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: t.text1 }}>{emp.name}</p>
                      <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.68rem', color: t.textMuted }}>@{emp.username}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[0.65rem] font-semibold"
                    style={{ fontFamily: 'Cairo, sans-serif', background: rc.bg, color: rc.text }}>
                    {ROLE_MAP[emp.role]}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.06)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.70rem', color: t.textMuted }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: t.gold, marginLeft: 3 }}>{myTxns.length}</span>
                      معاملة
                    </span>
                    <span style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.70rem', color: t.textMuted }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: t.text2, marginLeft: 3 }}>${revenue.toFixed(0)}</span>
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[0.60rem] font-semibold ${emp.active ? 'text-emerald-300' : 'text-white/30'}`}
                    style={{ background: emp.active ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)', border: emp.active ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(255,255,255,0.10)', fontFamily: 'Cairo, sans-serif' }}>
                    {emp.active ? 'نشط' : 'غير نشط'}
                  </span>
                </div>
              </motion.div>
            );
          })}

          {employees.length === 0 && (
            <div className="col-span-3 flex flex-col items-center py-16 gap-3" style={{ color: t.textFaint }}>
              <Users size={40} className="opacity-30" />
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem' }}>لا يوجد موظفون بعد</p>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <EmployeeDetail
              emp={selected} txns={txns} reminders={reminders} isDark={isDark}
              onClose={() => setSelected(null)}
              onEdit={() => { setEditing(selected); setShowForm(true); }}
              onDelete={() => setDeleting(selected)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Announcements panel */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.10, type: 'spring', stiffness: 440, damping: 38 }}
        className="rounded-[24px] p-5"
        style={glass(isDark)}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <span style={{ color: t.gold }}><Megaphone size={17} /></span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: t.text1 }}>
            إعلانات الموظفين
          </h2>
        </div>

        {/* Create form */}
        <form onSubmit={createAnnouncement} className="space-y-2 mb-4">
          <input
            value={annTitle}
            onChange={e => setAnnTitle(e.target.value)}
            placeholder="عنوان الإعلان..."
            required
            className="w-full rounded-[12px] px-3 py-2 text-sm outline-none"
            style={{
              fontFamily: 'Cairo, sans-serif',
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
              color: t.text1,
            }}
          />
          <textarea
            value={annBody}
            onChange={e => setAnnBody(e.target.value)}
            placeholder="تفاصيل إضافية (اختياري)..."
            rows={2}
            className="w-full rounded-[12px] px-3 py-2 text-sm outline-none resize-none"
            style={{
              fontFamily: 'Cairo, sans-serif',
              background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)',
              border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.08)',
              color: t.text1,
            }}
          />
          <button
            type="submit"
            disabled={annLoading || !annTitle.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-[12px] text-sm font-semibold disabled:opacity-40"
            style={{
              fontFamily: 'Cairo, sans-serif',
              background: 'rgba(201,168,76,0.18)',
              color: t.gold,
              border: '1px solid rgba(201,168,76,0.30)',
            }}
          >
            <Send size={13} />
            {annLoading ? 'جاري النشر...' : 'نشر الإعلان'}
          </button>
        </form>

        {/* Existing announcements */}
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {announcements.length === 0 && (
              <p className="text-center py-4" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem', color: t.textFaint }}>
                لا توجد إعلانات منشورة
              </p>
            )}
            {announcements.map(ann => (
              <motion.div
                key={ann.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 16 }}
                className="flex items-start gap-3 rounded-[14px] px-4 py-3"
                style={{
                  background: isDark ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.05)',
                  border: isDark ? '1px solid rgba(201,168,76,0.18)' : '1px solid rgba(201,168,76,0.15)',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: t.text1 }}>{ann.title}</p>
                  {ann.body && <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.76rem', color: t.text2, marginTop: 2 }}>{ann.body}</p>}
                  <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.62rem', color: t.textFaint, marginTop: 4 }}>{formatDate(ann.created_at, language)}</p>
                </div>
                <button
                  onClick={() => deleteAnnouncement(ann.id)}
                  className="flex-shrink-0 mt-0.5"
                  style={{ color: '#e05252', opacity: 0.7 }}
                >
                  <Trash2 size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {showForm && (
        <UserForm user={editing} onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={u => { load(); setShowForm(false); setEditing(null); if (selected?.id === u.id) setSelected(u); }} />
      )}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={handleDelete}
        loading={deleteLoading} title="حذف الموظف" message={`حذف ${deleting?.name}؟ لا يمكن التراجع.`}
        danger confirmLabel="حذف" />
    </motion.div>
  );
}

// ─── EMPLOYEE / CASHIER VIEW ─────────────────────────────────────────────────
function EmployeeView() {
  const { theme, addToast } = useUIStore();
  const isDark = theme === 'dark';
  const t = tok(isDark);
  const { user: me } = useAuthStore();
  const { language } = useUIStore();

  const [txns, setTxns]         = useState<Transaction[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    api.transactions.getAll().then(d => setTxns(d.filter(tx => tx.employee_id === me?.id))).catch(console.error);
    api.reminders.getAll().then(setReminders).catch(console.error);
  }, [me?.id]);

  const pending = reminders.filter(r => r.status === 'pending');
  const overdueCount = pending.filter(r => isOverdue(r.date)).length;
  const revenue = txns.reduce((s, tx) => s + tx.price, 0);
  const rc = ROLE_COLOR[me?.role ?? 'employee'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">

      {/* Profile card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, type: 'spring', stiffness: 440, damping: 38 }}
        className="rounded-[24px] px-5 py-5 flex items-center justify-between gap-4" style={glass(isDark)}>
        <div className="flex items-center gap-4">
          <Avatar name={me?.name ?? ''} size={56} />
          <div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.25rem', fontWeight: 700, color: t.text1 }}>{me?.name}</h1>
            <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.72rem', color: t.textMuted }}>@{me?.username}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[0.65rem] font-semibold"
              style={{ fontFamily: 'Cairo, sans-serif', background: rc.bg, color: rc.text }}>
              {ROLE_MAP[me?.role ?? 'employee']}
            </span>
          </div>
        </div>
        <Button variant="ghost" icon={<KeyRound size={14} />} onClick={() => setShowPw(true)}>تغيير كلمة المرور</Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<ShoppingBag size={16} />} label="معاملاتي" value={txns.length} isDark={isDark} />
        <StatCard icon={<TrendingUp size={16} />} label="إجمالي الإيرادات" value={`$${revenue.toFixed(0)}`} isDark={isDark} />
        <StatCard icon={<Clock size={16} />} label="التذكيرات المعلقة" value={pending.length} isDark={isDark} />
        {overdueCount > 0 && <StatCard icon={<AlertTriangle size={16} />} label="متأخر" value={overdueCount} isDark={isDark} />}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_300px]">

        {/* Transactions */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-4" style={glass(isDark)}>
          <p className="mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: t.text1 }}>معاملاتي</p>
          {txns.length === 0 ? (
            <div className="flex flex-col items-center py-12 gap-2" style={{ color: t.textFaint }}>
              <ShoppingBag size={32} className="opacity-30" />
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem' }}>لا توجد معاملات مسجلة باسمك</p>
            </div>
          ) : (
            <div className="space-y-2">
              {txns.map(tx => (
                <motion.div key={tx.id} whileHover={{ x: 2 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="flex items-center gap-3 rounded-[14px] px-4 py-3"
                  style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(255,255,255,0.80)' }}>
                  <span style={{ color: tx.transaction_type === 'rental' ? '#c9a84c' : '#6aad6a' }}>
                    {tx.transaction_type === 'rental' ? <RotateCcw size={15} /> : <ShoppingBag size={15} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.82rem', fontWeight: 600, color: t.text1 }}>{tx.customer_name ?? '—'}</p>
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.67rem', color: t.textMuted }}>
                      {tx.dress_code ?? '—'} · {tx.transaction_type === 'rental' ? 'إيجار' : 'بيع'} · {formatDate(tx.created_at, language)}
                    </p>
                  </div>
                  <div className="text-end">
                    <p style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.90rem', color: t.gold }}>${tx.price.toFixed(0)}</p>
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.62rem', color: tx.status === 'active' ? '#60a4dc' : tx.status === 'completed' ? '#6aad6a' : t.textFaint }}>
                      {tx.status === 'active' ? 'نشط' : tx.status === 'completed' ? 'مكتمل' : 'ملغي'}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Reminders */}
        <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.14, type: 'spring', stiffness: 440, damping: 38 }}
          className="rounded-[24px] p-4" style={glass(isDark)}>
          <p className="mb-3" style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '0.95rem', color: t.text1 }}>التذكيرات</p>
          {pending.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2" style={{ color: t.textFaint }}>
              <CheckCircle size={28} className="opacity-30" />
              <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.75rem' }}>لا توجد تذكيرات معلقة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pending.map(r => {
                const overdue = isOverdue(r.date);
                return (
                  <div key={r.id} className="rounded-[13px] px-3 py-2.5"
                    style={{ background: overdue ? (isDark ? 'rgba(224,82,82,0.08)' : 'rgba(224,82,82,0.05)') : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.55)'), border: `1px solid ${overdue ? 'rgba(224,82,82,0.20)' : isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.80)'}` }}>
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.78rem', fontWeight: 600, color: t.text1 }}>{r.title}</p>
                    <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.65rem', color: overdue ? '#e05252' : t.textMuted, marginTop: 2 }}>
                      {formatDate(r.date, language)} {overdue && '· متأخر'}
                    </p>
                    {r.customer_name && <p style={{ fontFamily: 'Cairo, sans-serif', fontSize: '0.65rem', color: t.textMuted }}>{r.customer_name}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {showPw && <ChangePasswordModal onClose={() => setShowPw(false)} userId={me?.id ?? ''} />}
    </motion.div>
  );
}

// ─── Entry point ──────────────────────────────────────────────────────────────
export function EmployeesPage() {
  const { isOwner } = usePermissions();
  return isOwner ? <OwnerView /> : <EmployeeView />;
}
