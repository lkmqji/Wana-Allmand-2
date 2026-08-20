import React, { useState, useEffect } from 'react';

export default function InstallGate() {
  console.log("Mur d'installation actif");

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPromptReady, setIsPromptReady] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    console.log("Mur d'installation actif");

    // OS & Device Detection
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isIPadOS = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
    const isIOS = /iphone|ipad|ipod/.test(ua) || isIPadOS;
    setIsIOSDevice(isIOS);

    // Listen for beforeinstallprompt event (Android / Chrome / Edge / Desktop)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent default mini-infobar or standard banner
      e.preventDefault();
      setDeferredPrompt(e);
      setIsPromptReady(true);
    };

    const handleAppInstalled = () => {
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
        backgroundColor: 'var(--bg-color, #0b0f19)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #0b0f19 65%, #05070f 100%)',
        color: '#f8fafc',
        fontFamily: "'Outfit', sans-serif",
        padding: '1.5rem',
        boxSizing: 'border-box',
        overflowY: 'auto',
        userSelect: 'none'
      }}
    >
      {/* Background Animated Glows */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(236, 72, 153, 0.1) 50%, transparent 70%)',
          filter: 'blur(80px)',
          top: '5%',
          pointerEvents: 'none',
          animation: 'pulseGlow 6s ease-in-out infinite alternate'
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '520px',
          width: '100%',
          background: 'rgba(21, 30, 46, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderRadius: '28px',
          padding: '2.5rem 1.8rem',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15)',
          zIndex: 10
        }}
      >
        {/* App Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#fca5a5',
            fontSize: '0.82rem',
            fontWeight: 800,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: '1.2rem',
            boxShadow: '0 0 16px rgba(239, 68, 68, 0.25)'
          }}
        >
          <span>🔒</span> Application Native Obligatoire
        </div>

        {/* Wana Allmand Logo / Icon */}
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(236, 72, 153, 0.2) 100%)',
            border: '2px solid rgba(165, 180, 252, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.2rem',
            boxShadow: '0 12px 30px rgba(99, 102, 241, 0.4)',
            overflow: 'hidden'
          }}
        >
          <img
            src="/favicon.svg"
            alt="Wana Allmand Logo"
            style={{ width: '56px', height: '56px', objectFit: 'contain' }}
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        {/* Brand Title */}
        <h1
          style={{
            fontSize: 'clamp(2rem, 6vw, 2.6rem)',
            fontWeight: 950,
            letterSpacing: '1.5px',
            margin: '0 0 0.5rem 0',
            lineHeight: 1.1,
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 40%, #818cf8 75%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.5))'
          }}
        >
          WANA ALLMAND
        </h1>

        {/* Hard Gate Description */}
        <p
          style={{
            color: '#94a3b8',
            fontSize: '1rem',
            lineHeight: 1.55,
            margin: '0 0 1.8rem 0'
          }}
        >
          {isIOSDevice
            ? "Wana Allmand est une application native. Pour jouer, vous devez installer l'application :"
            : "Wana Allmand est une application native. Vous devez l'installer pour jouer."}
        </p>

        {/* Dynamic OS Section */}
        {isIOSDevice ? (
          /* iOS / Safari Tutorial */
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem',
              textAlign: 'left'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(99, 102, 241, 0.2)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0
                }}
              >
                📤
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.4 }}>
                <strong>1.</strong> Touchez l'icône <strong>Partager (📤)</strong> en bas de l'écran.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(236, 72, 153, 0.2)',
                  border: '1px solid rgba(236, 72, 153, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0
                }}
              >
                ➕
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.4 }}>
                <strong>2.</strong> Touchez <strong>"Sur l'écran d'accueil" (➕)</strong>.
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.1rem',
                borderRadius: '16px',
                background: 'rgba(30, 41, 59, 0.7)',
                border: '1px solid rgba(99, 102, 241, 0.25)'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.3rem',
                  flexShrink: 0
                }}
              >
                🚀
              </div>
              <div style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: 1.4 }}>
                <strong>3.</strong> Ouvrez l'application depuis votre téléphone.
              </div>
            </div>
          </div>
        ) : (
          /* Android / Chrome / Desktop */
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
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  letterSpacing: '0.8px',
                  padding: '1.2rem 1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #ec4899 100%)',
                  boxShadow: '0 8px 25px rgba(99, 102, 241, 0.5), 0 4px 0 #3730a3',
                  borderRadius: '18px',
                  cursor: 'pointer',
                  animation: 'pulseButton 2.5s ease-in-out infinite'
                }}
              >
                <span>📱</span>
                <span>{isInstalling ? 'INSTALLATION EN COURS...' : "INSTALLER L'APPLICATION"}</span>
              </button>
            ) : (
              <div
                style={{
                  width: '100%',
                  padding: '1.2rem 1rem',
                  borderRadius: '16px',
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.8rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#a5b4fc', fontWeight: 600 }}>
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
                  <span>Préparation de l'installation...</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                  Si le bouton automatique n'apparaît pas, utilisez le menu de votre navigateur (<strong>⋮</strong> ou icône <strong>⊕</strong> dans la barre d'adresse) puis sélectionnez <strong>"Installer l'application"</strong>.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Strict Warning Footer (No bypass possible) */}
        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.2rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            width: '100%',
            fontSize: '0.8rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
        >
          <span>🛡️</span>
          <span>Accès web verrouillé • Mode Standalone requis</span>
        </div>
      </div>
    </div>
  );
}
