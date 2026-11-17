'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import BirthForm from '@/components/BirthForm';
import ChartBoard from '@/components/ChartBoard';
import ChartSummary from '@/components/ChartSummary';
import InsightPanel from '@/components/InsightPanel';
import { generateChart } from '@/lib/ziwei/algorithm';
import type { BirthInfo, ZiweiChart, Palace } from '@/lib/ziwei/types';

/**
 * 命盘页 —— 排盘 + 命盘总览 + AI 解读
 *
 * 起盘完全在浏览器端完成（lib/ziwei/algorithm 的 generateChart），
 * 解读走 /api/interpret 流式接口；未配置模型 key 时降级为「一键复制提示词」。
 */
export default function ChartPage() {
  const router = useRouter();
  const [chart, setChart] = useState<ZiweiChart | null>(null);
  const [selectedPalace, setSelectedPalace] = useState<Palace | null>(null);

  return (
    <div className={chart ? 'chart-page-root' : 'min-h-screen'}>
      {/* ── 顶栏 ── */}
      <header className="chart-topbar">
        <button
          type="button"
          onClick={() => (chart ? (setChart(null), setSelectedPalace(null)) : router.push('/'))}
          className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center shrink-0"
          aria-label={chart ? '重新起盘' : '返回首页'}
          style={{ color: 'var(--tx-2)' }}>
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>

        <div className="flex-1 min-w-0 text-center">
          <div className="text-[12.5px] tracking-[0.2em] truncate"
            style={{ color: 'var(--tx-1)', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
            {chart ? '命盘详解' : '紫微排盘'}
          </div>
          {chart && (
            <div className="text-[9px] tracking-[0.22em] mt-0.5" style={{ color: 'var(--tx-3)' }}>
              ZI WEI DOU SHU
            </div>
          )}
        </div>

        {chart ? (
          <button
            type="button"
            onClick={() => { setChart(null); setSelectedPalace(null); }}
            className="shrink-0 text-[10.5px] px-3 py-1.5 rounded-full"
            style={{ border: '1px solid var(--bdr-med)', color: 'var(--tx-2)' }}>
            重排
          </button>
        ) : (
          <span className="w-8 shrink-0" />
        )}
      </header>

      {/* ── 未起盘：出生信息表单 ── */}
      {!chart ? (
        <main className="px-4 pt-8 pb-16 max-w-[520px] mx-auto">
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="text-center mb-7">
            <div className="text-[10px] tracking-[0.4em] mb-2.5" style={{ color: 'var(--ac)', opacity: 0.75 }}>
              BIRTH INFO
            </div>
            <h1 className="grad-text grad-text-gold font-bold mb-2"
              style={{ fontSize: 'clamp(22px, 6vw, 27px)', letterSpacing: '0.1em', fontFamily: "'Songti SC','Noto Serif SC',serif" }}>
              测算你的紫微命盘
            </h1>
            <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--tx-3)' }}>
              输入出生信息，开启星盘之旅
            </p>
          </motion.div>

          <BirthForm
            onSubmit={(info: BirthInfo) => setChart(generateChart(info))}
          />

          <p className="text-center text-[10px] mt-5 leading-relaxed" style={{ color: 'var(--tx-3)' }}>
            全部计算在你的设备上完成，出生信息不会上传服务器
          </p>
        </main>
      ) : (
        /* ── 已起盘：命盘 + 总览 + 解读 ── */
        <main className="chart-workspace">
          <div className="chart-workspace-left">
            <ChartBoard
              chart={chart}
              onPalaceSelect={setSelectedPalace}
            />
            <div className="mt-5 lg:mt-6">
              <ChartSummary chart={chart} />
            </div>
          </div>
          <div className="chart-workspace-right">
            <InsightPanel chart={chart} selectedPalace={selectedPalace} />
          </div>
        </main>
      )}
    </div>
  );
}
