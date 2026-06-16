-- ============================================================
-- AI Skills (Knowledge Base) — skill/keterampilan AI yang bisa
-- diupload tim. Tiap skill bisa berisi konten teks dan/atau file
-- (mis. .docx, .pdf, .txt, .md).
-- Jalankan SEKALI di Supabase SQL Editor (project CRM).
-- Idempotent: aman dijalankan ulang.
-- ============================================================

create table if not exists public.ai_skills (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  content      text,                    -- isi skill (boleh kosong kalau cuma upload file)
  category     text,                    -- mis. "Sales", "Desain", "SOP"
  tags         text[] default '{}',
  file_url     text,                    -- public URL di bucket ai-skills
  file_name    text,
  file_type    text,                    -- mis. "docx", "pdf", "txt", "md"
  file_size    bigint,
  is_active    boolean not null default true,
  created_by   text,                    -- nama user (opsional)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists ai_skills_active_idx  on public.ai_skills (is_active);
create index if not exists ai_skills_created_idx on public.ai_skills (created_at desc);

-- Trigger updated_at
create or replace function public.ai_skills_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists ai_skills_set_updated_at on public.ai_skills;
create trigger ai_skills_set_updated_at before update on public.ai_skills
  for each row execute function public.ai_skills_set_updated_at();

-- RLS: anon-all (pola kiro, tanpa Supabase Auth)
alter table public.ai_skills enable row level security;
drop policy if exists "ai_skills anon all" on public.ai_skills;
create policy "ai_skills anon all" on public.ai_skills
  for all to anon, authenticated using (true) with check (true);

-- ============================================================
-- Storage bucket untuk file skill (docx/pdf/txt/md)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('ai-skills', 'ai-skills', true)
on conflict (id) do nothing;

drop policy if exists "ai-skills anon read"   on storage.objects;
drop policy if exists "ai-skills anon write"  on storage.objects;
drop policy if exists "ai-skills anon update" on storage.objects;
drop policy if exists "ai-skills anon delete" on storage.objects;

create policy "ai-skills anon read"   on storage.objects for select using (bucket_id = 'ai-skills');
create policy "ai-skills anon write"  on storage.objects for insert with check (bucket_id = 'ai-skills');
create policy "ai-skills anon update" on storage.objects for update using (bucket_id = 'ai-skills') with check (bucket_id = 'ai-skills');
create policy "ai-skills anon delete" on storage.objects for delete using (bucket_id = 'ai-skills');
