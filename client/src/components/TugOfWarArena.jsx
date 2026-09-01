import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TugOfWarBeam } from './TugOfWarBeam';
import { evaluateAnswer } from '../utils/levenshtein';
import { sound } from '../utils/soundEngine';
import { ParticleBurst } from './ParticleBurst';
import { TypoFallingVFX } from './TypoFallingVFX';
import BattleConsole from './BattleConsole';
import BattleCard from './BattleCard';
import VirtualKeyboard from './VirtualKeyboard';

const DEFAULT_DUEL_WORDS = [
  { question: 'la maison', answer: 'das Haus' },
  { question: 'la table', answer: 'der Tisch' },
  { question: 'l\'eau', answer: 'das Wasser' },
  { question: 'le pain', answer: 'das Brot' },
  { question: 'le livre', answer: 'das Buch' },
  { question: 'la porte', answer: 'die Tür' },
  { question: 'la clé', answer: 'der Schlüssel' },
  { question: 'être', answer: 'sein' },
  { question: 'avoir', answer: 'haben' }
];

export const TugOfWarArena = ({
  words = [],
  modeTitle = 'Tir à la Corde',
  wager = 10,
  playerName = 'Joueur 1',
  avatar = '🦊',
  level = 1,
  user = null,
  onEndMatch = () => {},
  onBackHome = () => {}
}) => {
  // Normalize provided words list or fallback to default
  const activeWords = useMemo(() => {
    if (words && words.length > 0) {
      return words.map((w, idx) => ({
        id: w.id || idx,
        question: w.question || w.frenchPrompt || w.french || w.word || 'Mot',
        answer: w.answer || w.germanWord || w.german || w.word || ''
      })).filter(w => w.question && w.answer);
    }
    return DEFAULT_DUEL_WORDS;
  }, [words]);

  const [beamPos, setBeamPos] = useState(0); // -100 (défaite) à +100 (victoire)
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [matchStatus, setMatchStatus] = useState('PLAYING'); // 'PLAYING' | 'PAUSED' | 'VICTORY' | 'DEFEAT'
  const [particleEvent, setParticleEvent] = useState({ id: 0, type: 'emerald' });
  const [droppedLetters, setDroppedLetters] = useState([]);
  const [rivalStrikeAlert, setRivalStrikeAlert] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [stats, setStats] = useState({ perfect: 0, typo: 0, error: 0 });

  const inputRef = useRef(null);
  const currentWord = activeWords[currentWordIndex % activeWords.length] || DEFAULT_DUEL_WORDS[0];

  // Auto-focus constant sur la boîte de saisie
  useEffect(() => {
    if (matchStatus === 'PLAYING') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [currentWordIndex, matchStatus]);

  // Synchronisation du mute
  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      sound.setMuted(next);
      return next;
    });
  };

  // Simulation des attaques de l'adversaire (Bot réactif)
  useEffect(() => {
    if (matchStatus !== 'PLAYING') return;

    const interval = setInterval(() => {
      setBeamPos(prev => {
        const attackPower = 12 + Math.floor(Math.random() * 8);
        const nextPos = prev - attackPower;
        sound.playRivalStrike();

        if (nextPos <= -100) {
          setMatchStatus('DEFEAT');
          sound.playError();
          return -100;
        }
        return nextPos;
      });

      setRivalStrikeAlert(true);
      setTimeout(() => setRivalStrikeAlert(false), 500);
    }, 2800 + Math.random() * 1200);

    return () => clearInterval(interval);
  }, [matchStatus]);

  const handleSubmit = (e, explicitValue) => {
    e?.preventDefault();
    const valToUse = explicitValue !== undefined ? explicitValue : inputVal;
    if (!valToUse.trim() || matchStatus !== 'PLAYING') return;

    const evalResult = evaluateAnswer(valToUse, currentWord.answer);
    setInputVal('');

    if (evalResult.status === 'PERFECT') {
      sound.playSuccess();
      setStats(s => ({ ...s, perfect: s.perfect + 1 }));
      setParticleEvent({ id: Date.now(), type: 'emerald' });
      setDroppedLetters([]);

      setBeamPos(prev => {
        const nextPos = prev + 22;
        if (nextPos >= 100) {
          setMatchStatus('VICTORY');
          sound.playSuccess();
          return 100;
        }
        return nextPos;
      });
      setCurrentWordIndex(prev => prev + 1);

    } else if (evalResult.status === 'TYPO') {
      sound.playTypoWarning();
      setStats(s => ({ ...s, typo: s.typo + 1 }));
      setParticleEvent({ id: Date.now(), type: 'amber' });
      setDroppedLetters(evalResult.dropped || []);

      setBeamPos(prev => {
        const nextPos = prev + 12;
        if (nextPos >= 100) {
          setMatchStatus('VICTORY');
          sound.playSuccess();
          return 100;
        }
        return nextPos;
      });
      setCurrentWordIndex(prev => prev + 1);

    } else {
      sound.playError();
      setStats(s => ({ ...s, error: s.error + 1 }));
      setParticleEvent({ id: Date.now(), type: 'crimson' });
      setDroppedLetters([]);

      setBeamPos(prev => {
        const nextPos = prev - 15;
        if (nextPos <= -100) {
          setMatchStatus('DEFEAT');
          return -100;
        }
        return nextPos;
      });
    }
  };



  const handleRestartMatch = () => {
    setBeamPos(0);
    setCurrentWordIndex(0);
    setInputVal('');
    setStats({ perfect: 0, typo: 0, error: 0 });
    setMatchStatus('PLAYING');
    setDroppedLetters([]);
  };

  const handleFinish = (won) => {
    const pot = wager === 0 ? 10 : wager * 2;
    onEndMatch({
      won,
      coinsWon: won ? pot : -wager,
      xpWon: won ? 80 : 20,
      stats
    });
    onBackHome();
  };

  return (
    <div 
      style={{
        height: '100%',
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '0.5rem 0.75rem',
        background: 'radial-gradient(circle at 50% 20%, rgba(30, 41, 69, 0.6) 0%, #06080e 70%)',
        color: '#f1f5f9',
        fontFamily: "'Outfit', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {/* Canvas Particules 60fps */}
      <ParticleBurst trigger={particleEvent.id} type={particleEvent.type} />

      <div style={{ width: '100%', maxWidth: '640px', position: 'relative', zIndex: 10 }}>
        
        {/* En-tête de Duel (Joueur vs Adversaire & Contrôles) */}
        <div 
          className="glass-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.8rem',
            borderRadius: '16px',
            marginBottom: '0.4rem',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            background: 'rgba(18, 24, 38, 0.75)',
            backdropFilter: 'blur(20px)'
          }}
        >
          {/* Joueur Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'rgba(0, 242, 254, 0.2)',
                border: '1.5px solid rgba(0, 242, 254, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 900
              }}
            >
              {avatar}
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ffffff', display: 'block', lineHeight: 1.2 }}>
                {playerName}
              </span>
              <span style={{ fontSize: '0.7rem', fontFamily: "'JetBrains Mono', monospace", color: '#00f2fe', fontWeight: 700 }}>
                ⚡ Faisceau Cyan
              </span>
            </div>
          </div>

          {/* Pot & Contrôles Centraux */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div 
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '9999px',
                background: 'rgba(255, 190, 11, 0.15)',
                border: '1px solid rgba(255, 190, 11, 0.4)',
                fontSize: '0.8rem',
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 800,
                color: '#ffbe0b',
                boxShadow: '0 0 15px rgba(255, 190, 11, 0.2)'
              }}
            >
              🪙 {wager === 0 ? '10 🪙' : `${wager * 2} 🪙`}
            </div>

            {/* Bouton Pause */}
            <button
              type="button"
              onClick={() => setMatchStatus(prev => prev === 'PAUSED' ? 'PLAYING' : 'PAUSED')}
              style={{
                background: matchStatus === 'PAUSED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                transition: 'all 0.15s ease'
              }}
              title={matchStatus === 'PAUSED' ? "Reprendre la partie" : "Mettre en pause"}
            >
              {matchStatus === 'PAUSED' ? '▶' : '⏸'}
            </button>

            {/* Bouton Son Mute */}
            <button
              type="button"
              onClick={toggleMute}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: isMuted ? '#ef4444' : '#00f5d4',
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.9rem',
                transition: 'all 0.15s ease'
              }}
              title={isMuted ? "Activer le son" : "Couper le son"}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>

          {/* Adversaire Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textAlign: 'right' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fda4af', display: 'block', lineHeight: 1.2 }}>
                Valkyrie-AI
              </span>
              <span 
                style={{ 
                  fontSize: '0.7rem', 
                  fontFamily: "'JetBrains Mono', monospace", 
                  color: rivalStrikeAlert ? '#ff0055' : '#fb7185',
                  fontWeight: 800,
                  transition: 'color 0.2s ease'
                }}
              >
                {rivalStrikeAlert ? '⚡ ATTAQUE !' : 'Niv. 14 • Prêt'}
              </span>
            </div>
            <div 
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: rivalStrikeAlert ? 'rgba(255, 0, 85, 0.4)' : 'rgba(255, 0, 85, 0.2)',
                border: '1.5px solid rgba(255, 0, 85, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 900,
                transition: 'all 0.2s ease'
              }}
            >
              🤖
            </div>
          </div>
        </div>

        {/* Jauge du Tir à la Corde */}
        <TugOfWarBeam beamPosition={beamPos} />

        {/* Modale de Pause */}
        {matchStatus === 'PAUSED' && (
          <div 
            className="glass-panel"
            style={{
              marginTop: '1.5rem',
              padding: '2rem',
              borderRadius: '24px',
              border: '1.5px solid rgba(99, 102, 241, 0.5)',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(25px)',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
              animation: 'fadeIn 0.2s ease-out'
            }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⏸️</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
              PARTIE EN PAUSE
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
              Le rayon énergétique est suspendu. Que souhaites-tu faire ?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '320px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={() => setMatchStatus('PLAYING')}
                className="btn btn-primary"
                style={{
                  padding: '0.85rem',
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, #00f2fe 0%, #3b82f6 100%)',
                  color: '#000000',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ▶ REPRENDRE LE DUEL
              </button>

              <button
                type="button"
                onClick={handleRestartMatch}
                style={{
                  padding: '0.75rem',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f1f5f9',
                  cursor: 'pointer'
                }}
              >
                🔄 Recommencer le match
              </button>

              <button
                type="button"
                onClick={onBackHome}
                style={{
                  padding: '0.75rem',
                  borderRadius: '14px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  cursor: 'pointer'
                }}
              >
                🚪 Quitter vers le salon / menu
              </button>
            </div>
          </div>
        )}

        {/* Phase de Jeu Active wrapped in BattleCard */}
        {matchStatus === 'PLAYING' && (
          <BattleCard
            mode="tugofwar"
            isShaking={false}
            pauseSlot={null}
            timerSlot={
              <div style={{ fontSize: '0.9rem', color: '#00f2fe', fontWeight: 'bold' }}>
                Mot {currentWordIndex + 1}
              </div>
            }
            progressSlot={null}
            specialRuleSlot={
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#ffbe0b', fontWeight: 'bold' }}>{wager * 2} 🪙 POT</span>
              </div>
            }
          >
            <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', overflow: 'hidden', position: 'relative' }}>
              {/* Effet visuel des lettres erronées qui tombent */}
              <TypoFallingVFX dropped={droppedLetters} />

              <BattleConsole
                question={currentWord.question}
                inputValue={inputVal}
                onInputChange={setInputVal}
                onSubmit={handleSubmit}
                isDisabled={matchStatus !== 'PLAYING'}
                inputPlaceholder="Traduction en allemand..."
                inputRef={inputRef}
                theme="valkyrie"
              />
            </div>
          </BattleCard>
        )}

        {/* Modale Victoire */}
        {matchStatus === 'VICTORY' && (
          <div 
            className="glass-panel"
            style={{
              marginTop: '1.5rem',
              padding: '2.5rem 1.5rem',
              borderRadius: '28px',
              border: '2px solid #00f2fe',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(25px)',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(0, 242, 254, 0.4), 0 20px 50px rgba(0, 0, 0, 0.8)',
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>🏆⚡</div>
            <h2 
              style={{
                fontFamily: "'Syne', 'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: '2.4rem',
                color: '#00f2fe',
                margin: '0 0 0.5rem 0',
                textShadow: '0 0 25px rgba(0, 242, 254, 0.8)'
              }}
            >
              RAYON ÉCRASÉ ! VICTOIRE !
            </h2>
            <p style={{ fontSize: '1rem', color: '#e2e8f0', margin: '0.5rem 0 1.5rem 0' }}>
              Tu as submergé ton adversaire avec une vitesse de frappe chirurgicale !
            </p>

            <div 
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '1rem',
                margin: '1rem 0 1.8rem 0'
              }}
            >
              <div 
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '14px',
                  background: 'rgba(0, 245, 212, 0.15)',
                  border: '1px solid rgba(0, 245, 212, 0.4)',
                  fontSize: '0.9rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800,
                  color: '#00f5d4'
                }}
              >
                +80 XP GAGNÉS !
              </div>
              <div 
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '14px',
                  background: 'rgba(255, 190, 11, 0.15)',
                  border: '1px solid rgba(255, 190, 11, 0.4)',
                  fontSize: '0.9rem',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 800,
                  color: '#ffbe0b'
                }}
              >
                +{wager === 0 ? 10 : wager * 2} 🪙 POT REMPORTÉ
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', maxWidth: '380px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={handleRestartMatch}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                🔄 Rejouer
              </button>
              <button
                type="button"
                onClick={() => handleFinish(true)}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #00f2fe 0%, #00f5d4 100%)',
                  border: 'none',
                  color: '#000000',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 25px rgba(0, 242, 254, 0.6)'
                }}
              >
                Continuer →
              </button>
            </div>
          </div>
        )}

        {/* Modale Défaite */}
        {matchStatus === 'DEFEAT' && (
          <div 
            className="glass-panel"
            style={{
              marginTop: '1.5rem',
              padding: '2.5rem 1.5rem',
              borderRadius: '28px',
              border: '2px solid #ff0055',
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(25px)',
              textAlign: 'center',
              boxShadow: '0 0 60px rgba(255, 0, 85, 0.4), 0 20px 50px rgba(0, 0, 0, 0.8)',
              animation: 'fadeIn 0.25s ease-out'
            }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>💥</div>
            <h2 
              style={{
                fontFamily: "'Syne', 'Outfit', sans-serif",
                fontWeight: 900,
                fontSize: '2.4rem',
                color: '#ff0055',
                margin: '0 0 0.5rem 0',
                textShadow: '0 0 25px rgba(255, 0, 85, 0.8)'
              }}
            >
              Rayon Perdu...
            </h2>
            <p style={{ fontSize: '1rem', color: '#cbd5e1', margin: '0.5rem 0 1.5rem 0' }}>
              L'adversaire a pris le dessus. Récupère ton énergie et prends ta revanche !
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', maxWidth: '380px', margin: '0 auto' }}>
              <button
                type="button"
                onClick={handleRestartMatch}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #ff0055 0%, #ec4899 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 0 25px rgba(255, 0, 85, 0.5)'
                }}
              >
                ⚡ Revanche Immédiate
              </button>
              <button
                type="button"
                onClick={() => handleFinish(false)}
                style={{
                  flex: 1,
                  padding: '0.85rem',
                  borderRadius: '16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#cbd5e1',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer'
                }}
              >
                Retour
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Virtual Keyboard (Hidden on Desktop, Visible on Mobile via CSS) */}
      <VirtualKeyboard isHidden={matchStatus === 'PAUSED'} />
    </div>
  );
};

// Also export as MultiplayerArena alias for direct compatibility
export const MultiplayerArena = TugOfWarArena;
export default TugOfWarArena;
