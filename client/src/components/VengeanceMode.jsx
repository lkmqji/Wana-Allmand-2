import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { exampleLists } from '../data/exampleLists';
import { resolveWordPair } from '../utils/dictionary';
import { useAudio, useSoundEffects } from '../context/AudioContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ROUND_DURATION = 10.5; // 30% faster than 15s duel

/**
 * Levenshtein distance for typo tolerance
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ');
}

function checkVengeanceAnswer(expected, actual) {
  if (!expected || !actual) return false;
  const expNorm = normalizeText(expected);
  const actNorm = normalizeText(actual);

  if (expNorm === actNorm) return true;

  const articles = ['der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen'];
  const expParts = expNorm.split(' ');
  const actParts = actNorm.split(' ');

  let expNoun = expNorm;
  let actNoun = actNorm;
  let articleMatched = true;

  if (expParts.length > 1 && articles.includes(expParts[0])) {
    const expArt = expParts[0];
    expNoun = expParts.slice(1).join(' ');

    if (actParts.length > 1 && articles.includes(actParts[0])) {
      const actArt = actParts[0];
      actNoun = actParts.slice(1).join(' ');
      if (expArt !== actArt) articleMatched = false;
    } else {
      articleMatched = false;
    }
  }

  const dist = levenshteinDistance(expNoun, actNoun);
  const maxTypos = Math.max(1, Math.floor(expNoun.length / 5));

  return articleMatched && (dist === 0 || (dist <= maxTypos && expNoun.length >= 4));
}

/**
 * Fisher-Yates Shuffle algorithm for unpredictable word sequences
 */
function fisherYatesShuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Web Speech API - Prononciation allemande native (de-DE)
 */
function speakGermanWord(word, isSoundEnabled = true) {
  if (!isSoundEnabled || !word || typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel(); // Stop any pending pronunciation
    const cleanWord = word.replace(/[\(].*?[\)]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanWord);
    utterance.lang = 'de-DE';
    utterance.rate = 0.95; // Natural German pacing
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.debug('SpeechSynthesis notice:', e);
  }
}

/**
 * Web Speech API - Prononciation de la question / prompt (fr-FR)
 */
