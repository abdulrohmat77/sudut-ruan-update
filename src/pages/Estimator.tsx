import React, { useEffect, useMemo, useState } from 'react'
import {
  constructionRates,
  designServiceRates,
  getSuggestedServices,
  calculateRab,
  calculateFee,
  formatIDR,
  formatIDRShort,
} from '../services/pricingService'
import { AIConfigService, DocumentService } from '../services/supabaseClient'
import ProposalPreviewModal from '../components/ProposalPreviewModal'
import { ProposalData, defaultTimeline } from '../services/proposalTemplate'
import { SpkPrefill } from '../services/spkData'

interface ImageEditorProps {
  label: string
  items: { src: string; caption: string }[]
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onCaption: (index: number, value: string) => void
  onRemove: (index: number) => void
}

const ImageEditor: React.FC<ImageEditorProps> = ({ label, items, onUpload, onCaption, onRemove }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide">{label}</label>
      <label className="py-1.5 px-3 border border-outline-variant rounded-lg text-[12px] font-bold hover:bg-surface-container cursor-pointer flex items-center gap-xs">
        <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
        Tambah Foto
        <input type="file" accept="image/*" multiple onChange={onUpload} className="hidden" />
      </label>
    </div>
    {items.length === 0 ? (
      <p className="text-[12px] text-on-surface-variant">Belum ada foto. Maks 12 foto, dikompres otomatis.</p>
    ) : (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
        {items.map((img, i) => (
          <div key={i} className="border border-outline-variant rounded-lg overflow-hidden bg-surface-container-low">
            <div className="relative">
              <img src={img.src} alt="" className="w-full h-24 object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-brand-dark/70 text-white flex items-center justify-center hover:bg-error"
                aria-label="Hapus foto"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
            <input
              type="text"
              value={img.caption}
              onChange={(e) => onCaption(i, e.target.value)}
              placeholder="Keterangan..."
              className="w-full px-2 py-1.5 bg-transparent border-t border-outline-variant text-[12px] outline-none"
            />
          </div>
        ))}
      </div>
    )}
  </div>
)

