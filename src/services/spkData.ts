// ============================================================
// SPK (Surat Perjanjian Kerja) domain data & helpers
// Sesuai template SRA-KB-TPL-SPK v2.0 — 9 pasal, termin 50/40/10.
// Self-contained (tanpa dependency eksternal) agar cocok dengan
// arsitektur dashboard kiro.
// ============================================================

export type SpkJenis =
  | 'Perancangan Arsitektur'
  | 'Perancangan Interior'
  | 'Perancangan Lanskap'
  | 'Design & Build'
  | 'Construction Supervision'
  | 'Project Management'

export type SpkKategori =
  | 'Membangun baru'
  | 'Renovasi'
  | 'Penambahan lantai'
  | 'Interior fit-out'

/**
 * Data awal untuk mengisi SPK dari dokumen lain (mis. dari AI Estimator).
 * Semua opsional — SpkBuilder akan memakai default bila tidak diisi.
 */
export interface SpkPrefill {
  clientName?: string
  clientPhone?: string
  projectName?: string
  jenisPekerjaan?: SpkJenis
  lokasi?: string
  luas?: string
  kategori?: SpkKategori
  programRuang?: string
  totalFee?: number
  durasiBulan?: number
}

/** Termin untuk prefill invoice (label/sub/persen). */
export interface InvoiceTerminPrefill {
  label: string
  sub: string
  percent: number
}

/**
 * Data awal untuk mengisi Invoice dari dokumen lain (mis. dari SPK).
 * Dikirim ke iframe template invoice lewat query param `data`.
 */
export interface InvoicePrefill {
  clientName?: string
  clientPhone?: string
  projectName?: string
  projectType?: string
  location?: string
  area?: string
  contractValue?: number
  termins?: InvoiceTerminPrefill[]
}

export const SPK_JENIS_OPTIONS: SpkJenis[] = [
  'Perancangan Arsitektur',
  'Perancangan Interior',
  'Perancangan Lanskap',
  'Design & Build',
  'Construction Supervision',
  'Project Management',
]

export const SPK_KATEGORI_OPTIONS: SpkKategori[] = [
  'Membangun baru',
  'Renovasi',
  'Penambahan lantai',
  'Interior fit-out',
]

// Data pihak kedua (studio) — sesuai template resmi SRA.
export const PRINCIPAL = {
  nama: 'M. Habib Arrohman I',
  studio: 'Sudut Ruang Arsitek / CV. Sudut Ruang Archineering',
  studioShort: 'Sudut Ruang Arsitek',
  jabatan: 'Principal Architect',
  alamat: 'Jl. Krukah Lama Buntu No. 09, Ngagel Rejo, Wonokromo, Surabaya 60245',
  hp: '082111115619',
  email: 'admin@sudutruang.com',
  web: 'www.sudutruang.com',
  ig: '@arsitek.surabaya',
  waDisplay: '+62 821-1111-5619',
  tagline: 'DESIGNING CORNERS · DEFINING SPACES',
  bank: {
    nama: 'Bank Central Asia (BCA)',
    rekening: '1300242622',
    an: 'M. Habib Arrohman I',
  },
}

export interface SpkTahap {
  no: number
  nama: string
  deskripsi: string
}

export const SPK_TAHAPAN: SpkTahap[] = [
  { no: 1, nama: 'Diskusi Awal', deskripsi: 'Diskusi bersama pemilik untuk menentukan arah desain dan program ruang. Output: sketsa denah, massing 3D, gambar ide & preseden.' },
  { no: 2, nama: 'Perencanaan Schematic (ARS)', deskripsi: 'Denah teknik, tampak, potongan X & Y, rencana atap (skala 1:100/150), perspektif 3D.' },
  { no: 3, nama: 'Design Development (ARS)', deskripsi: 'Denah, tampak, potongan, rencana atap & detail tangga tersinkronisasi. Dapat dipakai untuk pengurusan IMB/PBG.' },
  { no: 4, nama: 'Detail Drawing (ARS) & RAB', deskripsi: 'Gambar kerja lengkap (pola lantai, plafon, elektrikal, detail kusen/fasad) beserta Rencana Anggaran Biaya.' },
  { no: 5, nama: 'Pendampingan Lapangan (Field/ARS)', deskripsi: 'Penerbitan MOM tiap pertemuan, pendampingan pelaksanaan, dan dokumentasi proyek.' },
]

