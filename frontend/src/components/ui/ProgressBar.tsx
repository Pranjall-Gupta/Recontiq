import { cn } from '../../lib/utils';

interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 80 ? 'bg-success' : clamped >= 50 ? 'bg-accent' : clamped >= 30 ? 'bg-warning' : 'bg-error';

  return (
    <div className={cn('flex items-center gap-12', className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-badge bg-gray-200 dark:bg-gray-800">
        <div className={cn('h-full rounded-badge transition-all', color)} style={{ width: `${clamped}%` }} />
      </div>
      <span className="min-w-[36px] font-mono text-body-sm font-medium text-gray-600">{clamped}%</span>
    </div>
  );
}
