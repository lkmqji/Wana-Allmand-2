import React, { useState, useRef, useEffect } from 'react';

export default function PlayDropdown({
  onPlay,
  onPlaySurvival,
  onSelectMode,
  selectedMode: controlledMode,
  label,
  buttonClass,
  buttonStyle = {},
  fullWidth = true,
  onOpenChange,
  modeOnly = false
}) {
  const [internalMode, setInternalMode] = useState('classic');
  const currentMode = controlledMode !== undefined ? controlledMode : internalMode;
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen);
    }
  }, [isOpen, onOpenChange]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleMainButtonClick = (e) => {
    e.stopPropagation();
    if (currentMode === 'survival' && onPlaySurvival) {
      onPlaySurvival();
    } else if (onPlay) {
      onPlay();
    }
  };

  const handleArrowToggle = (e) => {
    e.stopPropagation();
    if (onPlaySurvival) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelectClassic = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    setInternalMode('classic');
    if (onSelectMode) onSelectMode('classic');
    if (!modeOnly && onPlay) onPlay();
  };

  const handleSelectSurvival = (e) => {
    e.stopPropagation();
    setIsOpen(false);
    setInternalMode('survival');
    if (onSelectMode) onSelectMode('survival');
    if (!modeOnly && onPlaySurvival) onPlaySurvival();
  };

  // Determine label & styles based on active mode
  const isSurvival = currentMode === 'survival';
  const displayLabel = label || (isSurvival ? '🔥 LANCER EN SURVIE' : '⚔️ JOUER');
  const defaultClass = isSurvival ? 'btn btn-primary' : 'btn btn-success';

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'relative',
        display: fullWidth ? 'flex' : 'inline-flex',
        flex: fullWidth ? 1 : 'none',
        width: fullWidth ? '100%' : 'auto',
        zIndex: isOpen ? 500 : 1
      }}
    >
      <div
        className={buttonClass || defaultClass}
        style={{
          width: '100%',
          padding: 0,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'stretch',
          cursor: 'pointer',
          boxShadow: isOpen ? (isSurvival ? '0 0 16px rgba(239, 68, 68, 0.4)' : '0 0 16px rgba(34, 197, 94, 0.4)') : undefined,
          background: isSurvival ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : undefined,
          borderColor: isSurvival ? '#b91c1c' : undefined,
          overflow: 'hidden',
          ...buttonStyle
        }}
      >
        {/* Main Action Area */}
        <button
          type="button"
          onClick={handleMainButtonClick}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            padding: '0.65rem 0.8rem',
            fontSize: '0.88rem',
            fontWeight: 800,
            letterSpacing: '0.5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem'
          }}
          title={isSurvival ? "Lancer la session en Mode Survie (3 Vies)" : "Lancer la session en Mode Classique"}
        >
          <span>{displayLabel}</span>
        </button>

        {/* Dropdown Selector Arrow with explicit "Mode ▼" affordance */}
        {onPlaySurvival && (
          <button
            type="button"
            onClick={handleArrowToggle}
            style={{
              background: isOpen ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
              border: 'none',
              borderLeft: '1.5px solid rgba(255, 255, 255, 0.25)',
              color: 'inherit',
              padding: '0 0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
              fontSize: '0.78rem',
              fontWeight: 800,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.45)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isOpen ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)';
            }}
            title="Cliquer pour changer de mode (Classique / Survie)"
          >
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Mode</span>
            <span
              style={{
                fontSize: '0.7rem',
                display: 'inline-block',
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                opacity: 0.95
              }}
            >
              ▼
            </span>
          </button>
        )}
      </div>

      {isOpen && onPlaySurvival && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'max(100%, 270px)',
            minWidth: '270px',
            zIndex: 120,
            background: 'linear-gradient(145deg, #180c10 0%, #0d0608 100%)',
            border: '1.5px solid rgba(239, 68, 68, 0.45)',
            borderRadius: '14px',
            padding: '0.6rem',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.92), 0 0 25px rgba(239, 68, 68, 0.25)',
            backdropFilter: 'blur(14px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            animation: 'dropdownFadeIn 0.18s ease-out'
          }}
        >
          <div style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--text-muted)',
            padding: '0.1rem 0.35rem 0.35rem 0.35rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>🎮 CHOISIR UN MODE :</span>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>{currentMode === 'survival' ? '🔥 Survie actif' : '⚔️ Classique actif'}</span>
          </div>

          {/* Option 1 : Mode Classique */}
          <button
            type="button"
            onClick={handleSelectClassic}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.6rem 0.75rem',
              background: currentMode === 'classic' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.08)',
              border: currentMode === 'classic' ? '1.5px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.25)',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              color: '#ffffff',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(34, 197, 94, 0.25)';
              e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.8)';
              e.currentTarget.style.transform = 'translateX(2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = currentMode === 'classic' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.08)';
              e.currentTarget.style.borderColor = currentMode === 'classic' ? '#22c55e' : 'rgba(34, 197, 94, 0.25)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#4ade80' }}>
                ⚔️ Mode Classique
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
                Partie solo standard
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#4ade80', fontWeight: 800 }}>
              {currentMode === 'classic' ? '✓' : '▶'}
            </span>
          </button>

          {/* Option 2 : Mode Survie */}
          <button
            type="button"
            onClick={handleSelectSurvival}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '0.6rem 0.75rem',
              background: currentMode === 'survival' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.1)',
              border: currentMode === 'survival' ? '1.5px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '10px',
              cursor: 'pointer',
              textAlign: 'left',
              color: '#ffffff',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.9)';
              e.currentTarget.style.transform = 'translateX(2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = currentMode === 'survival' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.borderColor = currentMode === 'survival' ? '#ef4444' : 'rgba(239, 68, 68, 0.3)';
              e.currentTarget.style.transform = 'translateX(0)';
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#f87171' }}>
                🔥 Mode Survie
              </div>
              <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '0.1rem' }}>
                3 vies • Chrono accéléré
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', color: '#f87171', fontWeight: 800 }}>
              {currentMode === 'survival' ? '✓' : '🔥'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
