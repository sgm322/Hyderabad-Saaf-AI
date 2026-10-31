'use client';

import { useState } from 'react';
import {
  CATEGORIES,
  DEPARTMENTS,
  PRIORITIES,
  STATUSES,
  complaintRef,
  formatDate,
  timeAgo,
} from '@/lib/constants';
import { useLanguage } from './LanguageProvider';
import StatusBadge from './StatusBadge';

export default function ComplaintCard({ complaint, onStatusChange, highlight = false }) {
  const { t, isUrdu } = useLanguage();
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [busy, setBusy] = useState(null);

  const cat = CATEGORIES[complaint.category] || CATEGORIES.WASTE;
  const priority = PRIORITIES[complaint.priority] || PRIORITIES.Medium;
  const dept = DEPARTMENTS[complaint.department] || DEPARTMENTS.HMC;
  const confidence = Math.round((Number(complaint.aiConfidence) || 0) * 100);

  const update = async (next) => {
    if (!onStatusChange) return;
    setBusy(next);
    try {
      await onStatusChange(complaint.id, next);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article
      id={`complaint-${complaint.id}`}
      className={`card overflow-hidden transition duration-300 hover:shadow-lift ${
        highlight ? 'ring-2 ring-emerald-400 shadow-lift' : ''
      }`}
    >
      <div className="flex flex-col sm:flex-row">
        <div className="relative h-44 w-full shrink-0 overflow-hidden bg-emerald-100 sm:h-auto sm:w-52">
          {complaint.imageUrl && !imgError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={complaint.imageUrl}
              alt={complaint.title}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition duration-500 hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full min-h-[11rem] w-full flex-col items-center justify-center gap-1"
              style={{ background: `linear-gradient(135deg, ${cat.color}22, ${cat.color}55)` }}
            >
              <span className="text-4xl">{cat.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/60">
                {cat.key}
              </span>
            </div>
          )}
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
            <span className="chip bg-white/95 text-emerald-900 shadow-sm ring-1 ring-white/70">
              {cat.icon} {isUrdu ? cat.ur : cat.en.split(' / ')[0]}
            </span>
            {complaint.priority === 'High' ? (
              <span className="chip bg-rose-500/95 text-white shadow-sm ring-1 ring-white/20">🔥 High</span>
            ) : null}
          </div>
        </div>

        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={complaint.status} />
            <span className="text-[10px] font-semibold text-emerald-900/40">
              {complaintRef(complaint.id)}
            </span>
            <span className="text-[10px] text-emerald-900/35">· {timeAgo(complaint.createdAt)}</span>
            {complaint.aiSimulated ? (
              <span className="chip bg-amber-50 text-[10px] text-amber-700 ring-1 ring-amber-200">
                {t('report.demoAI').split('—')[0].trim()}
              </span>
            ) : null}
          </div>

          <h3 className="mt-2 text-sm font-extrabold leading-snug text-emerald-950 sm:text-base">
            {complaint.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-emerald-950/60">
            {complaint.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-emerald-950/55">
            <span className="inline-flex items-center gap-1 font-medium">
              📍 {complaint.area || 'Hyderabad'}
            </span>
            <span className="inline-flex items-center gap-1">
              🏛️ <span className="font-semibold text-emerald-800">{dept.name}</span>
            </span>
            <span className={`inline-flex items-center gap-1 ${confidence > 0 && confidence < 70 ? 'text-amber-600' : ''}`}>
              🤖 {complaint.aiLabel || 'AI checked'}
              {confidence ? <span className="font-bold">· {confidence}%</span> : null}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`chip ${priority.bg} ${priority.text}`}>
              {t('common.priority')}: {isUrdu ? priority.ur : priority.en}
            </span>
            <span className="hidden text-[10px] text-emerald-900/35 sm:inline">
              {t('dash.reported')} {formatDate(complaint.createdAt)}
            </span>

            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              {complaint.formalComplaint ? (
                <button
                  type="button"
                  onClick={() => setOpen((v) => !v)}
                  className="rounded-xl bg-emerald-900/5 px-2.5 py-1.5 text-[10px] font-bold text-emerald-900 transition hover:bg-emerald-900/10"
                >
                  {open ? t('dash.hideFormal') : `📄 ${t('dash.showFormal')}`}
                </button>
              ) : null}

              {onStatusChange ? (
                <>
                  {complaint.status !== 'Pending' ? (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => update('Pending')}
                      className="rounded-xl bg-amber-50 px-2.5 py-1.5 text-[10px] font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      {t('dash.markPending')}
                    </button>
                  ) : null}
                  {complaint.status !== 'In-Progress' && complaint.status !== 'Resolved' ? (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => update('In-Progress')}
                      className="rounded-xl bg-blue-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      {busy === 'In-Progress' ? '...' : t('dash.markProgress')}
                    </button>
                  ) : null}
                  {complaint.status !== 'Resolved' ? (
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => update('Resolved')}
                      className="rounded-xl bg-emerald-600 px-2.5 py-1.5 text-[10px] font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === 'Resolved' ? '...' : t('dash.markResolved')}
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {open ? (
        <div className="animate-fadeIn border-t border-emerald-900/5 bg-emerald-50/50 px-4 py-4 sm:px-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">
                {t('report.formal')}
              </p>
              <p className="whitespace-pre-line rounded-2xl bg-white p-3 text-xs leading-relaxed text-emerald-950/75 ring-1 ring-emerald-900/5">
                {complaint.formalComplaint}
              </p>
            </div>
            {complaint.translation ? (
              <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">
                  {t('report.translation')}
                </p>
                <p className="rounded-2xl bg-white p-3 text-xs leading-relaxed text-emerald-950/75 ring-1 ring-emerald-900/5">
                  {complaint.translation}
                </p>
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-emerald-900/45">
            <span>🏛️ {dept.full}</span>
            <span>🤖 {complaint.aiLabel || '—'} · {confidence || '—'}%</span>
            <span>🗣️ {complaint.language || 'English'}</span>
          </div>
        </div>
      ) : null}
    </article>
  );
}
