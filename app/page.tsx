'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { useTheme } from '@/components/ThemeProvider';

// ─── 滚动入场 wrapper ────────────────────────────────────
function FadeIn({
  children, delay = 0, y = 26, className = '',
}: {
  children: React.ReactNode; delay?: number; y?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-70px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── 主题切换 ────────────────────────────────────────────
function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      aria-label={isDark ? '切换亮色主题' : '切换暗色主题'}
      className="w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95"
      style={{
        border: '1px solid var(--ac-bdr)',
        background: 'rgba(255,255,255,0.20)',
        color: 'var(--ac)',
      }}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        {isDark ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
          </>
        ) : (
          <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.4 8.4 0 1 0 20 14.5Z" />
        )}
      </svg>
    </button>
  );
}

// ─── 浑天仪（hero 主视觉） ───────────────────────────────
function OrbitSphere() {
  return (
    <div className="relative w-[230px] h-[230px] sm:w-[280px] sm:h-[280px] mx-auto">
      <div className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(232,205,147,0.28) 0%, transparent 66%)' }} />
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F7E7BC" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#C9A44C" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#F3DFAC" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF8E4" stopOpacity="1" />
            <stop offset="55%" stopColor="#F0D79A" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#C9A44C" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 外圈光环 */}
        <circle cx="100" cy="100" r="76" fill="none" stroke="url(#ringGrad)" strokeWidth="0.8" opacity="0.4" />
        {/* 三层轨道 */}
        <g style={{ transformOrigin: '100px 100px', animation: 'orbit-spin 46s linear infinite' }}>
          <ellipse cx="100" cy="100" rx="88" ry="34" fill="none" stroke="url(#ringGrad)" strokeWidth="1.4" transform="rotate(-18 100 100)" />
          <ellipse cx="100" cy="100" rx="88" ry="34" fill="none" stroke="url(#ringGrad)" strokeWidth="1" opacity="0.7" transform="rotate(52 100 100)" />
        </g>
        <g style={{ transformOrigin: '100px 100px', animation: 'orbit-spin 68s linear infinite reverse' }}>
          <ellipse cx="100" cy="100" rx="72" ry="72" fill="none" stroke="url(#ringGrad)" strokeWidth="0.9" opacity="0.55" />
          <ellipse cx="100" cy="100" rx="46" ry="84" fill="none" stroke="rgba(232,205,147,0.45)" strokeWidth="0.7" />
        </g>

        {/* 核心星辰 */}
        <circle cx="100" cy="100" r="34" fill="url(#coreGlow)" opacity="0.55" />
        <path d="M100 62 L106 94 L138 100 L106 106 L100 138 L94 106 L62 100 L94 94 Z" fill="#FFF6DE" opacity="0.95" />
        <path d="M100 78 L103 97 L122 100 L103 103 L100 122 L97 103 L78 100 L97 97 Z" fill="#FFFFFF" />

        {/* 轨道上的小星 */}
        {[[164, 74], [36, 128], [148, 146], [48, 62]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={i === 0 ? 2.4 : 1.6} fill="#FFF1CC" opacity="0.9" />
        ))}
      </svg>
    </div>
  );
}

// ─── 宫格图标（六宫格用） ────────────────────────────────
type TileIcon = 'calendar' | 'bag' | 'heart' | 'lotus' | 'taiji' | 'grid';

