export const dashboardMetrics = [
  {
    id: 'itc',
    label: 'Total ITC Recovered',
    value: '₹24,50,000',
    trend: { value: '+12.4%', positive: true },
  },
  {
    id: 'matched',
    label: 'Auto-Matched',
    value: '12,847',
    trend: { value: '+8.2%', positive: true },
  },
  {
    id: 'risk',
    label: 'At-Risk ITC',
    value: '₹3,20,000',
    trend: { value: '-5.1%', positive: true },
  },
  {
    id: 'pending',
    label: 'Pending Review',
    value: '347',
    trend: { value: '+23', positive: false },
  },
];

export const recoveryChartData = [
  { month: 'Jan', amount: 180000 },
  { month: 'Feb', amount: 220000 },
  { month: 'Mar', amount: 195000 },
  { month: 'Apr', amount: 280000 },
  { month: 'May', amount: 310000 },
  { month: 'Jun', amount: 350000 },
  { month: 'Jul', amount: 245000 },
];

export const aiInsights = [
  {
    id: '1',
    title: 'ITC mismatch cluster detected',
    description: '14 invoices from Apex Traders show consistent 2% CGST variance vs GSTR-2B.',
    time: '12 min ago',
    type: 'warning' as const,
  },
  {
    id: '2',
    title: 'Auto-match opportunity',
    description: '428 GSTR-2B entries can be reconciled with 96%+ AI confidence this week.',
    time: '45 min ago',
    type: 'info' as const,
  },
  {
    id: '3',
    title: 'Recovery milestone',
    description: '₹4.2L ITC recovered from Q1 duplicate filing corrections.',
    time: '2 hr ago',
    type: 'success' as const,
  },
  {
    id: '4',
    title: 'Vendor risk elevated',
    description: 'Nova Components linked to 3 shell entities in fraud graph analysis.',
    time: '4 hr ago',
    type: 'warning' as const,
  },
  {
    id: '5',
    title: 'Notice deadline approaching',
    description: 'SCN/2026/04821 response due in 5 days — draft response ready for review.',
    time: '6 hr ago',
    type: 'info' as const,
  },
];

export const actionQueue = [
  {
    id: '1',
    invoice: 'INV-2847',
    vendor: 'Apex Traders Pvt Ltd',
    amount: '₹1,24,500',
    riskScore: 72,
  },
  {
    id: '2',
    invoice: 'INV-2799',
    vendor: 'Nova Components',
    amount: '₹2,45,000',
    riskScore: 88,
  },
  {
    id: '3',
    invoice: 'INV-2812',
    vendor: 'Shree Logistics',
    amount: '₹89,200',
    riskScore: 34,
  },
  {
    id: '4',
    invoice: 'INV-2755',
    vendor: 'Green Energy Co',
    amount: '₹3,12,400',
    riskScore: 91,
  },
  {
    id: '5',
    invoice: 'INV-2721',
    vendor: 'Metro Supplies',
    amount: '₹56,800',
    riskScore: 55,
  },
];

export const recentActivity = [
  { id: '1', action: 'Auto-matched INV-9921 with GSTR-2B', user: 'AI Engine', time: '5 min ago' },
  { id: '2', action: 'Flagged circular trading pattern', user: 'Fraud Module', time: '18 min ago' },
  { id: '3', action: 'Generated notice response draft', user: 'Priya Sharma', time: '1 hr ago' },
  { id: '4', action: 'Exported ITC Recovery report (PDF)', user: 'System', time: '2 hr ago' },
  { id: '5', action: 'Updated rule: variance > 2% on CGST', user: 'Admin', time: '3 hr ago' },
];

