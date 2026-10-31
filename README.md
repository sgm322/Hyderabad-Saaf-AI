# Hyderabad Saaf AI

AI-assisted municipal complaint reporting for Hyderabad, Sindh. Citizens photograph a civic issue, the app verifies the photo, routes it to the right department, drafts a formal complaint, and plots it on a live map for city staff.

Built for the Denning Hackathon. Next.js 14 (App Router) + Tailwind CSS + Leaflet + Firebase.

## Why it matters

Complaint channels in Hyderabad are fragmented: garbage goes to HMC, water to WASA, streetlights to HESCO, and citizens rarely know which is which or how to phrase a report. Hyderabad Saaf AI removes that friction:

- **Photo verification** - a vision model checks that the uploaded image actually shows a civic issue.
- **Automatic routing** - the issue is assigned to the correct department with a priority.
- **Formal complaint drafting** - a language model writes a submission-ready complaint (English, Urdu, or Sindhi).
- **Live accountability** - every report appears on a shared dashboard with status tracking.
- **Low-literacy friendly** - speech-to-text input, bilingual UI, and one-tap reporting.

## Features

- Photo capture/upload with client-side compression
- AI vision classification (Hugging Face Inference API)
- LLM routing + formal complaint generation (Google Gemini)
- Voice input (Web Speech API, `ur-PK` / `sd-PK` / `en-US`)
- GPS geolocation with reverse geocoding and Hyderabad area fallback
- Bilingual UI: English and Urdu (Noto Nastaliq Urdu)
- Realtime dashboard with status filters, category filters, sorting, and a Leaflet map
- Status workflow: Pending -> In Progress -> Resolved
- Five seeded demo complaints so the dashboard is never empty
- Graceful degradation: works fully without any API keys or Firebase project

## Demo mode

The app is designed to be demo-safe. Without keys it still completes the whole flow:

| Capability | With keys | Without keys |
| --- | --- | --- |
| Photo check | Hugging Face vision | Deterministic demo classification |
| Routing + complaint text | Gemini | Built-in rule-based router and template |
| Realtime sync | Firestore | `localStorage` + `BroadcastChannel` (same browser) |

UI badges ("Demo AI", "Local realtime") tell the user which mode is active. The app never silently pretends to call an API.

## Tech stack

