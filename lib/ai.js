/**
 * Hyderabad Saaf AI - AI engine
 *
 * 1. Vision  : Hugging Face Inference API (google/vit-base-patch16-224)
 *              Called directly from the browser with a citizen's photo.
 * 2. Routing : Google Gemini REST API (no SDK) -> structured JSON routing.
 *
 * Every call has a safe offline fallback so the main flow never crashes,
 * but the live AI path is used whenever a token is configured.
 */

import { CATEGORIES, HYDERABAD_AREAS, nearestArea } from './constants';
import { readAsDataUrl } from './image';

const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN;
const GEMINI_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY;
const VISION_MODEL = process.env.NEXT_PUBLIC_HF_VISION_MODEL || 'google/vit-base-patch16-224';
const GEMINI_MODEL = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.0-flash';

const isRealKey = (key, prefix) =>
  Boolean(key && key.length > 15 && !/x{6,}/i.test(key) && key.startsWith(prefix));

export const hasVisionAI = isRealKey(HF_TOKEN, 'hf_');
export const hasLLM = isRealKey(GEMINI_KEY, 'AIza');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* Label mapping: ImageNet classes -> municipal issue buckets          */
/* ------------------------------------------------------------------ */

const LABEL_BUCKETS = {
  WASTE: [
    'garbage',
    'trash',
    'ashcan',
    'ash bin',
    'ashbin',
    'wastebin',
    'dustbin',
    'rubbish',
    'litter',
    'refuse',
    'dump',
    'landfill',
    'plastic bag',
    'carton',
    'barrel',
    'bucket',
    'crate',
    'bottle',
    'paper towel',
    'toilet tissue',
    'broom',
    'mop',
    'shovel',
    'wheelbarrow',
    'compost',
    'packet',
    'envelope',
    'sack',
    'plastic',
  ],
  ROAD: [
    'pothole',
    'asphalt',
    'road',
    'street',
    'pavement',
    'sidewalk',
    'gravel',
    'cobblestone',
    'manhole',
    'crash barrier',
    'dirt track',
    'stone wall',
    'rubble',
    'construction',
    'excavator',
    'plow',
    'paving',
    'curb',
    'highway',
    'bridge',
    'pier',
    'trench',
  ],
  WATER: [
    'water',
    'fountain',
    'hose',
    'pipe',
    'tap',
    'faucet',
    'sink',
    'toilet',
    'sewer',
    'drain',
    'well',
    'dam',
    'geyser',
    'spout',
    'puddle',
    'flood',
    'reservoir',
    'water jug',
    'water tower',
  ],
  LIGHT: [
    'streetlight',
    'street light',
    'street sign',
    'traffic light',
    'lamp',
    'lantern',
    'spotlight',
    'light',
    'flare',
    'pole',
    'flagpole',
    'obelisk',
    'monument',
    'tower',
    'thatch',
  ],
};

const ZERO_SHOT_LABELS = {
  'garbage pile': 'WASTE',
  'trash dump': 'WASTE',
  pothole: 'ROAD',
  'damaged road': 'ROAD',
  'broken streetlight': 'LIGHT',
  'water leak': 'WATER',
};

function normalizeResults(data) {
  let rows = data;
  if (Array.isArray(rows) && Array.isArray(rows[0])) rows = rows[0];
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((r) => r && typeof r.label === 'string')
    .map((r) => ({ label: r.label, score: Number(r.score) || 0 }))
    .sort((a, b) => b.score - a.score);
}

function classifyLabels(results, expected) {
  const buckets = {};

  for (const row of results) {
    const label = row.label.toLowerCase();
    for (const [bucket, keywords] of Object.entries(LABEL_BUCKETS)) {
      if (keywords.some((keyword) => label.includes(keyword))) {
        if (!buckets[bucket]) buckets[bucket] = { score: 0, label: row.label, top: 0 };
        buckets[bucket].score = Math.min(0.99, buckets[bucket].score + row.score);
        if (row.score > buckets[bucket].top) {
          buckets[bucket].top = row.score;
          buckets[bucket].label = row.label;
        }
      }
    }
  }

  const entries = Object.entries(buckets);
  if (!entries.length) {
    return {
      bestBucket: null,
      confidence: results[0]?.score || 0,
      label: results[0]?.label || 'Unknown',
      topLabel: results[0]?.label || 'Unknown',
      topScore: results[0]?.score || 0,
      buckets,
    };
  }

  // Give the report-type selected by the citizen a modest nudge.
  const ranked = entries
    .map(([bucket, info]) => ({
      bucket,
      info,
      adjusted: Math.min(0.99, info.score) + (bucket === expected ? 0.18 : 0),
    }))
    .sort((a, b) => b.adjusted - a.adjusted);

  const winner = ranked[0];
  return {
    bestBucket: winner.bucket,
    confidence: Math.min(0.99, Math.max(winner.info.top, winner.info.score * 0.9)),
    label: winner.info.label,
    topLabel: results[0].label,
    topScore: results[0].score,
    buckets,
  };
}

