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

  // SFX Methods - Base UI
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

  // SFX Methods - Social & UI (Low Volume)
  const playMessageSent = useCallback(() => {
    sfx.playMessageSent(isSoundEnabledRef.current);
  }, []);

  const playMessageReceived = useCallback(() => {
    sfx.playMessageReceived(isSoundEnabledRef.current);
  }, []);

  const playNotification = useCallback(() => {
    sfx.playNotification(isSoundEnabledRef.current);
  }, []);

  const playReactionBurst = useCallback(() => {
    sfx.playReactionBurst(isSoundEnabledRef.current);
  }, []);

  // SFX Methods - Gameplay & Duel
  const playCountdownTick = useCallback(() => {
    sfx.playCountdownTick(isSoundEnabledRef.current);
  }, []);

  const playCountdownGo = useCallback(() => {
    sfx.playCountdownGo(isSoundEnabledRef.current);
  }, []);

  const playTimeWarning = useCallback(() => {
    sfx.playTimeWarning(isSoundEnabledRef.current);
  }, []);

  const playOpponentAnswered = useCallback(() => {
    sfx.playOpponentAnswered(isSoundEnabledRef.current);
  }, []);

  const playFreeze = useCallback(() => {
    sfx.playFreeze(isSoundEnabledRef.current);
  }, []);

  // SFX Methods - Progression & Results
  const playVictory = useCallback(() => {
    sfx.playVictory(isSoundEnabledRef.current);
  }, []);

  const playDefeat = useCallback(() => {
    sfx.playDefeat(isSoundEnabledRef.current);
  }, []);

  const playLevelUp = useCallback(() => {
    sfx.playLevelUp(isSoundEnabledRef.current);
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

    // Global UI event listeners for interactive elements
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
    playAlert,
    playMessageSent,
    playMessageReceived,
    playNotification,
    playReactionBurst,
    playCountdownTick,
    playCountdownGo,
    playTimeWarning,
    playOpponentAnswered,
    playFreeze,
    playVictory,
    playDefeat,
    playLevelUp
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
    // Fallback safe dummy object
    return {
      isSoundEnabled: true,
      toggleSound: () => {},
      setSoundEnabled: () => {},
      playHover: () => {},
      playClick: () => {},
      playSuccess: () => {},
      playError: () => {},
      playExplosion: () => {},
      playAlert: () => {},
      playMessageSent: () => {},
      playMessageReceived: () => {},
      playNotification: () => {},
      playReactionBurst: () => {},
      playCountdownTick: () => {},
      playCountdownGo: () => {},
      playTimeWarning: () => {},
      playOpponentAnswered: () => {},
      playFreeze: () => {},
      playVictory: () => {},
      playDefeat: () => {},
      playLevelUp: () => {}
    };
  }
  return context;
}

export const useSoundEffects = useAudio;
