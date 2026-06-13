-- ============================================================
-- PMIS Project Control — Tabel proyek & invoice.
-- Jalankan SQL ini di Supabase SQL Editor sekali saja.
-- Dipakai oleh dashboard Executive / Project Control.
-- ============================================================

-- ENUM (pakai text biasa biar fleksibel di dashboard CRM)
-- status: planning | active | on_hold | completed | cancelled

create table if not exists public.pmis_projects (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  description     text,
  client_name     text,
  location        text,
  contract_value  numeric(18,2) default 0,
  currency        text default 'IDR',
  start_date      date,
  end_date        date,
  actual_start    date,
  actual_end      date,
  status          text not null default 'planning',
  progress_percent numeric(5,2) not null default 0,
  planned_progress numeric(5,2) not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pmis_projects_status_idx on public.pmis_projects (status);

-- Invoice per proyek (bisa termin / progress billing)
create table if not exists public.pmis_invoices (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.pmis_projects(id) on delete cascade,
  invoice_no      text not null,
  amount          numeric(18,2) not null default 0,
  tax_amount      numeric(18,2) default 0,
  issued_date     date,
  due_date        date,
  paid_date       date,
  status          text not null default 'pending',  -- pending | paid | overdue
  notes           text,
  created_at      timestamptz not null default now()
);

create index if not exists pmis_invoices_project_idx on public.pmis_invoices (project_id);
create index if not exists pmis_invoices_status_idx on public.pmis_invoices (status);

-- Row Level Security
alter table public.pmis_projects enable row level security;
drop policy if exists "pmis_projects anon all" on public.pmis_projects;
create policy "pmis_projects anon all" on public.pmis_projects for all using (true) with check (true);

alter table public.pmis_invoices enable row level security;
drop policy if exists "pmis_invoices anon all" on public.pmis_invoices;
create policy "pmis_invoices anon all" on public.pmis_invoices for all using (true) with check (true);
