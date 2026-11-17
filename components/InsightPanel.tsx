'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ZiweiChart, Palace } from '@/lib/ziwei/types';
import type { TimeView } from './TimeNav';
import CopyPrompt, { promptOnlyMessage } from './CopyPrompt';
import AiContent from './AiContent';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  hidden?: boolean; // don't show user bubble for auto/topic messages
  copyText?: string; // 未配置模型时导出的完整提示词，附一键复制
}

interface SelectedSiHua {
  starName: string;
  siHua: string;
  view: TimeView;
}

interface InsightPanelProps {
  chart: ZiweiChart;
  selectedPalace?: Palace | null;
  selectedSiHua?: SelectedSiHua | null;
}

const TOPICS = [
  { key: 'overview',     label: '命格' },
  { key: 'love',        label: '感情' },
  { key: 'career',      label: '事业' },
  { key: 'wealth',      label: '财运' },
  { key: 'health',      label: '健康' },
  { key: 'personality', label: '性格' },
] as const;

const TOPIC_PROMPTS: Record<string, string> = {
  overview: `请生成命格总览，按以下结构输出：

**【命格定性】**
用一句话概括这个命盘的核心格局与命主气质。

**【主星解读】**
命宫主星的核心特质，引用倪海厦原话或观点。

**【三方四正】**
财、官、迁三宫的联动分析及整体格局。

**【当前大限】**
当下大限运势方向与最值得关注的事项。

**【优势与注意】**
命盘天赋优势，以及需要注意的风险或功课。`,

  love: `请深度分析感情婚姻运，按以下结构输出：

**【感情格局】**
一句话定性感情命格。

**【夫妻宫分析】**
夫妻宫主星、四化，以及倪海厦体系的具体解读。

**【三方联动】**
相关宫位对感情的影响。

**【当前大限感情运】**
当下10年感情走向与关键节点。

**【实际建议】**
具体可行的感情建议。`,

  career: `请深度分析事业运，按以下结构输出：

**【事业格局】**
一句话定性事业命格，宜任职或宜创业。

**【官禄宫分析】**
官禄宫主星、四化，以及倪师对这种配置的判断。

**【财帛宫联动】**
财运与事业的关系，财路来源分析。

**【当前大限事业运】**
当下10年事业走向。

**【实际建议】**
适合的方向、行业与策略。`,

  wealth: `请深度分析财运，按以下结构输出：

**【财运格局】**
一句话定性财运模式，是主动财还是被动财。

**【财帛宫分析】**
财帛宫主星、四化，财富来源与流动模式。

**【田宅宫（财库）】**
积蓄能力与不动产运势分析。

**【当前大限财运】**
当下财运走向与注意事项。

**【理财建议】**
具体的财务建议。`,

  health: `请分析健康运势，按以下结构输出：

**【疾厄宫主星】**
疾厄宫星曜与健康含义。

**【主要风险】**
结合倪海厦子午流注理论，分析主要健康隐患与需关注的部位。

**【大限健康走势】**
当下健康趋势与关键时间段。

**【预防建议】**
具体注意事项与养生方向。`,

  personality: `请深度解析性格特质，按以下结构输出：

**【命宫主星性格】**
命宫主星的核心性格特质，引用倪师原话。

**【三方性格综合】**
财、官、迁三宫对性格的影响，全貌描绘。

**【人际关系模式】**
与他人互动方式、待人处世风格。

**【优势与人生课题】**
天赋优势，以及需要面对的人生功课。`,
};

const PALACE_ROLES: Record<string, string> = {
  '命宫':   '自我、性格、先天格局',
  '兄弟宫': '兄弟关系、合伙人',
  '夫妻宫': '感情关系、婚姻状态',
  '子女宫': '子女缘分、下属关系',
  '财帛宫': '财运来源、收入方式',
  '疾厄宫': '身体健康、意外',
  '迁移宫': '外出机遇、人际格局',
  '交友宫': '朋友圈、贵人、小人',
  '官禄宫': '事业成就、社会地位',
  '田宅宫': '不动产、家庭环境',
  '福德宫': '精神享受、内心福分',
  '父母宫': '父母关系、文书契约',
};

