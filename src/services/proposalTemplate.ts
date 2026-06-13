// ============================================================
// Proposal / Penawaran HTML template builder — SRA Master v1.0
// ------------------------------------------------------------
// Pure function that turns structured proposal data into a self-contained
// HTML document mengikuti Master Template Proposal Sudut Ruang Arsitek
// (SRA-KB-TPL-PROPOSAL/v1.0). Dipakai oleh dashboard (preview + cetak PDF)
// dan dapat diport ke n8n untuk generasi server-side.
// ============================================================

export type Currency = 'IDR' | 'USD'

export interface ProposalLineItem {
  description: string
  volume: string // free text e.g. "1 Paket" or "260 m²"
  qty: number
  unitPrice: number
}

export interface ProposalTimelineItem {
  badge: string // e.g. "W1-W2"
  text: string
}

export interface ProposalPaletteItem {
  name: string
  usage: string
  color: string // hex
}

export interface ProposalSummaryCard {
  title: string
  body: string
}

export interface ProposalImage {
  src: string // data URL or remote URL
  caption?: string
}

export interface ProposalQA {
  q: string
  a: string
}

export interface ProposalFeeTerm {
  label: string
  pct: number
  trigger: string
}

export interface ProposalPillar {
  name: string
  desc: string
}

export interface ProposalWhyUs {
  title: string
  body: string
}

export interface ProposalData {
  proposalNo: string
  dateLabel: string
  confidentialNote: string
  projectTitle: string
  projectTitleAccent: string
  subtitle: string
  preparedFor: string // may contain newlines
  metaSmall: string
  currency: Currency
  taxRate: number // e.g. 0.11
  // Visual / image sections (all optional)
  coverImage?: string // hero image data URL behind the cover
  aboutTitle?: string
  aboutBody?: string
  gallery: ProposalImage[] // portfolio / render gallery
  galleryTitle?: string
  moodboard: ProposalImage[] // material / moodboard references
  moodboardTitle?: string
  // Content sections
  summaryTitle: string
  summaryCards: ProposalSummaryCard[]
  paletteTitle: string
  paletteIntro: string
  palette: ProposalPaletteItem[]
  timelineTitle: string
  timeline: ProposalTimelineItem[]
  pricingTitle: string
  lineItems: ProposalLineItem[]
  notes: string
  closingNote?: string
  company: { name: string; locations: string; phone: string; logo: string }

  // ── Master template (opsional — diisi default bila kosong) ──
  category?: string // Residensial / Hospitality / Komersial
  location?: string
  landArea?: string // m²
  buildingArea?: string // m²
  tagline?: string // positioning singkat proyek
  understanding?: ProposalQA[] // BAB-03
  conceptTagline?: string // BAB-06
  conceptBody?: string // BAB-06
  pillars?: ProposalPillar[] // BAB-06 (3 pilar)
  scopeIncluded?: string[] // BAB-11
  scopeExcluded?: string[] // BAB-11
  deliverables?: string[] // BAB-12
  whyUs?: ProposalWhyUs[] // BAB-15
  feeTerms?: ProposalFeeTerm[] // BAB-14 (default 50/40/10)
}

// ── Identitas resmi Sudut Ruang Arsitek (dari Master Template) ──
export const SRA = {
  legal: 'CV. Sudut Ruang Archineering',
  brand: 'Sudut Ruang Arsitek',
  principal: 'M. Habib Arrohman I.',
  nib: '2802260010569',
  kbli: '71101 (Arsitektur) · 74120 (Desain Interior) · 71102 (Keinsinyuran)',
  bankName: 'BCA',
  bankNo: '1300242622',
  bankHolder: 'M. Habib Arrohman I.',
  phones: '+62 851-77000-990 · +62 821-1111-5619',
  emails: 'sudutruang.sra@gmail.com · admin@sudutruang.com',
  website: 'www.sudutruang.com',
  instagram: '@arsitek.surabaya',
  city: 'Surabaya · Indonesia',
  motto: '"More than just architects. We are storytellers of space."',
  tagline1: 'Setiap Sudut Memiliki Cerita, Setiap Ruang Memiliki Jiwa.',
  tagline2: 'DESIGNING CORNERS · DEFINING SPACES',
}

