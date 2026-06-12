import React, { useState, useRef, useEffect } from 'react';
import { MainLayout, PageHeader } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LatexRenderer } from '@/components/ui/latex-renderer';
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getResults } from '@/lib/storage';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biro-brain`;

const quickPrompts = [
  "Explain my test weaknesses",
  "How to improve in Physics?",
  "Solve: ∫x²dx",
  "JEE time management tips",
  "Create a 1-week study plan",
];

export default function BiroBrain() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const context = getResults().slice(-3).map(r =>
        `${r.testName}: score ${r.score}/${r.maxScore}, accuracy ${r.accuracy.toFixed(1)}%, weak subjects ${Object.entries(r.subjectWise).sort((a, b) => a[1].accuracy - b[1].accuracy).slice(0, 2).map(([s, v]) => `${s} ${v.accuracy.toFixed(0)}%`).join(', ')}`
      ).join('\n');
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], context: context || undefined }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Failed to connect to Biro-Brain');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const upsertAssistant = (content: string) => {
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
          }
          return [...prev, { role: 'assistant', content }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ') || line.startsWith(':') || !line.trim()) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              assistantContent += delta;
              upsertAssistant(assistantContent);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to get response');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader title="Biro-Brain (BB)" description="Your AI study assistant for JEE/NEET prep">
        <Button variant="outline" size="sm" onClick={() => setMessages([])} disabled={messages.length === 0}>
          <Trash2 className="h-4 w-4 mr-1" /> Clear
        </Button>
      </PageHeader>

      <Card className="flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
        <CardContent className="flex-1 flex flex-col p-4 min-h-0">
          <ScrollArea className="flex-1 pr-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full py-12 gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Hi! I'm Biro-Brain 🧠</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Ask me anything about JEE/NEET — solve problems, explain concepts, analyze your performance, or create study plans.
                </p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {quickPrompts.map((p, i) => (
                    <Button key={i} variant="outline" size="sm" onClick={() => sendMessage(p)} className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" /> {p}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex gap-3 mb-4', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'assistant' && (
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className={cn(
                  'max-w-[80%] rounded-lg px-4 py-3 text-sm',
                  msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border border-border'
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <LatexRenderer content={msg.content} />
                    </div>
                  ) : msg.content}
                </div>
                {msg.role === 'user' && (
                  <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex gap-3 mb-4">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted border border-border rounded-lg px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </ScrollArea>

          <div className="flex gap-2 mt-3 pt-3 border-t border-border">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask Biro-Brain anything..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
