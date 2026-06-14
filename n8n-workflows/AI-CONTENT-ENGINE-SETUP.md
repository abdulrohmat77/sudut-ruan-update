# AI Content Engine — Setup n8n

Fitur ini generate konten Instagram (caption + hashtag + gambar) pakai AI,
disimpan ke Supabase, lalu auto-post lewat cron.

## Yang dibutuhkan
1. Jalankan SQL `kiro/supabase/ai_contents.sql` di Supabase SQL Editor
   (bikin tabel `ai_contents` + storage bucket `content-images`).
2. Buat 2 workflow di n8n: **WF-8 Generate** dan **WF-9 Auto-Post**.

---

## WF-8 · GENERATE CONTENT  (webhook: `/generate-content`)

Dipanggil dari dashboard saat user klik "Generate".

```
[Webhook /generate-content]   POST { topic, tone, platform }
        │
        ▼
[AI Agent — Google Gemini]    Prompt: buat caption IG + hashtag + image_prompt
        │   (output JSON: { caption, hashtags, image_prompt })
        ▼
[Code]                        parse JSON dari output AI
        │
        ▼
[HTTP Request — Image Gen]    generate gambar dari image_prompt
        │   Pilih salah satu:
        │   • OpenAI Images  POST https://api.openai.com/v1/images/generations
        │       body: { model:"gpt-image-1", prompt: image_prompt, size:"1024x1024" }
        │   • Google Imagen (Gemini API)
        │   • Replicate / Stable Diffusion
        │   → hasil: binary image atau base64
        ▼
[Supabase — Upload to Storage]  upload gambar ke bucket "content-images"
        │   pakai HTTP Request:
        │   POST {SUPABASE_URL}/storage/v1/object/content-images/{filename}.png
        │   header: Authorization: Bearer {SERVICE_ROLE_KEY}, Content-Type: image/png
        │   → public URL: {SUPABASE_URL}/storage/v1/object/public/content-images/{filename}.png
        ▼
[Respond to Webhook]          MODE: Text
        {{ JSON.stringify({ data: {
            caption: $('Code').item.json.caption,
            hashtags: $('Code').item.json.hashtags,
            image_prompt: $('Code').item.json.image_prompt,
            image_url: $('Upload').item.json.publicUrl
        }}) }}
```

### Prompt AI Agent (System / User):
```
Kamu social media manager studio arsitektur Sudut Ruang Arsitek.
Buat 1 konten Instagram dari topik: {{ $json.body.topic }}
Tone: {{ $json.body.tone }}

Output WAJIB JSON valid (tanpa markdown):
{
  "caption": "caption menarik 3-5 kalimat, ada hook di awal, ada CTA di akhir",
  "hashtags": "8-12 hashtag relevan dipisah spasi, diawali #",
  "image_prompt": "prompt bahasa Inggris untuk generate gambar, gaya fotografi arsitektur profesional, deskriptif"
}
```

> Catatan: kalau Respond pakai mode JSON error "Invalid JSON", pakai mode **Text**
> dengan `JSON.stringify(...)` seperti contoh di atas (sama seperti AI Analyst).

---

## WF-9 · AUTO-POST  (Schedule Trigger — cron)

Cek konten terjadwal tiap 15 menit, lalu post ke Instagram.

```
[Schedule Trigger]            tiap 15 menit (atau cron: */15 * * * *)
        │
        ▼
[Supabase — Get Rows]         GET ai_contents
        │   filter: status = 'scheduled' AND scheduled_at <= now()
        │   (REST: {SUPABASE_URL}/rest/v1/ai_contents?status=eq.scheduled&scheduled_at=lte.{{now}})
        ▼
[Loop Over Items]
        │
        ▼
[Instagram Graph API]         2 langkah posting IG:
        │   1. POST /{ig-user-id}/media
        │      body: { image_url, caption: caption + "\n\n" + hashtags }
        │      → dapat creation_id
        │   2. POST /{ig-user-id}/media_publish
        │      body: { creation_id }
        ▼
[Supabase — Update Row]        PATCH ai_contents/{id}
        │   set status='posted', posted_at=now()
        │   (kalau error → status='failed', post_result=error)
```

