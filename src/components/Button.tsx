import { forwardRef } from 'react';
import { cn } from '../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-transparent disabled:opacity-40 disabled:cursor-not-allowed active:scale-95';

    const variants = {
      primary:   'bg-gradient-to-r from-gold-400 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-white focus:ring-gold-400',
      secondary: 'border border-white/15 text-white/70 hover:text-white hover:border-white/25 backdrop-blur-xl focus:ring-white/20',
      ghost:     'text-white/60 hover:text-white hover:bg-white/8 focus:ring-white/20',
      danger:    'bg-red-500/80 hover:bg-red-500 text-white border border-red-400/30 focus:ring-red-400',
      gold:      'bg-gradient-to-r from-gold-400 to-gold-600 hover:from-gold-500 hover:to-gold-700 text-white focus:ring-gold-400',
    };

    const variantStyle: Record<string, React.CSSProperties> = {
      primary: {
        boxShadow: '0 12px 28px rgba(208,162,90,0.09), inset 0 1px 0 rgba(255,255,255,0.17)',
      },
      gold: {
        boxShadow: '0 12px 28px rgba(208,162,90,0.10), inset 0 1px 0 rgba(255,255,255,0.18)',
      },
      secondary: {
        background: 'rgba(255,255,255,0.48)',
        borderColor: 'rgba(255,255,255,0.84)',
        boxShadow: '0 12px 28px rgba(160,160,160,0.04), 0 0 8px rgba(255,255,255,0.11), inset 0 1px 0 rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      },
      ghost: {
        background: 'rgba(255,255,255,0.34)',
        boxShadow: '0 10px 22px rgba(160,160,160,0.03), inset 0 1px 0 rgba(255,255,255,0.94)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      },
      danger: {
        boxShadow: '0 12px 28px rgba(239,68,68,0.07), inset 0 1px 0 rgba(255,255,255,0.12)',
      },
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        style={variantStyle[variant]}
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

