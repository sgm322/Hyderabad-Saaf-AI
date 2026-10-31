'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ComplaintCard from '@/components/ComplaintCard';
import { useLanguage } from '@/components/LanguageProvider';
import { subscribeComplaints, setComplaintStatus } from '@/lib/db';
import { CATEGORIES, STATUSES } from '@/lib/constants';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-emerald-50">
      <div className="text-center">
        <div className="skeleton mx-auto h-10 w-10 rounded-2xl" />
        <p className="mt-2 text-xs font-semibold text-emerald-900/50">Loading map…</p>
      </div>
    </div>
  ),
});

function DashboardInner() {
  const { t, isUrdu } = useLanguage();
  const searchParams = useSearchParams();
  const focusId = searchParams.get('focus');

  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('local');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('new');
  const [view, setView] = useState('map');
  const [toast, setToast] = useState('');

  useEffect(() => {
    const unsub = subscribeComplaints(
      (list) => {
        setComplaints(list);
        setLoading(false);
      },
      (meta) => setMode(meta.mode)
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (focusId) setView('list');
  }, [focusId]);

  useEffect(() => {
    if (!focusId || !complaints.length) return undefined;
    const timer = setTimeout(() => {
      const el = document.getElementById(`complaint-${focusId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
    return () => clearTimeout(timer);
  }, [focusId, complaints.length]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const counts = useMemo(
    () => ({
      total: complaints.length,
      Pending: complaints.filter((c) => c.status === 'Pending').length,
      'In-Progress': complaints.filter((c) => c.status === 'In-Progress').length,
      Resolved: complaints.filter((c) => c.status === 'Resolved').length,
    }),
    [complaints]
  );

  const filtered = useMemo(() => {
    const list = complaints.filter(
      (c) =>
        (statusFilter === 'all' || c.status === statusFilter) &&
        (categoryFilter === 'all' || c.category === categoryFilter)
    );
    if (sortBy === 'priority') {
      const rank = { High: 0, Medium: 1, Low: 2 };
      return [...list].sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
    }
    return [...list].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [complaints, statusFilter, categoryFilter, sortBy]);

  const handleStatusChange = async (id, status) => {
    setComplaints((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    setToast(`✅ ${id ? 'Complaint' : ''} moved to ${status}`);
    await setComplaintStatus(id, status);
  };

  const statCards = [
    { key: 'all', label: t('dash.total'), value: counts.total, icon: '📋', ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    { key: 'Pending', label: t('dash.pending'), value: counts.Pending, icon: '⏳', ring: 'ring-amber-200', bg: 'bg-amber-50', text: 'text-amber-700' },
    { key: 'In-Progress', label: t('dash.progress'), value: counts['In-Progress'], icon: '🔧', ring: 'ring-blue-200', bg: 'bg-blue-50', text: 'text-blue-700' },
    { key: 'Resolved', label: t('dash.resolved'), value: counts.Resolved, icon: '✅', ring: 'ring-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  ];

  return (
    <div className="container-page py-8 sm:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="animate-fadeUp">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-emerald-950 sm:text-3xl">{t('dash.title')}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
              </span>
              {mode === 'firebase' ? t('dash.modeFirebase') : t('dash.modeLocal')}
            </span>
          </div>
          <p className={`mt-1 text-sm text-emerald-950/55 ${isUrdu ? 'urdu text-base' : ''}`}>{t('dash.sub')}</p>
        </div>

        <div className="flex items-center gap-2">
          {focusId ? (
            <Link href="/dashboard" className="btn-ghost px-3 py-2 text-xs">
              ✕ Clear focus
            </Link>
          ) : null}
          <Link href="/report" className="btn-primary px-4 py-2.5 text-xs">
            + {t('dash.newReport')}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((stat, i) => {
          const active = statusFilter === stat.key;
          return (
            <button
              key={stat.key}
              type="button"
              onClick={() => setStatusFilter(stat.key)}
              style={{ animationDelay: `${i * 60}ms` }}
              className={`card card-hover animate-fadeUp flex items-center gap-3 p-3.5 text-left sm:p-4 ${
                active ? 'ring-2 ring-emerald-400' : ''
              }`}
            >
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg ${stat.bg} ring-1 ${stat.ring}`}>
                {stat.icon}
              </span>
              <div className="min-w-0">
                <p className={`text-2xl font-black leading-none ${stat.text}`}>
                  {loading ? '–' : stat.value}
                </p>
                <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-wide text-emerald-950/40">
                  {stat.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {mode === 'local' ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-white/60 px-3.5 py-2.5 text-[10px] text-emerald-900/50 ring-1 ring-emerald-900/5">
          <span>📡</span>
          <span className="font-semibold text-emerald-900/70">{t('dash.refresh')}</span>
          <span>·</span>
          <span>Local realtime store active. Add Firebase env keys (see README) to sync across devices.</span>
        </div>
      ) : null}

      {/* Filters */}
      <div className="card mt-4 flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
              categoryFilter === 'all'
                ? 'bg-emerald-900 text-white'
                : 'bg-emerald-900/5 text-emerald-900/60 hover:bg-emerald-900/10'
            }`}
          >
            {t('dash.allCategories')}
          </button>
          {Object.values(CATEGORIES).map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategoryFilter(cat.key)}
              className={`rounded-xl px-2.5 py-1.5 text-[11px] font-bold transition ${
                categoryFilter === cat.key
                  ? 'bg-emerald-900 text-white'
                  : 'bg-emerald-900/5 text-emerald-900/60 hover:bg-emerald-900/10'
              }`}
            >
              {cat.icon} {isUrdu ? cat.ur : cat.en.split(' / ')[0]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-white px-2.5 py-2 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{t('dash.allStatuses')}</option>
            {Object.values(STATUSES).map((s) => (
              <option key={s.key} value={s.key}>
                {isUrdu ? s.ur : s.en}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl bg-white px-2.5 py-2 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="new">Newest first</option>
            <option value="priority">Priority first</option>
          </select>

          <span className="text-[10px] font-semibold text-emerald-900/40">
            {t('dash.showing')} {filtered.length}/{complaints.length}
          </span>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="mt-4 flex rounded-2xl bg-emerald-900/5 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setView('map')}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
            view === 'map' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/50'
          }`}
        >
          🗺️ {t('dash.map')}
        </button>
        <button
          type="button"
          onClick={() => setView('list')}
          className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
            view === 'list' ? 'bg-white text-emerald-900 shadow-sm' : 'text-emerald-900/50'
          }`}
        >
          📋 {t('dash.list')} ({filtered.length})
        </button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        {/* Map */}
        <div className={`${view === 'map' ? 'block' : 'hidden'} lg:block lg:sticky lg:top-20`}>
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-900/5 px-4 py-3">
              <div>
                <p className="text-xs font-extrabold text-emerald-950">🗺️ {t('dash.map')} · Hyderabad</p>
                <p className="text-[10px] text-emerald-900/45">
                  {filtered.length} {t('common.issue')} · {t('dash.refresh')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-semibold text-emerald-900/50">
                {Object.values(STATUSES).map((s) => (
                  <span key={s.key} className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="hidden sm:inline">{s.en}</span>
                  </span>
                ))}
              </div>
            </div>
            <div className="relative h-[360px] sm:h-[440px] lg:h-[590px]">
              <MapView complaints={filtered} />
              <div className="pointer-events-none absolute bottom-3 left-3 z-[400] rounded-xl bg-white/95 px-2.5 py-1.5 text-[9px] font-semibold text-emerald-900/60 shadow ring-1 ring-emerald-900/5">
                High-priority markers pulse 🔥
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div className={`${view === 'list' ? 'block' : 'hidden'} lg:block`}>
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-extrabold text-emerald-950">
              📋 {t('dash.list')}{' '}
              <span className="font-semibold text-emerald-900/40">({filtered.length})</span>
            </p>
            {filtered.length ? (
              <span className="text-[10px] text-emerald-900/40">
                {statusFilter === 'all' ? t('dash.allStatuses') : isUrdu ? STATUSES[statusFilter]?.ur : STATUSES[statusFilter]?.en}
              </span>
            ) : null}
          </div>

          <div className="space-y-3 lg:max-h-[560px] lg:overflow-y-auto lg:pr-1">
            {loading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="card flex gap-3 p-3">
                  <div className="skeleton h-24 w-24 shrink-0 rounded-2xl" />
                  <div className="flex-1 py-1">
                    <div className="skeleton h-3 w-2/3 rounded" />
                    <div className="skeleton mt-2 h-2.5 w-full rounded" />
                    <div className="skeleton mt-2 h-2.5 w-1/2 rounded" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
                <span className="text-4xl">🌿</span>
                <p className="mt-3 text-sm font-extrabold text-emerald-950">{t('dash.empty')}</p>
                <p className="mt-1 text-xs text-emerald-900/45">
                  Try a different filter or report a new issue.
                </p>
                <Link href="/report" className="btn-primary mt-4 px-4 py-2.5 text-xs">
                  + {t('dash.newReport')}
                </Link>
              </div>
            ) : (
              filtered.map((complaint) => (
                <ComplaintCard
                  key={complaint.id}
                  complaint={complaint}
                  onStatusChange={handleStatusChange}
                  highlight={focusId === complaint.id}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-emerald-900/35">
        <span>🟢 Resolved</span>
        <span>🟡 Pending</span>
        <span>🔴 High priority</span>
        <span>·</span>
        <span>Realtime via {mode === 'firebase' ? 'Firebase Firestore' : 'local BroadcastChannel'}</span>
      </div>

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 animate-popIn rounded-2xl bg-emerald-900 px-4 py-2.5 text-xs font-bold text-white shadow-lift">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16">
          <div className="skeleton mx-auto h-6 w-56 rounded" />
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-20 rounded-3xl" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardInner />
    </Suspense>
  );
}
