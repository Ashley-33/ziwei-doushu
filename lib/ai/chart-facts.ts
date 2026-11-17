/**
 * 把 ZiweiChart 压成一段人（模型）看得懂的纯文字事实表。
 *
 * 原则：
 *  - 只写盘上确实有的东西，不做任何解读、不下吉凶结论（解读交给模型）
 *  - 星曜带亮度、四化、自化，空宫写明借哪一宫
 *  - 格局与古籍原文一并附上，模型据此引用，避免它自己编
 */

import type { ZiweiChart, Palace, Star } from '@/lib/ziwei/types';
import { detectPatterns, type Pattern } from '@/lib/ziwei/patterns';
import { searchClassics } from '@/lib/classics';

const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

const PATTERN_LEVEL: Record<Pattern['level'], string> = {
  excellent: '上格',
  good: '吉格',
  neutral: '中性',
  caution: '破格警示',
};

/** 星曜标注：主星带亮度，其余带类型 */
function starLabel(star: Star): string {
  const parts = [star.name];
  if (star.type === 'major' && star.brightnessRaw) parts.push(`(${star.brightnessRaw})`);
  const typeLabel =
    star.type === 'major' ? ''
    : star.type === 'sha' ? '煞'
    : star.type === 'lucky' ? '吉'
    : '杂';
  if (typeLabel) parts.push(typeLabel);
  if (star.siHua) parts.push(`化${star.siHua}`);
  return parts.join('');
}

function palaceLine(palace: Palace): string {
  const branch = BRANCHES[palace.branch] ?? '?';
  const stem = STEMS[palace.stem] ?? '?';
  // 宫名本身已经是「命宫」时不再重复挂标签
  const tags: string[] = [];
  if (palace.isMingGong) tags.push('命宫');
  if (palace.isShenGong) tags.push('身宫');
  if (palace.isCurrentDaXian) tags.push('当前大限');
  const tagText = tags.filter(t => t !== palace.name);

  const majors = palace.stars.filter(s => s.type === 'major');
  const others = palace.stars.filter(s => s.type !== 'major');

  // 传统写法是「天干 + 地支」，如 甲寅宫
  const head = `${stem}${branch}宫 · ${palace.name}${tagText.length ? `【${tagText.join('/')}】` : ''}`;

  const bits: string[] = [];
  if (majors.length) {
    bits.push(`主星 ${majors.map(starLabel).join('、')}`);
  } else {
    const borrowed = palace.borrowedStars?.length
      ? `借对宫${palace.borrowedFromName ?? ''}主星 ${palace.borrowedStars.join('、')}`
      : '无主星（空宫）';
    bits.push(borrowed);
  }
  if (others.length) bits.push(`辅煞 ${others.map(starLabel).join('、')}`);

  const siHuaStars = palace.stars.filter(s => s.siHua);
  if (siHuaStars.length) {
    bits.push(`生年四化 ${siHuaStars.map(s => `${s.name}化${s.siHua}`).join('、')}`);
  }
  if (palace.selfSihua?.length) {
    bits.push(`宫干自化 ${palace.selfSihua.map(s => `${s.starName}自化${s.siHua}`).join('、')}`);
  }
  if (palace.daXianAge) bits.push(`大限 ${palace.daXianAge[0]}-${palace.daXianAge[1]} 岁`);

  return `${head}｜${bits.join('｜')}`;
}

function chartHeader(chart: ZiweiChart): string[] {
  const b = chart.birthInfo;
  const l = chart.lunarInfo;
  const gender = b.gender === 'male' ? '男' : '女';
  const lunarMonth = `${l.isLeapMonth ? '闰' : ''}${Math.abs(l.lunarMonth)}月${l.lunarDay}日`;

  const lines = [
    `公历：${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')} ${BRANCHES[b.hour] ?? ''}时（时辰序号 ${b.hour}）`,
    `农历：${l.yearStem !== undefined ? STEMS[l.yearStem] : ''}${l.yearBranch !== undefined ? BRANCHES[l.yearBranch] : ''}年 ${lunarMonth}`,
    `性别：${gender}${chart.yinYangGender ? `（${chart.yinYangGender}）` : ''}`,
  ];
  if (b.province || b.city) lines.push(`出生地：${[b.province, b.city].filter(Boolean).join(' ')}`);
  if (l.fourPillars) lines.push(`四柱（节气）：${l.fourPillars.join(' ')}`);
  lines.push(`五行局：${chart.wuxingJuName}｜命宫在${BRANCHES[chart.mingGongBranch]}｜身宫在${BRANCHES[chart.shenGongBranch]}`);
  if (chart.mingZhu) lines.push(`命主：${chart.mingZhu}${chart.shenZhu ? `｜身主：${chart.shenZhu}` : ''}`);
  if (typeof chart.currentAge === 'number') lines.push(`当前年龄：${chart.currentAge} 岁`);
  return lines;
}

