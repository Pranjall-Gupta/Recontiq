export const navLinks = [
  { label: 'Home', href: '#' },
  { label: 'About', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Blog', href: '#insights' },
  { label: 'Careers', href: '#careers' },
] as const

export const trustedLogos = ['TCS', 'Infosys', 'Wipro', 'HDFC', 'Razorpay', 'Zoho', 'Flipkart', 'Paytm'] as const

export const topFeatures = [
  {
    title: 'Smart Invoice Matching',
    description:
      'Replace manual GSTR-2B matching with AI embeddings that understand vendor names — even with typos or variations.',
    icon: 'link',
  },
  {
    title: 'Real-Time Risk Scoring',
    description:
      'Every mismatch gets a 0–100 score so your team prioritizes fraud and high-value ITC issues first.',
    icon: 'shield',
  },
  {
    title: 'Scale Effortlessly',
    description:
      'From hundreds to thousands of invoices per month — one platform that grows with your compliance needs.',
    icon: 'chart',
  },
] as const

export const features = [
  {
    title: 'Smart Invoice Matching',
    description:
      'Uses AI embeddings to understand meaning, matching vendor names like "Tata Sons Pvt Ltd" vs "Tata Sons Private Limited" even with typos.',
    icon: 'link',
  },
  {
    title: 'Risk Scoring',
    description:
      'AI assigns a score from 0–100 to every mismatch, allowing your business to prioritize critical issues over honest errors.',
    icon: 'shield',
  },
  {
    title: 'Fraud Detection',
    description:
      'Graph analysis spots fraud rings — groups of fake companies linked together claiming fraudulent tax credits.',
    icon: 'graph',
  },
  {
    title: 'ITC Optimization',
    description:
      'Predicts if legal recovery is worth the cost and recommends actions: auto-fix, review, or write off.',
    icon: 'chart',
  },
  {
    title: 'Agentic Automation',
    description:
      'AI agents automatically draft vendor emails, schedule follow-ups, and escalate serious problems without manual work.',
    icon: 'bot',
  },
] as const

export const accordionItems = [
  {
    title: 'Smart Invoice Matching',
    body: 'Teaching the computer to understand meaning, not just exact words — so "Tata Sons Pvt Ltd" and "Tata Sons Private Limited" match automatically.',
  },
  {
    title: 'Risk Scoring',
    body: 'Every mismatch gets a 0–100 score so your team focuses on fraud and high-value issues first, not noise.',
  },
  {
    title: 'Fraud Detection',
    body: 'Graph analysis reveals linked shell companies and fraud rings before they trigger audits or notices.',
  },
] as const

export const bentoCards = [
  { title: 'GSTR-2B Reconciliation', sub: 'Match purchase invoices in minutes.' },
  { title: 'Get Started in Minutes', sub: 'Upload data, run AI match, recover ITC today.' },
  { title: 'Optimise Your ITC', sub: 'Maximize credits with intelligent recovery insights.' },
  { title: 'Scale Across Entities', sub: 'Multi-GSTIN support for growing businesses.' },
] as const

export const beforeItems = [
  'Thousands of invoices matched by hand',
  'Vendor name typos cause false mismatches',
  'Lost ITC and delayed recoveries',
  'Government notices and legal risk',
  'No fraud or ring detection',
  'Fragmented spreadsheets and tools',
  'Time-consuming manual follow-ups',
  'Basic analytics only',
] as const

export const afterItems = [
  'Automatic GSTR-2B reconciliation',
  'Semantic matching handles name variations',
  'ITC optimization and recovery insights',
  'Risk scoring prioritizes what matters',
  'Graph-based fraud ring detection',
  'Unified AI compliance platform',
  'Agentic vendor email automation',
  'Predictive mismatch analytics',
] as const

export const dualHighlights = [
  {
    title: 'Match Without Limits',
    description:
      'Grow from hundreds to thousands of invoices effortlessly using AI built for Indian GST compliance teams.',
    icon: 'link',
  },
  {
    title: 'Stay Compliant',
    description:
      'Automatic risk scoring and fraud detection help you avoid notices and recover legitimate ITC with confidence.',
    icon: 'shield',
  },
] as const

export const insights = [
  {
    tag: 'Sep 26, 2025 · 8 Min Read',
    title: 'How to Stop Losing ITC on GSTR-2B Mismatches',
    body: 'One unmatched invoice can block thousands in credits. Learn how AI semantic matching closes the gap.',
    imageClass: 'insight-1',
  },
  {
    tag: 'Sep 27, 2025 · 6 Min Read',
    title: 'Spotting Fraud Rings Before They Cost You',
    body: 'Graph analysis reveals linked shell companies claiming fake credits — before auditors do.',
    imageClass: 'insight-2',
  },
  {
    tag: 'Sep 28, 2025 · 5 Min Read',
    title: 'Let AI Agents Handle Vendor Follow-Ups',
    body: 'Draft emails, schedule reminders, and escalate — without adding headcount to finance.',
    imageClass: 'insight-3',
  },
] as const
