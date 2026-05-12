import { forwardRef } from 'react';
import { cn } from '../utils/cn';
import { useUIStore } from '../store/uiStore';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, style, ...props }, ref) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent disabled:opacity-40 disabled:cursor-not-allowed active:scale-95';

    const variantClass: Record<string, string> = {
      primary:   'text-white focus:ring-gold-400',
      secondary: '',
      ghost:     '',
      danger:    'bg-red-500/80 hover:bg-red-500 text-white border border-red-400/30 focus:ring-red-400',
      gold:      'text-white focus:ring-gold-400',
    };

    const variantStyle = (): React.CSSProperties => {
      switch (variant) {
        case 'primary':
        case 'gold':
          return isDark ? {
            background: 'rgba(201,168,76,0.80)',
            border: '1px solid rgba(201,168,76,0.40)',
          } : {
            background: 'rgba(143,110,40,0.85)',
            border: '1px solid rgba(143,110,40,0.35)',
          };
        case 'secondary':
          return isDark ? {
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          } : {
            background: 'rgba(255,255,255,0.60)',
            border: '1px solid rgba(60,42,24,0.16)',
            color: 'rgba(55,38,18,0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          };
        case 'ghost':
          return isDark ? {
            background: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          } : {
            background: 'rgba(255,255,255,0.50)',
            color: 'rgba(55,38,18,0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          };
        case 'danger':
          return {};
        default:
          return {};
      }
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variantClass[variant], sizes[size], className)}
        style={{ ...variantStyle(), ...style }}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