export const SPK_EXCLUSIONS: string[] = [
  'Pengurusan perizinan (IMB/PBG)',
  'Pengukuran & survei lahan',
  'Tes tanah (soil investigation)',
  'Shop drawing untuk kebutuhan kontraktor',
  'As-built drawing',
  'Graphic design (logo, signage, dll.)',
  'Penjadwalan pelaksanaan lapangan (time table)',
]

export interface SpkGuardrail {
  code: string
  label: string
  tone: 'ok' | 'bad'
}

export const SPK_GUARDRAILS: SpkGuardrail[] = [
  { code: 'DO-01', label: 'Pastikan nomor SPK unik & berurutan tiap bulan.', tone: 'ok' },
  { code: 'DO-02', label: 'Total termin wajib 100% sebelum generate PDF.', tone: 'ok' },
  { code: 'DO-03', label: 'Cantumkan lingkup pekerjaan & batasan dengan jelas.', tone: 'ok' },
  { code: 'DO-04', label: 'Verifikasi nama & alamat klien sesuai identitas resmi.', tone: 'ok' },
  { code: 'DON-01', label: 'Jangan kirim SPK tanpa nilai fee atau klien kosong.', tone: 'bad' },
  { code: 'DON-02', label: 'Jangan ubah persentase termin tanpa persetujuan.', tone: 'bad' },
  { code: 'DON-03', label: 'Jangan janjikan lingkup di luar 5 tahap pekerjaan.', tone: 'bad' },
  { code: 'DON-04', label: 'Jangan lewati checklist QA pra-kirim.', tone: 'bad' },
]

export const SPK_QA_CHECKLIST: string[] = [
  'Nomor SPK sudah benar dan unik.',
  'Identitas Pihak Pertama (klien) sudah diverifikasi.',
  'Nama proyek, lokasi, dan luas lahan sudah sesuai.',
  'Total fee dan termin 50/40/10 sudah tepat (total 100%).',
  'Durasi pengerjaan sudah disepakati kedua pihak.',
  'Lingkup pekerjaan & pengecualian sudah dikomunikasikan.',
]

export interface SpkTermin {
  kode: string
  label: string
  trigger: string
  pct: number
  nominal: number
}

/** Input termin yang bisa diedit pengguna (tanpa kode & nominal). */
export interface SpkTerminInput {
  label: string
  trigger: string
  pct: number
  /** Bila true, persen baris ini dihitung otomatis dari sisa (100% - total manual). */
  auto?: boolean
}

/** Template default termin SRA: DP 30% · Schematic+DD 30% · Detail Drawing+RAB 30% · sisa otomatis (10%). */
export const DEFAULT_TERMINS: SpkTerminInput[] = [
  { label: 'Down Payment / Uang Muka', trigger: 'Saat penandatanganan SPK', pct: 30, auto: false },
  { label: 'Termin 1 — Schematic & Design Development (ARS)', trigger: 'Penyelesaian Tahap 2 & 3A', pct: 30, auto: false },
  { label: 'Termin 2 — Detail Drawing (ARS) & RAB', trigger: 'Penyelesaian Tahap 3B', pct: 30, auto: false },
  { label: 'Termin 3', trigger: 'Pendampingan lapangan / penyerahan akhir', pct: 10, auto: true },
]

/**
 * Bangun daftar termin (kode + persen terselesaikan + nominal) dari baris editable.
 * Baris dengan `auto: true` berbagi rata sisa persen (100% - total persen manual).
 */