function speakPromptWord(promptText, isSoundEnabled = true) {
  if (!isSoundEnabled || !promptText || typeof window === 'undefined' || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
    const cleanPrompt = promptText.replace(/[\(].*?[\)]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(cleanPrompt);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.debug('SpeechSynthesis notice:', e);
  }
}

/**
 * Clean Fault Highlighter (Strikethrough / Red diff without verbose labels)
 */
function renderFaultComparison(wrongAttempt, expected) {
  if (!wrongAttempt || !wrongAttempt.trim()) {
    return <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '1.05rem' }}>⏱️ (temps écoulé)</span>;
  }
  const wrong = wrongAttempt.trim();
  const exp = (expected || '').trim();

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontFamily: 'monospace', fontSize: '1.2rem', verticalAlign: 'middle' }}>
      {wrong.split('').map((char, idx) => {
        const expectedChar = exp[idx];
        const isCorrectChar = expectedChar && char.toLowerCase() === expectedChar.toLowerCase();
        return (
          <span
            key={idx}
            style={{
              color: isCorrectChar ? '#94a3b8' : '#ef4444',
              backgroundColor: isCorrectChar ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.25)',
              textDecoration: isCorrectChar ? 'none' : 'line-through',
              fontWeight: isCorrectChar ? 600 : 900,
              padding: '1px 3px',
              borderRadius: '4px',
              border: isCorrectChar ? 'none' : '1px solid rgba(239, 68, 68, 0.5)'
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
}

export default function VengeanceMode({
  failedWords = [],
  user,
  onPurify,
  onBackHome,
  playerName = 'Guerrier',
  avatar = '🔥',
  allLists = [],
  isSurvivalMode = false,
  modeTitle = 'Mode Vengeance'
}) {
  const { isSoundEnabled, isMusicMuted, toggleMusicMute } = useAudio();
  const { playSuccess, playError, playExplosion, playCountdownGo, playTimeWarning } = useSoundEffects();

  const maxAvailable = (failedWords || []).length || 1;

  // Task 2: Default value of custom count is the TOTAL available words count
  const [batchSizeChoice, setBatchSizeChoice] = useState(() => maxAvailable);
  const [customCountInput, setCustomCountInput] = useState(() => String(maxAvailable));
  const [batchOffset, setBatchOffset] = useState(0);

  // Helper to extract & shuffle batch
  const getBatchData = (choice, offset = 0) => {
    const extraLists = [exampleLists, ...(allLists || [])];
    const all = (failedWords || []).map((w, idx) => {
      const pair = resolveWordPair(w, extraLists);
      return {
        id: idx + 1,
        word: pair.germanWord, // German word to be written
        question: pair.frenchPrompt, // French/English prompt to be translated
        count: pair.count,
        hearts: 0
      };
    }).filter(w => Boolean(w.word));

    const count = Number(choice) || all.length || 10;
    const sliced = all.slice(offset, offset + count);
    const finalSliced = sliced.length > 0 ? sliced : all.slice(0, count);
    const shuffled = fisherYatesShuffle(finalSliced);

    return {
      allWords: all,
      batchWords: shuffled,
      totalCount: shuffled.length,
      remainingCount: Math.max(0, all.length - (offset + shuffled.length))
    };
  };

  // Progression persistence key in localStorage
  const progressStorageKey = `wana_prog_${isSurvivalMode ? 'surv' : 'veng'}_${modeTitle.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // Check saved progress
  const [savedProgress, setSavedProgress] = useState(() => {
    try {
      const raw = localStorage.getItem(progressStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.queue) && parsed.queue.length > 0) {
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  // Intro Sas state
  const [isPlaying, setIsPlaying] = useState(false);

  // Queue state initialized with total available words by default
  const [queue, setQueue] = useState(() => getBatchData(maxAvailable, 0).batchWords);
  const [batchTotal, setBatchTotal] = useState(() => getBatchData(maxAvailable, 0).totalCount);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedback, setFeedback] = useState(null);
  
  // Active Correction & Error pedagogy states
  const [mustTypeCorrection, setMustTypeCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [wrongAttempt, setWrongAttempt] = useState('');

  const [isShaking, setIsShaking] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [purifiedCount, setPurifiedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const currentWord = queue[currentIndex] || null;

  // Task 1: ANTI-CHEAT - Only play sound ticker on new word appearance, DO NOT speak German word in advance!
  useEffect(() => {
    if (isPlaying && currentWord && !isCompleted && !feedback && !mustTypeCorrection) {
      playCountdownGo();
    }
  }, [isPlaying, currentIndex, currentWord?.id, isCompleted, mustTypeCorrection]);

  // Task 1: Speak German word when active correction is triggered (Error pedagogy)
  useEffect(() => {
    if (isPlaying && mustTypeCorrection && correctionText) {
      speakGermanWord(correctionText, isSoundEnabled);
    }
  }, [isPlaying, mustTypeCorrection, correctionText, isSoundEnabled]);

  // Auto-save progression to localStorage during play
  useEffect(() => {
    if (isPlaying && !isCompleted && queue.length > 0) {
      try {
        const progressData = {
          queue,
          currentIndex,
          purifiedCount,
          batchTotal,
          batchOffset,
          batchSizeChoice,
          modeTitle,
          isSurvivalMode,
          timestamp: Date.now()
        };
        localStorage.setItem(progressStorageKey, JSON.stringify(progressData));
      } catch (e) {
        console.warn('Could not save progress:', e);
      }
    }
  }, [isPlaying, isCompleted, queue, currentIndex, purifiedCount, batchTotal, batchOffset, batchSizeChoice, progressStorageKey]);

  // Clean saved progress on triumph
  useEffect(() => {
    if (isCompleted) {
      try {
        localStorage.removeItem(progressStorageKey);
        setSavedProgress(null);
      } catch {}
    }
  }, [isCompleted, progressStorageKey]);

  // Time warning ticker in Vengeance Mode
  const roundedVengeanceTime = Math.ceil(timeLeft);
  useEffect(() => {
    if (
      isPlaying &&
      roundedVengeanceTime <= 5 &&
      roundedVengeanceTime > 0 &&
      !isAnswering &&
      !feedback &&
      !isCompleted &&
      !mustTypeCorrection &&
      currentWord
    ) {
      playTimeWarning();
    }
  }, [isPlaying, roundedVengeanceTime, isAnswering, feedback, isCompleted, mustTypeCorrection, currentWord, playTimeWarning]);

  // Auto-focus input on active screen
  useEffect(() => {
    if (isPlaying && !isAnswering && !isCompleted) {
      inputRef.current?.focus();
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isPlaying, currentIndex, isAnswering, isCompleted, feedback, mustTypeCorrection, currentWord]);

  // Confetti on triumph
  useEffect(() => {
    if (isCompleted) {
      try {
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.55 },
          colors: ['#ef4444', '#f97316', '#fbbf24', '#dc2626', '#ffd700']
        });
        setTimeout(() => {
          confetti({
            particleCount: 80,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#ef4444', '#ffd700']
          });
          confetti({
            particleCount: 80,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#f97316', '#ffd700']
          });
        }, 350);
      } catch (e) {
        console.warn(e);
      }
    }
  }, [isCompleted]);

  // Countdown timer
  useEffect(() => {
    if (!isPlaying || isCompleted || !currentWord || isAnswering || mustTypeCorrection) return;

    setTimeLeft(ROUND_DURATION);

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          clearInterval(interval);
          handleTimeout();
          return 0;
        }
        return Math.max(0, parseFloat((prev - 0.1).toFixed(2)));
      });
    }, 100);

    timerRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, currentIndex, isAnswering, isCompleted, mustTypeCorrection, queue.length]);

  const handleTimeout = () => {
    if (isAnswering || !currentWord || mustTypeCorrection) return;
    
    playError();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    // Reset hearts to 0
    const updatedQueue = [...queue];
    updatedQueue[currentIndex] = {
      ...updatedQueue[currentIndex],
      hearts: 0
    };
    setQueue(updatedQueue);

    // Task 1: Pronounce correct German word upon mistake/timeout
    speakGermanWord(currentWord.word, isSoundEnabled);

    // Trigger Active Correction mode with timeout
    setWrongAttempt(inputVal || '');
    setMustTypeCorrection(true);
    setCorrectionText(currentWord.word);
    setInputVal('');
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!currentWord) return;

    // Active Correction Validation
    if (mustTypeCorrection) {
      const isExactCorrection = 
        normalizeText(inputVal) === normalizeText(correctionText) ||
        checkVengeanceAnswer(correctionText, inputVal);

      if (isExactCorrection) {
        // Player correctly typed the correction -> advance
        setInputVal('');
        setMustTypeCorrection(false);
        setCorrectionText('');
        setWrongAttempt('');
        setFeedback(null);
        setIsShaking(false);
        setIsAnswering(false);
        setCurrentIndex(prev => (prev + 1) % queue.length);
      } else {
        // Retype mistake
        setIsShaking(true);
        playError();
        setTimeout(() => setIsShaking(false), 500);
      }
      return;
    }

    if (isAnswering) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswering(true);

    const isCorrect = checkVengeanceAnswer(currentWord.word, inputVal);

    if (isCorrect) {
      // Task 1: Positive reinforcement pronunciation on correct answer!
      speakGermanWord(currentWord.word, isSoundEnabled);

      const newHearts = (currentWord.hearts || 0) + 1;
      
      if (newHearts >= 3) {
        // 3 HEARTS REACHED: PURIFICATION / SURVIVAL SUCCESS
        setIsExploding(true);
        playExplosion();

        const wordToPurify = currentWord.word;
        const newPurifiedCount = purifiedCount + 1;
        setPurifiedCount(newPurifiedCount);

        setFeedback({
          type: 'purify',
          message: isSurvivalMode ? '💥 MOT MAÎTRISÉ ! +50 XP 💥' : '💥 ÂME PURIFIÉE ! +50 XP 💥',
          expected: currentWord.word
        });

        // Only call backend purification API if playing actual failedWords purge mode
        if (!isSurvivalMode && user?.uid) {
          fetch(`${API_URL}/api/users/${user.uid}/purify`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word: wordToPurify })
          })
          .then(res => res.json())
          .then(data => {
            if (data.success && onPurify) {
              onPurify(wordToPurify, data);
            }
          })
          .catch(err => console.error("Error purifying word API:", err));
        } else if (!isSurvivalMode && onPurify) {
          onPurify(wordToPurify, { xpBonus: 50 });
        }

        setTimeout(() => {
          setIsExploding(false);
          setFeedback(null);
          setInputVal('');
          setIsAnswering(false);

          const remainingQueue = queue.filter((_, idx) => idx !== currentIndex);
          if (remainingQueue.length === 0) {
            setIsCompleted(true);
          } else {
            setQueue(remainingQueue);
            setCurrentIndex(prev => prev >= remainingQueue.length ? 0 : prev);
          }
        }, 1400);

      } else {
        // Progress toward 3 hearts (1 or 2 hearts)
        playSuccess();

        const updatedQueue = [...queue];
        updatedQueue[currentIndex] = {
          ...updatedQueue[currentIndex],
          hearts: newHearts
        };
        setQueue(updatedQueue);

        setFeedback({
          type: 'success',
          message: `🔥 EXCELLENT ! (${newHearts}/3 Cœurs) 🔥`,
          expected: currentWord.word
        });

        setTimeout(() => {
          setFeedback(null);
          setInputVal('');
          setIsAnswering(false);
          setCurrentIndex(prev => (prev + 1) % updatedQueue.length);
        }, 1000);
      }
    } else {
      // WRONG ANSWER: Task 1 - Pronounce correct German word during error screen
      speakGermanWord(currentWord.word, isSoundEnabled);

      setIsAnswering(false);
      setIsShaking(true);
      playError();
      setTimeout(() => setIsShaking(false), 500);

      const updatedQueue = [...queue];
      updatedQueue[currentIndex] = {
        ...updatedQueue[currentIndex],
        hearts: 0
      };
      setQueue(updatedQueue);

      setWrongAttempt(inputVal || '');
      setMustTypeCorrection(true);
      setCorrectionText(currentWord.word);
      setInputVal('');
    }
  };

  // Continuous chaining of remaining batches
  const totalAvailableWords = (failedWords || []).length;
  const remainingWordsCount = Math.max(0, totalAvailableWords - (batchOffset + batchTotal));

  const handleChainNextBatch = () => {
    const nextOffset = batchOffset + batchTotal;
    const nextData = getBatchData(batchSizeChoice, nextOffset);
    setBatchOffset(nextOffset);
    setQueue(nextData.batchWords);
    setBatchTotal(nextData.totalCount);
    setCurrentIndex(0);
    setInputVal('');
    setPurifiedCount(0);
    setIsCompleted(false);
    setIsPlaying(true);
    setFeedback(null);
    setMustTypeCorrection(false);
    setCorrectionText('');
    setWrongAttempt('');
  };

  // Resume saved progress
  const handleResumeSavedProgress = () => {
    if (!savedProgress) return;
    setQueue(savedProgress.queue);
    setCurrentIndex(savedProgress.currentIndex || 0);
    setPurifiedCount(savedProgress.purifiedCount || 0);
    setBatchTotal(savedProgress.batchTotal || savedProgress.queue.length);
    setBatchOffset(savedProgress.batchOffset || 0);
    if (savedProgress.batchSizeChoice) {
      setBatchSizeChoice(savedProgress.batchSizeChoice);
      setCustomCountInput(String(savedProgress.batchSizeChoice));
    }
    setIsPlaying(true);
  };

  // Reset saved progress
  const handleResetSavedProgress = () => {
    try {
      localStorage.removeItem(progressStorageKey);
    } catch {}
    setSavedProgress(null);
    const data = getBatchData(batchSizeChoice, 0);
    setQueue(data.batchWords);
    setBatchTotal(data.totalCount);
    setBatchOffset(0);
    setCurrentIndex(0);
    setPurifiedCount(0);
  };

  // Handler for selecting quick pills (10, 15, 20)
  const handleSelectPill = (num) => {
    const val = Math.min(num, maxAvailable);
    setBatchSizeChoice(val);
    setCustomCountInput(String(val));
    const data = getBatchData(val, 0);
    setQueue(data.batchWords);
    setBatchTotal(data.totalCount);
    setBatchOffset(0);
  };

  // 🏆 Écran de Triomphe
  if (isCompleted) {
    const totalXp = purifiedCount * 50;
    return (
      <div className="vengeance-arena">
        <div className="vengeance-game-box" style={{ textAlign: 'center', borderColor: '#ffd700', boxShadow: '0 0 60px rgba(255, 215, 0, 0.4)', marginTop: '-8vh' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.8rem', animation: 'heartPop 0.6s ease-out' }}>
            🔥👑🔥
          </div>
          <h1 style={{ 
            fontSize: '2.3rem', 
            fontWeight: 900, 
            background: 'linear-gradient(135deg, #ef4444, #f97316, #ffd700)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            margin: '0 0 0.5rem 0',
            letterSpacing: '1px'
          }}>
            {isSurvivalMode ? '🔥 SURVIE TRIOMPHALE ! 🔥' : '🔥 ÂME PURIFIÉE ! 🔥'}
          </h1>
          <p style={{ color: '#fed7aa', fontSize: '1.05rem', fontWeight: 600, marginBottom: '2rem' }}>
            {isSurvivalMode 
              ? 'Tous les mots de cette session ont été maîtrisés avec brio !' 
              : 'Toutes vos fautes de la session ont été consumées par les flammes de la rédemption !'}
          </p>

          <div style={{
            background: 'rgba(0, 0, 0, 0.45)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 215, 0, 0.3)',
            padding: '1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444' }}>
                {purifiedCount}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                {isSurvivalMode ? 'Mots maîtrisés ⚔️' : 'Mots détruits ⚔️'}
              </div>
            </div>
            <div style={{ width: '1px', height: '45px', background: 'rgba(255,255,255,0.15)' }} />
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#ffd700' }}>
                +{totalXp} XP
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Gain Total 🏆
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {/* Continuous Chaining Button if more words remain */}
            {remainingWordsCount > 0 && (
              <button
                onClick={handleChainNextBatch}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  fontSize: '1.15rem',
                  padding: '1rem',
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  borderRadius: '14px',
                  boxShadow: '0 6px 20px rgba(99, 102, 241, 0.4)'
                }}
              >
                ⚡ Enchaîner ({remainingWordsCount} mot{remainingWordsCount > 1 ? 's' : ''} restant{remainingWordsCount > 1 ? 's' : ''})
              </button>
            )}

            <button
              onClick={onBackHome}
              className="vengeance-action-btn"
              style={{ width: '100%', fontSize: '1.1rem', padding: '0.95rem' }}
            >
              🏠 Retour à l'Accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sas de Préparation (Intro Screen with Custom Count & Resume Option)
  if (!isPlaying) {
    const isCustomActive = ![10, 15, 20].includes(batchSizeChoice);

    return (
      <div className="vengeance-arena">
        {/* Top Header Bar */}
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <button
              onClick={onBackHome}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                borderRadius: '12px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              ← Quitter
            </button>

            {/* Quick Music Mute Button */}
            <button
              type="button"
              onClick={toggleMusicMute}
              style={{
                background: isMusicMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                border: `1px solid ${isMusicMuted ? 'var(--danger)' : 'rgba(255, 255, 255, 0.15)'}`,
                color: isMusicMuted ? 'var(--danger)' : '#f8fafc',
                borderRadius: '12px',
                width: '38px',
                height: '38px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: isMusicMuted ? '0 0 12px rgba(239, 68, 68, 0.3)' : '0 2px 6px rgba(0,0,0,0.2)'
              }}
              title={isMusicMuted ? "Réactiver la musique de fond" : "Couper la musique de fond (muet rapide - bruitages restent actifs)"}
            >
              {isMusicMuted ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                  <line x1="2" y1="2" x2="22" y2="22" stroke="var(--danger)" strokeWidth="2.5"></line>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13"></path>
                  <circle cx="6" cy="18" r="3"></circle>
                  <circle cx="18" cy="16" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          <div className="vengeance-flame-badge">
            🔥 {modeTitle} • {totalAvailableWords} mot{totalAvailableWords > 1 ? 's' : ''} au total
          </div>
        </div>

        {/* Intro Presentation Box */}
        <div className="vengeance-game-box" style={{ textAlign: 'center', padding: '2.2rem 2rem', marginTop: '-8vh' }}>
          <div style={{ fontSize: '3.6rem', marginBottom: '0.6rem', animation: 'heartPop 0.6s ease-out' }}>
            🔥⚔️🔥
          </div>
          
          <h1 style={{
            fontSize: '2.3rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ef4444, #f97316, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 0.8rem 0',
            letterSpacing: '0.5px'
          }}>
            {isSurvivalMode ? 'Prépare-toi au Mode Survie 🔥' : 'Prépare-toi à la Purge 🔥'}
          </h1>

          {/* Rule Reminder */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            padding: '1.1rem 1.3rem',
            marginBottom: '1.5rem',
            fontSize: '0.95rem',
            color: '#fca5a5',
            lineHeight: 1.5,
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', fontWeight: 800, color: '#fed7aa', fontSize: '1rem' }}>
              <span>📜</span> Règle du Mode
            </div>
            <p style={{ margin: 0, color: '#f8fafc' }}>
              1 bonne réponse = <strong>+1 ❤️</strong>. 1 erreur = <strong>Retour à Zéro !</strong> Remplis les <strong>3 cœurs</strong> pour {isSurvivalMode ? 'maîtriser le mot' : 'purifier le mot'}.
            </p>
          </div>

          {/* Saved Progress Resume Banner */}
          {savedProgress && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1.5px solid rgba(99, 102, 241, 0.45)',
              borderRadius: '14px',
              padding: '0.9rem 1.1rem',
              marginBottom: '1.4rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.92rem', color: '#c7d2fe', fontWeight: 800, marginBottom: '0.3rem' }}>
                💾 Progression sauvegardée trouvée !
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
                {savedProgress.purifiedCount} / {savedProgress.batchTotal} mots validés ({savedProgress.queue?.length || 0} restants)
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleResumeSavedProgress}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1.1rem',
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    flex: 1
                  }}
                >
                  ▶️ Continuer
                </button>
                <button
                  type="button"
                  onClick={handleResetSavedProgress}
                  className="btn btn-secondary"
                  style={{
                    padding: '0.65rem 0.9rem',
                    fontSize: '0.82rem',
                    borderRadius: '12px'
                  }}
                >
                  🔄 Recommencer
                </button>
              </div>
            </div>
          )}

          {/* Task 2: Interactive Batch Selector with default equal to total available words */}
          <div style={{ marginBottom: '1.6rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.6rem', letterSpacing: '0.5px' }}>
              🎯 Taille du lot pour cette session :
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
              {[10, 15, 20].map(num => {
                const isSelected = batchSizeChoice === num;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleSelectPill(num)}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '999px',
                      border: isSelected ? '1.5px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)',
                      background: isSelected ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.4), rgba(220, 38, 38, 0.2))' : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      fontWeight: isSelected ? 900 : 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 14px rgba(239, 68, 68, 0.4)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {num} mots
                  </button>
                );
              })}

              {/* Editable Custom Count Box - Defaults to total available words & allows complete erasure */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: isCustomActive ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.15))' : 'rgba(255, 255, 255, 0.05)',
                border: `1.5px solid ${isCustomActive ? '#ef4444' : 'rgba(255, 255, 255, 0.15)'}`,
                borderRadius: '999px',
                padding: '0.2rem 0.6rem 0.2rem 0.8rem',
                boxShadow: isCustomActive ? '0 0 14px rgba(239, 68, 68, 0.3)' : 'none',
                transition: 'all 0.2s ease'
              }}>
                <span style={{ fontSize: '0.85rem', color: isCustomActive ? '#ffffff' : 'var(--text-muted)', fontWeight: 700 }}>
                  Personnalisé :
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={customCountInput}
                  placeholder={`ex: ${maxAvailable}`}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setCustomCountInput(val);
                    if (val) {
                      const parsed = parseInt(val, 10);
                      if (parsed >= 1) {
                        const clamped = Math.min(parsed, maxAvailable);
                        setBatchSizeChoice(clamped);
                        const data = getBatchData(clamped, 0);
                        setQueue(data.batchWords);
                        setBatchTotal(data.totalCount);
                        setBatchOffset(0);
                      }
                    }
                  }}
                  onBlur={() => {
                    const parsed = parseInt(customCountInput, 10);
                    const clamped = isNaN(parsed) || parsed < 1 ? maxAvailable : Math.min(parsed, maxAvailable);
                    setCustomCountInput(String(clamped));
                    setBatchSizeChoice(clamped);
                    const data = getBatchData(clamped, 0);
                    setQueue(data.batchWords);
                    setBatchTotal(data.totalCount);
                    setBatchOffset(0);
                  }}
                  style={{
                    width: '45px',
                    padding: '0.25rem 0.4rem',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    textAlign: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    outline: 'none'
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  / {maxAvailable}
                </span>
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '14px',
            padding: '0.9rem',
            marginBottom: '1.8rem',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#f97316' }}>{queue.length}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Mots du lot</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#22c55e' }}>+50 XP</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Par mot maîtrisé</div>
            </div>
          </div>

          {/* Giant Action Button */}
          <button
            onClick={() => setIsPlaying(true)}
            className="btn btn-success"
            style={{
              width: '100%',
              fontSize: '1.3rem',
              padding: '1.1rem 2rem',
              fontWeight: 900,
              letterSpacing: '1px',
              borderRadius: '16px',
              cursor: 'pointer'
            }}
          >
            PRÊT ? GO ! 🚀
          </button>
        </div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="vengeance-arena">
        <div className="vengeance-game-box text-center" style={{ marginTop: '-8vh' }}>
          <h2>Aucun mot à purifier</h2>
          <button onClick={onBackHome} className="vengeance-action-btn" style={{ marginTop: '1.5rem' }}>
            Retour à l'Accueil
          </button>
        </div>
      </div>
    );
  }

  const heartsCount = currentWord.hearts || 0;
  const timerPercent = (timeLeft / ROUND_DURATION) * 100;

  return (
    <div className={`vengeance-arena ${isShaking ? 'shake-effect' : ''}`}>
      {/* Top Header Bar */}
      <div style={{
        position: 'absolute',
        top: '1.5rem',
        left: '1.5rem',
        right: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            onClick={onBackHome}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f8fafc',
              borderRadius: '12px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            ← Quitter
          </button>

          {/* Quick Music Mute Button */}
          <button
            type="button"
            onClick={toggleMusicMute}
            style={{
              background: isMusicMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: `1px solid ${isMusicMuted ? 'var(--danger)' : 'rgba(255, 255, 255, 0.15)'}`,
              color: isMusicMuted ? 'var(--danger)' : '#f8fafc',
              borderRadius: '12px',
              width: '38px',
              height: '38px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: isMusicMuted ? '0 0 12px rgba(239, 68, 68, 0.3)' : '0 2px 6px rgba(0,0,0,0.2)'
            }}
            title={isMusicMuted ? "Réactiver la musique de fond" : "Couper la musique de fond (muet rapide - bruitages restent actifs)"}
          >
            {isMusicMuted ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
                <line x1="2" y1="2" x2="22" y2="22" stroke="var(--danger)" strokeWidth="2.5"></line>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            )}
          </button>
        </div>

        <div className="vengeance-flame-badge">
          🔥 {modeTitle} • {queue.length} mot{queue.length > 1 ? 's' : ''} restant{queue.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Game Box */}
      <div 
        className={`vengeance-game-box ${feedback?.type === 'success' || feedback?.type === 'purify' ? 'correct-flash' : ''} ${feedback?.type === 'wrong' || mustTypeCorrection ? 'wrong-flash' : ''} ${isExploding ? 'heart-icon-active' : ''}`}
        style={{ marginTop: '-8vh' }}
      >
        
        {/* Visual Timer Bar */}
        <div className="vengeance-timer-track">
          <div
            className="vengeance-timer-bar"
            style={{
              width: mustTypeCorrection ? '100%' : `${timerPercent}%`,
              background: mustTypeCorrection ? 'rgba(239, 68, 68, 0.5)' : (timeLeft < 3 ? '#ef4444' : 'linear-gradient(90deg, #ef4444, #f97316, #fbbf24)')
            }}
          />
        </div>

        {/* 3 Hearts Meter */}
        <div className="vengeance-hearts-row" title={`Cœurs : ${heartsCount}/3`}>
          {[1, 2, 3].map(heartNum => {
            const isFilled = heartsCount >= heartNum;
            return (
              <span
                key={heartNum}
                className={isFilled ? 'heart-icon-active' : ''}
                style={{
                  display: 'inline-block',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  opacity: isFilled ? 1 : 0.22,
                  filter: isFilled ? 'none' : 'grayscale(90%) brightness(1.1)',
                  transform: isFilled ? 'scale(1.15)' : 'scale(0.95)'
                }}
              >
                ❤️
              </span>
            );
          })}
        </div>

        {/* Prompt Word / Question Header with Speaker 🔊 for the question/prompt (Task 1 Anti-triche) */}
        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <div style={{ fontSize: '0.9rem', color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.4rem' }}>
            Traduire en allemand :
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              color: '#ffffff',
              margin: 0,
              textShadow: '0 2px 16px rgba(0,0,0,0.8)',
              letterSpacing: '0.5px',
              lineHeight: 1.2
            }}>
              {currentWord.question || currentWord.word}
            </h1>
            <button
              type="button"
              onClick={() => speakPromptWord(currentWord.question || currentWord.word, isSoundEnabled)}
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
              title="Écouter la question (français)"
            >
              🔊
            </button>
          </div>
          {currentWord.count > 1 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Raté {currentWord.count} fois par le passé
            </div>
          )}
        </div>

        {/* Active Correction Box (Task 1: Anti-triche + speaker reads German correction) */}
        {mustTypeCorrection ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '2px solid rgba(239, 68, 68, 0.6)',
            borderRadius: '18px',
            padding: '1.2rem 1.4rem',
            textAlign: 'center',
            marginBottom: '1.3rem',
            boxShadow: '0 0 35px rgba(239, 68, 68, 0.3)',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            {/* Strikethrough wrong attempt */}
            <div style={{ marginBottom: '0.4rem' }}>
              {renderFaultComparison(wrongAttempt, correctionText)}
            </div>

            {/* Expected correct word in huge green with audio speaker (German) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
              <h2 style={{
                fontSize: '2.4rem',
                fontWeight: 900,
                color: 'var(--success-color, #4ade80)',
                textShadow: '0 0 25px rgba(74, 222, 128, 0.55)',
                margin: 0,
                letterSpacing: '0.5px'
              }}>
                {correctionText}
              </h2>
              <button
                type="button"
                onClick={() => speakGermanWord(correctionText, isSoundEnabled)}
                style={{
                  background: 'rgba(74, 222, 128, 0.15)',
                  border: '1px solid rgba(74, 222, 128, 0.4)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4ade80',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                title="Écouter la prononciation allemande"
              >
                🔊
              </button>
            </div>
          </div>
        ) : feedback ? (
          <div style={{
            background: feedback.type === 'wrong' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            border: `1.5px solid ${feedback.type === 'wrong' ? '#ef4444' : '#22c55e'}`,
            borderRadius: '12px',
            padding: '0.8rem 1rem',
            textAlign: 'center',
            marginBottom: '1.4rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: feedback.type === 'wrong' ? '#fca5a5' : '#86efac' }}>
              {feedback.message}
            </div>
            {feedback.type === 'wrong' && feedback.expected && (
              <div style={{ fontSize: '0.88rem', color: '#ffffff', marginTop: '0.3rem' }}>
                Réponse attendue : <strong>{feedback.expected}</strong>
              </div>
            )}
          </div>
        ) : null}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              ref={inputRef}
              autoFocus
              type="text"
              className="input-field"
              placeholder={mustTypeCorrection ? "Tape le mot correct :" : "Écris la traduction en allemand..."}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              disabled={isAnswering}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              style={{
                width: '100%',
                padding: '1.1rem 3.6rem 1.1rem 1.2rem',
                fontSize: '1.25rem',
                textAlign: 'left',
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                borderColor: mustTypeCorrection ? '#ef4444' : (isShaking ? '#ef4444' : 'rgba(239, 68, 68, 0.4)'),
                boxShadow: mustTypeCorrection ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none',
                borderWidth: mustTypeCorrection ? '2px' : '1px',
                color: '#ffffff',
                borderRadius: '16px'
              }}
            />

            {/* Inline Arrow Submit Button */}
            <button
              type="submit"
              disabled={isAnswering || !inputVal.trim()}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: 'none',
                background: mustTypeCorrection
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : (inputVal.trim() ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'rgba(255, 255, 255, 0.08)'),
                color: '#ffffff',
                fontSize: '1.2rem',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (isAnswering || !inputVal.trim()) ? 'not-allowed' : 'pointer',
                boxShadow: inputVal.trim() 
                  ? (mustTypeCorrection ? '0 0 14px rgba(16, 185, 129, 0.4)' : '0 0 14px rgba(239, 68, 68, 0.4)') 
                  : 'none',
                transition: 'all 0.15s ease',
                opacity: inputVal.trim() ? 1 : 0.45
              }}
              title="Valider (Entrée)"
            >
              ➔
            </button>
          </div>
        </form>

        {/* Clean, Single Centered Footer Text */}
        <div style={{ textAlign: 'center', marginTop: '1.3rem', fontSize: '0.88rem', color: 'var(--text-secondary, #94a3b8)', fontWeight: 600 }}>
          {purifiedCount} / {batchTotal} {isSurvivalMode ? 'mots maîtrisés' : 'mots purifiés'}
        </div>
      </div>
    </div>
  );
}
