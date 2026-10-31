'use client';

import Link from 'next/link';
import { useLanguage } from './LanguageProvider';

export default function Footer() {
  const { t, isUrdu } = useLanguage();

  return (
    <footer className="mt-16 border-t border-emerald-900/5 bg-white/50 backdrop-blur">
      <div className="container-page py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-sm">
                🌿
              </span>
              <span className="text-sm font-extrabold text-emerald-950">Hyderabad Saaf AI</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-emerald-950/60">
              Built for the Denning Hackathon. A civic-tech prototype connecting citizens of Hyderabad,
              Sindh with HMC, WASA and HESCO using on-device speech and in-app AI.
            </p>
            <p className={`mt-3 text-xs text-emerald-900/60 ${isUrdu ? 'urdu text-sm' : ''}`}>
              {isUrdu ? 'حیدرآباد صاف اے آئی — عوامی خدمت کے لیے ایک قدم' : 'حیدرآباد صاف اے آئی — عوامی خدمت کے لیے ایک قدم'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="mb-2 font-bold uppercase tracking-wider text-emerald-950/40">Explore</p>
              <div className="flex flex-col gap-1.5">
                <Link href="/" className="text-emerald-900/70 hover:text-emerald-700">
                  {t('nav.home')}
                </Link>
                <Link href="/report" className="text-emerald-900/70 hover:text-emerald-700">
                  {t('nav.report')}
                </Link>
                <Link href="/dashboard" className="text-emerald-900/70 hover:text-emerald-700">
                  {t('nav.dashboard')}
                </Link>
              </div>
            </div>
            <div>
              <p className="mb-2 font-bold uppercase tracking-wider text-emerald-950/40">Powered by</p>
              <div className="flex flex-wrap gap-1.5">
                {['Next.js 14', 'Hugging Face', 'Gemini', 'Firebase', 'Leaflet'].map((tech) => (
                  <span
                    key={tech}
                    className="rounded-lg bg-emerald-900/5 px-2 py-1 text-[10px] font-semibold text-emerald-900/70"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-emerald-900/5 pt-5 text-[11px] text-emerald-950/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Hyderabad Saaf AI · Civic prototype, not an official government service.</p>
          <p>Made with care for Hyderabad, Sindh 🇵🇰</p>
        </div>
      </div>
    </footer>
  );
}
