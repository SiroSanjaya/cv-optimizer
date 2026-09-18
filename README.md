# CV Optimizer

An AI-powered CV optimization MVP for job seekers. Upload a CV, paste a job
description, get an honest match analysis, and download an ATS-friendly,
job-tailored CV — without ever inventing experience you don't have.

```
cv-optimizer/
├── backend/     Express + TypeScript API, Prisma, Gemini integration
└── frontend/    React + Vite + TypeScript + Tailwind CSS
```

---

## Quick start with Docker (recommended)

Runs Postgres, the backend, and the frontend together with one command —
no local Node/Postgres install needed except Docker itself.

**Requirements:** Docker + Docker Compose, and a Gemini API key.

```bash
cp .env.example .env
# then edit .env and set GEMINI_API_KEY=your_key

docker compose up --build
```

Once it's up:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api/health
- Postgres: localhost:5432 (user/pass from `.env`, default `cvoptimizer`/`cvoptimizer`)

The backend container automatically runs `prisma migrate deploy` against the
`db` container before starting, so the database schema is ready on first
boot — no manual migration step needed.

To stop:

```bash
docker compose down          # stop containers, keep the database volume
docker compose down -v       # also wipe the database volume
```

To rebuild after changing code:

```bash
docker compose up --build
```

**Note on `VITE_API_URL`:** the frontend is a static build, so the API URL
is baked in at image build time (`docker-compose.yml` passes it as a build
arg, defaulting to `http://localhost:4000`, matching the port docker-compose
exposes on your host). If you change the host port mapping for `backend` in
`docker-compose.yml`, update `VITE_API_URL` in `.env` to match and rebuild
the `frontend` service.