// ── Konten default (bisa di-override lewat form) ──
export const DEFAULT_UNDERSTANDING: ProposalQA[] = [
  {
    q: 'Bagaimana memastikan ruang ini tetap nyaman dan relevan dalam jangka panjang?',
    a: 'Kami merancang berdasarkan siklus hidup penggunanya — bukan hanya kondisi hari ini. Fleksibilitas tata ruang dibangun sejak awal agar perubahan kebutuhan di masa depan tidak menuntut renovasi besar.',
  },
  {
    q: 'Bagaimana pendekatan terhadap iklim tropis Indonesia?',
    a: 'Ventilasi silang, orientasi bangunan, dan overstek atap kami pertimbangkan sejak tahap konsep agar ruang dingin secara pasif — mengurangi ketergantungan pada penghawaan buatan.',
  },
  {
    q: 'Apakah desain ini realistis untuk dibangun?',
    a: 'Ya. Gambar kami dirancang untuk kapabilitas kontraktor lokal menengah, dengan pertanggungjawaban biaya yang nyata — bukan sesuatu yang hanya bisa dieksekusi spesialis mahal.',
  },
  {
    q: 'Seberapa besar klien bisa terlibat dalam proses?',
    a: 'Sebanyak yang Anda mau. Kami menyambut keterlibatan aktif, dengan satu prinsip: satu keputusan, satu suara, agar proses tidak terhambat perbedaan pendapat internal.',
  },
]

export const DEFAULT_PILLARS: ProposalPillar[] = [
  { name: 'Konteks', desc: 'Desain lahir dari tapak, iklim, dan budaya lokasi — bukan template yang ditempel begitu saja.' },
  { name: 'Pengalaman Ruang', desc: 'Setiap keputusan diukur dari bagaimana ruang itu dirasakan, bukan sekadar bagaimana ia terlihat.' },
  { name: 'Keterbangunan', desc: 'Estetika yang kuat namun tetap realistis dieksekusi dengan anggaran dan kontraktor nyata.' },
]

export const DEFAULT_SCOPE_INCLUDED: string[] = [
  'Survey & analisis tapak',
  'Konsep desain (1–2 opsi) + moodboard',
  'Schematic Design — denah, tampak, potongan, 3D massing',
  'Design Development — set lengkap + 3D render eksterior',
  '3D render interior ruang kunci',
  'Detail Drawing elemen arsitektur (tangga, kusen custom, fasad, roster)',
  'Denah atap, plafon, pola lantai + schedule pintu & jendela',
  '2× revisi mayor per tahap',
  'Koordinasi awal dengan konsultan struktur & MEP',
  'Pendampingan lapangan maks. 1× / bulan + Minutes of Meeting',
]

export const DEFAULT_SCOPE_EXCLUDED: string[] = [
  'Gambar struktur (konsultan struktur terpisah)',
  'Gambar MEP — Mekanikal, Elektrikal, Plumbing (terpisah)',
  'Full Construction Documents / gambar kerja lapangan',
  'RAB dari pihak arsitek (dibuat kontraktor berdasarkan gambar kami)',
  'Pengurusan PBG / perizinan (bisa difasilitasi, biaya terpisah)',
  'Pengawasan konstruksi penuh (dapat menjadi addendum)',
  'Procurement material & furnitur, serta biaya cetak dokumen',
  'Biaya survey luar kota Surabaya (ditagih terpisah)',
]

export const DEFAULT_DELIVERABLES: string[] = [
  'File DWG — denah, tampak, potongan, atap, plafon, pola lantai, schedule pintu-jendela',
  'File DWG — detail drawing elemen arsitektur khusus',
  'File PDF set gambar lengkap (A3/A2)',
  '3D render eksterior resolusi tinggi (2–4 view)',
  '3D render interior ruang kunci (1–2 view)',
  'Material board (PDF)',
  'Minutes of Meeting (MOM) setiap pertemuan',
  'Berita Acara Serah Terima (BAST) saat serah terima final',
]

export const DEFAULT_WHY_US: ProposalWhyUs[] = [
  { title: 'Principal langsung di setiap proyek', body: 'Setiap proyek ditangani langsung oleh M. Habib Arrohman I. sebagai Principal Architect — bukan didelegasikan ke tim junior tanpa pengawasan.' },
  { title: 'Pengalaman IKN & proyek strategis nasional', body: 'Keterlibatan dalam Construction Management Istana Presiden & Wapres IKN membentuk standar kerja kami di setiap proyek.' },
  { title: 'Desain yang bisa dibangun', body: 'Kami memastikan setiap keputusan desain punya pertanggungjawaban biaya yang realistis — indah di atas kertas dan nyata saat dieksekusi.' },
  { title: 'Komunikasi yang tidak membuat stres', body: 'MOM setiap pertemuan, update berkala, dan respons WA di hari kerja adalah standar — bukan keistimewaan.' },
  { title: 'Satu kontrak, satu standar', body: 'Dari desain pertama hingga serah terima dokumen, standar kualitas tidak berubah. Tidak ada "mode hemat" di tengah proyek.' },
]

export const DEFAULT_FEE_TERMS: ProposalFeeTerm[] = [
  { label: 'Termin 1 · Down Payment', pct: 50, trigger: 'Kontrak / SPK ditandatangani' },
  { label: 'Termin 2', pct: 40, trigger: 'Schematic + Design Development disetujui' },
  { label: 'Termin 3 · Pelunasan', pct: 10, trigger: 'Detail Drawing + Serah Terima final' },
]

