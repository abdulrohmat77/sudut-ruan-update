import React from 'react'

/**
 * Layar loading awal — logo SRA berkedip (blink). Responsif untuk mobile.
 * Logo ditaruh di chip terang supaya lockup navy-nya tetap terbaca.
 */
const LoadingScreen: React.FC<{ logo?: string }> = ({ logo }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999,
        background: 'radial-gradient(900px 520px at 50% 30%, #0c3a64 0%, #04203a 70%), #04203a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: 24,
        boxSizing: 'border-box',
        textAlign: 'center',
      }}
    >
      <div
        className="sra-blink"
        style={{
          background: '#ffffff',
          borderRadius: 22,
          padding: '22px 30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '80vw',
        }}
      >
        <img
          src={logo || '/logo-main.png'}
          alt="Sudut Ruang Arsitek"
          style={{
            width: 'min(60vw, 220px)',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      <div
        className="sra-blink"
        style={{
          fontSize: 11,
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: '#7fd3ee',
          fontWeight: 800,
        }}
      >
        Memuat...
      </div>
    </div>
  )
}

export default LoadingScreen
