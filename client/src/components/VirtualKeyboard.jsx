import React, { useState, useEffect } from 'react';

/**
 * WanaBoard - Clavier Virtuel Mobile
 * Émet des CustomEvents ('wana_key') pour ne pas déclencher de re-rendus React au niveau racine.
 */
const VirtualKeyboard = () => {
  const [layout, setLayout] = useState(() => {
    return localStorage.getItem('wana_keyboard_layout') || 'AZERTY';
  });

  // Neumorphism/Glassmorphism theme can be toggled via a prop or context if needed. For now we use the glassmorphism approach default.
  const [keyTheme] = useState('key-flat'); 

  useEffect(() => {
    localStorage.setItem('wana_keyboard_layout', layout);
  }, [layout]);

  // Always enforce the 50/50 layout when VirtualKeyboard is mounted
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.body.classList.add('mobile-keyboard-active');
      
      // Setup listener for menu/chat open/close events to hide keyboard
      const handleMenuToggle = (e) => {
        if (e.detail?.isOpen) {
          document.body.classList.add('keyboard-hidden');
        } else {
          document.body.classList.remove('keyboard-hidden');
        }
      };
      window.addEventListener('wana_menu_toggle', handleMenuToggle);

      return () => {
        document.body.classList.remove('mobile-keyboard-active');
        document.body.classList.remove('keyboard-hidden');
        window.removeEventListener('wana_menu_toggle', handleMenuToggle);
      };
    }
  }, []);

  const hapticFeedback = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      // API may not work on iOS depending on settings, but works great on Android.
      try {
        window.navigator.vibrate(10);
      } catch (e) {
        // ignore
      }
    }
  };

  const handleKeyPress = (key) => {
    hapticFeedback();
    window.dispatchEvent(new CustomEvent('wana_key', { detail: { key, action: 'insert' } }));
  };

  const handleBackspace = () => {
    hapticFeedback();
    window.dispatchEvent(new CustomEvent('wana_key', { detail: { key: 'Backspace', action: 'delete' } }));
  };

  const handleClearAll = () => {
    hapticFeedback();
    window.dispatchEvent(new CustomEvent('wana_key', { detail: { action: 'clear_all' } }));
  };

  const handleSubmit = () => {
    hapticFeedback();
    window.dispatchEvent(new CustomEvent('wana_key', { detail: { key: 'Enter', action: 'submit' } }));
  };

  const toggleLayout = () => {
    hapticFeedback();
    setLayout(prev => prev === 'QWERTY' ? 'AZERTY' : 'QWERTY');
  };

  const layouts = {
    QWERTY: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ],
    AZERTY: [
      ['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'],
      ['w', 'x', 'c', 'v', 'b', 'n']
    ]
  };

  const currentRows = layouts[layout];

  // Backspace Long Press logic
  let backspaceTimer = null;
  const startBackspace = (e) => {
    e.preventDefault();
    handleBackspace();
    backspaceTimer = setTimeout(() => {
      handleClearAll();
    }, 500); // 500ms for long press
  };

  const stopBackspace = (e) => {
    e.preventDefault();
    if (backspaceTimer) clearTimeout(backspaceTimer);
  };

  return (
    <div className="virtual-keyboard-wrapper">
      <div className="virtual-keyboard-container">
        
        {/* Top Row: Special Shortcuts (Articles) */}
        <div className="keyboard-row special-row">
          {['der', 'die', 'das'].map((char) => {
            let extraClass = '';
            if (char === 'der') extraClass = 'kb-key-der';
            if (char === 'die') extraClass = 'kb-key-die';
            if (char === 'das') extraClass = 'kb-key-das';

            return (
              <button
                key={char}
                className={`kb-key kb-key-special ${keyTheme} ${extraClass}`}
                onClick={(e) => { e.preventDefault(); handleKeyPress(char); }}
              >
                {char}
              </button>
            );
          })}
        </div>

        {/* Row 2: Special Characters (Umlauts) */}
        <div className="keyboard-row special-row">
          {['ä', 'ö', 'ü', 'ß'].map((char) => (
            <button
              key={char}
              className={`kb-key kb-key-special ${keyTheme}`}
              onClick={(e) => { e.preventDefault(); handleKeyPress(char); }}
            >
              {char}
            </button>
          ))}
        </div>

        {/* Row 1 */}
        <div className="keyboard-row">
          {currentRows[0].map(char => (
            <button
              key={char}
              className={`kb-key ${keyTheme}`}
              onClick={(e) => { e.preventDefault(); handleKeyPress(char); }}
            >
              {char}
            </button>
          ))}
        </div>

        {/* Row 2 */}
        <div className="keyboard-row">
          {currentRows[1].map(char => (
            <button
              key={char}
              className={`kb-key ${keyTheme}`}
              onClick={(e) => { e.preventDefault(); handleKeyPress(char); }}
            >
              {char}
            </button>
          ))}
        </div>

        {/* Row 3 with Action Keys */}
        <div className="keyboard-row">
          {/* Layout Toggle */}
          <button 
            className={`kb-key kb-key-action ${keyTheme}`} 
            onClick={(e) => { e.preventDefault(); toggleLayout(); }}
            title={`Passer en ${layout === 'QWERTY' ? 'AZERTY' : 'QWERTY'}`}
            style={{ minWidth: '40px', fontSize: '1.2rem' }}
          >
            🌐
          </button>
          
          {currentRows[2].map(char => (
            <button
              key={char}
              className={`kb-key ${keyTheme}`}
              onClick={(e) => { e.preventDefault(); handleKeyPress(char); }}
            >
              {char}
            </button>
          ))}

          {/* Backspace */}
          <button 
            className={`kb-key kb-key-action ${keyTheme}`}
            onPointerDown={startBackspace}
            onPointerUp={stopBackspace}
            onPointerLeave={stopBackspace}
            onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
            style={{ minWidth: '50px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none' }}
          >
            ⌫
          </button>
        </div>

        {/* Spacebar Row & Submit */}
        <div className="keyboard-row">
          <button
            className={`kb-key ${keyTheme}`}
            onClick={(e) => { e.preventDefault(); handleKeyPress(' '); }}
            style={{ flex: 1, maxWidth: '60%', background: '#475569', border: '1px solid #334155' }}
          >
            Espace
          </button>
          <button
            className={`kb-key kb-key-submit ${keyTheme}`}
            onClick={(e) => { e.preventDefault(); handleSubmit(); }}
            style={{ flex: 0.3, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none' }}
          >
            ➔
          </button>
        </div>

      </div>
    </div>
  );
};

export default VirtualKeyboard;
