import React from 'react';

/**
 * Composant unifié pour la zone de combat (Console de saisie)
 * Utilisé dans Game.jsx, VengeanceMode.jsx, et TugOfWarArena.jsx
 */
const BattleConsole = React.memo(function BattleConsole({
  // Slots & Content
  question,
  onSpeakQuestion,
  topSlot,
  feedbackSlot,
  bottomSlot,
  
  // Input State
  inputValue,
  onInputChange,
  onSubmit,
  inputPlaceholder = 'Traduction en allemand...',
  inputRef,
  isDisabled = false,
  isError = false,
  isCorrectionMode = false,
  
  // Keyboard
  articles = ['der', 'die', 'das'],
  specialChars = ['ä', 'ö', 'ü', 'ß'],

  // Theme (for minor color adjustments if needed)
  theme = 'default' // 'default', 'vengeance', 'valkyrie'
}) {
  
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (isDisabled) return;
    if (onSubmit) onSubmit(e);
  };

  const handleArticleClick = (article) => {
    if (isDisabled) return;
    const current = inputValue || '';
    const articlesList = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen'];
    const parts = current.trimStart().split(/\s+/);

    let newVal = '';
    if (parts.length > 0 && articlesList.includes(parts[0].toLowerCase())) {
      const rest = parts.slice(1).join(' ');
      newVal = `${article} ${rest}`.trimEnd() + (current.endsWith(' ') ? ' ' : (rest ? '' : ' '));
    } else {
      newVal = current ? `${article} ${current.trimStart()}` : `${article} `;
    }

    onInputChange(newVal);
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSpecialCharClick = (char) => {
    if (isDisabled) return;
    if (inputRef && inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart ?? (inputValue || '').length;
      const end = input.selectionEnd ?? (inputValue || '').length;
      const nextVal = (inputValue || '').substring(0, start) + char + (inputValue || '').substring(end);
      onInputChange(nextVal);
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + char.length, start + char.length);
      }, 0);
    } else {
      onInputChange((inputValue || '') + char);
    }
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      {/* 1. TOP SLOT (Timer, VFX, etc.) */}
      {topSlot && (
        <div style={{ width: '100%', marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
          {topSlot}
        </div>
      )}

      {/* 2. QUESTION HEADER */}
      {question && (
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', width: '100%', maxWidth: '500px' }}>
          {theme === 'vengeance' && (
            <div style={{ fontSize: '0.9rem', color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
              Traduire en allemand :
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
          
          {bottomSlot}
        </div>
      )}

      {/* 3. FEEDBACK SLOT (Active Correction, Flash messages) */}
      {feedbackSlot && (
        <div style={{ width: '100%', maxWidth: '440px', marginBottom: '1.2rem' }}>
          {feedbackSlot}
        </div>
      )}

      {/* 4. FORM & INPUT */}
      <form onSubmit={handleFormSubmit} className={isError ? 'error-shake' : ''} style={{ width: '100%', maxWidth: '440px', position: 'relative' }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            ref={inputRef}
            type="text"
            className="input-field"
            placeholder={inputPlaceholder}
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={isDisabled}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            autoFocus
            style={{
              width: '100%',
              textAlign: 'center',
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: '1.15rem',
              padding: '1rem 3.5rem 1rem 1.5rem',
              borderRadius: '24px',
              backgroundColor: 'rgba(6, 8, 14, 0.75)',
              borderColor: isCorrectionMode ? '#ef4444' : (isError ? '#ef4444' : (theme === 'valkyrie' ? 'rgba(0, 242, 254, 0.5)' : 'var(--border-color, rgba(255,255,255,0.2))')),
              color: '#ffffff',
              outline: 'none',
              boxShadow: isCorrectionMode ? '0 0 20px rgba(239, 68, 68, 0.4)' : (theme === 'valkyrie' ? 'inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 15px rgba(0, 242, 254, 0.2)' : 'none'),
              borderWidth: isCorrectionMode ? '2px' : (theme === 'valkyrie' ? '1.5px' : '1px'),
              borderStyle: 'solid',
              transition: 'all 0.15s ease',
              transform: 'translateZ(0)',
              willChange: 'border-color'
            }}
          />

          <button
            type="submit"
            disabled={isDisabled || !(inputValue || '').trim()}
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
                : ((inputValue || '').trim() 
                    ? (theme === 'valkyrie' ? 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)' : 'linear-gradient(135deg, #ef4444, #dc2626)') 
                    : 'rgba(255, 255, 255, 0.08)'),
              color: theme === 'valkyrie' && (inputValue || '').trim() ? '#000000' : '#ffffff',
              fontSize: '1.2rem',
              fontWeight: 900,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: (isDisabled || !(inputValue || '').trim()) ? 'not-allowed' : 'pointer',
              boxShadow: (inputValue || '').trim() 
                ? (isCorrectionMode ? '0 0 14px rgba(16, 185, 129, 0.4)' : (theme === 'valkyrie' ? '0 0 12px rgba(0, 242, 254, 0.6)' : '0 0 14px rgba(239, 68, 68, 0.4)')) 
                : 'none',
              transition: 'all 0.15s ease',
              opacity: (inputValue || '').trim() ? 1 : 0.45,
              flexShrink: 0
            }}
            title="Valider (Entrée)"
          >
            ➔
          </button>
        </div>

        {/* 5. MINI-KEYBOARD (Articles & Chars) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'center', marginTop: '0.8rem', width: '100%' }}>
          
          {articles && articles.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
              {articles.map(art => (
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
                  title={`Insérer / Remplacer par l'article '${art}'`}
                >
                  {art}
                </button>
              ))}
            </div>
          )}

          {specialChars && specialChars.length > 0 && (
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
          )}
        </div>
      </form>
    </div>
  );
});

export default BattleConsole;
