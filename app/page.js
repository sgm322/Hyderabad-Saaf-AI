'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import StatusBadge from '@/components/StatusBadge';
import { subscribeComplaints } from '@/lib/db';
import { CATEGORIES, timeAgo } from '@/lib/constants';

const bigReports = [
  {
    type: 'WASTE',
    href: '/report?type=WASTE',
    emoji: '🗑️',
    en: 'Report Garbage',
    ur: 'کچرے کی شکایت',
    desc: 'Piles, bins, dumping',
    bg: 'from-emerald-400 to-emerald-700',
    soft: 'bg-emerald-50 hover:border-emerald-400',
  },
  {
    type: 'ROAD',
    href: '/report?type=ROAD',
    emoji: '🕳️',
    en: 'Report Pothole',
    ur: 'گڑھے کی شکایت',
    desc: 'Roads & footpaths',
    bg: 'from-amber-400 to-orange-600',
    soft: 'bg-amber-50 hover:border-amber-400',
  },
  {
    type: 'LIGHT',
    href: '/report?type=LIGHT',
    emoji: '💡',
    en: 'Report Streetlight',
    ur: 'اسٹریٹ لائٹ کی شکایت',
    desc: 'Dark streets & lamps',
    bg: 'from-violet-400 to-purple-700',
    soft: 'bg-violet-50 hover:border-violet-400',
  },
];

