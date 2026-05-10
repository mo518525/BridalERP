import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon, Users, Moon, Sun, Globe, Plus, Pencil, Trash2,
  Shield, DollarSign, FlaskConical, Loader2, Database, Key, Store,
  CheckCircle, AlertTriangle, Download, ImageIcon, Timer,
} from 'lucide-react';
import type { Currency } from '../../store/uiStore';
import { api } from '../../lib/api';
import { seedDatabase } from '../../utils/seedDatabase';
import { useUIStore } from '../../store/uiStore';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/Button';
import { Input, Select } from '../../components/Input';
import { Modal, ConfirmDialog } from '../../components/Modal';
import type { User } from '../../types';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'مالك' }, { value: 'employee', label: 'موظف' }, { value: 'cashier', label: 'كاشير' },
];
const ROLE_MAP: Record<string, string> = { owner: 'مالك', employee: 'موظف', cashier: 'كاشير' };

function GlassSection({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border border-white/[0.13] p-5"
      style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(16px) saturate(148%)',
        WebkitBackdropFilter: 'blur(16px) saturate(148%)',
        boxShadow: '0 18px 38px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)',
      }}
    >
      {children}
    </div>
  );
}

export function Settings() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme, language, setLanguage, addToast, defaultCurrency, setDefaultCurrency, autoLogoutMinutes, setAutoLogoutMinutes } = useUIStore();
  const { canViewSettings, canViewUsers } = usePermissions();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (canViewUsers) api.auth.getUsers().then(setUsers).catch(console.error);
  }, [canViewUsers]);

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await api.auth.deleteUser(deletingUser.id);
      setUsers((u) => u.filter((x) => x.id !== deletingUser.id));
      addToast('success', t('messages.deleted'));
      setDeletingUser(null);
    } catch (e) { addToast('error', String(e)); }
    finally { setDeleteLoading(false); }
  };

  const toggleLang = () => {
    const next = language === 'ar' ? 'de' : 'ar';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  if (!canViewSettings) return (
    <div className="flex flex-col items-center justify-center h-64 text-white/30">
      <Shield size={48} className="mb-3 opacity-30" />
      <p>{t('noPermission')}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        className="text-2xl font-bold text-white/90"
      >
        {t('settings.title')}
      </motion.h1>

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 40 }}>
        <GlassSection>
          <h2 className="font-semibold text-white/80 mb-4 flex items-center gap-2">
            <SettingsIcon size={17} className="text-gold-400" /> المظهر واللغة
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-white/50 mb-2">{t('settings.theme')}</p>
              <div className="flex gap-2">
                {([['light', <Sun size={15} />, t('settings.light')], ['dark', <Moon size={15} />, t('settings.dark')]] as [string, React.ReactNode, string][]).map(([val, icon, lbl]) => (
                  <motion.button
                    key={val}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setTheme(val as 'light' | 'dark')}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                    style={theme === val
                      ? { background: 'linear-gradient(135deg, #c9a84c, #a8732e)', border: '1px solid rgba(201,168,76,0.3)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)' }}
                  >
                    {icon} {lbl}
                  </motion.button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-white/50 mb-2">{t('settings.language')}</p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={toggleLang}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-white/12 text-white/60 hover:text-white/85 hover:border-gold-400/30 transition-colors"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <Globe size={15} />
                {language === 'ar' ? 'Deutsch' : 'العربية'}
              </motion.button>
            </div>
          </div>
        </GlassSection>
      </motion.div>

      {/* Currency + Auto-logout */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, type: 'spring', stiffness: 400, damping: 40 }}>
        <GlassSection>
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Default currency */}
            <div>
              <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2 text-sm">
                <DollarSign size={15} className="text-gold-400" /> الوحدة الافتراضية للعرض
              </h2>
              <p className="text-xs text-white/40 mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
                العملة التي تظهر في لوحة التحكم والإحصاءات.
              </p>
              <div className="flex gap-2">
                {(['USD', 'SYP', 'TRY'] as Currency[]).map(c => {
                  const labels: Record<Currency, string> = { USD: '$ دولار', SYP: 'ل.س', TRY: '₺ ليرة' };
                  return (
                    <motion.button key={c} whileTap={{ scale: 0.96 }}
                      onClick={() => setDefaultCurrency(c)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold transition-all border"
                      style={defaultCurrency === c
                        ? { background: 'linear-gradient(135deg, #c9a84c, #a8732e)', border: '1px solid rgba(201,168,76,0.3)', color: '#fff', fontFamily: 'Cairo, sans-serif' }
                        : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo, sans-serif' }}>
                      {labels[c]}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Auto logout */}
            <div>
              <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2 text-sm">
                <Timer size={15} className="text-gold-400" /> تسجيل الخروج التلقائي
              </h2>
              <p className="text-xs text-white/40 mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
                تسجيل الخروج تلقائياً عند عدم النشاط. 0 = معطل.
              </p>
              <div className="flex gap-2 flex-wrap">
                {[0, 5, 10, 15, 30, 60].map(m => (
                  <motion.button key={m} whileTap={{ scale: 0.96 }}
                    onClick={() => setAutoLogoutMinutes(m)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border"
                    style={autoLogoutMinutes === m
                      ? { background: 'linear-gradient(135deg, #c9a84c, #a8732e)', border: '1px solid rgba(201,168,76,0.3)', color: '#fff', fontFamily: 'Cairo, sans-serif' }
                      : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.55)', fontFamily: 'Cairo, sans-serif' }}>
                    {m === 0 ? 'معطل' : `${m} د`}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </GlassSection>
      </motion.div>

      {/* Shop Logo */}
      <ShopLogoSection />

      {/* Shop info */}
      <ShopInfoSection />

      {/* Backup */}
      <BackupSection />

      {/* License */}
      <LicenseSection />


      {/* Exchange rates */}
      <ExchangeRatesSection />

      {/* Users */}
      {canViewUsers && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10, type: 'spring', stiffness: 400, damping: 40 }}>
          <GlassSection>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white/80 flex items-center gap-2">
                <Users size={17} className="text-gold-400" /> {t('settings.users')}
              </h2>
              <Button variant="gold" size="sm" icon={<Plus size={14} />} onClick={() => { setEditingUser(null); setShowUserForm(true); }}>
                {t('settings.addUser')}
              </Button>
            </div>
            <div className="space-y-2">
              {users.map((u) => (
                <motion.div
                  key={u.id}
                  whileHover={{ x: 3 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-white/8"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-gold-300 text-sm flex-shrink-0"
                    style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.25)' }}>
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white/85">{u.name}</p>
                    <p className="text-xs text-white/35">@{u.username} · {ROLE_MAP[u.role] || u.role}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${u.active ? 'text-emerald-300 border-emerald-400/25' : 'text-white/30 border-white/12'}`}
                      style={{ background: u.active ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.05)' }}>
                      {u.active ? 'نشط' : 'غير نشط'}
                    </span>
                    {u.id !== currentUser?.id && (
                      <>
                        <button onClick={() => { setEditingUser(u); setShowUserForm(true); }}
                          className="p-1.5 rounded-lg text-white/35 hover:text-white/70 hover:bg-white/8 transition-colors">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeletingUser(u)}
                          className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassSection>
        </motion.div>
      )}

      {showUserForm && (
        <UserForm user={editingUser} onClose={() => { setShowUserForm(false); setEditingUser(null); }}
          onSaved={(u) => {
            if (editingUser) setUsers((prev) => prev.map((x) => x.id === u.id ? u : x));
            else setUsers((prev) => [...prev, u]);
            setShowUserForm(false); setEditingUser(null);
          }} />
      )}
      <ConfirmDialog open={!!deletingUser} onClose={() => setDeletingUser(null)} onConfirm={handleDeleteUser}
        loading={deleteLoading} title="حذف المستخدم" message={`حذف ${deletingUser?.name}؟`}
        danger confirmLabel={t('actions.delete')} />
    </div>
  );
}

function ShopLogoSection() {
  const { addToast, setShopLogo: setStoreLogo } = useUIStore();
  const [logo, setLogo]       = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    api.settings.get('shop_logo').then(v => { if (v) setLogo(v); }).catch(console.error);
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { addToast('error', 'الصورة كبيرة جداً (الحد 500KB)'); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLogo(dataUrl);
      setSaving(true);
      try {
        await api.settings.set('shop_logo', dataUrl);
        setStoreLogo(dataUrl);
        addToast('success', 'تم حفظ الشعار ✓');
      } catch (err) { addToast('error', String(err)); }
      finally { setSaving(false); }
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = async () => {
    setSaving(true);
    try {
      await api.settings.set('shop_logo', '');
      setLogo(null);
      setStoreLogo('');
      addToast('success', 'تم حذف الشعار');
    } catch (err) { addToast('error', String(err)); }
    finally { setSaving(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.035, type: 'spring', stiffness: 400, damping: 40 }}>
      <GlassSection>
        <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2">
          <ImageIcon size={17} className="text-gold-400" /> شعار المحل
        </h2>
        <p className="text-xs text-white/40 mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
          يظهر في شاشة تسجيل الدخول والفواتير. PNG أو JPG، بحد أقصى 500KB.
        </p>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            {logo ? (
              <img src={logo} alt="logo" className="w-full h-full object-contain" />
            ) : (
              <ImageIcon size={24} style={{ color: 'rgba(255,255,255,0.25)' }} />
            )}
          </div>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer"
              style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c', border: '1px solid rgba(201,168,76,0.30)', fontFamily: 'Cairo, sans-serif' }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              {logo ? 'تغيير الشعار' : 'رفع شعار'}
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
            {logo && (
              <button onClick={removeLogo} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.10)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', fontFamily: 'Cairo, sans-serif' }}>
                <Trash2 size={14} /> حذف
              </button>
            )}
          </div>
        </div>
      </GlassSection>
    </motion.div>
  );
}

function ShopInfoSection() {
  const { addToast, setShopName: setStoreName } = useUIStore();
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [city, setCity]       = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    Promise.all([
      api.settings.get('shop_name'),
      api.settings.get('shop_phone'),
      api.settings.get('shop_city'),
      api.settings.get('shop_address'),
    ]).then(([n, p, c, a]) => {
      if (n) setName(n);
      if (p) setPhone(p);
      if (c) setCity(c);
      if (a) setAddress(a);
    }).catch(console.error);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        api.settings.set('shop_name',    name.trim()),
        api.settings.set('shop_phone',   phone.trim()),
        api.settings.set('shop_city',    city.trim()),
        api.settings.set('shop_address', address.trim()),
      ]);
      setStoreName(name.trim());
      addToast('success', 'تم حفظ معلومات المحل ✓');
    } catch (e) { addToast('error', String(e)); }
    finally { setSaving(false); }
  };

  const inputCls: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    height: 40,
    padding: '0 12px',
    colorScheme: 'dark',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03, type: 'spring', stiffness: 400, damping: 40 }}>
      <GlassSection>
        <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2">
          <Store size={17} className="text-gold-400" /> معلومات المحل
        </h2>
        <p className="text-xs text-white/40 mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
          الاسم والعنوان والهاتف — تظهر على الفواتير والتقارير المطبوعة.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          {[
            { label: 'اسم المحل',    value: name,    set: setName },
            { label: 'رقم الهاتف',   value: phone,   set: setPhone },
            { label: 'المدينة',      value: city,    set: setCity },
            { label: 'العنوان',      value: address, set: setAddress },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-xs text-white/45 mb-1.5" style={{ fontFamily: 'Cairo, sans-serif' }}>{label}</label>
              <input value={value} onChange={e => set(e.target.value)} style={inputCls} />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <motion.button whileTap={{ scale: 0.97 }} onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #a8732e)', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Store size={14} />}
            حفظ معلومات المحل
          </motion.button>
        </div>
      </GlassSection>
    </motion.div>
  );
}

function BackupSection() {
  const { addToast } = useUIStore();
  const [loading, setLoading]       = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [savedPath, setSavedPath]   = useState('');

  useEffect(() => {
    api.settings.get('last_backup_date').then(v => setLastBackup(v ?? null)).catch(console.error);
  }, []);

  const daysSinceBackup = (() => {
    if (!lastBackup) return null;
    const diff = Date.now() - new Date(lastBackup).getTime();
    return Math.floor(diff / 86_400_000);
  })();

  const needsBackup = daysSinceBackup === null || daysSinceBackup >= 90;

  const doBackup = async () => {
    setLoading(true);
    setSavedPath('');
    try {
      const path = await api.settings.backup();
      setSavedPath(path);
      setLastBackup(new Date().toISOString().slice(0, 10));
      addToast('success', 'تم حفظ النسخة الاحتياطية بنجاح');
    } catch (e) { addToast('error', String(e)); }
    finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, type: 'spring', stiffness: 400, damping: 40 }}>
      <GlassSection>
        <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2">
          <Database size={17} className="text-gold-400" /> النسخ الاحتياطي
        </h2>
        <p className="text-xs text-white/40 mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
          يُنصح بعمل نسخة احتياطية من قاعدة البيانات كل 3 أشهر على الأقل. يتم الحفظ في مجلد التنزيلات.
        </p>

        {needsBackup && (
          <div className="flex items-start gap-3 p-3 rounded-xl mb-4"
            style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)' }}>
            <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300" style={{ fontFamily: 'Cairo, sans-serif' }}>
              {lastBackup === null
                ? 'لم يتم عمل أي نسخة احتياطية من قبل. قم بالنسخ الاحتياطي الآن لحماية بياناتك.'
                : `آخر نسخة احتياطية كانت منذ ${daysSinceBackup} يوم — حان وقت النسخ الاحتياطي.`}
            </p>
          </div>
        )}

        {!needsBackup && lastBackup && (
          <div className="flex items-center gap-2 mb-4 text-xs text-emerald-400" style={{ fontFamily: 'Cairo, sans-serif' }}>
            <CheckCircle size={14} />
            آخر نسخة احتياطية: {lastBackup} (منذ {daysSinceBackup} يوم)
          </div>
        )}

        {savedPath && (
          <p className="text-xs mb-3 text-emerald-400 break-all" style={{ fontFamily: 'Cairo, sans-serif' }}>
            ✓ تم الحفظ في: {savedPath}
          </p>
        )}

        <motion.button whileTap={{ scale: 0.97 }} onClick={doBackup} disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: needsBackup ? 'rgba(248,113,113,0.15)' : 'rgba(201,168,76,0.15)', color: needsBackup ? '#f87171' : '#c9a84c', border: `1px solid ${needsBackup ? 'rgba(248,113,113,0.30)' : 'rgba(201,168,76,0.30)'}`, fontFamily: 'Cairo, sans-serif' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {loading ? 'جارٍ الحفظ...' : 'نسخ احتياطي الآن'}
        </motion.button>
      </GlassSection>
    </motion.div>
  );
}

function LicenseSection() {
  const { addToast } = useUIStore();
  const [currentKey, setCurrentKey]   = useState('');
  const [status, setStatus]           = useState<string | null>(null);
  const [inputKey, setInputKey]       = useState('');
  const [activating, setActivating]   = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    Promise.all([
      api.settings.get('license_key'),
      api.settings.get('license_status'),
    ]).then(([k, s]) => {
      if (k) setCurrentKey(k);
      if (s) setStatus(s);
    }).catch(console.error);
  }, []);

  const activate = async () => {
    if (!inputKey.trim()) return;
    setActivating(true);
    setError('');
    try {
      await api.settings.activateLicense(inputKey.trim());
      const k = inputKey.trim().toUpperCase();
      setCurrentKey(k);
      setStatus('active');
      setInputKey('');
      addToast('success', 'تم تفعيل الترخيص بنجاح');
    } catch (e) { setError(String(e)); }
    finally { setActivating(false); }
  };

  const isActive = status === 'active';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, type: 'spring', stiffness: 400, damping: 40 }}>
      <GlassSection>
        <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2">
          <Key size={17} className="text-gold-400" /> ترخيص البرنامج
        </h2>
        <p className="text-xs text-white/40 mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
          أدخل مفتاح الترخيص الخاص بك لتفعيل البرنامج. الصيغة: BRIDAL-XXXX-XXXX-XXXX
        </p>

        {currentKey && (
          <div className="flex items-center gap-3 p-3 rounded-xl mb-4"
            style={{ background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isActive ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.10)'}` }}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400' : 'bg-white/20'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-white/70 truncate">{currentKey}</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)', color: isActive ? '#34d399' : 'rgba(255,255,255,0.35)', fontFamily: 'Cairo, sans-serif' }}>
              {isActive ? 'نشط' : 'غير نشط'}
            </span>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400 mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>{error}</p>
        )}

        <div className="flex gap-2">
          <input
            value={inputKey}
            onChange={e => { setInputKey(e.target.value); setError(''); }}
            onKeyDown={e => e.key === 'Enter' && activate()}
            placeholder="BRIDAL-XXXX-XXXX-XXXX"
            className="flex-1 h-10 px-3 rounded-xl font-mono text-sm"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.88)', outline: 'none', colorScheme: 'dark' }}
          />
          <motion.button whileTap={{ scale: 0.97 }} onClick={activate} disabled={activating || !inputKey.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #a8732e)', color: '#fff', fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap' }}>
            {activating ? <Loader2 size={13} className="animate-spin" /> : <Key size={13} />}
            تفعيل
          </motion.button>
        </div>
      </GlassSection>
    </motion.div>
  );
}

function SeedSection() {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(false);

  const run = async () => {
    setLoading(true);
    setDone(false);
    setProgress('');
    try {
      await seedDatabase((msg) => setProgress(msg));
      setDone(true);
      addToast('success', 'تمت تعبئة البيانات التجريبية بنجاح');
    } catch (e) {
      addToast('error', String(e));
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, type: 'spring', stiffness: 400, damping: 40 }}>
      <GlassSection>
        <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2">
          <FlaskConical size={17} className="text-gold-400" /> بيانات تجريبية
        </h2>
        <p className="text-xs text-white/40 mb-4" style={{ fontFamily: 'Cairo, sans-serif' }}>
          تعبئة قاعدة البيانات بعملاء، فساتين، مبيعات، إيجارات، مصروفات وتذكيرات وهمية للاختبار.
        </p>
        {progress && (
          <p className="text-xs mb-3 flex items-center gap-2" style={{ color: done ? '#4ade80' : 'rgba(201,168,76,0.80)', fontFamily: 'Cairo, sans-serif' }}>
            {loading && <Loader2 size={12} className="animate-spin" />}
            {progress}
          </p>
        )}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={run}
          disabled={loading || done}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-50"
          style={{ background: done ? 'rgba(74,222,128,0.15)' : 'rgba(201,168,76,0.15)', color: done ? '#4ade80' : '#c9a84c', border: `1px solid ${done ? 'rgba(74,222,128,0.30)' : 'rgba(201,168,76,0.30)'}`, fontFamily: 'Cairo, sans-serif' }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <FlaskConical size={14} />}
          {done ? 'تمت التعبئة ✓' : loading ? 'جارٍ التعبئة...' : 'تعبئة بيانات تجريبية'}
        </motion.button>
      </GlassSection>
    </motion.div>
  );
}

function ExchangeRatesSection() {
  const { exchangeRates, setExchangeRates, addToast } = useUIStore();
  const [usdToSyp, setUsdToSyp] = useState(String(exchangeRates.usd_to_syp));
  const [usdToTry, setUsdToTry] = useState(String(exchangeRates.usd_to_try));
  const [tryToSyp, setTryToSyp] = useState(String(exchangeRates.try_to_syp));

  // Calculator state
  const [calcAmount, setCalcAmount] = useState('100');
  const [calcFrom, setCalcFrom]     = useState<'usd' | 'syp' | 'try'>('usd');

  const save = () => {
    const syp = parseFloat(usdToSyp);
    const tryRate = parseFloat(usdToTry);
    const trySyp = parseFloat(tryToSyp);
    if ([syp, tryRate, trySyp].some((n) => isNaN(n) || n <= 0)) {
      addToast('error', 'أدخل أرقاماً صحيحة');
      return;
    }
    setExchangeRates({ usd_to_syp: syp, usd_to_try: tryRate, try_to_syp: trySyp });
    addToast('success', 'تم حفظ أسعار الصرف');
  };

  // Live conversion
  const rates = {
    usd_to_syp: parseFloat(usdToSyp) || exchangeRates.usd_to_syp,
    usd_to_try: parseFloat(usdToTry) || exchangeRates.usd_to_try,
    try_to_syp: parseFloat(tryToSyp) || exchangeRates.try_to_syp,
  };

  const amount = parseFloat(calcAmount) || 0;
  let usd = 0, syp = 0, tryL = 0;
  if (calcFrom === 'usd')  { usd = amount; syp = amount * rates.usd_to_syp; tryL = amount * rates.usd_to_try; }
  if (calcFrom === 'syp')  { syp = amount; usd = amount / rates.usd_to_syp; tryL = usd * rates.usd_to_try; }
  if (calcFrom === 'try')  { tryL = amount; usd = amount / rates.usd_to_try; syp = amount * rates.try_to_syp; }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(n);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 12,
    color: 'rgba(255,255,255,0.88)',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.875rem',
    colorScheme: 'dark',
    outline: 'none',
  };

  const rateRows = [
    { label: '1 دولار ($) = __ ليرة سورية', value: usdToSyp, set: setUsdToSyp, suffix: 'ل.س' },
    { label: '1 دولار ($) = __ ليرة تركية', value: usdToTry, set: setUsdToTry, suffix: '₺'   },
    { label: '1 ليرة تركية (₺) = __ ليرة سورية', value: tryToSyp, set: setTryToSyp, suffix: 'ل.س' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, type: 'spring', stiffness: 400, damping: 40 }}>
      <GlassSection>
        <h2 className="font-semibold text-white/80 mb-1 flex items-center gap-2">
          <DollarSign size={17} className="text-gold-400" /> أسعار الصرف والعملات
        </h2>
        <p className="text-xs text-white/40 mb-5" style={{ fontFamily: 'Cairo, sans-serif' }}>
          العملة الرئيسية للنظام هي الدولار الأمريكي ($). أدخل أسعار الصرف للتحويل.
        </p>

        {/* Rate inputs */}
        <div className="grid sm:grid-cols-3 gap-4 mb-5">
          {rateRows.map(({ label, value, set, suffix }) => (
            <div key={suffix + label} className="flex flex-col gap-1.5">
              <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'Cairo, sans-serif', fontWeight: 500 }}>
                {label}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number" min="0.01" step="any"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className="flex-1 h-10 px-3"
                  style={inputStyle}
                />
                <span style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'Cairo, sans-serif', fontSize: '0.8rem', minWidth: 28 }}>{suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mb-6">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={save}
            className="px-5 py-2 rounded-xl text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #c9a84c, #a8732e)', color: '#fff', fontFamily: 'Cairo, sans-serif' }}
          >
            حفظ أسعار الصرف
          </motion.button>
        </div>

        {/* Currency calculator */}
        <div className="rounded-2xl p-4"
          style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)' }}>
          <p className="text-xs font-bold text-gold-400/80 mb-3" style={{ fontFamily: 'Cairo, sans-serif' }}>
            🧮 حاسبة العملات — مباشر
          </p>
          {/* Input row */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number" min="0" step="any"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              className="flex-1 h-11 px-3 text-lg font-bold rounded-xl"
              style={{ ...inputStyle, fontSize: '1.1rem', background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(212,175,55,0.25)' }}
              placeholder="أدخل المبلغ"
            />
            <div className="flex rounded-xl overflow-hidden border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {(['usd', 'syp', 'try'] as const).map((cur) => {
                const labels = { usd: '$ دولار', syp: 'ل.س', try: '₺ ليرة' };
                return (
                  <button
                    key={cur}
                    type="button"
                    onClick={() => setCalcFrom(cur)}
                    className="px-3 py-2 text-xs font-semibold transition-all"
                    style={{
                      fontFamily: 'Cairo, sans-serif',
                      background: calcFrom === cur ? 'rgba(212,175,55,0.20)' : 'transparent',
                      color: calcFrom === cur ? '#d4af37' : 'rgba(255,255,255,0.40)',
                      borderLeft: cur !== 'usd' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    }}
                  >
                    {labels[cur]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results */}
          <div className="space-y-2">
            {[
              { label: 'دولار أمريكي', symbol: '$',   value: usd,  active: calcFrom === 'usd', color: '#60a5fa' },
              { label: 'ليرة سورية',   symbol: 'ل.س', value: syp,  active: calcFrom === 'syp', color: '#4ade80' },
              { label: 'ليرة تركية',   symbol: '₺',   value: tryL, active: calcFrom === 'try', color: '#f59e0b' },
            ].map(({ label, symbol, value: val, active, color }) => (
              <div key={symbol}
                className="flex items-center justify-between px-4 py-2.5 rounded-xl transition-all"
                style={{
                  background: active ? `${color}18` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? color + '35' : 'rgba(255,255,255,0.06)'}`,
                }}>
                <span className="text-xs text-white/45" style={{ fontFamily: 'Cairo, sans-serif' }}>{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold" style={{ color: active ? color : 'rgba(255,255,255,0.80)', fontFamily: 'Cairo, sans-serif' }}>
                    {fmt(val)}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: active ? color : 'rgba(255,255,255,0.35)', fontFamily: 'Cairo, sans-serif' }}>
                    {symbol}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </GlassSection>
    </motion.div>
  );
}

interface UserFormProps { user: User | null; onClose: () => void; onSaved: (u: User) => void; }
function UserForm({ user, onClose, onSaved }: UserFormProps) {
  const { t } = useTranslation();
  const { addToast } = useUIStore();
  const [form, setForm] = useState({ name: user?.name ?? '', username: user?.username ?? '', role: user?.role ?? 'employee', active: user?.active ?? true, password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const set = (k: string, v: string | boolean) => { setForm((f) => ({ ...f, [k]: v })); setIsDirty(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.username.trim()) { setError('الاسم واسم المستخدم مطلوبان'); return; }
    if (!user && !form.password) { setError('كلمة المرور مطلوبة'); return; }
    if (form.password && form.password !== form.confirmPassword) { setError('كلمات المرور غير متطابقة'); return; }
    setLoading(true);
    setError('');
    try {
      if (user) {
        await api.auth.updateUser(user.id, form.name, form.role, form.active, form.password || undefined);
        onSaved({ ...user, name: form.name, role: form.role as User['role'], active: form.active });
      } else {
        const created = await api.auth.createUser({ name: form.name, username: form.username, password: form.password, role: form.role });
        onSaved(created);
      }
      addToast('success', t('messages.saved'));
    } catch (err) { setError(String(err)); }
    finally { setLoading(false); }
  };

  return (
    <Modal open onClose={onClose} isDirty={isDirty} title={user ? t('settings.editUser') : t('settings.addUser')} size="md"
      footer={<><Button variant="ghost" onClick={onClose}>{t('actions.cancel')}</Button><Button variant="gold" form="user-form" type="submit" loading={loading}>{t('actions.save')}</Button></>}>
      <form id="user-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl border border-red-400/25 text-sm text-red-300"
            style={{ background: 'rgba(239,68,68,0.10)' }}>
            {error}
          </div>
        )}
        <Input label="الاسم الكامل" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        {!user && <Input label="اسم المستخدم" value={form.username} onChange={(e) => set('username', e.target.value)} required />}
        <Select label="الدور" value={form.role} onChange={(e) => set('role', e.target.value)} options={ROLE_OPTIONS} />
        <Input label="كلمة المرور" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} required={!user}
          hint={user ? 'اتركه فارغاً للاحتفاظ بكلمة المرور الحالية' : ''} />
        {form.password && <Input label="تأكيد كلمة المرور" type="password" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} />}
        {user && (
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} className="w-4 h-4 accent-gold-500" />
            <span className="text-sm text-white/65">حساب نشط</span>
          </label>
        )}
      </form>
    </Modal>
  );
}


