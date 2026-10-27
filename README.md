# CV Optimizer

**A practical job-search workspace for tailoring your CV to a role, preparing
for interviews, and keeping applications organized.**

CV Optimizer combines an AI-assisted CV workflow with an application tracker.
It is designed to help people prepare clearer, role-specific application
materials while keeping the candidate in control of the final content.

> AI output is a draft, not a hiring decision or a promise of an interview.
> Review every statement and make sure it accurately reflects your experience
> before sharing it with an employer.

## What you can do

- Analyze a PDF or DOCX CV against a job description and review potential
  matches, gaps, and suggestions.
- Generate a role-tailored CV, edit its contents, then download it as PDF or
  DOCX.
- Draft a company-specific cover letter, edit it, and download a PDF.
- Practice Indonesian- or English-language mock interviews with spoken
  questions, microphone answers, conversational AI follow-ups, and feedback.
- Track applications through stages such as applied, interview, offer,
  rejected, no response, and withdrawn.
- Browse up to 100 skill-ranked job listings for Indonesia, Malaysia,
  Singapore, Australia, and eligible remote roles. Visa sponsorship is flagged
  only when the listing text explicitly mentions it; review tailored materials
  and submit each application through the employer's official site.
- Select several listings and prepare separate tailored CVs plus cover letters
  in one sequential batch, capped by the account's remaining AI task quota.
- Use the optional local Chrome/Edge helper for supported Greenhouse and Lever
  forms to fill recognizable contact and cover-letter fields and attach the
  tailored CV; review and submit each application yourself.

Some capabilities depend on an authenticated account and a configured AI
provider. Recruiter sourcing does not currently provide a real candidate
database; do not treat its empty results as a search of the wider labor market.
Voice practice uses browser speech recognition and speech synthesis when
available. Browser/device providers may process microphone audio to produce a
transcript; the application sends the transcript to Gemini for feedback. This
is turn-based practice, not live streaming or proctoring.

## Product preview

The interface is primarily Indonesian. English-language support is partial.
Screenshots can be added here as the public demo and its test data are finalized.

## Project highlights

- React, TypeScript, and Vite frontend with responsive, route-based pages.
- Express and TypeScript API, PostgreSQL persistence, and Prisma migrations.
- Redis and BullMQ for asynchronous AI tasks, processed by a separate worker.
- AI provider abstraction with Google Gemini integration.
- Google sign-in, server-side monthly AI quota reservations, rate limiting,
  file validation, and typed API errors.
- Docker Compose for running the full local stack.
- Automated backend tests and frontend lint/build checks in GitHub Actions.

## Run locally

### Requirements

- Docker Desktop with Docker Compose
- A Google Gemini API key

### Start the application

```powershell
Copy-Item .env.example .env
```

Edit `.env` and provide `GEMINI_API_KEY`, `JWT_SECRET`, and
`AI_JOB_ENCRYPTION_KEY`. Generate a JWT secret and a separate encryption key:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Use the first value for `JWT_SECRET` and the second for
`AI_JOB_ENCRYPTION_KEY`. Keep both private. Then start the services:

```powershell
docker compose up --build
```

- Web app: <http://localhost:5173>
- API health: <http://localhost:4000/api/health>
- API readiness: <http://localhost:4000/api/ready>

Google sign-in also needs a Google OAuth Web Client ID. Add the frontend
origin to the OAuth client's authorized JavaScript origins, then set
`GOOGLE_CLIENT_ID` in `.env`. For local use, the frontend origin is
`http://localhost:5173`.

To stop the stack without deleting database data:

```powershell
docker compose down
```

Avoid `docker compose down -v` unless you intentionally want to delete local
database and Redis volumes.

For manual setup, environment reference, API contracts, and deployment
instructions, see the technical guide.

## Documentation

- [Technical guide (Indonesian)](docs/TECHNICAL_GUIDE.md) - architecture,
  data flow, API map, setup, operations, and a learning path.
- [Project overview PDF](docs/CV-Optimizer-Project-Overview.pdf) - public
  portfolio-friendly summary.
- [Technical guide PDF](docs/Technical-Guide-ID.pdf) - printable technical
  companion to the guide.

PDFs can be regenerated after editing either Markdown document:

```powershell
cd backend
npm run docs:pdf
```

## Quality checks

```powershell
cd backend
npm ci
npm test

cd ../frontend
npm ci
npm run check
```

## Important limitations

- AI analysis and generated text can be incorrect. Verify facts, dates,
  skills, and claims before using an output.
- A match score is an estimate based on the provided CV and job description;
  it is not a probability of being hired.
- AI tasks require a working Gemini configuration and are subject to provider
  availability, quotas, costs, and policies.
- International country listings use the optional Jooble API key
  (`JOOBLE_API_KEY`); without it, country coverage outside Indonesia is limited
  to eligible worldwide remote listings. Job-board coverage is not exhaustive,
  visa sponsorship flags are text hints rather than employer verification, and
  applications are not automatically submitted. The optional browser helper
  supports only a small set of Greenhouse/Lever fields, may attach the tailored
  CV PDF, and does not answer screening questions or bypass CAPTCHA. See
  [browser-extension/README.md](browser-extension/README.md) for local
  installation.
- Recruiter candidate sourcing is not connected to a consent-based candidate
  database.
- The local Docker Compose setup is for development and demonstration. It is
  not, by itself, a production deployment or evidence of capacity for a
  particular number of users.
- Before a public production launch, configure OAuth for the real domain,
  review privacy/legal disclosures, deploy managed database and Redis
  services, and run end-to-end and load tests against the chosen hosting tier.

## License

No license has been added yet. Until a license is published, assume that
standard copyright applies and check with the repository owner before
redistributing or reusing the code.
