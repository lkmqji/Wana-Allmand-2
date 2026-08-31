import { useState, useEffect } from 'react';

/**
 * Écran de chargement brandé optimiste pour le démarrage de l'application (Cold Start).
 * Affiche le logo animé, une lueur néon et une barre de progression fluide.
 */
export default function AppSplashScreen({ onFinish, minDurationMs = 1200 }) {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Initialisation de l'arène...");

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / minDurationMs) * 100));
      setProgress(pct);

      if (pct < 40) {
        setStatusText("Initialisation de l'arène...");
      } else if (pct < 75) {
        setStatusText("Synchronisation des données...");
      } else if (pct < 95) {
        setStatusText("Préparation du duel...");
      } else {
        setStatusText("Prêt !");
      }

      if (elapsed >= minDurationMs) {
        clearInterval(interval);
        if (onFinish) onFinish();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [minDurationMs, onFinish]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(180deg, #0b0f19 0%, #060911 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '2rem',
      userSelect: 'none',
      overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top, 2rem)',
      paddingBottom: 'env(safe-area-inset-bottom, 2rem)'
    }}>
      {/* Halo lumineux d'arrière-plan */}
      <div style={{
        position: 'absolute',
        width: '320px',
        height: '320px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(236, 72, 153, 0.12) 50%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none',
        animation: 'splashPulse 2.5s ease-in-out infinite'
      }} />

      {/* Logo & Emblème */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.2rem',
        position: 'relative',
        zIndex: 1,
        marginBottom: '2.5rem'
      }}>
        <div style={{
          width: '96px',
          height: '96px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #6366f1, #ec4899)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          boxShadow: '0 12px 32px rgba(99, 102, 241, 0.4), 0 0 20px rgba(236, 72, 153, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          🇩🇪
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            margin: 0,
            fontSize: '2.2rem',
            fontWeight: 900,
            letterSpacing: '2px',
            background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontFamily: "'Syne', 'Outfit', sans-serif"
          }}>
            WANA ALLMAND
          </h1>
          <p style={{
            margin: '0.4rem 0 0',
            color: '#94a3b8',
            fontSize: '0.92rem',
            fontWeight: 600,
            letterSpacing: '1px'
          }}>
            ARÈNE DE VOCABULAIRE ALLEMAND
          </p>
        </div>
      </div>

      {/* Barre de Progression Brandée */}
      <div style={{
        width: '100%',
        maxWidth: '260px',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.7rem'
      }}>
        <div style={{
          width: '100%',
          height: '6px',
          borderRadius: '999px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #6366f1, #ec4899, #f59e0b)',
            borderRadius: '999px',
            transition: 'width 0.05s linear',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.8)'
          }} />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          fontSize: '0.75rem',
          color: '#64748b',
          fontWeight: 600
        }}>
          <span>{statusText}</span>
          <span style={{ color: '#a5b4fc', fontFamily: 'monospace' }}>{progress}%</span>
        </div>
      </div>

      <style>{`
        @keyframes splashPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
