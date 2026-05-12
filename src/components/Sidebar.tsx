import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Home, BarChart3, CalendarDays,
  Users2, Settings, LogOut, Menu,
} from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { ConfirmDialog } from './Modal';
import { cn } from '../utils/cn';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';
import { usePermissions } from '../hooks/usePermissions';
import { tok } from '../utils/themeTokens';

// helpers
const DressIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L9 8V11L5 22H19L15 11V8L12 2Z" />
    <path d="M9 8L5 11M15 8L19 11" />
    <path d="M9 2H15" />
  </svg>
);

function glass(isDark: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.34)',
    backdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(11px) saturate(158%)',
    WebkitBackdropFilter: isDark ? 'blur(16px) saturate(148%)' : 'blur(11px) saturate(158%)',
    border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
    boxShadow: isDark
      ? '0 18px 38px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.10)'
      : '0 12px 24px rgba(122,122,122,0.08), inset 0 1px 0 rgba(255,255,255,0.84), inset 0 -1px 0 rgba(214,214,214,0.38)',
    ...extra,
  };
}

const labelV = {
  hidden: { opacity: 0, x: -8, width: 0 },
  show:   { opacity: 1, x: 0, width: 'auto', transition: { type: 'spring' as const, stiffness: 400, damping: 38, delay: 0.03 } },
};

// nav item
interface NavItemProps {
  to: string; icon: React.ReactNode; label: string;
  exact?: boolean; open: boolean; isDark: boolean;
}

