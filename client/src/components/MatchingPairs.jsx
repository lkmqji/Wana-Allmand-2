import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { triggerHaptic } from '../utils/haptics';
import { speakText } from '../utils/speech';
import confetti from 'canvas-confetti';

export default function MatchingPairs({ pairs, onSubmit, timeLimit = 20 }) {
  const { playSuccess, playError, playVictory } = useAudio();
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [errorIds, setErrorIds] = useState({ left: null, right: null });
  const [comboLevel, setComboLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  const leftWords = pairs?.left || [];
  const rightWords = pairs?.right || [];
  const rowCount = Math.max(leftWords.length, rightWords.length);

  const matchedRef = useRef(matchedIds);
  matchedRef.current = matchedIds;
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  // Driftless Timer logic
  useEffect(() => {
    const startTime = Date.now();
    const durationMs = timeLimit * 1000;

    const timerId = setInterval(() => {
      if (matchedRef.current.length === leftWords.length && leftWords.length > 0) {
        clearInterval(timerId);
        return;
      }
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerId);
        onSubmitRef.current(false);
      }
    }, 100);

    return () => clearInterval(timerId);
  }, [timeLimit, leftWords.length]);

  const handleMatch = (lId, rId) => {
    setIsBlocked(true);
    if (lId === rId) {
      // Match!
      playSuccess();
      setComboLevel(prev => prev + 1);
      triggerHaptic('success');
      setMatchedIds(prev => [...prev, lId]);
      
      const matchedRightWord = rightWords.find(w => w.id === rId);
      if (matchedRightWord) {
        speakText(matchedRightWord.text, 'de-DE');
      }
      
      setSelectedLeft(null);
      setSelectedRight(null);
      
      if (matchedIds.length + 1 === leftWords.length) {
        // All matched!
        setTimeout(() => {
          playVictory();
          triggerHaptic('success_heavy');
          confetti({
            particleCount: 150,
            spread: 90,
            origin: { y: 0.6 }
          });
          onSubmit(true); // Success
        }, 400);
      } else {
        setIsBlocked(false);
      }
    } else {
      // Error: Quick snappy shake without frustrating 2-second block
      playError();
      triggerHaptic('error');
      setErrorIds({ left: lId, right: rId });
      setComboLevel(0);
      
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setErrorIds({ left: null, right: null });
        setIsBlocked(false);
      }, 650);
    }
  };

  const onLeftClick = (id) => {
    if (isBlocked || matchedIds.includes(id)) return;
    triggerHaptic('light');
    setSelectedLeft(prev => prev === id ? null : id);
  };

  const onRightClick = (id) => {
    if (isBlocked || matchedIds.includes(id)) return;
    triggerHaptic('light');
    setSelectedRight(prev => prev === id ? null : id);
  };

  useEffect(() => {
    if (selectedLeft !== null && selectedRight !== null && !isBlocked) {
      handleMatch(selectedLeft, selectedRight);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeft, selectedRight, isBlocked]);

  const progressPercent = Math.max(0, (timeLeft / timeLimit) * 100);

  return (
    <div className="matching-container">
      {/* Top Status & Combo Banner */}
      <div className="matching-header">
        <div className="matching-title-row">
          <span className="matching-badge-pulse">⚡ Course aux Paires</span>
          <span className="matching-pairs-counter">
            {matchedIds.length} / {leftWords.length} trouvées
          </span>
          {comboLevel > 1 && (
            <span className="matching-combo-pill">🔥 Combo x{comboLevel} !</span>
          )}
        </div>
      </div>
      
      {/* Slim Dynamic Progress Bar */}
      <div className="matching-timer" title={`${Math.ceil(timeLeft)}s restantes`}>
        <div 
          className={`matching-timer-fill ${timeLeft < 5 ? 'danger' : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Column Headers */}
      <div className="matching-columns-header">
        <div className="matching-col-label left">
          <span className="col-flag">🇫🇷</span> Traduction
        </div>
        <div className="matching-col-label right">
          <span className="col-flag">🇩🇪</span> Allemand
        </div>
      </div>

      {/* Two-Column Responsive Grid */}
      <div className="matching-grid">
        {Array.from({ length: rowCount }).map((_, index) => {
          const leftWord = leftWords[index];
          const rightWord = rightWords[index];

          const isLeftMatched = leftWord && matchedIds.includes(leftWord.id);
          const isLeftSelected = leftWord && selectedLeft === leftWord.id;
          const isLeftError = leftWord && errorIds.left === leftWord.id;

          const isRightMatched = rightWord && matchedIds.includes(rightWord.id);
          const isRightSelected = rightWord && selectedRight === rightWord.id;
          const isRightError = rightWord && errorIds.right === rightWord.id;

          return (
            <React.Fragment key={`pair-row-${index}`}>
              {/* Left Button (Source / French) */}
              {leftWord ? (
                <button 
                  type="button"
                  key={`left-${leftWord.id}`}
                  onClick={() => onLeftClick(leftWord.id)}
                  disabled={isLeftMatched}
                  className={`matching-btn matching-btn-left ${isLeftMatched ? 'matched' : ''} ${isLeftSelected ? 'selected' : ''} ${isLeftError ? 'error shake-hard' : ''}`}
                >
                  <span className="matching-btn-text">{leftWord.text}</span>
                  {isLeftMatched && <span className="matching-check">✓</span>}
                </button>
              ) : <div className="matching-placeholder" />}

              {/* Right Button (Target / German) */}
              {rightWord ? (
                <button 
                  type="button"
                  key={`right-${rightWord.id}`}
                  onClick={() => onRightClick(rightWord.id)}
                  disabled={isRightMatched}
                  className={`matching-btn matching-btn-right ${isRightMatched ? 'matched' : ''} ${isRightSelected ? 'selected' : ''} ${isRightError ? 'error shake-hard' : ''}`}
                >
                  <span className="matching-btn-text">{rightWord.text}</span>
                  {isRightMatched && <span className="matching-check">✓</span>}
                </button>
              ) : <div className="matching-placeholder" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
