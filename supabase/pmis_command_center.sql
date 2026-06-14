-- ============================================================================
-- SRA PROJECT COMMAND CENTER — KONSOLIDASI LENGKAP (dashboard ke-2 di Kiro)
-- ----------------------------------------------------------------------------
-- Jalankan SEKALI di Supabase SQL Editor (project: wbfqudrzwsnlzevxjlkm).
-- Idempotent: aman dijalankan ulang (pakai IF NOT EXISTS / add column if not exists).
--
-- Catatan penting:
--  * Kiro TIDAK pakai Supabase Auth (pakai authService sendiri + anon key).
--    Jadi SEMUA tabel pakai RLS permissif "anon all" (using true / with check true),
--    dan kolom user (created_by, dll) hanya uuid biasa TANPA FK ke auth.users.
--  * Semua tabel di-prefix `pmis_` supaya tidak bentrok dengan tabel CRM yang ada.
--  * Tabel yang sudah pernah dibuat (pmis_projects, pmis_invoices, pmis_tasks,
--    pmis_*_reports, pmis_deliverables) akan di-EXTEND kolomnya, bukan dibuat ulang.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) HELPER: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.pmis_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------------------------------------------------------------------------
-- 1) PROJECTS  (extend tabel lama bila sudah ada)
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_projects (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  name             text not null,
  description      text,
  client_name      text,
  location         text,
  contract_value   numeric(22,2) default 0,
  currency         text default 'IDR',
  start_date       date,
  end_date         date,
  actual_start     date,
  actual_end       date,
  status           text not null default 'planning',  -- planning|active|on_hold|completed|cancelled
  progress_percent numeric(5,2) not null default 0,
  planned_progress numeric(5,2) not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- kolom tambahan dari PMIS (owner kontak, PM, cover, dsb)
alter table public.pmis_projects
  add column if not exists owner_name        text,
  add column if not exists owner_email       text,
  add column if not exists owner_phone       text,
  add column if not exists project_manager   text,
  add column if not exists cover_image_url   text,
  add column if not exists created_by        uuid;

create index if not exists pmis_projects_status_idx on public.pmis_projects (status);

-- ---------------------------------------------------------------------------
-- 2) MILESTONES
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_milestones (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.pmis_projects(id) on delete cascade,
  name         text not null,
  due_date     date,
  completed_at date,
  weight       numeric(5,2) default 0,
  status       text not null default 'not_started',  -- not_started|in_progress|completed|delayed|blocked
  created_at   timestamptz not null default now()
);
create index if not exists pmis_milestones_project_idx on public.pmis_milestones (project_id);

-- ---------------------------------------------------------------------------
-- 3) TASKS  (extend tabel lama: tambah WBS, parent, bobot, prioritas, jadwal)
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.pmis_projects(id) on delete cascade,
  title        text not null,
  description  text,
  status       text not null default 'todo',  -- todo|in_progress|done (legacy) / not_started|in_progress|completed|delayed|blocked
  sort_order   int default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.pmis_tasks
  add column if not exists parent_id        uuid references public.pmis_tasks(id) on delete cascade,
  add column if not exists wbs_code         text,
  add column if not exists planned_start    date,
  add column if not exists planned_end      date,
  add column if not exists actual_start     date,
  add column if not exists actual_end       date,
  add column if not exists progress_percent numeric(5,2) not null default 0,
  add column if not exists weight           numeric(5,2) default 0,
  add column if not exists priority         text not null default 'medium', -- low|medium|high|critical
  add column if not exists assignee         text;
create index if not exists pmis_tasks_project_idx on public.pmis_tasks (project_id);
create index if not exists pmis_tasks_status_idx  on public.pmis_tasks (status);

-- ---------------------------------------------------------------------------
-- 4) PROJECT PHASES (SOP SRA 7 tahap) + auto-seed saat project dibuat
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_phases (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.pmis_projects(id) on delete cascade,
  phase_key     text not null,  -- brief|concept|dd|ded|tender|construction|bast
  name          text not null,
  sequence      int not null default 0,
  status        text not null default 'not_started',
  weight        numeric(5,2) not null default 0,
  planned_start date,
  planned_end   date,
  actual_start  date,
  actual_end    date,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (project_id, phase_key)
);
create index if not exists pmis_phases_project_idx on public.pmis_phases (project_id, sequence);

