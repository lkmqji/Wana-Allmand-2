import React, { useEffect, useState } from 'react';

export const TypoFallingVFX = ({ dropped = [] }) => {
  const [letters, setLetters] = useState([]);

  useEffect(() => {
    if (dropped && dropped.length > 0) {
      const items = dropped.map((item, idx) => ({
        id: Math.random(),
        char: item.char || '?',
        offset: (idx - (dropped.length - 1) / 2) * 28
      }));
      setLetters(items);
      const timer = setTimeout(() => setLetters([]), 900);
      return () => clearTimeout(timer);
    }
  }, [dropped]);

  if (letters.length === 0) return null;

  return (
    <div 
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }}
    >
      {letters.map((l) => (
        <div
          key={l.id}
          style={{
            position: 'absolute',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 900,
            fontSize: '1.8rem',
            color: '#ffbe0b',
            filter: 'drop-shadow(0 0 15px rgba(255, 190, 11, 0.9))',
            transform: `translateX(${l.offset}px)`,
            animation: 'letter-tumble-fall 0.85s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'
          }}
        >
          {l.char}
        </div>
      ))}
      <style>{`
        @keyframes letter-tumble-fall {
          0% { transform: translateY(0px) rotate(0deg) scale(1.2); opacity: 1; }
          30% { transform: translateY(-25px) rotate(15deg) scale(1.35); opacity: 0.95; }
          100% { transform: translateY(180px) rotate(120deg) scale(0.55); opacity: 0; }
        }
      `}</style>
    </div>
  );
};