function daXianLines(chart: ZiweiChart): string[] {
  if (!chart.daXians?.length) return [];
  return chart.daXians.slice(0, 12).map((dx, i) => {
    const isCurrent = i === chart.currentDaXianIndex;
    const siHua = dx.siHua
      ? `｜四化 禄${dx.siHua.lu} 权${dx.siHua.quan} 科${dx.siHua.ke} 忌${dx.siHua.ji}`
      : '';
    return `${isCurrent ? '→ ' : ''}${dx.startAge}-${dx.endAge} 岁 ${dx.palaceName}${dx.stemName ? `(${dx.stemName})` : ''}${siHua}`;
  });
}

export function formatPatterns(chart: ZiweiChart): string[] {
  let patterns: Pattern[] = [];
  try {
    patterns = detectPatterns(chart);
  } catch {
    return [];
  }
  if (!patterns.length) return ['（本盘未命中知识库中的成格条件）'];

  return patterns.map(p => {
    const bits = [`${p.name}（${PATTERN_LEVEL[p.level] ?? p.level}）`];
    if (p.description) bits.push(p.description);
    if (p.palaces?.length) bits.push(`涉及 ${p.palaces.join('、')}`);
    const c = p.conditions;
    if (c?.breaking?.length) bits.push(`破格：${c.breaking.join('、')}`);
    if (c?.bonus?.length) bits.push(`加分：${c.bonus.join('、')}`);
    if (p.source) bits.push(`出处 ${p.source}`);
    return `· ${bits.join('；')}`;
  });
}

/**
 * 取与该盘关系最近的古籍原文（命宫主星 + 格局名）。
 * 只做子串检索，命中即附，取不到就返回空数组。
 * 同一段话常在《全书》《全集》里各收一遍，用二元组重合度去重。
 */
export function formatClassicsDigest(chart: ZiweiChart, limit = 4): string[] {
  const ming = chart.palaces.find(p => p.branch === chart.mingGongBranch);
  const queries = new Set<string>();
  ming?.stars.filter(s => s.type === 'major').forEach(s => queries.add(s.name));
  try {
    detectPatterns(chart).slice(0, 2).forEach(p => queries.add(p.name));
  } catch {
    /* 格局失败不影响古籍摘录 */
  }

  const kept: { bigrams: Set<string>; text: string }[] = [];
  const out: string[] = [];
  for (const q of queries) {
    let hits: ReturnType<typeof searchClassics> = [];
    try {
      hits = searchClassics(q, 6);
    } catch {
      continue;
    }
    for (const hit of hits) {
      const text = hit.text.replace(/\s+/g, ' ').trim();
      if (text.length < 12) continue;
      const grams = bigramSet(text);
      if (kept.some(k => jaccard(grams, k.bigrams) > 0.5)) continue;
      kept.push({ bigrams: grams, text });
      out.push(`· 《${hit.bookTitle}·${hit.chapterTitle}》${text.length > 160 ? `${text.slice(0, 160)}…` : text}`);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/** 二元组集合：忽略标点，用来做粗粒度的相似度判断 */
function bigramSet(text: string): Set<string> {
  const clean = text.replace(/[，。；：、！？「」『』（）《》·,.;:!?()\s]/g, '');
  const set = new Set<string>();
  for (let i = 0; i < clean.length - 1; i++) set.add(clean.slice(i, i + 2));
  return set;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const g of a) if (b.has(g)) inter++;
  return inter / (a.size + b.size - inter);
}

/** 完整的命盘事实表（给 /api/interpret 用） */
export function formatChartFacts(chart: ZiweiChart, options: { classics?: boolean } = {}): string {
  const sections: string[] = [];
  sections.push('【基本资料】\n' + chartHeader(chart).map(l => `· ${l}`).join('\n'));

  sections.push('【十二宫】（按地支顺序，子→亥）\n' + chart.palaces.map(p => `· ${palaceLine(p)}`).join('\n'));

  const dx = daXianLines(chart);
  if (dx.length) sections.push('【大限】\n' + dx.join('\n'));

  sections.push('【命盘格局】\n' + formatPatterns(chart).join('\n'));

  if (options.classics !== false) {
    const classics = formatClassicsDigest(chart);
    if (classics.length) sections.push('【相关古籍原文（可直接引用，不要改写原文）】\n' + classics.join('\n'));
  }

  return sections.join('\n\n');
}

/** 只看婚姻/福德相关的裁剪版，供合盘用 */
export function formatChartFactsBrief(chart: ZiweiChart): string {
  return formatChartFacts(chart, { classics: false });
}

export { BRANCHES, STEMS };
