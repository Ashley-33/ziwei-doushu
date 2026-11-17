'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart } from '@/lib/ziwei/types';
import CopyPrompt, { promptOnlyMessage } from './CopyPrompt';
import AiContent from './AiContent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  copyText?: string; // 未配置模型时导出的完整提示词
}

interface ChatPanelProps {
  chart: ZiweiChart;
}

const PRESET_QUESTIONS = [
  '我的整体命格如何？性格特点是什么？',
  '我的感情婚姻运势如何？',
  '我的事业财运如何？适合什么方向？',
  '我现在的大限运势如何？',
  '我的健康需要注意什么？',
  '今年的流年运势如何？',
];

export default function ChatPanel({ chart }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pinInput, setPinInput] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 手机上，只有面板已滚入视野时输入条才吸底
  useEffect(() => {
    const onScroll = () => {
      const el = panelRef.current;
      if (!el) return;
      setPinInput(el.getBoundingClientRect().top < window.innerHeight * 0.5);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, messages: [...messages, userMsg] }),
      });

      if (res.status === 404) throw new Error('api-missing');
      if (!res.ok) {
        // 服务端把「没配 Key」「模型报错」等原因放在 message 里，直接给用户看
        const detail = (await res.json().catch(() => null)) as { message?: string } | null;
        throw new Error(detail?.message || '请求失败');
      }
      // 没配模型时服务端不返回流，而是返回组装好的完整提示词
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = (await res.json().catch(() => null)) as
          | { mode?: string; reason?: string; prompt?: string }
          | null;
        if (payload?.mode === 'prompt-only' && payload.prompt) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: promptOnlyMessage(payload.reason),
            copyText: payload.prompt,
          }]);
          return;
        }
        throw new Error('请求失败');
      }
      if (!res.body) throw new Error('无响应流');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      let pendingLine = '';

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        // 残行留到下一轮再拼，避免一帧被网络切断后整段文字丢失
        pendingLine += decoder.decode(value, { stream: true });
        const lines = pendingLine.split('\n');
        pendingLine = lines.pop() ?? '';
        for (const rawLine of lines) {
          const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          let parsed: { delta?: { text?: string }; error?: string } | null = null;
          try {
            parsed = JSON.parse(data) as { delta?: { text?: string }; error?: string };
          } catch {
            continue;
          }
          if (parsed?.error) throw new Error(parsed.error);
          assistantText += parsed?.delta?.text ?? '';
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: assistantText };
            return updated;
          });
        }
      }
    } catch (e) {
      const missing = e instanceof Error && e.message === 'api-missing';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: missing
          ? 'AI 解读接口未启用。请在 .env.local 里配置 AI_PROVIDER 与对应的 API Key 后重启服务。'
          : (e instanceof Error && e.message) || '解读失败，请检查 API 配置或稍后重试。',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      ref={panelRef}
      className="flex flex-col rounded-xl lg:h-full lg:overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--bdr)' }}
    >
      {/* 标题 */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--bdr)' }}>
        <h3 className="text-[13px] font-medium tracking-widest lg:text-xs" style={{ color: 'var(--ac)' }}>AI 命盘解读</h3>
        <p className="text-[11px] mt-0.5 lg:text-[10px]" style={{ color: 'var(--tx-3)' }}>倪海厦正宗紫微斗数 · 智慧解析</p>
      </div>

      {/* 消息列表 */}
      <div ref={scrollRef} className="px-4 py-4 space-y-3.5 lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:space-y-3">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
            <div className="text-4xl mb-3" style={{ color: 'var(--ac)', opacity: 0.35 }}>✦</div>
            <p className="text-[13px] leading-relaxed lg:text-xs" style={{ color: 'var(--tx-3)' }}>
              命盘已生成，可直接提问<br />
              或从下方选择常见问题开始解读
            </p>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={msg.role === 'user'
                  ? 'max-w-[88%] rounded-xl px-3.5 py-2.5 text-[14.5px] leading-relaxed break-words lg:max-w-[85%] lg:text-sm'
                  : 'w-full min-w-0 break-words'}
                style={msg.role === 'user' ? {
                  background: 'var(--ac-bg)',
                  border: '1px solid var(--ac-bdr)',
                  color: 'var(--ac)',
                } : undefined}
              >
                {msg.role === 'assistant' && (
                  <div className="text-[10px] mb-2 flex items-center gap-1.5" style={{ color: 'var(--tx-3)' }}>
                    <span style={{ color: 'var(--ac)', opacity: 0.5 }}>✦</span>命理师
                  </div>
                )}
                {msg.role === 'assistant' ? (
                  <AiContent
                    text={msg.content}
                    streaming={loading && i === messages.length - 1}
                  />
                ) : (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                )}
                {msg.copyText && <CopyPrompt text={msg.copyText} />}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* 预设问题 */}
      {messages.length === 0 && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            {PRESET_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-left text-[12.5px] rounded-lg px-3 py-2.5 transition-all line-clamp-2 lg:text-[10px] lg:px-2.5 lg:py-2"
                style={{
                  color: 'var(--t-text2)',
                  border: '1px solid var(--t-border)',
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(212,168,67,0.3)';
                  e.currentTarget.style.color = 'var(--t-gold)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--t-border)';
                  e.currentTarget.style.color = 'var(--t-text2)';
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 输入框 */}
      <div
        className={`${pinInput ? 'sticky bottom-0 z-10 backdrop-blur-md' : 'relative'} px-3 pb-3 pt-2.5 flex-shrink-0 rounded-b-xl lg:static lg:backdrop-blur-none lg:rounded-none lg:pt-2`}
        style={{ borderTop: '1px solid var(--bdr)', background: 'color-mix(in srgb, var(--bg-card) 96%, transparent)' }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="输入问题，如：我的感情运势如何？"
            disabled={loading}
            className="flex-1 rounded-lg px-3 py-2.5 text-[16px] focus:outline-none transition-colors lg:py-2 lg:text-xs"
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--bdr-med)',
              color: 'var(--tx-0)',
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(212,168,67,0.15)',
              border: '1px solid rgba(212,168,67,0.25)',
              color: 'var(--t-gold)',
            }}
          >
            解读
          </button>
        </div>
      </div>
    </div>
  );
}