/** Escape user text for safe HTML interpolation. */
function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Escape and convert newlines to <br>. */
function escMultiline(s: string): string {
  return esc(s).replace(/\n/g, '<br>')
}

export function formatMoney(currency: Currency, n: number): string {
  const value = Number.isFinite(n) ? n : 0
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  }
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(value)
}

export function lineTotal(item: ProposalLineItem): number {
  const qty = Number.isFinite(item.qty) ? item.qty : 0
  const price = Number.isFinite(item.unitPrice) ? item.unitPrice : 0
  return qty * price
}

export function computeTotals(data: ProposalData) {
  const subtotal = data.lineItems.reduce((sum, it) => sum + lineTotal(it), 0)
  const tax = subtotal * (data.taxRate || 0)
  const grandTotal = subtotal + tax
  return { subtotal, tax, grandTotal }
}

const PALETTE_PRIMARY = '#043666'
const PALETTE_SECONDARY = '#4AB3D8'

export function buildProposalHTML(data: ProposalData): string {
  const cur = data.currency
  const curLabel = cur === 'USD' ? 'USD' : 'IDR'
  const { subtotal, tax, grandTotal } = computeTotals(data)

  // Fallback ke default master bila field opsional kosong.
  const understanding = (data.understanding && data.understanding.length ? data.understanding : DEFAULT_UNDERSTANDING)
  const pillars = (data.pillars && data.pillars.length ? data.pillars : DEFAULT_PILLARS)
  const scopeIncluded = (data.scopeIncluded && data.scopeIncluded.length ? data.scopeIncluded : DEFAULT_SCOPE_INCLUDED)
  const scopeExcluded = (data.scopeExcluded && data.scopeExcluded.length ? data.scopeExcluded : DEFAULT_SCOPE_EXCLUDED)
  const deliverables = (data.deliverables && data.deliverables.length ? data.deliverables : DEFAULT_DELIVERABLES)
  const whyUs = (data.whyUs && data.whyUs.length ? data.whyUs : DEFAULT_WHY_US)
  const feeTerms = (data.feeTerms && data.feeTerms.length ? data.feeTerms : DEFAULT_FEE_TERMS)

  const logoBlock = `<div class="brandbar">
    <img src="${esc(data.company.logo || '/logo-main.png')}" alt="Logo" class="brand-logo" />
    <div class="brand-meta">
      <div class="brand-name">${esc(data.company.name || SRA.brand)}</div>
      <div class="brand-tag">Arsitektur · Interior · Lanskap</div>
    </div>
  </div>`

  // BAB-01 · Tentang Studio
  const aboutSection = `
    <section class="page-break">
      <div class="section-tag">BAB 01 · Tentang Studio</div>
      <h2>Studio kecil. Jejak skala nasional.</h2>
      <p class="lead-quote">${esc(SRA.motto)}</p>
      <p class="body-text">${escMultiline(data.aboutBody || `${SRA.brand} — beroperasi di bawah badan hukum ${SRA.legal} — adalah studio Design &amp; Build premium berbasis di Surabaya. Kami menggabungkan desain arsitektur, storytelling visual, pendekatan teknis rancang-bangun, dan strategi branding arsitektur. Pengalaman kami menjangkau proyek strategis berskala nasional, termasuk keterlibatan dalam ekosistem pembangunan Ibu Kota Nusantara (IKN).`)}</p>
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-h">IKN</div><div class="kpi-s">Construction Management Istana Presiden &amp; Wapres IKN</div></div>
        <div class="kpi"><div class="kpi-h">20+</div><div class="kpi-s">Proyek Nasional &amp; Boutique Villa sejak 2022</div></div>
        <div class="kpi"><div class="kpi-h">5+</div><div class="kpi-s">Kompetensi tersertifikasi IAI · INKINDO · MK · BIM</div></div>
        <div class="kpi"><div class="kpi-h">4</div><div class="kpi-s">Disiplin terintegrasi: Arsitektur · Interior · Lanskap · CM</div></div>
      </div>
      <div class="legal-line">NIB: ${esc(SRA.nib)} &nbsp;·&nbsp; KBLI: ${esc(SRA.kbli)}</div>
    </section>`

  // BAB-02 · Executive Summary (pakai summaryCards bila ada, else 3 dimensi)
  const summarySection = data.summaryCards.length > 0
    ? `
    <section class="page-break">
      <div class="section-tag">BAB 02 · Executive Summary</div>
      <h2>${esc(data.summaryTitle || 'Satu halaman. Semua yang perlu Anda tahu.')}</h2>
      <div class="summary-grid">
        ${data.summaryCards.map((c) => `<div class="card"><h3>${esc(c.title)}</h3><p>${escMultiline(c.body)}</p></div>`).join('')}
      </div>
    </section>`
    : `
    <section class="page-break">
      <div class="section-tag">BAB 02 · Executive Summary</div>
      <h2>Satu halaman. Semua yang perlu Anda tahu.</h2>
      <div class="summary-grid summary-3">
        <div class="card"><h3>Pemahaman</h3><p>Proyek <strong>${esc(data.projectTitle)}</strong>${data.location ? ` di ${esc(data.location)}` : ''}${data.landArea ? ` · ${esc(data.landArea)} m²` : ''}. Kami memahami kebutuhan Anda bukan hanya dari brief teknis, tapi dari visi dan gaya hidup yang ingin diciptakan.</p></div>
        <div class="card"><h3>Investasi</h3><p>Fee desain <strong>${curLabel} ${formatMoney(cur, grandTotal)}</strong> bersifat lumpsum fixed — tidak ada biaya tersembunyi di luar yang disepakati di awal.</p></div>
        <div class="card"><h3>Komitmen</h3><p>Setiap milestone terukur dan dapat dipertanggungjawabkan. Feedback klien direspons dalam hari kerja.</p></div>
      </div>
    </section>`

  // BAB-03 · Understanding the Brief
  const understandingSection = `
    <section class="page-break">
      <div class="section-tag">BAB 03 · Understanding the Brief</div>
      <h2>Kami mendengar lebih dari yang Anda katakan.</h2>
      <div class="qa-list">
        ${understanding.map((qa, i) => `<div class="qa"><div class="qa-q"><span class="qa-n">${String(i + 1).padStart(2, '0')}</span>${esc(qa.q)}</div><div class="qa-a">${escMultiline(qa.a)}</div></div>`).join('')}
      </div>
    </section>`

  // BAB-06 · Design Concept
  const conceptSection = (data.conceptBody || data.conceptTagline || pillars.length) ? `
    <section class="page-break">
      <div class="section-tag">BAB 06 · Design Concept</div>
      <h2>${esc(data.conceptTagline || data.tagline || 'Konsep yang menjadi jiwa proyek.')}</h2>
      ${data.conceptBody ? `<p class="body-text">${escMultiline(data.conceptBody)}</p>` : `<p class="body-text">Konsep proyek ${esc(data.projectTitle)} dibangun di atas tiga pilar yang menerjemahkan kebutuhan dan konteks ke dalam keputusan ruang yang konkret.</p>`}
      <div class="pillars">
        ${pillars.map((p, i) => `<div class="pillar"><div class="pillar-n">PILAR ${String(i + 1).padStart(2, '0')}</div><div class="pillar-name">${esc(p.name)}</div><div class="pillar-desc">${esc(p.desc)}</div></div>`).join('')}
      </div>
    </section>` : ''

  // BAB-11 · Scope of Work
  const scopeSection = `
    <section class="page-break">
      <div class="section-tag">BAB 11 · Scope of Work</div>
      <h2>Apa yang kami kerjakan — dan apa yang tidak.</h2>
      <div class="scope-cols">
        <div class="scope-col scope-in">
          <div class="scope-h">Termasuk dalam lingkup</div>
          <ul>${scopeIncluded.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
        <div class="scope-col scope-out">
          <div class="scope-h">Tidak termasuk</div>
          <ul>${scopeExcluded.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        </div>
      </div>
      <p class="fineprint">Setiap pekerjaan di luar lingkup di atas akan dibicarakan dan diformalkan dalam addendum tersendiri.</p>
    </section>`

  // BAB-12 · Deliverables
  const deliverablesSection = `
    <section class="page-break">
      <div class="section-tag">BAB 12 · Deliverables</div>
      <h2>Output konkret yang Anda terima.</h2>
      <ul class="deliverable-list">${deliverables.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
    </section>`

  // BAB-13 · Timeline
  const timelineSection = data.timeline.length > 0 ? `
    <section class="page-break">
      <div class="section-tag">BAB 13 · Timeline</div>
      <h2>${esc(data.timelineTitle || 'Dari brief ke gambar final — terencana.')}</h2>
      <ul class="timeline">
        ${data.timeline.map((t) => `<li class="timeline-item"><span class="badge">${esc(t.badge)}</span> ${esc(t.text)}</li>`).join('')}
      </ul>
    </section>` : ''

  // BAB-14 · Fee Proposal
  const rows = data.lineItems.map((it) => `
        <tr class="rab-row">
          <td>${esc(it.description)}</td>
          <td>${esc(it.volume)}</td>
          <td class="text-right">${formatMoney(cur, it.unitPrice)}</td>
          <td class="text-right">${formatMoney(cur, lineTotal(it))}</td>
        </tr>`).join('')

  const termRows = feeTerms.map((t) => `
        <tr>
          <td><strong>${esc(t.label)}</strong></td>
          <td class="text-center">${t.pct}%</td>
          <td>${esc(t.trigger)}</td>
          <td class="text-right">${curLabel} ${formatMoney(cur, grandTotal * (t.pct / 100))}</td>
        </tr>`).join('')
  const termTotalPct = feeTerms.reduce((s, t) => s + (t.pct || 0), 0)

  const feeSection = `
    <section class="page-break">
      <div class="section-tag">BAB 14 · Fee Proposal</div>
      <h2>${esc(data.pricingTitle || 'Investasi desain yang menghasilkan nilai.')}</h2>
      <table class="rab-table">
        <thead>
          <tr>
            <th>Uraian Layanan / Item Pekerjaan</th>
            <th>Volume</th>
            <th class="text-right">Harga Satuan (${curLabel})</th>
            <th class="text-right">Total (${curLabel})</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="calculation-box">
        <div class="calc-row"><span>Subtotal</span><span>${curLabel} ${formatMoney(cur, subtotal)}</span></div>
        <div class="calc-row"><span>PPN (${Math.round((data.taxRate || 0) * 100)}%)</span><span>${curLabel} ${formatMoney(cur, tax)}</span></div>
        <div class="calc-row total"><span>Total Investasi</span><span>${curLabel} ${formatMoney(cur, grandTotal)}</span></div>
      </div>

      <h3 class="sub-h">Skema Pembayaran</h3>
      <table class="term-table">
        <thead><tr><th>Termin</th><th class="text-center">%</th><th>Trigger</th><th class="text-right">Nilai</th></tr></thead>
        <tbody>${termRows}
          <tr class="term-total"><td><strong>TOTAL</strong></td><td class="text-center"><strong>${termTotalPct}%</strong></td><td></td><td class="text-right"><strong>${curLabel} ${formatMoney(cur, grandTotal * (termTotalPct / 100))}</strong></td></tr>
        </tbody>
      </table>

      <div class="bank-box">
        <div class="bank-h">Rekening Pembayaran</div>
        <div class="bank-line">Bank: <strong>${esc(SRA.bankName)}</strong></div>
        <div class="bank-line">No. Rekening: <strong>${esc(SRA.bankNo)}</strong></div>
        <div class="bank-line">Atas Nama: <strong>${esc(SRA.bankHolder)}</strong></div>
      </div>

      <p class="fineprint">${escMultiline(data.notes || 'Nilai bersifat LUMPSUM FIXED PRICE selama lingkup tidak berubah. Belum termasuk PPN/PPh (jika dikenakan), biaya perjalanan luar kota Surabaya, biaya cetak, dan perizinan PBG. Validity proposal: 30 hari kalender sejak tanggal terbit.')}</p>
    </section>`

  // BAB-15 · Why Sudut Ruang
  const whySection = `
    <section class="page-break">
      <div class="section-tag">BAB 15 · Why Sudut Ruang</div>
      <h2>Lima alasan yang tidak terukur dari portofolio saja.</h2>
      <div class="why-list">
        ${whyUs.map((w, i) => `<div class="why"><div class="why-n">${String(i + 1).padStart(2, '0')}</div><div><div class="why-t">${esc(w.title)}</div><div class="why-b">${esc(w.body)}</div></div></div>`).join('')}
      </div>
    </section>`

  // Image galleries (BAB-16 moodboard + portofolio)
  const galleryHtml = (items: ProposalImage[], title: string, tag: string) =>
    items.length > 0 ? `
    <section class="page-break">
      <div class="section-tag">${esc(tag)}</div>
      <h2>${esc(title)}</h2>
      <div class="gallery-grid">
        ${items.map((img) => `<figure class="gallery-item"><img src="${esc(img.src)}" alt="${esc(img.caption || '')}" loading="lazy" />${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>`).join('')}
      </div>
    </section>` : ''

  const gallerySection = galleryHtml(data.gallery, data.galleryTitle || 'Portofolio & Referensi Desain', 'Portofolio')
  const moodboardSection = galleryHtml(data.moodboard, data.moodboardTitle || 'BAB 16 · Design Moodboard', 'Moodboard')

  // Palette (opsional)
  const paletteSection = data.palette.length > 0 ? `
    <section class="page-break">
      <div class="section-tag">BAB 09 · Material Direction</div>
      <h2>${esc(data.paletteTitle || 'Material adalah karakter bangunan.')}</h2>
      ${data.paletteIntro ? `<p class="body-text">${escMultiline(data.paletteIntro)}</p>` : ''}
      <div class="palette-container">
        ${data.palette.map((p) => `<div class="color-swatch"><div class="color-preview" style="background:${esc(p.color)};"></div><p><strong>${esc(p.name)}</strong><br><small>${esc(p.usage)}</small></p></div>`).join('')}
      </div>
    </section>` : ''

  // Closing
  const closingSection = `
    <section class="closing page-break">
      <div class="section-tag">Penutup</div>
      <h2>Terima kasih.</h2>
      <p class="body-text">${escMultiline(data.closingNote || `Proposal ini kami susun dengan keyakinan bahwa proyek ${data.projectTitle} layak mendapat perhatian terbaik. Kami menawarkan proses yang terencana, komunikasi transparan, dan komitmen menjaga visi Anda dari konsep pertama hingga dokumen final.`)}</p>
      <p class="closing-cta">Kami menunggu kabar Bapak/Ibu. Kapan kita bisa duduk bersama?</p>
      <div class="contact-box">
        <div><strong>Telepon / WA:</strong> ${esc(SRA.phones)}</div>
        <div><strong>Email:</strong> ${esc(SRA.emails)}</div>
        <div><strong>Website:</strong> ${esc(SRA.website)} &nbsp;·&nbsp; <strong>Instagram:</strong> ${esc(SRA.instagram)}</div>
        <div><strong>Studio:</strong> ${esc(SRA.city)}</div>
      </div>
      <p class="motto-line">${esc(SRA.tagline1)}</p>
    </section>`

  const titleHtml = data.projectTitleAccent
    ? `${esc(data.projectTitle)} <strong>${esc(data.projectTitleAccent)}</strong>`
    : esc(data.projectTitle)

  const coverStyle = data.coverImage
    ? ` style="background-image:linear-gradient(to bottom, rgba(4,30,60,0.25), rgba(4,30,60,0.82)), url('${esc(data.coverImage)}');background-size:cover;background-position:center;color:#fff;"`
    : ''
  const category = data.category || data.subtitle || 'Proposal Jasa Perancangan'

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposal — ${esc(data.projectTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --primary-color: ${PALETTE_PRIMARY};
    --secondary-color: ${PALETTE_SECONDARY};
    --bg-light: #E1F0F8;
    --text-dark: #0A3863;
    --text-muted: #6b7a8f;
    --line: #e7edf3;
  }
  * { box-sizing: border-box; }
  body { font-family: 'Montserrat','Helvetica Neue',Helvetica,Arial,sans-serif; color: var(--text-dark); background:#eef2f7; margin:0; padding:40px 20px; display:flex; justify-content:center; }
  .proposal-paper { background:#fff; width:100%; max-width:900px; padding:60px; box-shadow:0 4px 20px rgba(4,54,102,0.08); border-radius:4px; position:relative; }
  .proposal-paper::before { content:""; position:absolute; top:0; left:0; right:0; height:4px; background:linear-gradient(90deg,#5EC2E4 0%,#4AB3D8 32%,#045D93 100%); border-radius:4px 4px 0 0; }
  header .confidential { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--text-muted); margin-bottom:30px; }
  .brandbar { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
  .brandbar .brand-logo { height:52px; width:auto; object-fit:contain; }
  .brandbar .brand-name { font-size:16px; font-weight:800; color:var(--primary-color); letter-spacing:-0.3px; }
  .brandbar .brand-tag { font-size:8px; font-weight:600; letter-spacing:0.22em; text-transform:uppercase; color:var(--secondary-color); margin-top:3px; }
  .cover-hero .brandbar .brand-name { color:#fff; }
  .cover-hero .brandbar .brand-logo { filter:brightness(0) invert(1); }
  .cat-line { font-size:12px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:var(--secondary-color); margin-bottom:10px; }
  .main-title { font-size:42px; font-weight:300; line-height:1.2; margin:0 0 10px 0; color:var(--text-dark); }
  .main-title strong { color:var(--primary-color); font-weight:700; }
  .subtitle { font-size:18px; color:var(--secondary-color); margin-bottom:40px; font-style:italic; }
  .meta-info { background:var(--bg-light); padding:20px; border-left:4px solid var(--primary-color); margin-bottom:50px; font-size:14px; }
  section { margin-bottom:54px; }
  .section-tag { font-size:12px; text-transform:uppercase; letter-spacing:2px; color:var(--secondary-color); font-weight:bold; margin-bottom:5px; }
  h2 { font-size:24px; border-bottom:1px solid var(--line); padding-bottom:10px; margin:0 0 22px; color:var(--text-dark); font-weight:600; }
  h3.sub-h { font-size:16px; color:var(--primary-color); margin:28px 0 12px; }
  .lead-quote { font-size:16px; font-style:italic; color:var(--secondary-color); margin:0 0 16px; }
  .body-text { font-size:14.5px; line-height:1.75; color:#444; }
  .legal-line { margin-top:18px; font-size:11px; letter-spacing:0.5px; color:var(--text-muted); font-family:'JetBrains Mono',monospace; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-top:24px; }
  .kpi { background:var(--bg-light); border:1px solid var(--line); border-radius:8px; padding:16px 14px; text-align:center; }
  .kpi-h { font-size:20px; font-weight:800; color:var(--primary-color); }
  .kpi-s { font-size:10.5px; color:var(--text-muted); margin-top:6px; line-height:1.4; }
  .summary-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .summary-grid.summary-3 { grid-template-columns:repeat(3,1fr); }
  .card { border:1px solid var(--line); padding:22px; border-radius:8px; background:#fafcff; }
  .card h3 { margin-top:0; color:var(--primary-color); font-size:15px; }
  .card p { font-size:13px; line-height:1.6; color:#555; margin:0; }
  .qa-list { display:flex; flex-direction:column; gap:16px; }
  .qa { border-left:3px solid var(--secondary-color); padding-left:16px; }
  .qa-q { font-size:14px; font-weight:700; color:var(--text-dark); margin-bottom:6px; display:flex; gap:8px; align-items:baseline; }
  .qa-n { font-family:'JetBrains Mono',monospace; font-size:12px; color:var(--secondary-color); font-weight:700; }
  .qa-a { font-size:13.5px; line-height:1.65; color:#555; }
  .pillars { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:18px; }
  .pillar { background:#fafcff; border:1px solid var(--line); border-radius:8px; padding:18px; }
  .pillar-n { font-family:'JetBrains Mono',monospace; font-size:10px; letter-spacing:1px; color:var(--secondary-color); font-weight:700; }
  .pillar-name { font-size:15px; font-weight:700; color:var(--primary-color); margin:6px 0 8px; }
  .pillar-desc { font-size:12.5px; line-height:1.6; color:#555; }
  .scope-cols { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
  .scope-col { border:1px solid var(--line); border-radius:8px; padding:18px; }
  .scope-in { background:#f3fbf6; border-color:#cdeede; }
  .scope-out { background:#fff6f6; border-color:#f3d6d6; }
  .scope-h { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px; }
  .scope-in .scope-h { color:#1c8a52; }
  .scope-out .scope-h { color:#c0392b; }
  .scope-col ul { margin:0; padding-left:18px; }
  .scope-col li { font-size:12.5px; line-height:1.6; color:#444; margin-bottom:6px; }
  .deliverable-list { columns:2; column-gap:28px; padding-left:18px; margin:0; }
  .deliverable-list li { font-size:12.5px; line-height:1.6; color:#444; margin-bottom:7px; break-inside:avoid; }
  .timeline { list-style:none; padding:0; position:relative; }
  .timeline-item { margin-bottom:15px; padding-left:30px; position:relative; }
  .timeline-item::before { content:''; position:absolute; left:0; top:6px; width:12px; height:12px; border-radius:50%; background:var(--primary-color); }
  .timeline-item .badge { background:var(--bg-light); color:var(--text-dark); padding:2px 8px; font-size:11px; font-weight:bold; border-radius:4px; margin-right:10px; font-family:'JetBrains Mono',monospace; }
  .rab-table { width:100%; border-collapse:collapse; margin-top:20px; font-size:14px; }
  .rab-table th { background:var(--primary-color); color:#fff; text-align:left; padding:12px; font-weight:500; }
  .rab-table td { padding:12px; border-bottom:1px solid var(--line); }
  .text-right { text-align:right; } .text-center { text-align:center; }
  .rab-table td.text-right, .calc-row span:last-child { font-family:'JetBrains Mono',monospace; }
  .calculation-box { background:linear-gradient(135deg,#043666 0%,#045D93 100%); color:#fff; border-radius:8px; padding:24px; margin:28px 0 0 auto; width:100%; max-width:400px; }
  .calc-row { display:flex; justify-content:space-between; margin-bottom:10px; font-size:14px; color:rgba(255,255,255,0.85); }
  .calc-row.total { border-top:1px solid rgba(255,255,255,0.25); padding-top:15px; font-size:18px; font-weight:bold; color:#fff; }
  .calc-row.total span:last-child { color:#5EC2E4; }
  .term-table { width:100%; border-collapse:collapse; margin-top:8px; font-size:13px; }
  .term-table th { background:var(--bg-light); color:var(--text-dark); text-align:left; padding:10px 12px; font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; }
  .term-table td { padding:10px 12px; border-bottom:1px solid var(--line); }
  .term-table td.text-right { font-family:'JetBrains Mono',monospace; }
  .term-total td { border-top:2px solid var(--primary-color); background:#fafcff; }
  .bank-box { background:var(--bg-light); border:1px dashed var(--primary-color); border-radius:8px; padding:18px; margin-top:22px; max-width:380px; }
  .bank-h { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:1px; color:var(--primary-color); margin-bottom:10px; }
  .bank-line { font-size:13px; color:#333; margin-bottom:4px; font-family:'JetBrains Mono',monospace; }
  .fineprint { margin-top:20px; font-size:12px; color:var(--text-muted); line-height:1.6; }
  .why-list { display:flex; flex-direction:column; gap:14px; }
  .why { display:flex; gap:14px; align-items:flex-start; }
  .why-n { font-family:'JetBrains Mono',monospace; font-size:18px; font-weight:800; color:var(--secondary-color); flex-shrink:0; width:34px; }
  .why-t { font-size:14.5px; font-weight:700; color:var(--primary-color); margin-bottom:4px; }
  .why-b { font-size:13px; line-height:1.6; color:#555; }
  .palette-container { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:15px; margin-top:20px; }
  .color-swatch { border:1px solid var(--line); border-radius:6px; overflow:hidden; background:#fff; text-align:center; padding-bottom:12px; font-size:13px; }
  .color-preview { height:80px; width:100%; }
  .gallery-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-top:20px; }
  .gallery-item { margin:0; border-radius:8px; overflow:hidden; border:1px solid var(--line); background:#fafafa; }
  .gallery-item img { width:100%; height:200px; object-fit:cover; display:block; }
  .gallery-item figcaption { padding:10px 14px; font-size:13px; color:var(--text-muted); }
  .closing { background:linear-gradient(135deg,#043666 0%,#062a4d 100%); color:#fff; border-radius:12px; padding:40px; }
  .closing .section-tag { color:#7fd3ee; }
  .closing h2 { color:#fff; border-bottom-color:rgba(255,255,255,0.2); }
  .closing .body-text { color:rgba(255,255,255,0.9); }
  .closing-cta { font-size:16px; font-style:italic; color:#7fd3ee; margin:18px 0; }
  .contact-box { background:rgba(255,255,255,0.08); border-radius:8px; padding:18px; font-size:13px; line-height:1.9; }
  .motto-line { text-align:center; margin-top:22px; font-size:11px; letter-spacing:0.2em; color:#7fd3ee; font-weight:700; text-transform:uppercase; }
  footer { margin-top:40px; border-top:1px solid var(--line); padding-top:20px; font-size:12px; color:var(--text-muted); display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; align-items:center; }
  footer .footer-tagline { width:100%; text-align:center; margin-top:8px; font-size:9px; letter-spacing:0.22em; color:var(--secondary-color); font-weight:700; }
  @media print {
    body { background:#fff; padding:0; }
    .proposal-paper { box-shadow:none; padding:32px; max-width:none; }
    .page-break { break-before:page; page-break-before:always; }
    .gallery-item, .card, .color-swatch, .kpi, .pillar, .qa, .why, .scope-col { break-inside:avoid; page-break-inside:avoid; }
  }
  @media (max-width:640px) {
    .proposal-paper { padding:28px 20px; }
    .kpi-grid, .summary-grid, .summary-grid.summary-3, .pillars, .scope-cols { grid-template-columns:1fr; }
    .deliverable-list { columns:1; }
    .main-title { font-size:30px; }
  }
</style>
</head>
<body>
  <div class="proposal-paper" data-proposal-no="${esc(data.proposalNo)}">
    <header class="${data.coverImage ? 'cover-hero' : ''}"${coverStyle}>
      ${logoBlock}
      <div class="confidential">${esc(data.confidentialNote)}</div>
      <div class="cat-line">${esc(category)}</div>
      <h1 class="main-title">${titleHtml}</h1>
      ${data.tagline || data.subtitle ? `<div class="subtitle">${esc(data.tagline || data.subtitle)}</div>` : ''}
      <div class="meta-info">
        <strong>Disusun khusus untuk:</strong><br>
        ${escMultiline(data.preparedFor)}
        ${data.metaSmall ? `<br><small>${escMultiline(data.metaSmall)}</small>` : ''}
        <br><small>No. Proposal: ${esc(data.proposalNo)} · ${esc(data.dateLabel)}</small>
      </div>
    </header>
    ${aboutSection}
    ${summarySection}
    ${understandingSection}
    ${conceptSection}
    ${gallerySection}
    ${moodboardSection}
    ${paletteSection}
    ${scopeSection}
    ${deliverablesSection}
    ${timelineSection}
    ${feeSection}
    ${whySection}
    ${closingSection}
    <footer>
      <div><strong>${esc(SRA.legal)}</strong>${data.company.locations ? ` • ${esc(data.company.locations)}` : ` • ${esc(SRA.city)}`}</div>
      <div>Hubungi: ${esc(SRA.phones)}</div>
      <div class="footer-tagline">${esc(SRA.tagline2)}</div>
    </footer>
  </div>
</body>
</html>`
}

/** Build sensible default timeline (5 fase master). */
export function defaultTimeline(): ProposalTimelineItem[] {
  return [
    { badge: 'W1-W2', text: 'Kick-off & Survey — Laporan Survey + Brief Final' },
    { badge: 'W3-W4', text: 'Konsep Desain — 2 opsi konsep + moodboard' },
    { badge: 'W5-W6', text: 'Schematic Design — denah, tampak, potongan, 3D massing' },
    { badge: 'W7-W9', text: 'Design Development — set DD lengkap + 3D render' },
    { badge: 'W10-W12', text: 'Detail Drawing & Serah Terima — set gambar final + BAST' },
  ]
}
