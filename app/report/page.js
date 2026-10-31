'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CameraUpload from '@/components/CameraUpload';
import { useLanguage } from '@/components/LanguageProvider';
import { analyzeImage, routeComplaint, hasVisionAI, hasLLM } from '@/lib/ai';
import { createComplaint, uploadComplaintImage } from '@/lib/db';
import {
  CATEGORIES,
  DEPARTMENTS,
  HYDERABAD_AREAS,
  PRIORITIES,
  complaintRef,
  nearestArea,
} from '@/lib/constants';

function Spinner({ className = '' }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

function SectionHeader({ number, title, hint }) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-[11px] font-black text-white shadow-sm">
        {number}
      </span>
      <div>
        <h2 className="text-sm font-extrabold text-emerald-950 sm:text-base">{title}</h2>
        {hint ? <p className="mt-0.5 text-[11px] leading-relaxed text-emerald-950/50">{hint}</p> : null}
      </div>
    </div>
  );
}

function ConfidenceBar({ confidence, warning }) {
  const pct = Math.round(Math.max(0, Math.min(1, Number(confidence) || 0)) * 100);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] font-bold">
        <span className={warning ? 'text-amber-700' : 'text-emerald-700'}>
          {warning ? '⚠️ Low confidence' : '✅ Confident'}
        </span>
        <span className={warning ? 'text-amber-700' : 'text-emerald-700'}>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-900/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            warning ? 'bg-amber-500' : 'bg-gradient-to-r from-emerald-500 to-lime-400'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ReportInner() {
  const { t, isUrdu } = useLanguage();
  const searchParams = useSearchParams();
  const queryType = searchParams.get('type');

  const [type, setType] = useState(CATEGORIES[queryType] ? queryType : 'WASTE');
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [ai, setAi] = useState(null);
  const [aiState, setAiState] = useState('idle');
  const [overrideInvalid, setOverrideInvalid] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');
  const [listening, setListening] = useState(false);
  const [speechLang, setSpeechLang] = useState('ur-PK');
  const [speechError, setSpeechError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const recognitionRef = useRef(null);
  const baseTranscript = useRef('');

  useEffect(() => {
    if (CATEGORIES[queryType] && queryType !== type) {
      setType(queryType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryType]);

  useEffect(() => {
    if (!file) {
      setAi(null);
      setAiState('idle');
      setOverrideInvalid(false);
      return undefined;
    }
    let cancelled = false;
    setAiState('checking');
    setAi(null);
    setOverrideInvalid(false);
    setError('');

    analyzeImage(file, type)
      .then((res) => {
        if (cancelled) return;
        setAi(res);
        setAiState('done');
      })
      .catch((err) => {
        if (cancelled) return;
        setAi({
          valid: false,
          confidence: 0,
          label: 'unreadable',
          message: err.message || t('report.aiInvalid'),
          warning: true,
        });
        setAiState('done');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, type]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const startListening = useCallback(() => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setSpeechError(t('report.micUnsupported'));
      return;
    }
    setSpeechError('');
    baseTranscript.current = description.trim();

    const recognition = new SR();
    recognition.lang = speechLang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += `${transcript} `;
        else interimText += transcript;
      }
      if (finalText) baseTranscript.current = `${baseTranscript.current} ${finalText}`.trim();
      setDescription(`${baseTranscript.current} ${interimText}`.trim());
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechError(t('report.micDenied'));
      } else if (event.error !== 'aborted') {
        setSpeechError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => setListening(false);

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      setListening(false);
      setSpeechError(t('report.micUnsupported'));
    }
  }, [description, speechLang, t]);

  const stopListening = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    setListening(false);
  }, []);

  const detectLocation = () => {
    setLocError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocError('Geolocation is not available. Please choose your area below.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const near = nearestArea(lat, lng);
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { Accept: 'application/json' } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data?.display_name) address = data.display_name.split(',').slice(0, 4).join(', ');
          }
        } catch {
          /* offline is fine */
        }
        setLocation({ lat, lng, address, area: near?.name || 'Hyderabad' });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError(
          err?.code === 1
            ? 'Location permission denied. Please choose your area below.'
            : 'Could not detect location. Please choose your area below.'
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  const pickArea = (name) => {
    const area = HYDERABAD_AREAS.find((a) => a.name === name);
    if (!area) return;
    setLocError('');
    setLocation({ lat: area.lat, lng: area.lng, address: area.name, area: area.name, manual: true });
  };

  const confidencePct = ai ? Math.round((Number(ai.confidence) || 0) * 100) : 0;
  const aiBlocking = aiState === 'checking' || (aiState === 'done' && ai && ai.valid === false && !overrideInvalid);
  const canSubmit = Boolean(file) && Boolean(description.trim()) && Boolean(location) && !submitting && !aiBlocking;

  const submit = async () => {
    setError('');
    if (!file) return setError(t('report.photoRequired'));
    if (!description.trim()) return setError(t('report.textRequired'));
    if (!location) return setError(t('report.locationRequired'));
    if (ai && ai.valid === false && !overrideInvalid) return setError(t('report.aiInvalid'));

    const category = ai?.valid && ai?.detectedCategory ? ai.detectedCategory : type;

    setSubmitting(true);
    setSubmitStage('analyzing');
    try {
      const routing = await routeComplaint(description, {
        area: location.area || location.address,
        expectedCategory: category,
      });

      setSubmitStage('uploading');
      const { url, storage } = await uploadComplaintImage(file, `hs-${Date.now()}`);

      setSubmitStage('saving');
      const payload = {
        category: routing.category,
        department: routing.department,
        priority: routing.priority,
        title: routing.title,
        description: description.trim(),
        translation: routing.translation,
        formalComplaint: routing.formalComplaint,
        language: routing.language,
        area: location.area || 'Hyderabad',
        location: { lat: location.lat, lng: location.lng, address: location.address },
        imageUrl: url,
        imageStorage: storage,
        aiLabel: ai?.label || 'unverified',
        aiConfidence: Number(ai?.confidence) || 0,
        aiSimulated: Boolean(ai?.simulated),
        aiSource: ai?.source || 'none',
        reporter: 'Citizen Report',
        status: 'Pending',
      };

      const saved = await createComplaint(payload);
      setResult({ ...payload, id: saved.id, mode: saved.mode, routing });
    } catch (err) {
      setError(err.message || t('report.error'));
    } finally {
      setSubmitting(false);
      setSubmitStage('');
    }
  };

  const startNew = () => {
    setResult(null);
    setFile(null);
    setDescription('');
    setLocation(null);
    setAi(null);
    setAiState('idle');
    setOverrideInvalid(false);
    setError('');
    setSpeechError('');
    setLocError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ---------------- SUCCESS ---------------- */
  if (result) {
    const cat = CATEGORIES[result.category] || CATEGORIES.WASTE;
    const dept = DEPARTMENTS[result.department] || DEPARTMENTS.HMC;
    const priority = PRIORITIES[result.priority] || PRIORITIES.Medium;

    return (
      <div className="container-page max-w-3xl py-10 sm:py-14">
        <div className="card animate-popIn overflow-hidden">
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900 px-6 py-10 text-center">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 animate-blob rounded-full bg-lime-300/20 blur-2xl" />
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-4xl ring-1 ring-white/30">
              ✅
            </div>
            <h1 className="mt-4 text-2xl font-black text-white sm:text-3xl">{t('report.successTitle')}</h1>
            <p className="mt-1 text-xs text-emerald-100/75 sm:text-sm">{t('report.successDesc')}</p>
            <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/20">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100/60">
                {t('report.reference')}
              </span>
              <span className="text-sm font-black tracking-wider text-white">{complaintRef(result.id)}</span>
            </div>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-900/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">
                {t('common.category')}
              </p>
              <p className="mt-1 text-sm font-extrabold text-emerald-950">
                {cat.icon} {cat.en.split(' / ')[0]}
              </p>
            </div>
            <div className="rounded-2xl bg-blue-50 p-3 ring-1 ring-blue-900/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-900/40">
                {t('dash.department')}
              </p>
              <p className="mt-1 text-sm font-extrabold text-blue-950">{dept.name}</p>
              <p className="text-[10px] text-blue-900/50">{dept.full}</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-900/5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-900/40">
                {t('common.priority')}
              </p>
              <p className="mt-1 text-sm font-extrabold text-amber-950">{priority.en}</p>
              <p className="text-[10px] text-amber-900/50">AI assigned · {result.status}</p>
            </div>
          </div>

          <div className="px-5 pb-5">
            <div className="rounded-2xl bg-emerald-50/60 p-4 ring-1 ring-emerald-900/5">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">
                {t('report.formal')}
              </p>
              <p className="whitespace-pre-line text-xs leading-relaxed text-emerald-950/75">
                {result.formalComplaint}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-emerald-900/45">
                <span>🤖 {result.aiLabel} · {Math.round((Number(result.aiConfidence) || 0) * 100)}%</span>
                <span>🗣️ {result.language}</span>
                <span>🏛️ {dept.full}</span>
                <span>💾 {result.mode === 'firebase' ? 'Firebase' : 'Local realtime'}</span>
              </div>
            </div>

            {result.routing?.reason ? (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
                ⚙️ {result.routing.reason}
              </p>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href={`/dashboard?focus=${result.id}`} className="btn-primary flex-1 text-xs">
                {t('report.viewDashboard')} →
              </Link>
              <button type="button" onClick={startNew} className="btn-secondary flex-1 text-xs">
                {t('report.newReport')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- FORM ---------------- */
  return (
    <div className="container-page py-8 sm:py-12">
      <div className="mb-6 animate-fadeUp">
        <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800/60 hover:text-emerald-700">
          ← {t('report.back')}
        </Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-emerald-950 sm:text-4xl">
          {t('report.title')}
        </h1>
        <p className={`mt-1 text-sm text-emerald-950/55 ${isUrdu ? 'urdu text-base' : ''}`}>{t('report.sub')}</p>

        {(!hasVisionAI || !hasLLM) ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
            <span aria-hidden>⚡</span>
            {t('report.offlineAI')} — live Hugging Face & Gemini keys not detected. The full flow still works with
            built-in fallbacks.
            <span className="flex gap-1">
              <span className={`chip text-[9px] ${hasVisionAI ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                Vision {hasVisionAI ? 'live' : 'demo'}
              </span>
              <span className={`chip text-[9px] ${hasLLM ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                Gemini {hasLLM ? 'live' : 'local'}
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="space-y-4">
          {/* Type */}
          <section className="card animate-fadeUp p-4 sm:p-5" style={{ animationDelay: '40ms' }}>
            <SectionHeader number="1" title={t('report.type')} />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.values(CATEGORIES).map((cat) => {
                const active = type === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setType(cat.key)}
                    disabled={submitting}
                    className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-transparent bg-emerald-900/[.03] hover:border-emerald-200 hover:bg-emerald-50/60'
                    }`}
                  >
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="text-[11px] font-bold leading-tight text-emerald-950">
                      {isUrdu ? cat.ur : cat.en.split(' / ')[0]}
                    </span>
                    <span className={`text-[9px] text-emerald-900/40 ${isUrdu ? 'urdu leading-4' : ''}`}>
                      {isUrdu ? cat.en.split(' / ')[0] : cat.dept}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Photo + AI */}
          <section className="card animate-fadeUp p-4 sm:p-5" style={{ animationDelay: '90ms' }}>
            <SectionHeader number="2" title={t('report.photo')} hint={t('report.photoHint')} />
            <CameraUpload file={file} onFile={setFile} disabled={submitting} />

            {file ? (
              <div className="mt-3">
                {aiState === 'checking' ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-900/[.04] p-3 ring-1 ring-emerald-900/5">
                    <Spinner className="text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-900">{t('report.aiChecking')}</p>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-emerald-900/10">
                        <div className="h-full w-1/2 animate-pulse rounded-full bg-emerald-500" />
                      </div>
                    </div>
                    <span className="chip bg-emerald-100 text-[9px] text-emerald-700">Hugging Face</span>
                  </div>
                ) : null}

                {aiState === 'done' && ai?.valid ? (
                  <div
                    className={`animate-fadeIn rounded-2xl p-3.5 ring-1 ${
                      ai.warning ? 'bg-amber-50 ring-amber-200' : 'bg-emerald-50 ring-emerald-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl">{ai.warning ? '⚠️' : '🤖'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-xs font-extrabold ${ai.warning ? 'text-amber-900' : 'text-emerald-900'}`}>
                            {ai.message} · {confidencePct}% {t('report.confidence')}
                          </p>
                          {ai.simulated ? (
                            <span className="chip bg-amber-100 text-[9px] text-amber-700 ring-1 ring-amber-200">
                              Demo AI
                            </span>
                          ) : (
                            <span className="chip bg-white/70 text-[9px] text-emerald-700 ring-1 ring-emerald-200">
                              Vision live
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-emerald-900/50">
                          Label: <span className="font-semibold">{ai.label}</span>
                          {ai.expectedMatched
                            ? ` · ${t('report.aiMatch')}`
                            : ` · AI suggests ${CATEGORIES[ai.detectedCategory]?.en}`}
                        </p>
                        <ConfidenceBar confidence={ai.confidence} warning={ai.warning} />
                        {ai.warning ? (
                          <p className="mt-1.5 text-[10px] font-semibold text-amber-700">{t('report.aiLow')}</p>
                        ) : null}
                        {!ai.expectedMatched && ai.detectedCategory ? (
                          <button
                            type="button"
                            onClick={() => setType(ai.detectedCategory)}
                            className="mt-2 rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-emerald-800 ring-1 ring-emerald-200"
                          >
                            🔄 Switch to {CATEGORIES[ai.detectedCategory].en.split(' / ')[0]}
                          </button>
                        ) : null}
                        {ai.simulated && ai.reason ? (
                          <p className="mt-1.5 text-[9px] leading-relaxed text-amber-700/80">{ai.reason}</p>
                        ) : null}
                        {ai.raw?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ai.raw.map((r) => (
                              <span
                                key={r.label}
                                className="rounded-md bg-white/70 px-1.5 py-0.5 text-[9px] text-emerald-900/60 ring-1 ring-emerald-900/5"
                              >
                                {r.label} {Math.round(r.score * 100)}%
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {aiState === 'done' && ai && !ai.valid ? (
                  <div className="animate-fadeIn rounded-2xl bg-rose-50 p-3.5 ring-1 ring-rose-200">
                    <div className="flex items-start gap-2.5">
                      <span className="text-xl">🚫</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-rose-800">{t('report.aiInvalid')}</p>
                        <p className="mt-0.5 text-[10px] text-rose-700/70">
                          Detected: <span className="font-semibold">{ai.label}</span>
                          {ai.reason ? ` · ${ai.reason}` : ''}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200"
                          >
                            {t('report.tryAnother')}
                          </button>
                          {!overrideInvalid ? (
                            <button
                              type="button"
                              onClick={() => setOverrideInvalid(true)}
                              className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-[10px] font-bold text-white"
                            >
                              {t('report.useAnyway')}
                            </button>
                          ) : (
                            <span className="chip bg-rose-100 text-[9px] text-rose-700">
                              ⚠️ Manual review enabled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* Description */}
          <section className="card animate-fadeUp p-4 sm:p-5" style={{ animationDelay: '140ms' }}>
            <SectionHeader number="3" title={t('report.details')} hint={t('report.detailsHint')} />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={listening ? stopListening : startListening}
                disabled={submitting}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  listening
                    ? 'animate-pulse bg-rose-500 text-white shadow-soft'
                    : 'bg-emerald-600 text-white shadow-soft hover:bg-emerald-700'
                }`}
              >
                {listening ? <Spinner className="h-3.5 w-3.5" /> : <span aria-hidden>🎙️</span>}
                {listening ? t('report.listening') : t('report.speak')}
              </button>

              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value)}
                disabled={listening || submitting}
                className="rounded-xl bg-white px-2.5 py-2 text-[11px] font-semibold text-emerald-900 ring-1 ring-emerald-900/10 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label={t('report.speechLang')}
              >
                <option value="ur-PK">اردو (Urdu)</option>
                <option value="sd-PK">سنڌي (Sindhi)</option>
                <option value="en-US">English</option>
              </select>

              {listening ? (
                <span className="flex items-end gap-0.5" aria-hidden>
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="w-1 animate-pulse rounded-full bg-rose-500"
                      style={{ height: `${8 + (i % 3) * 6}px`, animationDelay: `${i * 120}ms` }}
                    />
                  ))}
                </span>
              ) : null}
            </div>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              maxLength={1200}
              disabled={submitting}
              placeholder={t('report.placeholder')}
              className={`input mt-3 ${isUrdu ? 'urdu text-sm leading-8' : ''}`}
            />
            <div className="mt-1 flex items-center justify-between text-[10px] text-emerald-900/35">
              <span>{t('report.note')}</span>
              <span>{description.length}/1200</span>
            </div>

            {speechError ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-700">
                🎙️ {speechError}
              </p>
            ) : null}
          </section>

          {/* Location */}
          <section className="card animate-fadeUp p-4 sm:p-5" style={{ animationDelay: '190ms' }}>
            <SectionHeader number="4" title={t('report.location')} hint={t('report.locationHint')} />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={detectLocation}
                disabled={locating || submitting}
                className="btn-primary px-4 py-2.5 text-xs"
              >
                {locating ? <Spinner className="h-3.5 w-3.5" /> : <span aria-hidden>📍</span>}
                {locating ? t('report.detecting') : t('report.detect')}
              </button>

              {location ? (
                <span className="chip bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200">
                  ✅ {location.area} · {Number(location.lat).toFixed(4)}, {Number(location.lng).toFixed(4)}
                </span>
              ) : null}
            </div>

            {location ? (
              <div className="mt-3 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-900/5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">
                  {t('report.detected')}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-emerald-950">
                  📍 {location.area}
                  {location.manual ? ' (selected)' : ''}
                </p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-emerald-900/50">{location.address}</p>
              </div>
            ) : null}

            <div className="mt-3">
              <label className="label text-xs" htmlFor="area-select">
                {t('report.selectArea')} <span className="font-normal text-emerald-900/40">({t('common.optional')})</span>
              </label>
              <select
                id="area-select"
                value={location?.manual ? location.area : ''}
                onChange={(e) => pickArea(e.target.value)}
                disabled={submitting}
                className="input py-3"
              >
                <option value="">{t('report.manualArea')}</option>
                {HYDERABAD_AREAS.map((area) => (
                  <option key={area.name} value={area.name}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            {locError ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[10px] font-medium text-amber-700">
                ⚠️ {locError}
              </p>
            ) : null}
          </section>

          {/* Submit */}
          <section className="card animate-fadeUp p-4 sm:p-5" style={{ animationDelay: '240ms' }}>
            {error ? (
              <p className="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                <span aria-hidden>⚠️</span> {error}
              </p>
            ) : null}

            <button type="button" onClick={submit} disabled={!canSubmit} className="btn-primary w-full py-4 text-sm">
              {submitting ? (
                <>
                  <Spinner />
                  {submitStage === 'analyzing'
                    ? t('report.analyzing')
                    : submitStage === 'uploading'
                    ? t('report.uploading')
                    : t('report.saving')}
                </>
              ) : (
                <>🚀 {t('report.submit')}</>
              )}
            </button>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[10px] text-emerald-900/40">
              <span>🤖 Vision + Gemini in one tap</span>
              <span>·</span>
              <span>🔒 No login</span>
              <span>·</span>
              <span>📱 Works on 3G</span>
            </div>
            {!canSubmit && !submitting ? (
              <p className="mt-2 text-center text-[10px] font-medium text-emerald-900/35">
                {!file
                  ? t('report.photoRequired')
                  : aiState === 'checking'
                  ? t('report.aiChecking')
                  : ai && ai.valid === false && !overrideInvalid
                  ? `${t('report.aiInvalid')} (${t('report.useAnyway')})`
                  : !description.trim()
                  ? t('report.textRequired')
                  : !location
                  ? t('report.locationRequired')
                  : ''}
              </p>
            ) : null}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <div className="card animate-fadeUp overflow-hidden" style={{ animationDelay: '120ms' }}>
            <div className="border-b border-emerald-900/5 bg-gradient-to-br from-emerald-50 to-white px-4 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">Live AI pipeline</p>
              <p className="mt-0.5 text-xs font-extrabold text-emerald-950">What happens when you submit</p>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
                    aiState === 'done' && ai?.valid
                      ? 'bg-emerald-100 text-emerald-700'
                      : aiState === 'checking'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-900/5 text-emerald-900/40'
                  }`}
                >
                  {aiState === 'checking' ? <Spinner className="h-3 w-3" /> : '👁️'}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-950">Vision check · Hugging Face</p>
                  <p className="text-[10px] leading-relaxed text-emerald-950/45">
                    {aiState === 'checking'
                      ? 'Checking your photo…'
                      : aiState === 'done' && ai?.valid
                      ? `${ai.label} · ${confidencePct}% confidence`
                      : aiState === 'done'
                      ? 'Image not recognised yet'
                      : 'google/vit-base-patch16-224 ready'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${
                    submitting && submitStage === 'analyzing'
                      ? 'bg-amber-100 text-amber-700'
                      : result
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-emerald-900/5 text-emerald-900/40'
                  }`}
                >
                  {submitting && submitStage === 'analyzing' ? <Spinner className="h-3 w-3" /> : '🧠'}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-950">Gemini routing</p>
                  <p className="text-[10px] leading-relaxed text-emerald-950/45">
                    Translate · classify · assign priority · write formal complaint
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-900/5 text-xs text-emerald-900/40">
                  📊
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-emerald-950">Realtime dashboard</p>
                  <p className="text-[10px] leading-relaxed text-emerald-950/45">
                    Complaint appears instantly with map marker & status
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-emerald-900/5 bg-emerald-50/50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">
                Complaints go to
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg ring-1 ring-emerald-900/5">
                  {CATEGORIES[type]?.icon}
                </span>
                <div>
                  <p className="text-xs font-extrabold text-emerald-950">
                    {DEPARTMENTS[CATEGORIES[type]?.dept]?.name}
                  </p>
                  <p className="text-[9px] text-emerald-900/45">{DEPARTMENTS[CATEGORIES[type]?.dept]?.full}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card animate-fadeUp p-4" style={{ animationDelay: '180ms' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-900/40">Tips for a fast fix</p>
            <ul className="mt-2 space-y-2 text-[11px] leading-relaxed text-emerald-950/55">
              <li className="flex gap-2"><span>📸</span> Keep the issue clearly visible in the photo.</li>
              <li className="flex gap-2"><span>📍</span> Detect GPS so the crew finds the exact spot.</li>
              <li className="flex gap-2"><span>🗣️</span> Speak in Urdu or Sindhi — AI translates it for the office.</li>
              <li className="flex gap-2"><span>⚠️</span> Mention children, schools or accidents for higher priority.</li>
            </ul>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-emerald-800 to-teal-950 p-4 text-white shadow-soft">
            <p className={`text-[11px] leading-7 text-emerald-100/80 ${isUrdu ? 'urdu' : ''}`}>
              {t('landing.urduTagline')}
            </p>
            <p className="mt-2 text-[10px] text-emerald-100/50">
              Hyderabad Municipal Corporation · WASA · HESCO
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16">
          <div className="mx-auto max-w-md text-center">
            <div className="skeleton mx-auto h-12 w-12 rounded-2xl" />
            <div className="skeleton mx-auto mt-4 h-4 w-48 rounded" />
            <div className="skeleton mx-auto mt-2 h-3 w-64 rounded" />
          </div>
        </div>
      }
    >
      <ReportInner />
    </Suspense>
  );
}
