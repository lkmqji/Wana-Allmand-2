import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { exampleLists } from '../data/exampleLists';
import { resolveWordPair } from '../utils/dictionary';

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
  // Initialize queue of words to purify with local hearts: 0 and robust prompt resolution
  const [queue, setQueue] = useState(() => {
    const extraLists = [exampleLists, ...(allLists || [])];
    const initial = (failedWords || []).map((w, idx) => {
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

  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION);
  const [isAnswering, setIsAnswering] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success'|'wrong'|'purify', message: '', expected: '' }
  const [isShaking, setIsShaking] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [purifiedCount, setPurifiedCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [initialTotalCount] = useState(() => (failedWords || []).length || 1);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const currentWord = queue[currentIndex] || null;

  // Auto-focus input on new word/round or after feedback (Task 3)
  useEffect(() => {
    if (!isAnswering && !isCompleted && !feedback) {
      inputRef.current?.focus();
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [currentIndex, isAnswering, isCompleted, feedback, currentWord]);

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
    if (isCompleted || !currentWord || isAnswering) return;

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
  }, [currentIndex, isAnswering, isCompleted, queue.length]);

  const handleTimeout = () => {
    if (isAnswering || !currentWord) return;
    setIsAnswering(true);
    setIsShaking(true);

    // Punishment: Reset hearts to 0
    const updatedQueue = [...queue];
    updatedQueue[currentIndex] = {
      ...updatedQueue[currentIndex],
      hearts: 0
    };
    setQueue(updatedQueue);

    setFeedback({
      type: 'wrong',
      message: 'TEMPS ÉCOULÉ ! Cœurs réinitialisés 🖤',
      expected: currentWord.word
    });

    setTimeout(() => {
      setIsShaking(false);
      setFeedback(null);
      setInputVal('');
      setIsAnswering(false);
      // Advance to next word in queue
      setCurrentIndex(prev => (prev + 1) % updatedQueue.length);
    }, 1800);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (isAnswering || !currentWord) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswering(true);

    const isCorrect = checkVengeanceAnswer(currentWord.word, inputVal);

    if (isCorrect) {
      const newHearts = (currentWord.hearts || 0) + 1;
      
      if (newHearts >= 3) {
        // 3 HEARTS REACHED: PURIFICATION!
        setIsExploding(true);
        const wordToPurify = currentWord.word;
        const newPurifiedCount = purifiedCount + 1;
        setPurifiedCount(newPurifiedCount);

        setFeedback({
          type: 'purify',
          message: '💥 ÂME PURIFIÉE ! +50 XP 💥',
          expected: currentWord.word
        });

        // Trigger backend purification API (Task 4)
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
        // Progress toward 3 hearts (1 or 2 hearts)
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
      // WRONG ANSWER: PUNISHMENT (hearts = 0, screen shake)
      setIsShaking(true);
      const updatedQueue = [...queue];
      updatedQueue[currentIndex] = {
        ...updatedQueue[currentIndex],
        hearts: 0
      };
      setQueue(updatedQueue);

      setFeedback({
        type: 'wrong',
        message: 'RÉPONSE INCORRECTE ! Cœurs réinitialisés 💔',
        expected: currentWord.word
      });

      setTimeout(() => {
        setIsShaking(false);
        setFeedback(null);
        setInputVal('');
        setIsAnswering(false);
        setCurrentIndex(prev => (prev + 1) % updatedQueue.length);
      }, 1900);
    }
  };

  // 🏆 TÂCHE 5 : L'Écran de Triomphe
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
            Toutes vos fautes ont été consumées par les flammes de la rédemption !
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
      <div className={`vengeance-game-box ${feedback?.type === 'success' || feedback?.type === 'purify' ? 'correct-flash' : ''} ${feedback?.type === 'wrong' ? 'wrong-flash' : ''} ${isExploding ? 'heart-icon-active' : ''}`}>
        
        {/* Pedagogical Infobox (Task 3) */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px dashed rgba(239, 68, 68, 0.4)',
          borderRadius: '12px',
          padding: '0.65rem 0.9rem',
          marginBottom: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          fontSize: '0.84rem',
          color: '#fca5a5',
          lineHeight: 1.4
        }}>
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
          <div>
            <strong>Mode Solo :</strong> Jouez uniquement sur vos erreurs. Remplissez les 3 cœurs (❤️❤️❤️) pour effacer définitivement le mot de vos fautes et gagner un gros bonus d'XP !
          </div>
        </div>

        {/* Visual Timer Bar (30% faster) */}
        <div className="vengeance-timer-track">
          <div
            className="vengeance-timer-bar"
            style={{
              width: `${timerPercent}%`,
              background: timeLeft < 3 ? '#ef4444' : 'linear-gradient(90deg, #ef4444, #f97316, #fbbf24)'
            }}
          />
        </div>

        {/* 3 Hearts Meter */}
        <div className="vengeance-hearts-row" title={`Cœurs : ${heartsCount}/3`}>
          <span className={heartsCount >= 1 ? 'heart-icon-active' : ''} style={{ transition: 'transform 0.2s' }}>
            {heartsCount >= 1 ? '❤️' : '🖤'}
          </span>
          <span className={heartsCount >= 2 ? 'heart-icon-active' : ''} style={{ transition: 'transform 0.2s' }}>
            {heartsCount >= 2 ? '❤️' : '🖤'}
          </span>
          <span className={heartsCount >= 3 ? 'heart-icon-active' : ''} style={{ transition: 'transform 0.2s' }}>
            {heartsCount >= 3 ? '❤️' : '🖤'}
          </span>
        </div>

        {/* Prompt Word / French Question (Task 1) */}
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

        {/* Feedback Overlay / Notification */}
        {feedback && (
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
        )}

        {/* Submission Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <input
            ref={inputRef}
            autoFocus
            type="text"
            className="input-field"
            placeholder="Écris la traduction en allemand..."
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
              borderColor: isShaking ? '#ef4444' : 'rgba(239, 68, 68, 0.4)',
              color: '#ffffff',
              borderRadius: '14px'
            }}
          />

          <button
            type="submit"
            className="vengeance-action-btn"
            disabled={isAnswering || !inputVal.trim()}
          >
            ⚡ PURIFIER LE MOT (ENTRÉE)
          </button>
        </form>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span>Progression globale : {purifiedCount} / {initialTotalCount}</span>
          <span>Gain : +50 XP / mot</span>
        </div>
      </div>
    </div>
  );
}
