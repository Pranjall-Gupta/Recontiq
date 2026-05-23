import type { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-48 text-center">
      <Icon className="mb-16 h-16 w-16 text-gray-400" strokeWidth={1.25} />
      <h3 className="mb-8 text-heading-s text-primary dark:text-primary-light">{title}</h3>
      <p className="mb-24 max-w-sm text-body text-gray-600 dark:text-gray-500">{description}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
