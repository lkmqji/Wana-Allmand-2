import React, { useState, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { triggerHaptic } from '../utils/haptics';
import { speakText } from '../utils/speech';
import confetti from 'canvas-confetti';

export default function MatchingPairs({ pairs, onSubmit, timeLimit = 15 }) {
  const { playPitchUp, playMatchError, playMatchSuccess } = useAudio();
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedIds, setMatchedIds] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [errorIds, setErrorIds] = useState({ left: null, right: null });
  const [comboLevel, setComboLevel] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  const leftWords = pairs.left;
  const rightWords = pairs.right;

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
      playPitchUp(comboLevel);
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
          playMatchSuccess();
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
      playMatchError();
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
      return;
    }
    
    setSelectedLeft(id);
    if (selectedRight) {
      handleMatch(id, selectedRight);
    }
  };

  const onRightClick = (id) => {
    if (isBlocked || matchedIds.includes(id)) return;
    triggerHaptic('light');

    if (selectedRight === id) {
      setSelectedRight(null);
      return;
    }

    setSelectedRight(id);
    if (selectedLeft) {
      handleMatch(selectedLeft, id);
    }
  };

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
        {/* Left Column (Source Language) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {leftWords.map((word) => {
            const isMatched = matchedIds.includes(word.id);
            const isSelected = selectedLeft === word.id;
            const isError = errorIds.left === word.id;
            return (
              <div 
                key={`left-${word.id}`}
                onClick={() => onLeftClick(word.id)}
                className={`matching-btn ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${isError ? 'error shake-hard' : ''}`}
              >
                {word.text}
              </div>
            );
          })}
        </div>

        {/* Right Column (Target Language) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {rightWords.map((word) => {
            const isMatched = matchedIds.includes(word.id);
            const isSelected = selectedRight === word.id;
            const isError = errorIds.right === word.id;
            return (
              <div 
                key={`right-${word.id}`}
                onClick={() => onRightClick(word.id)}
                className={`matching-btn ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''} ${isError ? 'error shake-hard' : ''}`}
              >
                {word.text}
              </div>
            );
          })}
        </div>
      </div>

      {isBlocked && errorIds.left && (
        <div className="blocked-overlay">
          ❌ Bloqué (2s)
        </div>
      )}
    </div>
  );
}
