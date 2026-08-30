import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';

const stepsData = {
  INTRO: {
    badge: "ENTRAÎNEMENT ESPORT",
    badgeColor: "#6366f1",
    title: "Bienvenue dans l'Arène. ⚔️",
    description: "Ici, on n'apprend pas l'allemand en lisant. On s'entraîne par la vitesse, les réflexes et le combat. Clique sur le bouton en surbrillance pour ton échauffement.",
    position: 'top'
  },
  TYPE_HUND: {
    badge: "PREMIER DUEL",
    badgeColor: "#00f0ff",
    title: "Ton premier combat. 🐕",
    description: "Traduis 'le chien'. (Astuce : tape simplement 'Hund' sans l'article pour voir la physique du jeu...)",
    position: 'top'
  },
  ARTICLE_WARNING: {
    badge: "SURVIE N°1",
    badgeColor: "#ef4444",
    title: "RÈGLE DE SURVIE N°1 🚨",
    description: "Un mot sans son article (der/die/das) est FAUX. Les erreurs atterrissent sur ton Mur de la Vengeance. Prouve que tu as compris : tape 'der Hund' pour valider.",
    position: 'top'
  }
};

const TutorialStep = () => {
  const { currentStep, nextStep, skipOnboarding, activeTargetRect } = useOnboarding();
  
  const stepInfo = stepsData[currentStep];
  
  if (!stepInfo) return null;

  const isWarning = currentStep === 'ARTICLE_WARNING';

  // Calculate position based on target rect to avoid covering it
  let dialogStyle = {
    pointerEvents: 'auto',
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1.5px solid ${isWarning ? 'rgba(239, 68, 68, 0.65)' : 'rgba(0, 240, 255, 0.5)'}`,
    boxShadow: isWarning 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 30px rgba(239, 68, 68, 0.35)' 
      : '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 30px rgba(0, 240, 255, 0.25)',
    borderRadius: '20px',
    padding: '24px',
    maxWidth: '380px',
    width: 'calc(100vw - 32px)',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'modalSpringIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10001
  };

  // If there is an active target, position the dialog near it (above or below)
  if (activeTargetRect && stepInfo.position !== 'center') {
    const { top, bottom, left, width } = activeTargetRect;
    const spaceAbove = top;
    const spaceBelow = window.innerHeight - bottom;
    
    // Position below if more space, else above
    if (spaceBelow > spaceAbove) {
      dialogStyle.top = `${Math.min(window.innerHeight - 220, bottom + 24)}px`;
      dialogStyle.transform = 'translate(-50%, 0)';
    } else {
      dialogStyle.top = `${Math.max(20, top - 24)}px`;
      dialogStyle.transform = 'translate(-50%, -100%)';
    }
    dialogStyle.left = `${Math.max(200, Math.min(window.innerWidth - 200, left + width / 2))}px`;
  }

  return (
    <>
      <div style={dialogStyle} className="tutorial-dialog">
        {stepInfo.badge && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
          </div>
        )}

        <h2 style={{ 
          margin: 0, 
          fontSize: '1.3rem', 
          fontWeight: 800,
          color: isWarning ? '#fca5a5' : '#00f0ff',
          textShadow: isWarning ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(0, 240, 255, 0.35)',
          letterSpacing: '-0.3px',
          lineHeight: '1.3'
        }}>
          {stepInfo.title}
        </h2>

        <p style={{ 
          margin: 0, 
          fontSize: '0.98rem', 
          lineHeight: '1.6', 
          color: '#cbd5e1', 
          fontWeight: 500 
        }}>
          {stepInfo.description}
        </p>
      </div>

      <button 
        onClick={skipOnboarding}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          pointerEvents: 'auto',
          fontFamily: "'Outfit', sans-serif",
          fontSize: '0.85rem',
          fontWeight: 700,
          background: 'rgba(15, 23, 42, 0.8)',
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
