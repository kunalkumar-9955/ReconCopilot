// app/chat/page.tsx
'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

const SAMPLE_QUERIES = [
  'Iss mahine kitna commission kata?',
  'Kaunse orders unreconciled hain?',
  'Double commission wale cases kaunse hain?',
  'GST ITC kitna claim kar sakte hain?',
  'Bank UTR delayed credit wale orders kaunse hain?',
];

function ChatContent() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedPill, setSelectedPill] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recon_chat_history');
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([
          {
            role: 'assistant',
            content: 'Namaste! Main aapka **Settlement & GST Reconciliation Copilot** hoon. Aap apne orders, Razorpay commission deductions, bank UTR credits, ya GST e-invoices ke baare mein Hindi ya English mein pooch sakte hain.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch {}

    const queryParam = searchParams.get('q');
    if (queryParam) {
      sendMessage(queryParam);
    }
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  function saveHistory(newMsgs: Message[]) {
    try {
      localStorage.setItem('recon_chat_history', JSON.stringify(newMsgs));
    } catch {}
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    setSelectedPill(text);
    const userMsg: Message = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    saveHistory(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply || data.error || 'Maaf kijiye, koi jawab nahi mila.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMsgs = [...updated, assistantMsg];
      setMessages(finalMsgs);
      saveHistory(finalMsgs);
    } catch (err: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: 'Network issue aaya. Kripya dubara try karein.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      const finalMsgs = [...updated, errorMsg];
      setMessages(finalMsgs);
      saveHistory(finalMsgs);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    try {
      localStorage.removeItem('recon_chat_history');
    } catch {}
    setMessages([
      {
        role: 'assistant',
        content: 'Chat reset ho gayi hai. Aap dubara sawal pooch sakte hain.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 24px 32px', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      {/* Page Title & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 4 }}>
            <span className="pill pill-teal">Ledger AI Assistant</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>• Live Context Connected</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '22px' }}>
            Merchant Settlement & GST Copilot
          </h1>
        </div>

        <button
          onClick={clearChat}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          Clear History
        </button>
      </div>

      {/* Main Framed Chat Container with Distinct Borders */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border-card)',
        borderRadius: 12,
        boxShadow: 'var(--card-shadow)',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Quick Suggestion Shelf */}
        <div style={{
          padding: '10px 16px',
          background: 'var(--bg-subtle)',
          borderBottom: '1px solid var(--border-card)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Quick Ask:
          </span>
          {SAMPLE_QUERIES.map((q) => {
            const isActive = selectedPill === q;
            return (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: '12px',
                  fontWeight: isActive ? 600 : 500,
                  background: isActive ? 'var(--accent-dim)' : 'var(--bg-card)',
                  border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-card)',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {q}
              </button>
            );
          })}
        </div>

        {/* Messages Feed Viewport */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          background: 'var(--bg-card)',
        }}>
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={`msg-${idx}`}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '82%',
                    background: isUser ? 'var(--accent-primary)' : 'var(--bg-subtle)',
                    color: isUser ? 'var(--accent-text)' : 'var(--text-primary)',
                    border: isUser ? '1px solid var(--accent-primary)' : '1px solid var(--border-card)',
                    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '14px 18px',
                    fontSize: '14px',
                    lineHeight: 1.55,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                  }}
                >
                  {!isUser && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: 4,
                        background: 'var(--accent-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--accent-text)" strokeWidth="2.5">
                          <path d="M4 2v20l2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1Z"/>
                        </svg>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                        ReconCopilot
                      </span>
                    </div>
                  )}

                  <div style={{ whiteSpace: 'pre-wrap', fontWeight: isUser ? 500 : 400 }}>
                    {m.content}
                  </div>

                  {m.timestamp && (
                    <div style={{
                      fontSize: '11px',
                      color: isUser ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-muted)',
                      textAlign: 'right',
                      marginTop: '6px',
                    }}>
                      {m.timestamp}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-card)',
                borderRadius: '12px 12px 12px 2px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <span className="dot dot-teal" style={{ animation: 'pulse 1s infinite' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Analyzing live settlement & GST ledger data...
                </span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Integrated Bottom Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          style={{
            padding: '12px 16px',
            background: 'var(--bg-card)',
            borderTop: '1px solid var(--border-card)',
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: 'var(--input-bg)',
            border: '1.5px solid var(--border-card)',
            borderRadius: 8,
            padding: '4px 12px',
            transition: 'border-color 0.15s ease',
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Poochiye: 'Iss mahine kitna commission kata?' ya 'Exceptions dikhao'..."
              disabled={loading}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '14px',
                padding: '8px 0',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 8,
              opacity: input.trim() && !loading ? 1 : 0.5,
              cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            }}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading Copilot...</div>}>
      <ChatContent />
    </Suspense>
  );
}
