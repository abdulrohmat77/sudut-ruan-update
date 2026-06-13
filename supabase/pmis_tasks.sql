-- ============================================================
-- PMIS Tasks — Tugas per proyek.
-- Jalankan SQL ini di Supabase SQL Editor sekali saja.
-- Progress proyek dihitung otomatis dari tugas yang selesai.
-- ============================================================

create table if not exists public.pmis_tasks (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.pmis_projects(id) on delete cascade,
  title           text not null,
  description     text,
  status          text not null default 'todo',  -- todo | in_progress | done
  sort_order      int default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pmis_tasks_project_idx on public.pmis_tasks (project_id);
create index if not exists pmis_tasks_status_idx on public.pmis_tasks (status);

-- Row Level Security
alter table public.pmis_tasks enable row level security;
drop policy if exists "pmis_tasks anon all" on public.pmis_tasks;
create policy "pmis_tasks anon all" on public.pmis_tasks for all using (true) with check (true);