export const reconciliationRows = [
  {
    id: '1',
    invoice: 'INV-2847',
    vendor: 'Apex Traders Pvt Ltd',
    date: '2026-05-12',
    amount: '₹1,24,500',
    gstr2bStatus: 'Partial match',
    matchScore: 72,
    risk: 'warning' as const,
    books: { gstin: '27AABCA1234F1Z5', taxable: '₹1,05,508', tax: '₹18,992', invoiceDate: '2026-05-10' },
    gstr: { gstin: '27AABCA1234F1Z5', taxable: '₹1,03,390', tax: '₹18,610', filingDate: '2026-05-14' },
    aiExplanation:
      'Taxable value differs by ₹2,118 (2.0%). CGST component aligns; SGST variance suggests partial credit claim on GSTR-2B. Recommend verifying line-item 3 on purchase register.',
  },
  {
    id: '2',
    invoice: 'INV-2812',
    vendor: 'Shree Logistics',
    date: '2026-05-10',
    amount: '₹89,200',
    gstr2bStatus: 'Matched',
    matchScore: 96,
    risk: 'success' as const,
    books: { gstin: '29BBBDE5678G2Z3', taxable: '₹75,593', tax: '₹13,607', invoiceDate: '2026-05-09' },
    gstr: { gstin: '29BBBDE5678G2Z3', taxable: '₹75,593', tax: '₹13,607', filingDate: '2026-05-11' },
    aiExplanation: 'Full match across GSTIN, taxable value, and tax components. Safe to auto-accept.',
  },
  {
    id: '3',
    invoice: 'INV-2799',
    vendor: 'Nova Components',
    date: '2026-05-08',
    amount: '₹2,45,000',
    gstr2bStatus: 'Not in 2B',
    matchScore: 45,
    risk: 'danger' as const,
    books: { gstin: '24CCCFG9012H3Z1', taxable: '₹2,07,627', tax: '₹37,373', invoiceDate: '2026-05-07' },
    gstr: { gstin: '24CCCFG9012H3Z1', taxable: '₹1,89,830', tax: '₹34,170', filingDate: '—' },
    aiExplanation:
      'Invoice absent from GSTR-2B for filing period. Vendor linked to elevated fraud risk score. Flag for compliance review before ITC claim.',
  },
  {
    id: '4',
    invoice: 'INV-2781',
    vendor: 'Metro Supplies',
    date: '2026-05-05',
    amount: '₹56,800',
    gstr2bStatus: 'Matched',
    matchScore: 88,
    risk: 'info' as const,
    books: { gstin: '19DDDEH3456I4Z7', taxable: '₹48,136', tax: '₹8,664', invoiceDate: '2026-05-04' },
    gstr: { gstin: '19DDDEH3456I4Z7', taxable: '₹48,136', tax: '₹8,664', filingDate: '2026-05-08' },
    aiExplanation: 'Values match; filing date lag of 4 days within acceptable window.',
  },
  {
    id: '5',
    invoice: 'INV-2755',
    vendor: 'Green Energy Co',
    date: '2026-05-02',
    amount: '₹3,12,400',
    gstr2bStatus: 'Matched',
    matchScore: 91,
    risk: 'success' as const,
    books: { gstin: '06EEEFI7890J5Z2', taxable: '₹2,64,746', tax: '₹47,654', invoiceDate: '2026-05-01' },
    gstr: { gstin: '06EEEFI7890J5Z2', taxable: '₹2,64,746', tax: '₹47,654', filingDate: '2026-05-03' },
    aiExplanation: 'High-confidence match. Eligible for auto-accept under current rules.',
  },
];

export const fraudPatterns = [
  { id: '1', name: 'Circular trading ring', severity: 'critical', entities: 8, amount: '₹45.2L' },
  { id: '2', name: 'Shell vendor cluster', severity: 'high', entities: 12, amount: '₹18.7L' },
  { id: '3', name: 'Duplicate invoice hash', severity: 'medium', entities: 3, amount: '₹6.1L' },
  { id: '4', name: 'GSTIN velocity anomaly', severity: 'high', entities: 5, amount: '₹22.3L' },
];

export const notices = [
  {
    id: '1',
    type: 'Show Cause Notice',
    ref: 'SCN/2026/04821',
    received: '2026-05-15',
    due: '2026-05-25',
    aiStatus: 'draft_ready' as const,
    amount: '₹8,42,000',
  },
  {
    id: '2',
    type: 'Demand Notice',
    ref: 'DRC/2026/01294',
    received: '2026-05-08',
    due: '2026-05-18',
    aiStatus: 'sent' as const,
    amount: '₹2,15,600',
  },
  {
    id: '3',
    type: 'Audit Intimation',
    ref: 'ADT/2026/00312',
    received: '2026-04-28',
    due: '2026-06-15',
    aiStatus: 'not_started' as const,
    amount: '—',
  },
];

export const rulesEngine = [
  { id: '1', condition: 'Match score', operator: '<', value: '90', action: 'Require manual review' },
  { id: '2', condition: 'CGST variance', operator: '>', value: '2%', action: 'Flag for review' },
  { id: '3', condition: 'Vendor risk score', operator: '>', value: '80', action: 'Block auto-accept' },
];

export const aiModelMetrics = {
  accuracy: 96.7,
  falsePositives: 2.3,
};

export const reportTypes = [
  { value: 'itc', label: 'ITC Recovery' },
  { value: 'mismatch', label: 'Mismatch Summary' },
  { value: 'vendor', label: 'Vendor Scorecard' },
  { value: 'audit', label: 'Audit Trail' },
];
