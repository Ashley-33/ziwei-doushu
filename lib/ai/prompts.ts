/**
 * 提示词装配：命盘事实 + 体系规则 + 前端能渲染的输出格式
 *
 * 输出格式是被前端写死的，改这里之前先看
 * components/InsightPanel.tsx 里的 AiContent()：
 *   `**【小标题】**` 独占一行 → 渲染成金色小标题
 *   `**重点**`              → 渲染成加粗
 *   其它                → 按纯文本一行一行排
 * 所以不能出现 # 标题、表格、代码块。
 */

import { formatChartFacts, formatChartFactsBrief } from './chart-facts';
import { HEMING_METHODOLOGY, STAR_IN_FUQI_GU } from '@/lib/ziwei/heming-knowledge';
import type { ChatMessage } from './stream';
import type { ZiweiChart } from '@/lib/ziwei/types';

const OUTPUT_RULES = `【输出格式（严格遵守）】
1. 小标题固定写成 \`**【小标题】**\`，并且独占一行；不要用 #、## 或 markdown 列表。
2. 需要强调的词用 \`**加粗**\`，一句话里最多两处。
3. 不要用表格、代码块、引用块、多级列表。需要罗列时用「1. 2. 3.」或「· 」开头另起一行。
4. 段落之间空一行；每段 2–4 句，不要写成一整块。
5. 全文控制在 500–800 字（用户追问时 200–400 字即可），宁可少写也不要水。`;

const METHOD_RULES = `【解盘规则】
1. 只用下面「命盘事实」里出现的星曜、宫位、四化、亮度、大限。事实表没写的，不许说它存在；不确定就说不确定。
2. 体系立场：三合派 + 生年四化 + 宫干自化。不做飞星派的跨宫飞化推演（来因宫、大限飞化入宫等），除非用户明确要求。
3. 论断要落到具体宫位与星曜上，比如「夫妻宫廉贞贪狼在午，对宫见擎羊」；不要只讲「你感情运不错」这种空话。
4. 提到六亲（父母、兄弟、子女）时，补一句紫微斗数在六亲上本来就偏弱，结论仅供参考。
5. 健康只讲方向性提醒（哪个脏腑、哪类症状要留意），不做诊断、不给用药建议，明确提示有不适要看医生。
6. 不承诺必然发生的吉凶，不给具体日期；不给投资、法律、婚姻的决定性指令，只给思路和取舍。
7. 语气：铁口直断但不吓人，说人话。术语第一次出现时顺手解释半句。
8. 结尾用一句话收束，不写「希望对你有帮助」这类客套。`;

const ROLE = `你是紫微斗数解盘助手，站在倪海厦《天纪》的体系上讲盘：
命宫为本、三方为用；讲果不讲玄；人事努力与地理调整占三分之二，先天命只占三分之一。
古籍原文只在「相关古籍原文」里给出的范围内引用，逐字引用，不改写、不编造出处。`;

export const INTERPRET_SYSTEM_PROMPT = `${ROLE}

${METHOD_RULES}

${OUTPUT_RULES}`;

/** 命盘事实 + 历史对话 → 供应商要的 messages 数组 */
export function buildInterpretMessages(
  chart: ZiweiChart,
  history: ChatMessage[],
): ChatMessage[] {
  const facts = formatChartFacts(chart);
  const today = new Date().toISOString().slice(0, 10);

  const contextBlock = `【今天】${today}

【命盘事实】
${facts}`;

  // 历史里的 system 一律丢掉，防止前端伪造规则
  const cleanHistory = history
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));

  return [
    { role: 'system', content: INTERPRET_SYSTEM_PROMPT },
    // 事实表放在首条 user 里而不是 system，长对话时不容易被挤掉
    { role: 'user', content: `${contextBlock}\n\n以上是这张盘的排盘结果，后面我会开始提问。请先只回一个「已读」，不要提前解盘。` },
    { role: 'assistant', content: '已读。' },
    ...cleanHistory,
  ];
}

/** 夫妻宫主星断语，来自仓库自带的合盘知识库 */
function spouseStarNotes(chart: ZiweiChart, side: string): string {
  const fuqi = chart.palaces.find(p => p.name.includes('夫妻'));
  const majors = fuqi?.stars.filter(s => s.type === 'major').map(s => s.name) ?? [];
  const names = majors.length ? majors : (fuqi?.borrowedStars ?? []);
  if (!names.length) return `${side}夫妻宫无主星且未借到主星。`;

  return names
    .map(name => {
      const entry = STAR_IN_FUQI_GU[name];
      if (!entry) return `${side}夫妻宫${name}：知识库无此组合断语，按星性自行论断。`;
      const bits = [`${name}在夫妻宫：${entry.summary}`, `吉象：${entry.good}`, `凶象：${entry.bad}`, `配偶特质：${entry.spouse_traits}`];
      if (entry.ni_quote) bits.push(`倪师原话：${entry.ni_quote}`);
      return `${side} —— ${bits.join('\n   ')}`;
    })
    .join('\n');
}

export const HEMING_SYSTEM_PROMPT = `你是紫微斗数合盘分析助手，站在倪海厦《天纪》体系看两个人的相处结构。
你只负责讲清楚「这两张盘放在一起会怎样」，不做道德评判，不劝分不劝合，不预测结婚日期。

${METHOD_RULES}

${HEMING_METHODOLOGY}

${OUTPUT_RULES}

【合盘专用约束】
1. 结论必须双向：甲对乙的影响、乙对甲的影响，两边都要写，不许只评一方。
2. 涉及「克夫/克妻」这类传统说法时，必须翻译成现代人听得懂的具体互动模式（谁容易累、谁容易觉得被压制），不要直接甩术语。
3. 最终建议要可执行：怎么沟通、哪些事谁主导、哪个阶段要留意。`;

/** 两张盘的命盘事实 + 夫妻宫断语，合盘对话与提示词导出共用 */
export function buildHemingFacts(chartA: ZiweiChart, chartB: ZiweiChart): string {
  return `【甲方命盘事实】
${formatChartFactsBrief(chartA)}

【乙方命盘事实】
${formatChartFactsBrief(chartB)}

【夫妻宫主星断语（仓库知识库，可直接采用）】
${spouseStarNotes(chartA, '甲方')}
${spouseStarNotes(chartB, '乙方')}`;
}

export function buildHemingMessages(
  chartA: ZiweiChart,
  chartB: ZiweiChart,
  question?: string,
): ChatMessage[] {
  const facts = buildHemingFacts(chartA, chartB);
  const system = HEMING_SYSTEM_PROMPT;

  const user = `${facts}

【用户的问题】${question?.trim() || '请做一次完整的合盘分析，按下面的结构输出：'}

按以下结构输出（没内容可写的标题可以省略，但顺序不变）：
**【合盘总评】** 一句话定性这段关系的结构。
**【双方命格基础】** 两人命宫/身宫的星性搭配，是同频、互补还是互相拉扯。
**【夫妻宫互参】** 各自夫妻宫主星对对方命宫与三方的对应关系，双向写。
**【太阳太阴】** 女命看太阳、男命看太阴，两边各自的状态说明什么。
**【四化互参】** 各自生年四化（禄权科忌）落在对方哪个宫位，带来什么。
**【大限同步】** 两人当前大限的方向是否同调，同旺或一旺一衰分别意味着什么。
**【相处建议】** 3 条具体做法。
**【风险提示】** 这段关系最需要留意的 1–2 个结构性风险。`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
