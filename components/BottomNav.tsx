'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * 手机端底部 Tab Bar —— 对齐参考稿的 App 结构
 * 首页 / 命盘 / 合盘 / 知识库
 */
const TABS = [
  {
    href: '/',
    label: '首页',
    match: (p: string) => p === '/',
    icon: (
      <>
        <path d="M4 11.2 12 4.5l8 6.7" />
        <path d="M6.4 10.2V19h11.2v-8.8" />
        <path d="M10 19v-4.6h4V19" />
      </>
    ),
  },
  {
    href: '/chart',
    label: '命盘',
    match: (p: string) => p.startsWith('/chart'),
    icon: (
      <>
        <circle cx="12" cy="12" r="8.2" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M12 3.8v2.6M12 17.6v2.6M3.8 12h2.6M17.6 12h2.6" />
      </>
    ),
  },
  {
    href: '/heming',
    label: '合盘',
    match: (p: string) => p.startsWith('/heming'),
    icon: (
      <>
        <path d="M12 19.5S4.8 15.4 4.8 10.6a3.9 3.9 0 0 1 7.2-2.1 3.9 3.9 0 0 1 7.2 2.1c0 4.8-7.2 8.9-7.2 8.9Z" />
      </>
    ),
  },
  {
    href: '/knowledge',
    label: '知识',
    match: (p: string) => p.startsWith('/knowledge') || p.startsWith('/library'),
    icon: (
      <>
        <path d="M5 5.2c2.6-.9 4.9-.4 7 1.1 2.1-1.5 4.4-2 7-1.1v12.5c-2.6-.9-4.9-.4-7 1.1-2.1-1.5-4.4-2-7-1.1Z" />
        <path d="M12 6.3v12.5" />
      </>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname() || '/';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[60] md:hidden no-print"
      style={{
        background: 'var(--bottomnav-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--bottomnav-bdr)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1.5">
        {TABS.map(tab => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center gap-1 py-1 rounded-2xl transition-colors"
              style={{ color: active ? 'var(--ac)' : 'var(--tx-3)' }}
            >
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth={active ? 1.8 : 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ filter: active ? 'drop-shadow(0 0 6px rgba(232,205,147,0.55))' : 'none' }}
              >
                {tab.icon}
              </svg>
              <span
                className="text-[10px] tracking-[0.12em]"
                style={{ fontWeight: active ? 600 : 400 }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
