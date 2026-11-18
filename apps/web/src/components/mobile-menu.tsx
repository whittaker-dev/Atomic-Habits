'use client';

import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export type NavLink = { href: string; label: string };

// Menu ☰ của thanh trên cùng khi màn nhỏ hơn lg (thanh link chỉ hiện từ lg). Panel thả xuống ngay dưới
// header, render qua portal: header có backdrop-blur nên một lớp `fixed` nằm trong nó sẽ bị giới hạn
// trong khung header thay vì phủ cả màn hình.

export function MobileMenu({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [top, setTop] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { t } = useTranslation();

  useEffect(() => setMounted(true), []);

  // Đổi trang (kể cả bấm link "/#contact" trên cùng trang) thì đóng menu.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => panel.current?.querySelector('a')?.focus(), 50);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKeyDown);
      window.clearTimeout(timer);
    };
  }, [open]);

  const toggle = () => {
    // Panel bám ngay dưới header; header dính trên cùng nhưng băng quảng cáo phía trên có thể đã cuộn đi.
    const header = button.current?.closest('header');
    setTop(header ? header.getBoundingClientRect().bottom : 0);
    setOpen((o) => !o);
  };

  const menu = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-x-0 bottom-0 z-[150] lg:hidden" style={{ top }}>
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-canvas/70 backdrop-blur-sm"
            aria-label={t('nav.closeMenu')}
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <motion.nav
            ref={panel}
            id="mobile-menu"
            aria-label={t('nav.menu')}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-h-full overflow-y-auto border-b border-hairline bg-surface-1 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
          >
            <ul className="container-content flex flex-col py-sm">
              {links.map((link) => {
                const current = link.href === pathname;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={current ? 'page' : undefined}
                      className={cn(
                        'flex min-h-12 items-center rounded-md px-sm font-sans text-body transition-colors',
                        current
                          ? 'font-bold text-primary'
                          : 'text-ink-subtle hover:bg-surface-2 hover:text-ink',
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={toggle}
        className="flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-1 hover:text-ink lg:hidden"
        aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
        aria-expanded={open}
        aria-controls="mobile-menu"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden
        >
          {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      {mounted && createPortal(menu, document.body)}
    </>
  );
}
