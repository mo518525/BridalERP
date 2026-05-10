import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useUIStore } from '../store/uiStore';

export function useAutoLogout() {
  const { isAuthenticated, logout } = useAuthStore();
  const { autoLogoutMinutes } = useUIStore();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isAuthenticated || autoLogoutMinutes <= 0) return;

    const ms = autoLogoutMinutes * 60_000;

    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(logout, ms);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart'] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach(e => window.removeEventListener(e, reset));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [isAuthenticated, autoLogoutMinutes, logout]);
}
