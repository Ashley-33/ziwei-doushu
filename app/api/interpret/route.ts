/**
 * POST /api/interpret —— 命盘 AI 解读（流式）
 *
 * 请求：{ chart: ZiweiChart, messages: {role,content}[] }
 * 响应：text/event-stream，帧格式 data: {"delta":{"text":"..."}}，最后一帧 data: [DONE]
 *
 * 开源版原本没有这个路由，前端会提示「需要你自己实现」。这里给一份
 * 自带实现的参考版本：命盘事实由本仓库引擎生成，模型只负责表达。
 */

import { resolveAiConfig } from '@/lib/ai/provider';
import { streamCompletion } from '@/lib/ai/stream';
import { sseResponse } from '@/lib/ai/stream';
import { buildInterpretMessages } from '@/lib/ai/prompts';
import { buildInterpretPromptText, promptOnlyPayload } from '@/lib/ai/export-prompt';
import { errorResponse, isChartLike, sanitizeHistory } from '@/lib/ai/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 流式输出最长 5 分钟，避免长解读被平台默认超时截断
export const maxDuration = 300;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'bad-request', '请求体不是合法 JSON');
  }

  const { chart, messages } = (body ?? {}) as { chart?: unknown; messages?: unknown };

  if (!isChartLike(chart)) {
    return errorResponse(400, 'bad-chart', '命盘数据不完整，请重新排盘后再试');
  }

  const history = sanitizeHistory(messages);
  if (!history.ok) {
    return errorResponse(400, 'bad-messages', history.message);
  }

  const ai = resolveAiConfig();
  if (!ai.configured) {
    // 没配 Key 不等于不能用：把引擎算好的提示词导出，前端一键复制粘到任意 AI 即可。
    // 解盘的难点在「算准 + 讲清规矩」，这两步都在本仓库完成，模型只负责措辞。
    return Response.json(
      promptOnlyPayload(buildInterpretPromptText(chart, history.messages), ai.message),
    );
  }

  const stream = streamCompletion(ai.config, buildInterpretMessages(chart, history.messages), {
    temperature: 0.7,
    maxTokens: 2000,
    signal: req.signal,
  });

  return sseResponse(stream);
}
