create extension if not exists pgcrypto;

create type public.paper_parse_status as enum ('uploaded', 'parsing', 'ready', 'failed');
create type public.attempt_mode as enum ('practice', 'exam');
create type public.attempt_status as enum ('active', 'submitted', 'graded');
create type public.answer_status as enum ('unanswered', 'in_progress', 'answered', 'flagged');
create type public.mistake_type as enum ('concept_error', 'method_error', 'careless_error', 'incomplete_answer');
create type public.annotation_type as enum ('highlight', 'note', 'flag');
create type public.grade_scope as enum ('question', 'paper');
create type public.grading_basis as enum ('mark_scheme', 'fallback_question_only');
create type public.worker_job_type as enum ('paper_parse', 'grade_question', 'grade_paper');
create type public.worker_job_status as enum ('queued', 'processing', 'completed', 'failed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  board text not null default 'Cambridge IGCSE',
  subject text not null default 'Mathematics',
  question_pdf_path text not null,
  mark_scheme_pdf_path text,
  parse_status public.paper_parse_status not null default 'uploaded',
  parse_confidence numeric(5,2),
  parse_error text,
  page_count integer,
  structured_paper_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.paper_pages (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  extracted_text text not null default '',
  preview_image_path text,
  page_width numeric(10,2),
  page_height numeric(10,2),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (paper_id, page_number)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references public.papers(id) on delete cascade,
  parent_question_id uuid references public.questions(id) on delete cascade,
  question_label text not null,
  display_order integer not null,
  page_start integer,
  page_end integer,
  page_regions jsonb not null default '[]'::jsonb,
  question_text text not null,
  marks integer,
  topic text,
  parse_confidence numeric(5,2),
  mark_scheme_text text,
  grading_criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  mode public.attempt_mode not null,
  timed boolean not null default false,
  duration_seconds integer,
  timer_expires_at timestamptz,
  status public.attempt_status not null default 'active',
  started_at timestamptz not null default timezone('utc', now()),
  submitted_at timestamptz,
  graded_at timestamptz,
  total_awarded_marks numeric(6,2),
  total_max_marks numeric(6,2),
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  answer_text text not null default '',
  status public.answer_status not null default 'unanswered',
  flagged boolean not null default false,
  time_spent_seconds integer not null default 0,
  last_graded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (attempt_id, question_id)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  scope public.grade_scope not null,
  awarded_marks numeric(6,2) not null default 0,
  max_marks numeric(6,2) not null default 0,
  feedback jsonb not null default '{}'::jsonb,
  confidence numeric(5,2),
  grading_basis public.grading_basis not null default 'fallback_question_only',
  provider text not null default 'gemini',
  raw_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.mistakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  attempt_id uuid not null references public.attempts(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  grade_id uuid references public.grades(id) on delete set null,
  topic text,
  mistake_type public.mistake_type not null,
  note text,
  source_excerpt text,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.annotations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  paper_id uuid not null references public.papers(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  attempt_id uuid references public.attempts(id) on delete cascade,
  page_number integer not null check (page_number > 0),
  annotation_type public.annotation_type not null,
  body text,
  rect jsonb not null default '{}'::jsonb,
  color text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.worker_jobs (
  id uuid primary key default gen_random_uuid(),
  type public.worker_job_type not null,
  status public.worker_job_status not null default 'queued',
  paper_id uuid references public.papers(id) on delete cascade,
  attempt_id uuid references public.attempts(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  retry_count integer not null default 0,
  available_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  locked_by text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index papers_user_created_idx on public.papers (user_id, created_at desc);
create index papers_status_idx on public.papers (parse_status, created_at desc);
create index paper_pages_paper_page_idx on public.paper_pages (paper_id, page_number);
create index questions_paper_order_idx on public.questions (paper_id, display_order);
create index attempts_user_status_idx on public.attempts (user_id, status, created_at desc);
create index attempts_paper_idx on public.attempts (paper_id, created_at desc);
create index attempt_answers_attempt_question_idx on public.attempt_answers (attempt_id, question_id);
create index grades_attempt_scope_idx on public.grades (attempt_id, scope, created_at desc);
create index mistakes_user_created_idx on public.mistakes (user_id, created_at desc);
create index annotations_paper_page_idx on public.annotations (paper_id, page_number);
create index worker_jobs_status_available_idx on public.worker_jobs (status, available_at, created_at);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger papers_set_updated_at
before update on public.papers
for each row execute function public.set_updated_at();

create trigger paper_pages_set_updated_at
before update on public.paper_pages
for each row execute function public.set_updated_at();

create trigger questions_set_updated_at
before update on public.questions
for each row execute function public.set_updated_at();

create trigger attempts_set_updated_at
before update on public.attempts
for each row execute function public.set_updated_at();

create trigger attempt_answers_set_updated_at
before update on public.attempt_answers
for each row execute function public.set_updated_at();

create trigger annotations_set_updated_at
before update on public.annotations
for each row execute function public.set_updated_at();

create trigger worker_jobs_set_updated_at
before update on public.worker_jobs
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.papers enable row level security;
alter table public.paper_pages enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.attempt_answers enable row level security;
alter table public.grades enable row level security;
alter table public.mistakes enable row level security;
alter table public.annotations enable row level security;
alter table public.worker_jobs enable row level security;

create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "papers_access_own"
on public.papers for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "paper_pages_select_owner"
on public.paper_pages for select
to authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = paper_pages.paper_id
      and p.user_id = auth.uid()
  )
);

create policy "paper_pages_write_owner"
on public.paper_pages for all
to authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = paper_pages.paper_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.papers p
    where p.id = paper_pages.paper_id
      and p.user_id = auth.uid()
  )
);

create policy "questions_select_owner"
on public.questions for select
to authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = questions.paper_id
      and p.user_id = auth.uid()
  )
);

create policy "questions_write_owner"
on public.questions for all
to authenticated
using (
  exists (
    select 1 from public.papers p
    where p.id = questions.paper_id
      and p.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.papers p
    where p.id = questions.paper_id
      and p.user_id = auth.uid()
  )
);

create policy "attempts_access_own"
on public.attempts for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "attempt_answers_select_owner"
on public.attempt_answers for select
to authenticated
using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "attempt_answers_write_owner"
on public.attempt_answers for all
to authenticated
using (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.attempts a
    where a.id = attempt_answers.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "grades_select_owner"
on public.grades for select
to authenticated
using (
  exists (
    select 1 from public.attempts a
    where a.id = grades.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "grades_write_owner"
on public.grades for all
to authenticated
using (
  exists (
    select 1 from public.attempts a
    where a.id = grades.attempt_id
      and a.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.attempts a
    where a.id = grades.attempt_id
      and a.user_id = auth.uid()
  )
);

create policy "mistakes_access_own"
on public.mistakes for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "annotations_access_own"
on public.annotations for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "worker_jobs_service_role_only"
on public.worker_jobs for all
to public
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'papers',
  'papers',
  false,
  52428800,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

create policy "papers_bucket_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "papers_bucket_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "papers_bucket_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "papers_bucket_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'papers'
  and (storage.foldername(name))[1] = auth.uid()::text
);
