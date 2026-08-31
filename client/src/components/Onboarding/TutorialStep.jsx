import React, { useEffect } from 'react';
import { useOnboarding, TOUR_STEPS } from '../../context/OnboardingContext';
import { useAudio } from '../../context/AudioContext';

const stepsData = {
  STEP_DUEL: {
    badge: "ÉTAPE 1 / 5 • ARÈNE",
    badgeColor: "#00f0ff",
    title: "Ton Arène, Tes Règles ⚔️",
    description: "Rejoins la partie d'un ami avec son code, ou crée ton propre salon. Tu pourras t'y entraîner en solo ou inviter tes rivaux quand tu seras prêt !",
    stepIndex: 0
  },
  STEP_SPECIAL_MODES: {
    badge: "ÉTAPE 2 / 5 • MODES",
    badgeColor: "#a855f7",
    title: "Choisis ton Terrain 🎯",
    description: "Classique, Survie, ou l'impitoyable 'Tir à la Corde' ? Sélectionne un mode de jeu et crée ta partie en 1 clic.",
    stepIndex: 1
  },
  STEP_LISTS: {
    badge: "ÉTAPE 3 / 5 • VOCABULAIRE",
    badgeColor: "#ec4899",
    title: "Listes & Partage Communautaire 📚",
    description: "Créez vos propres listes de vocabulaire et partagez-les avec la communauté Wana-Allmand pour enrichir vos entraînements.",
    stepIndex: 2
  },
  STEP_VENGEANCE: {
    badge: "ÉTAPE 4 / 5 • PROGRESSION",
    badgeColor: "#ef4444",
    title: "Mur de la Vengeance 💀",
    description: "Aucune erreur n'est oubliée ! Tes fautes sont enregistrées pour que tu puisses les affronter et les anéantir en mode revanche.",
    stepIndex: 3
  },
  STEP_SOLO: {
    badge: "ÉTAPE 5 / 5 • ÉCHAUFFEMENT",
    badgeColor: "#10b981",
    title: "Prêt pour le combat ? 🎯",
    description: "Clique sur 'S'entraîner en Solo' pour entrer dans le salon d'attente et lancer ton match d'échauffement !",
    stepIndex: 4
  },
  STEP_LOBBY: {
    badge: "SALON DE COMBAT",
    badgeColor: "#6366f1",
    title: "Le Salon de Combat 🛡️",
    description: "Voici ton salon d'attente. Clique sur 'Lancer la partie' pour entrer dans l'arène !"
  },
  TYPE_HUND: {
    badge: "PREMIER COMBAT",
    badgeColor: "#00f0ff",
    title: "Mission d'échauffement 🐕",
    description: "Traduis 'le chien'. Essaie d'abord de taper 'Hund' pour observer la mécanique du jeu..."
  },
  ARTICLE_WARNING: {
    badge: "RÈGLE DE SURVIE N°1",
    badgeColor: "#ef4444",
    title: "RÈGLE DE SURVIE N°1 🚨",
    description: "En allemand, un nom sans son article (der/die/das) est FAUX. Tape maintenant 'der Hund' pour valider et triompher !"
  }
};

