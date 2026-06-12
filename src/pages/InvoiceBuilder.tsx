import { useState, useEffect } from 'react'
import { T } from '../components/AcosUI'
import { ArrowLeft } from 'lucide-react'
import { supabase, DocumentService } from '../services/supabaseClient'
import { InvoicePrefill } from '../services/spkData'

interface Props {
  onBack: () => void
  prefill?: InvoicePrefill | null
}

const InvoiceBuilder = ({ onBack, prefill }: Props) => {
  const [loading, setLoading] = useState(true)
  const [alertInfo, setAlertInfo] = useState<{show: boolean, type: 'success' | 'error', message: string} | null>(null)

  // URL iframe + data prefill (dari SPK) lewat query param.
  const iframeSrc = (() => {
    const base = '/template_dokument/Invoice _ Tagihan Template.html?v=20260612-4'
    if (!prefill) return base
    try {
      return `${base}&data=${encodeURIComponent(JSON.stringify(prefill))}`
    } catch {
      return base
    }
  })()
  const [uploading, setUploading] = useState(false)

  // Listen to messages from the iframe
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'INVOICE_PDF_GENERATED') {
        const { pdfBase64, invoiceData } = event.data
        
        try {
          setUploading(true)
          
          // 1. Convert Base64 back to Blob
          const res = await fetch(pdfBase64)
          const blob = await res.blob()

          // 2. Upload ke Cloudinary (sebagai raw karena PDF)
          const fileName = `INV-${Date.now()}-${invoiceData.invNo.replace(/\//g, '-')}.pdf`
          const formData = new FormData()
          formData.append('file', blob)
          formData.append('upload_preset', 'dashboard_uploads')
          formData.append('public_id', `invoices/${fileName}`)

          const cloudRes = await fetch('https://api.cloudinary.com/v1_1/dtfmjwofq/raw/upload', {
            method: 'POST',
            body: formData,
          })
          const cloudData = await cloudRes.json()

          if (!cloudData.secure_url) {
            throw new Error('Gagal upload PDF ke Cloudinary: ' + (cloudData.error?.message || 'unknown error'))
          }

          const fileUrl = cloudData.secure_url

          // Normalisasi nomor WA: ambil digit saja, ubah awalan 0 -> 62
          const rawPhone = (invoiceData.clientPhone || '').toString().replace(/\D/g, '')
          const recipient = rawPhone.startsWith('0')
            ? '62' + rawPhone.slice(1)
            : rawPhone.startsWith('62')
              ? rawPhone
              : rawPhone.startsWith('8')
                ? '62' + rawPhone
                : rawPhone

          // 4. Insert to Documents Table
          const { error: dbError } = await DocumentService.insert({
            conversation_id: null,
            client_phone: recipient || null,
            client_name: invoiceData.clientName || 'Klien Baru',
            type: 'invoice',
            status: 'sent',
            file_url: fileUrl,
            proposal_no: invoiceData.invNo,
            data: invoiceData,
            sent_at: new Date().toISOString(),
            valid_until: null
          })

          if (dbError) throw new Error('Gagal menyimpan ke database: ' + dbError.message)

          // 5. Trigger n8n Webhook
          const configRow = await supabase.from('ai_config').select('value').eq('key', 'webhook_pdf_url').single()
          const n8nWebhookUrl = configRow?.data?.value || 'https://n8n.example.com/webhook/invoice-generated'

          let waSent = false
          try {
            const webhookRes = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoice_number: invoiceData.invNo,
                client_name: invoiceData.clientName,
                client_phone: recipient,
                recipient: recipient,
                project_name: invoiceData.projName,
                contract_value: invoiceData.contractValue,
                total_value: invoiceData.total,
                pdf_url: fileUrl,
                timestamp: new Date().toISOString()
              })
            })
            waSent = webhookRes.ok
            console.log('Webhook n8n status:', webhookRes.status)
          } catch (webhookErr) {
            console.warn('Webhook n8n gagal dipanggil:', webhookErr)
          }

          if (waSent && recipient) {
            setAlertInfo({
              show: true,
              type: 'success',
              message: `Invoice berhasil dikirim lewat WhatsApp ke No ${recipient}.`
            })
          } else if (waSent) {
            setAlertInfo({
              show: true,
              type: 'success',
              message: 'Invoice berhasil diproses & dikirim ke sistem.'
            })
          } else {
            setAlertInfo({
              show: true,
              type: 'success',
              message: 'PDF berhasil di-upload, namun pengiriman WhatsApp belum terkonfirmasi. Cek workflow n8n.'
            })
          }
          
        } catch (err: any) {
          console.error(err)
          setAlertInfo({
            show: true,
            type: 'error',
            message: `Gagal memproses dokumen: ${err.message}`
          })
        } finally {
          setUploading(false)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bgGrad }}>
      {/* Top Bar */}
      <div style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16, borderBottom: `1px solid ${T.line}`, background: T.panel }}>
        <button 
          onClick={onBack}
          style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: '50%', background: T.inset, 
            border: `1px solid ${T.line}`, color: T.txt, cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = T.sky}
          onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: T.txt }}>Invoice Builder</h1>
          <p style={{ fontSize: 12, color: T.dim, margin: '2px 0 0' }}>Buat tagihan pembayaran termijn proyek</p>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.dim }}>
            Memuat Invoice Builder...
          </div>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: T.panel, padding: '24px 40px', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: T.bright }}></div>
              <p style={{ color: T.txt, fontWeight: 600, margin: 0 }}>Menyimpan & Mengupload PDF...</p>
            </div>
          </div>
        )}
        
        {/* Custom Alert Modal */}
        {alertInfo && alertInfo.show && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
            <div style={{ background: T.panel, padding: '32px', borderRadius: 20, width: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', border: `1px solid ${T.line}`, textAlign: 'center' }}>
              <div style={{ 
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: alertInfo.type === 'success' ? '#10b98120' : '#ef444420',
                color: alertInfo.type === 'success' ? '#10b981' : '#ef4444'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32 }}>
                  {alertInfo.type === 'success' ? 'check_circle' : 'error'}
                </span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 12px', color: T.txt }}>
                {alertInfo.type === 'success' ? 'Berhasil!' : 'Terjadi Kesalahan'}
              </h3>
              <p style={{ fontSize: 14, color: T.dim, lineHeight: 1.6, margin: '0 0 24px' }}>
                {alertInfo.message}
              </p>
              <button 
                onClick={() => setAlertInfo(null)}
                style={{ 
                  width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, cursor: 'pointer',
                  background: alertInfo.type === 'success' ? T.sky : '#ef4444',
                  color: '#fff', border: 'none', transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Tutup
              </button>
            </div>
          </div>
        )}
        <iframe 
          src={iframeSrc} 
          style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
          onLoad={() => setLoading(false)}
          title="Invoice Builder"
        />
      </div>
    </div>
  )
}

export default InvoiceBuilder
