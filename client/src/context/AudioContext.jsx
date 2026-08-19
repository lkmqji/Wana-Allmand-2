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

  // 3 Volume Sliders (Master, SFX, BGM) - Defaults: Master 0.7, SFX 0.6, BGM 0.5
  const [masterVolume, setMasterVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_master_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.7;
    } catch {
      return 0.7;
    }
  });

  const [sfxVolume, setSfxVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_sfx_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.6;
    } catch {
      return 0.6;
    }
  });

  const [bgmVolume, setBgmVolumeState] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_bgm_volume');
      return saved !== null ? Math.max(0, Math.min(1, parseFloat(saved))) : 0.5;
    } catch {
      return 0.5;
    }
  });

  const isSoundEnabledRef = useRef(isSoundEnabled);
  const hasInteractedRef = useRef(false);
  const bgmRef = useRef(null);

  // Sync isSoundEnabled state to ref and localStorage
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
    try {
      localStorage.setItem('wana_sound_enabled', String(isSoundEnabled));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [isSoundEnabled]);

  // Synchronize Master & SFX volumes to sfxManager GainNodes
  useEffect(() => {
    try {
      localStorage.setItem('wana_master_volume', String(masterVolume));
    } catch {}
    sfx.setMasterVolume(isSoundEnabled ? masterVolume : 0);
  }, [masterVolume, isSoundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('wana_sfx_volume', String(sfxVolume));
    } catch {}
    sfx.setSfxVolume(isSoundEnabled ? sfxVolume : 0);
  }, [sfxVolume, isSoundEnabled]);

  // Synchronize BGM volume: volumeFinal = bgmVolume * masterVolume * 0.10 (harmonious background soundscape)
  useEffect(() => {
    try {
      localStorage.setItem('wana_bgm_volume', String(bgmVolume));
    } catch {}
    const bgm = bgmRef.current;
    if (bgm) {
      if (isSoundEnabled) {
        const finalBgmVol = Math.max(0, Math.min(1, masterVolume * bgmVolume * 0.10));
        bgm.volume = finalBgmVol;
      } else {
        bgm.volume = 0;
      }
    }
  }, [bgmVolume, masterVolume, isSoundEnabled]);

  // =========================================================================
  // 🎵 BGM (Background Music) HTML5 Audio Engine
  // =========================================================================
  useEffect(() => {
    let bgmAudio = null;
    try {
      bgmAudio = new Audio('/sounds/bgm-main.mp3');
      bgmAudio.loop = true;
      const initialVol = isSoundEnabledRef.current ? Math.max(0, Math.min(1, masterVolume * bgmVolume * 0.10)) : 0;
      bgmAudio.volume = initialVol;
      bgmAudio.preload = 'auto';
      bgmRef.current = bgmAudio;
    } catch (e) {
      console.debug('BGM initialization notice:', e);
    }

    return () => {
      if (bgmAudio) {
        bgmAudio.pause();
        bgmAudio.src = '';
      }
    };
  }, []);

  // 🔄 Sync BGM playback with isSoundEnabled state
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    if (isSoundEnabled) {
      if (hasInteractedRef.current) {
        bgm.play().catch(err => {
          console.debug('BGM play waiting for user action or file presence:', err);
        });
      }
    } else {
      bgm.pause();
    }
  }, [isSoundEnabled]);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => !prev);
  }, []);

  const setSoundEnabled = useCallback((val) => {
    setIsSoundEnabled(Boolean(val));
  }, []);

  const setMasterVolume = useCallback((vol) => {
    const val = Math.max(0, Math.min(1, Number(vol)));
    setMasterVolumeState(val);
  }, []);

  const setSfxVolume = useCallback((vol) => {
    const val = Math.max(0, Math.min(1, Number(vol)));
    setSfxVolumeState(val);
  }, []);

  const setBgmVolume = useCallback((vol) => {
    const val = Math.max(0, Math.min(1, Number(vol)));
    setBgmVolumeState(val);
  }, []);

  const resetAudioSettings = useCallback(() => {
    setIsSoundEnabled(true);
    setMasterVolumeState(0.5);
    setSfxVolumeState(0.5);
    setBgmVolumeState(0.5);
  }, []);

  const startBgm = useCallback(() => {
    if (bgmRef.current && isSoundEnabledRef.current) {
      bgmRef.current.play().catch(() => {});
    }
  }, []);

  const pauseBgm = useCallback(() => {
    if (bgmRef.current) {
      bgmRef.current.pause();
    }
  }, []);

  // =========================================================================
  // 🔊 SFX Methods
  // =========================================================================
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

  const playGameStart = useCallback(() => {
    sfx.playGameStart(isSoundEnabledRef.current);
  }, []);

  // Unlock AudioContext & Launch BGM on first user interaction (Autoplay policy compliance)
  useEffect(() => {
    const handleFirstInteraction = () => {
      hasInteractedRef.current = true;
      sfx.unlockAudio();

      // Start BGM if sound is enabled
      if (isSoundEnabledRef.current && bgmRef.current) {
        bgmRef.current.play().catch(e => {
          console.debug('BGM autoplay on interaction notice:', e);
        });
      }

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
    masterVolume,
    setMasterVolume,
    sfxVolume,
    setSfxVolume,
    bgmVolume,
    setBgmVolume,
    resetAudioSettings,
    startBgm,
    pauseBgm,
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
    playLevelUp,
    playGameStart
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
    return {
      isSoundEnabled: true,
      toggleSound: () => {},
      setSoundEnabled: () => {},
      masterVolume: 0.5,
      setMasterVolume: () => {},
      sfxVolume: 0.5,
      setSfxVolume: () => {},
      bgmVolume: 0.5,
      setBgmVolume: () => {},
      resetAudioSettings: () => {},
      startBgm: () => {},
      pauseBgm: () => {},
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
      playLevelUp: () => {},
      playGameStart: () => {}
    };
  }
  return context;
}

export const useSoundEffects = useAudio;