export default function HomePage() {
  const { t, isUrdu } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [mode, setMode] = useState('local');

  useEffect(() => {
    const unsub = subscribeComplaints(
      (list) => setComplaints(list),
      (meta) => setMode(meta.mode)
    );
    return unsub;
  }, []);

  const recent = complaints.slice(0, 3);
  const resolved = complaints.filter((c) => c.status === 'Resolved').length;

  return (
    <div className="overflow-hidden">
      {/* ---------------- HERO ---------------- */}
      <section className="relative">
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 animate-blob rounded-full bg-emerald-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-40 h-80 w-80 animate-blob rounded-full bg-teal-300/30 blur-3xl [animation-delay:4s]" />

        <div className="container-page relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.05fr_.95fr] lg:gap-14 lg:py-20">
          <div className="animate-fadeUp">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-900/5 px-3 py-1.5 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-900/10">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              {t('landing.badge')}
            </span>

            <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-emerald-950 sm:text-5xl lg:text-[3.4rem]">
              {t('landing.title1')}{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-lime-500 bg-clip-text text-transparent">
                {t('landing.title2')}
              </span>
            </h1>

            <p className={`mt-3 text-sm font-semibold text-emerald-700/80 ${isUrdu ? 'urdu text-lg leading-9' : ''}`}>
              {t('landing.urduTagline')}
            </p>

            <p className={`mt-4 max-w-xl text-sm leading-relaxed text-emerald-950/65 sm:text-base ${isUrdu ? 'urdu text-base leading-9' : ''}`}>
              {t('landing.sub')}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {bigReports.map((item, index) => (
                <Link
                  key={item.type}
                  href={item.href}
                  style={{ animationDelay: `${120 + index * 90}ms` }}
                  className={`group animate-fadeUp relative overflow-hidden rounded-3xl border border-transparent ${item.soft} p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lift active:scale-[.99]`}
                >
                  <span
                    className={`mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${item.bg} text-xl shadow-soft transition group-hover:scale-110`}
                  >
                    {item.emoji}
                  </span>
                  <span className="block text-sm font-extrabold leading-tight text-emerald-950">
                    {isUrdu ? item.ur : item.en}
                  </span>
                  <span className={`mt-0.5 block text-[11px] font-medium text-emerald-900/55 ${isUrdu ? 'urdu leading-6' : ''}`}>
                    {isUrdu ? item.en : item.ur}
                  </span>
                  <span className="mt-2 flex items-center justify-between text-[10px] font-semibold text-emerald-900/45">
                    {item.desc}
                    <span className="transition group-hover:translate-x-1">→</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href="/report?type=WATER"
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700 ring-1 ring-blue-200 transition hover:bg-blue-100"
              >
                💧 {t('landing.reportWater')} →
              </Link>
              <span className={`text-[11px] text-emerald-900/45 ${isUrdu ? 'urdu text-sm' : ''}`}>
                {t('landing.trust')}
              </span>
            </div>

            <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
              {[
                { value: complaints.length || '5', label: t('landing.stat1'), sub: 'HMC · WASA · HESCO' },
                { value: '2', label: t('landing.stat2'), sub: 'Vision + Gemini' },
                { value: '0', label: t('landing.stat3'), sub: 'Just open & report' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-white/70 p-3 ring-1 ring-emerald-900/5">
                  <p className="text-xl font-black text-emerald-700">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-950/45">{stat.label}</p>
                  <p className="mt-0.5 text-[9px] text-emerald-950/35">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero visual */}
          <div className="relative mx-auto w-full max-w-md animate-fadeIn lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-emerald-200/60 via-teal-100/40 to-lime-200/50 blur-2xl" />
            <div className="relative rotate-1 rounded-[2rem] bg-white p-3 shadow-lift ring-1 ring-emerald-900/5 transition duration-500 hover:rotate-0">
              <div className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-950 p-4">
                <div className="flex items-center justify-between text-[10px] font-semibold text-emerald-100/80">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-lime-400" /> AI vision live
                  </span>
                  <span>google/vit-base-patch16-224</span>
                </div>

                <div className="relative mt-3 h-44 overflow-hidden rounded-2xl bg-gradient-to-b from-emerald-600/40 to-emerald-950/60 ring-1 ring-white/10">
                  <div className="absolute inset-0 flex items-center justify-center text-7xl opacity-90">🗑️</div>
                  <div className="scan-line absolute inset-x-0 h-10 bg-gradient-to-b from-lime-300/0 via-lime-300/40 to-lime-300/0" />
                  <div className="absolute left-2 top-2 rounded-full bg-black/30 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">
                    Latifabad Unit 3
                  </div>
                  <div className="absolute inset-x-2 bottom-2 rounded-xl bg-white/95 p-2.5 shadow-lg backdrop-blur">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-950">Garbage detected</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">95%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                      <div className="h-full w-[95%] rounded-full bg-gradient-to-r from-emerald-500 to-lime-400" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-200/60">Department</p>
                    <p className="text-xs font-extrabold text-white">HMC</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-2.5 ring-1 ring-white/10">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-emerald-200/60">Priority</p>
                    <p className="text-xs font-extrabold text-rose-300">High 🔥</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-5 -left-3 flex -rotate-2 items-center gap-2 rounded-2xl bg-white p-3 shadow-lift ring-1 ring-emerald-900/5 sm:-left-6">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-sm">⚡</span>
              <div>
                <p className="text-[10px] font-extrabold text-emerald-950">Auto-routed to HMC</p>
                <p className="text-[9px] text-emerald-900/50">Formal complaint written</p>
              </div>
            </div>

            <div className="absolute -right-2 top-1/3 rotate-3 rounded-xl bg-white px-3 py-2 text-[10px] font-bold text-emerald-900 shadow-lift ring-1 ring-emerald-900/5 sm:-right-5">
              اردو · سنڌي · English
            </div>
          </div>
        </div>

        <div className="container-page pb-4">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-2xl bg-white/50 px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-emerald-900/35 ring-1 ring-emerald-900/5">
            <span>Powered by</span>
            {['Next.js 14', 'Hugging Face', 'Gemini', 'Firebase', 'React-Leaflet', 'Web Speech API'].map((item) => (
              <span key={item} className="text-emerald-900/60">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="container-page py-14 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="section-title">{t('landing.howTitle')}</h2>
          <p className="mt-2 text-sm text-emerald-950/55">{t('landing.howSub')}</p>
        </div>

        <div className="relative mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="pointer-events-none absolute left-[12%] right-[12%] top-12 hidden h-px bg-gradient-to-r from-emerald-200 via-emerald-400 to-emerald-200 lg:block" />
          {[
            { n: '01', icon: '📸', title: t('landing.step1'), desc: t('landing.step1Desc') },
            { n: '02', icon: '🤖', title: t('landing.step2'), desc: t('landing.step2Desc') },
            { n: '03', icon: '🧭', title: t('landing.step3'), desc: t('landing.step3Desc') },
            { n: '04', icon: '📍', title: t('landing.step4'), desc: t('landing.step4Desc') },
          ].map((step, i) => (
            <div
              key={step.n}
              style={{ animationDelay: `${i * 80}ms` }}
              className="card card-hover relative animate-fadeUp p-5"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 text-2xl ring-1 ring-emerald-900/5">
                  {step.icon}
                </span>
                <span className="text-xs font-black tracking-widest text-emerald-900/15">{step.n}</span>
              </div>
              <h3 className="mt-4 text-sm font-extrabold text-emerald-950">{step.title}</h3>
              <p className={`mt-1 text-xs leading-relaxed text-emerald-950/55 ${isUrdu ? 'urdu text-sm leading-7' : ''}`}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- LIVE FEED ---------------- */}
      <section className="container-page pb-6">
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-900/5 px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" />
                </span>
                <h2 className="text-sm font-extrabold text-emerald-950">{t('landing.live')}</h2>
                <span className="chip bg-emerald-50 text-[10px] text-emerald-700 ring-1 ring-emerald-200">
                  {mode === 'firebase' ? t('dash.modeFirebase') : t('dash.modeLocal')}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-950/45">{t('landing.liveSub')}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[11px] font-semibold text-emerald-900/45 sm:inline">
                ✅ {resolved} {t('dash.resolved')}
              </span>
              <Link href="/dashboard" className="btn-secondary px-3.5 py-2 text-xs">
                {t('landing.viewAll')} →
              </Link>
            </div>
          </div>

          <div className="divide-y divide-emerald-900/5">
            {recent.length === 0 ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="skeleton h-12 w-12 rounded-xl" />
                  <div className="flex-1">
                    <div className="skeleton h-3 w-3/4 rounded" />
                    <div className="skeleton mt-2 h-2.5 w-1/3 rounded" />
                  </div>
                </div>
              ))
            ) : (
              recent.map((complaint) => {
                const cat = CATEGORIES[complaint.category] || CATEGORIES.WASTE;
                return (
                  <Link
                    key={complaint.id}
                    href="/dashboard"
                    className="flex items-center gap-3 p-4 transition hover:bg-emerald-50/60"
                  >
                    <span
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-emerald-950 sm:text-sm">
                        {complaint.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-emerald-900/45">
                        📍 {complaint.area || 'Hyderabad'} · {timeAgo(complaint.createdAt)} ·{' '}
                        {complaint.department}
                      </p>
                    </div>
                    <StatusBadge status={complaint.status} className="shrink-0" />
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="container-page py-10 sm:py-14">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-800 via-emerald-900 to-teal-950 px-6 py-10 text-center shadow-lift sm:px-10 sm:py-14">
          <div className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 animate-blob rounded-full bg-lime-400/20 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 animate-blob rounded-full bg-teal-300/20 blur-2xl [animation-delay:3s]" />
          <p className={`relative text-sm text-emerald-100/80 ${isUrdu ? 'urdu text-base leading-9' : ''}`}>
            {t('landing.urduTagline')}
          </p>
          <h2 className="relative mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            See something? Say something.
          </h2>
          <p className="relative mx-auto mt-2 max-w-lg text-xs text-emerald-100/65 sm:text-sm">
            One photo is all it takes. Your city works better when you report what you see.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-2.5">
            <Link
              href="/report?type=WASTE"
              className="rounded-2xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-900 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              📸 {t('nav.report')}
            </Link>
            <Link
              href="/dashboard"
              className="rounded-2xl bg-white/10 px-5 py-3 text-sm font-extrabold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/20"
            >
              📊 {t('nav.dashboard')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
