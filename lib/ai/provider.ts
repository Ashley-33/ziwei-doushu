/**
 * AI 供应商配置 —— 全部走 OpenAI 兼容协议
 *
 * 只需要在 .env.local 里填两样东西：AI_PROVIDER + 对应的 *_API_KEY。
 * 想临时换模型/换中转站，用 AI_BASE_URL / AI_MODEL 覆盖即可。
 */

export interface AiProviderConfig {
  /** 供应商 key，如 deepseek */
  provider: string;
  /** 供应商显示名 */
  label: string;
  /** OpenAI 兼容 base url，不带结尾斜杠 */
  baseUrl: string;
  model: string;
  apiKey: string;
}

export type AiConfigResult =
  | { configured: true; config: AiProviderConfig }
  | { configured: false; message: string };

interface Preset {
  label: string;
  baseUrl: string;
  model: string;
  keyEnv: string;
}

/**
 * 各家的默认地址与默认模型。
 * 注意：只有 baseUrl / model 能被 AI_BASE_URL / AI_MODEL 覆盖，key 永远只从环境变量读。
 */
const PRESETS: Record<string, Preset> = {
  deepseek: {
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    keyEnv: 'DEEPSEEK_API_KEY',
  },
  moonshot: {
    label: 'Moonshot 月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    model: 'moonshot-v1-32k',
    keyEnv: 'MOONSHOT_API_KEY',
  },
  zhipu: {
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    model: 'glm-4-plus',
    keyEnv: 'ZHIPU_API_KEY',
  },
  zai: {
    label: 'z.ai',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    model: 'glm-4.6',
    keyEnv: 'ZAI_API_KEY',
  },
  siliconflow: {
    label: 'SiliconFlow 硅基流动',
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'Qwen/Qwen3-235B-A22B-Instruct-2507',
    keyEnv: 'SILICONFLOW_API_KEY',
  },
  dashscope: {
    label: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    keyEnv: 'DASHSCOPE_API_KEY',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'deepseek/deepseek-chat',
    keyEnv: 'OPENROUTER_API_KEY',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    keyEnv: 'OPENAI_API_KEY',
  },
  /** 自建 / 中转站 / 其他兼容接口，地址与模型都从环境变量读 */
  custom: {
    label: '自定义接口',
    baseUrl: '',
    model: '',
    keyEnv: 'AI_API_KEY',
  },
};

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

/** 去掉结尾斜杠，避免拼出 //chat/completions */
function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * 从环境变量解析出可用的供应商配置。
 * 没配好时返回 configured: false + 一句能直接展示给用户的中文说明。
 */
export function resolveAiConfig(): AiConfigResult {
  const provider = clean(process.env.AI_PROVIDER).toLowerCase() || 'deepseek';

  if (provider === 'mimo') {
    // 旧版 .env.example 里的 MiMo 写法：地址、模型、key 全从环境变量读
    const apiKey = clean(process.env.MIMO_API_KEY);
    const baseUrl = trimSlash(clean(process.env.MIMO_BASE_URL));
    const model = clean(process.env.MIMO_MODEL);
    if (!apiKey || !baseUrl || !model) {
      return {
        configured: false,
        message: 'AI 未配置：MIMO_API_KEY / MIMO_BASE_URL / MIMO_MODEL 三项都要填。',
      };
    }
    return { configured: true, config: { provider, label: 'MiMo', baseUrl, model, apiKey } };
  }

  const preset = PRESETS[provider];
  if (!preset) {
    return {
      configured: false,
      message: `AI 未配置：AI_PROVIDER="${provider}" 不认识，可选 ${Object.keys(PRESETS).join(' / ')} / mimo。`,
    };
  }

  const apiKey = clean(process.env[preset.keyEnv]) || clean(process.env.AI_API_KEY);
  const baseUrl = trimSlash(clean(process.env.AI_BASE_URL) || preset.baseUrl);
  const model = clean(process.env.AI_MODEL) || preset.model;

  if (!apiKey) {
    return {
      configured: false,
      message: `AI 未配置：请在 .env.local 里填 ${preset.keyEnv}（当前 AI_PROVIDER=${provider}）。`,
    };
  }
  if (!baseUrl || !model) {
    return {
      configured: false,
      message: 'AI 未配置：AI_BASE_URL 与 AI_MODEL 都要填（AI_PROVIDER=custom 时必填）。',
    };
  }

  return { configured: true, config: { provider, label: preset.label, baseUrl, model, apiKey } };
}
