export const HYDERABAD_CENTER = { lat: 25.396, lng: 68.3578 };

export const CATEGORIES = {
  WASTE: {
    key: 'WASTE',
    en: 'Garbage / Waste',
    ur: 'کچرا',
    icon: '🗑️',
    color: '#10b981',
    dept: 'HMC',
    reportLabel: 'Report Garbage',
  },
  ROAD: {
    key: 'ROAD',
    en: 'Road / Pothole',
    ur: 'سڑک / گڑھا',
    icon: '🕳️',
    color: '#f59e0b',
    dept: 'HMC',
    reportLabel: 'Report Pothole',
  },
  WATER: {
    key: 'WATER',
    en: 'Water / Sewerage',
    ur: 'پانی / گٹر',
    icon: '💧',
    color: '#3b82f6',
    dept: 'WASA',
    reportLabel: 'Report Water Issue',
  },
  LIGHT: {
    key: 'LIGHT',
    en: 'Streetlight',
    ur: 'اسٹریٹ لائٹ',
    icon: '💡',
    color: '#8b5cf6',
    dept: 'HESCO',
    reportLabel: 'Report Streetlight',
  },
};

export const DEPARTMENTS = {
  HMC: { name: 'HMC', full: 'Hyderabad Municipal Corporation' },
  WASA: { name: 'WASA', full: 'Water & Sanitation Agency' },
  HESCO: { name: 'HESCO', full: 'Hyderabad Electric Supply Company' },
};

export const STATUSES = {
  Pending: {
    key: 'Pending',
    en: 'Pending',
    ur: 'زیرِ التوا',
    color: '#f59e0b',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    ring: 'ring-amber-200',
    dot: 'bg-amber-500',
  },
  'In-Progress': {
    key: 'In-Progress',
    en: 'In Progress',
    ur: 'کام جاری ہے',
    color: '#3b82f6',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    ring: 'ring-blue-200',
    dot: 'bg-blue-500',
  },
  Resolved: {
    key: 'Resolved',
    en: 'Resolved',
    ur: 'حل ہوگیا',
    color: '#10b981',
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    ring: 'ring-emerald-200',
    dot: 'bg-emerald-500',
  },
};

export const PRIORITIES = {
  Low: { en: 'Low', ur: 'کم', bg: 'bg-slate-100', text: 'text-slate-700' },
  Medium: { en: 'Medium', ur: 'درمیانہ', bg: 'bg-amber-100', text: 'text-amber-800' },
  High: { en: 'High', ur: 'زیادہ', bg: 'bg-rose-100', text: 'text-rose-700' },
};

export const HYDERABAD_AREAS = [
  { name: 'Latifabad Unit 3', lat: 25.3789, lng: 68.3352 },
  { name: 'Qasimabad', lat: 25.4014, lng: 68.3512 },
  { name: 'Autobahn Road', lat: 25.3987, lng: 68.3735 },
  { name: 'Citizen Colony', lat: 25.3892, lng: 68.3398 },
  { name: 'Hali Road', lat: 25.3861, lng: 68.3662 },
  { name: 'Latifabad Unit 7', lat: 25.3714, lng: 68.3305 },
  { name: 'Saddar', lat: 25.3946, lng: 68.3592 },
  { name: 'Gulistan-e-Sajjad', lat: 25.4102, lng: 68.3441 },
];

export function nearestArea(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  let best = null;
  let bestDist = Infinity;
  for (const area of HYDERABAD_AREAS) {
    const d = (area.lat - lat) ** 2 + (area.lng - lng) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = area;
    }
  }
  return best;
}

export function formatDate(value, lang = 'en') {
  try {
    const d = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(lang === 'ur' ? 'ur-PK' : 'en-PK', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function timeAgo(value) {
  try {
    const d = value?.toDate ? value.toDate() : new Date(value);
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  } catch {
    return '';
  }
}

export function complaintRef(id) {
  const clean = String(id || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(-7)
    .toUpperCase();
  return `HS-${clean || '000000'}`;
}
