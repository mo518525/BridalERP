import { forwardRef } from 'react';
import { cn } from '../utils/cn';

const baseInput = [
  'w-full rounded-xl border border-white/14',
  'text-white/88 placeholder:text-white/30 text-sm',
  'focus:outline-none focus:border-gold-400/55 focus:ring-1 focus:ring-gold-400/30',
  'transition-colors duration-200',
].join(' ');

const baseStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(16px) saturate(148%)',
  WebkitBackdropFilter: 'blur(16px) saturate(148%)',
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconPosition?: 'start' | 'end';
  containerClass?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, iconPosition = 'start', containerClass, className, style, ...props }, ref) => (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && (
        <label className="text-sm font-medium text-white/60">
          {label}
          {props.required && <span className="text-red-400 ms-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && iconPosition === 'start' && (
          <span className="absolute start-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            baseInput,
            'h-10 px-3',
            icon && iconPosition === 'start' && 'ps-9',
            icon && iconPosition === 'end' && 'pe-9',
            error && 'border-red-400/60 focus:border-red-400 focus:ring-red-400/30',
            className
          )}
          style={{ ...baseStyle, colorScheme: 'dark', ...style }}
          {...props}
        />
        {icon && iconPosition === 'end' && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
            {icon}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-white/35">{hint}</p>}
    </div>
  )
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  containerClass?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, containerClass, options, placeholder, className, style, ...props }, ref) => (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && (
        <label className="text-sm font-medium text-white/60">
          {label}
          {props.required && <span className="text-red-400 ms-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={cn(
          baseInput,
          'h-10 px-3',
          error && 'border-red-400/60',
          className
        )}
        style={{ ...baseStyle, colorScheme: 'dark', ...style }}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
Select.displayName = 'Select';

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  containerClass?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, containerClass, className, style, ...props }, ref) => (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && (
        <label className="text-sm font-medium text-white/60">{label}</label>
      )}
      <textarea
        ref={ref}
        className={cn(
          baseInput,
          'px-3 py-2.5 resize-none',
          error && 'border-red-400/60',
          className
        )}
        style={{ ...baseStyle, ...style }}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
);
TextArea.displayName = 'TextArea';