const TutorialStep = () => {
  const { 
    currentStep, 
    showWelcomePrompt, 
    confirmWelcome, 
    nextStep, 
    prevStep, 
    skipOnboarding, 
    activeTargetRect 
  } = useOnboarding();

  const { playNotification, playAlert, playClick } = useAudio();

  useEffect(() => {
    if (currentStep === 'ARTICLE_WARNING') {
      playAlert?.();
    } else if (currentStep && currentStep !== 'WELCOME_PROMPT') {
      playNotification?.();
    }
  }, [currentStep, playAlert, playNotification]);

  // Modal 1: Welcome Prompt immediately after Google connection
  if (showWelcomePrompt || currentStep === 'WELCOME_PROMPT') {
    return (
      <div 
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '2px solid rgba(0, 240, 255, 0.6)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 240, 255, 0.3)',
          borderRadius: '24px',
          padding: '28px',
          maxWidth: '420px',
          width: 'calc(100vw - 32px)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          zIndex: 10001,
          pointerEvents: 'auto',
          animation: 'modalSpringIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
          fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            padding: '4px 12px',
            borderRadius: '20px',
            background: 'rgba(99, 102, 241, 0.2)',
            border: '1px solid rgba(99, 102, 241, 0.6)',
            color: '#818cf8'
          }}>
            BIENVENUE SUR WANA-ALLMAND
          </span>
        </div>

        <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#00f0ff', letterSpacing: '-0.3px', lineHeight: '1.3' }}>
          Prêt pour l'Arène ? ⚔️
        </h2>

        <p style={{ margin: 0, fontSize: '0.98rem', lineHeight: '1.6', color: '#cbd5e1', fontWeight: 500 }}>
          Voulez-vous suivre le tutoriel guidé pour découvrir les duels en direct, les modes spéciaux et le Mur de la Vengeance ?
        </p>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            onClick={() => {
              playClick?.();
              skipOnboarding();
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(30, 41, 59, 0.7)',
              color: '#94a3b8',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            Plus tard
          </button>
          <button
            onClick={() => {
              playClick?.();
              confirmWelcome();
            }}
            style={{
              flex: 1.5,
              padding: '12px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, #00f0ff 0%, #6366f1 100%)',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            C'est parti ! 🚀
          </button>
        </div>
      </div>
    );
  }

  const stepInfo = stepsData[currentStep];
  if (!stepInfo) return null;

  const isTourStep = stepInfo.stepIndex !== undefined;
  const isWarning = currentStep === 'ARTICLE_WARNING';

  // Base dialog styling with Cyberpunk glassmorphism
  let dialogStyle = {
    pointerEvents: 'auto',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1.5px solid ${isWarning ? 'rgba(239, 68, 68, 0.75)' : 'rgba(0, 240, 255, 0.6)'}`,
    boxShadow: isWarning 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(239, 68, 68, 0.4)' 
      : '0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 35px rgba(0, 240, 255, 0.3)',
    borderRadius: '22px',
    padding: '22px',
    maxWidth: '380px',
    width: 'calc(100vw - 32px)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'modalSpringIn 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10001
  };

  // Smart positioning above or below target based on space and screen position
  if (activeTargetRect) {
    const { top, bottom, left, width } = activeTargetRect;
    const windowH = window.innerHeight;
    const windowW = window.innerWidth;
    const isMobile = windowW <= 768;

    const dialogHeightEstimate = 220;
    const spaceAbove = top;
    const spaceBelow = windowH - bottom;

    // Action 2 : Positionnement intelligent au-dessus si la cible touche le bas de l'écran ou manque d'espace en bas
    const shouldPositionAbove = spaceBelow < dialogHeightEstimate + 24 || bottom > (isMobile ? windowH * 0.52 : windowH * 0.62);

    if (shouldPositionAbove) {
      dialogStyle.top = `${Math.max(16, top - 18)}px`;
      dialogStyle.transform = 'translate(-50%, -100%)';
    } else {
      dialogStyle.top = `${Math.min(windowH - dialogHeightEstimate - 16, bottom + 18)}px`;
      dialogStyle.transform = 'translate(-50%, 0)';
    }

    // Clamp horizontal center safely
    const targetCenterX = left + width / 2;
    dialogStyle.left = `${Math.max(190, Math.min(windowW - 190, targetCenterX))}px`;
  }

  return (
    <>
      <div style={dialogStyle} className="tutorial-dialog">
        {/* Header with Badge & Progress Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {stepInfo.badge && (
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              padding: '3px 10px',
              borderRadius: '20px',
              background: `${stepInfo.badgeColor}22`,
              border: `1px solid ${stepInfo.badgeColor}66`,
              color: stepInfo.badgeColor
            }}>
              {stepInfo.badge}
            </span>
          )}

          {isTourStep && (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {TOUR_STEPS.map((stepKey, idx) => (
                <span
                  key={stepKey}
                  style={{
                    width: idx === stepInfo.stepIndex ? '16px' : '6px',
                    height: '6px',
                    borderRadius: '3px',
                    background: idx === stepInfo.stepIndex 
                      ? '#00f0ff' 
                      : idx < stepInfo.stepIndex 
                        ? 'rgba(0, 240, 255, 0.4)' 
                        : 'rgba(255, 255, 255, 0.2)',
                    transition: 'all 0.3s ease',
                    boxShadow: idx === stepInfo.stepIndex ? '0 0 8px #00f0ff' : 'none'
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <h2 style={{ 
          margin: 0, 
          fontSize: '1.28rem', 
          fontWeight: 800,
          color: isWarning ? '#fca5a5' : '#00f0ff',
          textShadow: isWarning ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(0, 240, 255, 0.35)',
          letterSpacing: '-0.3px',
          lineHeight: '1.3'
        }}>
          {stepInfo.title}
        </h2>

        {/* Description */}
        <p style={{ 
          margin: 0, 
          fontSize: '0.96rem', 
          lineHeight: '1.6', 
          color: '#cbd5e1', 
          fontWeight: 500 
        }}>
          {stepInfo.description}
        </p>

        {/* Navigation Actions for Tour Steps */}
        {isTourStep && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            {stepInfo.stepIndex > 0 && (
              <button
                onClick={() => {
                  playClick?.();
                  prevStep();
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  background: 'rgba(30, 41, 59, 0.6)',
                  color: '#94a3b8',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                ← Précédent
              </button>
            )}

            {stepInfo.stepIndex < TOUR_STEPS.length - 1 ? (
              <button
                onClick={() => {
                  playClick?.();
                  nextStep();
                }}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #00f0ff, #6366f1)',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)'
                }}
              >
                Suivant →
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Persistent Skip Button in Top-Right */}
      <button 
        onClick={() => {
          playClick?.();
          skipOnboarding();
        }}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          pointerEvents: 'auto',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.82rem',
          fontWeight: 700,
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: '#94a3b8',
          padding: '8px 16px',
          borderRadius: '20px',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'all 0.2s ease',
          zIndex: 10002
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.color = '#ffffff';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.color = '#94a3b8';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        Passer le tutoriel ✕
      </button>
    </>
  );
};

export default TutorialStep;
