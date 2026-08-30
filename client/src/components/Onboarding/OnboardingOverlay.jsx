import React from 'react';
import { useOnboarding } from '../../context/OnboardingContext';
import TutorialStep from './TutorialStep';

const OnboardingOverlay = () => {
  const { isActive, activeTargetRect, currentStep } = useOnboarding();

  if (!isActive) return null;

  const isWarning = currentStep === 'ARTICLE_WARNING';

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9998,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    transform: 'translateZ(0)', // Force GPU acceleration
    pointerEvents: activeTargetRect ? 'auto' : 'none', // Allow interactions if target is transitioning
    transition: 'clip-path 0.3s ease-in-out',
  };

  if (activeTargetRect) {
    const p = 16;
    const { top, left, width, height } = activeTargetRect;
    const x1 = left - p;
    const y1 = top - p;
    const x2 = left + width + p;
    const y2 = top + height + p;

    // Polygon with a hole to let pointer-events through to the target
    overlayStyle.clipPath = `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${x1}px ${y1}px, ${x2}px ${y1}px, ${x2}px ${y2}px, ${x1}px ${y2}px, ${x1}px ${y1}px)`;
    overlayStyle.WebkitClipPath = overlayStyle.clipPath;
  }

  return (
    <>
      {/* Blurred background with hole */}
      <div style={overlayStyle} />
      
      {/* Dynamic Neon Glow around the hole */}
      {activeTargetRect && (
        <div style={{
          position: 'fixed',
          top: activeTargetRect.top - 16,
          left: activeTargetRect.left - 16,
          width: activeTargetRect.width + 32,
          height: activeTargetRect.height + 32,
          borderRadius: '16px',
          boxShadow: isWarning 
            ? '0 0 35px rgba(239, 68, 68, 0.7), inset 0 0 25px rgba(239, 68, 68, 0.4)' 
            : '0 0 35px rgba(0, 240, 255, 0.65), inset 0 0 25px rgba(0, 240, 255, 0.35)',
          border: isWarning ? '2px solid rgba(239, 68, 68, 0.85)' : '2px solid rgba(0, 240, 255, 0.85)',
          pointerEvents: 'none',
          zIndex: 9999,
          transform: 'translateZ(0)',
          transition: 'all 0.3s ease-in-out'
        }} />
      )}

      {/* Tutorial UI Layer */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 10000,
        pointerEvents: 'none', // Let clicks fall through to the hole
        display: 'flex',
        flexDirection: 'column'
      }}>
        <TutorialStep />
      </div>
    </>
  );
};

export default OnboardingOverlay;
