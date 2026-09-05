# MedLens — AI-Powered Clinical Information Intelligence

> **Disclaimer:** MedLens is an organizational aid, not a medical diagnosis tool. Always consult a licensed clinician for medical decisions.

---

## Problem Statement Alignment

This table maps each of the six hackathon requirements to the implementing code:

| Requirement | Implementation |
|---|---|
| **1. Patient Intake** | [`server/routes/patients.ts`](server/routes/patients.ts) (POST `/api/patients`) + [`src/pages/NewPatient.tsx`](src/pages/NewPatient.tsx). All fields tagged `source: "user"`. |
| **2. Report Processing** | [`server/routes/reports.ts`](server/routes/reports.ts) (POST `/api/patients/:id/reports`). PDF text via `pdf-parse`, images/scanned PDFs sent to Gemini as multimodal input. Results tagged `source: "ai_extracted"`. |
| **3. Structured Record** | [`src/pages/PatientDetail.tsx`](src/pages/PatientDetail.tsx) — patient card + grouped results table + AI summary panel. |
| **4. Reference-Range Awareness** | [`server/services/rangeCheck.ts`](server/services/rangeCheck.ts) — pure `labelRange()` function; only uses ranges printed in the report, never invents them. Labels: Low/Normal/High/No range. |
| **5. Source & Provenance** | [`src/components/SourceBadge.tsx`](src/components/SourceBadge.tsx) — visible badge on every field: `user-entered` / `AI-extracted` / `user-verified`. Each lab result links to its report via `report_id`. |
| **6. AI Summary** | [`server/routes/summary.ts`](server/routes/summary.ts) + [`server/services/safety.ts`](server/services/safety.ts) — plain-language summary via Gemini, with a regex safety check that blocks diagnosis/treatment/dosage language before rendering. |

---

## Features

- **Patient Information Intake** — structured form with symptoms, conditions, allergies, medications, notes
- **PDF & Image Report Upload** — drag-and-drop, validated (type + size), async extraction
- **AI Extraction** — Gemini extracts test name, value, unit, reference range, date, flag, and confidence score
- **Reference-Range Labels** — Low ↓ / Normal ✓ / High ↑ / No range — based solely on printed ranges
- **Source Badges** — every field shows its provenance: user-entered, AI-extracted, or user-verified
- **Edit & Verify** — click "Edit & Verify" on any AI-extracted value to flip it to `user_verified`
- **AI Summary** — plain-language summary with mandatory safety guard (no diagnosis/dosage language)
- **Audit Log** — timeline of uploads, edits, AI calls
- **Pagination** — patient list and report list are paginated
- **Idempotent Extraction** — already-extracted reports skip Gemini re-calls

---

## Setup & Run

### Prerequisites
- Node.js 20+
- A Google Gemini API key ([get one here](https://aistudio.google.com/))

### Local Development

```bash
# 1. Clone and install
git clone <repo>
cd medlens
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 3. Run dev server (starts both backend + Vite frontend)
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173

# 4. Run tests
npm test

# 5. Lint
npm run lint
```

### Production Build

```bash
npm run build   # builds client to dist/client and server to dist/server
npm start       # starts the single Node.js server on PORT (default 3001)
```

The production server serves the React frontend from `dist/client` and exposes the API at `/api/*`.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | **required** | Google Gemini API key |
| `DB_PATH` | `./data/medlens.db` | Path to SQLite database file |
| `PORT` | `3001` | Server port (Cloud Run sets this automatically) |
| `MAX_FILE_SIZE` | `10485760` (10 MB) | Max upload size in bytes |

---

## Deploy to Cloud Run

```bash
# Authenticate
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Deploy from source (Cloud Build handles the Docker build)
gcloud run deploy medlens \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY_HERE
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Single Cloud Run Container          │
│                                                     │
│  ┌──────────────┐       ┌───────────────────────┐  │
│  │  React + Vite │       │  Node.js + Express    │  │
│  │  (static)     │──────▶│  /api/* routes        │  │
│  └──────────────┘       │                       │  │
│                          │  ┌─────────────────┐  │  │
│                          │  │  SQLite (file)   │  │  │
│                          │  └─────────────────┘  │  │
│                          │  ┌─────────────────┐  │  │
│                          │  │  Gemini API      │  │  │
│                          │  └─────────────────┘  │  │
│                          └───────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### File Structure

```
server/
  index.ts              # Express entry point
  routes/
    patients.ts         # CRUD + pagination
    reports.ts          # Upload, async extraction, verify
    summary.ts          # AI summary + audit log
  services/
    gemini.ts           # Gemini API calls
    rangeCheck.ts       # Pure Low/Normal/High logic
    safety.ts           # Regex safety check
  middleware/
    upload.ts           # multer + file validation
  db/
    index.ts            # SQLite init + schema

src/
  App.tsx               # State-based router
  api.ts                # API client
  types.ts              # Shared TypeScript types
  components/
    Layout.tsx          # Nav + disclaimer
    SourceBadge.tsx     # Provenance badges
    RangeLabel.tsx      # Low/Normal/High labels
    Disclaimer.tsx      # Persistent disclaimer
    PatientCard.tsx     # Patient list card
  pages/
    Home.tsx            # Patient list
    NewPatient.tsx      # Intake form
    PatientDetail.tsx   # Record + results + summary
    UploadReport.tsx    # Upload flow

tests/
  rangeCheck.test.ts    # Unit tests for range logic
  safety.test.ts        # Unit tests for safety check
  api.test.ts           # Integration tests
```

---

## Security

- **helmet.js** — HTTP security headers
- **CORS** — same-origin in production
- **Input validation** — Zod schemas on all API routes
- **File validation** — MIME type + size checked before processing
- **Rate limiting** — upload (30/15min) + summary (20/15min) endpoints
- **Parameterized queries** — `better-sqlite3` prepared statements only
- **No secrets in code** — API key via environment variable only

---

## Testing

```bash
npm test        # runs all tests (vitest)
npm run lint    # ESLint check
```

Tests cover:
- `rangeCheck.test.ts` — all edge cases for the Low/Normal/High function
- `safety.test.ts` — all forbidden patterns in the safety check
- `api.test.ts` — integration tests for patient create/list routes

---

## Known Limitations

1. **SQLite is ephemeral on Cloud Run** — the database file resets when the container restarts or scales to zero. This is a documented trade-off for demo simplicity; a production deployment would use Cloud SQL or Firestore.
2. **Single-user only** — no authentication. Anyone with the URL can view/add data.
3. **Extraction is async** — after upload, the UI polls every 3 seconds for completion. Large images may take longer.
4. **PDF-to-image fallback** — for scanned PDFs with minimal text, the raw PDF bytes are sent to Gemini as a PNG proxy. Complex multi-page scans may not extract perfectly.
5. **No PDF export** — out of scope for the initial build; a bonus feature for future work.
