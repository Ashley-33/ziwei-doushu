'use client';

import type { ReactNode } from 'react';

/**
 * AI 解读正文渲染器（命盘解读 / 追问 / 合盘共用）
 *
 * 模型输出的是轻量 Markdown：**【小标题】**、**加粗**、1. 列表、- 列表、空行分段。
 * 这里不引第三方 markdown 库（体积 + 样式不可控），只识别这几种，够用且可控。
 *
 * 排版原则：手机优先。
 * - 手机：正文 14.5px / 行高 1.95，段落之间有呼吸感，长文可读
 * - 桌面（lg，侧栏只有 380px 宽）：回到 12px 紧凑档，一屏能看更多
 */

interface AiContentProps {
  text: string;
  streaming?: boolean;
}

const SECTION_RE = /^\*\*【(.+?)】\*\*\s*(.*)$/;
const BOLD_LINE_RE = /^\*{2}(.+?)\*{2}$/;
const ORDERED_RE = /^(\d{1,2})[.、)]\s*(.+)$/;
const BULLET_RE = /^[-*•·—]\s*(.+)$/;

/** 行内 **加粗** → <strong>，其余原样 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/).map((part, i) =>
    i % 2 === 0 ? (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ) : (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold" style={{ color: 'var(--tx-0)' }}>
        {part}
      </strong>
    ),
  );
}

export default function AiContent({ text, streaming }: AiContentProps) {
  const lines = text.split('\n');

  return (
    <div className="text-[14.5px] leading-[1.95] lg:text-[12px] lg:leading-[1.8]" style={{ color: 'var(--tx-1)' }}>
      {lines.map((raw, i) => {
        const line = raw.replace(/\s+$/, '');

        // 空行不再占位：段落间距统一由下面的 margin 控制，
        // 这样无论模型爱不爱空行，排版都一致
        if (line.trim() === '') return null;

        // **【小标题】**  →  金色竖条 + 金色标题（后面还跟着文字时一起渲染）
        const section = line.match(SECTION_RE);
        if (section) {
          const rest = section[2]?.trim() ?? '';
          return (
            <div key={i} className="mt-6 first:mt-0 lg:mt-4">
              <div className="flex items-center gap-2 mb-1.5 lg:mb-1">
                <span
                  className="inline-block rounded-full flex-shrink-0"
                  style={{ width: 3, height: 14, background: 'var(--ac)', opacity: 0.85 }}
                />
                <span
                  className="text-[14.5px] font-semibold tracking-wide lg:text-[12px]"
                  style={{ color: 'var(--ac)' }}
                >
                  {section[1]}
                </span>
              </div>
              {rest && <p className="m-0 break-words">{renderInline(rest, `s${i}`)}</p>}
            </div>
          );
        }

        // 整行加粗 → 当作二级小标题
        const boldLine = line.match(BOLD_LINE_RE);
        if (boldLine) {
          return (
            <div
              key={i}
              className="mt-4 first:mt-0 text-[14.5px] font-semibold lg:mt-3 lg:text-[12px]"
              style={{ color: 'var(--tx-0)' }}
            >
              {boldLine[1]}
            </div>
          );
        }

        // 1. 有序列表
        const ordered = line.match(ORDERED_RE);
        if (ordered) {
          return (
            <div key={i} className="mt-1.5 flex gap-2 break-words lg:mt-1">
              <span
                className="flex-shrink-0 tabular-nums font-medium"
                style={{ color: 'var(--ac)', minWidth: '1.2em' }}
              >
                {ordered[1]}.
              </span>
              <span className="flex-1">{renderInline(ordered[2], `o${i}`)}</span>
            </div>
          );
        }

        // - 无序列表
        const bullet = line.match(BULLET_RE);
        if (bullet) {
          return (
            <div key={i} className="mt-1.5 flex gap-2 break-words lg:mt-1">
              <span className="flex-shrink-0" style={{ color: 'var(--ac)', opacity: 0.7 }}>•</span>
              <span className="flex-1">{renderInline(bullet[1], `b${i}`)}</span>
            </div>
          );
        }

        // 普通段落
        return (
          <p key={i} className="mt-2.5 first:mt-0 break-words lg:mt-1.5 m-0">
            {renderInline(line, `p${i}`)}
          </p>
        );
      })}

      {streaming && (
        <span
          className="inline-block align-middle animate-pulse rounded-sm"
          style={{
            width: 7,
            height: 15,
            marginLeft: 3,
            background: 'var(--ac)',
            opacity: 0.55,
          }}
        />
      )}
    </div>
  );
}
