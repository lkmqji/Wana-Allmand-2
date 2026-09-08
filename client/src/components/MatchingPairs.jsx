import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { triggerHaptic } from '../utils/haptics';
import { speakText } from '../utils/speech';
import confetti from 'canvas-confetti';

export default function MatchingPairs({ pairs, onSubmit, timeLimit = 15 }) {
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

  // Timer logic
  useEffect(() => {
    if (matchedIds.length === leftWords.length) return;
    if (timeLeft <= 0) {
      onSubmit(false); // Fail
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft((prev) => prev - 0.1);
    }, 100);
    return () => clearInterval(timerId);
  }, [timeLeft, matchedIds.length, leftWords.length, onSubmit]);

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
        }, 500);
      } else {
        setIsBlocked(false);
      }
    } else {
      // Error
      playError();
      triggerHaptic('error');
      setErrorIds({ left: lId, right: rId });
      setComboLevel(0);
      
      // Block for 2 seconds
      setTimeout(() => {
        setSelectedLeft(null);
        setSelectedRight(null);
        setErrorIds({ left: null, right: null });
        setIsBlocked(false);
      }, 2000);
    }
  };

  const onLeftClick = (id) => {
    if (isBlocked || matchedIds.includes(id)) return;
    triggerHaptic('light');
    if (selectedLeft === id) {
      setSelectedLeft(null);
    } else {
      setSelectedLeft(id);
    }
  };

  const onRightClick = (id) => {
    if (isBlocked || matchedIds.includes(id)) return;
    triggerHaptic('light');
    if (selectedRight === id) {
      setSelectedRight(null);
    } else {
      setSelectedRight(id);
    }
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
      
      <div className="matching-header">
        ⚡ Course aux Paires ! ⚡
      </div>
      
      <div className="matching-timer">
        <div 
          className={`matching-timer-fill ${timeLeft < 5 ? 'danger' : ''}`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

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
              {/* Left Button (Source Language) */}
              {leftWord ? (
                <button 
                  type="button"
                  key={`left-${leftWord.id}`}
                  onClick={() => onLeftClick(leftWord.id)}
                  className={`matching-btn matching-btn-left ${isLeftMatched ? 'matched' : ''} ${isLeftSelected ? 'selected' : ''} ${isLeftError ? 'error shake-hard' : ''}`}
                >
                  <span className="matching-btn-text">{leftWord.text}</span>
                </button>
              ) : <div />}

              {/* Right Button (Target Language) */}
              {rightWord ? (
                <button 
                  type="button"
                  key={`right-${rightWord.id}`}
                  onClick={() => onRightClick(rightWord.id)}
                  className={`matching-btn matching-btn-right ${isRightMatched ? 'matched' : ''} ${isRightSelected ? 'selected' : ''} ${isRightError ? 'error shake-hard' : ''}`}
                >
                  <span className="matching-btn-text">{rightWord.text}</span>
                </button>
              ) : <div />}
            </React.Fragment>
          );
        })}
      </div>

      {isBlocked && errorIds.left && (
        <div className="blocked-overlay">
          ❌ Bloqué (2s)
        </div>
      )}
    </div>
  );
}
