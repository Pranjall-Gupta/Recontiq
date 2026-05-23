import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, Mail, CheckCircle2, AlertTriangle, AlertCircle, Loader2,
  Calendar, Search, Check, Copy, Info, HelpCircle, Printer, RotateCcw, Scale
} from 'lucide-react';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/Label';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/button';
import { Badge, type BadgeVariant } from '../components/ui/badge';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/ProgressBar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { 
  getMismatches, 
  resolveMismatch, 
  writeOffMismatch, 
  escalateMismatch,
  getInvoiceDetail,
  explainRisk,
  draftEmail,
  suggestAction
} from '../api/api-client';

const riskBadgeVariant: Record<string, BadgeVariant> = {
  critical: 'danger',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

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

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export default function Reconciliation() {
  const queryClient = useQueryClient();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [riskFilter, setRiskFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchVal, setSearchVal] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected Row & Resolution Actions State
  const [selected, setSelected] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'RESOLVE' | 'WRITE_OFF' | 'ESCALATE' | null>(null);
  const [noteText, setNoteText] = useState('');
  const [copied, setCopied] = useState(false);

  // Email Draft Workspace States
  const [recipientEmail, setRecipientEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // AI Copilot active tab
  const [copilotTab, setCopilotTab] = useState<'risk' | 'email' | 'decision' | 'notice'>('risk');
  const [noticeBody, setNoticeBody] = useState('');

  // Query: Mismatches
  const { data: mismatchesRes, isLoading: listLoading, error: listError } = useQuery({
    queryKey: ['mismatches', statusFilter, riskFilter, typeFilter],
    queryFn: async () => {
      const res = await getMismatches({
        status: statusFilter === 'all' ? undefined : statusFilter,
        riskLabel: riskFilter === 'all' ? undefined : riskFilter,
        type: typeFilter === 'all' ? undefined : typeFilter,
        size: 100, // retrieve a larger set so client-side fuzzy search is fast and comprehensive
      });
      return res.data;
    },
  });

  const rawMismatches = mismatchesRes?.content || [];

  // Client-side fuzzy text and date filtering
  const mismatches = rawMismatches.filter((row: any) => {
    // Search
    if (searchVal.trim()) {
      const query = searchVal.toLowerCase();
      const vendorNameA = (row.vendorNameA || '').toLowerCase();
      const vendorNameB = (row.vendorNameB || '').toLowerCase();
      const invoiceNumber = (row.invoiceNumberA || '').toLowerCase();
      const gstin = (row.gstinA || '').toLowerCase();
      const type = (row.mismatchType || '').toLowerCase();

      if (
        !vendorNameA.includes(query) &&
        !vendorNameB.includes(query) &&
        !invoiceNumber.includes(query) &&
        !gstin.includes(query) &&
        !type.includes(query)
      ) {
        return false;
      }
    }

    // Date From
    if (dateFrom && row.createdAt) {
      const rowDate = row.createdAt.substring(0, 10);
      if (rowDate < dateFrom) return false;
    }

    // Date To
    if (dateTo && row.createdAt) {
      const rowDate = row.createdAt.substring(0, 10);
      if (rowDate > dateTo) return false;
    }

    return true;
  });

  // Queries for Details (run only when a row is selected)
  const { data: invoiceADetail, isLoading: loadingInvoiceA } = useQuery({
    queryKey: ['invoiceDetail', selected?.invoiceIdA],
    queryFn: async () => {
      if (!selected?.invoiceIdA) return null;
      const res = await getInvoiceDetail(selected.invoiceIdA);
      return res.data;
    },
    enabled: !!selected?.invoiceIdA,
  });

  const { data: invoiceBDetail, isLoading: loadingInvoiceB } = useQuery({
    queryKey: ['invoiceDetail', selected?.invoiceIdB],
    queryFn: async () => {
      if (!selected?.invoiceIdB) return null;
      const res = await getInvoiceDetail(selected.invoiceIdB);
      return res.data;
    },
    enabled: !!selected?.invoiceIdB,
  });

  // AI Copilot Mutations
  const explainRiskMutation = useMutation({
    mutationFn: async (mismatchId: string) => {
      const res = await explainRisk(mismatchId);
      return res.data;
    },
  });

  const draftEmailMutation = useMutation({
    mutationFn: async (mismatchId: string) => {
      const res = await draftEmail(mismatchId);
      return res.data;
    },
  });

  const suggestActionMutation = useMutation({
    mutationFn: async (mismatchId: string) => {
      const res = await suggestAction(mismatchId);
      return res.data;
    },
  });

  // Resolution Actions Mutations
  const resolveMutation = useMutation({
    mutationFn: async (payload: { id: string; note: string }) => {
      const res = await resolveMismatch(payload.id, payload.note, 'Priya');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mismatches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMismatches'] });
      setSelected(null);
      setActionType(null);
      setNoteText('');
    },
  });

  const writeOffMutation = useMutation({
    mutationFn: async (payload: { id: string; note: string }) => {
      const res = await writeOffMismatch(payload.id, payload.note, 'Priya');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mismatches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMismatches'] });
      setSelected(null);
      setActionType(null);
      setNoteText('');
    },
  });

  const escalateMutation = useMutation({
    mutationFn: async (payload: { id: string; note: string }) => {
      const res = await escalateMismatch(payload.id, payload.note, 'Priya');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mismatches'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMismatches'] });
      setSelected(null);
      setActionType(null);
      setNoteText('');
    },
  });

  // Automatically reset AI states on row change
  useEffect(() => {
    explainRiskMutation.reset();
    draftEmailMutation.reset();
    suggestActionMutation.reset();
    escalateMutation.reset();
    setActionType(null);
    setNoteText('');
    setCopilotTab('risk');
  }, [selected?.id]);

  // Default legal notice generator helper
  const getNoticeDefaultText = (row: any, erp: any, _gstr2b: any) => {
    if (!row) return '';
    const invoiceNum = row.invoiceNumberA || '—';
    const invoiceDateStr = formatDate(erp?.invoiceDate || row.createdAt);
    const vendorName = row.vendorNameA || '—';
    const taxableVal = formatCurrency(erp?.amount || row.amountDiff);
    const taxAmt = formatCurrency(erp?.taxAmount || row.amountDiff);

    return `Pursuant to the provisions of Section 16(2)(c) of the Central Goods and Services Tax (CGST) Act, 2017, this formal notice of statutory discrepancy is hereby served upon you.

Our records indicate that we purchased taxable goods and/or services from you under Invoice Reference Number ${invoiceNum} dated ${invoiceDateStr} for a total taxable value of ${taxableVal}, on which a CGST/SGST/IGST tax component of ${taxAmt} was charged and collected by you.

However, during our routine reconciliation audit for the GST filing period, we identified that this invoice has not been uploaded in your GSTR-1 return, leading to a direct omission from our GSTR-2B government auto-drafted statement.

As a registered recipient, our eligibility to claim Input Tax Credit (ITC) is strictly contingent under Section 16(2)(c) of the CGST Act upon the condition that the tax charged in respect of such supply has been actually deposited and filed by the supplier. Your failure to upload this return blocks our Input Tax Credit claims, resulting in statutory non-compliance and direct corporate financial loss.

DEMAND ACTION REQUIRED:
You are hereby commanded to immediately upload the aforementioned invoice in your GSTR-1 return and ensure the corresponding liability is fully discharged in your GSTR-3B return. 

Failure to rectify this mismatch within seven (7) business days of receipt of this demand notice will compel our legal and finance departments to:
1. Withhold all pending and future disbursements due to ${vendorName}.
2. Incept official recovery proceedings for the blocked tax along with statutory interest.
3. Lodge a formal non-compliance grievance with your jurisdictional GST Commissionerate.

We expect your prompt compliance to avoid further escalation.`;
  };

  // Pre-fill email states when selection or drafted email changes
  useEffect(() => {
    if (draftEmailMutation.data?.emailDraft) {
      setEmailBody(draftEmailMutation.data.emailDraft);
    } else {
      setEmailBody('');
    }
    if (selected) {
      const slug = (selected.vendorNameA || 'vendor').toLowerCase().replace(/[^a-z0-9]/g, '');
      setRecipientEmail(`compliance@${slug}.com`);
      setEmailSubject(`GST Compliance Discrepancy — Inv: ${selected.invoiceNumberA || 'NA'}`);
    } else {
      setRecipientEmail('');
      setEmailSubject('');
    }
  }, [draftEmailMutation.data, selected]);

  // Pre-fill legal notice states when selection or details change
  useEffect(() => {
    if (selected) {
      setNoticeBody(getNoticeDefaultText(selected, invoiceADetail, invoiceBDetail));
    } else {
      setNoticeBody('');
    }
  }, [selected, invoiceADetail, invoiceBDetail]);

  const handleCopyEmail = () => {
    if (emailBody) {
      navigator.clipboard.writeText(emailBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendEmail = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailtoUrl, '_blank');
  };

  const executeResolution = () => {
    if (!selected) return;
    if (actionType === 'RESOLVE') {
      resolveMutation.mutate({ id: selected.id, note: noteText });
    } else if (actionType === 'WRITE_OFF') {
      writeOffMutation.mutate({ id: selected.id, note: noteText });
    } else if (actionType === 'ESCALATE') {
      escalateMutation.mutate({ id: selected.id, note: noteText });
    }
  };

  return (
    <div className="space-y-24">
      {/* Dynamic Filter Section */}
      <Card className="p-20 border border-gray-200 dark:border-border-dark shadow-sm no-print">
        <div className="grid gap-16 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="date-from" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Filing Date From</Label>
            <div className="relative mt-4">
              <Calendar className="absolute left-12 top-1/2 h-16 w-16 -translate-y-1/2 text-gray-400" />
              <Input
                id="date-from"
                type="date"
                className="pl-36 !py-8 bg-gray-50 dark:bg-slate-900 border-gray-200"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="date-to" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Filing Date To</Label>
            <div className="relative mt-4">
              <Calendar className="absolute left-12 top-1/2 h-16 w-16 -translate-y-1/2 text-gray-400" />
              <Input
                id="date-to"
                type="date"
                className="pl-36 !py-8 bg-gray-50 dark:bg-slate-900 border-gray-200"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vendor" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Vendor Search</Label>
            <div className="relative mt-4">
              <Search className="absolute left-12 top-1/2 h-16 w-16 -translate-y-1/2 text-gray-400" />
              <Input
                id="vendor"
                placeholder="Search vendor name, invoice #, GSTIN..."
                className="pl-36 !py-8 bg-gray-50 dark:bg-slate-900 border-gray-200"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Reconciliation Status</Label>
            <Select
              id="status"
              className="mt-4 !py-8 bg-gray-50 dark:bg-slate-900 border-gray-200"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="WRITTEN_OFF">Written Off</option>
              <option value="ESCALATED">Escalated</option>
            </Select>
          </div>
        </div>

        <div className="grid gap-16 mt-16 sm:grid-cols-2">
          <div>
            <Label htmlFor="risk" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">AI Risk Classification</Label>
            <Select
              id="risk"
              className="mt-4 !py-8 bg-gray-50 dark:bg-slate-900 border-gray-200"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Risk (Score &gt;= 85%)</option>
              <option value="high">High Risk (60% - 85%)</option>
              <option value="medium">Medium Risk (40% - 60%)</option>
              <option value="low">Low Risk (&lt; 40%)</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="type" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">Mismatch Reason</Label>
            <Select
              id="type"
              className="mt-4 !py-8 bg-gray-50 dark:bg-slate-900 border-gray-200"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Discrepancy Types</option>
              <option value="NAME">Vendor Name Variation</option>
              <option value="AMOUNT">CGST/SGST Amount Difference</option>
              <option value="MISSING">Missing in GSTR-2B</option>
              <option value="DATE">Filing Date Lag</option>
              <option value="GSTIN">Shared GSTIN Conflict</option>
            </Select>
          </div>
        </div>
      </Card>

      {/* Dynamic Data Grid */}
      <Card className="overflow-hidden p-0 border border-gray-200 dark:border-border-dark shadow-sm no-print">
        {listLoading ? (
          <div className="flex h-[300px] flex-col items-center justify-center space-y-16">
            <Loader2 className="h-32 w-32 animate-spin text-accent" />
            <p className="text-body-sm text-gray-500">Retrieving live compliance ledger...</p>
          </div>
        ) : listError ? (
          <div className="flex h-[300px] flex-col items-center justify-center p-24 text-center">
            <AlertCircle className="h-48 w-48 text-error mb-16" />
            <h4 className="text-heading-s text-primary dark:text-primary-light">Failed to query mismatches</h4>
            <p className="mt-8 text-body-sm text-gray-500 max-w-sm">
              An error occurred while calling GET /api/v1/reconcile/mismatches. Check backend API logs.
            </p>
          </div>
        ) : mismatches.length === 0 ? (
          <div className="flex h-[260px] flex-col items-center justify-center p-24 text-center">
            <CheckCircle2 className="h-48 w-48 text-success mb-16" />
            <h4 className="text-heading-s text-primary dark:text-primary-light">All records clean!</h4>
            <p className="mt-8 text-body-sm text-gray-500 max-w-sm">
              No mismatches pending review or matches the selected filters. All databases are in dynamic balance.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow hover={false}>
                <TableHead>Invoice #</TableHead>
                <TableHead>ERP Vendor</TableHead>
                <TableHead>Mismatch Type</TableHead>
                <TableHead>Discrepancy</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Filing Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mismatches.map((row: any) => (
                <TableRow 
                  key={row.id} 
                  className="cursor-pointer transition-colors duration-150 hover:bg-gray-50/50 dark:hover:bg-slate-900/30"
                  onClick={() => setSelected(row)}
                >
                  <TableCell className="font-mono font-semibold text-primary dark:text-primary-light">{row.invoiceNumberA || '—'}</TableCell>
                  <TableCell>
                    <span className="font-medium text-gray-900 dark:text-white">{row.vendorNameA || '—'}</span>
                    {row.vendorNameB && row.vendorNameA !== row.vendorNameB && (
                      <span className="block text-body-xs text-gray-400">2B: {row.vendorNameB}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral" className="!px-8 !py-2 text-[11px] border border-gray-200 dark:border-border-dark font-mono font-bold tracking-wider">
                      {row.mismatchType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-error font-medium">
                    {row.amountDiff && parseFloat(row.amountDiff.toString()) > 0 ? (
                      `+${formatCurrency(row.amountDiff)}`
                    ) : (
                      formatCurrency(row.amountDiff)
                    )}
                  </TableCell>
                  <TableCell className="min-w-[130px]">
                    <div className="flex items-center gap-8">
                      <span className="text-body-xs font-semibold font-mono w-28 text-right">
                        {Math.round(row.riskScore * 100)}%
                      </span>
                      <ProgressBar 
                        value={Math.round(row.riskScore * 100)} 
                        className={row.riskScore >= 0.85 ? 'bg-error' : row.riskScore >= 0.6 ? 'bg-warning' : 'bg-accent'} 
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.status === 'RESOLVED' ? 'success' : row.status === 'WRITTEN_OFF' ? 'neutral' : row.status === 'ESCALATED' ? 'danger' : 'warning'}>
                      {row.status === 'PENDING' ? 'PENDING REVIEW' : row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-body-sm text-gray-500 font-mono">
                    {formatDate(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      className="!px-12 !py-6 text-accent font-semibold hover:bg-accent/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(row);
                      }}
                    >
                      Open Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Comprehensive Reconciliation Details Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Mismatch Workspace — ${selected.invoiceNumberA || 'Detail'}` : ''}
        maxWidth="max-w-5xl"
      >
        {selected ? (
          <div className="space-y-24">
            
            {/* Metadata bar */}
            <div className="flex flex-wrap gap-12 items-center justify-between border-b border-gray-100 dark:border-border-dark pb-12 text-body-sm no-print">
              <div className="flex items-center gap-12">
                <span className="text-gray-500">Risk Label:</span>
                <Badge variant={riskBadgeVariant[selected.riskLabel] || 'neutral'} className="font-semibold uppercase font-mono">
                  {selected.riskLabel} Risk
                </Badge>
              </div>
              <div className="flex items-center gap-12">
                <span className="text-gray-500">Mismatch Type:</span>
                <span className="font-bold font-mono text-gray-800 dark:text-gray-200">{selected.mismatchType}</span>
              </div>
              <div className="flex items-center gap-12">
                <span className="text-gray-500">Variance:</span>
                <span className="font-semibold text-error font-mono">{formatCurrency(selected.amountDiff)}</span>
              </div>
            </div>

            {/* Comparison panels */}
            <div className="grid gap-16 md:grid-cols-2 no-print">
              {/* ERP books panel */}
              <div className="rounded-card border border-gray-200 p-20 dark:border-border-dark bg-gray-50/30 dark:bg-slate-900/10">
                <h4 className="mb-16 text-heading-s font-bold text-[#1E1B4B] dark:text-[#A0A0A0] flex items-center gap-8">
                  <span className="inline-block h-8 w-8 rounded bg-[#1E1B4B] text-white text-xs font-bold flex items-center justify-center">1</span>
                  Books (ERP Ledger)
                </h4>
                
                {loadingInvoiceA ? (
                  <div className="space-y-12 py-12 animate-pulse">
                    <div className="h-16 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-16 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-16 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
                  </div>
                ) : invoiceADetail ? (
                  <dl className="space-y-12 text-body-sm">
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Vendor name</dt>
                      <dd className="text-right font-medium text-gray-900 dark:text-white">{invoiceADetail.vendorName || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">GSTIN</dt>
                      <dd className="font-mono font-medium text-gray-900 dark:text-white">{invoiceADetail.gstin || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Taxable value</dt>
                      <dd className="font-mono font-semibold text-gray-950 dark:text-white">{formatCurrency(invoiceADetail.amount)}</dd>
                    </div>
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Tax amount (ITC)</dt>
                      <dd className="font-mono font-semibold text-accent">{formatCurrency(invoiceADetail.taxAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-16 pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Invoice date</dt>
                      <dd className="font-mono font-semibold text-gray-900 dark:text-white">{formatDate(invoiceADetail.invoiceDate)}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="flex flex-col items-center justify-center p-16 bg-gray-100 dark:bg-gray-900/50 rounded-card text-center">
                    <HelpCircle className="h-24 w-24 text-gray-400 mb-8" />
                    <p className="text-body-sm font-semibold text-gray-600 dark:text-gray-400">ERP Invoice Not Found</p>
                    <p className="text-body-xs text-gray-400 mt-4">Unable to locate source invoice in Books.</p>
                  </div>
                )}
              </div>

              {/* GSTR-2B panel */}
              <div className="rounded-card border border-gray-200 p-20 dark:border-border-dark bg-gray-50/30 dark:bg-slate-900/10">
                <h4 className="mb-16 text-heading-s font-bold text-teal-700 dark:text-teal-400 flex items-center gap-8">
                  <span className="inline-block h-8 w-8 rounded bg-teal-600 text-white text-xs font-bold flex items-center justify-center">2</span>
                  Government GSTR-2B Portal
                </h4>
                
                {selected.mismatchType === 'MISSING' ? (
                  <div className="flex flex-col items-center justify-center h-[160px] border border-dashed border-red-200 bg-red-50/20 dark:border-red-900/20 dark:bg-red-900/10 rounded-card p-16 text-center">
                    <AlertTriangle className="h-32 w-32 text-error mb-12 animate-pulse" />
                    <h5 className="text-body-sm font-bold text-error">Missing in GSTR-2B</h5>
                    <p className="text-body-xs text-gray-500 dark:text-gray-400 mt-4 max-w-[240px]">
                      The vendor has not uploaded this invoice or filed their return. No government record exists!
                    </p>
                  </div>
                ) : loadingInvoiceB ? (
                  <div className="space-y-12 py-12 animate-pulse">
                    <div className="h-16 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-16 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
                    <div className="h-16 w-5/6 bg-gray-200 dark:bg-gray-800 rounded" />
                  </div>
                ) : invoiceBDetail ? (
                  <dl className="space-y-12 text-body-sm">
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Vendor name (2B)</dt>
                      <dd className="text-right font-medium text-gray-900 dark:text-white">{invoiceBDetail.vendorName || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">GSTIN</dt>
                      <dd className="font-mono font-medium text-gray-900 dark:text-white">{invoiceBDetail.gstin || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Taxable value (2B)</dt>
                      <dd className="font-mono font-semibold text-gray-950 dark:text-white">{formatCurrency(invoiceBDetail.amount)}</dd>
                    </div>
                    <div className="flex justify-between gap-16 border-b border-gray-100 dark:border-border-dark pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Tax amount (2B)</dt>
                      <dd className="font-mono font-semibold text-teal-600 dark:text-teal-400">{formatCurrency(invoiceBDetail.taxAmount)}</dd>
                    </div>
                    <div className="flex justify-between gap-16 pb-8">
                      <dt className="text-gray-500 dark:text-[#A0A0A0]">Filing date</dt>
                      <dd className="font-mono font-semibold text-gray-900 dark:text-white">{formatDate(invoiceBDetail.invoiceDate)}</dd>
                    </div>
                  </dl>
                ) : (
                  <div className="flex flex-col items-center justify-center p-16 bg-gray-100 dark:bg-gray-900/50 rounded-card text-center">
                    <HelpCircle className="h-24 w-24 text-gray-400 mb-8" />
                    <p className="text-body-sm font-semibold text-gray-600 dark:text-gray-400">GSTR-2B Invoice Not Loaded</p>
                    <p className="text-body-xs text-gray-400 mt-4">Unable to load government return details.</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Agent Copilot Workspace */}
            <div className="rounded-card border border-indigo-100 bg-[#EEF2F6]/30 dark:border-indigo-950/20 dark:bg-[#1E1B4B]/10 p-20">
              <div className="mb-16 flex items-center justify-between border-b border-indigo-100 dark:border-indigo-950/20 pb-12 no-print">
                <div className="flex items-center gap-8 text-[#4F46E5] dark:text-indigo-400">
                  <Sparkles size={20} className="animate-pulse" />
                  <h4 className="text-heading-s font-bold">AI Agent Copilot Workspace</h4>
                </div>
                <div className="flex rounded-button bg-gray-100 p-4 dark:bg-slate-900 border border-gray-200 dark:border-border-dark text-xs overflow-x-auto gap-4">
                  <button
                    onClick={() => setCopilotTab('risk')}
                    className={`rounded-button px-12 py-6 font-semibold transition-all whitespace-nowrap ${
                      copilotTab === 'risk' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    💡 Hinglish Analysis
                  </button>
                  <button
                    onClick={() => setCopilotTab('email')}
                    className={`rounded-button px-12 py-6 font-semibold transition-all whitespace-nowrap ${
                      copilotTab === 'email' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    ✉️ Vendor Email Draft
                  </button>
                  <button
                    onClick={() => setCopilotTab('decision')}
                    className={`rounded-button px-12 py-6 font-semibold transition-all whitespace-nowrap ${
                      copilotTab === 'decision' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    🤖 Recommendation
                  </button>
                  <button
                    onClick={() => setCopilotTab('notice')}
                    className={`rounded-button px-12 py-6 font-semibold transition-all whitespace-nowrap ${
                      copilotTab === 'notice' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    ⚖️ Legal Notice (16(2)(c))
                  </button>
                </div>
              </div>

              {/* Tab 1: Hinglish Analysis */}
              {copilotTab === 'risk' && (
                <div className="space-y-12">
                  {explainRiskMutation.isIdle && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <Sparkles className="h-32 w-32 text-indigo-400 mb-12" />
                      <h5 className="text-body font-bold text-gray-800 dark:text-gray-200">Request AI Risk Analysis</h5>
                      <p className="text-body-sm text-gray-500 max-w-sm mt-4">
                        Ask Ollama llama3.2 to write a plain-English Hinglish analysis outlining what caused this discrepancy and the risks involved.
                      </p>
                      <Button
                        variant="accent"
                        className="mt-16"
                        onClick={() => explainRiskMutation.mutate(selected.id)}
                      >
                        <Sparkles size={16} />
                        Run AI Analysis
                      </Button>
                    </div>
                  )}

                  {explainRiskMutation.isPending && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-12">
                      <Loader2 className="h-32 w-32 animate-spin text-accent" />
                      <p className="text-body-sm text-indigo-600 dark:text-indigo-400 animate-pulse font-semibold">
                        Ollama llama3.2 is analyzing GSTIN histories, vendor variance vectors, and tax differences...
                      </p>
                    </div>
                  )}

                  {explainRiskMutation.isError && (
                    <div className="p-16 border border-red-200 bg-red-50 text-red-700 rounded-card flex gap-12">
                      <AlertCircle className="h-20 w-20 shrink-0" />
                      <div>
                        <h6 className="font-bold text-body-sm">AI Agent Execution Failed</h6>
                        <p className="text-body-xs mt-4">Ollama service at localhost:11434 returned an error or is unreachable. Ensure Ollama is running llama3.2.</p>
                      </div>
                    </div>
                  )}

                  {explainRiskMutation.isSuccess && (
                    <div className="rounded-card border border-green-200 bg-green-50/20 p-16 dark:border-green-950/20 dark:bg-green-950/5">
                      <div className="mb-12 flex items-center gap-8 text-green-700 dark:text-green-400">
                        <CheckCircle2 size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">AI Analysis Ready (ollama/llama3.2)</span>
                      </div>
                      <p className="text-body-sm leading-relaxed text-gray-700 dark:text-gray-300 font-medium italic">
                        "{explainRiskMutation.data.explanation}"
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Vendor Email Draft */}
              {copilotTab === 'email' && (
                <div className="space-y-12">
                  {draftEmailMutation.isIdle && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <Mail className="h-32 w-32 text-indigo-400 mb-12" />
                      <h5 className="text-body font-bold text-gray-800 dark:text-gray-200">Draft Vendor Discrepancy Email</h5>
                      <p className="text-body-sm text-gray-500 max-w-sm mt-4">
                        Generate a professional clarification request email complete with the invoice number, GSTR-2B filing variance, and clear next steps.
                      </p>
                      <Button
                        variant="accent"
                        className="mt-16"
                        onClick={() => draftEmailMutation.mutate(selected.id)}
                      >
                        <Mail size={16} />
                        Draft Vendor Email
                      </Button>
                    </div>
                  )}

                  {draftEmailMutation.isPending && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-12">
                      <Loader2 className="h-32 w-32 animate-spin text-accent" />
                      <p className="text-body-sm text-indigo-600 dark:text-indigo-400 animate-pulse font-semibold">
                        Ollama is drafting email with professional, assertive tax reconciliation phrasing...
                      </p>
                    </div>
                  )}

                  {draftEmailMutation.isError && (
                    <div className="p-16 border border-red-200 bg-red-50 text-red-700 rounded-card flex gap-12">
                      <AlertCircle className="h-20 w-20 shrink-0" />
                      <div>
                        <h6 className="font-bold text-body-sm">AI Agent Execution Failed</h6>
                        <p className="text-body-xs mt-4">Ollama service at localhost:11434 returned an error or is unreachable.</p>
                      </div>
                    </div>
                  )}

                  {draftEmailMutation.isSuccess && (
                    <div className="space-y-16">
                      <div className="grid gap-12 sm:grid-cols-2">
                        <div>
                          <Label htmlFor="vendor-email" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                            Recipient Email
                          </Label>
                          <Input
                            id="vendor-email"
                            type="email"
                            placeholder="compliance@vendor.com"
                            className="mt-4 !py-6 bg-white dark:bg-slate-900 border-indigo-150 focus:ring-accent"
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email-subject" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                            Subject
                          </Label>
                          <Input
                            id="email-subject"
                            type="text"
                            placeholder="GST Compliance Discrepancy"
                            className="mt-4 !py-6 bg-white dark:bg-slate-900 border-indigo-150 focus:ring-accent"
                            value={emailSubject}
                            onChange={(e) => setEmailSubject(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="email-body" className="text-xs font-semibold text-gray-500 uppercase tracking-wider dark:text-gray-400">
                            Email Body (Editable)
                          </Label>
                          <div className="flex gap-8">
                            <Button
                              variant="secondary"
                              className="!px-12 !py-6 text-xs"
                              onClick={handleCopyEmail}
                            >
                              {copied ? (
                                <>
                                  <Check size={12} className="text-success" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  Copy Draft
                                </>
                              )}
                            </Button>
                            
                            <Button
                              variant="accent"
                              className="!px-12 !py-6 text-xs bg-indigo-600 text-white hover:bg-indigo-700 font-bold"
                              onClick={handleSendEmail}
                              disabled={!recipientEmail || !emailBody}
                            >
                              <Mail size={12} />
                              Send via Mail Client
                            </Button>
                          </div>
                        </div>
                        <textarea
                          id="email-body"
                          className="w-full h-160 rounded-card border border-indigo-150 p-16 font-mono text-xs leading-relaxed text-gray-800 bg-white dark:bg-slate-900 dark:border-indigo-950/40 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent"
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Recommendation */}
              {copilotTab === 'decision' && (
                <div className="space-y-12">
                  {suggestActionMutation.isIdle && (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <Sparkles className="h-32 w-32 text-indigo-400 mb-12" />
                      <h5 className="text-body font-bold text-gray-800 dark:text-gray-200">Fetch AI Action Suggestion</h5>
                      <p className="text-body-sm text-gray-500 max-w-sm mt-4">
                        Ollama will evaluate the risk metrics, amount difference severity, and suggest if you should auto-resolve, write-off, or escalate.
                      </p>
                      <Button
                        variant="accent"
                        className="mt-16"
                        onClick={() => suggestActionMutation.mutate(selected.id)}
                      >
                        Get Recommendation
                      </Button>
                    </div>
                  )}

                  {suggestActionMutation.isPending && (
                    <div className="flex flex-col items-center justify-center py-24 space-y-12">
                      <Loader2 className="h-32 w-32 animate-spin text-accent" />
                      <p className="text-body-sm text-indigo-600 dark:text-indigo-400 animate-pulse font-semibold">
                        Ollama llama3.2 is scoring confidence metrics and checking policy parameters...
                      </p>
                    </div>
                  )}

                  {suggestActionMutation.isError && (
                    <div className="p-16 border border-red-200 bg-red-50 text-red-700 rounded-card flex gap-12">
                      <AlertCircle className="h-20 w-20 shrink-0" />
                      <div>
                        <h6 className="font-bold text-body-sm">AI Agent Execution Failed</h6>
                        <p className="text-body-xs mt-4">Ollama service at localhost:11434 returned an error or is unreachable.</p>
                      </div>
                    </div>
                  )}

                  {suggestActionMutation.isSuccess && (
                    <div className="rounded-card border border-indigo-200 bg-indigo-50/20 p-16 dark:border-indigo-950/20 dark:bg-indigo-950/5 space-y-12">
                      <div className="flex flex-wrap items-center justify-between gap-12">
                        <div className="flex items-center gap-8">
                          <span className="text-xs font-bold text-gray-500 uppercase">Recommended Action:</span>
                          <Badge variant={
                            suggestActionMutation.data.action === 'auto_resolve' ? 'success' :
                            suggestActionMutation.data.action === 'write_off' ? 'neutral' :
                            suggestActionMutation.data.action === 'escalate_to_ca' ? 'danger' : 'warning'
                          } className="font-mono uppercase font-bold text-xs">
                            {suggestActionMutation.data.action.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-8">
                          <span className="text-xs font-bold text-gray-500">Confidence Score:</span>
                          <span className="font-mono font-bold text-body-sm text-indigo-600 dark:text-indigo-400">
                            {Math.round(suggestActionMutation.data.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="border-t border-indigo-100 dark:border-indigo-950/20 pt-12">
                        <p className="text-body-sm text-gray-700 dark:text-gray-300 font-medium">
                          <strong>AI Rationale:</strong> {suggestActionMutation.data.reason}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Legal Notice */}
              {copilotTab === 'notice' && (
                <div className="space-y-16">
                  <div className="flex items-center justify-between no-print">
                    <div>
                      <h5 className="text-body font-bold text-gray-800 dark:text-gray-200 flex items-center gap-8">
                        <Scale size={18} className="text-[#4F46E5]" />
                        Section 16(2)(c) Legal Notice &amp; Print Builder
                      </h5>
                      <p className="text-body-xs text-gray-500 mt-2">
                        Compile and audit dynamic legal notices demanding return filing. Rectification warnings protect your eligible Input Tax Credits (ITC).
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-20 lg:grid-cols-12 items-start">
                    {/* Left panel: Editor Controls */}
                    <div className="lg:col-span-5 space-y-16 no-print">
                      <div className="rounded-card border border-indigo-100 bg-white dark:border-indigo-950/20 dark:bg-slate-900 p-16 space-y-12">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="notice-body-editor" className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            Legal Text Editor
                          </Label>
                          <Button
                            variant="secondary"
                            className="!px-10 !py-4 text-xs flex items-center gap-4 text-slate-600 hover:bg-slate-100 dark:text-[#A0A0A0]"
                            onClick={() => setNoticeBody(getNoticeDefaultText(selected, invoiceADetail, invoiceBDetail))}
                          >
                            <RotateCcw size={12} />
                            Reset Draft
                          </Button>
                        </div>
                        <textarea
                          id="notice-body-editor"
                          className="w-full h-[320px] rounded-card border border-gray-300 p-12 text-xs leading-relaxed text-gray-800 bg-gray-50 dark:bg-slate-950 dark:border-border-dark dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-accent"
                          value={noticeBody}
                          onChange={(e) => setNoticeBody(e.target.value)}
                        />
                        
                        <Button
                          variant="accent"
                          className="w-full !py-12 bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center justify-center gap-8 shadow-sm transition-all"
                          onClick={() => window.print()}
                          disabled={!noticeBody.trim()}
                        >
                          <Printer size={16} />
                          Print &amp; Download Notice PDF
                        </Button>
                      </div>
                    </div>

                    {/* Right panel: Live A4 Corporate Letterhead Mockup */}
                    <div className="lg:col-span-7 flex justify-center w-full">
                      <div className="printable-legal-notice shadow-lg border border-gray-300 dark:border-border-dark bg-white text-slate-800 p-32 md:p-40 rounded-card print:shadow-none print:border-none print:p-0 w-full min-h-[640px] flex flex-col justify-between font-sans">
                        
                        {/* Header */}
                        <div>
                          <div className="grid grid-cols-2 gap-16 border-b border-gray-200 pb-16 print:border-black">
                            {/* Left Column: Logo & Branding */}
                            <div className="space-y-4">
                              <div className="flex items-center gap-8">
                                <Scale className="text-indigo-600 print:text-black w-24 h-24" />
                                <span className="font-extrabold text-body font-sans text-slate-900 print:text-black tracking-wide uppercase">
                                  RECONTIQ compliance LABS
                                </span>
                              </div>
                              <div className="pl-32">
                                <span className="block text-[10px] font-bold text-indigo-500 uppercase tracking-widest print:text-black">
                                  Legal &amp; Tax Operations Division
                                </span>
                              </div>
                            </div>

                            {/* Right Column: Address */}
                            <div className="text-right text-[10px] text-gray-500 space-y-2 font-mono print:text-black print:text-[8px]">
                              <p className="font-bold text-slate-800 print:text-black">Acme Corporation Private Limited</p>
                              <p>E-19, Connaught Place, New Delhi - 110001</p>
                              <p>legal@recontiq.com | +91 11 4982 9901</p>
                              <p>GSTIN: 07AAACR1294F1Z1</p>
                            </div>
                          </div>

                          {/* Document Title */}
                          <div className="my-16 text-center">
                            <h3 className="font-extrabold text-heading-s uppercase tracking-wider text-slate-900 underline print:text-black print:text-xs">
                              NOTICE OF NON-COMPLIANCE UNDER SECTION 16(2)(c) OF THE CGST ACT, 2017
                            </h3>
                          </div>

                          {/* Metadata Table */}
                          <div className="my-16 overflow-x-auto">
                            <table className="w-full text-[10px] text-left border-collapse border border-gray-200 print:border-black">
                              <thead>
                                <tr className="bg-gray-50 print:bg-transparent">
                                  <th className="p-6 border border-gray-200 font-bold print:border-black">Reference Number</th>
                                  <th className="p-6 border border-gray-200 font-mono print:border-black">
                                    RECON/LEGAL/2026/{(selected.invoiceNumberA || 'DISC').replace(/[^a-zA-Z0-9]/g, '')}
                                  </th>
                                  <th className="p-6 border border-gray-200 font-bold print:border-black">Date of Notice</th>
                                  <th className="p-6 border border-gray-200 font-mono print:border-black">
                                    {formatDate(new Date().toISOString())}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="p-6 border border-gray-200 font-bold print:border-black">Issuer Entity</td>
                                  <td className="p-6 border border-gray-200 print:border-black">Acme Corporation Private Limited</td>
                                  <td className="p-6 border border-gray-200 font-bold print:border-black">Issuer GSTIN</td>
                                  <td className="p-6 border border-gray-200 font-mono print:border-black">07AAACR1294F1Z1</td>
                                </tr>
                                <tr>
                                  <td className="p-6 border border-gray-200 font-bold print:border-black">Recipient Supplier</td>
                                  <td className="p-6 border border-gray-200 font-bold print:border-black">{selected.vendorNameA || '—'}</td>
                                  <td className="p-6 border border-gray-200 font-bold print:border-black">Recipient GSTIN</td>
                                  <td className="p-6 border border-gray-200 font-mono print:border-black">
                                    {selected.gstinA || invoiceADetail?.gstin || '—'}
                                  </td>
                                </tr>
                                <tr>
                                  <td className="p-6 border border-gray-200 font-bold print:border-black">Invoice Reference</td>
                                  <td className="p-6 border border-gray-200 font-mono print:border-black">{selected.invoiceNumberA || '—'}</td>
                                  <td className="p-6 border border-gray-200 font-bold print:border-black">Taxable / ITC Value</td>
                                  <td className="p-6 border border-gray-200 font-mono font-bold text-red-600 print:text-black print:border-black">
                                    {formatCurrency(invoiceADetail?.amount || selected.amountDiff)} / {formatCurrency(invoiceADetail?.taxAmount || selected.amountDiff)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Letter Body */}
                          <div className="text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap font-sans text-justify my-16 print:text-black print:text-[10px] print:leading-normal">
                            {noticeBody}
                          </div>
                        </div>

                        {/* Footer Signature & Stamp Block */}
                        <div className="border-t border-gray-200 pt-16 mt-20 print:border-black">
                          <div className="grid grid-cols-2 gap-16 items-end">
                            {/* C-Suite Sign-off */}
                            <div>
                              <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider print:text-black">
                                Authorized Signatory
                              </p>
                              <span className="block font-mono italic text-indigo-600 print:text-black text-heading-s py-4">
                                Priya Sharma
                              </span>
                              <p className="text-[10px] font-bold text-slate-800 print:text-black">
                                Lead Compliance Counsel
                              </p>
                              <p className="text-[9px] text-gray-400 print:text-black">
                                Acme Corporation Private Limited
                              </p>
                            </div>

                            {/* Verified Ledger Stamp */}
                            <div className="flex justify-end">
                              <div className="flex items-center gap-8 border border-dashed border-green-300 bg-green-50/30 p-10 rounded-card text-right font-mono print:border-black print:bg-transparent print:rounded-none">
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold text-green-700 uppercase tracking-wide print:text-black">
                                    RECONTIQ AUDIT LEDGER
                                  </p>
                                  <p className="text-[8px] font-semibold text-green-600 print:text-black">
                                    SECURE BLOCK NOTARIZED
                                  </p>
                                  <p className="text-[7px] text-gray-400 print:text-black">
                                    ID: SHA256-94820A381
                                  </p>
                                </div>
                                <CheckCircle2 size={24} className="text-green-600 print:text-black shrink-0 animate-pulse" />
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Analyst Action Panel */}
            <div className="border-t border-gray-100 dark:border-border-dark pt-20 no-print">
              {actionType === null ? (
                (selected.status === 'PENDING' || selected.status === 'ESCALATED') ? (
                  <div className="flex flex-wrap gap-12">
                    <Button 
                      variant="accent" 
                      className="min-w-[130px] flex-1 !py-12"
                      onClick={() => {
                        setActionType('RESOLVE');
                        setNoteText('');
                      }}
                    >
                      <CheckCircle2 size={16} />
                      Accept &amp; Resolve
                    </Button>
                    
                    <Button 
                      variant="secondary" 
                      className="min-w-[130px] flex-1 !py-12"
                      onClick={() => {
                        setActionType('WRITE_OFF');
                        setNoteText('');
                      }}
                    >
                      <AlertTriangle size={16} />
                      Write Off Discrepancy
                    </Button>

                    {selected.status === 'PENDING' && (
                      <Button 
                        variant="danger" 
                        className="min-w-[130px] flex-1 !py-12 bg-red-600 hover:bg-red-700 text-white font-bold"
                        onClick={() => {
                          setActionType('ESCALATE');
                          setNoteText('');
                        }}
                      >
                        <AlertCircle size={16} />
                        Escalate Discrepancy
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      className="min-w-[130px] flex-1 !py-12 border border-dashed border-gray-300 hover:bg-gray-100"
                      onClick={() => setSelected(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center rounded-card bg-gray-50 dark:bg-slate-900 p-16 border border-gray-200 dark:border-border-dark">
                    <div className="flex items-center gap-12 text-gray-600 dark:text-gray-400">
                      <Info size={20} />
                      <span className="text-body-sm font-semibold">
                        This mismatch has already been resolved as <strong>{selected.status}</strong> by <strong>{selected.resolvedBy || 'Priya'}</strong>.
                      </span>
                    </div>
                    <Button variant="secondary" className="!px-16 !py-8 text-xs" onClick={() => setSelected(null)}>
                      Close Workspace
                    </Button>
                  </div>
                )
              ) : (
                <div className="rounded-card border border-indigo-150 bg-indigo-50/10 dark:border-indigo-950/20 dark:bg-slate-900/40 p-16 space-y-16 animate-scale-in">
                  <div className="flex justify-between items-center">
                    <h5 className="text-body font-bold text-indigo-950 dark:text-indigo-300">
                      {actionType === 'RESOLVE' ? '📝 Confirm Acceptance & Resolution' : actionType === 'WRITE_OFF' ? '⚠️ Confirm Discrepancy Write-Off' : '🚨 Confirm Discrepancy Escalation'}
                    </h5>
                    <Badge variant={actionType === 'RESOLVE' ? 'success' : actionType === 'WRITE_OFF' ? 'warning' : 'danger'} className="text-xs uppercase font-bold font-mono">
                      {actionType === 'RESOLVE' ? 'Resolve' : actionType === 'WRITE_OFF' ? 'Write-Off' : 'Escalate'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    <Label htmlFor="note" className="text-xs font-semibold text-gray-500">
                      Analyst Resolution Notes (Enforced between 10 and 2000 characters by backend validator)
                    </Label>
                    <textarea
                      id="note"
                      rows={3}
                      placeholder="Explain how this discrepancy was audited and resolved. E.g., 'Vendor uploaded invoice with corrected tax amounts in GSTR-2B for period May.'"
                      className="w-full rounded-card border border-gray-300 bg-white p-12 text-body text-primary focus:border-accent focus:outline-none dark:bg-slate-900 dark:border-border-dark dark:text-white"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                    />
                    <div className="flex justify-between items-center text-xs font-medium mt-4">
                      <span className={noteText.trim().length >= 10 ? 'text-success font-bold' : 'text-error font-bold animate-pulse'}>
                        {noteText.trim().length} / 2000 characters {noteText.trim().length < 10 && '(Minimum 10 characters required)'}
                      </span>
                      <span className="text-gray-400">Acting Analyst: Priya Sharma</span>
                    </div>
                  </div>

                  <div className="flex gap-12 pt-8">
                    <Button
                      variant={actionType === 'RESOLVE' ? 'accent' : 'danger'}
                      className="flex-1 !py-10"
                      disabled={noteText.trim().length < 10 || noteText.trim().length > 2000}
                      isLoading={resolveMutation.isPending || writeOffMutation.isPending || escalateMutation.isPending}
                      onClick={executeResolution}
                    >
                      {actionType === 'RESOLVE' ? 'Confirm Resolution' : actionType === 'WRITE_OFF' ? 'Confirm Write-Off' : 'Confirm Escalation'}
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1 !py-10"
                      onClick={() => setActionType(null)}
                    >
                      Go Back
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </Modal>
    </div>
  );
}
