import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { recoveryChartData } from '../../data/mock';

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-button border border-gray-200 bg-white px-12 py-8 shadow-card dark:border-border-dark dark:bg-surface-dark">
      <p className="text-body-sm text-gray-600">{label}</p>
      <p className="font-mono text-body font-medium text-primary dark:text-primary-light">
        ₹{payload[0].value.toLocaleString('en-IN')}
      </p>
    </div>
  );
}

export function RecoveryTimelineChart() {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={recoveryChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="recoveryGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00B3E6" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#00B3E6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6C757D', fontSize: 12 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#6C757D', fontSize: 12 }}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#00B3E6"
          strokeWidth={2}
          fill="url(#recoveryGradient)"
          dot={false}
          activeDot={{ r: 5, fill: '#00B3E6', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
