// ============================================================
// Builder dokumen SPK siap-cetak (A4) — Sudut Ruang Arsitek.
// Poin & struktur mengikuti template resmi (SPK Jasa Perencanaan
// Arsitektur — Lump Sum Fixed Price), lengkap 9 pasal + logo SRA.
// Hanya halaman SPK, tanpa UI dashboard.
// ============================================================

import { PRINCIPAL, terbilang, formatIDR, type SpkTermin } from './spkData'

export interface SpkDocVars {
  NO_SPK: string
  HARI: string
  TANGGAL: string
  BULAN: string
  TAHUN: string
  NAMA_KLIEN: string
  ALAMAT_KLIEN: string
  HP_KLIEN: string
  KAPASITAS_KLIEN: string
  NAMA_PROYEK: string
  JENIS_PEKERJAAN: string
  LOKASI_PROYEK: string
  LUAS_LAHAN: string
  KATEGORI: string
  PROGRAM_RUANG: string
  TOTAL_FEE: number
  DURASI_BULAN: number
  INCLUDE_RAB: boolean
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function nl2br(s: string): string {
  return esc(s).replace(/\n/g, '<br/>')
}

function labelRow(label: string, value: string): string {
  return `<tr><td class="lbl">${esc(label)}</td><td class="sep">:</td><td class="val">${esc(value)}</td></tr>`
}

function bullets(items: string[]): string {
  return `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>`
}

// Logo resmi SRA — dilayani dari /public (lihat kiro/public/logo-main.png).
const SRA_LOGO_SRC = '/logo-main.png'

function terminTableRows(termins: SpkTermin[], total: number): string {
  const body = termins
    .map(
      (t, i) => `
      <tr>
        <td class="num">${i + 1}.</td>
        <td>${esc(t.label)}${t.trigger ? `<div class="sub">${esc(t.trigger)}</div>` : ''}</td>
        <td class="center">${t.pct}%</td>
        <td class="right">${esc(formatIDR(t.nominal))}</td>
      </tr>`,
    )
    .join('')
  return `${body}
      <tr class="grand">
        <td></td><td><b>GRAND TOTAL</b></td>
        <td class="center"><b>100%</b></td>
        <td class="right"><b>${esc(formatIDR(total))}</b></td>
      </tr>`
}

export function buildSpkDocumentHtml(v: SpkDocVars, termins: SpkTermin[], embedded = false): string {
  const tanggal = `${esc(v.HARI)}, ${esc(v.TANGGAL)} ${esc(v.BULAN)} ${esc(v.TAHUN)}`
  const durasiKata = terbilang(v.DURASI_BULAN).replace(/ rupiah$/i, '').toLowerCase()
  const detailDrawingItems = [
    'Rencana pola lantai — Skala 1:100',
    'Rencana plafon & titik lampu — Skala 1:100',
    'Rencana stop kontak & elektrikal — Skala 1:100',
    'Detail railing & tangga — Skala 1:25, 1:20',
    'Detail kamar mandi & WC — Skala 1:25',
    'Detail fasad tampak — Skala 1:50',
    'Rencana kusen, daun pintu & jendela — Skala 1:50, 1:20',
    'Detail arsitektur lainnya — Skala 1:5, 1:10, 1:20',
  ]
  if (v.INCLUDE_RAB) detailDrawingItems.push('Rencana Anggaran Biaya (RAB)')

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>SPK ${esc(v.NO_SPK)} — ${esc(v.NAMA_PROYEK)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  :root {
    --navy: #043666; --royal: #0A3863; --bright: #045D93;
    --sky: #4AB3D8; --sky-soft: #5EC2E4; --light: #E1F0F8;
    --ivory: #FEFEFE; --ink: #0A3863; --muted: #777777; --hair: #d9e4ee;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #eef2f7; }
  body { font-family: 'Montserrat', sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; font-size: 10.5px; }
  .mono { font-family: 'JetBrains Mono', monospace; }

  .toolbar { position: sticky; top: 0; z-index: 20; display: flex; gap: 8px; justify-content: center; padding: 12px; background: var(--navy); }
  .toolbar .btn { padding: 9px 20px; border: none; border-radius: 3px; font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; cursor: pointer; background: var(--sky); color: var(--navy); }
  .toolbar .btn:hover { background: var(--sky-soft); }
  .toolbar .btn.ghost { background: transparent; color: var(--ivory); border: 1px solid rgba(255,255,255,0.3); }

  .preview-pane { padding: 24px; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .page { width: 210mm; min-height: 297mm; background: var(--ivory); padding: 15mm 15mm 12mm; box-shadow: 0 8px 40px rgba(4,54,102,0.18); position: relative; }
  .page::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #5EC2E4 0%, #4AB3D8 32%, #045D93 100%); }

  .logo-wrap { text-align: center; }
  .sra-logo { height: 64px; width: auto; max-width: 75%; object-fit: contain; }
  .rule { height: 1px; background: var(--hair); margin: 8px 0 6px; }
  .rule.strong { height: 2px; background: linear-gradient(90deg, var(--sky), var(--bright)); opacity: 0.5; }

  .title { text-align: center; margin-top: 6px; }
  .title h1 { font-size: 21px; font-weight: 800; color: var(--navy); letter-spacing: 1px; text-transform: uppercase; }
  .title .s1 { font-size: 12px; color: var(--bright); font-style: italic; margin-top: 3px; }
  .title .s2 { font-size: 9.5px; color: var(--muted); margin-top: 1px; }

  .docnum { text-align: center; background: #F0F6FA; border: 1px solid var(--hair); padding: 7px; margin: 12px 0; font-weight: 700; }
  .docnum .l { color: var(--bright); }
  .docnum .v { color: var(--navy); font-family: 'JetBrains Mono', monospace; }

  h2.pasal { font-size: 12px; font-weight: 800; color: var(--navy); text-transform: uppercase; letter-spacing: 0.04em; margin: 14px 0 6px; padding-bottom: 4px; border-bottom: 2px solid var(--sky); page-break-after: avoid; }
  h3.sub { font-size: 11px; font-weight: 700; color: var(--bright); margin: 10px 0 4px; }
  h4.sub2 { font-size: 10.5px; font-weight: 700; color: var(--royal); margin: 8px 0 3px; }
  p { font-size: 10.5px; line-height: 1.7; color: var(--ink); text-align: justify; margin-bottom: 6px; }
  p.note { font-style: italic; color: var(--bright); }
  .lead { margin-bottom: 10px; }

  table.kv { border-collapse: collapse; margin: 2px 0 8px; }
  table.kv td { padding: 2px 4px; font-size: 10.5px; vertical-align: top; }
  table.kv td.lbl { color: var(--muted); font-weight: 600; width: 130px; }
  table.kv td.sep { color: var(--muted); width: 8px; }
  table.kv td.val { color: var(--navy); font-weight: 600; }
  .disebut { font-weight: 600; color: var(--royal); margin: 2px 0 10px; }

  ul { margin: 2px 0 8px 18px; }
  li { font-size: 10.5px; line-height: 1.65; color: var(--ink); margin-bottom: 3px; text-align: justify; }

  .pasal-block { page-break-inside: avoid; }

  .value-box { text-align: center; background: #EBF5FB; border: 1px solid var(--hair); padding: 10px; margin: 6px 0; }
  .value-box .l { font-size: 12px; font-weight: 700; color: var(--bright); }
  .value-box .v { font-size: 18px; font-weight: 800; color: var(--navy); font-family: 'JetBrains Mono', monospace; }
  .value-box .terbilang { font-size: 10px; color: var(--royal); font-style: italic; margin-top: 3px; }

  table.items { width: 100%; border-collapse: collapse; margin: 6px 0; }
  table.items thead { background: var(--navy); }
  table.items thead th { color: var(--ivory); font-size: 8px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; padding: 7px 8px; text-align: left; }
  table.items thead th.center { text-align: center; }
  table.items thead th.right { text-align: right; }
  table.items tbody td { padding: 7px 8px; font-size: 10px; color: var(--navy); border-bottom: 1px solid var(--hair); vertical-align: top; }
  table.items tbody td.num { color: var(--sky); font-weight: 700; width: 30px; }
  table.items tbody td.center { text-align: center; }
  table.items tbody td.right { text-align: right; font-family: 'JetBrains Mono', monospace; }
  table.items tbody td .sub { font-size: 8px; color: var(--muted); margin-top: 2px; }
  table.items tbody tr.grand td { background: var(--light); border-bottom: none; font-size: 10.5px; }

  .pay-box { margin: 6px 0; padding: 4mm 5mm; background: var(--navy); color: var(--ivory); border-radius: 3px; }
  .pay-box .h { font-size: 8px; font-weight: 700; letter-spacing: 0.2em; color: var(--sky); text-transform: uppercase; margin-bottom: 4px; }
  .pay-box .bnum { font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 600; letter-spacing: 0.06em; }
  .pay-box .small { font-size: 9px; color: rgba(255,255,255,0.7); }

  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 14mm; margin-top: 6mm; page-break-inside: avoid; }
  .sign .col { text-align: left; }
  .sign .role { font-size: 11px; font-weight: 800; color: var(--navy); }
  .sign .meterai { font-size: 9.5px; color: var(--muted); font-style: italic; margin-top: 2px; }
  .sign .space { height: 24mm; }
  .sign .name { font-size: 11px; font-weight: 800; color: var(--navy); }
  .sign .pos { font-size: 9.5px; color: var(--bright); }
  .sign .studio { font-size: 9.5px; color: var(--bright); }

  .footer { margin-top: 8mm; padding-top: 5px; border-top: 1px solid var(--hair); text-align: center; }
  .footer .l1 { font-size: 9px; color: var(--navy); }
  .footer .l1 b { color: var(--navy); }
  .footer .l2 { font-size: 9px; color: var(--muted); margin-top: 2px; }
  .footer .l3 { font-size: 8.5px; color: var(--sky); letter-spacing: 0.2em; text-transform: uppercase; margin-top: 4px; font-weight: 600; }

  @page { size: A4; margin: 15mm 14mm; }
  @media print {
    html, body { background: #fff !important; }
    .toolbar { display: none !important; }
    .preview-pane { padding: 0; }
    /* Biarkan konten mengalir natural; margin halaman diatur oleh @page agar
       SEMUA halaman (bukan hanya halaman 1) punya tepi yang sama. */
    .page { box-shadow: none !important; margin: 0; padding: 0; width: auto; min-height: 0; }
    .page::before { display: none; }
    h2.pasal, h3.sub, h4.sub2 { page-break-after: avoid; break-after: avoid; }
    .pasal-block, table.items, table.kv, .value-box, .pay-box, .docnum, .sign, .footer, .logo-wrap, .title, ul, li, p {
      page-break-inside: avoid; break-inside: avoid;
    }
    table.items thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
  }
  ${embedded ? '.toolbar{display:none!important;} body{background:#fff;} .preview-pane{padding:10px;} .page{box-shadow:none;margin:0 auto;width:100%;max-width:210mm;min-height:auto;}' : ''}
</style>
</head>
<body>
  ${embedded ? '' : `<div class="toolbar">
    <button class="btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
    <button class="btn ghost" onclick="window.close()">Tutup</button>
  </div>`}

  <div class="preview-pane">
    <div class="page">
      <div class="logo-wrap"><img class="sra-logo" src="${SRA_LOGO_SRC}" alt="Sudut Ruang Arsitek"/></div>
      <div class="rule strong"></div>

      <div class="title">
        <h1>Surat Perjanjian Kerja</h1>
        <div class="s1">Jasa Perencanaan Arsitektur</div>
        <div class="s2">Kontrak Lump Sum Fixed Price</div>
      </div>

      <div class="docnum"><span class="l">No. Dokumen: </span><span class="v">${esc(v.NO_SPK)}</span></div>

      <h2 class="pasal">Para Pihak</h2>
      <p class="lead">Pada hari ini, ${tanggal}, kami yang bertanda tangan di bawah ini telah sepakat mengadakan perjanjian kerja sebagai berikut:</p>

      <h3 class="sub">Pihak Pertama — Pemberi Tugas</h3>
      <table class="kv">
        ${labelRow('Nama', v.NAMA_KLIEN)}
        ${labelRow('Jabatan', v.KAPASITAS_KLIEN || 'Pemberi Tugas')}
        ${labelRow('Alamat', v.ALAMAT_KLIEN)}
        ${labelRow('No. HP', v.HP_KLIEN)}
      </table>
      <div class="disebut">Selanjutnya disebut PIHAK PERTAMA.</div>

      <h3 class="sub">Pihak Kedua — Penyedia Jasa</h3>
      <table class="kv">
        ${labelRow('Nama', PRINCIPAL.nama)}
        ${labelRow('Jabatan', PRINCIPAL.jabatan)}
        ${labelRow('Studio', PRINCIPAL.studio)}
        ${labelRow('Alamat', PRINCIPAL.alamat)}
        ${labelRow('No. HP', PRINCIPAL.hp)}
      </table>
      <div class="disebut">Selanjutnya disebut PIHAK KEDUA.</div>

      <div class="rule"></div>
      <h2 class="pasal">Pasal 1 — Tugas Pekerjaan</h2>

      <h3 class="sub">1.1 &nbsp;Identitas Proyek</h3>
      <table class="kv">
        ${labelRow('Nama Proyek', v.NAMA_PROYEK)}
        ${labelRow('Jenis Pekerjaan', v.JENIS_PEKERJAAN)}
        ${labelRow('Lokasi', v.LOKASI_PROYEK)}
        ${labelRow('Luas Lahan', v.LUAS_LAHAN)}
        ${labelRow('Kategori', v.KATEGORI)}
      </table>

      <h3 class="sub">1.2 &nbsp;Program Ruang</h3>
      ${v.PROGRAM_RUANG ? `<p>${nl2br(v.PROGRAM_RUANG)}</p>` : '<p class="note">—</p>'}

      <h3 class="sub">1.3 &nbsp;Lingkup Pekerjaan (Scope of Work)</h3>
      ${bullets([
        'Analisa kondisi site',
        'Perencanaan arsitektur: Skematik → Design Development → Detail Drawing',
        'Pendampingan proses pembangunan lapangan',
      ])}

      <h3 class="sub">1.4 &nbsp;Pekerjaan yang Tidak Termasuk</h3>
      ${bullets([
        'Pengurusan perizinan (IMB/PBG)',
        'Pengukuran &amp; survei lahan',
        'Tes tanah (soil investigation)',
        'Shop drawing untuk kebutuhan kontraktor',
        'As-built drawing',
        'Graphic design (logo, signage, dll.)',
        'Penjadwalan pelaksanaan lapangan (time table)',
      ])}

      <h3 class="sub">1.5 &nbsp;Tahapan Pekerjaan</h3>
      <div class="pasal-block">
        <h4 class="sub2">Tahap 1 – Diskusi Awal</h4>
        <p>Diskusi bersama pemilik untuk menentukan arah desain dan program ruang.</p>
        ${bullets(['Output: Sketsa denah / layout', 'Output: Sketsa massing sederhana (3D mood images)', 'Output: Gambar ide &amp; usulan (preseden)'])}
      </div>
      <div class="pasal-block">
        <h4 class="sub2">Tahap 2 – Perencanaan Schematic (ARS)</h4>
        ${bullets(['Denah teknik — Skala 1:100/150', 'Tampak — Skala 1:100/150', 'Potongan sumbu X &amp; Y — Skala 1:100/150', 'Rencana atap — Skala 1:100/150', 'Perspektif 3D — Skala bebas'])}
      </div>
      <div class="pasal-block">
        <h4 class="sub2">Tahap 3A – Design Development (ARS)</h4>
        ${bullets(['Denah, Tampak, Potongan X &amp; Y (synced) — Skala 1:100/150', 'Rencana atap (synced) — Skala 1:100/150', 'Detail tangga (synced) — Skala 1:25 / 1:50'])}
        <p class="note">Catatan: Tidak ada perubahan desain major pada tahap ini. Gambar dapat digunakan untuk pengurusan IMB/PBG.</p>
      </div>
      <div class="pasal-block">
        <h4 class="sub2">Tahap 3B – Detail Drawing (ARS)</h4>
        ${bullets(detailDrawingItems.map(esc))}
      </div>
      <div class="pasal-block">
        <h4 class="sub2">Tahap 4 – Pendampingan Lapangan (Field/ARS)</h4>
        ${bullets([
          'PIHAK KEDUA menerbitkan Minutes of Meeting (MOM) setiap pertemuan.',
          'Apabila dalam 14 hari kerja tidak ada tanggapan koreksi atas MOM, isi MOM dianggap disetujui.',
          'PIHAK KEDUA memegang hak kekayaan intelektual atas seluruh produk perencanaan.',
          'PIHAK KEDUA berhak mendokumentasikan proyek untuk publikasi dengan menjaga kerahasiaan identitas PIHAK PERTAMA.',
          'Perubahan desain setelah pembangunan berlangsung dihitung sebagai pekerjaan tambahan dalam kontrak baru.',
        ])}
      </div>

      <div class="rule"></div>
      <h2 class="pasal">Pasal 2 — Biaya Pelaksanaan Pekerjaan</h2>
      <div class="value-box">
        <span class="l">Nilai Kontrak: </span><span class="v">${esc(formatIDR(v.TOTAL_FEE))}</span>
        <div class="terbilang">(${esc(terbilang(v.TOTAL_FEE))})</div>
      </div>
      ${bullets([
        'Nilai belum termasuk pajak (PPn &amp; PPh).',
        'Nilai belum termasuk biaya perjalanan &amp; akomodasi luar kota Surabaya.',
        'Nilai bersifat mengikat sejak Down Payment (DP) diterima.',
        'Nilai bersifat lump sum fixed price.',
        'Pekerjaan tambahan di luar kesepakatan awal dihitung dalam kontrak baru yang terpisah.',
      ])}
      <h3 class="sub">Biaya yang Diganti (Reimbursable)</h3>
      ${bullets([
        'Biaya perjalanan dinas: penerbangan, transportasi darat, sewa kendaraan, penginapan, uang saku, dll.',
        'Biaya cetak (printing) output ARS untuk keperluan perizinan.',
      ])}

      <div class="rule"></div>
      <h2 class="pasal">Pasal 3 — Aturan Pembayaran</h2>
      <p>Pembayaran dilakukan secara bertahap (termijn) sebagai berikut:</p>
      <table class="items">
        <thead><tr><th style="width:30px">No.</th><th>Uraian</th><th class="center" style="width:60px">%</th><th class="right" style="width:140px">Fee (excl. pajak)</th></tr></thead>
        <tbody>${terminTableRows(termins, v.TOTAL_FEE)}</tbody>
      </table>
      <h3 class="sub">Rekening Pembayaran</h3>
      <div class="pay-box">
        <div class="h">Pembayaran Ditransfer Ke</div>
        <div>${esc(PRINCIPAL.bank.nama)}</div>
        <div class="bnum">${esc(PRINCIPAL.bank.rekening)}</div>
        <div class="small">a.n. ${esc(PRINCIPAL.bank.an)}</div>
      </div>

      <div class="rule"></div>
      <h2 class="pasal">Pasal 4 — Revisi</h2>
      ${bullets([
        'Biaya revisi dikenakan apabila terdapat pengulangan tahap desain yang telah disetujui sebelumnya.',
        'Perubahan selama pelaksanaan lapangan yang mengakibatkan re-desain atau penggambaran ulang dikategorikan revisi berbayar.',
        'Usulan Value Engineering (VE) setelah desain selesai akan dikenakan biaya revisi.',
        'Besaran biaya revisi ditentukan melalui musyawarah kedua belah pihak.',
      ])}

      <div class="rule"></div>
      <h2 class="pasal">Pasal 5 — Jangka Waktu Pelaksanaan</h2>
      ${bullets([
        `Waktu perencanaan maksimum ${v.DURASI_BULAN} (${esc(durasiKata)}) bulan hari kerja, terhitung dari tanggal penandatanganan kontrak.`,
        'Jam kerja normal: 08.00–17.00 WIB, Senin–Jumat.',
        'Pekerjaan dimulai selambat-lambatnya 2 (dua) hari setelah penandatanganan SPK.',
        'Pekerjaan dapat tertunda atau dibatalkan akibat force majeure.',
        'Perpanjangan waktu dapat dilakukan atas persetujuan tertulis PIHAK PERTAMA.',
        'Waktu di atas tidak termasuk durasi yang diperlukan dalam proses perizinan.',
        'Apabila keterlambatan terjadi karena faktor eksternal di luar kendali PIHAK KEDUA, PIHAK KEDUA dapat memperbarui nilai kontrak.',
      ])}

      <div class="rule"></div>
      <h2 class="pasal">Pasal 6 — Inspeksi Lapangan</h2>
      ${bullets([
        'Kunjungan lapangan maksimal 1 (satu) kali per bulan.',
        'Memastikan pelaksanaan konstruksi sesuai gambar perencanaan dan dokumen desain yang telah disetujui.',
        'Hadir sewaktu-waktu bila dibutuhkan, dengan pemberitahuan minimal 1 (satu) minggu sebelumnya.',
        'Memberikan gambar tambahan (sketsa klarifikasi) bila diperlukan.',
        'Memberikan saran/arahan kepada Konsultan Pengawas atau Kontraktor bila dibutuhkan.',
        'PIHAK KEDUA tidak berwenang melakukan tindakan manajerial lapangan.',
      ])}

      <div class="rule"></div>
      <h2 class="pasal">Pasal 7 — Penyelesaian Perselisihan</h2>
      <p>Perselisihan diselesaikan terlebih dahulu melalui musyawarah untuk mufakat. Apabila tidak tercapai kesepakatan, Para Pihak sepakat menyelesaikan melalui Pengadilan Negeri di wilayah hukum yang berlaku.</p>

      <div class="rule"></div>
      <h2 class="pasal">Pasal 8 — Penghentian Pekerjaan</h2>
      <h3 class="sub">Penghentian oleh PIHAK PERTAMA</h3>
      <p>PIHAK PERTAMA berhak menghentikan pekerjaan dengan atau tanpa alasan melalui Berita Acara Penghentian, dan wajib menyelesaikan pembayaran sebesar 50% dari tahapan pembayaran berikutnya yang belum terbayarkan.</p>
      <h3 class="sub">Penghentian oleh PIHAK KEDUA</h3>
      <p>PIHAK KEDUA dapat menghentikan pekerjaan apabila terjadi salah satu kondisi berikut:</p>
      ${bullets([
        'Perbedaan konsep mendasar selama lebih dari 5 (lima) kali sesi asistensi desain.',
        'Tidak ada tanggapan PIHAK PERTAMA lebih dari 14 (empat belas) hari kerja.',
        'PIHAK PERTAMA melanggar salah satu klausul dalam perjanjian ini.',
        'Force majeure.',
        'Jangka waktu pelaksanaan sebagaimana Pasal 5 telah terpenuhi.',
      ])}
      <p>Dalam hal ini, PIHAK KEDUA wajib menyerahkan seluruh produk yang telah diselesaikan dan mengembalikan pembayaran sebesar 50% dari tahapan terakhir yang telah dibayarkan.</p>

      <div class="rule"></div>
      <h2 class="pasal">Pasal 9 — Pekerjaan Baru</h2>
      <p>Pekerjaan yang tidak tercakup dalam SPK ini dapat disepakati melalui kontrak baru yang terpisah berdasarkan musyawarah kedua belah pihak. PIHAK KEDUA tetap bertanggung jawab penuh terhadap kontrak ini selama menjalankan kontrak baru, kecuali ada kesepakatan khusus secara tertulis.</p>

      <div class="rule"></div>
      <h2 class="pasal">Tanda Tangan Para Pihak</h2>
      <p>Surat Perjanjian Kerja ini dibuat dalam 2 (dua) rangkap bermaterai cukup, masing-masing mempunyai kekuatan hukum yang sama, dan ditandatangani di Surabaya pada tanggal yang tercantum di atas.</p>
      <div class="sign">
        <div class="col">
          <div class="role">PIHAK KEDUA</div>
          <div class="meterai">(Meterai Rp10.000)</div>
          <div class="space"></div>
          <div class="name">${esc(PRINCIPAL.nama)}</div>
          <div class="pos">${esc(PRINCIPAL.jabatan)}</div>
          <div class="studio">${esc(PRINCIPAL.studioShort)}</div>
        </div>
        <div class="col">
          <div class="role">PIHAK PERTAMA</div>
          <div class="meterai">(Meterai Rp10.000)</div>
          <div class="space"></div>
          <div class="name">${esc(v.NAMA_KLIEN)}</div>
          <div class="pos">Pemberi Tugas</div>
        </div>
      </div>

      <div class="footer">
        <div class="l1"><b>CV. Sudut Ruang Archineering</b> · ${esc(PRINCIPAL.alamat)}</div>
        <div class="l2">${esc(PRINCIPAL.email)} · ${esc(PRINCIPAL.web)} · ${esc(PRINCIPAL.ig)} · ${esc(PRINCIPAL.waDisplay)}</div>
        <div class="l3">${esc(PRINCIPAL.tagline)}</div>
      </div>
    </div>
  </div>
</body>
</html>`
}

/** Buka dokumen SPK di tab baru dan picu dialog cetak (Save as PDF). */
export function openSpkPrintWindow(v: SpkDocVars, termins: SpkTermin[]): boolean {
  const html = buildSpkDocumentHtml(v, termins)
  const win = window.open('', '_blank')
  if (!win) return false
  win.document.open()
  win.document.write(html)
  win.document.close()
  return true
}
