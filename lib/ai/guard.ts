/**
 * 请求体的轻量校验 —— 命盘对象来自浏览器，不能当可信数据用。
 * 只校验「形状对不对」，不做排盘合法性校验（那是引擎的事）。
 */

import type { ZiweiChart } from '@/lib/ziwei/types';
import type { ChatMessage } from './stream';

export function isChartLike(value: unknown): value is ZiweiChart {
  if (!value || typeof value !== 'object') return false;
  const chart = value as Partial<ZiweiChart>;
  if (!Array.isArray(chart.palaces) || chart.palaces.length !== 12) return false;
  if (typeof chart.mingGongBranch !== 'number') return false;
  if (!chart.birthInfo || typeof chart.birthInfo !== 'object') return false;

  return chart.palaces.every(p => {
    if (!p || typeof p !== 'object') return false;
    const palace = p as { branch?: unknown; name?: unknown; stars?: unknown };
    return (
      typeof palace.branch === 'number' &&
      palace.branch >= 0 &&
      palace.branch <= 11 &&
      typeof palace.name === 'string' &&
      Array.isArray(palace.stars)
    );
  });
}

const MAX_MESSAGES = 40;
const MAX_CHARS_PER_MESSAGE = 8000;

export type HistoryResult =
  | { ok: true; messages: ChatMessage[] }
  | { ok: false; message: string };

/** 对话历史裁剪：只留 user/assistant、限条数、限单条长度，保留最近的部分 */
export function sanitizeHistory(value: unknown): HistoryResult {
  if (value === undefined || value === null) return { ok: true, messages: [] };
  if (!Array.isArray(value)) return { ok: false, message: 'messages 必须是数组' };

  const cleaned: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (role !== 'user' && role !== 'assistant') continue;
    if (typeof content !== 'string' || !content.trim()) continue;
    cleaned.push({ role, content: content.slice(0, MAX_CHARS_PER_MESSAGE) });
  }

  const trimmed = cleaned.slice(-MAX_MESSAGES);
  const last = trimmed[trimmed.length - 1];
  if (!last || last.role !== 'user') {
    return { ok: false, message: '最后一条消息必须是用户提问' };
  }
  return { ok: true, messages: trimmed };
}

/** 统一的错误响应：前端读 message 直接显示在对话里 */
export function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: code, message }, { status });
}
