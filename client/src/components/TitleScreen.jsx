import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { sfx } from '../utils/sfxManager';

export default function TitleScreen({ onEnter, user, playerName, avatar }) {
  const [isExiting, setIsExiting] = useState(false);
  const { startBgm, playGameStart, isSoundEnabled } = useAudio();

  const handleStart = () => {
    if (isExiting) return;
    setIsExiting(true);

    // 1. Force audio unlocking & trigger BGM
    try {
      sfx.unlockAudio();
      if (isSoundEnabled) {
        startBgm();
      }
    } catch (err) {
      console.debug('Audio unlock error:', err);
    }

    // 2. Play game start cinematic power chime
    try {
      playGameStart();
    } catch (err) {
      console.debug('Game start SFX error:', err);
    }

    // 3. Smooth 500ms fade-out transition before revealing the dashboard
    setTimeout(() => {
      onEnter();
    }, 500);
  };

  return (
    <div
      onClick={handleStart}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #0f172a 60%, #030712 100%)',
        color: '#ffffff',
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
        transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isExiting ? 0 : 1,
        transform: isExiting ? 'scale(1.05)' : 'scale(1)',
        pointerEvents: isExiting ? 'none' : 'auto'
      }}
    >
      {/* Dynamic Background Cyber Grids & Neon Glows */}
      <div
        style={{
          position: 'absolute',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(236, 72, 153, 0.15) 50%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'titleGlowPulse 4s ease-in-out infinite alternate',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '650px'
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.4)',
            color: '#a5b4fc',
            fontSize: '0.85rem',
            fontWeight: 800,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '1.5rem',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
          }}
        >
          <span>⚔️</span> Arène Esport d'Allemand
        </div>

        {/* Giant Main Title */}
        <h1
          className="brand-logo-shine"
          style={{
            fontSize: 'clamp(2.8rem, 8vw, 4.8rem)',
            fontWeight: 950,
            letterSpacing: '2px',
            margin: 0,
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 35%, #818cf8 70%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 35px rgba(99, 102, 241, 0.6))'
          }}
        >
          WANA ALLMAND
        </h1>

        {/* User Greeting if authenticated */}
        {(playerName || user?.displayName) && (
          <div
            style={{
              marginTop: '1.2rem',
              fontSize: '1.1rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>{avatar || '🦊'}</span>
            <span>Prêt pour le combat, <strong style={{ color: '#f8fafc' }}>{playerName || user?.displayName}</strong> ?</span>
          </div>
        )}

        {/* Animated Action Prompt */}
        <div style={{ marginTop: '3.5rem' }}>
          <button
            type="button"
            className="title-screen-enter-btn"
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem',
              padding: '1.1rem 2.8rem',
              fontSize: '1.2rem',
              fontWeight: 800,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #ec4899 100%)',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.6), 0 10px 25px rgba(0,0,0,0.5)',
              animation: 'pulseTitleBtn 2s infinite ease-in-out',
              transition: 'transform 0.15s ease'
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>▶</span>
            <span>Entrer dans l'arène</span>
          </button>
        </div>

        {/* Sound Notice Hint */}
        <p
          style={{
            marginTop: '2rem',
            fontSize: '0.85rem',
            color: '#64748b',
            letterSpacing: '0.5px'
          }}
        >
          {isSoundEnabled ? '🔊 Audio & Effets Sonores activés' : '🔇 Audio coupé'} • Cliquez n'importe où pour démarrer
        </p>
      </div>

      <style>{`
        @keyframes titleGlowPulse {
          0% { transform: scale(0.9) translate(0, 0); opacity: 0.6; }
          100% { transform: scale(1.15) translate(20px, -20px); opacity: 0.9; }
        }

        @keyframes pulseTitleBtn {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 25px rgba(99, 102, 241, 0.5), 0 10px 25px rgba(0, 0, 0, 0.4);
            opacity: 1;
          }
          50% {
            transform: scale(1.04);
            box-shadow: 0 0 45px rgba(236, 72, 153, 0.8), 0 15px 35px rgba(0, 0, 0, 0.6);
            opacity: 0.92;
          }
        }

        .title-screen-enter-btn:hover {
          transform: scale(1.06) !important;
        }
      `}</style>
    </div>
  );
}
