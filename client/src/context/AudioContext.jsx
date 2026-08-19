import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sfx } from '../utils/sfxManager';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_sound_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const isSoundEnabledRef = useRef(isSoundEnabled);
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
    try {
      localStorage.setItem('wana_sound_enabled', String(isSoundEnabled));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [isSoundEnabled]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  const setSoundEnabled = useCallback((val) => {
    setIsSoundEnabled(Boolean(val));
  }, []);

  // SFX Methods
  const playHover = useCallback(() => {
    sfx.playHover(isSoundEnabledRef.current);
  }, []);

  const playClick = useCallback(() => {
    sfx.playClick(isSoundEnabledRef.current);
  }, []);

  const playSuccess = useCallback(() => {
    sfx.playSuccess(isSoundEnabledRef.current);
  }, []);

  const playError = useCallback(() => {
    sfx.playError(isSoundEnabledRef.current);
  }, []);

  const playExplosion = useCallback(() => {
    sfx.playExplosion(isSoundEnabledRef.current);
  }, []);

  const playAlert = useCallback(() => {
    sfx.playAlert(isSoundEnabledRef.current);
  }, []);

  // Unlock AudioContext on first user interaction & Bind global UI sounds (Hover & Click)
  useEffect(() => {
    const handleFirstInteraction = () => {
      sfx.unlockAudio();
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });

    // Global UI event listeners for UI buttons, tabs, modal close/triggers & cards
    const isInteractiveElement = (target) => {
      if (!target || !(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          'button, .btn, .btn-primary, .btn-secondary, .btn-success, .btn-danger, .list-card, .nav-item, [role="button"], .modal-close, .clickable, .tab-btn'
        )
      );
    };

    const handleMouseOver = (e) => {
      if (!isSoundEnabledRef.current) return;
      if (isInteractiveElement(e.target)) {
        sfx.playHover(true);
      }
    };

    const handleClick = (e) => {
      if (!isSoundEnabledRef.current) return;
      if (isInteractiveElement(e.target)) {
        sfx.playClick(true);
      }
    };

    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const value = {
    isSoundEnabled,
    toggleSound,
    setSoundEnabled,
    playHover,
    playClick,
    playSuccess,
    playError,
    playExplosion,
    playAlert
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    // Fallback safe dummy object if rendered outside provider
    return {
      isSoundEnabled: true,
      toggleSound: () => {},
      setSoundEnabled: () => {},
      playHover: () => {},
      playClick: () => {},
      playSuccess: () => {},
      playError: () => {},
      playExplosion: () => {},
      playAlert: () => {}
    };
  }
  return context;
}

// Alias for convenience as requested
export const useSoundEffects = useAudio;
