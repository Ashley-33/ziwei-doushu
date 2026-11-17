/**
 * 未配置模型时的兜底：把「引擎算好的命盘事实 + 体系规则」导出成一段可以直接
 * 粘贴给任意 AI 的完整提示词。
 *
 * 为什么可以这么做：解盘的难点是「把盘算准」和「把规矩讲清」——这两步全部在
 * 本仓库里完成（iztro 排盘 + 三合派规则 + 古籍检索）。模型只负责措辞。所以没有
 * API Key 并不会让解读质量变差，只是需要把这段文字搬到有模型的地方去。
 */

import { formatChartFacts } from './chart-facts';
import { buildHemingFacts, HEMING_SYSTEM_PROMPT, INTERPRET_SYSTEM_PROMPT } from './prompts';
import type { ChatMessage } from './stream';
import type { ZiweiChart } from '@/lib/ziwei/types';

const SEP = '\n\n────────────\n\n';

const HEADER = `（这台机器没有配置模型 API Key，所以解读没法直接生成。下面是引擎已经算好的完整提示词 —— 复制后粘到任意 AI 窗口就能得到同等质量的解读，因为命盘事实、格局、古籍引用全都写在里面，模型不需要再查资料。）`;

function block(title: string, body: string): string {
  return `【${title}】\n${body.trim()}`;
}

/** 命盘解读的导出文本 */
export function buildInterpretPromptText(chart: ZiweiChart, history: ChatMessage[]): string {
  const question = [...history].reverse().find(m => m.role === 'user')?.content.trim() ?? '';
  const facts = block('命盘事实', formatChartFacts(chart));

  return [
    HEADER,
    SEP,
    INTERPRET_SYSTEM_PROMPT,
    SEP,
    facts,
    SEP,
    block('我的问题', question || '请按系统提示里的结构，做一次命格总览。'),
  ].join('');
}

/** 合盘分析的导出文本 */
export function buildHemingPromptText(
  chartA: ZiweiChart,
  chartB: ZiweiChart,
  question?: string,
): string {
  return [
    HEADER,
    SEP,
    HEMING_SYSTEM_PROMPT,
    SEP,
    buildHemingFacts(chartA, chartB),
    SEP,
    block('我的问题', question?.trim() || '请按系统提示里的结构，做一次完整的合盘分析。'),
  ].join('');
}

/** 前端约定的「提示词导出」响应体 */
export function promptOnlyPayload(prompt: string, reason: string) {
  return { mode: 'prompt-only' as const, reason, prompt };
}
