-- ============================================================
-- PMIS Delivery — Design Monitoring (deliverables per tahap desain)
-- Jalankan SQL ini di Supabase SQL Editor sekali saja.
-- ============================================================

create table if not exists public.pmis_deliverables (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.pmis_projects(id) on delete cascade,
  phase_key       text not null,  -- konsep | schematic | dd | detail | final
  title           text not null,
  category        text default 'dokumen', -- dokumen | gambar | laporan | ba | administrasi
  status          text not null default 'todo', -- todo | in_progress | in_review | approved | revisi
  due_date        date,
  notes           text,
  sort_order      int default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists pmis_deliverables_project_idx on public.pmis_deliverables (project_id);
create index if not exists pmis_deliverables_phase_idx on public.pmis_deliverables (phase_key);

alter table public.pmis_deliverables enable row level security;
drop policy if exists "pmis_deliverables anon all" on public.pmis_deliverables;
create policy "pmis_deliverables anon all" on public.pmis_deliverables for all using (true) with check (true);
