import React, { useState } from 'react';
import { useAudio } from '../context/AudioContext';
import { sfx } from '../utils/sfxManager';

export default function TitleScreen({ onEnter, onLogout, user, playerName, avatar }) {
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

  const googleName = user?.displayName || playerName || 'Joueur';
  const displayPseudo = playerName || user?.displayName || 'Anonyme';

  return (
    <div
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
          maxWidth: '650px',
          width: '100%'
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
            marginBottom: '1.2rem',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.3)'
          }}
        >
          <span>⚔️</span> Arène Esport d'Allemand
        </div>

        {/* Giant Main Title */}
        <h1
          className="brand-logo-shine"
          style={{
            fontSize: 'clamp(2.5rem, 7vw, 4.2rem)',
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

        {/* TÂCHE 2: Google Identity & In-game Pseudonym Card */}
        <div
          style={{
            marginTop: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.6rem'
          }}
        >
          {/* Profile Photo / Avatar */}
          <div
            style={{
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid #6366f1',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.5), 0 8px 20px rgba(0, 0, 0, 0.4)',
              background: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={googleName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                referrerPolicy="no-referrer"
              />
            ) : (
              <span style={{ fontSize: '2.2rem' }}>{avatar || '🦊'}</span>
            )}
          </div>

          {/* Real Google Account Name */}
          <h3
            style={{
              margin: '0.4rem 0 0 0',
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#f8fafc',
              letterSpacing: '0.3px'
            }}
          >
            {googleName}
          </h3>

          {/* In-game Pseudonym */}
          <div
            style={{
              fontSize: '0.92rem',
              color: 'var(--text-muted, #94a3b8)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>Pseudo :</span>
            <span style={{ color: '#c7d2fe', fontWeight: 600 }}>{displayPseudo}</span>
          </div>
        </div>

        {/* Main Action Button */}
        <div style={{ marginTop: '2.5rem' }}>
          <button
            type="button"
            className="title-screen-enter-btn"
            onClick={handleStart}
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem',
              padding: '1.1rem 2.8rem',
              fontSize: '1.15rem',
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
            <span style={{ fontSize: '1.3rem' }}>▶</span>
            <span>
              {user?.displayName ? `Continuer avec ${user.displayName}` : 'Continuer dans l\'arène'}
            </span>
          </button>
        </div>

        {/* TÂCHE 3: Switch User / Logout Button */}
        <div style={{ marginTop: '2.2rem' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onLogout) onLogout();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span>🔄</span>
            <span>Changer d'utilisateur</span>
          </button>
        </div>
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
