-- ============================================================
-- PMIS Reports — Daily, Weekly, Monthly, Final Project Report.
-- Jalankan SQL ini di Supabase SQL Editor sekali saja.
-- Struktur sama dengan SRA Project Command Center.
-- ============================================================

-- Daily Reports
create table if not exists public.pmis_daily_reports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.pmis_projects(id) on delete cascade,
  report_date     date not null,
  weather         text,
  manpower_count  int default 0,
  work_summary    text,
  issues          text,
  next_day_plan   text,
  progress_percent numeric(5,2),
  status          text not null default 'draft',  -- draft | submitted | approved | rejected
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint pmis_daily_reports_unique unique (project_id, report_date)
);

create index if not exists pmis_daily_project_idx on public.pmis_daily_reports (project_id);

-- Weekly Reports
create table if not exists public.pmis_weekly_reports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.pmis_projects(id) on delete cascade,
  week_start      date not null,
  week_end        date not null,
  summary         text,
  planned_progress numeric(5,2),
  actual_progress  numeric(5,2),
  variance        numeric(5,2),
  status          text not null default 'draft',
  created_at      timestamptz not null default now()
);

create index if not exists pmis_weekly_project_idx on public.pmis_weekly_reports (project_id);

-- Monthly Reports
create table if not exists public.pmis_monthly_reports (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.pmis_projects(id) on delete cascade,
  month           date not null,
  executive_summary text,
  financial_summary jsonb default '{}'::jsonb,
  schedule_summary  jsonb default '{}'::jsonb,
  status          text not null default 'draft',
  created_at      timestamptz not null default now()
);

create index if not exists pmis_monthly_project_idx on public.pmis_monthly_reports (project_id);

-- Row Level Security (anon all — sama dengan tabel lain)
alter table public.pmis_daily_reports enable row level security;
drop policy if exists "pmis_daily_reports anon all" on public.pmis_daily_reports;
create policy "pmis_daily_reports anon all" on public.pmis_daily_reports for all using (true) with check (true);

alter table public.pmis_weekly_reports enable row level security;
drop policy if exists "pmis_weekly_reports anon all" on public.pmis_weekly_reports;
create policy "pmis_weekly_reports anon all" on public.pmis_weekly_reports for all using (true) with check (true);

alter table public.pmis_monthly_reports enable row level security;
drop policy if exists "pmis_monthly_reports anon all" on public.pmis_monthly_reports;
create policy "pmis_monthly_reports anon all" on public.pmis_monthly_reports for all using (true) with check (true);
