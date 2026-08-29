import React from 'react';

export const TugOfWarBeam = ({ 
  beamPosition = 0 // -100 (défaite) à +100 (victoire), 0 = centre
}) => {
  // Convertit -100..+100 en pourcentage 5%..95% pour le positionnement
  const normalizedPercent = Math.max(5, Math.min(95, 50 + (beamPosition / 2)));

  return (
    <div style={{ position: 'relative', width: '100%', padding: '0.35rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Pipeline d'énergie */}
      <div 
        style={{
          position: 'relative',
          width: '100%',
          height: '32px',
          backgroundColor: 'rgba(6, 8, 14, 0.85)',
          borderRadius: '9999px',
          border: '1.5px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.9), 0 4px 20px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(12px)'
        }}
      >
        {/* Flux Joueur (Gauche - Cyan) */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: `${normalizedPercent}%`,
            background: 'linear-gradient(90deg, rgba(0, 242, 254, 0.25) 0%, rgba(0, 242, 254, 0.9) 85%, #ffffff 100%)',
            boxShadow: '0 0 25px rgba(0, 242, 254, 0.8)',
            transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />

        {/* Flux Adversaire (Droite - Crimson / Rose) */}
        <div 
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: `${100 - normalizedPercent}%`,
            background: 'linear-gradient(270deg, rgba(255, 0, 85, 0.25) 0%, rgba(255, 0, 85, 0.9) 85%, #ffffff 100%)',
            boxShadow: '0 0 25px rgba(255, 0, 85, 0.8)',
            transition: 'width 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />

        {/* Nœud Central de Singularité / Clash */}
        <div 
          style={{
            position: 'absolute',
            top: '50%',
            left: `${normalizedPercent}%`,
            transform: 'translate(-50%, -50%)',
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 0 20px #ffffff, 0 0 35px #00f2fe, 0 0 50px #ff0055',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'left 0.28s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          <div 
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#a5f3fc',
              animation: 'pulseGlow 1.2s infinite ease-in-out'
            }} 
          />
        </div>

        {/* Effet d'éclairs électriques filants */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%)',
            animation: 'beamShimmer 1.8s infinite linear',
            pointerEvents: 'none'
          }} 
        />
      </div>

      {/* Indicateurs de Tension */}
      <div 
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.25rem 0.4rem 0',
          fontSize: '0.75rem',
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 800
        }}
      >
        <span style={{ color: '#00f2fe', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>⚡ Ton Énergie</span>
          <span style={{ opacity: 0.9 }}>({Math.round(normalizedPercent)}%)</span>
        </span>
        <span style={{ color: '#ff0055', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ opacity: 0.9 }}>({Math.round(100 - normalizedPercent)}%)</span>
          <span>Rival ⚡</span>
        </span>
      </div>

      <style>{`
        @keyframes beamShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes pulseGlow {
          0%, 100% { transform: scale(0.9); opacity: 0.7; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
