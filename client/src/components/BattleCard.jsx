import React from 'react';

/**
 * Composant Wrapper Universel pour les modes de jeu :
 * - Standard (classic)
 * - Vengeance (vengeance)
 * - Tir à la Corde (tugofwar)
 * - PédiaDrill Arena (pedia) : support du défilement fluide, grand format pour cas cliniques et header sticky
 */
const BattleCard = ({
  mode = 'classic', // 'classic', 'vengeance', 'tugofwar', 'pedia'
  isShaking = false,
  pauseSlot,
  timerSlot,
  progressSlot,
  specialRuleSlot,
  children
}) => {
  // Définition des couleurs néon en fonction du mode
  let neonColor = 'rgba(59, 130, 246, 0.4)'; // Blue by default (classic)
  let borderColor = 'rgba(59, 130, 246, 0.5)';
  
  if (mode === 'vengeance') {
    neonColor = 'rgba(239, 68, 68, 0.4)'; // Red
    borderColor = 'rgba(239, 68, 68, 0.5)';
  } else if (mode === 'tugofwar') {
    neonColor = 'rgba(6, 182, 212, 0.4)'; // Cyan
    borderColor = 'rgba(6, 182, 212, 0.5)';
  } else if (mode === 'pedia') {
    neonColor = 'rgba(0, 212, 255, 0.45)'; // Medical Cyan glow
    borderColor = 'rgba(0, 212, 255, 0.55)';
  }

  const isPedia = mode === 'pedia';

  return (
    <div 
      style={{ 
        position: 'relative', 
        width: '100%', 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: isPedia ? 'flex-start' : 'center',
        padding: isPedia ? '0.5rem 0.5rem 4rem 0.5rem' : 0,
        minHeight: isPedia ? '100%' : 'auto'
      }}
    >
      
      {/* 2. Hors de la Carte : Bouton Pause en haut à gauche */}
      {pauseSlot && (
        <div style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', zIndex: 50 }}>
          {pauseSlot}
        </div>
      )}

      {/* 1. Le Cadre Principal (La Carte) */}
      <div 
        className={`battle-card ${isShaking ? 'error-shake' : ''}`}
        style={{
          width: '100%',
          maxWidth: isPedia ? '880px' : '600px',
          minHeight: isPedia ? 'auto' : '480px',
          padding: isPedia ? '1.25rem 1.4rem 2rem 1.4rem' : (mode === 'classic' ? '1.5rem' : '1rem'),
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '24px',
          background: isPedia ? 'rgba(11, 19, 36, 0.94)' : 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 25px ${neonColor}, inset 0 0 15px ${neonColor}`,
          transition: 'all 0.3s ease',
          margin: isPedia ? '0 auto 2rem auto' : 'auto',
        }}
      >
        {/* 3. En-tête de la Carte (Inside Card - Top) */}
        <div 
          className="battle-card-header" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: isPedia ? '1rem' : (mode === 'classic' ? '1.5rem' : '0.75rem'), 
            width: '100%', 
            minHeight: mode === 'classic' ? '40px' : 'auto',
            ...(isPedia ? {
              position: 'sticky',
              top: '0px',
              zIndex: 35,
              padding: '0.65rem 0.75rem',
              margin: '-0.5rem -0.5rem 1rem -0.5rem',
              background: 'rgba(11, 19, 36, 0.96)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '16px',
              borderBottom: '1px solid rgba(0, 212, 255, 0.25)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)'
            } : {})
          }}
        >
          {/* Gauche : Timer */}
          <div style={{ minWidth: '60px', display: 'flex', justifyContent: 'flex-start' }}>
            {timerSlot}
          </div>
          
          {/* Centre-Haut : Special Rules / Scores */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 1rem' }}>
            {specialRuleSlot}
          </div>

          {/* Droite : Progression */}
          <div style={{ minWidth: '60px', display: 'flex', justifyContent: 'flex-end', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 700 }}>
            {progressSlot}
          </div>
        </div>

        {/* Contenu principal (Middle & Bottom) */}
        <div className="battle-card-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: isPedia ? 'flex-start' : 'space-between', alignItems: 'center', width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default BattleCard;
