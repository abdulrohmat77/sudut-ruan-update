// ============================================================
// Proposal / Penawaran HTML template builder
// ------------------------------------------------------------
// Pure function that turns structured proposal data into a self-contained
// HTML document matching the Sudut Ruang proposal design. Used by the
// dashboard (preview + print-to-PDF + download). The same structure can be
// ported to n8n for server-side generation.
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
}

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
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
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

  const logoBlock = `<div class="brandbar">
    <img src="${esc(data.company.logo || '/logo-main.png')}" alt="Logo" class="brand-logo" />
    <div class="brand-meta">
      <div class="brand-name">${esc(data.company.name || 'Sudut Ruang Arsitek')}</div>
      <div class="brand-tag">Arsitektur · Interior · Lanskap</div>
    </div>
  </div>`

  const summarySection =
    data.summaryCards.length > 0
      ? `
    <section>
      <div class="section-tag">Ringkasan</div>
      <h2>${esc(data.summaryTitle || 'Executive Summary')}</h2>
      <div class="summary-grid">
        ${data.summaryCards
          .map(
            (c) => `
        <div class="card">
          <h3>${esc(c.title)}</h3>
          <p>${escMultiline(c.body)}</p>
        </div>`,
          )
          .join('')}
      </div>
    </section>`
      : ''

  const paletteSection =
    data.palette.length > 0
      ? `
    <section>
      <div class="section-tag">Material & Warna</div>
      <h2>${esc(data.paletteTitle || 'Material & Color Direction')}</h2>
      ${data.paletteIntro ? `<p>${escMultiline(data.paletteIntro)}</p>` : ''}
      <div class="palette-container">
        ${data.palette
          .map(
            (p) => `
        <div class="color-swatch">
          <div class="color-preview" style="background:${esc(p.color)};"></div>
          <p><strong>${esc(p.name)}</strong><br><small>${esc(p.usage)}</small></p>
        </div>`,
          )
          .join('')}
      </div>
    </section>`
      : ''

  const timelineSection =
    data.timeline.length > 0
      ? `
    <section>
      <div class="section-tag">Timeline</div>
      <h2>${esc(data.timelineTitle || 'Timeline Kerja')}</h2>
      <ul class="timeline">
        ${data.timeline
          .map(
            (t) => `
        <li class="timeline-item"><span class="badge">${esc(t.badge)}</span> ${esc(t.text)}</li>`,
          )
          .join('')}
      </ul>
    </section>`
      : ''

  const rows = data.lineItems
    .map(
      (it) => `
        <tr class="rab-row">
          <td>${esc(it.description)}</td>
          <td>${esc(it.volume)}</td>
          <td class="text-right">${formatMoney(cur, it.unitPrice)}</td>
          <td class="text-right">${formatMoney(cur, lineTotal(it))}</td>
        </tr>`,
    )
    .join('')

  const pricingSection =
    data.lineItems.length > 0
      ? `
    <section>
      <div class="section-tag">Investasi</div>
      <h2>${esc(data.pricingTitle || 'Rincian Anggaran')}</h2>
      <table class="rab-table">
        <thead>
          <tr>
            <th>Deskripsi Layanan / Item Pekerjaan</th>
            <th>Volume</th>
            <th class="text-right">Harga Satuan (${curLabel})</th>
            <th class="text-right">Total (${curLabel})</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="calculation-box">
        <div class="calc-row">
          <span>Subtotal:</span>
          <span>${curLabel} ${formatMoney(cur, subtotal)}</span>
        </div>
        <div class="calc-row">
          <span>PPN (${Math.round((data.taxRate || 0) * 100)}%):</span>
          <span>${curLabel} ${formatMoney(cur, tax)}</span>
        </div>
        <div class="calc-row total">
          <span>Total Investasi:</span>
          <span>${curLabel} ${formatMoney(cur, grandTotal)}</span>
        </div>
      </div>
      ${data.notes ? `<p style="margin-top:24px;font-size:13px;color:var(--text-muted);">${escMultiline(data.notes)}</p>` : ''}
    </section>`
      : ''

  const titleHtml = data.projectTitleAccent
    ? `${esc(data.projectTitle)} <strong>${esc(data.projectTitleAccent)}</strong>`
    : esc(data.projectTitle)

  // Image sections
  const coverStyle = data.coverImage
    ? ` style="background-image:linear-gradient(to bottom, rgba(15,35,24,0.15), rgba(15,35,24,0.78)), url('${esc(
        data.coverImage,
      )}');background-size:cover;background-position:center;color:#fff;"`
    : ''

  const aboutSection =
    data.aboutBody || data.aboutTitle
      ? `
    <section class="page-break">
      <div class="section-tag">Tentang Kami</div>
      <h2>${esc(data.aboutTitle || 'Tentang Studio')}</h2>
      <p style="font-size:15px;line-height:1.7;color:#444;">${escMultiline(data.aboutBody || '')}</p>
    </section>`
      : ''

  const galleryHtml = (items: ProposalImage[], title: string, tag: string) =>
    items.length > 0
      ? `
    <section class="page-break">
      <div class="section-tag">${esc(tag)}</div>
      <h2>${esc(title)}</h2>
      <div class="gallery-grid">
        ${items
          .map(
            (img) => `
        <figure class="gallery-item">
          <img src="${esc(img.src)}" alt="${esc(img.caption || '')}" loading="lazy" />
          ${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}
        </figure>`,
          )
          .join('')}
      </div>
    </section>`
      : ''

  const gallerySection = galleryHtml(data.gallery, data.galleryTitle || 'Portofolio & Referensi Desain', 'Portofolio')
  const moodboardSection = galleryHtml(data.moodboard, data.moodboardTitle || 'Moodboard & Material', 'Moodboard')

  const closingSection = data.closingNote
    ? `
    <section>
      <div class="section-tag">Penutup</div>
      <h2>Terima Kasih</h2>
      <p style="font-size:15px;line-height:1.7;color:#444;">${escMultiline(data.closingNote)}</p>
    </section>`
    : ''

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Proposal Penawaran - ${esc(data.projectTitle)}</title>
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
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: var(--text-dark);
    background-color: #eef2f7;
    margin: 0;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
  }
  .proposal-paper {
    background: #ffffff;
    width: 100%;
    max-width: 900px;
    padding: 60px;
    box-shadow: 0 4px 20px rgba(4,54,102,0.08);
    border-radius: 4px;
    position: relative;
  }
  .proposal-paper::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: linear-gradient(90deg, #5EC2E4 0%, #4AB3D8 32%, #045D93 100%);
    border-radius: 4px 4px 0 0;
  }
  header .confidential {
    font-size: 11px; letter-spacing: 3px; text-transform: uppercase;
    color: var(--text-muted); margin-bottom: 30px;
  }
  .brandbar { display: flex; align-items: center; gap: 12px; margin-bottom: 28px; }
  .brandbar .brand-logo { height: 52px; width: auto; object-fit: contain; }
  .brandbar .brand-name { font-size: 16px; font-weight: 800; color: var(--primary-color); letter-spacing: -0.3px; }
  .brandbar .brand-tag { font-size: 8px; font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase; color: var(--secondary-color); margin-top: 3px; }
  .cover-hero .brandbar .brand-name { color: #fff; }
  .cover-hero .brandbar .brand-logo { filter: brightness(0) invert(1); }
  .main-title { font-size: 42px; font-weight: 300; line-height: 1.2; margin: 0 0 10px 0; color: var(--text-dark); }
  .main-title strong { color: var(--primary-color); font-weight: 700; }
  .subtitle { font-size: 18px; color: var(--secondary-color); margin-bottom: 40px; font-style: italic; }
  .meta-info { background-color: var(--bg-light); padding: 20px; border-left: 4px solid var(--primary-color); margin-bottom: 50px; font-size: 14px; }
  section { margin-bottom: 60px; }
  .section-tag { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: var(--secondary-color); font-weight: bold; margin-bottom: 5px; }
  h2 { font-size: 24px; border-bottom: 1px solid #eeeeee; padding-bottom: 10px; margin-top: 0; margin-bottom: 25px; }
  .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .card { border: 1px solid #e0e0e0; padding: 25px; border-radius: 6px; background: #fafafa; }
  .card h3 { margin-top: 0; color: var(--primary-color); }
  .palette-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-top: 20px; }
  .color-swatch { border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden; background: #fff; text-align: center; padding-bottom: 12px; font-size: 13px; }
  .color-preview { height: 80px; width: 100%; }
  .timeline { list-style: none; padding: 0; position: relative; }
  .timeline-item { margin-bottom: 15px; padding-left: 30px; position: relative; }
  .timeline-item::before { content: ''; position: absolute; left: 0; top: 6px; width: 12px; height: 12px; border-radius: 50%; background: var(--primary-color); }
  .timeline-item .badge { background: var(--bg-light); color: var(--text-dark); padding: 2px 8px; font-size: 11px; font-weight: bold; border-radius: 4px; margin-right: 10px; }
  .rab-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
  .rab-table th { background-color: var(--primary-color); color: white; text-align: left; padding: 12px; font-weight: 500; }
  .rab-table td { padding: 12px; border-bottom: 1px solid #eeeeee; }
  .rab-table td.text-right, .calc-row span:last-child { font-family: 'JetBrains Mono', monospace; }
  .text-right { text-align: right; }
  .calculation-box { background: linear-gradient(135deg, #043666 0%, #045D93 100%); color: #fff; border-radius: 8px; padding: 25px; margin-top: 30px; margin-left: auto; width: 100%; max-width: 400px; }
  .calc-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: rgba(255,255,255,0.85); }
  .calc-row.total { border-top: 1px solid rgba(255,255,255,0.25); padding-top: 15px; font-size: 18px; font-weight: bold; color: #fff; }
  .calc-row.total span:last-child { color: #5EC2E4; }
  /* Cover hero */
  .cover-hero { border-radius: 10px; padding: 56px 40px; margin-bottom: 50px; }
  .cover-hero .confidential { color: rgba(255,255,255,0.8); }
  .cover-hero .main-title { color: #fff; }
  .cover-hero .main-title strong { color: #5EC2E4; }
  .cover-hero .subtitle { color: #cfeaf6; }
  .cover-hero .meta-info { background: rgba(255,255,255,0.12); border-left-color: #5EC2E4; color: #fff; backdrop-filter: blur(2px); }
  /* Image galleries */
  .gallery-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-top: 20px; }
  .gallery-item { margin: 0; border-radius: 8px; overflow: hidden; border: 1px solid #e8e8e8; background: #fafafa; }
  .gallery-item img { width: 100%; height: 200px; object-fit: cover; display: block; }
  .gallery-item figcaption { padding: 10px 14px; font-size: 13px; color: var(--text-muted); }
  footer { margin-top: 80px; border-top: 1px solid #eeeeee; padding-top: 20px; font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; align-items: center; }
  footer .footer-tagline { width: 100%; text-align: center; margin-top: 8px; font-size: 9px; letter-spacing: 0.22em; color: var(--secondary-color); font-weight: 700; }
  @media print {
    body { background: #fff; padding: 0; }
    .proposal-paper { box-shadow: none; padding: 32px; max-width: none; }
    .page-break { break-before: page; page-break-before: always; }
    .gallery-item, .card, .color-swatch { break-inside: avoid; page-break-inside: avoid; }
    .gallery-item img { height: 240px; }
  }
</style>
</head>
<body>
  <div class="proposal-paper" data-proposal-no="${esc(data.proposalNo)}">
    <header class="${data.coverImage ? 'cover-hero' : ''}"${coverStyle}>
      ${logoBlock}
      <div class="confidential">${esc(data.confidentialNote)}</div>
      <h1 class="main-title">${titleHtml}</h1>
      ${data.subtitle ? `<div class="subtitle">${esc(data.subtitle)}</div>` : ''}
      <div class="meta-info">
        <strong>Disusun khusus untuk:</strong><br>
        ${escMultiline(data.preparedFor)}
        ${data.metaSmall ? `<br><small>${escMultiline(data.metaSmall)}</small>` : ''}
        <br><small>No. Proposal: ${esc(data.proposalNo)}</small>
      </div>
    </header>
    ${aboutSection}
    ${summarySection}
    ${gallerySection}
    ${moodboardSection}
    ${paletteSection}
    ${timelineSection}
    ${pricingSection}
    ${closingSection}
    <footer>
      <div><strong>${esc(data.company.name)}</strong>${data.company.locations ? ` • ${esc(data.company.locations)}` : ''}</div>
      ${data.company.phone ? `<div>Hubungi: ${esc(data.company.phone)}</div>` : ''}
      <div class="footer-tagline">DESIGNING CORNERS · DEFINING SPACES</div>
    </footer>
  </div>
</body>
</html>`
}

/** Build sensible default proposal data from estimator output. */
export function defaultTimeline(): ProposalTimelineItem[] {
  return [
    { badge: 'W1-W2', text: 'Kick-Off & Design Review Report' },
    { badge: 'W3-W4', text: 'Concept Design (Layout Alternatif & Fasad)' },
    { badge: 'W5-W6', text: 'Schematic Design (3D & Pengembangan Material)' },
    { badge: 'W7-W9', text: 'Design Development (Detail & Koordinasi SE/MEP)' },
    { badge: 'W9-W11', text: 'Final Documentation (IFC Drawings, BOQ & PBG Support)' },
  ]
}
