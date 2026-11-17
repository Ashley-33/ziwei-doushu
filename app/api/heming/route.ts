/**
 * POST /api/heming —— 双人合盘 AI 分析（流式）
 *
 * 请求：{ chartA: ZiweiChart, chartB: ZiweiChart, question?: string }
 * 响应：text/event-stream，帧格式与 /api/interpret 一致
 */

import { resolveAiConfig } from '@/lib/ai/provider';
import { streamCompletion, sseResponse } from '@/lib/ai/stream';
import { buildHemingMessages } from '@/lib/ai/prompts';
import { buildHemingPromptText, promptOnlyPayload } from '@/lib/ai/export-prompt';
import { errorResponse, isChartLike } from '@/lib/ai/guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_QUESTION_CHARS = 500;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, 'bad-request', '请求体不是合法 JSON');
  }

  const { chartA, chartB, question } = (body ?? {}) as {
    chartA?: unknown;
    chartB?: unknown;
    question?: unknown;
  };

  if (!isChartLike(chartA) || !isChartLike(chartB)) {
    return errorResponse(400, 'bad-chart', '双方命盘数据不完整，请重新起盘后再试');
  }

  if (question !== undefined && question !== null && typeof question !== 'string') {
    return errorResponse(400, 'bad-question', 'question 必须是字符串');
  }

  const ai = resolveAiConfig();
  if (!ai.configured) {
    // 与 /api/interpret 一致：没配 Key 时导出提示词，而不是直接失败
    return Response.json(
      promptOnlyPayload(
        buildHemingPromptText(
          chartA,
          chartB,
          typeof question === 'string' ? question.slice(0, MAX_QUESTION_CHARS) : undefined,
        ),
        ai.message,
      ),
    );
  }

  const stream = streamCompletion(
    ai.config,
    buildHemingMessages(chartA, chartB, typeof question === 'string' ? question.slice(0, MAX_QUESTION_CHARS) : undefined),
    { temperature: 0.7, maxTokens: 2400, signal: req.signal },
  );

  return sseResponse(stream);
}