create or replace function public.pmis_seed_phases()
returns trigger language plpgsql as $$
begin
  insert into public.pmis_phases (project_id, phase_key, name, sequence, weight) values
    (new.id, 'brief',        '01 · Brief & Kick-Off',          1, 5),
    (new.id, 'concept',      '02 · Konsep Desain',             2, 15),
    (new.id, 'dd',           '03 · Design Development (DD)',   3, 20),
    (new.id, 'ded',          '04 · Detail Engineering Design', 4, 20),
    (new.id, 'tender',       '05 · Tender / Procurement',      5, 10),
    (new.id, 'construction', '06 · Konstruksi & Supervisi',    6, 25),
    (new.id, 'bast',         '07 · Closing & BAST',            7, 5)
  on conflict (project_id, phase_key) do nothing;
  return new;
end $$;

drop trigger if exists pmis_projects_seed_phases on public.pmis_projects;
create trigger pmis_projects_seed_phases after insert on public.pmis_projects
  for each row execute function public.pmis_seed_phases();

-- ---------------------------------------------------------------------------
-- 5) DELIVERABLES (Design Monitoring — extend tabel lama)
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_deliverables (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.pmis_projects(id) on delete cascade,
  phase_key    text not null,
  title        text not null,
  category     text default 'dokumen',
  status       text not null default 'todo',
  due_date     date,
  notes        text,
  sort_order   int default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.pmis_deliverables
  add column if not exists code        text,
  add column if not exists required    boolean not null default true,
  add column if not exists approved_at  timestamptz,
  add column if not exists file_url    text,
  add column if not exists created_by  uuid;
create index if not exists pmis_deliverables_project_idx on public.pmis_deliverables (project_id);
create index if not exists pmis_deliverables_phase_idx   on public.pmis_deliverables (phase_key);

-- ---------------------------------------------------------------------------
-- 6) REPORTS — Daily / Weekly / Monthly
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_daily_reports (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.pmis_projects(id) on delete cascade,
  report_date      date not null,
  weather          text,
  manpower_count   int default 0,
  work_summary     text,
  issues           text,
  next_day_plan    text,
  progress_percent numeric(5,2),
  status           text not null default 'draft',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint pmis_daily_reports_unique unique (project_id, report_date)
);
create index if not exists pmis_daily_project_idx on public.pmis_daily_reports (project_id);

create table if not exists public.pmis_weekly_reports (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.pmis_projects(id) on delete cascade,
  week_start       date not null,
  week_end         date not null,
  summary          text,
  planned_progress numeric(5,2),
  actual_progress  numeric(5,2),
  variance         numeric(5,2),
  status           text not null default 'draft',
  created_at       timestamptz not null default now()
);
create index if not exists pmis_weekly_project_idx on public.pmis_weekly_reports (project_id);

create table if not exists public.pmis_monthly_reports (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.pmis_projects(id) on delete cascade,
  month             date not null,
  executive_summary text,
  financial_summary jsonb default '{}'::jsonb,
  schedule_summary  jsonb default '{}'::jsonb,
  status            text not null default 'draft',
  created_at        timestamptz not null default now()
);
create index if not exists pmis_monthly_project_idx on public.pmis_monthly_reports (project_id);

-- ---------------------------------------------------------------------------
-- 7) FINANCE — Contracts / Invoices / Variation Orders
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_contracts (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.pmis_projects(id) on delete cascade,
  contract_no   text not null,
  title         text not null,
  counterparty  text,
  value         numeric(22,2) default 0,
  signed_date   date,
  start_date    date,
  end_date      date,
  status        text default 'active',
  document_url  text,
  created_at    timestamptz not null default now()
);
create index if not exists pmis_contracts_project_idx on public.pmis_contracts (project_id);

