import { useState, useRef, useEffect } from 'react';
import { 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  Loader2, 
  Search, 
  FileText, 
  UploadCloud, 
  Check, 
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { vendorChat } from '../api/api-client';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

export default function VendorPortal() {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [foundInvoice, setFoundInvoice] = useState<any | null>(null);

  // Notice Parser state
  const [noticeText, setNoticeText] = useState('');
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [parsing, setParsing] = useState(false);

  // Chatbot state
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your Recontiq Vendor Assistant. Paste a demand notice, check missing returns, or ask me any GST compliance question!'
    }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Return Filing State
  const [validatingReturn, setValidatingReturn] = useState(false);
  const [reconciled, setReconciled] = useState(false);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle invoice lookup
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearched(true);
    const query = searchQuery.trim().toUpperCase();
    if (query.includes('1099') || query.includes('WIP')) {
      setFoundInvoice({
        invoiceNumber: 'WIP/24/1099',
        buyerName: 'Acme Corporation Private Limited',
        buyerGstin: '07AAACR1294F1Z1',
        taxableValue: 780000,
        taxAmount: 140400,
        period: 'March 2024',
        status: 'MISSING_IN_GSTR2B',
        reason: 'Invoice not uploaded or filed in GSTR-1 return. Recipient unable to claim Input Tax Credit under Section 16(2)(c).'
      });
    } else {
      setFoundInvoice(null);
    }
  };

  // Handle parsing notice
  const handleParseNotice = () => {
    if (!noticeText.trim()) return;
    setParsing(true);
    setTimeout(() => {
      setParsing(false);
      setParsedData({
        refNo: 'RECON/LEGAL/2026/WIP241099',
        invoiceNo: 'WIP/24/1099',
        gstPeriod: 'March 2024',
        blockedItc: 140400,
        provision: 'Section 16(2)(c) of CGST Act, 2017',
        deadline: '7 Business Days'
      });
      // Add message to chat explaining it
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: `I have parsed the notice text. This is a formal non-compliance demand regarding Invoice WIP/24/1099. Due to your unfiled return for March 2024, your buyer Acme Corporation is facing an ITC blockage of ₹1,40,400. To resolve this, you must file this invoice in your GSTR-1 return immediately under their GSTIN 07AAACR1294F1Z1.`
        }
      ]);
    }, 1200);
  };

  // Handle chat submission
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await vendorChat(userMsg);
      const aiResponse = res.data.response;
      setMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
    } catch (err) {
      console.error(err);
      // Inline robust fallback
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'I apologize, but I had trouble reaching the AI service. If you are trying to resolve invoice WIP/24/1099, please log in to the GST Portal (gst.gov.in), go to GSTR-1 for March 2024, select B2B Invoices, and add a record for Acme Corporation GSTIN 07AAACR1294F1Z1 with taxable value ₹7,80,000 and 18% GST rate.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle simulated GSTR-1 uploading
  const handleVerifyFiling = () => {
    setValidatingReturn(true);
    setTimeout(() => {
      setValidatingReturn(false);
      setReconciled(true);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: '🎉 SUCCESS: Recontiq Real-time Sync Engine has verified your filed return! Invoice WIP/24/1099 has been matched on our ledger. Acme Corporation\'s Input Tax Credit is now unlocked. Thank you for your compliance!'
        }
      ]);
    }, 2000);
  };

  return (
    <div className="space-y-32">
      <div>
        <h2 className="text-heading-xl text-primary dark:text-primary-light flex items-center gap-12">
          <Sparkles size={32} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          Vendor AI Copilot Workspace
        </h2>
        <p className="mt-8 text-body text-gray-600 dark:text-[#A0A0A0]">
          Resolve GST compliance discrepancies, clarify statutory Section 16(2)(c) issues, and verify return submissions.
        </p>
      </div>

      <div className="grid gap-24 lg:grid-cols-12">
        {/* Left Column: Discrepancy Search & GSTR-1 Upload Guide */}
        <div className="lg:col-span-7 space-y-24">
          
          {/* Section A: Search and Invoice Details */}
          <Card className="p-24 border border-indigo-50 dark:border-indigo-950/20 bg-white">
            <CardHeader className="p-0 mb-16">
              <CardTitle className="text-heading-s font-bold text-slate-800 dark:text-white flex items-center gap-8">
                <Search size={18} className="text-indigo-600" />
                Discrepancy Invoice Search
              </CardTitle>
              <p className="text-body-xs text-slate-500 mt-2">
                Enter the invoice reference number (e.g. WIP/24/1099) from your demand letter to check its matching status.
              </p>
            </CardHeader>

            <form onSubmit={handleSearch} className="flex gap-12">
              <Input
                type="text"
                placeholder="Search by Invoice Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-slate-50 border-slate-200 focus:ring-accent"
              />
              <Button type="submit" variant="accent" className="!px-16 !py-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                Lookup Invoice
              </Button>
            </form>

            {searched && (
              <div className="mt-20 border-t border-slate-100 dark:border-border-dark pt-16">
                {foundInvoice ? (
                  <div className="space-y-16">
                    <div className="flex flex-wrap items-center justify-between gap-12 bg-red-50/40 p-12 rounded-card border border-red-100">
                      <div className="flex items-center gap-8">
                        <AlertCircle className="text-red-600 w-18 h-18" />
                        <span className="text-xs font-bold text-red-700 font-mono">FLAGGED MISMATCH</span>
                      </div>
                      <Badge variant="danger" className="text-[10px] font-mono">Missing in GSTR-2B</Badge>
                    </div>

                    <dl className="grid gap-12 sm:grid-cols-2 text-body-sm font-mono">
                      <div className="border-b border-slate-50 pb-4">
                        <dt className="text-slate-400 text-body-xs">Invoice Reference</dt>
                        <dd className="font-bold text-slate-800 dark:text-white">{foundInvoice.invoiceNumber}</dd>
                      </div>
                      <div className="border-b border-slate-50 pb-4">
                        <dt className="text-slate-400 text-body-xs">Tax Period</dt>
                        <dd className="font-bold text-slate-800 dark:text-white">{foundInvoice.period}</dd>
                      </div>
                      <div className="border-b border-slate-50 pb-4">
                        <dt className="text-slate-400 text-body-xs">Buyer Entity</dt>
                        <dd className="font-bold text-slate-800 dark:text-white truncate">{foundInvoice.buyerName}</dd>
                      </div>
                      <div className="border-b border-slate-50 pb-4">
                        <dt className="text-slate-400 text-body-xs">Buyer GSTIN</dt>
                        <dd className="font-bold text-slate-800 dark:text-white">{foundInvoice.buyerGstin}</dd>
                      </div>
                      <div className="border-b border-slate-50 pb-4">
                        <dt className="text-slate-400 text-body-xs">Taxable Value</dt>
                        <dd className="font-bold text-slate-800 dark:text-white">₹{foundInvoice.taxableValue.toLocaleString()}</dd>
                      </div>
                      <div className="border-b border-slate-50 pb-4">
                        <dt className="text-red-500 text-body-xs font-bold">Blocked ITC (GST)</dt>
                        <dd className="font-bold text-red-600">₹{foundInvoice.taxAmount.toLocaleString()}</dd>
                      </div>
                    </dl>

                    <div className="p-12 bg-slate-50 rounded-card text-body-xs leading-relaxed text-slate-600 border border-slate-100">
                      <strong>Audit Root Cause:</strong> {foundInvoice.reason}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16 text-slate-500 text-body-sm font-semibold">
                    No discrepancies found for "{searchQuery}". Double-check your invoice number and try again.
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Section B: Step-by-Step Return Sync and Validation */}
          {foundInvoice && (
            <Card className="p-24 border border-indigo-50 dark:border-indigo-950/20 bg-white space-y-20">
              <CardHeader className="p-0">
                <CardTitle className="text-heading-s font-bold text-slate-800 dark:text-white flex items-center gap-8">
                  <BookOpen size={18} className="text-indigo-600" />
                  GSTR-1 Portal Filing Steps &amp; Live Sync Verification
                </CardTitle>
                <p className="text-body-xs text-slate-500 mt-2">
                  Follow these step-by-step instructions to upload this invoice to your government return, then verify below to reconcile.
                </p>
              </CardHeader>

              <div className="space-y-12">
                <div className="flex gap-12 items-start">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-mono text-[10px] font-bold shrink-0 mt-2">1</span>
                  <p className="text-body-sm text-slate-600">
                    Log in to the **GST Portal** (gst.gov.in) and head to the **Returns Dashboard** for period **{foundInvoice.period}**.
                  </p>
                </div>
                <div className="flex gap-12 items-start">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-mono text-[10px] font-bold shrink-0 mt-2">2</span>
                  <p className="text-body-sm text-slate-600">
                    Open **GSTR-1 / IFF**, go to **B2B Invoices**, and add a new record using Buyer GSTIN: <strong className="font-mono bg-slate-100 px-6 py-2 rounded text-indigo-600">{foundInvoice.buyerGstin}</strong> (Acme Corporation).
                  </p>
                </div>
                <div className="flex gap-12 items-start">
                  <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-mono text-[10px] font-bold shrink-0 mt-2">3</span>
                  <p className="text-body-sm text-slate-600">
                    Set Invoice No: <strong className="font-mono bg-slate-100 px-6 py-2 rounded">{foundInvoice.invoiceNumber}</strong>, Taxable Value: <strong className="font-mono bg-slate-100 px-6 py-2 rounded">₹{foundInvoice.taxableValue.toLocaleString()}</strong>, and standard GST rate (CGST + SGST or IGST).
                  </p>
                </div>
              </div>

              {reconciled ? (
                <div className="bg-green-50 border border-green-200 p-16 rounded-card text-center space-y-8 animate-fade-up">
                  <CheckCircle2 className="mx-auto text-green-600 w-32 h-32 animate-bounce" />
                  <h4 className="font-bold text-green-800 text-body">GSTR-2B Sync Successful!</h4>
                  <p className="text-body-xs text-green-700">
                    Invoice {foundInvoice.invoiceNumber} is now fully reconciled. Acme Corporation's input tax credit has been successfully unlocked. No further actions required.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 p-16 rounded-card flex flex-col items-center justify-center text-center space-y-12">
                  <UploadCloud className="text-indigo-400 w-40 h-40 animate-pulse" />
                  <div>
                    <h5 className="font-bold text-slate-800">Simulate Filed Return Sync</h5>
                    <p className="text-body-xs text-slate-500 max-w-sm mt-4">
                      Click the button below to simulate uploading your GSTR-1 filed return. Recontiq's real-time verification system will match it instantly.
                    </p>
                  </div>
                  <Button
                    onClick={handleVerifyFiling}
                    disabled={validatingReturn}
                    variant="accent"
                    className="!px-20 !py-12 bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-8"
                  >
                    {validatingReturn ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Verifying Return with GSTR-2B Portal...
                      </>
                    ) : (
                      <>
                        <Check size={16} />
                        Submit &amp; Validate Filed Return
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right Column: AI Assistant Chat & Notice Text Parser */}
        <div className="lg:col-span-5 space-y-24">
          
          {/* Section C: Notice Text Parser */}
          <Card className="p-24 border border-indigo-50 dark:border-indigo-950/20 bg-white">
            <CardHeader className="p-0 mb-12">
              <CardTitle className="text-heading-s font-bold text-slate-800 dark:text-white flex items-center gap-8">
                <FileText size={18} className="text-indigo-600" />
                Notice Parser
              </CardTitle>
              <p className="text-body-xs text-slate-500 mt-2">
                Received a demand email? Paste the text here, and Recontiq's parser will extract key invoice references and tax amounts.
              </p>
            </CardHeader>

            <div className="space-y-12">
              <textarea
                placeholder="Paste notice text here..."
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                className="w-full h-80 rounded-card border border-slate-200 p-12 text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <Button
                onClick={handleParseNotice}
                disabled={parsing || !noticeText.trim()}
                className="w-full !py-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-8"
              >
                {parsing ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Parsing notice...
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    Parse Compliance Notice
                  </>
                )}
              </Button>

              {parsedData && (
                <div className="bg-indigo-50/20 p-12 rounded-card border border-indigo-150 text-[11px] font-mono space-y-4">
                  <p className="font-bold text-indigo-950">EXTRACTED AUDIT PARAMETERS:</p>
                  <p>• Reference No: {parsedData.refNo}</p>
                  <p>• Invoice Reference: {parsedData.invoiceNo}</p>
                  <p>• Tax Period: {parsedData.gstPeriod}</p>
                  <p>• Flagged Provision: {parsedData.provision}</p>
                  <p>• Blocked ITC value: <span className="font-bold text-red-600">₹{parsedData.blockedItc.toLocaleString()}</span></p>
                  <p>• Rectification Window: <span className="font-bold text-orange-600">{parsedData.deadline}</span></p>
                </div>
              )}
            </div>
          </Card>

          {/* Section D: AI Assistant Chat */}
          <Card className="p-24 border border-indigo-50 dark:border-indigo-950/20 bg-white flex flex-col h-[480px]">
            <CardHeader className="p-0 mb-16 shrink-0">
              <CardTitle className="text-heading-s font-bold text-slate-800 dark:text-white flex items-center gap-8">
                <Sparkles size={18} className="text-indigo-600 animate-pulse" />
                AI Assistant Chatbot
              </CardTitle>
              <p className="text-body-xs text-slate-500 mt-2">
                Ask about Section 16(2)(c) interest liability or get customized instructions on uploading missing invoices.
              </p>
            </CardHeader>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto pr-4 mb-16 space-y-12 min-h-0 custom-scrollbar">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-card p-12 text-body-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-indigo-600 text-white font-semibold'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-500 rounded-card p-12 border border-slate-200 flex items-center gap-8 text-body-xs">
                    <Loader2 className="animate-spin text-indigo-600" size={14} />
                    Vendor AI is thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="flex gap-8 shrink-0">
              <Input
                type="text"
                placeholder="Ask about returns, Section 16(2)(c)..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={chatLoading}
                className="flex-1 bg-slate-50 border-slate-200 text-xs focus:ring-accent"
              />
              <Button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="!px-12 !py-10 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0"
              >
                <Send size={14} />
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
