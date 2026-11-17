/**
 * OpenAI 兼容接口的流式调用 + 前端约定的 SSE 输出
 *
 * 前端（InsightPanel / ChatPanel / heming 页）只认这一种帧格式：
 *     data: {"delta":{"text":"..."}}\n\n
 *     ...
 *     data: [DONE]\n\n
 *
 * 出错时先发一帧 {"error":"..."}，再发 [DONE]，前端据此显示原因。
 */

import type { AiProviderConfig } from './provider';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamOptions {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** 供应商返回的错误体，截断后塞进 Error.message */
function errorMessageFrom(status: number, body: string): string {
  const brief = body.replace(/\s+/g, ' ').slice(0, 300);
  if (status === 401 || status === 403) return `模型返回 ${status}：Key 可能无效或已过期。${brief}`;
  if (status === 402) return `模型返回 402：账户余额不足。${brief}`;
  if (status === 429) return `模型返回 429：请求太频繁或额度用尽，稍后再试。${brief}`;
  return `模型返回 ${status}：${brief}`;
}

/**
 * 逐段吐出模型输出的文本增量。
 * 调用方拿到的是纯文本片段流，SSE 封装交给 sseResponse()。
 */
export async function* streamCompletion(
  config: AiProviderConfig,
  messages: ChatMessage[],
  options: StreamOptions = {},
): AsyncGenerator<string> {
  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: true,
        temperature: options.temperature ?? 0.7,
        ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
      }),
      signal: options.signal,
    });
  } catch (err) {
    // DNS / 连接被拒 / 证书 / 超时都落在这里，原文是 "fetch failed"，用户看不懂
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`连不上模型接口（${config.baseUrl}），请检查 AI_BASE_URL 与网络：${reason}`);
  }

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    throw new Error(errorMessageFrom(res.status, body));
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE 以空行分帧；只处理完整的行，残行留到下一轮（避免半个 JSON 被丢掉）
      let newlineIdx: number;
      while ((newlineIdx = buffer.indexOf('\n')) >= 0) {
        const rawLine = buffer.slice(0, newlineIdx);
        buffer = buffer.slice(newlineIdx + 1);
        const line = rawLine.endsWith('\r') ? rawLine.slice(0, -1) : rawLine;
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (payload === '[DONE]') return;
        if (!payload) continue;

        let parsed: unknown;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }

        const chunk = parsed as {
          choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
          error?: { message?: string };
        };

        if (chunk.error?.message) throw new Error(`模型报错：${chunk.error.message}`);

        const text = chunk.choices?.[0]?.delta?.content;
        if (text) yield text;
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

/** 把文本增量流包成前端约定的 SSE Response */
export function sseResponse(stream: AsyncGenerator<string>): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
        } catch {
          /* 客户端已断开，忽略 */
        }
      };
      try {
        for await (const text of stream) {
          if (text) send({ delta: { text } });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '模型调用失败';
        send({ error: message });
      } finally {
        try {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch {
          /* 同上 */
        }
      }
    },
  });

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // 让 nginx / 反代不缓冲，否则流式会变成一次性吐完
      'X-Accel-Buffering': 'no',
    },
  });
}

/** 把整段流拼成一个字符串（合盘这种一次性输出用不上 SSE 时可用，目前保留给测试） */
export async function collectCompletion(
  config: AiProviderConfig,
  messages: ChatMessage[],
  options: StreamOptions = {},
): Promise<string> {
  let out = '';
  for await (const text of streamCompletion(config, messages, options)) out += text;
  return out;
}
