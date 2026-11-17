'use client';

/**
 * 星空背景 —— 深紫星云 + 星点 + 底部云海
 *
 * 全站公用：固定铺满视口，pointer-events: none，
 * 颜色全部走 --sky-* 变量，因此暗/亮主题自动切换。
 */

// 固定种子，保证 SSR 与 CSR 生成的星点完全一致（避免 hydration 警告）
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

const rand = seeded(20260101);
const STARS = Array.from({ length: 90 }, () => ({
  x: rand() * 100,
  y: rand() * 100,
  r: 0.4 + rand() * 1.5,
  o: 0.18 + rand() * 0.65,
  d: rand() * 6,
}));

const BIG_STARS = [
  { x: 12, y: 14, r: 1.9 }, { x: 78, y: 9, r: 1.5 }, { x: 62, y: 30, r: 1.2 },
  { x: 26, y: 42, r: 1.3 }, { x: 88, y: 52, r: 1.1 }, { x: 42, y: 68, r: 1.4 },
  { x: 8, y: 74, r: 1.2 }, { x: 70, y: 84, r: 1.6 },
];

export default function SkyBackdrop({ dim = false }: { dim?: boolean }) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden no-print"
      style={{
        background:
          'linear-gradient(180deg, var(--sky-1) 0%, var(--sky-2) 34%, var(--sky-3) 68%, var(--sky-4) 100%)',
        opacity: dim ? 0.55 : 1,
      }}
    >
      {/* 星云光斑 */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[880px] h-[620px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(ellipse at center, var(--sky-glow) 0%, transparent 68%)' }} />
      <div className="absolute top-1/4 -left-24 w-[520px] h-[520px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(160,132,236,0.30) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-[560px] h-[420px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(236,180,214,0.26) 0%, transparent 72%)' }} />

      {/* 星点 */}
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <radialGradient id="skyStar" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF6E2" stopOpacity="1" />
            <stop offset="100%" stopColor="#FFF6E2" stopOpacity="0" />
          </radialGradient>
        </defs>
        {STARS.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.18} fill="url(#skyStar)" opacity={s.o}>
            <animate attributeName="opacity" values={`${s.o};${Math.min(1, s.o + 0.4)};${s.o}`} dur={`${4 + s.d}s`} repeatCount="indefinite" />
          </circle>
        ))}
        {BIG_STARS.map((s, i) => (
          <g key={`b${i}`} opacity="0.85">
            <circle cx={s.x} cy={s.y} r={s.r * 0.35} fill="url(#skyStar)" />
            <path
              d={`M ${s.x} ${s.y - s.r * 0.85} L ${s.x + s.r * 0.16} ${s.y} L ${s.x} ${s.y + s.r * 0.85} L ${s.x - s.r * 0.16} ${s.y} Z`}
              fill="rgba(255,246,226,0.9)"
            />
            <path
              d={`M ${s.x - s.r * 0.85} ${s.y} L ${s.x} ${s.y - s.r * 0.16} L ${s.x + s.r * 0.85} ${s.y} L ${s.x} ${s.y + s.r * 0.16} Z`}
              fill="rgba(255,246,226,0.75)"
            />
          </g>
        ))}
      </svg>

      {/* 底部云海 */}
      <svg
        className="absolute bottom-0 left-0 w-full"
        viewBox="0 0 390 220"
        preserveAspectRatio="none"
        style={{ height: '38vh', minHeight: 220 }}
      >
        <defs>
          <linearGradient id="cloudFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B9A6E2" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#DCC9EE" stopOpacity="0.10" />
          </linearGradient>
          <linearGradient id="cloudNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E6D6F2" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#F3E6F5" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        {/* 远处云带 */}
        <g fill="url(#cloudFar)">
          <ellipse cx="60" cy="176" rx="110" ry="44" />
          <ellipse cx="180" cy="186" rx="120" ry="40" />
          <ellipse cx="310" cy="178" rx="120" ry="46" />
        </g>
        {/* 近处云团（带一点波斯云纹的卷边感） */}
        <g fill="url(#cloudNear)">
          <path d="M0 200 C 34 176 62 198 92 186 C 116 176 128 196 156 190 C 186 184 198 206 232 200 C 262 195 276 212 310 206 C 340 201 366 214 390 206 L 390 220 L 0 220 Z" />
          <path d="M0 214 C 40 202 74 218 108 210 C 142 202 168 218 202 212 C 238 206 266 220 300 214 C 334 208 362 218 390 212 L 390 220 L 0 220 Z" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
}