/* ------------------------------------------------------------------ */
/* Hugging Face vision call                                            */
/* ------------------------------------------------------------------ */

async function hfClassify(file) {
  const headers = {
    Authorization: `Bearer ${HF_TOKEN}`,
    'Content-Type': file.type || 'application/octet-stream',
  };
  const endpoints = [
    `https://router.huggingface.co/hf-inference/models/${VISION_MODEL}`,
    `https://api-inference.huggingface.co/models/${VISION_MODEL}`,
  ];

  let lastError = 'Vision model unavailable';

  for (const endpoint of endpoints) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers,
          body: file,
          signal: controller.signal,
        });
        const text = await res.text();

        let payload = null;
        try {
          payload = text ? JSON.parse(text) : null;
        } catch {
          payload = null;
        }

        if (res.ok && Array.isArray(payload)) {
          return normalizeResults(payload);
        }

        if (res.ok && Array.isArray(payload?.[0])) {
          return normalizeResults(payload);
        }

        if (res.status === 503) {
          const eta = Number(payload?.estimated_time) || 4;
          lastError = 'Model is warming up';
          clearTimeout(timer);
          await sleep(Math.min(12000, Math.max(1500, eta * 1000)));
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          throw new Error('Hugging Face token is invalid or lacks inference permission');
        }

        lastError = payload?.error || `Hugging Face returned ${res.status}`;
      } catch (err) {
        if (err.name === 'AbortError') lastError = 'Vision request timed out';
        else if (err.message?.includes('token')) throw err;
        else lastError = err.message || 'Vision request failed';
      } finally {
        clearTimeout(timer);
      }
    }
  }

  throw new Error(lastError);
}

