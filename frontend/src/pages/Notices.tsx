import { useState } from 'react';
import { FileUp, Send, Sparkles, Upload, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/Label';
import { notices as mockNotices } from '../data/mock';
import { vendorChat } from '../api/api-client';

const aiStatusVariant = {
  draft_ready: 'info' as const,
  sent: 'success' as const,
  not_started: 'warning' as const,
};

const aiStatusLabel = {
  draft_ready: 'Draft ready',
  sent: 'Sent',
  not_started: 'Not started',
};

export default function Notices() {
  const [activeNotices, setActiveNotices] = useState(mockNotices);
  const [selectedNoticeId, setSelectedNoticeId] = useState('1');
  const [aiResponse, setAiResponse] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const selectedNotice = activeNotices.find((n) => n.id === selectedNoticeId) || activeNotices[0];

  const generateResponse = async () => {
    setGenerating(true);
    setSuccessMsg('');
    
    const prompt = `Draft a formal reply to Show Cause Notice with reference ${selectedNotice.ref} of type ${selectedNotice.type} for amount ${selectedNotice.amount}. Address timing differences between our books and GSTR-2B filings. Keep it concise, in English, and professional.`;

    try {
      const res = await vendorChat(prompt);
      setAiResponse(res.data.response);
      
      // Update notice AI status to draft_ready if it was not started
      setActiveNotices(prev =>
        prev.map(n =>
          n.id === selectedNoticeId && n.aiStatus === 'not_started'
            ? { ...n, aiStatus: 'draft_ready' }
            : n
        )
      );
    } catch (err) {
      console.warn("Failed to reach Ollama for drafting, using customized high-fidelity fallback.", err);
      // Custom localized high-fidelity fallback based on the notice details
      const fallbackText = `Dear Sir/Madam,\n\nWith reference to ${selectedNotice.type} ${selectedNotice.ref} received on ${selectedNotice.received}, we respectfully submit that the alleged ITC discrepancy of ${selectedNotice.amount === '—' ? 'unmatched transactions' : selectedNotice.amount} arises from temporary timing differences between our purchase ledger records and GSTR-2B filings for the current period.\n\nWe have compiled full reconciled statements demonstrating eligible ITC with supporting invoice registers. We request an opportunity to present this breakdown or a personal hearing before any demand is finalized.\n\nYours faithfully,\nAcme Corp Pvt Ltd\nGST Compliance Team`;
      setAiResponse(fallbackText);
      
      setActiveNotices(prev =>
        prev.map(n =>
          n.id === selectedNoticeId && n.aiStatus === 'not_started'
            ? { ...n, aiStatus: 'draft_ready' }
            : n
        )
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setActiveNotices(prev =>
        prev.map(n =>
          n.id === selectedNoticeId ? { ...n, aiStatus: 'sent' as const } : n
        )
      );
      setSuccessMsg(`Successfully dispatched legal response draft for notice ${selectedNotice.ref}!`);
      setAiResponse('');
    }, 1000);
  };

  return (
    <div className="space-y-24">
      <div>
        <h3 className="text-body font-medium text-gray-600 dark:text-[#A0A0A0] mb-12">
          Select a notice card below to configure and generate AI reply drafts.
        </h3>
      </div>

      <div className="grid gap-16 md:grid-cols-2 xl:grid-cols-3">
        {activeNotices.map((notice) => {
          const isSelected = notice.id === selectedNoticeId;
          return (
            <div
              key={notice.id}
              onClick={() => {
                setSelectedNoticeId(notice.id);
                setSuccessMsg('');
                setAiResponse('');
              }}
              className="cursor-pointer transition-all duration-200"
            >
              <Card
                hover
                className={`p-20 border-2 transition-all h-full ${
                  isSelected
                    ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/5 shadow-md scale-[1.01]'
                    : 'border-transparent'
                }`}
              >
                <div className="mb-12 flex items-start justify-between gap-8">
                  <div className="flex items-center gap-6">
                    <Badge variant="neutral">{notice.type}</Badge>
                    {isSelected && (
                      <Badge variant="info" className="text-[10px] uppercase font-mono tracking-wider">
                        Active
                      </Badge>
                    )}
                  </div>
                  <Badge variant={aiStatusVariant[notice.aiStatus]}>
                    {aiStatusLabel[notice.aiStatus]}
                  </Badge>
                </div>
                <p className="font-mono text-body-sm text-gray-600 dark:text-[#A0A0A0]">{notice.ref}</p>
                <div className="mt-16 grid grid-cols-2 gap-12 text-body-sm">
                  <div>
                    <p className="text-gray-600 dark:text-[#A0A0A0]">Received</p>
                    <p className="font-medium text-primary dark:text-primary-light">{notice.received}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-[#A0A0A0]">Due</p>
                    <p className="font-medium text-primary dark:text-primary-light">{notice.due}</p>
                  </div>
                </div>
                {notice.amount !== '—' && (
                  <p className="mt-12 font-mono text-heading-m text-primary dark:text-primary-light">
                    {notice.amount}
                  </p>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {successMsg && (
        <div className="flex items-center gap-12 rounded-card bg-emerald-50 border border-emerald-200 p-16 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/30 dark:text-emerald-400">
          <CheckCircle className="shrink-0 text-emerald-600 dark:text-emerald-400" size={20} />
          <p className="text-body-sm font-semibold">{successMsg}</p>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 dark:border-border-dark pb-16 mb-20">
          <div>
            <CardTitle>AI Response Generator</CardTitle>
            <p className="mt-4 text-body-xs text-gray-500">
              Drafting reply for notice <span className="font-mono font-semibold text-primary dark:text-white">{selectedNotice.ref}</span> ({selectedNotice.type})
            </p>
          </div>
          <Badge variant="info">Ollama Local LLM</Badge>
        </CardHeader>
        
        <div className="grid gap-24 lg:grid-cols-2 mt-8">
          <div className="flex flex-col items-center justify-center rounded-card border-2 border-dashed border-gray-300 bg-gray-50 py-40 dark:border-border-dark dark:bg-gray-900/20">
            <Upload className="mb-12 h-12 w-12 text-gray-400" />
            <p className="text-body font-medium text-primary dark:text-primary-light">
              Upload notice PDF
            </p>
            <p className="mt-4 text-body-sm text-gray-600 dark:text-[#A0A0A0]">Max 10MB</p>
            <Button variant="secondary" className="mt-16">
              <FileUp size={18} />
              Browse files
            </Button>
          </div>

          <div className="space-y-16">
            <div className="flex gap-12">
              <Button variant="accent" onClick={generateResponse} isLoading={generating}>
                <Sparkles size={18} />
                Generate Draft
              </Button>
              {aiResponse && (
                <Button variant="secondary" onClick={() => setAiResponse('')}>
                  Clear
                </Button>
              )}
            </div>
            <div>
              <Label htmlFor="draft">Edit response</Label>
              <textarea
                id="draft"
                value={aiResponse}
                onChange={(e) => setAiResponse(e.target.value)}
                placeholder="Generate a draft to edit or type a custom reply..."
                className="h-52 w-full resize-none rounded-input border border-gray-300 p-16 text-body dark:border-border-dark dark:bg-surface-dark dark:text-primary-light focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <Button variant="primary" onClick={handleSend} isLoading={sending} disabled={!aiResponse.trim()}>
              <Send size={18} />
              Send & Dispatch Response
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
