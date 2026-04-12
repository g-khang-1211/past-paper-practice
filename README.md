# Past Paper Practice MVP

Past Paper Practice is a Next.js App Router MVP for uploading a question paper PDF, parsing it into questions, attempting it in Practice or Exam mode, grading with Gemini, and saving mistakes for revision.

## Stack

- Next.js App Router + TypeScript + Tailwind
- Supabase Auth + Postgres + Storage
- Google AI Studio Gemini API
- Separate TypeScript worker for parsing and full-paper grading

## Environment

Create a `.env.local` file from [`.env.example`](/Users/giakhang/Desktop/Past-paper-practice/.env.example) and fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_AI_API_KEY=
GEMINI_FAST_MODEL=gemini-2.5-flash
GEMINI_GRADING_MODEL=gemini-2.5-pro
WORKER_SHARED_SECRET=
```

### Secret handling

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public client-safe values.
- `SUPABASE_SERVICE_ROLE_KEY` must stay server-only.
- `GOOGLE_AI_API_KEY` must stay server-only.
- `WORKER_SHARED_SECRET` is reserved for private worker-to-app coordination and must stay server-only.

## Gemini API key

Put the Gemini key in:

```bash
GOOGLE_AI_API_KEY=your_google_ai_studio_key
```

The Gemini integration lives under [`src/lib/ai`]( /Users/giakhang/Desktop/Past-paper-practice/src/lib/ai ) and is never exposed to the browser.

## Install

```bash
npm install
```

The root install now includes everything needed to run the app and the worker from the repo root. The worker no longer depends on a separate manual install step to start in local development.

## Run Supabase migration

1. Install the Supabase CLI if you do not already have it.
2. Link the repo to your Supabase project:

```bash
supabase link --project-ref <your-project-ref>
```

3. Push all schema migrations, including parse-progress support from [`supabase/migrations/0002_parse_progress.sql`]( /Users/giakhang/Desktop/Past-paper-practice/supabase/migrations/0002_parse_progress.sql ):

```bash
supabase db push
```

4. Confirm the private `papers` storage bucket and RLS policies were created.

## Run locally

Start the web app:

```bash
npm run dev
```

Start the worker in a second terminal:

```bash
npm run worker:dev
```

The worker reads `.env` and `.env.local` from the repo root. It must be running in a separate terminal for queued `worker_jobs` rows to be claimed and parsed.

## Project structure

The repo follows the requested split:

- `src/app` for routes and route handlers
- `src/components` for reusable UI, shell, forms, PDF, and states
- `src/features` for domain-specific UI/workflows
- `src/lib` for Supabase, Gemini, PDF helpers, DB access, constants, and env handling
- `supabase/` for migration and local config
- `worker/` for background jobs

## What is fully implemented

- Auth screens and protected app shell
- Upload flow for question paper PDF and optional mark scheme PDF
- DB-backed worker queue contract
- Dashboard, paper detail, attempt, results, mistakes, and analytics routes
- Gemini hint, grading, and parse-repair service boundaries
- Real Supabase migration with enums, tables, indexes, RLS, and storage policies

## Current conservative stub

- Preview image generation in [`src/lib/pdf/render-preview.ts`]( /Users/giakhang/Desktop/Past-paper-practice/src/lib/pdf/render-preview.ts ) currently returns an empty list.
  The core product still works because the attempt viewer renders the source PDF with PDF.js directly, but server-side thumbnail generation is left minimal to avoid introducing extra native rendering dependencies before deployment decisions are made.
