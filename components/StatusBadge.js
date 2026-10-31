'use client';

import { STATUSES } from '@/lib/constants';
import { useLanguage } from './LanguageProvider';

export default function StatusBadge({ status, className = '' }) {
  const { isUrdu } = useLanguage();
  const s = STATUSES[status] || STATUSES.Pending;

  return (
    <span className={`chip ring-1 ${s.bg} ${s.text} ${s.ring} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} aria-hidden />
      {isUrdu ? s.ur : s.en}
    </span>
  );
}
