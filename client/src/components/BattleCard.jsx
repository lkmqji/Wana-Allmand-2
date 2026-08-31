import React from 'react';

/**
 * Composant Wrapper Universel pour les 3 modes (Standard, Vengeance, Tir à la Corde)
 * Garantit un layout strict et identique sans saut visuel.
 */
const BattleCard = ({
  mode = 'classic', // 'classic', 'vengeance', 'tugofwar'
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
  }

  return (
    <div style={{ position: 'relative', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      
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
          maxWidth: '600px',
          minHeight: '480px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          borderRadius: '24px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `2px solid ${borderColor}`,
          boxShadow: `0 0 25px ${neonColor}, inset 0 0 15px ${neonColor}`,
          transition: 'all 0.3s ease',
          margin: 'auto',
        }}
      >
        {/* 3. En-tête de la Carte (Inside Card - Top) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', width: '100%', minHeight: '40px' }}>
          {/* Gauche : Timer */}
          <div style={{ minWidth: '60px', display: 'flex', justifyContent: 'flex-start' }}>
            {timerSlot}
          </div>
          
          {/* Centre-Haut : Special Rules */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0 1rem' }}>
            {specialRuleSlot}
          </div>

          {/* Droite : Progression */}
          <div style={{ minWidth: '60px', display: 'flex', justifyContent: 'flex-end', color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 700 }}>
            {progressSlot}
          </div>
        </div>

        {/* Contenu principal (Middle & Bottom) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default BattleCard;
