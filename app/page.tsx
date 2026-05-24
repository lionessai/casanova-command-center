'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Zap, CheckSquare, Activity, Bot, ExternalLink } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function CasanovaCommandCenter() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hey Dorothea — Casanova online. I have full visibility into your Make.com scenarios and ClickUp workspace.\n\nTell me what you need: run a status check, troubleshoot a failing scenario, build something new, or track tasks. I'm ready to work.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return 'casanova-default';
    const stored = localStorage.getItem('casanova-session-id');
    if (stored) return stored;
    const newId = `casanova-${Date.now()}`;
    localStorage.setItem('casanova-session-id', newId);
    return newId;
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userMsg.content }],
          sessionId,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
        );
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: '⚠️ Connection error. Please try again.' } : m)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  const quickActions = [
    { label: 'Scenario status', prompt: 'Run a full status check on all my Make.com scenarios' },
    { label: 'Recent errors', prompt: 'Check for any scenarios with recent errors or failures' },
    { label: 'ClickUp tasks', prompt: 'Show me my ClickUp workspace structure and recent tasks' },
    { label: 'Run all active', prompt: 'Which scenarios are active and when did they last run?' },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#0A0F1E]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E2D4A] bg-[#0F1626]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#34D399] to-[#059669] flex items-center justify-center shadow-lg shadow-[#34D399]/20">
            <span className="text-white text-sm font-bold">C</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">Casanova</h1>
            <p className="text-[#64748B] text-[10px]">Automations Agent — Lioness AI Systems</p>
          </div>
          <div className="flex items-center gap-1.5 ml-2">
            <div className="w-1.5 h-1.5 bg-[#34D399] rounded-full animate-pulse" />
            <span className="text-[#34D399] text-[10px]">Online</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://astra-command-center-six.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[#64748B] hover:text-[#34D399] text-[11px] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Astra</span>
          </a>
          <div className="flex items-center gap-3 text-[#4B5563]">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Make.com</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <CheckSquare className="w-3.5 h-3.5 text-[#60A5FA]" />
              <span>ClickUp</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#34D399] to-[#059669] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm shadow-[#34D399]/20">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                message.role === 'user'
                  ? 'bg-[#34D399]/15 border border-[#34D399]/20 text-white ml-auto'
                  : 'bg-[#1C2333] border border-[#1E2D4A] text-[#CBD5E1]'
              }`}
            >
              {message.content ? (
                formatContent(message.content)
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[#34D399] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#34D399] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-[#34D399] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-[#64748B] text-xs">working...</span>
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-[#1E2D4A] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#94A3B8] text-xs font-bold">D</span>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={() => setInput(action.prompt)}
              className="px-3 py-1.5 rounded-lg bg-[#1C2333] border border-[#1E2D4A] text-[#94A3B8] text-xs hover:border-[#34D399]/40 hover:text-[#34D399] transition-all"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4">
        <div className="bg-[#1C2333] border border-[#1E2D4A] rounded-xl flex items-end gap-3 px-4 py-3 focus-within:border-[#34D399]/40 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Casanova about your automations or tasks..."
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-[#4B5563] text-sm resize-none focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
            style={{ minHeight: '24px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-lg bg-[#34D399] flex items-center justify-center flex-shrink-0 hover:bg-[#2AB57D] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
        <p className="text-[#2D3748] text-[10px] text-center mt-2">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
