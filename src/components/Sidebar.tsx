import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Home, BarChart3, CalendarDays,
  Users2, Settings, LogOut, Menu, User, X,
  ChevronRight,
} from 'lucide-react';
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

// profile modal
function ProfileModal({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { user } = useAuthStore();
  const t = tok(isDark);
  const ROLE_MAP: Record<string, string> = { owner: 'مالك', employee: 'موظف', cashier: 'كاشير' };
  const initials = user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '؟';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 12 }}
        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={glass(isDark)}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          className="absolute top-4 end-4 p-1.5 rounded-lg transition-colors"
          style={{ color: t.textMuted }}>
          <X size={16} />
        </button>

        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold"
            style={{
              background: 'linear-gradient(135deg, rgba(201,168,76,0.30), rgba(168,115,46,0.20))',
              border: isDark ? '2px solid rgba(201,168,76,0.35)' : '2px solid rgba(201,168,76,0.40)',
              color: isDark ? '#d4aa58' : '#a87830',
              fontFamily: "'Playfair Display', serif",
            }}>
            {initials}
          </div>

          <div className="text-center">
            <p className="text-lg font-bold" style={{ color: t.text1, fontFamily: 'Cairo, sans-serif' }}>
              {user?.name}
            </p>
            <p className="text-sm mt-0.5" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
              @{user?.username}
            </p>
          </div>

          <div className="w-full flex justify-center">
            <span className="px-4 py-1.5 rounded-full text-sm font-semibold"
              style={{
                background: isDark ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.12)',
                color: isDark ? '#d4aa58' : '#a87830',
                border: isDark ? '1px solid rgba(201,168,76,0.28)' : '1px solid rgba(201,168,76,0.25)',
                fontFamily: 'Cairo, sans-serif',
              }}>
              {ROLE_MAP[user?.role ?? ''] ?? user?.role}
            </span>
          </div>

          <div className="w-full rounded-xl p-3 space-y-2" style={{
            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.44)',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
          }}>
            {[
              { label: 'اسم المستخدم', value: user?.username },
              { label: 'الحالة', value: user?.active ? 'نشط ✓' : 'غير نشط' },
              { label: 'الدور', value: ROLE_MAP[user?.role ?? ''] ?? user?.role },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>{row.label}</span>
                <span style={{ color: t.text1, fontFamily: 'Cairo, sans-serif', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

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
              style={{ color: active ? t.text1 : t.text2, fontWeight: isDark ? 600 : 800 }}>
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
  const { sidebarOpen, toggleSidebar, theme } = useUIStore();
  const { logout, user } = useAuthStore();
  const { isOwner } = usePermissions();
  const isDark = theme === 'dark';
  const t = tok(isDark);
  const [showProfile, setShowProfile] = useState(false);

  const initials = user?.name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() ?? '؟';

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
            <NavItem to="/calendar"  icon={<CalendarDays size={16} />}  label="الكاليندر"    open={sidebarOpen} isDark={isDark} />

            {/* Divider */}
            <div className="my-2 mx-2" style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }} />

            {/* Admin */}
            {isOwner && (
              <NavItem to="/settings" icon={<Users2 size={16} />} label="الموظفين" open={sidebarOpen} isDark={isDark} />
            )}
            <NavItem to="/settings" icon={<Settings size={16} />} label="الإعدادات" open={sidebarOpen} isDark={isDark} />
          </nav>

          {/* Profile + Logout */}
          <div className="px-2.5 pb-3 space-y-1">

            {/* Profile row */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.42)' }}
              onClick={() => setShowProfile(true)}
              className={cn('w-full flex items-center gap-3 rounded-2xl px-3 py-2.5', !sidebarOpen && 'justify-center px-0')}
              style={{ border: '1px solid transparent' }}
              title={!sidebarOpen ? user?.name : undefined}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                style={{
                  background: isDark ? 'rgba(201,168,76,0.20)' : 'rgba(201,168,76,0.15)',
                  color: isDark ? '#d4aa58' : '#a87830',
                  border: isDark ? '1px solid rgba(201,168,76,0.30)' : '1px solid rgba(201,168,76,0.28)',
                  fontFamily: "'Playfair Display', serif",
                }}>
                {initials}
              </div>
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.div variants={labelV} initial="hidden" animate="show" exit="hidden" className="flex-1 min-w-0 overflow-hidden text-start">
                    <p className="truncate text-[13px]" style={{ color: t.text1, fontWeight: isDark ? 600 : 800, fontFamily: 'Cairo, sans-serif' }}>
                      {user?.name}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: t.textMuted, fontFamily: 'Cairo, sans-serif' }}>
                      {({ owner: 'مالك', employee: 'موظف', cashier: 'كاشير' } as Record<string, string>)[user?.role ?? ''] ?? user?.role}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {sidebarOpen && <ChevronRight size={13} style={{ color: t.textMuted, flexShrink: 0 }} />}
            </motion.button>

            {/* Divider */}
            <div className="mx-2 my-1" style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }} />

            {/* Logout */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              whileHover={{ backgroundColor: isDark ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.07)' }}
              onClick={logout}
              className={cn('w-full flex items-center gap-3 rounded-2xl px-3 py-2.5', !sidebarOpen && 'justify-center px-0')}
              style={{ border: '1px solid transparent' }}
              title={!sidebarOpen ? 'تسجيل الخروج' : undefined}
            >
              <LogOut size={15} style={{ color: '#e05252', flexShrink: 0 }} />
              <AnimatePresence>
                {sidebarOpen && (
                  <motion.span variants={labelV} initial="hidden" animate="show" exit="hidden"
                    className="truncate whitespace-nowrap text-[13.5px]"
                    style={{ color: '#e05252', fontWeight: isDark ? 600 : 800 }}>
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
        {showProfile && <ProfileModal onClose={() => setShowProfile(false)} isDark={isDark} />}
      </AnimatePresence>
    </>
  );
}
