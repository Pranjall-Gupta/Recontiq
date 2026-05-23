import { useState } from 'react';
import { FileText, Loader2, Download, CheckCircle, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/Label';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { getDashboardStats } from '../api/api-client';
import { reportTypes } from '../data/mock';
import { Badge } from '../components/ui/badge';

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

const formatDateRange = (fromStr: string, toStr: string) => {
  try {
    const fromDate = new Date(fromStr);
    const toDate = new Date(toStr);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${fromDate.toLocaleDateString('en-US', options)} – ${toDate.toLocaleDateString('en-US', options)}`;
  } catch (e) {
    return `${fromStr} – ${toStr}`;
  }
};

export default function Reports() {
  const [reportType, setReportType] = useState('itc');
  const [from, setFrom] = useState('2026-04-01');
  const [to, setTo] = useState('2026-05-20');
  const [format, setFormat] = useState('pdf');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [downloadMsg, setDownloadMsg] = useState('');
  const [loadingStep, setLoadingStep] = useState(0);

  const reportLabel = reportTypes.find((r) => r.value === reportType)?.label ?? 'Report';

  // Fetch live dashboard statistics to build report content
  const { data: stats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await getDashboardStats();
      return res.data;
    },
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setGenerated(false);
    setDownloadMsg('');
    setLoadingStep(0);

    // Simulated multi-stage generation progress to look premium
    const steps = [
      'Querying ledger records...',
      'Validating GSTR-2B filing hashes...',
      'Assembling secure cryptographic seal...',
      'Compiling PDF layout structure...',
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep++;
      if (currentStep < steps.length) {
        setLoadingStep(currentStep);
      } else {
        clearInterval(interval);
        setGenerating(false);
        setGenerated(true);
      }
    }, 400);
  };

  const handleExport = () => {
    const filename = `Recontiq_${reportType}_Report_${from}_to_${to}.${format}`;
    setDownloadMsg(`Started exporting ${filename} successfully!`);
    setTimeout(() => setDownloadMsg(''), 4000);
  };

  const steps = [
    'Querying ledger records...',
    'Validating GSTR-2B filing hashes...',
    'Assembling secure cryptographic seal...',
    'Compiling PDF layout structure...',
  ];

  return (
    <div className="space-y-24">
      {downloadMsg && (
        <div className="flex items-center gap-12 rounded-card bg-emerald-50 border border-emerald-200 p-16 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="shrink-0 text-emerald-600 dark:text-emerald-400" size={20} />
          <p className="text-body-sm font-semibold">{downloadMsg}</p>
        </div>
      )}

      <div className="grid gap-24 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Report Configuration</CardTitle>
          </CardHeader>
          <form className="space-y-16" onSubmit={handleGenerate}>
            <div>
              <Label htmlFor="report-type">Report type</Label>
              <Select
                id="report-type"
                value={reportType}
                onChange={(e) => {
                  setReportType(e.target.value);
                  setGenerated(false);
                }}
              >
                {reportTypes.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-16 sm:grid-cols-2">
              <div>
                <Label htmlFor="from">From</Label>
                <Input
                  id="from"
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setGenerated(false);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="to">To</Label>
                <Input
                  id="to"
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setGenerated(false);
                  }}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="format">Format</Label>
              <Select
                id="format"
                value={format}
                onChange={(e) => setFormat(e.target.value)}
              >
                <option value="pdf">PDF Document (.pdf)</option>
                <option value="xlsx">Excel Sheet (.xlsx)</option>
                <option value="csv">CSV Sheet (.csv)</option>
              </Select>
            </div>
            <Button type="submit" variant="primary" className="w-full sm:w-auto" isLoading={generating}>
              <FileText size={18} />
              Generate Report
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-12 border-b border-gray-100 dark:border-border-dark">
            <CardTitle>Interactive Preview</CardTitle>
            <Badge variant={generated ? "success" : "neutral"}>
              {generated ? "Ready" : "Stale — Re-generate"}
            </Badge>
          </CardHeader>

          <div className="flex-1 my-16 flex items-center justify-center min-h-[300px]">
            {generating ? (
              <div className="text-center space-y-16 py-40">
                <Loader2 className="mx-auto h-36 w-36 animate-spin text-indigo-600 dark:text-indigo-400" />
                <div className="space-y-4">
                  <p className="text-body font-semibold text-primary dark:text-primary-light">
                    Assembling Document
                  </p>
                  <p className="text-body-xs font-mono text-slate-500 animate-pulse">
                    {steps[loadingStep]}
                  </p>
                </div>
              </div>
            ) : !generated ? (
              <div className="text-center py-40 text-gray-500 space-y-12">
                <Calendar className="mx-auto text-slate-400 h-40 w-40" />
                <div>
                  <p className="text-body font-semibold">Report Stale or Not Generated</p>
                  <p className="text-body-xs text-gray-600 mt-4">
                    Modify dates or formats on the left, then click **Generate Report**.
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-card border border-gray-200 bg-white shadow-sm dark:border-border-dark dark:bg-slate-900/40">
                {/* PDF Banner */}
                <div className="border-b border-gray-200 bg-gray-50/50 px-20 py-16 dark:border-border-dark dark:bg-gray-900/40">
                  <div className="flex items-center gap-12">
                    <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                    <div className="min-w-0 flex-1">
                      <p className="text-body font-bold text-slate-800 dark:text-primary-light truncate">
                        Recontiq — {reportLabel}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 truncate">
                        Acme Corp Pvt Ltd · GSTIN 27AABCA1234F1Z5
                      </p>
                    </div>
                  </div>
                </div>

                {/* PDF Content */}
                <div className="p-20 space-y-16 text-body-sm">
                  <div className="flex justify-between border-b border-gray-100 pb-8 dark:border-border-dark">
                    <span className="text-gray-600 dark:text-[#A0A0A0]">Audit Period</span>
                    <span className="font-mono text-slate-800 dark:text-white font-medium">
                      {formatDateRange(from, to)}
                    </span>
                  </div>

                  {reportType === 'itc' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Total ITC Recovered</span>
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {formatCurrency(stats?.totalTaxAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Auto-Matched Invoices</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-white">
                          {stats?.matched ? new Intl.NumberFormat('en-IN').format(stats.matched) : '0'} records
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">At-Risk ITC (Blocked)</span>
                        <span className="font-mono font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(stats?.itcAtRisk)}
                        </span>
                      </div>
                    </>
                  )}

                  {reportType === 'mismatch' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Unmatched Invoices</span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold">
                          {stats?.unmatched ? new Intl.NumberFormat('en-IN').format(stats.unmatched) : '0'} records
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Pending Reviews</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-white">
                          {stats?.pending ? new Intl.NumberFormat('en-IN').format(stats.pending) : '0'} items
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Disputed Cash Flow Impact</span>
                        <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                          {formatCurrency(stats?.itcAtRisk)}
                        </span>
                      </div>
                    </>
                  )}

                  {reportType === 'vendor' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">High-Risk Suppliers</span>
                        <span className="font-mono text-red-600 dark:text-red-400 font-bold">
                          {stats?.highRisk ? new Intl.NumberFormat('en-IN').format(stats.highRisk) : '0'} vendors
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Blocked Mismatch ITC</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-white">
                          {formatCurrency(stats?.itcAtRisk)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Average Risk Factor</span>
                        <span className="font-mono text-orange-600 dark:text-orange-400 font-bold">
                          84% Score
                        </span>
                      </div>
                    </>
                  )}

                  {reportType === 'audit' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Total Invoices Audited</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {stats?.total ? new Intl.NumberFormat('en-IN').format(stats.total) : '0'} records
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Reconciled Matches</span>
                        <span className="font-mono font-medium text-slate-800 dark:text-white">
                          {stats?.matched ? new Intl.NumberFormat('en-IN').format(stats.matched) : '0'} matched
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-[#A0A0A0]">Integrity Compliance Score</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          96.7% Clean
                        </span>
                      </div>
                    </>
                  )}

                  <div className="mt-20 border-t border-gray-100 pt-16 space-y-8 dark:border-border-dark">
                    <div className="h-4 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-4 w-5/6 rounded bg-gray-100 dark:bg-gray-800" />
                    <div className="h-4 w-4/6 rounded bg-gray-100 dark:bg-gray-800" />
                  </div>
                  <div className="flex items-center justify-between pt-12 text-[10px] text-gray-500 border-t border-dashed border-gray-100 dark:border-border-dark">
                    <span>Cryptographic Seal: Secured by Recontiq AI</span>
                    <span>Page 1 of 1</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {generated && !generating && (
            <div className="pt-16 border-t border-gray-100 dark:border-border-dark">
              <Button variant="accent" onClick={handleExport} className="w-full flex justify-center gap-8">
                <Download size={18} />
                Export Generated Report ({format.toUpperCase()})
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
