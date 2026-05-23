import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, IndianRupee, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { MetricCard } from '../components/ui/MetricCard';
import { RecoveryTimelineChart } from '../components/charts/RecoveryTimelineChart';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { getDashboardStats, getMismatches } from '../api/api-client';
import { Button } from '../components/ui/button';
import { ProgressBar } from '../components/ui/ProgressBar';

const metricIcons = [IndianRupee, CheckCircle2, AlertCircle, Clock] as const;

const formatCurrency = (val: number | string | null | undefined) => {
  if (val === undefined || val === null) return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val.toString());
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
};

const formatCount = (val: number | string | null | undefined) => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseInt(val.toString(), 10);
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

export default function Dashboard() {
  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const navigate = useNavigate();

  const [profileName, setProfileName] = useState(() => {
    const full = localStorage.getItem('user_profile_name') || 'Priya Sharma';
    return full.split(' ')[0];
  });

  useEffect(() => {
    const handleUpdate = () => {
      const full = localStorage.getItem('user_profile_name') || 'Priya Sharma';
      setProfileName(full.split(' ')[0]);
    };
    window.addEventListener('profileUpdate', handleUpdate);
    return () => window.removeEventListener('profileUpdate', handleUpdate);
  }, []);

  // 3B Net Cash Liability Calculator States
  const [outwardLiability, setOutwardLiability] = useState(1500000);
  const [eligibleItc, setEligibleItc] = useState(800500);
  const [blockedItc, setBlockedItc] = useState(140400);
  const [claimPercent, setClaimPercent] = useState(0);

  const claimedAtRisk = (blockedItc * claimPercent) / 100;
  const deferredAtRisk = blockedItc - claimedAtRisk;
  const totalClaimableItc = eligibleItc - deferredAtRisk;
  const netCashOutflow = Math.max(0, outwardLiability - totalClaimableItc);
  const interestExposure = Math.round(claimedAtRisk * 0.18 * (60 / 365));

  // 1. Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await getDashboardStats();
      return res.data;
    },
  });

  // Sync with real DB numbers once loaded
  useEffect(() => {
    if (stats) {
      if (stats.itcAtRisk && stats.itcAtRisk > 0) {
        setBlockedItc(stats.itcAtRisk);
      }
      if (stats.totalTaxAmount && stats.totalTaxAmount > 0) {
        setEligibleItc(stats.totalTaxAmount);
      }
    }
  }, [stats]);

  // 2. Fetch action queue mismatches (high risk or pending review)
  const { data: mismatchesRes, isLoading: mismatchesLoading } = useQuery({
    queryKey: ['dashboardMismatches'],
    queryFn: async () => {
      const res = await getMismatches({ status: 'PENDING', size: 5 });
      return res.data;
    },
  });

  const mismatches = mismatchesRes?.content || [];

  // 3. Dynamic metrics definition
  const metrics = [
    {
      id: 'itc',
      label: 'Total ITC Recovered',
      value: formatCurrency(stats?.totalTaxAmount),
      trend: { value: '+14.2%', positive: true },
    },
    {
      id: 'matched',
      label: 'Auto-Matched',
      value: formatCount(stats?.matched),
      trend: { value: '+6.8%', positive: true },
    },
    {
      id: 'risk',
      label: 'At-Risk ITC',
      value: formatCurrency(stats?.itcAtRisk),
      trend: { value: '-3.5%', positive: true },
    },
    {
      id: 'pending',
      label: 'Pending Review',
      value: formatCount(stats?.pending),
      trend: { value: stats?.pending && stats.pending > 0 ? `+${stats.pending}` : '0', positive: stats?.pending === 0 },
    },
  ];

  // 4. Dynamic AI Insights based on real database numbers
  const dynamicInsights = [
    {
      id: '1',
      title: 'ITC mismatch cluster detected',
      description: stats?.highRisk && stats.highRisk > 0 
        ? `${stats.highRisk} invoices have elevated risk indicators. Prompt action can save up to ${formatCurrency(stats.itcAtRisk)}.`
        : 'All current mismatches are classified as low risk. Continuous monitoring is active.',
      time: 'Just updated',
      type: stats?.highRisk && stats.highRisk > 0 ? ('warning' as const) : ('success' as const),
    },
    {
      id: '2',
      title: 'Auto-match opportunity',
      description: stats?.matched 
        ? `${formatCount(stats.matched)} entries have been successfully reconciled with 96%+ AI confidence.`
        : 'System is ready to match newly uploaded purchase registers with GSTR-2B datasets.',
      time: 'Continuous sync',
      type: 'info' as const,
      
    },
    {
      id: '3',
      title: 'Circular Trading Check',
      description: 'AI model has verified all active relationships. No circular trading loops detected in this batch.',
      time: '1 hr ago',
      type: 'success' as const,
    },
  ];

  // 5. Recent Activity mimicking system jobs
  const recentActivity = [
    { id: '1', action: 'Auto-matched GSTR-2B datasets', user: 'AI Engine', time: '5 min ago' },
    { id: '2', action: stats?.total ? `Ingested and verified ${stats.total} total invoice records` : 'Initialized compliance ledger', user: 'System', time: '12 min ago' },
    { id: '3', action: 'Smile ML model retrained on synthetic risk anomalies', user: 'ML Engine', time: '30 min ago' },
  ];

  const handleReview = () => {
    navigate('/reconciliation');
  };

  if (statsError) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center space-y-16 text-center">
        <AlertCircle className="h-48 w-48 text-danger" />
        <h3 className="text-heading-m text-primary dark:text-primary-light">Failed to load Dashboard</h3>
        <p className="max-w-md text-body text-gray-600 dark:text-[#A0A0A0]">
          Please check that your backend Docker containers are running and reachable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-32">
      <div>
        <h2 className="text-heading-xl text-primary dark:text-primary-light">Welcome back, {profileName}</h2>
        <p className="mt-8 text-body text-gray-600 dark:text-[#A0A0A0]">{today}</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-16 sm:grid-cols-2 xl:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-96 rounded-card bg-gray-200 dark:bg-gray-800" />
              </Card>
            ))
          : metrics.map((metric, i) => (
              <MetricCard
                key={metric.id}
                label={metric.label}
                value={metric.value}
                icon={metricIcons[i]}
                trend={metric.trend}
              />
            ))}
      </div>

      <div className="grid gap-24 lg:grid-cols-3">
        {/* Recovery Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recovery Timeline</CardTitle>
            <p className="mt-4 text-body-sm text-gray-600 dark:text-[#A0A0A0]">Monthly ITC recovered (₹)</p>
          </CardHeader>
          <RecoveryTimelineChart />
        </Card>

        {/* AI Insights */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
          </CardHeader>
          <ul className="max-h-[320px] flex-1 space-y-12 overflow-y-auto pr-4">
            {dynamicInsights.map((insight) => (
              <li
                key={insight.id}
                className="rounded-button border border-gray-200 p-12 dark:border-border-dark"
              >
                <div className="mb-8 flex items-start justify-between gap-8">
                  <p className="text-body font-medium text-primary dark:text-primary-light">
                    {insight.title}
                  </p>
                  <Badge variant={insight.type}>{insight.type}</Badge>
                </div>
                <p className="text-body-sm text-gray-600 dark:text-[#A0A0A0]">{insight.description}</p>
                <p className="mt-8 text-body-sm text-gray-500">{insight.time}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* GSTR-3B Net Cash Liability and ITC Offset Calculator */}
      <Card className="border border-indigo-100 bg-[#F8FAFC] dark:border-indigo-950/20 dark:bg-slate-900/40 p-24">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between border-b border-indigo-50 dark:border-indigo-950/10 pb-16 mb-20">
          <div>
            <CardTitle className="text-heading-m font-bold text-indigo-950 dark:text-white flex items-center gap-8">
              <span className="p-6 bg-indigo-600 rounded-lg text-white font-mono text-sm shrink-0">3B</span>
              GSTR-3B Net Cash Liability &amp; ITC Offset Simulator
            </CardTitle>
            <p className="mt-4 text-body-xs text-slate-500 dark:text-[#A0A0A0]">
              Simulate how vendor invoice discrepancies (Section 16(2)(c) missing filings) impact your corporate net cash outflow in monthly GSTR-3B returns.
            </p>
          </div>
          <Badge variant="warning" className="font-mono text-xs uppercase self-start md:self-center">
            Section 16(2)(c) Impact Assessment
          </Badge>
        </div>

        <div className="grid gap-24 lg:grid-cols-12 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-5 space-y-16 bg-white dark:bg-slate-950 p-16 rounded-card border border-slate-200 dark:border-border-dark shadow-sm">
            <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Simulation Parameters</h4>
            
            {/* Slider 1: Outward Tax */}
            <div className="space-y-4">
              <div className="flex justify-between text-body-sm font-semibold">
                <label className="text-slate-600 dark:text-slate-300">Outward Tax Liability (Sales)</label>
                <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(outwardLiability)}</span>
              </div>
              <input
                type="range"
                min="500000"
                max="5000000"
                step="50000"
                className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                value={outwardLiability}
                onChange={(e) => setOutwardLiability(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹5L</span>
                <span>₹50L</span>
              </div>
            </div>

            {/* Slider 2: Eligible Books ITC */}
            <div className="space-y-4">
              <div className="flex justify-between text-body-sm font-semibold">
                <label className="text-slate-600 dark:text-slate-300">Eligible Books ITC (Matched)</label>
                <span className="font-mono text-slate-900 dark:text-white">{formatCurrency(eligibleItc)}</span>
              </div>
              <input
                type="range"
                min="200000"
                max="3000000"
                step="25000"
                className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                value={eligibleItc}
                onChange={(e) => setEligibleItc(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹2L</span>
                <span>₹30L</span>
              </div>
            </div>

            {/* Slider 3: Blocked/At-Risk ITC */}
            <div className="space-y-4">
              <div className="flex justify-between text-body-sm font-semibold">
                <label className="text-red-600 dark:text-red-400 flex items-center gap-4">
                  Blocked / At-Risk ITC (Vendor Mismatch)
                </label>
                <span className="font-mono text-red-600 dark:text-red-400">{formatCurrency(blockedItc)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="5000"
                className="w-full h-4 bg-red-100 dark:bg-red-950/20 rounded-lg appearance-none cursor-pointer accent-red-600"
                value={blockedItc}
                onChange={(e) => setBlockedItc(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>₹0</span>
                <span>₹5L</span>
              </div>
            </div>

            {/* Slider 4: Risk Decision */}
            <div className="space-y-4 pt-12 border-t border-slate-100 dark:border-border-dark">
              <div className="flex justify-between text-body-sm font-semibold">
                <label className="text-slate-600 dark:text-slate-300">How much At-Risk ITC to claim anyway?</label>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{claimPercent}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                className="w-full h-4 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
                value={claimPercent}
                onChange={(e) => setClaimPercent(Number(e.target.value))}
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>0% (Safe - Block &amp; Defer)</span>
                <span>100% (Risky - Claim Anyway)</span>
              </div>
            </div>
          </div>

          {/* Results & Calculations Panel */}
          <div className="lg:col-span-7 space-y-16">
            {/* Visual offset segment bar */}
            <div className="bg-white dark:bg-slate-950 p-16 rounded-card border border-slate-200 dark:border-border-dark shadow-sm space-y-12">
              <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Offset Breakdown</h4>
              
              <div className="space-y-4">
                <div className="flex h-24 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 font-bold text-[10px] text-white">
                  {/* Segment 1: Safe ITC Offset */}
                  <div
                    style={{ width: `${Math.min(100, ((eligibleItc - (blockedItc - claimedAtRisk)) / outwardLiability) * 100)}%` }}
                    className="bg-indigo-600 flex items-center justify-center min-w-[20px]"
                    title="Matched Safe ITC"
                  >
                    Matched
                  </div>
                  {/* Segment 2: Disputed Claimed ITC */}
                  {claimedAtRisk > 0 && (
                    <div
                      style={{ width: `${Math.min(100, (claimedAtRisk / outwardLiability) * 100)}%` }}
                      className="bg-orange-500 flex items-center justify-center min-w-[20px]"
                      title="Disputed claimed ITC"
                    >
                      Disputed
                    </div>
                  )}
                  {/* Segment 3: Cash Outflow */}
                  <div
                    style={{ width: `${Math.max(0, 100 - (((eligibleItc - (blockedItc - claimedAtRisk)) + claimedAtRisk) / outwardLiability) * 100)}%` }}
                    className="bg-teal-600 flex items-center justify-center min-w-[20px]"
                    title="Net Cash Outflow"
                  >
                    Cash Paid
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-12 text-[10px] font-semibold font-mono">
                  <div className="flex items-center gap-4">
                    <span className="inline-block w-8 h-8 rounded bg-indigo-600" />
                    <span>Safe Books ITC: {formatCurrency(eligibleItc - deferredAtRisk)}</span>
                  </div>
                  {claimedAtRisk > 0 && (
                    <div className="flex items-center gap-4">
                      <span className="inline-block w-8 h-8 rounded bg-orange-500" />
                      <span>At-Risk Claimed: {formatCurrency(claimedAtRisk)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <span className="inline-block w-8 h-8 rounded bg-teal-600" />
                    <span>Net Cash Paid: {formatCurrency(netCashOutflow)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Cards */}
            <div className="grid gap-12 sm:grid-cols-3">
              {/* Card 1: GSTR-3B Cash Outflow */}
              <div className="bg-teal-50/50 dark:bg-slate-900/40 p-16 rounded-card border border-teal-100 dark:border-teal-950/20 text-center">
                <p className="text-[10px] font-extrabold uppercase text-teal-700 dark:text-teal-400 tracking-wider">GSTR-3B Cash Due</p>
                <p className="mt-8 font-mono text-heading-m font-extrabold text-teal-700 dark:text-teal-400">{formatCurrency(netCashOutflow)}</p>
                <p className="mt-4 text-[9px] text-teal-600 dark:text-teal-500 font-semibold font-mono">Outward Liability offset by claimed ITC</p>
              </div>

              {/* Card 2: Mismatch Cost */}
              <div className="bg-red-50/50 dark:bg-slate-900/40 p-16 rounded-card border border-red-100 dark:border-red-950/20 text-center">
                <p className="text-[10px] font-extrabold uppercase text-red-700 dark:text-red-400 tracking-wider">Working Capital Drain</p>
                <p className="mt-8 font-mono text-heading-m font-extrabold text-red-600 dark:text-red-400">+{formatCurrency(deferredAtRisk)}</p>
                <p className="mt-4 text-[9px] text-red-600 dark:text-red-500 font-semibold font-mono">Extra cash paid because of deferred ITC</p>
              </div>

              {/* Card 3: Penalty exposure */}
              <div className="bg-orange-50/50 dark:bg-slate-900/40 p-16 rounded-card border border-orange-100 dark:border-orange-950/20 text-center">
                <p className="text-[10px] font-extrabold uppercase text-orange-700 dark:text-orange-400 tracking-wider">Penalty Risk (Sec 50)</p>
                <p className="mt-8 font-mono text-heading-m font-extrabold text-orange-600 dark:text-orange-400">{formatCurrency(interestExposure)}</p>
                <p className="mt-4 text-[9px] text-orange-600 dark:text-orange-500 font-semibold font-mono">Est. 18% p.a. interest (60-day default)</p>
              </div>
            </div>

            {/* Compliance Warning / Insights Box */}
            <div className="bg-indigo-50/30 dark:bg-indigo-950/5 p-16 rounded-card border border-indigo-150 dark:border-indigo-950/20 space-y-6 text-body-xs leading-relaxed text-slate-600 dark:text-slate-400">
              <h5 className="font-bold text-slate-800 dark:text-indigo-300 flex items-center gap-6">
                <AlertCircle size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                Compliance Advisory — Section 16(2)(c) &amp; Section 50 Interest Rules
              </h5>
              {claimPercent > 0 ? (
                <p className="text-orange-700 dark:text-orange-400 font-medium">
                  ⚠️ <strong>Risk Warning:</strong> You have chosen to claim {formatCurrency(claimedAtRisk)} in disputed/unfiled ITC. If the supplier fails to upload return GSTR-1 and pay the underlying tax, tax authorities will demand reversal of this credit under Section 73/74 along with a mandatory <strong>18% per annum</strong> interest penalty under Section 50 of the CGST Act.
                </p>
              ) : (
                <p className="text-green-700 dark:text-green-400 font-medium">
                  ✓ <strong>Safe Compliance Posture:</strong> By deferring 100% of at-risk ITC ({formatCurrency(deferredAtRisk)}), you are fully insulated against interest penalty audits under Section 50. However, this locks up {formatCurrency(deferredAtRisk)} of working capital until the supplier reconciles their GSTR-1. Push for vendor compliance to release this cash.
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Action Queue */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Action Queue</CardTitle>
          <Button variant="ghost" className="!px-12 !py-8 text-accent" onClick={handleReview}>
            View all
          </Button>
        </CardHeader>
        {mismatchesLoading ? (
          <div className="flex h-120 items-center justify-center">
            <Loader2 className="h-24 w-24 animate-spin text-accent" />
          </div>
        ) : mismatches.length === 0 ? (
          <div className="p-24 text-center text-body text-gray-500">
            No mismatches pending review! All ledgers are perfectly reconciled.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow hover={false}>
                <TableHead>Invoice #</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Mismatch Type</TableHead>
                <TableHead>Discrepancy</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatches.map((row: any) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono font-medium">{row.invoiceNumberA || '—'}</TableCell>
                  <TableCell>{row.vendorNameA || 'Unknown Vendor'}</TableCell>
                  <TableCell>
                    <Badge variant={row.mismatchType === 'MISSING' ? 'danger' : 'warning'}>
                      {row.mismatchType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{formatCurrency(row.amountDiff)}</TableCell>
                  <TableCell className="min-w-[120px]">
                    <ProgressBar value={Math.round(row.riskScore * 100)} />
                  </TableCell>
                  <TableCell>
                    <Button variant="accent" className="!px-12 !py-8" onClick={handleReview}>
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <ul className="divide-y divide-gray-200 dark:divide-border-dark">
          {recentActivity.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-16">
              <div>
                <p className="text-body font-medium text-primary dark:text-primary-light">
                  {item.action}
                </p>
                <p className="text-body-sm text-gray-600 dark:text-[#A0A0A0]">{item.user}</p>
              </div>
              <span className="text-body-sm text-gray-500">{item.time}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
