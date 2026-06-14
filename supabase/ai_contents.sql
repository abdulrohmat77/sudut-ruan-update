-- ============================================================
-- AI Content Engine — konten IG (caption + gambar) hasil generate AI.
-- Jalankan SQL ini di Supabase SQL Editor sekali saja.
-- ============================================================

create table if not exists public.ai_contents (
  id            uuid primary key default gen_random_uuid(),
  topic         text,                  -- brief/topik input user
  caption       text,                  -- caption hasil AI
  hashtags      text,                  -- hashtag hasil AI
  image_prompt  text,                  -- prompt gambar (buat regenerate)
  image_url     text,                  -- link gambar (Supabase Storage / Cloudinary)
  platform      text default 'instagram',
  status        text not null default 'draft',  -- draft | scheduled | posted | failed
  scheduled_at  timestamptz,           -- kapan dijadwalkan auto-post
  posted_at     timestamptz,           -- kapan benar-benar ter-post
  post_result   text,                  -- catatan hasil post / error
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ai_contents_status_idx    on public.ai_contents (status);
create index if not exists ai_contents_scheduled_idx on public.ai_contents (scheduled_at);
create index if not exists ai_contents_created_idx    on public.ai_contents (created_at desc);

-- Row Level Security
alter table public.ai_contents enable row level security;
drop policy if exists "ai_contents anon all" on public.ai_contents;
create policy "ai_contents anon all" on public.ai_contents for all using (true) with check (true);

-- ============================================================
-- STORAGE BUCKET untuk gambar konten (public read).
-- Jalankan ini juga supaya n8n bisa upload gambar.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('content-images', 'content-images', true)
on conflict (id) do nothing;

drop policy if exists "content-images public read" on storage.objects;
create policy "content-images public read"
  on storage.objects for select using (bucket_id = 'content-images');

drop policy if exists "content-images anon write" on storage.objects;
create policy "content-images anon write"
  on storage.objects for insert with check (bucket_id = 'content-images');
