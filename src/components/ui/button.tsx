import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
}

const variants = {
  primary: 'bg-[#00B39A] hover:bg-[#009B85] text-white shadow-sm',
  secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
  ghost: 'hover:bg-muted text-foreground',
  destructive: 'bg-destructive hover:bg-red-600 text-white',
  outline: 'border border-border hover:bg-muted text-foreground',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs h-7',
  md: 'px-4 py-2 text-sm h-9',
  lg: 'px-6 py-2.5 text-sm h-11',
  icon: 'w-9 h-9 p-0',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