### Alternatif cron langsung dari Supabase (pg_cron):
Kalau mau cron dari Supabase (bukan n8n Schedule), bisa pakai `pg_cron` +
`pg_net` untuk memanggil webhook n8n `/auto-post` tiap 15 menit:
```sql
-- aktifkan extension dulu di Supabase
select cron.schedule(
  'auto-post-ig', '*/15 * * * *',
  $$ select net.http_post(
       url := 'https://n8n.srv1696073.hstgr.cloud/webhook/auto-post',
       headers := '{"Content-Type":"application/json"}'::jsonb,
       body := '{}'::jsonb
     ); $$
);
```
Lalu WF-9 pakai Webhook trigger `/auto-post` (bukan Schedule Trigger).

---

## Endpoint yang dipakai dashboard
- Generate: `POST {base}/generate-content` → balas `{ data: { caption, hashtags, image_prompt, image_url } }`

Dashboard menyimpan hasilnya ke tabel `ai_contents` (status `draft`),
user lalu menjadwalkan (`scheduled` + `scheduled_at`), dan WF-9 yang auto-post.

## Catatan keamanan
- SERVICE_ROLE_KEY hanya dipakai di n8n (server side), JANGAN di frontend.
- Instagram posting butuh IG Business account + Facebook Page + akses token Graph API
  (sama seperti setup webhook Instagram Trigger yang sudah ada).

---

## ⚡ CARA CEPAT (import file workflow)

Dua file siap import sudah dibuat:
- `workflow-8-content-generate.json` — WF-8 Generate
- `workflow-9-content-autopost.json` — WF-9 Auto-Post

### Langkah:
1. **Supabase**: jalankan `kiro/supabase/ai_contents.sql` di SQL Editor.
2. **n8n** → menu (☰) → **Import from File** → pilih `workflow-8-content-generate.json`.
   - Buka node **Gemini — Caption & Prompt** → set credential Header Auth:
     `Name: x-goog-api-key`, `Value: <GEMINI_API_KEY>`.
   - **Activate** workflow (toggle hijau).
   - Copy **Production URL** node Webhook → harus `.../webhook/generate-content`.
   - Pastikan base URL sama dengan yang di dashboard (Settings → webhook URL).
3. **n8n** → Import `workflow-9-content-autopost.json` (untuk auto-post).
   - Ganti semua `GANTI_PROJECT` → ref project Supabase kamu.
   - Set credential Header Auth `Supabase Service Role`:
     `Name: apikey`, `Value: <SERVICE_ROLE_KEY>`, dan tambah header
     `Authorization: Bearer <SERVICE_ROLE_KEY>` di Options.
   - Ganti `GANTI_IG_USER_ID` + `GANTI_IG_ACCESS_TOKEN` (Instagram Graph API).
   - **Activate** workflow.

### Test cepat WF-8 (tanpa dashboard):
```bash
curl -X POST https://n8n.srv1696073.hstgr.cloud/webhook/generate-content \
  -H "Content-Type: application/json" \
  -d '{"topic":"Tips desain dapur minimalis tropis","tone":"inspiratif"}'
```
Harus balas: `{ "data": { "caption": "...", "hashtags": "...", "image_prompt": "...", "image_url": "https://image.pollinations.ai/..." } }`

### Catatan gambar
- Default pakai **Pollinations.ai** (gratis, tanpa API key) — `image_url` langsung jadi.
- Mau gambar HD/permanen? Ganti node **Parse + Image URL** di WF-8 dengan:
  OpenAI `gpt-image-1` (atau Imagen) → upload base64 ke Supabase Storage bucket
  `content-images` → pakai publicUrl-nya. (lihat blueprint WF-8 di atas)
