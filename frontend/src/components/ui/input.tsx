import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-input border border-gray-300 bg-white px-16 py-12 text-body text-primary placeholder:text-gray-500',
        'focus:border-accent focus:outline-none focus:ring-0',
        'dark:bg-surface-dark dark:border-border-dark dark:text-primary-light dark:placeholder:text-gray-600',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';