function TileGlyph({ name, color }: { name: TileIcon; color: string }) {
  const common = { fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="0 0 24 24" width="21" height="21">
      {name === 'calendar' && (
        <g {...common}>
          <rect x="3.6" y="5.2" width="16.8" height="15" rx="3" />
          <path d="M3.6 9.6h16.8M8 3.4v3.4M16 3.4v3.4" />
          <path d="M8 13.4h2.2M13.8 13.4H16M8 16.8h2.2M13.8 16.8H16" />
        </g>
      )}
      {name === 'bag' && (
        <g {...common}>
          <path d="M5.4 8.4h13.2l1.2 11.2a1.6 1.6 0 0 1-1.6 1.8H5.8a1.6 1.6 0 0 1-1.6-1.8Z" />
          <path d="M9 8.4V6.6a3 3 0 0 1 6 0v1.8" />
        </g>
      )}
      {name === 'heart' && (
        <g {...common}>
          <path d="M12 20S4.4 15.6 4.4 10.4A4.2 4.2 0 0 1 12 7.8a4.2 4.2 0 0 1 7.6 2.6C19.6 15.6 12 20 12 20Z" />
        </g>
      )}
      {name === 'lotus' && (
        <g {...common}>
          <path d="M12 20c-4 0-7.4-2.6-8.4-6 2.4-.6 4.4.2 5.6 1.4" />
          <path d="M12 20c4 0 7.4-2.6 8.4-6-2.4-.6-4.4.2-5.6 1.4" />
          <path d="M12 19.6c-2-1.6-3-3.8-3-6.2 1.8.2 3 1.2 3 1.2s1.2-1 3-1.2c0 2.4-1 4.6-3 6.2Z" />
          <path d="M12 12.4C10.6 10.6 10.4 8 11.6 5.6c1.4 1 2 2.6 2 4.2" />
        </g>
      )}
      {name === 'taiji' && (
        <g {...common}>
          <circle cx="12" cy="12" r="8.4" />
          <path d="M12 3.6a4.2 4.2 0 0 0 0 8.4 4.2 4.2 0 0 1 0 8.4" />
          <circle cx="12" cy="8" r="1.1" fill={color} stroke="none" />
          <circle cx="12" cy="16" r="1.1" fill="none" stroke={color} />
        </g>
      )}
      {name === 'grid' && (
        <g {...common}>
          <circle cx="8" cy="8" r="2.6" />
          <circle cx="16" cy="8" r="2.6" />
          <circle cx="8" cy="16" r="2.6" />
          <circle cx="16" cy="16" r="2.6" />
        </g>
      )}
    </svg>
  );
}

// ─── 六宫格入口 ─────────────────────────────────────────
const ENTRIES: { label: string; icon: TileIcon; tint: string; href: string }[] = [
  { label: '流年运势', icon: 'calendar', tint: '#C08A16', href: '/chart' },
  { label: '事业财运', icon: 'bag',      tint: '#2F6FD0', href: '/chart' },
  { label: '感情姻缘', icon: 'heart',    tint: '#B93F72', href: '/chart' },
  { label: '健康运势', icon: 'lotus',    tint: '#1E8A5A', href: '/chart' },
  { label: '人生大运', icon: 'taiji',    tint: '#6544B8', href: '/chart' },
  { label: '更多解读', icon: 'grid',     tint: '#8A6414', href: '/knowledge' },
];

// ─── 主星数据 ────────────────────────────────────────────
const STARS = ['紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府', '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'];

// ─── 功能模块 ────────────────────────────────────────────
const FEATURES = [
  {
    tag: '排盘体系',
    title: '倪海厦正宗紫微斗数',
    subtitle: '非简化版，严格遵循倪海厦老师传承',
    points: [
      '纳音五行局起盘，不采用网络简化算法',
      '命宫逆数生时、身宫顺数生时，严格对齐教学规则',
      '十四主星与四化飞星按原法推演，结构完整可复核',
    ],
  },
  {
    tag: '命盘呈现',
    title: '完整十四主星 · 四化飞星',
    subtitle: '结构清晰，一眼看懂主轴与重点',
    points: [
      '十四主星完整入宫，主星关系清楚可读',
      '辅星与煞星同屏呈现，避免关键信息缺失',
      '庙旺利陷亮度分级，快速识别强弱',
      '点击任意主星即可查看倪海厦老师对该星的详细解读',
    ],
  },
  {
    tag: 'AI 解读',
    title: '深度解盘，不止于算',
    subtitle: '倪海厦体系知识库 × 大模型流式解读',
    points: [
      '命格分析：从命宫主星出发，结合三方四正，给出性格与人生格局判断',
      '六大维度解读：事业方向、感情婚姻、财运模式、健康注意、家庭关系、子女缘分',
      '大限流年追踪：当前十年大限重点、今年流年宫位提示与行动建议',
      '自由追问：针对你的命盘直接提问，如「今年能换工作吗」',
    ],
  },
  {
    tag: '格局识别',
    title: '自动检测命盘格局',
    subtitle: '从星曜组合中发现你的命中注定',
    points: [
      '自动识别 11 种经典格局：紫府同宫、杀破狼格、机月同梁、廉相格、武曲七杀等',
      '辅弼夹命、日月夹命等特殊格局精准检测，并给出倪海厦体系下的标准解读',
      '四化入命宫迁移宫的特殊状况自动标注，提示需关注的人生议题',
      '格局按吉凶等级分层展示，优势与挑战一目了然',
    ],
  },
];

