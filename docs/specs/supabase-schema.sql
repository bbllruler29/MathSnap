-- =========================================================
-- MathSnap — Supabase Schema
-- Paste into the Supabase SQL Editor and run on a fresh project.
-- Idempotent where practical; intended for a single initial run.
-- =========================================================

-- =========================================================
-- Extensions
-- =========================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- =========================================================
-- Enums
-- =========================================================
create type public.user_role as enum ('student', 'admin');
create type public.subscription_tier as enum ('free', 'paid');
create type public.verification_status as enum ('pending', 'verified', 'unverified', 'failed');
create type public.message_role as enum ('user', 'agent');
create type public.flag_status as enum ('open', 'resolved', 'escalated');

-- =========================================================
-- Tables (dependency order)
-- =========================================================

-- users: 1:1 profile extending auth.users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.user_role not null default 'student',
  subscription_tier public.subscription_tier not null default 'free',
  subscription_expires_at timestamptz,
  stripe_customer_id text,
  daily_solve_count int not null default 0,
  daily_solve_count_date date not null default current_date,
  birth_year int, -- COPPA age-gate: collected at signup, never shown publicly
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- solves
create table public.solves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  image_path text not null, -- storage.objects path: "{user_id}/{solve_id}.{ext}"
  parsed_problem text,
  topic text,
  steps_json jsonb,          -- [{ "step_number": int, "explanation": text, "latex": text }]
  final_answer text,
  confidence_score numeric(3,2) check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  verification_status public.verification_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index solves_user_id_created_at_idx on public.solves (user_id, created_at desc);
create index solves_user_id_topic_idx on public.solves (user_id, topic);

-- messages: follow-up conversation thread per solve
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  solve_id uuid not null references public.solves(id) on delete cascade,
  role public.message_role not null,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index messages_solve_id_created_at_idx on public.messages (solve_id, created_at);

-- flagged_solves: human-review queue
create table public.flagged_solves (
  id uuid primary key default gen_random_uuid(),
  solve_id uuid not null unique references public.solves(id) on delete cascade,
  flagged_by uuid not null references public.users(id) on delete cascade,
  reason text,
  status public.flag_status not null default 'open',
  reviewer_id uuid references public.users(id),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index flagged_solves_status_created_at_idx on public.flagged_solves (status, created_at);

-- =========================================================
-- updated_at auto-update triggers
-- =========================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger solves_set_updated_at
  before update on public.solves
  for each row execute function public.set_updated_at();

-- =========================================================
-- Auth hook: create public.users profile row on signup
-- =========================================================
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =========================================================
-- Helper: is_admin() — used by RLS policies, security definer
-- avoids recursive RLS evaluation on public.users
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.users enable row level security;
alter table public.solves enable row level security;
alter table public.messages enable row level security;
alter table public.flagged_solves enable row level security;

-- users
create policy "users_select_own_or_admin" on public.users
  for select using (id = auth.uid() or public.is_admin());

create policy "users_update_own" on public.users
  for update using (id = auth.uid());

-- solves
create policy "solves_select_own_or_admin" on public.solves
  for select using (user_id = auth.uid() or public.is_admin());

create policy "solves_insert_own" on public.solves
  for insert with check (user_id = auth.uid());

create policy "solves_update_own_or_admin" on public.solves
  for update using (user_id = auth.uid() or public.is_admin());

-- messages
create policy "messages_select_own_or_admin" on public.messages
  for select using (
    exists (select 1 from public.solves s where s.id = solve_id and s.user_id = auth.uid())
    or public.is_admin()
  );

create policy "messages_insert_own" on public.messages
  for insert with check (
    exists (select 1 from public.solves s where s.id = solve_id and s.user_id = auth.uid())
  );

-- flagged_solves
create policy "flagged_select_own_or_admin" on public.flagged_solves
  for select using (flagged_by = auth.uid() or public.is_admin());

create policy "flagged_insert_own" on public.flagged_solves
  for insert with check (
    flagged_by = auth.uid()
    and exists (select 1 from public.solves s where s.id = solve_id and s.user_id = auth.uid())
  );

create policy "flagged_update_admin_only" on public.flagged_solves
  for update using (public.is_admin());

-- =========================================================
-- Storage: problem-images bucket
-- Path convention: "{user_id}/{solve_id}.{ext}"
-- =========================================================
insert into storage.buckets (id, name, public)
values ('problem-images', 'problem-images', false)
on conflict (id) do nothing;

create policy "problem_images_insert_own"
on storage.objects for insert
with check (
  bucket_id = 'problem-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "problem_images_select_own_or_admin"
on storage.objects for select
using (
  bucket_id = 'problem-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

create policy "problem_images_delete_own"
on storage.objects for delete
using (
  bucket_id = 'problem-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
