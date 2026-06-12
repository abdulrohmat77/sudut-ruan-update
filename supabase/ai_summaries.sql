-- ============================================================
-- AI Summaries — hasil rangkuman percakapan oleh AI Analyst.
-- Jalankan SQL ini di Supabase (SQL Editor) sekali saja.
-- 1 baris per percakapan (conversation_id unik) → bisa di-upsert.
-- ============================================================

create table if not exists public.ai_summaries (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text not null,
  tanggal         text,
  nama            text,
  phone           text,
  channel         text,
  project_type    text,
  lokasi          text,
  luas_m2         text,
  estimasi_value  text,
  status          text,           -- Hot / Warm / Cold / Closing
  design_stage    text,
  progress_pct    text,
  ringkasan       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint ai_summaries_conversation_id_key unique (conversation_id)
);

create index if not exists ai_summaries_status_idx   on public.ai_summaries (status);
create index if not exists ai_summaries_updated_idx  on public.ai_summaries (updated_at desc);

-- Row Level Security: izinkan akses lewat anon key (samakan dengan tabel lain).
alter table public.ai_summaries enable row level security;

drop policy if exists "ai_summaries anon all" on public.ai_summaries;
create policy "ai_summaries anon all"
  on public.ai_summaries
  for all
  using (true)
  with check (true);