const Estimator: React.FC<{ onCreateSpk?: (prefill: SpkPrefill) => void }> = ({ onCreateSpk }) => {
  // Step 1: RAB Konstruksi
  const [constructionId, setConstructionId] = useState(constructionRates[1].id) // default Rumah Standar
  const [area, setArea] = useState('100')

  // Step 2: Fee Jasa
  const [serviceId, setServiceId] = useState('')
  const [calcMode, setCalcMode] = useState<'percentage' | 'per_sqm'>('percentage')
  const [customPercent, setCustomPercent] = useState<string>('')

  // Optional client info
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [projectName, setProjectName] = useState('')

  // Proposal preview
  const [showProposal, setShowProposal] = useState(false)
  const [savingProposal, setSavingProposal] = useState(false)
  const [savedProposal, setSavedProposal] = useState(false)
  // Proposal visual content (editable, optional images)
  const [showProposalEditor, setShowProposalEditor] = useState(false)
  const [coverImage, setCoverImage] = useState('')
  const [aboutBody, setAboutBody] = useState(
    'Sudut Ruang Archineering adalah studio arsitektur, interior, dan lansekap yang menghadirkan desain fungsional dengan karakter kuat. Kami mendampingi klien dari konsep hingga dokumentasi konstruksi.',
  )
  const [gallery, setGallery] = useState<{ src: string; caption: string }[]>([])
  const [moodboard, setMoodboard] = useState<{ src: string; caption: string }[]>([])
  const [closingNote, setClosingNote] = useState(
    'Terima kasih atas kepercayaan Anda. Kami siap berdiskusi lebih lanjut untuk mewujudkan ruang impian Anda.',
  )
  const [company, setCompany] = useState({
    name: 'Sudut Ruang Arsitek',
    locations: 'Surabaya | Bali | IKN',
    phone: '+62 851 7700 0990',
    logo: '',
  })

  useEffect(() => {
    AIConfigService.getAll().then((cfg) => {
      setCompany({
        name: cfg.company_name || 'Sudut Ruang Arsitek',
        locations: cfg.company_locations || 'Surabaya | Bali | IKN',
        phone: cfg.company_phone || '+62 851 7700 0990',
        logo: cfg.company_logo || '',
      })
    })
  }, [])

  const selectedConstruction = useMemo(
    () => constructionRates.find((r) => r.id === constructionId),
    [constructionId],
  )

  const rab = useMemo(
    () => calculateRab(constructionId, parseFloat(area) || 0),
    [constructionId, area],
  )

  const suggestedServices = useMemo(
    () => (selectedConstruction ? getSuggestedServices(selectedConstruction.type, selectedConstruction.tier) : []),
    [selectedConstruction],
  )

  // Auto-pick service kalau belum ada selection
  React.useEffect(() => {
    if (suggestedServices.length > 0 && !suggestedServices.find((s) => s.id === serviceId)) {
      setServiceId(suggestedServices[0].id)
    }
  }, [suggestedServices, serviceId])

  const selectedService = useMemo(
    () => designServiceRates.find((s) => s.id === serviceId),
    [serviceId],
  )

  const fee = useMemo(() => {
    if (!serviceId || !rab) return null
    const pct = customPercent ? parseFloat(customPercent) : undefined
    return calculateFee(serviceId, {
      mode: calcMode,
      rabValue: rab.rabAvg,
      area: parseFloat(area) || 0,
      customPercent: pct,
    })
  }, [serviceId, rab, calcMode, customPercent, area])

  // Group construction types untuk dropdown
  const constructionGroups = useMemo(() => {
    const grouped: Record<string, typeof constructionRates> = {}
    constructionRates.forEach((r) => {
      if (!grouped[r.type]) grouped[r.type] = []
      grouped[r.type].push(r)
    })
    return grouped
  }, [])

  // Build proposal data from the current estimate for preview / print / save.
  const proposalNoRef = useMemo(() => `PROP-${Date.now()}`, [clientName, projectName, constructionId, area, serviceId])

  const buildProposalData = (): ProposalData | null => {
    if (!rab || !fee) return null
    const tierLabel = selectedConstruction
      ? `${selectedConstruction.type} — ${selectedConstruction.tier}`
      : ''
    const now = new Date()
    const dateLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

    return {
      proposalNo: proposalNoRef,
      dateLabel,
      confidentialNote: `Confidential & Proprietary • ${dateLabel}`,
      projectTitle: projectName || selectedConstruction?.type || 'Proyek',
      projectTitleAccent: '',
      subtitle: tierLabel,
      preparedFor: clientName || 'Calon Klien',
      metaSmall: `Luas: ${area} m²${clientPhone ? ` | WA: ${clientPhone}` : ''} | Studio: ${company.name}`,
      currency: 'IDR',
      taxRate: 0.11,
      coverImage: coverImage || undefined,
      aboutTitle: 'Tentang Studio',
      aboutBody: aboutBody.trim(),
      gallery: gallery.filter((g) => g.src),
      galleryTitle: 'Portofolio & Referensi Desain',
      moodboard: moodboard.filter((m) => m.src),
      moodboardTitle: 'Moodboard & Material',
      summaryTitle: 'Executive Summary',
      summaryCards: [
        {
          title: 'Ruang Lingkup',
          body: `${selectedService?.serviceName || 'Jasa Desain'} untuk ${selectedConstruction?.type || 'proyek'} seluas ${area} m².`,
        },
        {
          title: 'Spesifikasi',
          body: selectedConstruction?.specification || 'Sesuai kesepakatan dan hasil survey lokasi.',
        },
      ],
      paletteTitle: 'Material & Color Direction',
      paletteIntro: '',
      palette: [],
      timelineTitle: 'Timeline Kerja',
      timeline: defaultTimeline(),
      pricingTitle: 'Rincian Anggaran Fee Konsultan',
      lineItems: [
        {
          description: `Estimasi RAB Konstruksi — ${tierLabel}`,
          volume: `${area} m²`,
          qty: 1,
          unitPrice: rab.rabAvg,
        },
        {
          description: selectedService?.serviceName || 'Fee Jasa Desain',
          volume: '1 Paket',
          qty: 1,
          unitPrice: fee.feeAvg,
        },
      ],
      notes:
        'Angka di atas merupakan estimasi awal dan dapat berubah setelah survey lokasi dan diskusi detail. Proposal berlaku 14 hari sejak diterbitkan.',
      closingNote: closingNote.trim() || undefined,
      company,
    }
  }

  const proposalData = showProposal ? buildProposalData() : null

  const handleSaveProposalDoc = async () => {
    if (!rab || !fee) return
    setSavingProposal(true)
    const normalizedPhone = clientPhone.replace(/[^\d]/g, '')
    await DocumentService.insert({
      conversation_id: null,
      client_phone: normalizedPhone || null,
      client_name: clientName || 'Klien',
      type: 'proposal',
      status: 'draft',
      file_url: null,
      proposal_no: proposalNoRef,
      data: {
        constructionId,
        area: parseFloat(area),
        rabAvg: rab.rabAvg,
        serviceId,
        feeAvg: fee.feeAvg,
        ppn: fee.ppn,
        totalAvg: fee.totalAvg,
        clientName,
        projectName,
        currency: 'IDR',
        generatedAt: new Date().toISOString(),
      },
      sent_at: null,
      valid_until: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    })
    setSavingProposal(false)
    setSavedProposal(true)
    setTimeout(() => setSavedProposal(false), 3000)
  }

  // ── Image helpers (manual upload, compressed to keep size small) ──
  const fileToCompressedDataUrl = (file: File, maxDim = 1280, quality = 0.82): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('read error'))
      reader.onload = () => {
        const img = new Image()
        img.onerror = () => reject(new Error('image error'))
        img.onload = () => {
          let { width, height } = img
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(String(reader.result))
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        }
        img.src = String(reader.result)
      }
      reader.readAsDataURL(file)
    })

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !file.type.startsWith('image/')) return
    setCoverImage(await fileToCompressedDataUrl(file, 1600, 0.8))
  }

  const handleGalleryUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<{ src: string; caption: string }[]>>,
  ) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    const imgs = files.filter((f) => f.type.startsWith('image/'))
    const out: { src: string; caption: string }[] = []
    for (const f of imgs) {
      out.push({ src: await fileToCompressedDataUrl(f), caption: '' })
    }
    setter((prev) => [...prev, ...out].slice(0, 12))
  }

  return (
    <div className="p-sm md:p-gutter max-w-container-max mx-auto space-y-md">
      {/* Header */}
      <div>
        <h1 className="font-serif-display text-display-lg text-on-background">AI Estimator</h1>
        <p className="text-body-md text-on-surface-variant">
          Kalkulator komprehensif: RAB Konstruksi + Fee Jasa Desain
        </p>
      </div>

      {/* Optional Client Info */}
      <div className="bg-surface border border-outline-variant rounded-2xl p-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-sm">
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-2">
              Nama Klien (opsional)
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Contoh: Bpk. Budi"
              className="w-full px-md py-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-brand-accent outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-2">
              Nomor WhatsApp (opsional)
            </label>
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Contoh: 6281234567890"
              className="w-full px-md py-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-brand-accent outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-2">
              Nama Proyek (opsional)
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Contoh: Renovasi Apartemen Studio"
              className="w-full px-md py-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-brand-accent outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
        {/* STEP 1: RAB Konstruksi */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <div className="flex items-center gap-sm mb-md">
            <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold">RAB Konstruksi</h2>
              <p className="text-label-caps text-on-surface-variant">Estimasi biaya pembangunan</p>
            </div>
          </div>

          <div className="space-y-md">
            <div>
              <label className="text-label-caps text-on-surface-variant uppercase block mb-2">
                Tipe & Kelas Bangunan
              </label>
              <select
                value={constructionId}
                onChange={(e) => setConstructionId(e.target.value)}
                className="w-full px-md py-3 bg-surface-container-low border-none rounded-lg text-body-md focus:ring-2 focus:ring-secondary outline-none"
              >
                {Object.entries(constructionGroups).map(([type, items]) => (
                  <optgroup key={type} label={type}>
                    {items.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.tier} — {formatIDRShort(r.pricePerSqmMin)}/m² – {formatIDRShort(r.pricePerSqmMax)}/m²
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedConstruction && (
                <p className="text-label-caps text-on-surface-variant mt-2">
                  ℹ️ {selectedConstruction.specification}
                  {selectedConstruction.notes && ` • ${selectedConstruction.notes}`}
                </p>
              )}
            </div>

            <div>
              <label className="text-label-caps text-on-surface-variant uppercase block mb-2">
                Luas Area
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-md py-3 pr-12 bg-surface-container-low border-none rounded-lg text-body-md focus:ring-2 focus:ring-secondary outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">m²</span>
              </div>
            </div>

            {/* Hasil RAB */}
            {rab && (
              <div className="bg-surface-container rounded-lg p-md border border-outline-variant">
                <div className="text-label-caps text-on-surface-variant uppercase mb-sm">
                  Estimasi RAB Konstruksi
                </div>
                <div className="grid grid-cols-3 gap-2 mb-sm">
                  <div>
                    <div className="text-label-caps text-on-surface-variant">Min</div>
                    <div className="font-mono-label text-mono-label font-bold text-on-surface-variant">
                      {formatIDRShort(rab.rabMin)}
                    </div>
                  </div>
                  <div>
                    <div className="text-label-caps text-secondary uppercase font-bold">Avg</div>
                    <div className="font-headline-sm text-headline-sm font-bold text-secondary">
                      {formatIDRShort(rab.rabAvg)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-label-caps text-on-surface-variant">Max</div>
                    <div className="font-mono-label text-mono-label font-bold text-on-surface-variant">
                      {formatIDRShort(rab.rabMax)}
                    </div>
                  </div>
                </div>
                <div className="text-label-caps text-on-surface-variant pt-2 border-t border-outline-variant">
                  📐 {rab.area}m² × {formatIDRShort(rab.pricePerSqmMin)}–{formatIDRShort(rab.pricePerSqmMax)}/m²
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STEP 2: Fee Jasa Desain */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <div className="flex items-center gap-sm mb-md">
            <div className="w-9 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold">Fee Jasa Desain</h2>
              <p className="text-label-caps text-on-surface-variant">Tagihan untuk klien</p>
            </div>
          </div>

          <div className="space-y-md">
            <div>
              <label className="text-label-caps text-on-surface-variant uppercase block mb-2">
                Jenis Jasa
                {suggestedServices.length > 0 && (
                  <span className="ml-2 text-secondary normal-case">
                    ✨ AI suggested
                  </span>
                )}
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="w-full px-md py-3 bg-surface-container-low border-none rounded-lg text-body-md focus:ring-2 focus:ring-secondary outline-none"
              >
                <optgroup label="✨ Suggested for this project">
                  {suggestedServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.serviceName}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="All Services">
                  {designServiceRates
                    .filter((s) => !suggestedServices.find((sg) => sg.id === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.serviceName}
                      </option>
                    ))}
                </optgroup>
              </select>
              {selectedService && (
                <p className="text-label-caps text-on-surface-variant mt-2">
                  ℹ️ {selectedService.description}
                </p>
              )}
            </div>

            <div>
              <label className="text-label-caps text-on-surface-variant uppercase block mb-2">
                Mode Hitung
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCalcMode('percentage')}
                  className={`py-3 px-md rounded-lg text-body-md font-bold transition-colors ${
                    calcMode === 'percentage'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container hover:bg-surface-container-high'
                  }`}
                >
                  % dari RAB
                </button>
                <button
                  onClick={() => setCalcMode('per_sqm')}
                  className={`py-3 px-md rounded-lg text-body-md font-bold transition-colors ${
                    calcMode === 'per_sqm'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container hover:bg-surface-container-high'
                  }`}
                >
                  Per m²
                </button>
              </div>
            </div>

            {calcMode === 'percentage' && selectedService && (
              <div>
                <label className="text-label-caps text-on-surface-variant uppercase block mb-2">
                  Persentase Fee (default {selectedService.feePercentMin}–{selectedService.feePercentMax}%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    value={customPercent}
                    onChange={(e) => setCustomPercent(e.target.value)}
                    placeholder={`${selectedService.feePercentMin}-${selectedService.feePercentMax}`}
                    className="w-full px-md py-3 pr-12 bg-surface-container-low border-none rounded-lg text-body-md focus:ring-2 focus:ring-secondary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">%</span>
                </div>
              </div>
            )}

            {/* Fee Result */}
            {fee && (
              <div className="bg-secondary-container rounded-lg p-md text-on-secondary-container">
                <div className="text-label-caps uppercase opacity-80 mb-sm">
                  Fee Jasa Desain
                </div>
                <div className="grid grid-cols-3 gap-2 mb-md">
                  <div>
                    <div className="text-label-caps opacity-70">Min</div>
                    <div className="font-mono-label text-mono-label font-bold">
                      {formatIDRShort(fee.feeMin)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-label-caps font-bold">Recommended</div>
                    <div className="font-display-lg text-[24px] font-bold">
                      {formatIDRShort(fee.feeAvg)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-label-caps opacity-70">Max</div>
                    <div className="font-mono-label text-mono-label font-bold">
                      {formatIDRShort(fee.feeMax)}
                    </div>
                  </div>
                </div>
                <div className="space-y-1 pt-sm border-t border-white/20 text-sm">
                  <div className="flex justify-between">
                    <span className="opacity-80">Fee Subtotal</span>
                    <span className="font-mono-label">{formatIDR(fee.feeAvg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="opacity-80">PPN 11%</span>
                    <span className="font-mono-label">{formatIDR(fee.ppn)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-white/20">
                    <span>TOTAL TAGIHAN</span>
                    <span className="font-mono-label">{formatIDR(fee.totalAvg)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Proposal Visual Content Editor */}
      {rab && fee && (
        <div className="bg-surface border border-outline-variant rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowProposalEditor((s) => !s)}
            className="w-full flex items-center justify-between px-md py-sm hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-brand-mid">photo_library</span>
              <div className="text-left">
                <h3 className="text-[15px] font-semibold">Konten Visual Proposal</h3>
                <p className="text-[12px] text-on-surface-variant">
                  Cover, tentang studio, foto portofolio, moodboard{gallery.length + moodboard.length > 0 ? ` · ${gallery.length + moodboard.length} foto` : ''}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">
              {showProposalEditor ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showProposalEditor && (
            <div className="px-md pb-md space-y-md border-t border-outline-variant pt-md">
              {/* Cover */}
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-2">
                  Foto Cover (hero)
                </label>
                <div className="flex items-center gap-md">
                  <div className="w-28 h-16 rounded-lg bg-surface-container border border-outline-variant overflow-hidden flex items-center justify-center flex-shrink-0">
                    {coverImage ? (
                      <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant">image</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-sm">
                    <label className="py-2 px-md bg-brand text-white rounded-lg text-[13px] font-bold hover:opacity-90 cursor-pointer flex items-center gap-xs">
                      <span className="material-symbols-outlined text-[18px]">upload</span>
                      Unggah Cover
                      <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                    </label>
                    {coverImage && (
                      <button
                        onClick={() => setCoverImage('')}
                        className="py-2 px-md border border-outline-variant rounded-lg text-[13px] font-bold hover:bg-surface-container"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* About */}
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-2">
                  Tentang Studio
                </label>
                <textarea
                  rows={3}
                  value={aboutBody}
                  onChange={(e) => setAboutBody(e.target.value)}
                  className="w-full px-md py-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-brand-accent outline-none resize-none"
                />
              </div>

              {/* Gallery */}
              <ImageEditor
                label="Portofolio / Render Desain"
                items={gallery}
                onUpload={(e) => handleGalleryUpload(e, setGallery)}
                onCaption={(i, v) => setGallery((p) => p.map((it, idx) => (idx === i ? { ...it, caption: v } : it)))}
                onRemove={(i) => setGallery((p) => p.filter((_, idx) => idx !== i))}
              />

              {/* Moodboard */}
              <ImageEditor
                label="Moodboard / Material"
                items={moodboard}
                onUpload={(e) => handleGalleryUpload(e, setMoodboard)}
                onCaption={(i, v) => setMoodboard((p) => p.map((it, idx) => (idx === i ? { ...it, caption: v } : it)))}
                onRemove={(i) => setMoodboard((p) => p.filter((_, idx) => idx !== i))}
              />

              {/* Closing */}
              <div>
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wide block mb-2">
                  Catatan Penutup
                </label>
                <textarea
                  rows={2}
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  className="w-full px-md py-3 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-brand-accent outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {rab && fee && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <div className="flex items-center justify-between mb-md">
            <div>
              <h3 className="font-headline-sm text-headline-sm font-bold">Actions</h3>
              <p className="text-label-caps text-on-surface-variant">
                Generate proposal atau kirim ke klien langsung
              </p>
            </div>
            <span className="px-2 py-1 bg-tertiary-fixed text-on-tertiary-fixed rounded-full text-label-caps font-bold uppercase">
              Draft AI
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
            <button
              onClick={() => setShowProposal(true)}
              className="flex items-center justify-center gap-sm py-3 bg-primary text-on-primary rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all md:col-span-2"
            >
              <span className="material-symbols-outlined">visibility</span>
              Preview & Cetak Proposal (PDF)
            </button>
            {onCreateSpk && (
              <button
                onClick={() =>
                  onCreateSpk({
                    clientName,
                    clientPhone,
                    projectName,
                    totalFee: fee?.feeAvg || 0,
                    luas: area ? `${area} m²` : '',
                  })
                }
                className="flex items-center justify-center gap-sm py-3 bg-secondary-container text-on-secondary-container rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all md:col-span-2"
              >
                <span className="material-symbols-outlined">assignment</span>
                Lanjut ke SPK (pakai data ini)
              </button>
            )}
          </div>
        </div>
      )}

      {showProposal && proposalData && (
        <ProposalPreviewModal
          data={proposalData}
          onClose={() => setShowProposal(false)}
          onSave={handleSaveProposalDoc}
          saving={savingProposal}
          saved={savedProposal}
        />
      )}
    </div>
  )
}

export default Estimator
