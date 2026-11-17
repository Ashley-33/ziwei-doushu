'use client';
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BirthInfo } from '@/lib/ziwei/types';
import { SHICHEN } from '@/lib/ziwei/constants';
import { PROVINCES } from '@/lib/ziwei/cities';
import { formToBirthInfo, calcTrueSolarBranch } from '@/lib/ziwei/share';

export interface BirthFormState {
  name: string;
  year: string;
  month: string;
  day: string;
  clockHour: string;
  clockMinute: string;
  unknownTime: boolean;
  province: string;
  city: string;
  longitude: number;
  gender: 'male' | 'female';
}

interface BirthFormProps {
  onSubmit: (info: BirthInfo) => void;
  loading?: boolean;
  initialData?: Partial<BirthFormState>;
  onFormSave?: (data: BirthFormState) => void;
  /** 隐藏内部「立即起盘」按钮（合盘等场景由父级统一触发） */
  hideSubmit?: boolean;
}

const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

/** 检查日期是否合法 */
function isValidDate(y: number, m: number, d: number): boolean {
  if (!y || !m || !d) return false;
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

// ─── 图标 ────────────────────────────────────────────────
const ICONS: Record<string, React.ReactNode> = {
  birthday: (
    <>
      <rect x="3.6" y="5.2" width="16.8" height="15" rx="3" />
      <path d="M3.6 9.6h16.8M8 3.4v3.4M16 3.4v3.4" />
      <path d="M8 13.6h2M13.8 13.6H16M8 17h2M13.8 17H16" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3.2 1.9" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.4-5.6 6.4-10.2A6.4 6.4 0 0 0 5.6 10.8C5.6 15.4 12 21 12 21Z" />
      <circle cx="12" cy="10.4" r="2.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.6" r="3.4" />
      <path d="M5.4 20c.8-3.4 3.4-5.2 6.6-5.2s5.8 1.8 6.6 5.2" />
    </>
  ),
};

/** 一行：图标 + 标签 + 内容 */
function Row({
  icon, label, hint, children, disabled,
}: {
  icon: keyof typeof ICONS; label: string; hint?: string; children: React.ReactNode; disabled?: boolean;
}) {
  return (
    <div
      className="rounded-2xl px-3 py-2.5 transition-colors"
      style={{
        background: '#FFFFFF',
        border: '1px solid rgba(150,112,15,0.16)',
        boxShadow: '0 1px 2px rgba(120,90,30,0.05)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: 'rgba(150,112,15,0.09)', color: 'var(--ink-2)' }}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[icon]}
          </svg>
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] tracking-[0.14em] mb-1" style={{ color: 'var(--ink-3)' }}>{label}</div>
          {children}
          {hint && <div className="text-[9.5px] mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>{hint}</div>}
        </div>
      </div>
    </div>
  );
}

/** 无边框原生 select（奶油卡内） */
function PlainSelect({
  value, onChange, children, flex = 1, ariaLabel,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; flex?: number; ariaLabel: string;
}) {
  return (
    <div className="relative min-w-0" style={{ flex }}>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-transparent outline-none cursor-pointer text-[13.5px] font-medium pr-4"
        style={{ color: value ? 'var(--ink)' : 'var(--ink-3)', border: 'none', padding: 0, height: 22 }}
      >
        {children}
      </select>
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round"
        className="absolute right-0.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--ink-3)' }}>
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  );
}

export default function BirthForm({ onSubmit, loading, initialData, onFormSave, hideSubmit }: BirthFormProps) {
  const [form, setForm] = useState<BirthFormState>({
    name: initialData?.name ?? '',
    year: initialData?.year ?? '',
    month: initialData?.month ?? '',
    day: initialData?.day ?? '',
    clockHour: initialData?.clockHour ?? '8',
    clockMinute: initialData?.clockMinute ?? '0',
    unknownTime: initialData?.unknownTime ?? false,
    province: initialData?.province ?? '',
    city: initialData?.city ?? '',
    longitude: initialData?.longitude ?? 120,
    gender: initialData?.gender ?? 'male',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // 表单状态变化时实时同步给父级（合盘等场景下父级靠这个收集双方数据）
  useEffect(() => {
    onFormSave?.({ ...form });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const cityList = useMemo(() => {
    const prov = PROVINCES.find(p => p.name === form.province);
    return prov ? prov.cities : [];
  }, [form.province]);

  const branch = useMemo(() => {
    if (form.unknownTime) return 0;
    return calcTrueSolarBranch(
      parseInt(form.clockHour) || 0,
      parseInt(form.clockMinute) || 0,
      form.longitude,
    );
  }, [form.clockHour, form.clockMinute, form.longitude, form.unknownTime]);

  const offsetMin = Math.round((form.longitude - 120) * 4);
  const shichenInfo = SHICHEN[branch];

  // ─── 校验逻辑 ───────────────────────────────────────────
  const y = parseInt(form.year) || 0;
  const m = parseInt(form.month) || 0;
  const d = parseInt(form.day) || 0;

  const errors = {
    year: !form.year ? '请选择出生年份'
      : y < 1900 || y > 2026 ? '年份范围：1900–2026'
      : '',
    month: !form.month ? '请选择月份' : '',
    day: !form.day ? '请选择日期'
      : form.year && form.month && !isValidDate(y, m, d) ? `${m}月没有${d}日`
      : '',
  };
  const hasError = Object.values(errors).some(Boolean);

  // ─── 完成度 ────────────────────────────────────────────
  const steps = [
    !!form.year && !!form.month && !!form.day && !errors.year && !errors.month && !errors.day,
    !!form.province && !!form.city,
    form.unknownTime || (!!form.clockHour && !!form.clockMinute),
    true,
  ];
  const completedSteps = steps.filter(Boolean).length;

  const showSummary = steps[0] && steps[2] && !hasError;
  const summaryText = showSummary
    ? [
        `${y}年${m}月${d}日`,
        form.city || (form.province ? form.province : ''),
        form.unknownTime ? '时辰不详' : `${SHICHEN_NAMES[branch]}时`,
        form.gender === 'male' ? '男' : '女',
      ].filter(Boolean).join(' · ')
    : '';

  const handleProvince = (prov: string) => {
    const provData = PROVINCES.find(p => p.name === prov);
    const firstCity = provData?.cities[0];
    setForm({ ...form, province: prov, city: firstCity?.name || '', longitude: firstCity?.longitude ?? 120 });
  };

  const handleCity = (cityName: string) => {
    const prov = PROVINCES.find(p => p.name === form.province);
    const cityData = prov?.cities.find(c => c.name === cityName);
    setForm({ ...form, city: cityName, longitude: cityData?.longitude ?? 120 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);
    setTouched({ year: true, month: true, day: true });
    if (hasError) return;
    onFormSave?.({ ...form });
    // 统一走 lib/ziwei/share.ts 的转换：它负责晚子时换日（23:00–23:59 按次日排盘）。
    onSubmit(formToBirthInfo(form));
  };

  const errorMsg = [errors.year, errors.month, errors.day].filter(Boolean)[0] || '';

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className="panel-cream p-4 sm:p-5">
      {/* 完成度 */}
      <div className="flex items-center gap-1.5 mb-3.5">
        {steps.map((done, i) => (
          <motion.div key={i}
            animate={{
              background: done ? 'var(--ac-dim)' : 'rgba(150,112,15,0.16)',
              opacity: done ? 1 : 0.7,
            }}
            transition={{ duration: 0.3 }}
            className="h-[3px] rounded-full"
            style={{ flex: 1 }} />
        ))}
        <span className="text-[9.5px] tabular-nums ml-1 shrink-0" style={{ color: 'var(--ink-3)' }}>
          {completedSteps}/4
        </span>
      </div>

      <div className="space-y-2.5">
        {/* 出生日期 */}
        <Row icon="birthday" label="出生日期（公历）"
          hint={submitAttempted && errorMsg ? `✕ ${errorMsg}` : undefined}>
          <div className="flex items-baseline gap-1">
            <PlainSelect ariaLabel="出生年份" value={form.year} flex={1.25}
              onChange={v => { setForm({ ...form, year: v }); setTouched(t => ({ ...t, year: true })); }}>
              <option value="">选择年份</option>
              {Array.from({ length: 127 }, (_, i) => 2026 - i).map(yr => (
                <option key={yr} value={String(yr)}>{yr} 年</option>
              ))}
            </PlainSelect>
            <PlainSelect ariaLabel="出生月份" value={form.month} flex={1}
              onChange={v => { setForm({ ...form, month: v }); setTouched(t => ({ ...t, month: true })); }}>
              <option value="">选择月份</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(mo => (
                <option key={mo} value={String(mo)}>{mo} 月</option>
              ))}
            </PlainSelect>
            <PlainSelect ariaLabel="出生日期" value={form.day} flex={1}
              onChange={v => { setForm({ ...form, day: v }); setTouched(t => ({ ...t, day: true })); }}>
              <option value="">选择日期</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(dy => (
                <option key={dy} value={String(dy)}>{dy} 日</option>
              ))}
            </PlainSelect>
          </div>
        </Row>

        {/* 出生时间 */}
        <Row icon="clock" label="出生时间（北京时间）"
          hint={form.unknownTime
            ? '已按子时（23:00–01:00）起盘'
            : `真太阳时 → ${SHICHEN_NAMES[branch]}时${shichenInfo ? ` · ${shichenInfo.range}` : ''}`}
          disabled={false}>
          <div className="flex items-baseline gap-1">
            <PlainSelect ariaLabel="出生小时" value={form.clockHour} flex={1}
              onChange={v => setForm({ ...form, clockHour: v })}>
              {Array.from({ length: 24 }, (_, i) => i).map(h => (
                <option key={h} value={String(h)}>{h.toString().padStart(2, '0')} 时</option>
              ))}
            </PlainSelect>
            <PlainSelect ariaLabel="出生分钟" value={form.clockMinute} flex={1}
              onChange={v => setForm({ ...form, clockMinute: v })}>
              {Array.from({ length: 60 }, (_, i) => i).map(min => (
                <option key={min} value={String(min)}>{min.toString().padStart(2, '0')} 分</option>
              ))}
            </PlainSelect>
          </div>
          <label className="flex items-center gap-1.5 mt-1.5 cursor-pointer">
            <input type="checkbox" checked={form.unknownTime}
              onChange={e => setForm({ ...form, unknownTime: e.target.checked })}
              style={{ width: 12, height: 12, accentColor: '#8A6414', cursor: 'pointer' }} />
            <span className="text-[9.5px]" style={{ color: 'var(--ink-3)' }}>不知道具体时间</span>
          </label>
        </Row>

        {/* 出生地点 */}
        <Row icon="pin" label="出生地点（真太阳时校正）"
          hint={form.city
            ? `${form.city} · 经度 ${form.longitude.toFixed(1)}°E · 时差 ${offsetMin > 0 ? '+' : ''}${offsetMin} 分钟`
            : '填写出生地可自动校正时辰'}>
          <div className="flex items-baseline gap-1">
            <PlainSelect ariaLabel="省份" value={form.province} flex={1.15}
              onChange={handleProvince}>
              <option value="">省份 / 直辖市</option>
              {PROVINCES.map(p => (<option key={p.name} value={p.name}>{p.name}</option>))}
            </PlainSelect>
            <PlainSelect ariaLabel="城市" value={form.city} flex={1}
              onChange={handleCity}>
              <option value="">{form.province ? '城市' : '先选省份'}</option>
              {cityList.map(c => (<option key={c.name} value={c.name}>{c.name}</option>))}
            </PlainSelect>
          </div>
        </Row>

        {/* 姓名 + 性别 */}
        <Row icon="user" label="姓名（可选）· 性别">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="请输入姓名"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="flex-1 min-w-0 bg-transparent outline-none text-[13.5px]"
              style={{ color: 'var(--ink)', border: 'none', padding: 0, height: 22 }}
            />
            <div className="flex gap-1 shrink-0">
              {(['male', 'female'] as const).map(g => {
                const active = form.gender === g;
                return (
                  <button key={g} type="button"
                    onClick={() => setForm({ ...form, gender: g })}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all"
                    style={{
                      border: `1px solid ${active ? 'rgba(107,75,192,0.55)' : 'rgba(150,112,15,0.18)'}`,
                      background: active ? 'rgba(107,75,192,0.12)' : 'transparent',
                      color: active ? '#5B3FA8' : 'var(--ink-3)',
                    }}>
                    {g === 'male' ? '♂ 男' : '♀ 女'}
                  </button>
                );
              })}
            </div>
          </div>
        </Row>
      </div>

      {/* 确认信息 */}
      <AnimatePresence>
        {showSummary && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: 'rgba(107,75,192,0.07)', border: '1px solid rgba(107,75,192,0.18)' }}>
              <span className="text-[11px]" style={{ color: '#5B3FA8' }}>✓</span>
              <span className="text-[10.5px] tracking-wide" style={{ color: '#4C3A86' }}>{summaryText}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 提交 */}
      {!hideSubmit && (
        <motion.button
          type="submit"
          disabled={loading}
          whileTap={loading ? {} : { scale: 0.985 }}
          className="w-full mt-4 rounded-full flex items-center justify-center gap-2 text-white"
          style={{
            padding: '14px',
            fontSize: '13.5px',
            fontWeight: 600,
            letterSpacing: '0.14em',
            border: '1px solid rgba(255,255,255,0.18)',
            cursor: loading ? 'not-allowed' : 'pointer',
            background: loading
              ? 'rgba(107,75,192,0.45)'
              : 'linear-gradient(135deg, #63439F 0%, #8862D6 100%)',
            boxShadow: loading ? 'none' : '0 10px 26px rgba(84,56,168,0.32)',
          }}>
          {loading ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }}
              />
              紫微起盘中…
            </>
          ) : (
            <>
              开始测算
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </>
          )}
        </motion.button>
      )}
    </motion.form>
  );
}
