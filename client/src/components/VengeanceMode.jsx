import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { exampleLists } from '../data/exampleLists';
import { resolveWordPair } from '../utils/dictionary';
import { useSoundEffects } from '../context/AudioContext';

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
      // User omitted article or typed only noun
      articleMatched = false;
    }
  }

  const dist = levenshteinDistance(expNoun, actNoun);
  const maxTypos = Math.max(1, Math.floor(expNoun.length / 5));

  return articleMatched && (dist === 0 || (dist <= maxTypos && expNoun.length >= 4));
}

export default function VengeanceMode({
  failedWords = [],
  user,
  onPurify,
  onBackHome,
  playerName = 'Guerrier',
  avatar = '🔥',
  allLists = []
}) {
  const BATCH_SIZE = 15;

  // Task 1: Intro / Sas de préparation state
  const [isPlaying, setIsPlaying] = useState(false);

  // Task 3: Initialize queue with max 15 words
  const [queue, setQueue] = useState(() => {
    const extraLists = [exampleLists, ...(allLists || [])];
    const sliced = (failedWords || []).slice(0, BATCH_SIZE);
    const initial = sliced.map((w, idx) => {
      const pair = resolveWordPair(w, extraLists);
      return {
        id: idx + 1,
        word: pair.germanWord, // German word to be written
        question: pair.frenchPrompt, // French/English prompt to be translated
        count: pair.count,
        hearts: 0
      };
    }).filter(w => Boolean(w.word));
    return initial;
  });

  const [batchTotal] = useState(() => Math.min((failedWords || []).length, BATCH_SIZE) || 0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'wrong'|'purify', message: '', expected: '' }
  
  // Task 2: Active Correction states
  const [mustTypeCorrection, setMustTypeCorrection] = useState(false);
  const [correctionText, setCorrectionText] = useState('');

  const [isShaking, setIsShaking] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [purifiedCount, setPurifiedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const { playSuccess, playError, playExplosion, playCountdownGo, playTimeWarning } = useSoundEffects();

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const currentWord = queue[currentIndex] || null;

  // Synchronized Sound on Word Appearance (DOM Render)
  useEffect(() => {
    if (isPlaying && currentWord && !isCompleted && !feedback && !mustTypeCorrection) {
      playCountdownGo();
    }
  }, [isPlaying, currentIndex, currentWord?.id, isCompleted, mustTypeCorrection]);

  // Time warning (<= 5 seconds) tension sound ticker in Vengeance Mode
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

  // Auto-focus input on new word/round or after correction trigger
  useEffect(() => {
    if (isPlaying && !isAnswering && !isCompleted) {
      inputRef.current?.focus();
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [isPlaying, currentIndex, isAnswering, isCompleted, feedback, mustTypeCorrection, currentWord]);

  // Trigger triumph confetti on complete
  useEffect(() => {
    if (isCompleted) {
      // Fire red & gold triumph confetti burst
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

  // Countdown timer with 30% faster duration and strict cleanup
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
    
    // SFX: Play heavy error buzzer on timeout & reset
    playError();
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    // Punishment: Reset hearts to 0
    const updatedQueue = [...queue];
    updatedQueue[currentIndex] = {
      ...updatedQueue[currentIndex],
      hearts: 0
    };
    setQueue(updatedQueue);

    // Task 2: Trigger Active Correction mode
    setMustTypeCorrection(true);
    setCorrectionText(currentWord.word);
    setInputVal('');
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!currentWord) return;

    // Task 2: Active Correction Validation
    if (mustTypeCorrection) {
      const isExactCorrection = 
        normalizeText(inputVal) === normalizeText(correctionText) ||
        checkVengeanceAnswer(correctionText, inputVal);

      if (isExactCorrection) {
        // Player correctly typed the correction -> proceed to next word
        setInputVal('');
        setMustTypeCorrection(false);
        setCorrectionText('');
        setFeedback(null);
        setIsShaking(false);
        setIsAnswering(false);
        // Advance to next word in queue
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
      const newHearts = (currentWord.hearts || 0) + 1;
      
      if (newHearts >= 3) {
        // 3 HEARTS REACHED: PURIFICATION! Heavy impact explosion sound
        setIsExploding(true);
        playExplosion();

        const wordToPurify = currentWord.word;
        const newPurifiedCount = purifiedCount + 1;
        setPurifiedCount(newPurifiedCount);

        setFeedback({
          type: 'purify',
          message: '💥 ÂME PURIFIÉE ! +50 XP 💥',
          expected: currentWord.word
        });

        // Trigger backend purification API
        if (user?.uid) {
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
        } else if (onPurify) {
          // Guest mode fallback
          onPurify(wordToPurify, { xpBonus: 50 });
        }

        setTimeout(() => {
          setIsExploding(false);
          setFeedback(null);
          setInputVal('');
          setIsAnswering(false);

          // Remove word from queue
          const remainingQueue = queue.filter((_, idx) => idx !== currentIndex);
          if (remainingQueue.length === 0) {
            setIsCompleted(true);
          } else {
            setQueue(remainingQueue);
            setCurrentIndex(prev => prev >= remainingQueue.length ? 0 : prev);
          }
        }, 1500);

      } else {
        // Progress toward 3 hearts (1 or 2 hearts): Gain heart positive Ding
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
          // Advance to next word in queue to vary practice
          setCurrentIndex(prev => (prev + 1) % updatedQueue.length);
        }, 1100);
      }
    } else {
      // WRONG ANSWER: PUNISHMENT + MUSCLE MEMORY CORRECTION (Task 2)
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

      setMustTypeCorrection(true);
      setCorrectionText(currentWord.word);
      setInputVal('');
    }
  };

  // 🏆 Écran de Triomphe
  if (isCompleted) {
    const totalXp = purifiedCount * 50;
    return (
      <div className="vengeance-arena">
        <div className="vengeance-game-box" style={{ textAlign: 'center', borderColor: '#ffd700', boxShadow: '0 0 60px rgba(255, 215, 0, 0.4)' }}>
          <div style={{ fontSize: '4rem', marginBottom: '0.8rem', animation: 'heartPop 0.6s ease-out' }}>
            🔥👑🔥
          </div>
          <h1 style={{ 
            fontSize: '2.4rem', 
            fontWeight: 900, 
            background: 'linear-gradient(135deg, #ef4444, #f97316, #ffd700)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            margin: '0 0 0.5rem 0',
            letterSpacing: '1px'
          }}>
            🔥 ÂME PURIFIÉE ! 🔥
          </h1>
          <p style={{ color: '#fed7aa', fontSize: '1.05rem', fontWeight: 600, marginBottom: '2rem' }}>
            Toutes vos fautes de la session ont été consumées par les flammes de la rédemption !
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
                Mots détruits ⚔️
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

          <button
            onClick={onBackHome}
            className="vengeance-action-btn"
            style={{ width: '100%', fontSize: '1.15rem', padding: '1rem' }}
          >
            🏠 Retour à l'Accueil
          </button>
        </div>
      </div>
    );
  }

  // Task 1: Sas de Préparation (Intro Screen)
  if (!isPlaying) {
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

          <div className="vengeance-flame-badge">
            🔥 Session : {queue.length} mot{queue.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Intro Presentation Box */}
        <div className="vengeance-game-box" style={{ textAlign: 'center', padding: '2.5rem 2rem' }}>
          <div style={{ fontSize: '3.8rem', marginBottom: '0.8rem', animation: 'heartPop 0.6s ease-out' }}>
            🔥⚔️🔥
          </div>
          
          <h1 style={{
            fontSize: '2.4rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ef4444, #f97316, #fbbf24)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 1rem 0',
            letterSpacing: '0.5px'
          }}>
            Prépare-toi à la Purge 🔥
          </h1>

          {/* Rule Reminder */}
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: '16px',
            padding: '1.2rem 1.4rem',
            marginBottom: '1.8rem',
            fontSize: '1rem',
            color: '#fca5a5',
            lineHeight: 1.5,
            textAlign: 'left'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', fontWeight: 800, color: '#fed7aa', fontSize: '1.05rem' }}>
              <span>📜</span> Règle de la Purge
            </div>
            <p style={{ margin: 0, color: '#f8fafc' }}>
              1 bonne réponse = <strong>+1 ❤️</strong>. 1 erreur = <strong>Retour à Zéro !</strong> Remplis les <strong>3 cœurs</strong> pour purifier le mot.
            </p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '14px',
            padding: '1rem',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#f97316' }}>{queue.length}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Mots du lot</div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#22c55e' }}>+50 XP</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Par mot purifié</div>
            </div>
          </div>

          {/* Giant Action Button */}
          <button
            onClick={() => setIsPlaying(true)}
            className="btn btn-success"
            style={{
              width: '100%',
              fontSize: '1.3rem',
              padding: '1.15rem 2rem',
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
        <div className="vengeance-game-box text-center">
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

        <div className="vengeance-flame-badge">
          🔥 Mode Vengeance • {queue.length} mot{queue.length > 1 ? 's' : ''} restant{queue.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Main Game Box */}
      <div className={`vengeance-game-box ${feedback?.type === 'success' || feedback?.type === 'purify' ? 'correct-flash' : ''} ${feedback?.type === 'wrong' || mustTypeCorrection ? 'wrong-flash' : ''} ${isExploding ? 'heart-icon-active' : ''}`}>
        
        {/* Visual Timer Bar (paused or hidden during active correction) */}
        <div className="vengeance-timer-track">
          <div
            className="vengeance-timer-bar"
            style={{
              width: mustTypeCorrection ? '100%' : `${timerPercent}%`,
              background: mustTypeCorrection ? 'rgba(239, 68, 68, 0.5)' : (timeLeft < 3 ? '#ef4444' : 'linear-gradient(90deg, #ef4444, #f97316, #fbbf24)')
            }}
          />
        </div>

        {/* Task 4: 3 Hearts Meter with clear empty heart contrast */}
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

        {/* Prompt Word / French Question */}
        <div style={{ textAlign: 'center', marginBottom: '1.8rem' }}>
          <div style={{ fontSize: '0.95rem', color: '#f97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>
            Traduire en allemand :
          </div>
          <h1 style={{
            fontSize: '2.6rem',
            fontWeight: 900,
            color: '#ffffff',
            margin: '0',
            textShadow: '0 2px 16px rgba(0,0,0,0.8)',
            letterSpacing: '0.5px',
            lineHeight: 1.2
          }}>
            {currentWord.question || currentWord.word}
          </h1>
          {currentWord.count > 1 && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
              Raté {currentWord.count} fois par le passé
            </div>
          )}
        </div>

        {/* Task 2: Active Correction Notification / Feedback */}
        {mustTypeCorrection ? (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid #ef4444',
            borderRadius: '14px',
            padding: '1rem 1.2rem',
            textAlign: 'center',
            marginBottom: '1.2rem',
            boxShadow: '0 0 25px rgba(239, 68, 68, 0.3)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#fca5a5', marginBottom: '0.4rem' }}>
              ❌ Réponse incorrecte ! Tape la bonne réponse pour continuer :
            </div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: 900,
              color: '#4ade80',
              textShadow: '0 0 16px rgba(74, 222, 128, 0.5)',
              letterSpacing: '0.5px'
            }}>
              {correctionText}
            </div>
          </div>
        ) : feedback ? (
          <div style={{
            background: feedback.type === 'wrong' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
            border: `1.5px solid ${feedback.type === 'wrong' ? '#ef4444' : '#22c55e'}`,
            borderRadius: '12px',
            padding: '0.8rem 1rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            className="input-field"
            placeholder={mustTypeCorrection ? "Tape exactement la correction ci-dessus..." : "Écris la traduction en allemand..."}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={isAnswering}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            style={{
              padding: '1.1rem',
              fontSize: '1.25rem',
              textAlign: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderColor: mustTypeCorrection ? '#ef4444' : (isShaking ? '#ef4444' : 'rgba(239, 68, 68, 0.4)'),
              boxShadow: mustTypeCorrection ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none',
              borderWidth: mustTypeCorrection ? '2px' : '1px',
              color: '#ffffff',
              borderRadius: '14px'
            }}
          />

          <button
            type="submit"
            className={mustTypeCorrection ? "btn btn-success" : "vengeance-action-btn"}
            disabled={isAnswering || !inputVal.trim()}
            style={mustTypeCorrection ? { padding: '1rem 1.6rem', fontSize: '1.05rem', fontWeight: 800 } : {}}
          >
            {mustTypeCorrection ? '⚡ VALIDER LA CORRECTION (ENTRÉE)' : '⚡ PURIFIER LE MOT (ENTRÉE)'}
          </button>
        </form>

        {/* Task 3: Session progress footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>Progression de la session : {purifiedCount} / {batchTotal}</span>
          <span>Gain : +50 XP / mot</span>
        </div>
      </div>
    </div>
  );
}
