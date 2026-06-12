# WF-7 · AI Analyst — Rangkuman Percakapan → Spreadsheet

Fitur di dashboard: panel **AI Analyst** di kanan halaman **Active Chats**.
Tombol **Generate Rangkuman** → AI merangkum percakapan jadi data terstruktur →
tombol **Kirim ke Spreadsheet** → 1 baris masuk ke Google Sheet.

## Alur
```
Dashboard → POST {base}/analyze-conversation → Gemini (JSON) → balas ke dashboard
Dashboard → POST {base}/save-to-sheet        → Google Sheets Append Row
```

## Yang perlu disiapkan
1. **Import** `workflow-7-ai-analyst.json` ke n8n, lalu **Activate**.
2. **Kredensial Gemini** (Header Auth): node "Gemini — Summarize" → buat credential
   **Header Auth** dengan Name `x-goog-api-key` dan Value `<GEMINI_API_KEY>`
   (ambil API key gratis di Google AI Studio). Model default `gemini-2.0-flash`
   (bisa diganti `gemini-1.5-flash`).
3. **Kredensial Google Sheets** (OAuth) — bisa pakai "Google Sheets PRIBADI" yang sudah ada.
4. Node **Google Sheets — Append Row**:
   - `documentId` → ganti `GANTI_DENGAN_SPREADSHEET_ID` dengan Spreadsheet ID milikmu.
   - `sheetName` → nama tab (default `Sheet1`).
5. **Header kolom di sheet** harus sama persis dengan mapping:
   `Tanggal | Nama | Phone | Channel | Project Type | Lokasi | Luas | Estimasi Value | Status | Design Stage | Progress | Ringkasan AI`
6. Pastikan **base URL** webhook n8n sama dengan yang di dashboard (Settings → webhook_url).

## Output AI (JSON)
```json
{
  "tanggal": "21/05/2026", "nama": "...", "phone": "...", "channel": "WhatsApp",
  "project_type": "Rumah Baru", "lokasi": "Surabaya", "luas_m2": 120,
  "estimasi_value": 800000000, "status": "Hot",
  "design_stage": "Desain Skematik", "progress_pct": 25,
  "ringkasan": "..."
}
```

## Catatan
- Status: **Cold** (inquiry) · **Warm** (pertimbangan) · **Hot** (siap deal) · **Closing** (deal/kontrak).
- Hasil analisa juga disimpan ke `conversations.metadata.aiAnalysis` di Supabase,
  jadi tetap tampil saat halaman di-refresh tanpa generate ulang.
- Endpoint terpisah (`/analyze-conversation` & `/save-to-sheet`) supaya kamu bisa
  **review/ubah** sebelum benar-benar kirim ke spreadsheet.

## Tampilan di Dashboard (untuk klien)
Saat user menekan **Generate Rangkuman** di panel AI Analyst, hasilnya otomatis
disimpan ke `conversations.metadata.aiAnalysis` (Supabase). Data itu langsung tampil di
**Dashboard → panel "Data Customer & Progress (AI Summary)"**
(tabel: Tanggal, Nama, Channel, Proyek, Lokasi, Luas, Estimasi, Status, Tahap, Progress, Ringkasan).
Jadi klien bisa lihat langsung di dashboard tanpa harus buka spreadsheet — **tanpa perlu cron**,
cukup ditekan saat dibutuhkan.
