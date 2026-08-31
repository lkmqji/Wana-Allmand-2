import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { sfx } from '../utils/sfxManager';
import { triggerHaptic } from '../utils/haptics';

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

  const [isMusicMuted, setIsMusicMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_music_muted');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  // Dedicated In-Game Music Mute state (Default to false so ambient music plays everywhere smoothly)
  const [isInGame, setIsInGame] = useState(false);
  const [isGameMusicMuted, setIsGameMusicMuted] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_game_music_muted');
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });

  const isSoundEnabledRef = useRef(isSoundEnabled);
  const isMusicMutedRef = useRef(isMusicMuted);
  const isInGameRef = useRef(isInGame);
  const isGameMusicMutedRef = useRef(isGameMusicMuted);
  const masterVolumeRef = useRef(masterVolume);
  const bgmVolumeRef = useRef(bgmVolume);
  const hasInteractedRef = useRef(false);
  const bgmRef = useRef(null);

  useEffect(() => {
    masterVolumeRef.current = masterVolume;
  }, [masterVolume]);

  useEffect(() => {
    bgmVolumeRef.current = bgmVolume;
  }, [bgmVolume]);

  // Sync isSoundEnabled state to ref and localStorage
  useEffect(() => {
    isSoundEnabledRef.current = isSoundEnabled;
    try {
      localStorage.setItem('wana_sound_enabled', String(isSoundEnabled));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [isSoundEnabled]);

  // Sync isMusicMuted state to ref and localStorage
  useEffect(() => {
    isMusicMutedRef.current = isMusicMuted;
    try {
      localStorage.setItem('wana_music_muted', String(isMusicMuted));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [isMusicMuted]);

  // Sync isGameMusicMuted & isInGame states
  useEffect(() => {
    isGameMusicMutedRef.current = isGameMusicMuted;
    try {
      localStorage.setItem('wana_game_music_muted', String(isGameMusicMuted));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [isGameMusicMuted]);

  useEffect(() => {
    isInGameRef.current = isInGame;
  }, [isInGame]);

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

  // Synchronize BGM volume & mute state:
  // - If sound is disabled or globally muted: BGM is paused
  // - If currently in a match (isInGame === true) AND isGameMusicMuted === true: BGM is paused
  // - As soon as match ends (isInGame === false), BGM automatically plays again!
  useEffect(() => {
    try {
      localStorage.setItem('wana_bgm_volume', String(bgmVolume));
    } catch {}
    const bgm = bgmRef.current;
    if (bgm) {
      const isMutedInCurrentContext = !isSoundEnabled || isMusicMuted || (isInGame && isGameMusicMuted);
      if (!isMutedInCurrentContext) {
        const finalBgmVol = Math.max(0, Math.min(1, masterVolume * bgmVolume * 0.12));
        bgm.volume = finalBgmVol;
        if (hasInteractedRef.current && !document.hidden) {
          bgm.play().catch(err => {
            console.debug('BGM play waiting for user action or file presence:', err);
          });
        }
      } else {
        bgm.pause();
      }
    }
  }, [bgmVolume, masterVolume, isSoundEnabled, isMusicMuted, isInGame, isGameMusicMuted]);

  // =========================================================================
  // 🎵 BGM (Background Music) HTML5 Audio Engine
  // =========================================================================
  useEffect(() => {
    let bgmAudio = null;
    try {
      bgmAudio = new Audio('/sounds/bgm-main.mp3');
      bgmAudio.loop = true;
      bgmAudio.preload = 'auto';
      const initialMuted = !isSoundEnabledRef.current || isMusicMutedRef.current || (isInGameRef.current && isGameMusicMutedRef.current);
      const initialVol = !initialMuted
        ? Math.max(0, Math.min(1, masterVolume * bgmVolume * 0.12))
        : 0;
      bgmAudio.volume = initialVol;

      // Ensure looping resilience across all browsers
      const handleEnded = () => {
        bgmAudio.currentTime = 0;
        const shouldPlay = isSoundEnabledRef.current && !isMusicMutedRef.current && !(isInGameRef.current && isGameMusicMutedRef.current);
        if (shouldPlay && !document.hidden) {
          bgmAudio.play().catch(() => {});
        }
      };
      bgmAudio.addEventListener('ended', handleEnded);

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

  // 🔄 Sync BGM playback with visibility & state
  useEffect(() => {
    const bgm = bgmRef.current;
    if (!bgm) return;

    const isMutedInCurrentContext = !isSoundEnabled || isMusicMuted || (isInGame && isGameMusicMuted);
    if (!isMutedInCurrentContext) {
      if (hasInteractedRef.current && !document.hidden) {
        bgm.play().catch(err => {
          console.debug('BGM play waiting for user action or file presence:', err);
        });
      }
    } else {
      bgm.pause();
    }
  }, [isSoundEnabled, isMusicMuted, isInGame, isGameMusicMuted]);

  // 📱 Page Visibility API: Pause audio & suspend Web Audio on tab switch/minimize, resume on focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isHidden = document.hidden || document.visibilityState === 'hidden';

      if (isHidden) {
        // Background: Pause BGM & suspend Web Audio Context to save CPU/battery
        if (bgmRef.current) {
          bgmRef.current.pause();
        }
        sfx.suspend();
      } else {
        // Foreground: Resume BGM & Web Audio Context if sound is enabled
        if (isSoundEnabledRef.current) {
          sfx.resume();
          const isMuted = isMusicMutedRef.current || (isInGameRef.current && isGameMusicMutedRef.current);
          if (bgmRef.current && hasInteractedRef.current && !isMuted) {
            bgmRef.current.play().catch(err => {
              console.debug('BGM resume on visibility change notice:', err);
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const toggleSound = useCallback(() => {
    hasInteractedRef.current = true;
    sfx.unlockAudio();
    setIsSoundEnabled(prev => !prev);
  }, []);

  const setSoundEnabled = useCallback((val) => {
    hasInteractedRef.current = true;
    sfx.unlockAudio();
    setIsSoundEnabled(Boolean(val));
  }, []);

  const toggleMusicMute = useCallback(() => {
    hasInteractedRef.current = true;
    sfx.unlockAudio();
    if (isInGameRef.current) {
      setIsGameMusicMuted(prev => !prev);
    } else {
      setIsMusicMuted(prev => !prev);
    }
  }, []);

  const toggleGameMusicMute = useCallback(() => {
    hasInteractedRef.current = true;
    sfx.unlockAudio();
    setIsGameMusicMuted(prev => !prev);
  }, []);

  const setGameMusicMuted = useCallback((val) => {
    hasInteractedRef.current = true;
    sfx.unlockAudio();
    setIsGameMusicMuted(Boolean(val));
  }, []);

  const setMusicMuted = useCallback((val) => {
    hasInteractedRef.current = true;
    sfx.unlockAudio();
    setIsMusicMuted(Boolean(val));
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
    setIsMusicMuted(false);
    setIsGameMusicMuted(false);
    setMasterVolumeState(0.7);
    setSfxVolumeState(0.6);
    setBgmVolumeState(0.5);
  }, []);

  const startBgm = useCallback(() => {
    hasInteractedRef.current = true;
    sfx.unlockAudio();
    if (bgmRef.current && isSoundEnabledRef.current && !isMusicMutedRef.current) {
      const finalBgmVol = Math.max(0, Math.min(1, masterVolume * bgmVolume * 0.12));
      bgmRef.current.volume = finalBgmVol;
      bgmRef.current.play().catch((err) => {
        console.debug('startBgm playback notice:', err);
      });
    }
  }, [masterVolume, bgmVolume]);

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
    triggerHaptic('light');
    sfx.playClick(isSoundEnabledRef.current);
  }, []);

  const playSuccess = useCallback(() => {
    triggerHaptic('success');
    sfx.playSuccess(isSoundEnabledRef.current);
  }, []);

  const playError = useCallback(() => {
    triggerHaptic('error');
    sfx.playError(isSoundEnabledRef.current);
  }, []);

  const playExplosion = useCallback(() => {
    triggerHaptic('heavy');
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
    triggerHaptic('success');
    sfx.playVictory(isSoundEnabledRef.current);
  }, []);

  const playDefeat = useCallback(() => {
    triggerHaptic('error');
    sfx.playDefeat(isSoundEnabledRef.current);
  }, []);

  const playLevelUp = useCallback(() => {
    triggerHaptic('medium');
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

      // Start BGM if sound is enabled & not muted
      const isMuted = !isSoundEnabledRef.current || isMusicMutedRef.current || (isInGameRef.current && isGameMusicMutedRef.current);
      if (!isMuted && bgmRef.current) {
        const finalBgmVol = Math.max(0, Math.min(1, masterVolumeRef.current * bgmVolumeRef.current * 0.12));
        bgmRef.current.volume = finalBgmVol;
        bgmRef.current.play().catch(e => {
          console.debug('BGM autoplay on interaction notice:', e);
        });
      }

      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('mousedown', handleFirstInteraction);
    };

    window.addEventListener('pointerdown', handleFirstInteraction, { passive: true });
    window.addEventListener('keydown', handleFirstInteraction, { passive: true });
    window.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    window.addEventListener('click', handleFirstInteraction, { passive: true });
    window.addEventListener('mousedown', handleFirstInteraction, { passive: true });

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

      // Safe recovery if BGM was paused due to autoplay policy
      if (!hasInteractedRef.current) {
        handleFirstInteraction();
      } else {
        const isMuted = isMusicMutedRef.current || (isInGameRef.current && isGameMusicMutedRef.current);
        if (!isMuted && bgmRef.current && bgmRef.current.paused && !document.hidden) {
          bgmRef.current.play().catch(() => {});
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver, { passive: true });
    document.addEventListener('click', handleClick, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('mousedown', handleFirstInteraction);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  const value = {
    isSoundEnabled,
    toggleSound,
    setSoundEnabled,
    isMusicMuted,
    toggleMusicMute,
    setMusicMuted,
    isInGame,
    setIsInGame,
    isGameMusicMuted,
    toggleGameMusicMute,
    setGameMusicMuted,
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
      isMusicMuted: false,
      toggleMusicMute: () => {},
      setMusicMuted: () => {},
      isInGame: false,
      setIsInGame: () => {},
      isGameMusicMuted: true,
      toggleGameMusicMute: () => {},
      setGameMusicMuted: () => {},
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
