import React, { useState, useEffect } from 'react';

// Helper function to detect In-App Browsers (Facebook, Messenger, Instagram, Snapchat, TikTok, etc.)
const checkIsInAppBrowser = () => {
  if (typeof window === 'undefined') return false;
  const ua = (window.navigator.userAgent || window.navigator.vendor || window.opera || '').toLowerCase();
  return /fban|fbav|instagram|snapchat|line|tiktok|twitter|bytedancewebview|messenger|pinterest|micromessenger/.test(ua);
};

export default function InstallGate() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPromptReady, setIsPromptReady] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInApp, setIsInApp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check In-App Browser
    setIsInApp(checkIsInAppBrowser());

    // OS & Device Detection
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isIPadOS = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
    const isIOS = /iphone|ipad|ipod/.test(ua) || isIPadOS;
    setIsIOSDevice(isIOS);

    // Listen for beforeinstallprompt event (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPromptReady(true);
    };

    // TÂCHE 2 : Feedback Post-Installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsPromptReady(false);
      setDeferredPrompt(null);
      setIsInstalling(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      setIsInstalling(true);
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsPromptReady(false);
      }
    } catch (err) {
      console.error('Error during PWA installation prompt:', err);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 99999,
        backgroundColor: '#0b0f19',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 65%, #05070f 100%)',
        color: '#f8fafc',
        fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '1.5rem',
        boxSizing: 'border-box',
        overflowY: 'auto',
        userSelect: 'none'
      }}
    >
      {/* Background Animated Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: isInstalled
            ? 'radial-gradient(circle, rgba(34, 197, 94, 0.25) 0%, rgba(99, 102, 241, 0.15) 50%, transparent 70%)'
            : 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(236, 72, 153, 0.15) 50%, transparent 70%)',
          filter: 'blur(90px)',
          top: '8%',
          pointerEvents: 'none',
          animation: 'pulseGlow 6s ease-in-out infinite alternate',
          transition: 'all 0.5s ease'
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '480px',
          width: '100%',
          background: 'rgba(21, 30, 46, 0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: isInstalled ? '1px solid rgba(34, 197, 94, 0.45)' : '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '28px',
          padding: '2.4rem 1.8rem',
          boxShadow: isInstalled
            ? '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 45px rgba(34, 197, 94, 0.2)'
            : '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 45px rgba(99, 102, 241, 0.18)',
          zIndex: 10,
          transition: 'all 0.4s ease'
        }}
      >
        {/* ======================================================== */}
        {/* 🎉 TÂCHE 2 : VUE POST-INSTALLATION SUCCÈS              */}
        {/* ======================================================== */}
        {isInstalled ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', animation: 'fadeIn 0.4s ease-out' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(16, 185, 129, 0.4) 100%)',
                border: '2px solid rgba(74, 222, 128, 0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                boxShadow: '0 10px 30px rgba(34, 197, 94, 0.45)',
                animation: 'pulseButton 2.5s infinite ease-in-out'
              }}
            >
              🎉
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.8rem, 5.5vw, 2.3rem)',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                margin: 0,
                background: 'linear-gradient(135deg, #ffffff 0%, #86efac 60%, #22c55e 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Installation Réussie !
            </h1>

            <div
              style={{
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid rgba(74, 222, 128, 0.3)',
                borderRadius: '20px',
                padding: '1.3rem 1.1rem',
                color: '#e2e8f0',
                fontSize: '0.98rem',
                lineHeight: 1.6,
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
              }}
            >
              Fermez cette page, allez sur <strong>l'écran d'accueil</strong> de votre téléphone et cliquez sur l'icône <strong>Wana Allmand</strong> pour commencer à jouer.
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.6rem 1.2rem',
                borderRadius: '9999px',
                background: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.4)',
                color: '#86efac',
                fontSize: '0.85rem',
                fontWeight: 700
              }}
            >
              <span>📱</span>
              <span>Prêt sur votre écran d'accueil</span>
            </div>
          </div>
        ) : isInApp ? (
          /* ======================================================== */
          /* 🕵️‍♂️ TÂCHE 1 : DÉTECTION IN-APP BROWSER (FB/IG/MESSENGER) */
          /* ======================================================== */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', animation: 'fadeIn 0.3s ease-out' }}>
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '22px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(99, 102, 241, 0.3) 100%)',
                border: '2px solid rgba(147, 197, 253, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.3rem',
                boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)'
              }}
            >
              🌐
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.9rem',
                borderRadius: '9999px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                color: '#93c5fd',
                fontSize: '0.8rem',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}
            >
              <span>ℹ️</span> Navigateur Restreint
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.7rem, 5vw, 2.1rem)',
                fontWeight: 900,
                letterSpacing: '-0.5px',
                margin: 0,
                lineHeight: 1.2,
                color: '#ffffff'
              }}
            >
              Ouvrir dans le Navigateur
            </h1>

            <div
              style={{
                background: 'rgba(30, 41, 59, 0.75)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '20px',
                padding: '1.2rem 1.1rem',
                color: '#cbd5e1',
                fontSize: '0.94rem',
                lineHeight: 1.6,
                textAlign: 'left'
              }}
            >
              Vous êtes dans un navigateur intégré (Messenger, Instagram, Facebook...).
              <br /><br />
              Pour installer le jeu, cliquez sur les <strong>3 petits points (⋮ ou ⋯)</strong> en haut ou en bas à droite et choisissez <strong>"Ouvrir dans Chrome"</strong> ou <strong>"Ouvrir dans Safari"</strong>.
            </div>

            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              💡 L'installation s'effectuera directement depuis Chrome ou Safari.
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 🎨 TÂCHE 3 : DESIGN ACCUEILLANT & POSITIF (DE-STRESS)    */
          /* ======================================================== */
          <>
            {/* Friendly Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 1rem',
                borderRadius: '9999px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%)',
                border: '1px solid rgba(165, 180, 252, 0.35)',
                color: '#c7d2fe',
                fontSize: '0.82rem',
                fontWeight: 800,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
                marginBottom: '1.2rem',
                boxShadow: '0 0 20px rgba(99, 102, 241, 0.2)'
              }}
            >
              <span>✨</span> Expérience Plein Écran
            </div>

            {/* Wana Allmand App Icon */}
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(236, 72, 153, 0.2) 100%)',
                border: '2px solid rgba(165, 180, 252, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.2rem',
                boxShadow: '0 12px 30px rgba(99, 102, 241, 0.35)',
                overflow: 'hidden'
              }}
            >
              <img
                src="/favicon.svg"
                alt="Wana Allmand Logo"
                style={{ width: '52px', height: '52px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            {/* Positive Title */}
            <h1
              style={{
                fontSize: 'clamp(1.9rem, 5.8vw, 2.5rem)',
                fontWeight: 950,
                letterSpacing: '-0.5px',
                margin: '0 0 0.5rem 0',
                lineHeight: 1.15,
                background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 45%, #a5b4fc 80%, #f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 16px rgba(99, 102, 241, 0.4))'
              }}
            >
              Jouez en Plein Écran 🚀
            </h1>

            {/* Positive Subtitle */}
            <p
              style={{
                color: '#94a3b8',
                fontSize: '0.98rem',
                lineHeight: 1.5,
                margin: '0 0 1.8rem 0'
              }}
            >
              Installez Wana Allmand en 1 clic pour une expérience ultra-rapide et sans distractions.
            </p>

            {/* Dynamic Platform Instructions */}
            {isIOSDevice ? (
              /* iOS / Safari Step-by-Step Guidance */
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  textAlign: 'left'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    padding: '0.85rem 1.05rem',
                    borderRadius: '16px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(99, 102, 241, 0.25)'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(99, 102, 241, 0.2)',
                      border: '1px solid rgba(99, 102, 241, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}
                  >
                    📤
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.93rem', lineHeight: 1.4 }}>
                    <strong>1.</strong> Touchez <strong>Partager (📤)</strong> dans Safari.
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    padding: '0.85rem 1.05rem',
                    borderRadius: '16px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(236, 72, 153, 0.25)'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(236, 72, 153, 0.2)',
                      border: '1px solid rgba(236, 72, 153, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}
                  >
                    ➕
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.93rem', lineHeight: 1.4 }}>
                    <strong>2.</strong> Sélectionnez <strong>"Sur l'écran d'accueil"</strong>.
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.9rem',
                    padding: '0.85rem 1.05rem',
                    borderRadius: '16px',
                    background: 'rgba(30, 41, 59, 0.7)',
                    border: '1px solid rgba(34, 197, 94, 0.25)'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(34, 197, 94, 0.2)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      flexShrink: 0
                    }}
                  >
                    🚀
                  </div>
                  <div style={{ color: '#e2e8f0', fontSize: '0.93rem', lineHeight: 1.4 }}>
                    <strong>3.</strong> Lancez l'application depuis votre écran !
                  </div>
                </div>
              </div>
            ) : (
              /* Android / Chrome One-Click Install */
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem'
                }}
              >
                {isPromptReady ? (
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    disabled={isInstalling}
                    className="btn btn-primary"
                    style={{
                      width: '100%',
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      letterSpacing: '0.5px',
                      padding: '1.15rem 1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.75rem',
                      background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #ec4899 100%)',
                      boxShadow: '0 8px 25px rgba(99, 102, 241, 0.45), 0 4px 0 #3730a3',
                      borderRadius: '18px',
                      border: 'none',
                      color: '#ffffff',
                      cursor: 'pointer',
                      animation: 'pulseButton 2.5s ease-in-out infinite'
                    }}
                  >
                    <span>⚡</span>
                    <span>{isInstalling ? 'INSTALLATION...' : "INSTALLER EN 1 CLIC"}</span>
                  </button>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      padding: '1.1rem 1rem',
                      borderRadius: '18px',
                      background: 'rgba(30, 41, 59, 0.6)',
                      border: '1px solid rgba(99, 102, 241, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.6rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#c7d2fe', fontWeight: 600, fontSize: '0.92rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '14px',
                          height: '14px',
                          borderRadius: '50%',
                          border: '2px solid #818cf8',
                          borderTopColor: 'transparent',
                          animation: 'spin 1s linear infinite'
                        }}
                      />
                      <span>Le bouton d'installation va apparaître dans un instant...</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
                      Vous pouvez aussi toucher le menu de votre navigateur (<strong>⋮</strong>) et sélectionner <strong>"Ajouter à l'écran d'accueil"</strong>.
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
