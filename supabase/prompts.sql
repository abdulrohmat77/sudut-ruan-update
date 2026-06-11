-- ============================================================
-- MIGRATION — Tabel PROMPTS
-- Jalankan di Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- 1. Buat tabel
create table if not exists public.prompts (
  key text primary key,             -- identifier unik (e.g. system_prompt)
  title text not null,              -- nama tampilan di dashboard
  content text not null default '', -- isi prompt
  description text,                 -- keterangan singkat
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- 2. Seed prompt default
insert into public.prompts (key, title, content, description) values
(
  'system_prompt',
  'Prompt Utama AI',
  'Kamu adalah asisten AI Sudut Ruang, jasa desain arsitektur & interior. Balas dengan ramah, profesional, dan to the point dalam Bahasa Indonesia. Bantu calon klien soal estimasi harga, proposal, dan pertanyaan proyek.',
  'Prompt sistem utama yang dipakai AI untuk membalas chat'
)
on conflict (key) do nothing;

-- 3. Row Level Security
alter table public.prompts enable row level security;

drop policy if exists "public read prompts" on public.prompts;
create policy "public read prompts" on public.prompts for select using (true);

drop policy if exists "anon insert prompts" on public.prompts;
create policy "anon insert prompts" on public.prompts for insert with check (true);

drop policy if exists "anon update prompts" on public.prompts;
create policy "anon update prompts" on public.prompts for update using (true) with check (true);

drop policy if exists "anon delete prompts" on public.prompts;
create policy "anon delete prompts" on public.prompts for delete using (true);
