-- =========================================================
-- MathSnap — Security Hardening SQL
-- Run in the Supabase SQL Editor AFTER docs/specs/supabase-schema.sql.
-- Idempotent — safe to re-run.
-- =========================================================

-- Reinforce RLS on every table that holds user data. No-op if already
-- enabled by supabase-schema.sql — included here so this file stands alone
-- as a complete security checklist.
alter table if exists public.users enable row level security;
alter table if exists public.solves enable row level security;
alter table if exists public.messages enable row level security;
alter table if exists public.flagged_solves enable row level security;

-- =========================================================
-- Atomic daily free-tier solve consumption
--
-- Fixes a read-then-write race in the application layer: two concurrent
-- solve requests could both read daily_solve_count before either write
-- landed, both pass the free-tier check, and both proceed — bypassing the
-- daily cap entirely under concurrent load. This function performs the
-- date-rollover reset and the increment-with-limit-check in a single
-- atomic UPDATE, so Postgres's row-level locking makes the operation
-- race-free.
--
-- p_user_id is re-checked against auth.uid() inside the function (not just
-- trusted from the argument) so that calling this RPC directly against
-- PostgREST with a valid session can never touch another user's row, even
-- though the function runs as security definer.
--
-- Returns true if the solve was allowed (and the counter was incremented),
-- false if the daily limit was already reached.
-- =========================================================
create or replace function public.consume_daily_solve(p_user_id uuid, p_daily_limit int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  update public.users
  set
    daily_solve_count = case
      when daily_solve_count_date = current_date then daily_solve_count + 1
      else 1
    end,
    daily_solve_count_date = current_date
  where id = p_user_id
    and id = auth.uid()
    and (
      subscription_tier = 'paid'
      or daily_solve_count_date != current_date
      or daily_solve_count < p_daily_limit
    )
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_daily_solve(uuid, int) from public;
grant execute on function public.consume_daily_solve(uuid, int) to authenticated;

-- =========================================================
-- Rate limiting — NOT implemented as a Supabase table.
--
-- MathSnap uses Upstash Redis (lib/rateLimit.ts) for sliding-window rate
-- limiting instead of a rate_limit_events table + service-role reads/writes
-- on every request. Redis is purpose-built for this (sub-millisecond,
-- doesn't add load to the primary Postgres database) and is already wired
-- into every endpoint that needs it: solve creation, follow-up messages,
-- and (as of this security pass) login/signup. See docs/security/security-plan.md
-- for the full endpoint-to-limit mapping.
-- =========================================================
