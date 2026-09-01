import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Composant unifié pour la zone de combat (Console de saisie)
 * Refactorisé pour le standard 'BattleCard' avec 'Fake Input' pour Mobile.
 * Zéro re-rendu de la carte parent grâce à la gestion locale de l'état pendant la frappe.
 */
const BattleConsole = React.memo(function BattleConsole({
  // Slots & Content
  question,
  onSpeakQuestion,
  feedbackSlot,
  topSlot, // Added for compatibility with Game.jsx (Traduisez en allemand)
  
  // Input State (Maintenant utilisé uniquement pour reset/sync de l'extérieur)
  inputValue: externalValue = '',
  onInputChange: setExternalValue,
  onSubmit,
  inputPlaceholder = 'Ex: der Tisch',
  inputRef: externalInputRef,
  isDisabled = false,
  isCorrectionMode = false,
  adminAnswer = '',
  
  // Theme
  theme = 'default' 
}) {
  // Local state for the input to prevent parent re-renders on every keystroke
  const [localValue, setLocalValue] = useState(externalValue);
  const fakeInputRef = useRef(null);

  // Sync with external value when it changes (e.g., cleared after submit or changed by Joker)
  useEffect(() => {
    setLocalValue(externalValue || '');
  }, [externalValue]);

  // Handle local change and apply Smart Auto-Capitalization
  const handleLocalChange = useCallback((newVal) => {
    if (isDisabled) return;
    
    // Smart Auto-Capitalization: "der ", "die ", "das " -> capitalize next letter
    let processedVal = newVal;
    const lowerVal = processedVal.toLowerCase();
    
    if (lowerVal.startsWith('der ') || lowerVal.startsWith('die ') || lowerVal.startsWith('das ')) {
      const parts = processedVal.split(' ');
      if (parts.length > 1 && parts[1].length > 0) {
        // Capitalize the first letter of the noun
        parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        processedVal = parts.join(' ');
      }
    }

    setLocalValue(processedVal);
  }, [isDisabled]);

  // Expose the ref value for parents that might use it (rare)
  if (externalInputRef) {
    if (typeof externalInputRef === 'function') {
      externalInputRef(fakeInputRef.current);
    } else {
      externalInputRef.current = fakeInputRef.current;
    }
  }

  // WanaBoard Virtual Keyboard Event Listener
  useEffect(() => {
    const handleWanaKey = (e) => {
      if (isDisabled) return;
      const { key, action } = e.detail;

      setLocalValue((prev) => {
        let nextVal = prev || '';
        
        if (action === 'insert') {
          nextVal = nextVal + key;
        } else if (action === 'delete') {
          nextVal = nextVal.slice(0, -1);
        } else if (action === 'clear_all') {
          nextVal = '';
        } else if (action === 'submit') {
          // Push to parent and submit
          setExternalValue(nextVal);
          setTimeout(() => {
            if (onSubmit) onSubmit(new Event('submit'), nextVal);
          }, 0);
          return prev;
        }

        handleLocalChange(nextVal);
        return nextVal; // handled inside handleLocalChange mostly, but React setState needs the return
      });
    };

    window.addEventListener('wana_key', handleWanaKey);
    return () => window.removeEventListener('wana_key', handleWanaKey);
  }, [isDisabled, onSubmit, setExternalValue, handleLocalChange]);

  // Desktop Physical Keyboard Shortcuts & Typing
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow default behavior if they are using the quick chat input or other inputs outside this
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && !document.activeElement.classList.contains('fake-input')) {
        return;
      }
      
      if (isDisabled) return;

      // Handle Submit
      if (e.key === 'Enter') {
        e.preventDefault();
        setExternalValue(localValue);
        setTimeout(() => {
          if (onSubmit) onSubmit(e, localValue);
        }, 0);
        return;
      }

      // Handle Backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        setLocalValue(prev => {
          const nextVal = (prev || '').slice(0, -1);
          handleLocalChange(nextVal);
          return nextVal;
        });
        return;
      }

      // Handle specific Desktop Shortcuts
      if (e.key === '1') {
        e.preventDefault();
        handleArticleClick('der');
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        handleArticleClick('die');
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        handleArticleClick('das');
        return;
      }

      // Handle regular typing (printable characters)
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setLocalValue(prev => {
          const nextVal = (prev || '') + e.key;
          handleLocalChange(nextVal);
          return nextVal;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDisabled, localValue, onSubmit, setExternalValue, handleLocalChange]);


  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isDisabled) return;
    setExternalValue(localValue);
    setTimeout(() => {
      if (onSubmit) onSubmit(e, localValue);
    }, 0);
  };

  const handleArticleClick = (article) => {
    if (isDisabled) return;
    const current = localValue || '';
    const articlesList = ['der', 'die', 'das'];
    const parts = current.trimStart().split(/\s+/);

    let newVal = '';
    if (parts.length > 0 && articlesList.includes(parts[0].toLowerCase())) {
      const rest = parts.slice(1).join(' ');
      newVal = `${article} ${rest}`.trimEnd() + (current.endsWith(' ') ? ' ' : (rest ? '' : ' '));
    } else {
      newVal = current ? `${article} ${current.trimStart()}` : `${article} `;
    }

    handleLocalChange(newVal);
  };

  const handleSpecialCharClick = (char) => {
    if (isDisabled) return;
    handleLocalChange((localValue || '') + char);
  };

  const articles = ['der', 'die', 'das'];
  const specialChars = ['ä', 'ö', 'ü', 'ß'];

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* Optional Top Slot (Traduisez en allemand) */}
      {topSlot && topSlot}

      {/* QUESTION HEADER */}
      {question && (
        <div style={{ textAlign: 'center', marginBottom: '2rem', width: '100%', maxWidth: '500px' }}>
          {!topSlot && (
            <div style={{ fontSize: '0.9rem', color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
              Traduisez en allemand :
            </div>
          )}
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <h1 style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              fontWeight: 900,
              color: '#ffffff',
              margin: 0,
              textShadow: '0 2px 16px rgba(0,0,0,0.8)',
              letterSpacing: '0.5px',
              lineHeight: 1.25,
              wordBreak: 'break-word'
            }}>
              {question}
            </h1>
            
            {onSpeakQuestion && (
              <button
                type="button"
                onClick={onSpeakQuestion}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '50%',
                  width: '34px',
                  height: '34px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#f8fafc',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                title="Écouter la question"
              >
                🔊
              </button>
            )}
          </div>
        </div>
      )}

      {/* FEEDBACK SLOT (Active Correction, Flash messages) */}
      {feedbackSlot && (
        <div style={{ width: '100%', maxWidth: '440px', marginBottom: '1.2rem' }}>
          {feedbackSlot}
        </div>
      )}

      {/* FORM & FAKE INPUT */}
      <form onSubmit={handleFormSubmit} style={{ width: '100%', maxWidth: '440px', position: 'relative', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: '100%', flexShrink: 0 }}>
          
          {/* FAKE INPUT replacing the native <input> */}
          {adminAnswer && (
            <button
              type="button"
              onClick={() => {
                if (isDisabled) return;
                const ans = adminAnswer.toLowerCase();
                handleLocalChange(ans);
              }}
              style={{
                position: 'absolute',
                left: '-35px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#475569',
                color: 'white',
                border: '1px solid #64748b',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '0.8rem',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                opacity: isDisabled ? 0.5 : 1,
                zIndex: 10,
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
              title="Admin: Remplir la réponse auto (minuscule)"
            >
              A
            </button>
          )}
          <div
            ref={fakeInputRef}
            className="fake-input"
            tabIndex={isDisabled ? -1 : 0}
            inputMode="none"
            style={{
              borderColor: isCorrectionMode ? '#ef4444' : (theme === 'valkyrie' ? 'rgba(0, 242, 254, 0.5)' : 'var(--border-color, rgba(255,255,255,0.2))'),
              boxShadow: isCorrectionMode ? '0 0 20px rgba(239, 68, 68, 0.4)' : (theme === 'valkyrie' ? 'inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 242, 254, 0.2)' : 'none'),
              borderWidth: isCorrectionMode ? '2px' : (theme === 'valkyrie' ? '1.5px' : '1px'),
              opacity: isDisabled ? 0.6 : 1,
            }}
            onClick={() => {
              if (!isDisabled && typeof window !== 'undefined') {
                // Sur mobile, on active le wrapper WanaBoard
                if (window.innerWidth <= 768) {
                  document.body.classList.add('mobile-keyboard-active');
                }
              }
            }}
          >
            {localValue ? (
              <>
                {localValue}
                {!isDisabled && <span className="cursor"></span>}
              </>
            ) : (
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 400 }}>
                {isCorrectionMode ? "Tapez la correction ici..." : inputPlaceholder}
                {!isDisabled && <span className="cursor"></span>}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isDisabled || !(localValue || '').trim()}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%) translateZ(0)',
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              border: 'none',
              background: isCorrectionMode
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : ((localValue || '').trim() 
                    ? (theme === 'valkyrie' ? 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #ef4444, #dc2626)') 
                    : 'rgba(255, 255, 255, 0.08)'),
              color: theme === 'valkyrie' && (localValue || '').trim() ? '#000000' : '#ffffff',
              fontSize: '1.2rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (isDisabled || !(localValue || '').trim()) ? 'not-allowed' : 'pointer',
              boxShadow: (localValue || '').trim() 
                ? (isCorrectionMode ? '0 0 14px rgba(16, 185, 129, 0.4)' : (theme === 'valkyrie' ? '0 0 12px rgba(0, 242, 254, 0.6)' : '0 0 14px rgba(239, 68, 68, 0.4)')) 
                : 'none',
              transition: 'all 0.15s ease',
              opacity: (localValue || '').trim() ? 1 : 0.45,
              flexShrink: 0
            }}
            title="Valider (Entrée)"
          >
            ➔
          </button>
        </div>

        {/* MINI-KEYBOARD (Strictly 2 lines) - Hidden on Mobile via CSS */}
        <div className="mobile-hide-special-chars" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center', marginTop: '0.8rem', width: '100%' }}>
          
          {/* Ligne 1 : der, die, das */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
            {articles.map((art, index) => (
              <button
                key={art}
                type="button"
                onClick={() => handleArticleClick(art)}
                disabled={isDisabled}
                style={{
                  padding: '0.35rem 0.8rem',
                  background: theme === 'valkyrie' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1px solid ${theme === 'valkyrie' ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 255, 255, 0.15)'}`,
                  borderRadius: '8px',
                  color: theme === 'valkyrie' ? '#00f2fe' : '#f8fafc',
                  fontSize: '0.8rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isDisabled ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.background = theme === 'valkyrie' ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = theme === 'valkyrie' ? '#00f2fe' : 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.background = theme === 'valkyrie' ? 'rgba(0, 242, 254, 0.12)' : 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = theme === 'valkyrie' ? 'rgba(0, 242, 254, 0.3)' : 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                title={`Raccourci: ${index + 1}`}
              >
                {art} <span style={{fontSize: '0.6rem', color: 'gray'}}>({index + 1})</span>
              </button>
            ))}
          </div>

          {/* Ligne 2 : ä, ö, ü, ß */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
            {specialChars.map(char => (
              <button
                key={char}
                type="button"
                onClick={() => handleSpecialCharClick(char)}
                disabled={isDisabled}
                style={{
                  padding: '0.35rem 0.8rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  opacity: isDisabled ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isDisabled) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
                title={`Insérer ${char}`}
              >
                {char}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
});

export default BattleConsole;