// ─── 倪海厦核心教义 ──────────────────────────────────────
const NI_TEACHINGS = [
  { title: '命宫为本，三方为用', body: '看命必先看命宫。命宫主星决定基本格局与天生性格，三方（财帛、官禄、迁移）则决定此人的「用武之地」。' },
  { title: '对宫借星，不可忽视', body: '任何宫位若为空宫，必须借对宫星曜来论断。命宫对面是迁移宫，两者互相影响，这是初学者最容易忽略的关键。' },
  { title: '四化才是命运的手', body: '星曜只是基础，四化（化禄、化权、化科、化忌）才决定运势好坏。同一颗星，有化禄与有化忌，人生轨迹截然不同。' },
  { title: '大限十年，运势有节', body: '人生划分为 12 个大限，每个大限 10 年。不同大限宫位际遇完全不同，了解当下走的大限，才能真正把握运势。' },
];

// ─── 主页 ─────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();

  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  useEffect(() => {
    document.documentElement.style.background = 'var(--bg-0)';
    document.body.style.background = 'var(--bg-0)';
    return () => {
      document.documentElement.style.background = '';
      document.body.style.background = '';
    };
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* ══ 顶部导航 ══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3"
        style={{
          background: 'var(--nav-grad)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}>
        <div className="flex items-center gap-2">
          <span className="text-[13px] tracking-[0.28em] font-medium"
            style={{ color: 'var(--ac)', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
            紫微星测算
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/heming')}
            className="text-[11px] px-3 py-1.5 rounded-full transition-colors hidden sm:inline-flex"
            style={{ border: '1px solid var(--bdr-med)', color: 'var(--tx-2)' }}>
            合盘
          </button>
          <ThemeToggle />
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section ref={heroRef}
        className="relative flex flex-col items-center justify-center px-6 pt-20 pb-6 min-h-[86svh]">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="w-full max-w-[520px] lg:max-w-[640px] text-center">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
            <h1 className="grad-text grad-text-gold leading-[1.05] font-bold"
              style={{ display: 'block', fontSize: 'clamp(44px, 12.5vw, 68px)', letterSpacing: '0.2em', textIndent: '0.2em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
              紫微星
            </h1>
            <div className="grad-text grad-text-gold font-bold mt-1.5"
              style={{ display: 'block', fontSize: 'clamp(20px, 5.6vw, 28px)', letterSpacing: '0.62em', textIndent: '0.62em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
              测算
            </div>
          </motion.div>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.9 }}
            className="mt-5 text-[12.5px] tracking-[0.24em]"
            style={{ color: 'var(--tx-2)' }}>
            探索星辰，遇见更好的自己
          </motion.p>

          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="mt-5 mb-7">
            <OrbitSphere />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.62, duration: 0.7 }}
            className="flex flex-col items-center gap-3">
            <button className="btn-primary w-full max-w-[280px]"
              onClick={() => router.push('/chart')}>
              立即起盘
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
            <p className="text-[10.5px] tracking-[0.2em]" style={{ color: 'var(--tx-3)' }}>
              倪海厦体系 · 十四主星 · AI 深度解读
            </p>
          </motion.div>
        </motion.div>
      </section>

      {/* ══ 你的命盘 ══ */}
      <section className="relative px-4 pb-2">
        <div className="max-w-[520px] lg:max-w-[1000px] mx-auto">
          <FadeIn>
            <div className="panel-cream relative overflow-hidden px-6 pt-6 pb-7">
              {/* 角落纹饰 */}
              <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(201,164,76,0.22) 0%, transparent 70%)' }} />
              <div className="flex items-center gap-2 mb-2">
                <span style={{ color: 'var(--ac)' }}>✦</span>
                <span className="text-[12px] font-semibold tracking-[0.18em]">你的命盘</span>
              </div>
              <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                揭开命运的星辰密码 · 十四主星入宫，四化飞星推演
              </p>

              <div className="flex items-end justify-between mt-5 gap-4">
                <div className="flex gap-5">
                  {[
                    { n: '14', l: '主星' },
                    { n: '12', l: '宫位' },
                    { n: '11', l: '格局' },
                  ].map(s => (
                    <div key={s.l}>
                      <div className="text-[22px] font-bold leading-none tabular-nums" style={{ color: 'var(--ac-dim)' }}>{s.n}</div>
                      <div className="text-[10px] mt-1 tracking-widest" style={{ color: 'var(--ink-3)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => router.push('/chart')}
                  className="shrink-0 px-5 py-2.5 rounded-full text-[12.5px] font-semibold tracking-wider text-white"
                  style={{
                    background: 'linear-gradient(135deg, #63439F 0%, #8862D6 100%)',
                    boxShadow: '0 8px 20px rgba(84,56,168,0.35)',
                  }}>
                  立即测算
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 六宫格 ══ */}
      <section className="relative px-4 pt-4">
        <div className="max-w-[520px] lg:max-w-[1000px] mx-auto grid grid-cols-3 lg:grid-cols-6 gap-2.5">
          {ENTRIES.map((e, i) => (
            <FadeIn key={e.label} delay={i * 0.05}>
              <button
                onClick={() => router.push(e.href)}
                className="on-cream w-full aspect-[1/0.92] rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform active:scale-95"
                style={{
                  background: 'linear-gradient(165deg, #FFFDF8 0%, #F8EFDC 100%)',
                  border: '1px solid rgba(201,164,76,0.30)',
                  boxShadow: '0 6px 18px rgba(50,36,104,0.18)',
                }}>
                <span className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.76)', border: `1px solid ${e.tint}33` }}>
                  <TileGlyph name={e.icon} color={e.tint} />
                </span>
                <span className="text-[11.5px] tracking-[0.08em]" style={{ color: 'var(--tx-1)' }}>{e.label}</span>
              </button>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══ 命盘速览 ══ */}
      <section className="relative px-4 pt-4">
        <div className="max-w-[520px] lg:max-w-[1000px] mx-auto">
          <FadeIn>
            <div className="card-glass p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--ac)' }}>✦</span>
                  <span className="text-[12px] tracking-[0.16em]" style={{ color: 'var(--tx-1)' }}>命盘速览</span>
                </div>
                <button onClick={() => router.push('/chart')}
                  className="text-[10.5px] flex items-center gap-0.5" style={{ color: 'var(--tx-3)' }}>
                  查看详情
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {STARS.map(s => (
                  <span key={s} className="text-[10.5px] px-2 py-[3px] rounded-full"
                    style={{ color: 'var(--ac)', background: 'rgba(255,255,255,0.72)', border: '1px solid var(--ac-bdr)' }}>
                    {s}
                  </span>
                ))}
              </div>

              <div className="h-px mb-3.5" style={{ background: 'var(--bdr)' }} />

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] tracking-widest mb-1" style={{ color: 'var(--tx-3)' }}>本命四化</div>
                  <div className="flex gap-2">
                    {[
                      { h: '化禄', c: 'var(--lu-ink)', b: 'rgba(255,255,255,0.55)' },
                      { h: '化权', c: 'var(--quan-ink)', b: 'rgba(255,255,255,0.55)' },
                      { h: '化科', c: 'var(--ke-ink)', b: 'rgba(255,255,255,0.55)' },
                      { h: '化忌', c: 'var(--ji-ink)', b: 'rgba(255,255,255,0.55)' },
                    ].map(x => (
                      <span key={x.h} className="text-[10px] px-1.5 py-0.5 rounded-md"
                        style={{ color: x.c, background: x.b, border: `1px solid ${x.c}55` }}>
                        {x.h}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => router.push('/chart')}
                  className="px-4 py-2 rounded-full text-[11.5px] font-medium"
                  style={{ border: '1px solid var(--ac-bdr)', color: 'var(--ac)', background: 'rgba(255,255,255,0.72)' }}>
                  开始解读
                </button>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 体系模块 ══ */}
      <section className="relative px-4 pt-14">
        <div className="max-w-[520px] lg:max-w-[1000px] mx-auto">
          <FadeIn className="text-center mb-6">
            <div className="text-[10px] tracking-[0.4em] mb-2" style={{ color: 'var(--ac)', opacity: 0.75 }}>METHOD</div>
            <h2 className="grad-text grad-text-gold font-bold"
              style={{ fontSize: 'clamp(22px, 5.6vw, 28px)', letterSpacing: '0.1em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
              倪师方法论
            </h2>
            <p className="text-[11.5px] mt-2" style={{ color: 'var(--tx-3)' }}>
              从紫微入门，天纪 / 地纪 / 人纪 渐次展开
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.tag} delay={0.05 + i * 0.06}>
                <div className="card-glass p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] px-2 py-[3px] rounded-full tracking-[0.16em]"
                      style={{ color: 'var(--ac)', background: 'var(--ac-bg)', border: '1px solid var(--ac-bdr)' }}>
                      {f.tag}
                    </span>
                    <span className="text-[10px] tracking-widest tabular-nums" style={{ color: 'var(--tx-3)' }}>
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--tx-0)' }}>{f.title}</h3>
                  <p className="text-[11px] mb-3" style={{ color: 'var(--tx-3)' }}>{f.subtitle}</p>
                  <ul className="space-y-1.5">
                    {f.points.map(p => (
                      <li key={p} className="flex gap-2 text-[11.5px] leading-relaxed" style={{ color: 'var(--tx-2)' }}>
                        <span className="mt-[7px] w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--ac-dim)' }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 天 · 地 · 人 ══ */}
      <section className="relative px-4 pt-14">
        <div className="max-w-[520px] lg:max-w-[1000px] mx-auto">
          <FadeIn className="text-center mb-6">
            <div className="text-[10px] tracking-[0.4em] mb-2" style={{ color: 'var(--ac)', opacity: 0.75 }}>PHILOSOPHY</div>
            <h2 className="grad-text grad-text-gold font-bold"
              style={{ fontSize: 'clamp(22px, 5.6vw, 28px)', letterSpacing: '0.24em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
              天 · 地 · 人
            </h2>
            <p className="text-[11.5px] mt-2 leading-relaxed px-2" style={{ color: 'var(--tx-3)' }}>
              命运从来不是人生的全部。倪师将影响人生的力量分为三个同等维度。
            </p>
          </FadeIn>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { glyph: '天', label: '先天命运', sub: '命盘 · 星曜', color: '#A87C16' },
              { glyph: '地', label: '地理环境', sub: '地域 · 风水', color: '#2F6FD0' },
              { glyph: '人', label: '人心意念', sub: '意志 · 选择', color: '#1E8A5A' },
            ].map((it, i) => (
              <FadeIn key={it.glyph} delay={0.06 + i * 0.08}>
                <div className="on-cream rounded-2xl px-3 py-5 text-center h-full"
                  style={{ background: 'linear-gradient(165deg, #FFFDF8 0%, #F8EFDC 100%)', border: '1px solid rgba(201,164,76,0.28)' }}>
                  <div className="text-[30px] font-bold leading-none mb-2"
                    style={{ color: it.color, fontFamily: "'Songti SC','Noto Serif SC',serif" }}>{it.glyph}</div>
                  <div className="text-[11.5px] font-medium mb-1" style={{ color: 'var(--tx-1)' }}>{it.label}</div>
                  <div className="text-[9.5px] tracking-wider" style={{ color: 'var(--tx-3)' }}>{it.sub}</div>
                  <div className="text-[10px] mt-2.5 tracking-[0.2em]" style={{ color: it.color, opacity: 0.8 }}>⅓</div>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.24}>
            <div className="panel-cream mt-3 px-5 py-4 text-center">
              <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                「命运不是人生的全部，加上地理位置和人念，才是。」
              </p>
              <p className="text-[10px] tracking-[0.22em] mt-1.5" style={{ color: 'var(--ink-3)' }}>— 倪海厦</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 倪海厦 ══ */}
      <section className="relative px-4 pt-14">
        <div className="max-w-[520px] lg:max-w-[1000px] mx-auto">
          <FadeIn className="text-center mb-5">
            <div className="text-[10px] tracking-[0.4em] mb-2" style={{ color: 'var(--ac)', opacity: 0.75 }}>MASTER · 1954–2012</div>
            <h2 className="grad-text grad-text-gold font-bold"
              style={{ fontSize: 'clamp(22px, 5.6vw, 28px)', letterSpacing: '0.12em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
              倪海厦老师
            </h2>
          </FadeIn>

          <FadeIn>
            <div className="card-glass p-5">
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { l: '生于', v: '1954', s: '台湾' },
                  { l: '离世', v: '2012', s: '享年 58' },
                  { l: '传承', v: '紫微', s: '经方中医' },
                ].map(x => (
                  <div key={x.l} className="text-center rounded-xl py-2.5"
                    style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid var(--bdr)' }}>
                    <div className="text-[9.5px] tracking-[0.2em] mb-1" style={{ color: 'var(--tx-3)' }}>{x.l}</div>
                    <div className="text-[17px] font-semibold leading-none tabular-nums" style={{ color: 'var(--ac)' }}>{x.v}</div>
                    <div className="text-[9.5px] mt-1" style={{ color: 'var(--tx-3)' }}>{x.s}</div>
                  </div>
                ))}
              </div>
              <p className="text-[11.5px] leading-[1.9]" style={{ color: 'var(--tx-2)' }}>
                倪海厦先生（1954–2012）出生于台湾，专研经方派，中年赴美创立汉唐中医学院，
                将毕生所学整理为「人纪」与「天纪」两大教学体系。紫微上属南派三合派，
                主张「以命宫为本、以三方四正为用、以四化为纲」——大道至简，不搞繁复飞星。
              </p>
              <p className="text-[10.5px] leading-relaxed mt-3 pt-3"
                style={{ color: 'var(--tx-3)', borderTop: '1px solid var(--bdr)' }}>
                本平台解读基于倪师《天纪》公开讲义、《紫微斗数全书》明版与三合派古籍整理，
                仅作文化与个人成长参考。
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mt-3">
            {NI_TEACHINGS.map((t, i) => (
              <FadeIn key={t.title} delay={0.06 + i * 0.06}>
                <div className="card-flat p-3.5 h-full">
                  <div className="text-[11px] font-medium mb-1.5 leading-snug" style={{ color: 'var(--ac)' }}>{t.title}</div>
                  <p className="text-[10.5px] leading-[1.8]" style={{ color: 'var(--tx-2)' }}>{t.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 合盘 ══ */}
      <section className="relative px-4 pt-14">
        <div className="max-w-[520px] lg:max-w-[1000px] mx-auto">
          <FadeIn>
            <div className="relative overflow-hidden rounded-[28px] px-6 py-7 text-center"
              style={{
                background: 'linear-gradient(150deg, rgba(150,120,228,0.55) 0%, rgba(96,78,168,0.72) 55%, rgba(72,60,138,0.88) 100%)',
                border: '1px solid rgba(232,205,147,0.22)',
                boxShadow: '0 18px 46px rgba(50,36,104,0.30)',
              }}>
              <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(232,205,147,0.28) 0%, transparent 70%)' }} />
              <div className="text-[10px] tracking-[0.4em] mb-2" style={{ color: 'var(--ac)', opacity: 0.85 }}>COMPATIBILITY</div>
              <h2 className="grad-text grad-text-gold font-bold mb-2"
                style={{ fontSize: 'clamp(21px, 5.4vw, 26px)', letterSpacing: '0.1em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
                紫微合盘
              </h2>
              <p className="text-[11.5px] leading-relaxed mb-4 px-2" style={{ color: 'rgba(240,234,250,0.8)' }}>
                双方夫妻宫互参、命宫兼容性与三方四正交互，给出感情匹配度、合伙可行性与相处建议。
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 mb-5">
                {['感情匹配', '合伙创业', '亲子缘分', '婚前相性'].map(x => (
                  <span key={x} className="text-[10px] px-2.5 py-1 rounded-full"
                    style={{ color: 'var(--ac)', background: 'rgba(232,205,147,0.10)', border: '1px solid rgba(232,205,147,0.24)' }}>
                    {x}
                  </span>
                ))}
              </div>
              <button onClick={() => router.push('/heming')}
                className="w-full max-w-[260px] py-3 rounded-full text-[12.5px] font-semibold tracking-wider"
                style={{ background: 'linear-gradient(135deg, #F0DCA8, #C9A44C)', color: '#2A1E0A', boxShadow: '0 8px 22px rgba(201,164,76,0.28)' }}>
                开始合盘分析
              </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══ 最终 CTA ══ */}
      <section className="relative px-6 pt-16 pb-10 text-center">
        <FadeIn>
          <p className="text-[10px] tracking-[0.4em] mb-3" style={{ color: 'var(--ac)', opacity: 0.7 }}>开始你的命盘之旅</p>
          <h2 className="grad-text grad-text-gold font-bold leading-tight mb-3"
            style={{ fontSize: 'clamp(24px, 6.4vw, 32px)', letterSpacing: '0.06em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
            你的紫微命盘<br />等你解读
          </h2>
          <p className="text-[11.5px] mb-6 leading-relaxed" style={{ color: 'var(--tx-3)' }}>
            输入出生年月日时，几秒生成专属命盘<br />再由 AI 按倪海厦体系深度解读
          </p>
          <button className="btn-primary w-full max-w-[280px] mx-auto" onClick={() => router.push('/chart')}>
            免费起盘
          </button>
          <div className="mt-3 flex flex-wrap gap-2 justify-center">
            <button onClick={() => router.push('/knowledge')}
              className="text-[11px] px-3.5 py-2 rounded-full"
              style={{ color: 'var(--ac)', border: '1px solid var(--ac-bdr)', background: 'var(--ac-bg)' }}>
              ✦ 紫微知识库
            </button>
            <button onClick={() => router.push('/library')}
              className="text-[11px] px-3.5 py-2 rounded-full"
              style={{ color: 'var(--ac)', border: '1px solid var(--ac-bdr)', background: 'var(--ac-bg)' }}>
              📜 古籍原典库
            </button>
          </div>
        </FadeIn>
      </section>

      {/* Footer */}
      <footer className="relative px-6 pt-6 pb-8 text-center"
        style={{ borderTop: '1px solid var(--bdr)' }}>
        <div className="flex justify-center gap-3 mb-4">
          {[
            { name: '紫微', ready: true },
            { name: '天纪', ready: false },
            { name: '地纪', ready: false },
            { name: '人纪', ready: false },
          ].map(s => (
            <span key={s.name} className="text-[10px] px-2.5 py-1 rounded-full"
              style={{
                color: s.ready ? 'var(--ac)' : 'var(--tx-3)',
                border: `1px ${s.ready ? 'solid' : 'dashed'} var(--bdr-med)`,
                opacity: s.ready ? 1 : 0.6,
              }}>
              {s.name}{s.ready ? ' ✓' : ' · 即将'}
            </span>
          ))}
        </div>
        <p className="text-[10px] leading-relaxed mb-2" style={{ color: 'var(--tx-3)' }}>
          紫微命盘 · 基于倪海厦正宗体系 · 仅供参考，命运掌握在自己手中
        </p>
        <p className="text-[9.5px] leading-relaxed mb-3 mx-auto max-w-[380px]" style={{ color: 'var(--tx-3)', opacity: 0.8 }}>
          本平台基于中国传统文化研究，仅提供学习参考，不构成任何医疗、投资、法律或重大决策建议。
        </p>
        <p className="text-[10px]" style={{ color: 'var(--tx-3)' }}>
          <a href="/terms" className="underline">服务条款</a>
          {' · '}
          <a href="/privacy" className="underline">隐私政策</a>
        </p>
      </footer>
    </div>
  );
}
