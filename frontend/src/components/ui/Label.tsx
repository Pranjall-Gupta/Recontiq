import type { LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export function Label({ className, children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('mb-8 block text-[13px] font-semibold text-primary dark:text-primary-light', className)}
      {...props}
    >
      {children}
    </label>
  );
}