- [Next.js 14.2](https://nextjs.org/) - App Router, static rendering
- [Tailwind CSS 3.4](https://tailwindcss.com/) - styling and animation
- [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) - maps
- [Firebase 10](https://firebase.google.com/docs/web/setup) - Firestore + Storage (optional)
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/index) - vision
- [Google Gemini API](https://ai.google.dev/) - routing and complaint drafting

## Getting started

Requirements: Node.js 18.17+ (tested on Node 24) and npm.

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
npm run dev
```

Open http://localhost:3000.

The app runs immediately without editing `.env.local`. Add keys when you want real AI and cross-device sync.

## Environment variables

Copy `.env.example` to `.env.local` (never commit it).

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_HF_TOKEN` | No | Hugging Face read token for vision checks |
| `NEXT_PUBLIC_GEMINI_KEY` | No | Google Gemini API key |
| `NEXT_PUBLIC_HF_VISION_MODEL` | No | Override vision model (default `google/vit-base-patch16-224`) |
| `NEXT_PUBLIC_GEMINI_MODEL` | No | Override Gemini model (default `gemini-2.0-flash`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | No | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | No | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | No | Enables Firestore mode when set |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | No | Enables image upload to Storage |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | No | Firebase web config |

Where to get them:

- Hugging Face token: https://huggingface.co/settings/tokens (create a **Read** token)
- Gemini API key: https://aistudio.google.com/app/apikey
- Firebase web app config: Firebase Console > Project settings > Your apps > Web app

Validation is built in: a key only enables its feature if it looks real (HF keys start with `hf_`, Gemini keys start with `AIza`). Placeholder values keep demo mode on.

## Deploy to Vercel

1. Push the repository to GitHub.
2. In [Vercel](https://vercel.com/new), import the repository. Framework preset: **Next.js**. No build settings need changing.
3. Add the environment variables from the table above under **Settings > Environment Variables** (Production and Preview).
4. Deploy. The build produces static routes for `/`, `/report`, and `/dashboard`.

Notes:

- These keys are `NEXT_PUBLIC_*`, so they are embedded in client-side JavaScript. Use a dedicated Hugging Face token with read-only scope and restrict the Gemini key in Google Cloud (API restrictions + quotas). For a production rollout, move AI calls to server routes so keys stay private.
- If Firestore is enabled, set rules allowing the intended reads/writes. Example starter rules (tighten before production):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /complaints/{id} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll(['category', 'status', 'createdAt']);
      allow update: if request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt']);
      allow delete: if false;
    }
  }
}
```

- Storage uploads require a Storage rule that permits writes to the complaints image path.

## How the AI pipeline works

1. **Vision check** (`lib/ai.js`): the compressed image is sent to a Hugging Face image classification model, trying the router endpoint first and the legacy inference endpoint second, with retry on warm-up (`503`). If the top labels contain no municipal category, a CLIP zero-shot pass decides among Garbage, Road, Water, and Streetlight. If both fail, a demo result is returned and flagged.
2. **Routing** (`lib/ai.js`): Gemini receives the detected category, the citizen's text, and the area, and returns structured JSON with category, priority, department, language, and a formal complaint. If Gemini is unavailable, a local keyword router (with Urdu and Sindhi terms) produces the same shape.
3. **Assignment** (`lib/constants.js`): `WASTE -> HMC`, `ROAD -> HMC`, `WATER -> WASA`, `LIGHT -> HESCO`.
4. **Storage** (`lib/db.js`): the record is written to Firestore when configured, otherwise to `localStorage` with a `BroadcastChannel` for live updates in the same browser.
5. **Dashboard** (`app/dashboard/page.js`): complaints stream in realtime, are filterable by status and category, and are rendered both as cards and as status-colored map markers (High priority pulses).

## Models and data

- Vision model: https://huggingface.co/google/vit-base-patch16-224
- Zero-shot fallback: https://huggingface.co/openai/clip-vit-base-patch32
- Gemini models and docs: https://ai.google.dev/gemini-api/docs
- Suggested fine-tuning dataset (waste imagery): https://github.com/garythung/trashnet

For better accuracy on local waste types, fine-tune a vision model on labeled Hyderabad street photos and set `NEXT_PUBLIC_HF_VISION_MODEL` to your model.

## Project structure

```
app/
  layout.js          Root layout, fonts, providers
  globals.css        Tailwind layers, Leaflet overrides, animations
  page.js            Landing page
  report/page.js     Photo + voice + location + AI submission flow
  dashboard/page.js  Realtime map, filters, status updates
components/
  Navbar.js, Footer.js, LanguageProvider.js
  CameraUpload.js, MapView.js, ComplaintCard.js, StatusBadge.js
lib/
  ai.js              Vision check, Gemini routing, local fallbacks
  db.js              Firestore/local realtime data layer
  firebase.js        Lazy Firebase init
  image.js           Compression and data URL helpers
  seed.js            Five seeded Hyderabad complaints
  constants.js       Categories, departments, areas, formatters
  i18n.js            English/Urdu dictionaries
```

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm start       # serve the production build
npm run lint    # Next.js lint
```

## Troubleshooting

- **Badges say "Demo AI"** - keys are missing or fail validation. Check prefixes and restart the dev server after editing `.env.local`.
- **"SWC binary" install error on Windows** - corrupted optional dependency. Delete `node_modules` and run `npm install` again.
- **Map is blank** - Leaflet CSS is global; check the browser console for a blocked tile request or an SSR import of `react-leaflet`.
- **Firebase permission errors** - the app falls back to the local store. Update Firestore rules, then reload.
- **Speech input unavailable** - Web Speech API is Chrome/Edge only; typing always works.

## Security

- Never commit `.env.local`; it is already ignored.
- Client-embedded keys are visible to users by design in this demo. Rotate them after the hackathon and move AI calls behind server routes for production.
- Uploaded images in demo mode are stored as compressed data URLs in `localStorage`; clear site data to reset.