create table if not exists public.pmis_invoices (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.pmis_projects(id) on delete cascade,
  invoice_no   text not null,
  amount       numeric(22,2) not null default 0,
  tax_amount   numeric(22,2) default 0,
  issued_date  date,
  due_date     date,
  paid_date    date,
  status       text not null default 'pending',
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists pmis_invoices_project_idx on public.pmis_invoices (project_id);
create index if not exists pmis_invoices_status_idx  on public.pmis_invoices (status);

create table if not exists public.pmis_variation_orders (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references public.pmis_projects(id) on delete cascade,
  vo_no            text not null,
  title            text not null,
  description      text,
  amount           numeric(22,2) default 0,
  time_impact_days int default 0,
  status           text not null default 'submitted',
  submitted_date   date,
  approved_date    date,
  created_at       timestamptz not null default now()
);
create index if not exists pmis_vo_project_idx on public.pmis_variation_orders (project_id);

-- ---------------------------------------------------------------------------
-- 8) OPERATIONS — QAQC / HSE / Risks / Documents / Correspondence / Meetings / Photos
-- ---------------------------------------------------------------------------
create table if not exists public.pmis_qaqc_inspections (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.pmis_projects(id) on delete cascade,
  inspection_no   text,
  area            text,
  inspection_type text,
  result          text,
  inspected_date  date,
  inspector       text,
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists pmis_qaqc_project_idx on public.pmis_qaqc_inspections (project_id);

create table if not exists public.pmis_hse_incidents (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.pmis_projects(id) on delete cascade,
  incident_no       text,
  incident_date     date,
  severity          text not null default 'low',  -- low|medium|high|critical
  category          text,
  description       text,
  corrective_action text,
  status            text default 'open',
  created_at        timestamptz not null default now()
);
create index if not exists pmis_hse_project_idx on public.pmis_hse_incidents (project_id);

create table if not exists public.pmis_risks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.pmis_projects(id) on delete cascade,
  title       text not null,
  category    text,
  probability text not null default 'medium',
  impact      text not null default 'medium',
  mitigation  text,
  owner       text,
  status      text default 'open',
  created_at  timestamptz not null default now()
);
create index if not exists pmis_risks_project_idx on public.pmis_risks (project_id);

create table if not exists public.pmis_documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.pmis_projects(id) on delete cascade,
  doc_no      text,
  title       text not null,
  category    text,
  file_url    text,
  version     int default 1,
  uploaded_by text,
  created_at  timestamptz not null default now()
);
create index if not exists pmis_documents_project_idx on public.pmis_documents (project_id);

create table if not exists public.pmis_correspondence (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references public.pmis_projects(id) on delete cascade,
  ref_no         text,
  direction      text,
  subject        text not null,
  from_party     text,
  to_party       text,
  sent_date      date,
  body           text,
  attachment_url text,
  status         text not null default 'draft',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists pmis_correspondence_project_idx on public.pmis_correspondence (project_id);

create table if not exists public.pmis_meetings (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references public.pmis_projects(id) on delete cascade,
  title        text not null,
  meeting_date timestamptz,
  location     text,
  attendees    jsonb default '[]'::jsonb,
  agenda       text,
  minutes      text,
  action_items jsonb default '[]'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists pmis_meetings_project_idx on public.pmis_meetings (project_id);

create table if not exists public.pmis_site_photos (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.pmis_projects(id) on delete cascade,
  caption     text,
  photo_url   text not null,
  taken_at    timestamptz,
  source      text default 'site',
  geotag      jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists pmis_photos_project_idx on public.pmis_site_photos (project_id);

-- ---------------------------------------------------------------------------
-- 9) TRIGGERS updated_at (untuk tabel yang punya kolom updated_at)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'pmis_projects','pmis_tasks','pmis_phases','pmis_deliverables',
    'pmis_daily_reports','pmis_correspondence'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t||'_set_updated', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.pmis_set_updated_at()',
      t||'_set_updated', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 10) RLS — anon all (pola Kiro: tanpa Supabase Auth)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'pmis_projects','pmis_milestones','pmis_tasks','pmis_phases','pmis_deliverables',
    'pmis_daily_reports','pmis_weekly_reports','pmis_monthly_reports',
    'pmis_contracts','pmis_invoices','pmis_variation_orders',
    'pmis_qaqc_inspections','pmis_hse_incidents','pmis_risks',
    'pmis_documents','pmis_correspondence','pmis_meetings','pmis_site_photos'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||' anon all', t);
    execute format(
      'create policy %I on public.%I for all using (true) with check (true)',
      t||' anon all', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 11) STORAGE — bucket publik untuk lampiran/foto/cover PMIS
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('pmis-attachments', 'pmis-attachments', true)
on conflict (id) do nothing;

drop policy if exists "pmis-attachments anon read"   on storage.objects;
drop policy if exists "pmis-attachments anon write"  on storage.objects;
drop policy if exists "pmis-attachments anon update" on storage.objects;
drop policy if exists "pmis-attachments anon delete" on storage.objects;

create policy "pmis-attachments anon read" on storage.objects
  for select using (bucket_id = 'pmis-attachments');
create policy "pmis-attachments anon write" on storage.objects
  for insert with check (bucket_id = 'pmis-attachments');
create policy "pmis-attachments anon update" on storage.objects
  for update using (bucket_id = 'pmis-attachments') with check (bucket_id = 'pmis-attachments');
create policy "pmis-attachments anon delete" on storage.objects
  for delete using (bucket_id = 'pmis-attachments');

-- ============================================================================
-- SELESAI. Tabel PMIS siap dipakai dashboard "Project Command Center" di Kiro.
-- ============================================================================
