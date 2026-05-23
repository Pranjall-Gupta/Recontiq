import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { vendorChat } from '../../api/api-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    text: 'Hi! I can help with GST reconciliation, ITC recovery, and notice drafting. What would you like to explore?',
  },
];

export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const textToSend = input.trim();
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await vendorChat(textToSend);
      const aiResponse = res.data.response;
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-ai`,
          role: 'assistant',
          text: aiResponse,
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        {
          id: `${Date.now()}-ai`,
          role: 'assistant',
          text: 'I apologize, but I had trouble reaching the AI service. If you have questions about Section 16(2)(c) interest liability, custom invoice uploads, or any GST compliance issues, please check your network connection or try again shortly.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-24 right-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-modal transition-transform hover:scale-105 md:bottom-32 md:right-32 print:hidden',
          open && 'hidden',
        )}
        aria-label="Open AI assistant"
      >
        <MessageCircle size={24} />
      </button>

      {open ? (
        <div className="fixed bottom-24 right-16 z-50 flex h-[600px] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-modal bg-white shadow-modal dark:bg-surface-dark md:right-32 print:hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-20 py-20 dark:border-border-dark">
            <h3 className="text-heading-s text-primary dark:text-primary-light">AI Assistant</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-button p-8 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 space-y-12 overflow-y-auto p-16">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-card px-12 py-10 text-body',
                    msg.role === 'user'
                      ? 'bg-gray-100 text-primary dark:bg-gray-800 dark:text-primary-light'
                      : 'border border-gray-200 bg-white text-primary dark:border-border-dark dark:bg-surface-dark dark:text-primary-light',
                  )}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-card px-12 py-10 text-body border border-gray-200 bg-white text-gray-500 dark:border-border-dark dark:bg-surface-dark flex items-center gap-8">
                  <span className="h-6 w-6 rounded-full bg-primary animate-ping" />
                  AI is thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-8 border-t border-gray-200 p-16 dark:border-border-dark">
            <Input
              placeholder="Ask about reconciliation..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              disabled={loading}
              className="flex-1"
            />
            <Button variant="primary" onClick={send} disabled={loading || !input.trim()} className="!px-12">
              <Send size={18} />
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
