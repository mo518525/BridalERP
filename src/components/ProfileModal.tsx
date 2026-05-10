import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Lock, Activity, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';
import { tok } from '../utils/themeTokens';
import { api } from '../lib/api';
import type { ActivityLog } from '../types';

function glass(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.38)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(22px) saturate(180%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(255,255,255,0.94)',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.08)'
      : '0 14px 28px rgba(180,180,180,0.10), inset 0 1px 0 rgba(255,255,255,0.99)',
    ...extra,
  };
}

const AVATAR_COLORS = [
  '#c9a84c', '#60a5fa', '#f472b6', '#34d399', '#a78bfa', '#fb923c', '#e05252', '#2dd4bf',
];

const ROLE_MAP: Record<string, string> = { owner: 'مالك', employee: 'موظف', cashier: 'كاشير' };

type Tab = 'profile' | 'password' | 'activity';

interface Props { onClose: () => void; }

export function ProfileModal({ onClose }: Props) {
  const { user, setUser } = useAuthStore();
  const { theme, addToast, avatarColors, setAvatarColor } = useUIStore();
  const isDark = theme === 'dark';
  const t = tok(isDark);

  const [tab, setTab] = useState<Tab>('profile');

  const avatarColor = (user?.id ? avatarColors[user.id] : null) ?? AVATAR_COLORS[0];
  const initials = user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '؟';

  const inputStyle: React.CSSProperties = {
    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.55)',
    border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.10)',
    borderRadius: 12,
    color: isDark ? 'rgba(255,255,255,0.88)' : '#222',
    fontFamily: 'Cairo, sans-serif',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
    height: 40,
    padding: '0 12px',
    colorScheme: isDark ? 'dark' : 'light',
  };

  // ── Profile tab ──────────────────────────────────────────────────────────────
  const [name, setName]           = useState(user?.name ?? '');
  const [username, setUsername]   = useState(user?.username ?? '');
  const [saving, setSaving]       = useState(false);
  const [profileErr, setProfileErr] = useState('');

  const saveProfile = async () => {
    setSaving(true);
    setProfileErr('');
    try {
      const updated = await api.auth.updateOwnProfile(name, username);
      setUser(updated);
      addToast('success', 'تم حفظ المعلومات');
    } catch (e) { setProfileErr(String(e)); }
    finally { setSaving(false); }
  };

  // ── Password tab ─────────────────────────────────────────────────────────────
  const [oldPw, setOldPw]   = useState('');
  const [newPw, setNewPw]   = useState('');
  const [confPw, setConfPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwErr, setPwErr]   = useState('');
  const [pwOk, setPwOk]     = useState(false);

  const savePassword = async () => {
    if (newPw !== confPw) { setPwErr('كلمات المرور غير متطابقة'); return; }
    if (newPw.length < 4)  { setPwErr('كلمة المرور قصيرة جداً (4 أحرف على الأقل)'); return; }
    setPwSaving(true);
    setPwErr('');
    try {
      await api.auth.changeOwnPassword(oldPw, newPw);
      setPwOk(true);
      setOldPw(''); setNewPw(''); setConfPw('');
      setTimeout(() => setPwOk(false), 3000);
    } catch (e) { setPwErr(String(e)); }
    finally { setPwSaving(false); }
  };

  // ── Activity tab ─────────────────────────────────────────────────────────────
  const [logs, setLogs]         = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (tab !== 'activity') return;
    setLogsLoading(true);
    api.activity.getLog(50)
      .then(all => setLogs(all.filter(l => l.user_name === user?.name).slice(0, 15)))
      .catch(console.error)
      .finally(() => setLogsLoading(false));
  }, [tab, user?.name]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'profile',  label: 'الملف الشخصي', icon: <User size={14} /> },
    { key: 'password', label: 'كلمة المرور',  icon: <Lock size={14} /> },
    { key: 'activity', label: 'نشاطي',        icon: <Activity size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={glass(isDark)}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <button onClick={onClose}
            className="absolute top-4 end-4 p-1.5 rounded-lg transition-colors"
            style={{ color: t.textMuted }}>
            <X size={16} />
          </button>

          {/* Avatar */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold transition-colors"
              style={{ background: `${avatarColor}28`, border: `2.5px solid ${avatarColor}60`, color: avatarColor, fontFamily: "'Playfair Display', serif" }}>
              {initials}
            </div>

            {/* Color picker */}
            <div className="flex gap-1.5">
              {AVATAR_COLORS.map(c => (
                <button key={c} onClick={() => user?.id && setAvatarColor(user.id, c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{ background: c, outline: avatarColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
              ))}
            </div>

            <div className="text-center">
              <p className="font-bold" style={{ color: t.text1, fontFamily: 'Cairo, sans-serif', fontSize: '1rem' }}>{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
                @{user?.username} · {ROLE_MAP[user?.role ?? ''] ?? user?.role}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
            {tabs.map(tb => (
              <button key={tb.key} onClick={() => setTab(tb.key)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  fontFamily: 'Cairo, sans-serif',
                  background: tab === tb.key ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)') : 'transparent',
                  color: tab === tb.key ? (isDark ? '#d4aa58' : '#a87830') : t.textMuted,
                  boxShadow: tab === tb.key ? '0 2px 8px rgba(0,0,0,0.10)' : 'none',
                }}>
                {tb.icon} {tb.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 pb-6 max-h-72 overflow-y-auto scrollbar-thin">
          <AnimatePresence mode="wait">
            {tab === 'profile' && (
              <motion.div key="profile" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                {profileErr && (
                  <p className="text-xs text-red-400 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.10)', fontFamily: 'Cairo, sans-serif' }}>{profileErr}</p>
                )}
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>الاسم الكامل</label>
                  <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1.5" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>اسم المستخدم</label>
                  <input value={username} onChange={e => setUsername(e.target.value)} style={inputStyle} />
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="w-full py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #a8732e)', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  حفظ
                </button>
              </motion.div>
            )}

            {tab === 'password' && (
              <motion.div key="password" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="space-y-3">
                {pwErr && (
                  <p className="text-xs text-red-400 p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.10)', fontFamily: 'Cairo, sans-serif' }}>{pwErr}</p>
                )}
                {pwOk && (
                  <p className="text-xs text-emerald-400 p-2 rounded-lg flex items-center gap-2" style={{ background: 'rgba(16,185,129,0.10)', fontFamily: 'Cairo, sans-serif' }}>
                    <Check size={12} /> تم تغيير كلمة المرور بنجاح
                  </p>
                )}
                {[
                  { label: 'كلمة المرور الحالية', value: oldPw,  set: setOldPw },
                  { label: 'كلمة المرور الجديدة', value: newPw,  set: setNewPw },
                  { label: 'تأكيد كلمة المرور',   value: confPw, set: setConfPw },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="block text-xs mb-1.5" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>{label}</label>
                    <input type="password" value={value} onChange={e => { set(e.target.value); setPwErr(''); }} style={inputStyle} />
                  </div>
                ))}
                <button onClick={savePassword} disabled={pwSaving}
                  className="w-full py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #c9a84c, #a8732e)', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>
                  {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                  تغيير كلمة المرور
                </button>
              </motion.div>
            )}

            {tab === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                {logsLoading ? (
                  <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: t.textMuted }} /></div>
                ) : logs.length === 0 ? (
                  <p className="text-center py-8 text-xs" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>لا يوجد نشاط مسجل بعد</p>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-start gap-2 p-2.5 rounded-xl"
                        style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.50)', border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent' }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed" style={{ color: t.text1, fontFamily: 'Cairo, sans-serif' }}>{log.description}</p>
                          <p className="text-[10px] mt-0.5" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
                            {new Date(log.created_at).toLocaleString('ar-SY')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
