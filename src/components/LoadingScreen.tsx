import React from 'react'

/**
 * Layar loading awal — logo SRA berkedip (blink). Responsif untuk mobile.
 * Dipakai saat app pertama kali boot.
 */
const LoadingScreen: React.FC<{ logo?: string }> = ({ logo }) => {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'radial-gradient(1100px 620px at 82% -12%, #0c3a64 0%, #04203a 60%), #04203a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 22,
      }}
    >
      <img
        src={logo || '/logo-main.png'}
        alt="Sudut Ruang Arsitek"
        className="sra-blink"
        style={{
          width: 'min(38vw, 160px)',
          height: 'auto',
          objectFit: 'contain',
          filter: 'drop-shadow(0 6px 24px rgba(0,0,0,0.35))',
        }}
      />
      <div
        className="sra-blink"
        style={{
          fontSize: 12,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          color: '#9DBAD2',
          fontWeight: 700,
        }}
      >
        Memuat...
      </div>
    </div>
  )
}

export default LoadingScreen
