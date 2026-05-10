import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Gem, Lock, User } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { Button } from '../../components/Button';
import { cn } from '../../utils/cn';

export function Login() {
  const { t, i18n } = useTranslation();
  const { setUser } = useAuthStore();
  const { theme, setTheme, language, setLanguage } = useUIStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError('');
    try {
      const user = await api.auth.login(username.trim(), password.trim());
      setUser(user);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    const next = language === 'ar' ? 'de' : 'ar';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  return (
    <div className={cn('min-h-screen flex items-center justify-center relative overflow-hidden', theme === 'dark' ? 'dark' : '')}>
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-200 to-gold-100 dark:from-navy-900 dark:via-navy-800 dark:to-navy-900" />
      <div className="absolute inset-0 opacity-10 dark:opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, #C9A84C 0%, transparent 50%), radial-gradient(circle at 70% 50%, #C9A84C 0%, transparent 50%)' }} />

      {/* Controls top-right */}
      <div className="absolute top-4 end-4 flex items-center gap-2">
        <button onClick={toggleLang}
          className="px-3 py-1.5 rounded-lg bg-white/70 dark:bg-navy-800/70 border border-cream-200 dark:border-navy-600 text-xs font-medium text-navy-700 dark:text-cream-200 hover:bg-white dark:hover:bg-navy-800 transition-all backdrop-blur-sm">
          {language === 'ar' ? 'Deutsch' : 'العربية'}
        </button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-1.5 rounded-lg bg-white/70 dark:bg-navy-800/70 border border-cream-200 dark:border-navy-600 text-navy-700 dark:text-cream-200 hover:bg-white transition-all backdrop-blur-sm">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm mx-4">
        <div className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 dark:border-navy-700/50 p-8 animate-scale-in">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold">
              <Gem size={28} className="text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-navy-800 dark:text-cream-100">{t('appName')}</h1>
              <p className="text-sm text-navy-400 dark:text-navy-400 mt-0.5">{t('appDesc')}</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-lg font-semibold text-navy-700 dark:text-cream-200 text-center">{t('auth.welcomeBack')}</h2>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-sm text-red-600 dark:text-red-400 text-center animate-slide-up">
                {error}
              </div>
            )}

            <div className="relative">
              <User size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none" />
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('auth.username')}
                autoComplete="username"
                className="w-full ps-9 pe-3 h-11 rounded-xl border border-cream-300 dark:border-navy-600 bg-white/70 dark:bg-navy-700/70 text-navy-800 dark:text-cream-100 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm backdrop-blur-sm"
              />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-navy-400 pointer-events-none" />
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                autoComplete="current-password"
                className="w-full ps-9 pe-9 h-11 rounded-xl border border-cream-300 dark:border-navy-600 bg-white/70 dark:bg-navy-700/70 text-navy-800 dark:text-cream-100 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-gold-400 text-sm backdrop-blur-sm"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-700 transition-colors">
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full mt-2">
              {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
            </Button>
          </form>

          <p className="text-center text-xs text-navy-300 dark:text-navy-500 mt-6">
            {language === 'ar' ? 'الحساب الافتراضي: admin / admin123' : 'Standard: admin / admin123'}
          </p>
        </div>
      </div>
    </div>
  );
}