export function buildTermins(rows: SpkTerminInput[], total: number): SpkTermin[] {
  const t = Number.isFinite(total) ? total : 0
  const manualSum = rows.reduce((s, r) => s + (r.auto ? 0 : (Number.isFinite(r.pct) ? r.pct : 0)), 0)
  const autoCount = rows.filter((r) => r.auto).length
  const leftover = 100 - manualSum
  const perAuto = autoCount > 0 && leftover > 0 ? leftover / autoCount : 0
  let autoSeen = 0

  return rows.map((r, i) => {
    let pct: number
    if (r.auto) {
      autoSeen++
      // Baris auto terakhir menyerap sisa pembulatan agar total auto = leftover.
      pct = autoSeen === autoCount ? Math.max(0, leftover - perAuto * (autoCount - 1)) : Math.max(0, perAuto)
    } else {
      pct = Number.isFinite(r.pct) ? r.pct : 0
    }
    pct = Math.round(pct * 100) / 100
    return {
      kode: `TR-${i + 1}`,
      label: r.label,
      trigger: r.trigger,
      pct,
      nominal: Math.round((t * pct) / 100),
    }
  })
}

/** Termin pembayaran standar SRA: 50% / 40% / 10%. */
export function computeSpkTermins(total: number): SpkTermin[] {
  return buildTermins(DEFAULT_TERMINS, total)
}

/** Nomor SPK otomatis sesuai format SRA: {seq}/EXT-Dir/SPK.PA/{romawi-bulan}/{tahun}. */
export function generateSpkNumber(seq: number): string {
  const now = new Date()
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  const seqStr = String(seq).padStart(3, '0')
  return `${seqStr}/EXT-Dir/SPK.PA/${roman[now.getMonth()]}/${now.getFullYear()}`
}

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

export function formatTanggalIndo(date: Date = new Date()) {
  return {
    hari: HARI_ID[date.getDay()],
    tanggal: String(date.getDate()),
    bulan: BULAN_ID[date.getMonth()],
    tahun: String(date.getFullYear()),
  }
}

// ── Terbilang (angka -> kata bahasa Indonesia) ──────────────
const SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas']

function terbilangRec(n: number): string {
  n = Math.floor(Math.abs(n))
  if (n < 12) return SATUAN[n]
  if (n < 20) return terbilangRec(n - 10) + ' belas'
  if (n < 100) return terbilangRec(Math.floor(n / 10)) + ' puluh ' + terbilangRec(n % 10)
  if (n < 200) return 'seratus ' + terbilangRec(n - 100)
  if (n < 1000) return terbilangRec(Math.floor(n / 100)) + ' ratus ' + terbilangRec(n % 100)
  if (n < 2000) return 'seribu ' + terbilangRec(n - 1000)
  if (n < 1_000_000) return terbilangRec(Math.floor(n / 1000)) + ' ribu ' + terbilangRec(n % 1000)
  if (n < 1_000_000_000) return terbilangRec(Math.floor(n / 1_000_000)) + ' juta ' + terbilangRec(n % 1_000_000)
  if (n < 1_000_000_000_000) return terbilangRec(Math.floor(n / 1_000_000_000)) + ' miliar ' + terbilangRec(n % 1_000_000_000)
  return terbilangRec(Math.floor(n / 1_000_000_000_000)) + ' triliun ' + terbilangRec(n % 1_000_000_000_000)
}

/** Mengubah angka menjadi kata (mis. 192000000 -> "Seratus sembilan puluh dua juta rupiah"). */
export function terbilang(n: number): string {
  if (!Number.isFinite(n) || n === 0) return 'Nol rupiah'
  const words = terbilangRec(n).replace(/\s+/g, ' ').trim()
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1)
  return `${capitalized} rupiah`
}

export function formatIDR(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  )
}
