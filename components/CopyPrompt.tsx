'use client';

import { useState } from 'react';

/** 未配置模型时给用户看的话：先说明能怎么办，再补一句怎么配 */
export function promptOnlyMessage(reason?: string): string {
  const detail = (reason ?? '').replace(/^AI 未配置：/, '');
  const head =
    '这台机器没配置模型 API Key，解读没法直接生成。下面的提示词已经包含完整的命盘事实与解盘规则 —— 复制后粘到任意 AI 窗口（WorkBuddy、Claude、ChatGPT 都行），得到的解读是一样的。';
  return detail ? `${head}\n\n要直接在这里出结果：${detail}` : head;
}

/**
 * 复制到剪贴板。优先用异步 Clipboard API；它不是所有环境都可用
 * （http 非 localhost 不算安全上下文，某些浏览器也会拒权限），
 * 所以再兜一层隐藏 textarea + execCommand。
 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* 落到下面的兜底 */
  }

  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * 未配置模型时的出口：把引擎算好的完整提示词一键复制。
 *
 * 解盘的难点是「把盘算准」和「把规矩讲清」，两步都在本地完成，模型只负责措辞。
 * 所以没有 API Key 也不影响解读质量，只要把这段文字搬到有模型的地方去。
 */
export default function CopyPrompt({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'done' | 'fail'>('idle');
  const [expanded, setExpanded] = useState(false);

  const copy = async () => {
    const ok = await writeClipboard(text);
    setState(ok ? 'done' : 'fail');
    // 复制成功就收起面板；失败时展开只读文本框让用户手动选
    if (ok) setExpanded(false);
    else setExpanded(true);
    setTimeout(() => setState('idle'), 2500);
  };

  const label = state === 'done' ? '已复制' : state === 'fail' ? '复制失败，已展开文本框' : '复制完整提示词';

  return (
    <div className="mt-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={copy}
          className="rounded-md px-2.5 py-1.5 text-[10px] font-medium transition-colors"
          style={{
            border: '1px solid var(--t-gold)',
            color: 'var(--t-gold)',
            background: state === 'done' ? 'rgba(198,164,92,0.12)' : 'transparent',
          }}
        >
          {state === 'done' ? '✓ ' : ''}{label}
        </button>
        <span className="text-[9.5px]" style={{ color: 'var(--t-faint)' }}>
          共 {text.length} 字 · 粘到任意 AI 窗口即可
        </span>
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-[9.5px] underline underline-offset-2"
          style={{ color: 'var(--t-faint)' }}
        >
          {expanded ? '收起原文' : '查看原文'}
        </button>
      </div>

      {expanded && (
        <textarea
          readOnly
          value={text}
          onFocus={e => e.currentTarget.select()}
          className="mt-2 w-full rounded-md p-2 text-[10px] leading-relaxed font-mono resize-y"
          style={{
            height: '180px',
            background: 'var(--t-card)',
            border: '1px solid var(--t-border)',
            color: 'var(--t-text2)',
          }}
        />
      )}
    </div>
  );
}