function NavItem({ to, icon, label, exact, open, isDark }: NavItemProps) {
  const location = useLocation();
  const t = tok(isDark);
  const active = exact ? location.pathname === to : location.pathname === to;

  return (
    <NavLink to={to}>
      <motion.div
        whileTap={{ scale: 0.97 }}
        whileHover={!active ? { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.40)' } : {}}
        className={cn('flex items-center gap-3 rounded-2xl px-3 py-2.5', !open && 'justify-center px-0')}
        style={active ? {
          background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.48)',
          border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
          boxShadow: isDark
            ? '0 8px 20px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.08)'
            : '0 8px 16px rgba(122,122,122,0.07), inset 0 1px 0 rgba(255,255,255,0.86)',
        } : { border: '1px solid transparent' }}
        title={!open ? label : undefined}
      >
        <span className="flex-shrink-0" style={{ color: active ? t.gold : t.iconInactive }}>
          {icon}
        </span>
        <AnimatePresence>
          {open && (
            <motion.span
              variants={labelV} initial="hidden" animate="show" exit="hidden"
              className="truncate whitespace-nowrap text-[13.5px]"
              style={{ color: active ? t.text1 : t.text2, fontWeight: isDark ? 500 : 500 }}>
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </NavLink>
  );
}

// sidebar
export function Sidebar() {
  const { sidebarOpen, toggleSidebar, theme, avatarColors, shopName, shopLogo } = useUIStore();
  const { logout, user } = useAuthStore();
  const { isOwner } = usePermissions();
  const isDark = theme === 'dark';
  const t = tok(isDark);
  const [showProfile, setShowProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showYouhe, setShowYouhe] = useState(false);

  const initials = user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '؟';
  const ROLE_AR: Record<string, string> = { owner: 'مالك', employee: 'موظف', cashier: 'كاشير' };
  const avatarColor = (user?.id ? avatarColors[user.id] : null) ?? '#c9a84c';
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      api.settings.get(`avatar_photo_${user.id}`)
        .then(v => setAvatarPhoto(v ?? null))
        .catch(console.error);
    }
  }, [user?.id, showProfile]);

  return (
    <>
      <motion.aside
        animate={{ width: sidebarOpen ? 220 : 72 }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}
        className="relative h-full flex-shrink-0 z-30"
        style={{
          minWidth: sidebarOpen ? 220 : 72,
          paddingInlineStart: 14, paddingInlineEnd: 10,
          paddingTop: 10, paddingBottom: 18,
        }}
      >
        <div className="flex h-full flex-col overflow-hidden rounded-[28px]" style={glass(isDark, { height: '100%' })}>

          {/* Brand */}
          <div className={cn('px-4 pt-5 pb-4', sidebarOpen ? 'flex items-center justify-between' : 'flex flex-col items-center gap-3')}>
            <Link to="/" className={cn('flex items-center gap-3 min-w-0', !sidebarOpen && 'flex-col gap-2')}>
              <motion.div
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                style={{
                  color: isDark ? t.text1 : t.gold,
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.56)',
                  border: isDark ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
                  boxShadow: isDark
                    ? '0 6px 16px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.11)'
                    : '0 8px 16px rgba(124,124,124,0.08), inset 0 1px 0 rgba(255,255,255,0.88)',
                }}>
                <DressIcon size={17} />
              </motion.div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div variants={labelV} initial="hidden" animate="show" exit="hidden" className="overflow-hidden min-w-0">
                    <p className="text-[15px] leading-tight truncate" style={{ color: t.text1, fontFamily: "'Playfair Display', serif" }}>
                      Bridal
                    </p>
                    <p className="text-[10px]" style={{ color: t.textMuted }}>Management</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>

            <motion.button
              whileTap={{ scale: 0.92 }} onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0"
              style={{
                color: t.textMuted, order: !sidebarOpen ? -1 : undefined,
                border: isDark ? '1px solid rgba(255,255,255,0.13)' : undefined,
                background: isDark ? 'rgba(255,255,255,0.05)' : undefined,
              }}>
              <Menu size={14} />
            </motion.button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 pb-2 scrollbar-thin space-y-0.5">

            {/* Main nav */}
            <NavItem to="/"          icon={<Home size={16} />}          label="الرئيسية"     exact open={sidebarOpen} isDark={isDark} />
            <NavItem to="/dashboard" icon={<LayoutDashboard size={16} />} label="لوحة التحكم" open={sidebarOpen} isDark={isDark} />
            {isOwner && <NavItem to="/reports"   icon={<BarChart3 size={16} />}    label="التقارير"     open={sidebarOpen} isDark={isDark} />}
            <NavItem to="/calendar"  icon={<CalendarDays size={16} />}  label="التقويم"      open={sidebarOpen} isDark={isDark} />

            {/* Divider */}
            <div className="my-2 mx-2" style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }} />

            {/* Admin */}
            {isOwner && (
              <NavItem to="/employees" icon={<Users2 size={16} />} label="الموظفين" open={sidebarOpen} isDark={isDark} />
            )}
            <NavItem to="/settings" icon={<Settings size={16} />} label="الإعدادات" open={sidebarOpen} isDark={isDark} />

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowYouhe(true)}
              className={cn('w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 mt-1', !sidebarOpen && 'justify-center px-0')}
              style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)' }}
            >
              <span style={{ fontSize: 16 }}>✨</span>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span variants={labelV} initial="hidden" animate="show" exit="hidden"
                    className="truncate whitespace-nowrap text-[13px]"
                    style={{ color: isDark ? '#c9a84c' : '#8f6e28', fontFamily: 'Cairo, sans-serif', fontWeight: 500 }}>
                    يوه
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </nav>

          {/* Profile + Logout */}
          <div className="px-2.5 pb-3 space-y-1">

            {/* Profile row */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.42)' }}
              onClick={() => setShowProfile(true)}
              className={cn('w-full flex items-center gap-3 rounded-2xl px-3 py-2.5', !sidebarOpen && 'justify-center px-0')}
              style={{ border: isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(60,42,24,0.13)', background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.30)' }}
              title={!sidebarOpen ? user?.name : undefined}
            >
              <div
                className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center text-[11px] font-bold"
                style={avatarPhoto ? {} : {
                  background: `${avatarColor}28`,
                  color: avatarColor,
                  border: `1.5px solid ${avatarColor}55`,
                  fontFamily: "'Playfair Display', serif",
                }}>
                {avatarPhoto
                  ? <img src={avatarPhoto} alt="avatar" className="w-full h-full object-cover" />
                  : initials}
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div variants={labelV} initial="hidden" animate="show" exit="hidden" className="flex-1 min-w-0 overflow-hidden text-start">
                    <p className="truncate text-[13px]" style={{ color: t.text1, fontWeight: isDark ? 500 : 500, fontFamily: 'Cairo, sans-serif' }}>
                      {shopName || user?.name}
                    </p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
                      {user?.name}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Divider */}
            <div className="mx-2 my-1" style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }} />

            {/* Logout */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.07)' }}
              onClick={() => setShowLogoutConfirm(true)}
              className={cn('w-full flex items-center gap-3 rounded-2xl px-3 py-2.5', !sidebarOpen && 'justify-center px-0')}
              style={{ border: '1px solid transparent' }}
              title={!sidebarOpen ? 'تسجيل الخروج' : undefined}
            >
              <LogOut size={15} style={{ color: '#e05252', flexShrink: 0 }} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span variants={labelV} initial="hidden" animate="show" exit="hidden"
                    className="truncate whitespace-nowrap text-[13.5px]"
                    style={{ color: '#e05252', fontWeight: isDark ? 500 : 500 }}>
                    تسجيل الخروج
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>

        </div>
      </motion.aside>

      {/* Profile modal */}
      <AnimatePresence>
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      </AnimatePresence>

      <ConfirmDialog
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={logout}
        title="تسجيل الخروج"
        message="هل أنت متأكد من تسجيل الخروج؟"
        confirmLabel="خروج"
        danger
      />

      <AnimatePresence>
        {showYouhe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowYouhe(false)}
            className="fixed inset-0 z-[999] flex items-center justify-center cursor-pointer overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #e8c8d8 0%, #c8e0cc 28%, #e8d8c0 55%, #c8dce8 78%, #e0c8d8 100%)',
            }}
          >
            {/* Spring background blobs — darker */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', width: 700, height: 700, borderRadius: '50%', top: '-15%', left: '-10%', background: 'radial-gradient(circle, rgba(220,120,150,0.55) 0%, transparent 65%)', filter: 'blur(55px)' }} />
              <div style={{ position: 'absolute', width: 650, height: 650, borderRadius: '50%', bottom: '-10%', right: '-8%', background: 'radial-gradient(circle, rgba(100,180,120,0.50) 0%, transparent 65%)', filter: 'blur(55px)' }} />
              <div style={{ position: 'absolute', width: 550, height: 550, borderRadius: '50%', top: '25%', right: '15%', background: 'radial-gradient(circle, rgba(220,170,100,0.45) 0%, transparent 65%)', filter: 'blur(55px)' }} />
              <div style={{ position: 'absolute', width: 450, height: 450, borderRadius: '50%', bottom: '15%', left: '10%', background: 'radial-gradient(circle, rgba(100,160,210,0.40) 0%, transparent 65%)', filter: 'blur(55px)' }} />
              <div style={{ position: 'absolute', width: 350, height: 350, borderRadius: '50%', top: '50%', left: '40%', background: 'radial-gradient(circle, rgba(200,100,160,0.35) 0%, transparent 65%)', filter: 'blur(45px)' }} />
            </div>

            {/* Falling particles: roses, hearts, petals — 55 particles */}
            {Array.from({ length: 55 }).map((_, i) => {
              const left = (i * 100 / 54);
              const dur = 3.5 + (i % 7) * 0.6;
              const delay = (i * 0.18) % 5.5;
              const size = 13 + (i % 6) * 5;
              const symbols = ['🌹','🌸','💗','🩷','🌺','💞','🌸','🌹','💕','🌷','🌼','💐','🩷','🌸','💗'];
              return (
                <motion.span key={i}
                  initial={{ y: -60, opacity: 1, rotate: 0 }}
                  animate={{ y: '115vh', opacity: [1, 1, 0.6, 0], rotate: (i % 2 === 0 ? 1 : -1) * 30 }}
                  transition={{ duration: dur, delay, repeat: Infinity, ease: 'linear' }}
                  style={{ position: 'absolute', left: `${left}%`, top: 0, fontSize: size, pointerEvents: 'none', userSelect: 'none' }}
                >
                  {symbols[i % symbols.length]}
                </motion.span>
              );
            })}

            {/* Butterflies — 18, flying in waves */}
            {Array.from({ length: 18 }).map((_, i) => {
              const startY = 3 + (i * 94 / 17);
              const dur = 5 + (i % 5) * 1.0;
              const delay = i * 0.45;
              const size = 20 + (i % 4) * 8;
              const fromRight = i % 3 === 0;
              return (
                <motion.span key={`bf-${i}`}
                  initial={{ x: fromRight ? '110vw' : '-10vw', y: `${startY}vh`, opacity: 0 }}
                  animate={{
                    x: fromRight
                      ? ['110vw','75vw','45vw','15vw','-10vw']
                      : ['-10vw','20vw','50vw','80vw','110vw'],
                    y: [`${startY}vh`,`${startY-9}vh`,`${startY+6}vh`,`${startY-7}vh`,`${startY+4}vh`],
                    opacity: [0, 1, 1, 1, 0],
                  }}
                  transition={{ duration: dur, delay, repeat: Infinity, ease: 'easeInOut', times: [0,0.25,0.5,0.75,1] }}
                  style={{ position: 'absolute', fontSize: size, pointerEvents: 'none', userSelect: 'none' }}
                >
                  🦋
                </motion.span>
              );
            })}

            {/* Main calligraphy text */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              style={{ textAlign: 'center', zIndex: 1, position: 'relative' }}
            >
              <motion.p
                animate={{ y: [0, -12, 0] }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  fontSize: 'clamp(6rem, 20vw, 15rem)',
                  fontFamily: "'Aref Ruqaa', serif",
                  fontWeight: 700,
                  color: '#b5445a',
                  lineHeight: 1.1,
                  userSelect: 'none',
                  textShadow: '0 4px 30px rgba(200,80,110,0.30), 0 0 80px rgba(255,160,180,0.25)',
                  letterSpacing: '0.06em',
                }}
              >
                يوه
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.65, y: 0 }}
                transition={{ delay: 0.7 }}
                style={{ color: '#b5607a', fontFamily: "'Aref Ruqaa', serif", fontSize: '1.1rem', marginTop: '0.5rem', userSelect: 'none', letterSpacing: '0.10em' }}
              >
                🌸 اضغط في أي مكان للإغلاق 🌸
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