async function zeroShotClassify(file) {
  try {
    const dataUrl = await readAsDataUrl(file);
    const base64 = dataUrl.split(',')[1];
    const labels = Object.keys(ZERO_SHOT_LABELS);
    const res = await fetch(`https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: base64, parameters: { candidate_labels: labels } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    let rows = [];
    if (Array.isArray(data)) rows = data.map((d) => ({ label: d.label, score: d.score }));
    else if (Array.isArray(data.labels)) {
      rows = data.labels.map((label, i) => ({ label, score: data.scores?.[i] || 0 }));
    }
    rows = rows.filter((r) => r.score > 0.42).sort((a, b) => b.score - a.score);
    if (!rows.length) return null;
    const top = rows[0];
    const bucket = ZERO_SHOT_LABELS[top.label];
    if (!bucket) return null;
    return {
      bestBucket: bucket,
      confidence: Math.min(0.97, top.score),
      label: top.label,
      topLabel: top.label,
      topScore: top.score,
      buckets: { [bucket]: { score: top.score, label: top.label, top: top.score } },
    };
  } catch {
    return null;
  }
}

function demoResult(expected, reason) {
  const category = CATEGORIES[expected] ? expected : 'WASTE';
  const demoLabels = {
    WASTE: 'garbage pile',
    ROAD: 'pothole / damaged road',
    WATER: 'water leak / sewage',
    LIGHT: 'streetlight / lamp post',
  };
  const confidence = 0.86 + Math.random() * 0.09;
  return {
    valid: true,
    simulated: true,
    detectedCategory: category,
    label: demoLabels[category],
    confidence,
    warning: false,
    expectedMatched: true,
    source: 'demo',
    message: `${CATEGORIES[category].en} detected`,
    reason: reason || 'Add NEXT_PUBLIC_HF_TOKEN for live Hugging Face detection',
    raw: [],
  };
}

/**
 * Analyze a citizen photo with the Hugging Face vision model.
 * @param {File} file
 * @param {'WASTE'|'ROAD'|'WATER'|'LIGHT'} expectedCategory
 */
export async function analyzeImage(file, expectedCategory) {
  if (!file) throw new Error('No image provided');
  const expected = CATEGORIES[expectedCategory] ? expectedCategory : null;

  if (!hasVisionAI) {
    return demoResult(expected, 'Demo vision result — add NEXT_PUBLIC_HF_TOKEN to run google/vit-base-patch16-224 live.');
  }

  try {
    const results = await hfClassify(file);
    if (!results.length) throw new Error('No labels returned by the vision model');

    let detection = classifyLabels(results, expected);

    if (!detection.bestBucket) {
      const zeroShot = await zeroShotClassify(file);
      if (zeroShot) detection = zeroShot;
    }

    if (!detection.bestBucket) {
      return {
        valid: false,
        simulated: false,
        detectedCategory: null,
        label: detection.topLabel,
        confidence: detection.topScore,
        warning: true,
        expectedMatched: false,
        source: 'huggingface',
        message:
          'Invalid image, please upload a municipal issue (garbage, pothole, water leak or streetlight).',
        raw: results.slice(0, 5),
      };
    }

    return {
      valid: true,
      simulated: false,
      detectedCategory: detection.bestBucket,
      label: detection.label,
      confidence: detection.confidence,
      warning: detection.confidence < 0.7,
      expectedMatched: !expected || detection.bestBucket === expected,
      source: detection.bestBucket === expected ? 'huggingface' : 'huggingface',
      message: `${CATEGORIES[detection.bestBucket].en} detected`,
      raw: results.slice(0, 5),
    };
  } catch (err) {
    console.warn('[ai] vision failed, using demo fallback:', err.message);
    return demoResult(expected, `Live vision failed (${err.message}). Showing demo result.`);
  }
}

/* ------------------------------------------------------------------ */
/* Gemini complaint routing                                            */
/* ------------------------------------------------------------------ */

const DEPT_BY_CATEGORY = {
  WASTE: 'HMC',
  ROAD: 'HMC',
  WATER: 'WASA',
  LIGHT: 'HESCO',
};

const DEPT_FULL = {
  HMC: 'Hyderabad Municipal Corporation',
  WASA: 'Water & Sanitation Agency',
  LIGHT: 'Hyderabad Electric Supply Company',
  HESCO: 'Hyderabad Electric Supply Company',
};

const CATEGORY_PATTERNS = {
  WASTE:
    /(garbage|trash|rubbish|litter|waste|kachra|kachro|koora|kura|safai|clean|صفائي|ڪچرو|کچرا|کوڑا|گندگی|ڳند|بدبو|بدبويي|boo)/i,
  ROAD:
    /(pothole|road|street|sarak|saddak|sadak|khadda|gaddha|gadha|grader|manhole|سڑک|گڑھا|گڈھا|رستو|روڊ|سڙڪ|تارمک|tarmak)/i,
  WATER:
    /(water|sewer|sewage|drain|leak|pipe|pani|paani|gutter|nali|nala|پانی|پاڻي|گٹر|گٽر|نالی|ناڻي|پائپ|بوء|بدبو)/i,
  LIGHT:
    /(light|streetlight|street light|electric|bijli|batti|battee|bulb|lamp|بجلی|بجلي|بتی|بٽي|لائٹ|لائيٽ|روشنی|روشني|چراغ)/i,
};

const HIGH_RISK =
  /(urgent|emergency|danger|dangerous|accident|injur|health|disease|children|school|hospital|fatal|overflow|blocked|فوری|خطرناک|خطرناڪ|حادثہ|حادثو|بچے|بچا|اسپتال|ہسپتال|بیماری|صحتح|فوراً|فورن)/i;
const LOW_RISK = /(minor|small|little|slight|تھوڑا|تھوڙو|ننڍو|معمولی)/i;

function localRoute(text, { area, expectedCategory } = {}) {
  const value = String(text || '').trim();
  const scores = {};
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    const matches = value.match(new RegExp(pattern.source, 'gi'));
    scores[category] = matches ? matches.length : 0;
  }

  let category =
    Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
      ? Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0]
      : expectedCategory || 'WASTE';

  if (scores[expectedCategory] > 0 && scores[category] === scores[expectedCategory]) {
    category = expectedCategory;
  }

  let priority = 'Medium';
  if (HIGH_RISK.test(value)) priority = 'High';
  else if (LOW_RISK.test(value)) priority = 'Low';

  const department = DEPT_BY_CATEGORY[category];
  const cat = CATEGORIES[category];
  const place = area || 'Hyderabad';
  const english = value || `${cat.en} issue`;
  const formalComplaint =
    `Respected Sir/Madam,\n\n` +
    `${english}\n\n` +
    `The reported issue is located at ${place}, Hyderabad, Sindh, and falls under the jurisdiction of the ${DEPT_FULL[department]}. ` +
    `${
      priority === 'High'
        ? 'The matter poses an immediate risk to public health and safety and requires urgent attention.'
        : 'Kindly inspect the site and take the necessary corrective action at the earliest.'
    }\n\nThank you.`;

  return {
    category,
    department,
    priority,
    title: `${cat.en} complaint — ${place}`,
    translation: english,
    formalComplaint,
    language: /[\u0600-\u06FF]/.test(value) ? 'Urdu / Sindhi' : 'English',
    source: 'local',
  };
}

function cleanJson(text) {
  if (!text) return null;
  let cleaned = String(text).trim();
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function geminiRoute(text, { area, expectedCategory }) {
  const prompt = `You are the AI routing engine for "Hyderabad Saaf AI", a municipal complaint system for Hyderabad, Sindh, Pakistan.
Analyze the citizen complaint below. It may be in English, Urdu (script or Roman), or Sindhi.

Rules:
- category: exactly one of WASTE, ROAD, WATER, LIGHT
- department mapping: WASTE -> HMC, ROAD -> HMC, WATER -> WASA, LIGHT -> HESCO
- priority: Low, Medium or High. Use High for public safety/health hazards, accidents, blocked roads, overflowing sewage, children or hospitals nearby.
- title: a clear English title, maximum 12 words.
- translation: a faithful English translation of the complaint (if it is already English, return it as is).
- formalComplaint: a formal English complaint for municipal office use. Start with "Respected Sir/Madam," and end with a thank-you. 3 to 5 sentences. Mention the location.
- language: detected language name, one of English, Urdu, Sindhi, Roman Urdu.

Citizen selected report type (hint only): ${expectedCategory || 'not specified'}
Location / area: ${area || 'Hyderabad, Sindh'}

Return ONLY a valid JSON object with exactly these keys:
{"category":"","department":"","priority":"","title":"","translation":"","formalComplaint":"","language":""}

Complaint:
"""${text}"""`;

  const models = [GEMINI_MODEL, 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'].filter(
    (m, i, arr) => m && arr.indexOf(m) === i
  );

  let lastError = 'Gemini request failed';

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 1024,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        lastError = payload?.error?.message || `Gemini returned ${res.status}`;
        if (res.status === 404 || res.status === 400) continue;
        break;
      }

      const rawText = payload?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
      const parsed = cleanJson(rawText);
      if (!parsed) {
        lastError = 'Gemini returned an unreadable response';
        continue;
      }

      const category = String(parsed.category || '')
        .toUpperCase()
        .trim();
      const safeCategory = CATEGORIES[category] ? category : expectedCategory || 'WASTE';
      const department = DEPT_BY_CATEGORY[safeCategory];
      const priorityRaw = String(parsed.priority || '').toLowerCase();
      const priority = ['low', 'medium', 'high'].includes(priorityRaw)
        ? priorityRaw[0].toUpperCase() + priorityRaw.slice(1)
        : 'Medium';

      return {
        category: safeCategory,
        department,
        priority: priority === 'Low' || priority === 'Medium' || priority === 'High' ? priority : 'Medium',
        title:
          String(parsed.title || '').trim().slice(0, 120) ||
          `${CATEGORIES[safeCategory].en} complaint — ${area || 'Hyderabad'}`,
        translation: String(parsed.translation || '').trim() || text,
        formalComplaint:
          String(parsed.formalComplaint || '').trim() ||
          localRoute(text, { area, expectedCategory }).formalComplaint,
        language: String(parsed.language || '').trim() || 'English',
        source: 'gemini',
        model,
      };
    } catch (err) {
      lastError = err.name === 'AbortError' ? 'Gemini request timed out' : err.message;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new Error(lastError);
}

/**
 * Route a complaint with Gemini, falling back to a fully local classifier.
 * @param {string} text
 * @param {{area?: string, expectedCategory?: string}} options
 */
export async function routeComplaint(text, options = {}) {
  const value = String(text || '').trim();
  if (!value) throw new Error('Complaint text is required');

  if (!hasLLM) {
    const result = localRoute(value, options);
    return {
      ...result,
      reason: 'Add NEXT_PUBLIC_GEMINI_KEY for live Gemini routing. Using local rule-based router.',
    };
  }

  try {
    return await geminiRoute(value, options);
  } catch (err) {
    console.warn('[ai] Gemini routing failed, using local router:', err.message);
    const result = localRoute(value, options);
    return { ...result, reason: `Gemini unavailable (${err.message}). Used local router.` };
  }
}

export { nearestArea, HYDERABAD_AREAS };