export default function InsightPanel({ chart, selectedPalace, selectedSiHua }: InsightPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string>('overview');
  const messagesRef = useRef<Message[]>([]); // always-current copy for closures
  const loadingRef = useRef(false);
  const autoLoaded = useRef(false);
  const lastPalaceBranch = useRef<number | undefined>(undefined);
  const lastSiHuaKey = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // 手机上输入条只在「已经滚到解读面板」之后才吸底，
  // 否则页面还停在命盘时，输入框会浮在命盘上方
  const [pinInput, setPinInput] = useState(false);
  // 切换话题 / 宫位时把新内容从顶部开始读，递增这个值触发一次回顶
  const [resetSignal, setResetSignal] = useState(0);
  // 替换内容后先记下「还没把人带到开头」，等第一批文字到了再校正一次位置：
  // 内容清空的一瞬间页面会塌缩，那一刻滚不到位
  const pinTopRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);

  // 把面板开头带到视口里（顶栏 48 + 余量 8）；桌面则回到面板自身滚动条顶部
  // settle：内容刚清空时页面会变短、一时滚不到位，给一段时间跟着内容长高反复校正，
  //         手指一动就立刻停手，不去和用户抢滚动
  const scrollToPanelStart = (smooth: boolean, settle = 0) => {
    const panel = panelRef.current;
    if (!panel) return;
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (!isMobile) {
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      return;
    }
    const target = () => Math.max(0, panel.getBoundingClientRect().top + window.scrollY - 56);
    window.scrollTo({ top: target(), behavior: smooth ? 'smooth' : 'auto' });
    if (settle <= 0) return;

    let cancelled = false;
    const stop = () => { cancelled = true; };
    window.addEventListener('wheel', stop, { passive: true, once: true });
    window.addEventListener('touchstart', stop, { passive: true, once: true });
    const until = performance.now() + settle;
    const step = () => {
      if (cancelled) return;
      if (performance.now() > until) { stop(); return; }
      const t = target();
      if (Math.abs(t - window.scrollY) > 2) window.scrollTo({ top: t, behavior: 'auto' });
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  // Auto-scroll
  //
  // 桌面：面板自身是固定高度的滚动容器，跟着最新内容走。
  // 手机：面板不设内部滚动（长文让整页滚动更好读），所以只在「新开一段解读」时
  // 把面板顶部带到视野里，流式过程不再跟着跳，避免和手指抢滚动。
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
    if (isMobile) {
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.content === '') scrollToPanelStart(true);
      return;
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 切换话题后回到这块内容的开头，否则人要往下拉才看得到新解读
  useEffect(() => {
    if (!resetSignal) return;
    scrollToPanelStart(false);
  }, [resetSignal]);

  // 正文第一批字到了：页面这时才够长，补一次回顶，确保读到的是标题而不是中段
  useEffect(() => {
    if (!pinTopRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant' || !last.content) return;
    pinTopRef.current = false;
    scrollToPanelStart(true, 3000);
  }, [messages]);

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

  // Auto-generate 命格总览 on mount
  useEffect(() => {
    if (autoLoaded.current) return;
    autoLoaded.current = true;
    sendMessage(TOPIC_PROMPTS.overview, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Inject palace analysis when palace selected
  useEffect(() => {
    if (!selectedPalace || selectedPalace.branch === lastPalaceBranch.current) return;
    lastPalaceBranch.current = selectedPalace.branch;

    const majorStars = selectedPalace.stars.filter(s => s.type === 'major');
    const starDesc = majorStars.length > 0
      ? majorStars.map(s => `${s.name}${s.siHua ? '化' + s.siHua : ''}`).join('、')
      : '空宫（借对宫）';
    const role = PALACE_ROLES[selectedPalace.name] ?? '';

    const prompt = `请重点分析【${selectedPalace.name}】（主管：${role}），该宫主星为${starDesc}，按以下结构输出：

**【宫位定性】**
${selectedPalace.name}在命盘中的意义，以及这种星曜配置的整体判断。

**【主星解读】**
主星在此宫的倪海厦体系解读，引用具体观点。

**【三方四正联动】**
三方四正宫位对此宫的影响。

**【实际建议】**
基于此宫的具体建议。`;

    setActiveTopic(''); // 宫位解读不是任何一个话题，别让话题按钮亮着迷惑人
    sendMessage(prompt, true, true);
  }, [selectedPalace]); // eslint-disable-line react-hooks/exhaustive-deps

  // 注入四化飞化分析
  useEffect(() => {
    if (!selectedSiHua) return;
    const key = `${selectedSiHua.starName}-${selectedSiHua.siHua}-${selectedSiHua.view}`;
    if (key === lastSiHuaKey.current) return;
    lastSiHuaKey.current = key;

    // 找出该星所在宫位
    const palaceOfStar = chart.palaces.find(p =>
      p.stars.some(s => s.name === selectedSiHua.starName)
    );
    const palaceName = palaceOfStar?.name ?? '未知宫位';
    const viewLabel = selectedSiHua.view === 'daxian' ? '大限' : '流年';

    const prompt = `请分析【${viewLabel}${selectedSiHua.starName}化${selectedSiHua.siHua}】的飞化影响，按以下结构输出：

**【化${selectedSiHua.siHua}基本含义】**
化${selectedSiHua.siHua}在倪海厦体系中的核心含义，以及${selectedSiHua.starName}化${selectedSiHua.siHua}的特殊含义。

**【落宫影响】**
${selectedSiHua.starName}化${selectedSiHua.siHua}落在【${palaceName}】，该宫主管的领域受到何种影响，倪师如何解读。

**【三方四正飞化路径】**
化${selectedSiHua.siHua}入${palaceName}后，对其三方四正（对宫、两个三合宫）的联动影响。

**【当前运势影响】**
在${viewLabel}时间维度下，此化${selectedSiHua.siHua}对命主近期运势的具体影响。

**【实际建议】**
基于此四化的具体可操作建议。`;

    setActiveTopic('');
    sendMessage(prompt, true, true);
  }, [selectedSiHua]); // eslint-disable-line react-hooks/exhaustive-deps

  const streamResponse = async (apiMessages: { role: 'user' | 'assistant'; content: string }[]) => {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/interpret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chart, messages: apiMessages }),
        signal: controller.signal,
      });
      if (res.status === 404) throw new Error('api-missing');
      if (!res.ok) {
        // 服务端已经把「没配 Key」「模型报错」等原因写在 message 里，直接透出给用户
        const detail = await res.json().catch(() => null) as { message?: string } | null;
        throw new Error(detail?.message || '请求失败');
      }
      // 没配模型时服务端不返回流，而是返回组装好的完整提示词
      const contentType = res.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const payload = await res.json().catch(() => null) as
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
        // 网络可能把一帧切成两半，残行留到下一轮，否则这段文字会被整段丢掉
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
          const delta = parsed?.delta?.text ?? '';
          assistantText += delta;
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: 'assistant', content: assistantText };
            return updated;
          });
        }
      }
    } catch (e) {
      // 被下一次切换打断：直接丢掉，不算错误
      if (e instanceof DOMException && e.name === 'AbortError') return;
      if (e instanceof Error && e.name === 'AbortError') return;
      const missing = e instanceof Error && e.message === 'api-missing';
      const message = missing
        ? 'AI 解读接口未启用。请在 .env.local 里配置 AI_PROVIDER 与对应的 API Key 后重启服务。'
        : (e instanceof Error && e.message) || '解读失败，请稍后重试。';
      setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    } finally {
      // 只有「自己还是最新那次请求」才允许收尾，否则会把新请求的 loading 误清掉
      if (abortRef.current === controller) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  };

  /**
   * @param replace true = 换一个解读对象（话题 / 宫位 / 四化），清掉旧内容重新开始；
   *                false = 在下方追问，保留对话上下文。
   */
  const sendMessage = (text: string, hidden = false, replace = false) => {
    if (!text.trim()) return;
    if (loadingRef.current) {
      // 追问时不允许并发；切换时直接把上一段流掐断
      if (!replace) return;
      abortRef.current?.abort();
    }

    const userMsg: Message = { role: 'user', content: text, hidden };
    const base = replace ? [] : messagesRef.current;
    const apiMessages = [...base, userMsg].map(m => ({
      role: m.role,
      content: m.content,
    }));

    messagesRef.current = [...base, userMsg];
    loadingRef.current = true;
    setLoading(true);
    setMessages(messagesRef.current);
    setInput('');
    if (replace) {
      pinTopRef.current = true;
      setResetSignal(n => n + 1);
    }
    streamResponse(apiMessages);
  };

  const handleTopicClick = (topicKey: string) => {
    if (!loadingRef.current && topicKey === activeTopic) return;
    setActiveTopic(topicKey);
    sendMessage(TOPIC_PROMPTS[topicKey], true, true);
  };

  const handleSend = () => {
    sendMessage(input);
  };

  return (
    <div
      ref={panelRef}
      data-insight-panel
      className="insight-panel on-cream flex flex-col px-3 pt-4 pb-2 lg:px-0 lg:pt-0 lg:pb-0 lg:h-full lg:overflow-hidden"
    >

      {/* ── Topic buttons（手机端吸顶，滚到正文里也能直接切） ── */}
      <div className="insight-topics flex-shrink-0">
        <div className="insight-topics-scroll">
          {TOPICS.map(t => {
            const isActive = activeTopic === t.key;
            return (
              <button
                key={t.key}
                onClick={() => handleTopicClick(t.key)}
                aria-pressed={isActive}
                className="w-full py-2 text-[12px] font-medium rounded-full transition-all duration-150 lg:py-1.5 lg:text-[10px]"
                style={{
                  background: isActive
                    ? 'linear-gradient(135deg, var(--violet) 0%, var(--violet-2) 100%)'
                    : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${isActive ? 'rgba(255,255,255,0.16)' : 'var(--bdr)'}`,
                  color: isActive ? '#fff' : 'var(--tx-2)',
                  boxShadow: isActive ? '0 4px 14px rgba(112,80,200,0.28)' : 'none',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} className="px-1 pt-4 pb-2 space-y-6 lg:flex-1 lg:overflow-y-auto lg:min-h-0 lg:px-4 lg:py-4 lg:space-y-4">

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            if (msg.role === 'user' && msg.hidden) return null;

            if (msg.role === 'user') {
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div
                    className="max-w-[88%] rounded-xl px-3.5 py-2.5 text-[14px] leading-relaxed break-words lg:max-w-[85%] lg:px-3 lg:py-2 lg:text-[11px]"
                    style={{
                      background: 'var(--ac-bg)',
                      border: '1px solid var(--ac-bdr)',
                      color: 'var(--ac)',
                    }}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            }

            // Assistant message
            const isLastMsg = i === messages.length - 1;
            // 首字还没到：整条先不渲染，交给下面的「正在解盘」占位
            if (!msg.content && isLastMsg && loading) return null;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div
                  className="text-[10px] tracking-widest mb-2.5 flex items-center gap-1.5 lg:mb-2 lg:text-[9px]"
                  style={{ color: 'var(--tx-3)' }}
                >
                  <span style={{ color: 'var(--ac)', opacity: 0.5 }}>✦</span>
                  命理解读
                </div>
                <AiContent text={msg.content} streaming={loading && isLastMsg} />
                {msg.copyText && <CopyPrompt text={msg.copyText} />}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* 首字未到：给个占位，既让人知道在算，也避免面板瞬间塌掉、
            把滚动位置甩到中段 */}
        {loading && !(messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content) && (
          <div className="flex flex-col items-center justify-center text-center min-h-[46vh] lg:min-h-0 lg:py-16">
            <div className="text-3xl mb-3 animate-pulse" style={{ color: 'var(--ac)', opacity: 0.55 }}>✦</div>
            <p className="text-[13px] lg:text-[10px]" style={{ color: 'var(--tx-3)' }}>正在解盘…</p>
            <p className="text-[11px] mt-1.5 lg:text-[9px]" style={{ color: 'var(--tx-3)', opacity: 0.85 }}>
              模型先推演盘面，通常十几秒
            </p>
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div
        className={`${pinInput ? 'sticky z-20 backdrop-blur-md rounded-2xl' : 'relative'} flex-shrink-0 px-1 pb-3 pt-2.5 lg:static lg:backdrop-blur-none lg:rounded-none lg:pt-2 lg:px-3`}
        style={{
          bottom: pinInput ? 'calc(70px + env(safe-area-inset-bottom))' : undefined,
          borderTop: '1px solid var(--bdr)',
          background: 'rgba(255,253,248,0.96)',
        }}
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="继续追问，如：今年适合换工作吗？"
            disabled={loading}
            className="flex-1 rounded-full px-4 py-2.5 text-[16px] focus:outline-none transition-colors lg:py-2 lg:text-[11px]"
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--bdr-med)',
              color: 'var(--tx-0)',
            }}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-full text-[14px] font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed lg:px-3 lg:py-2 lg:text-[11px] text-white"
            style={{
              background: 'linear-gradient(135deg, var(--violet) 0%, var(--violet-2) 100%)',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 4px 14px rgba(112,80,200,0.26)',
            }}
          >
            {loading ? '…' : '追问'}
          </button>
        </div>
      </div>

    </div>
  );
}