This Docker setup is meant for running the app locally or on a single VM
with `docker compose up`. For the manual/non-Docker setup (useful for
active development with hot reload), see the sections below. For deploying
to Vercel/Render/Railway separately, see [Deployment](#10-deployment).

---

## Manual setup (without Docker)

## 1. Prerequisites

- Node.js 20+
- npm 10+
- A PostgreSQL database (local, or a free instance on Supabase/Neon/Railway)
- A Google Gemini API key: https://aistudio.google.com/app/apikey

---

## 2. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

---

## 3. Configure environment variables

### Backend

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:

```
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

DATABASE_URL=postgresql://user:password@localhost:5432/cv_optimizer?schema=public

AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash

MAX_FILE_SIZE_MB=5
UPLOAD_TMP_DIR=tmp_uploads

RATE_LIMIT_WINDOW_MINUTES=15
RATE_LIMIT_MAX_REQUESTS=60
```

### Frontend

```bash
cd frontend
cp .env.example .env
```

```
VITE_API_URL=http://localhost:4000
```

---

## 4. Set up PostgreSQL & Prisma

The MVP does **not** use authentication or payments, so the database is used
minimally today. The schema is prepared so a future version can add users,
saved CV versions, applications, and usage credits without a rewrite.

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

This creates the `User`, `CvVersion`, `Application`, and `UsageCredit` tables
(unused by the MVP flow, but ready for future auth/payment work).

---

## 5. Run locally

In two terminals:

```bash
# Terminal 1
cd backend
npm run dev        # http://localhost:4000

# Terminal 2
cd frontend
npm run dev         # http://localhost:5173
```

Open http://localhost:5173.

---

## 6. How the Gemini API integration works

All AI logic lives behind a provider abstraction so the model/provider can be
swapped later without touching controllers or routes:

```
backend/src/services/ai/
├── AIProvider.ts       interface: extractStructuredCv, analyzeMatch, generateTailoredCv
├── GeminiProvider.ts   Gemini implementation of the interface
├── prompts.ts           prompt templates
├── jsonExtractor.ts      safely parses JSON out of model responses
└── aiProviderFactory.ts  returns the configured provider (reads AI_PROVIDER env var)
```

**Three AI calls happen across the whole flow, and each one only runs once
per action** (per the performance requirement to minimize AI cost):

1. **Extraction** (`extractStructuredCv`) — runs once when a CV is uploaded.
   Converts raw PDF/DOCX text into structured JSON. The structured CV is
   then reused for both analysis and generation — the file is never
   re-parsed or re-uploaded.
2. **Analysis** (`analyzeMatch`) — compares the structured CV against the
   pasted job description and returns `matchScore`, matched/partial/missing
   skills, keywords, and recommendations.
3. **Generation** (`generateTailoredCv`) — rewrites the CV using the
   original structured CV + job description + analysis as context.

**Every prompt in `prompts.ts` explicitly separates:**

```
SECTION 1: FACTS FROM CV            (source of truth)
SECTION 2: REQUIREMENTS FROM JOB DESCRIPTION
SECTION 3: TASK / OPTIMIZATION INSTRUCTIONS
```

and repeats the rule that the model must never invent employment history,
skills, education, certifications, achievements, or metrics that aren't
already in Section 1. As defense-in-depth, `GeminiProvider.ts` also runs a
deterministic post-processing guard (`guardAgainstFabrication`) that strips
any skill in the generated CV that wasn't present in the original CV or its
project technologies, and locks personal info / education / certifications
to the original values — so even if the model drifts, the output can't
silently add facts.

To swap providers later (e.g. add an OpenAI or Claude provider), implement
`AIProvider` in a new file and register it in `aiProviderFactory.ts`.

---

## 7. Free usage quota (MVP, no auth)

No login is required. Each anonymous browser gets **2 free optimizations**,
tracked client-side in `localStorage` under the key `cv_optimizer_usage`:

```json
{ "used": 0, "limit": 2 }
```

See `frontend/src/lib/quota.ts`. This is intentionally simple for the MVP —
a future version can move quota enforcement server-side once accounts exist.

---

## 8. API documentation

All AI requests go through the backend; the Gemini API key is never exposed
to the frontend.

### `POST /api/cv/analyze`

`multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `cv` | file | `.pdf` or `.docx`, max 5MB |
| `jobDescription` | string | min 30 characters |

**Response `200`**
```json
{
  "success": true,
  "cv": { "personalInfo": {...}, "summary": "...", "skills": [...], "experience": [...], "projects": [...], "education": [...], "certifications": [...] },
  "analysis": {
    "matchScore": 78,
    "matchedSkills": [],
    "partialMatches": [],
    "missingSkills": [],
    "keywords": [],
    "recommendations": [],
    "experienceRelevance": [],
    "summary": ""
  }
}
```

### `POST /api/cv/generate`

`application/json`

```json
{ "cvData": { /* structured CV from /analyze */ }, "jobDescription": "...", "analysis": { /* from /analyze */ } }
```

**Response `200`**
```json
{ "success": true, "cv": { /* tailored structured CV */ } }
```

### `POST /api/cv/pdf`

`application/json` → `{ "cv": { /* structured CV */ } }`
**Response:** `application/pdf` binary stream (download).

### `POST /api/cv/docx`

`application/json` → `{ "cv": { /* structured CV */ } }`
**Response:** `.docx` binary (download).

### `GET /api/health`

Returns `{ "success": true, "status": "ok" }`.

### Error shape

All errors return:
```json
{ "success": false, "error": "Human-readable message" }
```
Stack traces and API keys are never exposed to clients.

---

## 9. Privacy

- Uploaded CV files are written to a temp folder (`UPLOAD_TMP_DIR`), parsed
  once, and deleted immediately after processing — they are not stored
  permanently.
- Only extracted text is sent to Gemini; nothing else leaves the backend.
- The logger (`backend/src/utils/logger.ts`) never logs CV contents, emails,
  phone numbers, or full request bodies — only event names and safe metadata.

---

## 10. Deployment

### Frontend → Vercel

1. Push this repo to GitHub.
2. In Vercel, import the repo and set the **Root Directory** to `frontend`.
3. Framework preset: Vite. Build command: `npm run build`. Output dir: `dist`.
4. Add environment variable `VITE_API_URL` = your deployed backend URL.
5. Deploy. `vercel.json` already includes the SPA rewrite rule for
   React Router.

### Backend → Render or Railway

**Render**
1. New Web Service → connect the repo → Root Directory: `backend`.
2. Build command: `npm install && npx prisma generate && npm run build`
3. Start command: `npm run prisma:deploy && npm start`
4. Add environment variables from `.env.example` (set `DATABASE_URL` to a
   managed Postgres instance — Render Postgres, Neon, or Supabase all work).
5. Set `FRONTEND_URL` to your deployed Vercel URL (required for CORS).

**Railway**
1. New Project → deploy from repo → set Root Directory to `backend`.
2. Add a PostgreSQL plugin, or use an external `DATABASE_URL`.
3. Set the same environment variables as above.
4. Start command: `npm run prisma:deploy && npm start`.

### Database

Any PostgreSQL-compatible host works (Render Postgres, Railway Postgres,
Neon, Supabase). Run `npx prisma migrate deploy` once against production
before the first request.

### Production CORS

The backend only allows requests from `FRONTEND_URL` (see `src/app.ts`).
Make sure it exactly matches your deployed frontend origin, e.g.
`https://your-app.vercel.app` (no trailing slash).

---

## 11. What's intentionally NOT in this MVP

Per the product scope, the following are out of scope for now and left for
future versions (the Prisma schema is prepared for them, but nothing is
wired up):

- Payments / subscriptions
- User authentication / social login
- Job board integration or LinkedIn scraping
- Automatic job applications
- Complex dashboards

---

## 12. Tech stack summary

| Layer | Stack |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS, React Router, Axios, React Hook Form, Zod |
| Backend | Node.js, Express, TypeScript, Zod, Multer |
| Database | PostgreSQL + Prisma ORM |
| AI | Google Gemini API, behind an `AIProvider` abstraction |
| File parsing | `pdf-parse`, `mammoth` |
| Document generation | `pdfkit` (PDF), `docx` (DOCX) |
