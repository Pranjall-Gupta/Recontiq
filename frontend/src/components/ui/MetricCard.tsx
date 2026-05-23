import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from './card';

interface MetricCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
}

export function MetricCard({ label, value, icon: Icon, trend }: MetricCardProps) {
  return (
    <Card hover className="p-20">
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 p-2 dark:bg-gray-800">
          <Icon className="text-primary dark:text-primary-light" size={32} strokeWidth={1.5} />
        </div>
        {trend ? (
          <span
            className={cn(
              'flex items-center gap-1 text-body-sm font-medium',
              trend.positive ? 'text-success' : 'text-error',
            )}
          >
            {trend.positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {trend.value}
          </span>
        ) : null}
      </div>
      <p className="mt-16 font-mono text-[28px] font-bold text-primary dark:text-primary-light">{value}</p>
      <p className="mt-4 text-[13px] font-medium text-gray-600 dark:text-gray-500">{label}</p>
    </Card>
  );
}
