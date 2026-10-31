'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from './LanguageProvider';

const links = [
  { href: '/', key: 'nav.home', icon: '🏠' },
  { href: '/report', key: 'nav.report', icon: '📷' },
  { href: '/dashboard', key: 'nav.dashboard', icon: '📊' },
];

export default function Navbar() {
  const pathname = usePathname();
  const { t, lang, toggleLang, isUrdu } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-900/5 bg-white/70 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-700 text-lg shadow-soft transition group-hover:scale-105">
            <span aria-hidden>🌿</span>
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-pulse rounded-full border-2 border-white bg-lime-400" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-extrabold tracking-tight text-emerald-950 sm:text-base">
              Hyderabad <span className="text-emerald-600">Saaf</span> AI
            </span>
            <span className={`block text-[10px] font-medium text-emerald-900/50 ${isUrdu ? 'urdu text-sm leading-6' : ''}`}>
              {isUrdu ? 'حیدرآباد صاف اے آئی' : 'Municipal complaints, simplified'}
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold transition sm:px-3.5 sm:text-sm ${
                  active
                    ? 'bg-emerald-900/5 text-emerald-900'
                    : 'text-emerald-900/60 hover:bg-emerald-900/5 hover:text-emerald-900'
                }`}
              >
                <span className="text-sm" aria-hidden>
                  {link.icon}
                </span>
                <span className="hidden xs:inline sm:inline">{t(link.key)}</span>
              </Link>
            );
          })}

          <Link
            href="/report"
            className="ml-1 hidden rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 px-4 py-2 text-xs font-bold text-white shadow-soft transition hover:brightness-110 sm:inline-flex"
          >
            + {t('nav.report')}
          </Link>

          <button
            type="button"
            onClick={toggleLang}
            aria-label="Switch language"
            className="ml-1 flex h-9 min-w-[3.25rem] items-center justify-center rounded-xl bg-white px-2.5 text-xs font-bold text-emerald-800 ring-1 ring-emerald-900/10 transition hover:bg-emerald-50"
          >
            <span className={lang === 'ur' ? 'urdu text-sm' : ''}>{t('nav.lang')}</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
