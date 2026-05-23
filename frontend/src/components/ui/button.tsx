import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-primary-light hover:opacity-90 dark:bg-primary-light dark:text-primary',
  secondary:
    'bg-transparent border border-gray-300 text-primary hover:bg-gray-50 dark:border-border-dark dark:text-primary-light dark:hover:bg-surface-dark',
  accent: 'bg-accent text-white hover:opacity-90',
  danger: 'bg-error text-white hover:opacity-90',
  ghost:
    'bg-transparent text-gray-600 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-surface-dark',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', isLoading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-button px-5 py-2.5 text-body font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
