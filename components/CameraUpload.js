'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from './LanguageProvider';

const MAX_SIZE = 10 * 1024 * 1024;

export default function CameraUpload({ file, onFile, error, disabled }) {
  const { t, isUrdu } = useLanguage();
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = (picked) => {
    if (!picked) return;
    setLocalError('');
    if (!picked.type.startsWith('image/')) {
      setLocalError('Please choose an image file.');
      return;
    }
    if (picked.size > MAX_SIZE) {
      setLocalError(t('report.photoTooBig'));
      return;
    }
    onFile(picked);
  };

  const handleChange = (event) => {
    const picked = event.target.files?.[0];
    accept(picked);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    accept(event.dataTransfer.files?.[0]);
  };

  const shownError = error || localError;

  return (
    <div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />

      {preview ? (
        <div className="group relative overflow-hidden rounded-2xl ring-1 ring-emerald-900/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected civic issue" className="h-64 w-full object-cover sm:h-80" />
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/75 via-emerald-950/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="chip bg-white/90 text-emerald-900 ring-1 ring-white/60">
              📎 {file?.name?.slice(0, 26) || 'photo.jpg'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="rounded-xl bg-white/90 px-3 py-2 text-xs font-bold text-emerald-900 shadow transition hover:bg-white"
                disabled={disabled}
              >
                📷 {t('report.retake')}
              </button>
              <button
                type="button"
                onClick={() => onFile(null)}
                className="rounded-xl bg-rose-500/90 px-3 py-2 text-xs font-bold text-white shadow transition hover:bg-rose-600"
                disabled={disabled}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-emerald-900/15 bg-emerald-50/40 hover:border-emerald-400 hover:bg-emerald-50/70'
          }`}
        >
          <div className="flex h-16 w-16 animate-floaty items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-3xl shadow-soft">
            📸
          </div>
          <p className={`mt-4 text-sm font-bold text-emerald-950 ${isUrdu ? 'urdu' : ''}`}>
            {t('report.photo')}
          </p>
          <p className={`mt-1 max-w-xs text-xs text-emerald-950/55 ${isUrdu ? 'urdu text-sm leading-7' : ''}`}>
            {t('report.photoHint')}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              disabled={disabled}
              className="btn-primary px-4 py-2.5 text-xs"
            >
              📷 {t('report.takePhoto')}
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              disabled={disabled}
              className="btn-secondary px-4 py-2.5 text-xs"
            >
              🖼️ {t('report.uploadPhoto')}
            </button>
          </div>
          <p className="mt-3 text-[10px] text-emerald-950/40">JPG, PNG, WEBP · max 10 MB · drag & drop supported</p>
        </div>
      )}

      {shownError ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-600">
          <span aria-hidden>⚠️</span> {shownError}
        </p>
      ) : null}
    </div>
  );
}
