import { useState, useEffect, useRef } from 'react';

export default function Game({ socket, session }) {
  const [question, setQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(session?.settings?.rounds || 0);
  const [timeRemaining, setTimeRemaining] = useState(15);
  const [answer, setAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [roundResult, setRoundResult] = useState(null); // { players: {}, correctAnswer: '' }
  const [players, setPlayers] = useState(session.players || {});
  
  const [jokers, setJokers] = useState(2);
  const [jokerHint, setJokerHint] = useState('');
  const [isFrozen, setIsFrozen] = useState(false);
  const [terminateRequested, setTerminateRequested] = useState(false);
  const [terminateRefused, setTerminateRefused] = useState(false);

  const [leaderId, setLeaderId] = useState(null);
  const [overtakerId, setOvertakerId] = useState(null);
  
  const inputRef = useRef(null);

  const [flashEffect, setFlashEffect] = useState(null); // 'success' | 'error' | null

  useEffect(() => {
    // Le layout modifié suffit à empêcher les éléments de sauter (utilisation de display: block et marges fixes au lieu du flex centré).
    // Plus besoin de modifier le body, ce qui causait un écran blanc.
  }, []);

  const playAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE'; // German
    window.speechSynthesis.speak(utterance);
  };

  const playFeedbackSound = (isSuccess) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      if (isSuccess) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let interval;
    if (timeRemaining > 0 && !hasAnswered && !roundResult) {
      interval = setInterval(() => {
        setTimeRemaining(t => {
          if (t <= 0.1) {
            clearInterval(interval);
            // Auto submit if time runs out
            submitAnswer('');
            return 0;
          }
          return t - 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [timeRemaining, hasAnswered, roundResult]);

  useEffect(() => {
    let maxScore = -1;
    let currentLeader = null;
    let tie = false;

    Object.values(players).forEach(p => {
      if (p.score > maxScore) {
        maxScore = p.score;
        currentLeader = p.id;
        tie = false;
      } else if (p.score === maxScore && maxScore > 0) {
        tie = true;
      }
    });

    if (maxScore === 0) currentLeader = null;
    if (tie) currentLeader = null;

    if (currentLeader && leaderId !== currentLeader) {
      if (leaderId !== null) {
        setOvertakerId(currentLeader);
        setTimeout(() => setOvertakerId(null), 1500);
      }
      setLeaderId(currentLeader);
    }
  }, [players, leaderId]);

  useEffect(() => {
    socket.on('new_question', (data) => {
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setTimeRemaining(data.duration);
      setAnswer('');
      setHasAnswered(false);
      setJokerHint('');
      setRoundResult(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    });

    socket.on('round_results', (result) => {
      setHasAnswered(true);
      setRoundResult(result);
      setPlayers(result.players);
      
      // Check success for sound and visual flash
      const myPlayer = result.players[socket.id];
      if (myPlayer) {
        // the last answer is at questionIndex (since questionIndex hasn't updated yet)
        // Wait, questionIndex from state is the current one
        setQuestionIndex(prevIndex => {
            const myAns = myPlayer.answers[prevIndex];
            if (myAns) {
                const isSuccess = myAns.score >= 50; // Typo or perfect
                setFlashEffect(isSuccess ? 'success' : 'error');
                playFeedbackSound(isSuccess);
                setTimeout(() => setFlashEffect(null), 1000);
            }
            return prevIndex;
        });
      }

      // Jouer le mot en allemand automatiquement
      if (result.correctAnswer) {
        setTimeout(() => playAudio(result.correctAnswer), 500); // delay audio slightly after beep
      }
    });

    socket.on('joker_result', (hint) => {
      setJokerHint(hint);
    });

    socket.on('powerup_frozen', (durationSeconds) => {
      setIsFrozen(true);
      setTimeout(() => setIsFrozen(false), durationSeconds * 1000);
    });

    socket.on('terminate_requested', () => {
      setTerminateRequested(true);
    });

    socket.on('terminate_refused', () => {
      setTerminateRefused(true);
      setTimeout(() => setTerminateRefused(false), 3000);
    });

    return () => {
      socket.off('new_question');
      socket.off('round_results');
      socket.off('joker_result');
      socket.off('powerup_frozen');
      socket.off('terminate_requested');
      socket.off('terminate_refused');
    };
  }, [socket]);

  const submitAnswer = (ans = answer) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    socket.emit('submit_answer', {
      sessionId: session.id,
      answer: ans,
      timeRemaining
    });
  };

  const handleUseJoker = () => {
    if (jokers > 0 && !hasAnswered) {
      setJokers(j => j - 1);
      socket.emit('use_joker', session.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitAnswer();
  };

  const renderDiff = (expected, actual, isCorrect, isTypo) => {
    if (!actual) return <span style={{ color: 'var(--danger)' }}>(Aucune réponse)</span>;
    if (isCorrect || isTypo) return <span style={{ color: 'var(--success)' }}>{actual}</span>;
    
    let matchCount = 0;
    for(let i=0; i<Math.min(expected.length, actual.length); i++) {
      if(expected[i].toLowerCase() === actual[i].toLowerCase()) matchCount++;
    }
    if (matchCount < expected.length / 3) {
      return <span style={{ color: 'var(--danger)' }}>{actual}</span>;
    }
    
    return (
      <span>
        {actual.split('').map((char, i) => {
          const isMatch = expected[i] && expected[i].toLowerCase() === char.toLowerCase();
          return <span key={i} style={{ color: isMatch ? 'var(--text-light)' : 'var(--danger)' }}>{char}</span>;
        })}
      </span>
    );
  };

  const handleRequestTerminate = () => {
    if (window.confirm('Voulez-vous vraiment demander l\'arrêt de la partie ?')) {
      socket.emit('request_terminate', session.id);
    }
  };

  const handleAcceptTerminate = () => {
    socket.emit('accept_terminate', session.id);
    setTerminateRequested(false);
  };

  const handleRefuseTerminate = () => {
    socket.emit('refuse_terminate', session.id);
    setTerminateRequested(false);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', flex: 1 }}>
      
      {/* Flash Effect Overlay */}
      {flashEffect && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          backgroundColor: flashEffect === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          zIndex: 9999,
          animation: 'fadeOut 1s forwards'
        }} />
      )}
      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>

      {/* Terminate Requested Modal */}
      {terminateRequested && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>⚠️ Arrêt demandé</h2>
            <p style={{ margin: '1rem 0' }}>L'autre joueur souhaite arrêter la partie en cours.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handleAcceptTerminate} className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>Accepter</button>
              <button onClick={handleRefuseTerminate} className="btn btn-secondary">Refuser</button>
            </div>
          </div>
        </div>
      )}

      {/* Terminate Refused Toast */}
      {terminateRefused && (
        <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', background: 'var(--danger)', padding: '0.5rem 1rem', borderRadius: '8px', zIndex: 50, color: 'white' }}>
          L'adversaire a refusé l'arrêt de la partie.
        </div>
      )}

      {/* Bouton Quitter */}
      <button 
        onClick={handleRequestTerminate}
        style={{ 
          position: 'absolute', 
          top: '1rem', 
          left: '1rem', 
          background: 'var(--bg-main)', 
          border: '2px solid var(--border-color)', 
          color: 'var(--text-muted)', 
          cursor: 'pointer', 
          zIndex: 10,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'all 0.2s'
        }}
        title="Quitter la partie"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
          <polyline points="16 17 21 12 16 7"></polyline>
          <line x1="21" y1="12" x2="9" y2="12"></line>
        </svg>
      </button>

      {/* Scoreboard Header */}
      <div className="score-board card" style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
        {Object.values(players).map((p, i) => {
          const isLeader = p.id === leaderId;
          const isOvertaking = p.id === overtakerId;
          return (
            <div 
              key={p.id} 
              className={`player-score ${isOvertaking ? 'leader-overtake' : ''}`} 
              style={{ color: p.id === socket.id ? 'var(--primary)' : 'var(--text-main)' }}
            >
              {isLeader && <div className="leader-crown">👑</div>}
              <div className="name">{p.name} {p.id === socket.id ? '(Vous)' : ''}</div>
              <div className="score">{p.score}</div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ textAlign: 'center', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '1.5rem', marginTop: '1rem', minHeight: '380px' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)' }}>
          {questionIndex + 1} / {totalQuestions}
        </div>

        {!roundResult && (
          <div className={`timer ${timeRemaining < 5 ? 'danger' : ''}`} style={{ position: 'absolute', top: '1rem', left: '1rem', fontSize: '1.2rem', fontWeight: 'bold', margin: 0, color: timeRemaining < 5 ? 'var(--danger)' : 'var(--warning)' }}>
            ⏳ {Math.ceil(timeRemaining)}s
          </div>
        )}
        
        {/* EN HAUT : Le nom en fr/ang */}
        <div style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
            Traduisez en allemand :
          </h2>
          <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', marginBottom: '0', color: 'var(--text-main)', wordBreak: 'break-word' }}>
            {question || 'Chargement...'}
          </h1>
        </div>

        {!roundResult ? (
          <div style={{ display: 'block', marginTop: '2.5rem' }}>
            {/* AU MILIEU : Champ de saisie avec flèche */}
            <form onSubmit={handleSubmit} style={{ margin: '0 auto 1.5rem auto', width: '100%', maxWidth: '400px', position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                className="input-field"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={isFrozen ? "GELÉ..." : "Ex: der Tisch"}
                disabled={hasAnswered || isFrozen}
                style={{ 
                  textAlign: 'left', 
                  fontSize: '1.25rem', 
                  padding: '1rem 3.5rem 1rem 1.5rem', 
                  borderRadius: '30px',
                  borderColor: isFrozen ? '#38bdf8' : 'var(--border-color)',
                  width: '100%',
                }}
                autoComplete="off"
              />
              <button 
                type="submit" 
                style={{ 
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 0,
                  background: 'var(--primary)',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: (hasAnswered || !answer.trim() || isFrozen) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  flexShrink: 0,
                }}
                disabled={hasAnswered || !answer.trim() || isFrozen}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </button>
            </form>

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                onClick={handleUseJoker} 
                disabled={jokers <= 0 || hasAnswered || jokerHint} 
                style={{ 
                  background: 'var(--warning)', 
                  color: 'white', 
                  border: 'none',
                  width: '44px', 
                  height: '44px', 
                  borderRadius: '50%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  cursor: 'pointer',
                  opacity: (jokers <= 0 || hasAnswered || jokerHint) ? 0.5 : 1,
                  boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
                }}
                title="Utiliser un Joker"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18h6"></path>
                  <path d="M10 22h4"></path>
                  <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .34 2.02 1.5 3.5.76.76 1.23 1.52 1.41 2.5"></path>
                </svg>
              </button>
              <span style={{ 
                position: 'absolute', 
                top: '-5px', 
                right: '-5px', 
                background: 'var(--danger)', 
                color: 'white',
                fontSize: '0.75rem', 
                fontWeight: 'bold',
                width: '20px',
                height: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius: '50%',
                border: '2px solid var(--bg-main)'
              }}>
                {jokers}
              </span>
              {jokerHint && <div style={{ marginTop: '0.75rem', color: 'var(--warning)', fontSize: '1.1rem', fontWeight: 'bold' }}>Indice : {jokerHint}</div>}
            </div>

            {isFrozen && (
              <div style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #38bdf8', fontSize: '0.9rem' }}>
                🥶 <strong>GELÉ !</strong> L'adversaire a répondu juste 3 fois de suite !
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '1rem 0', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ background: 'var(--bg-main)', border: '2px solid var(--border-color)', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem', position: 'relative' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>La bonne réponse était :</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-main)' }}>{roundResult.correctAnswer}</h2>
                <button onClick={() => playAudio(roundResult.correctAnswer)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
                  🔊
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.values(roundResult.players).map(p => {
                const playerAns = p.answers[questionIndex];
                const isCorrect = playerAns?.score >= 100;
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: '12px', border: '2px solid var(--border-color)', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{p.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          {renderDiff(roundResult.correctAnswer, playerAns?.answer, isCorrect, playerAns?.isTypo)}
                        </span>
                        {playerAns && (
                          <span style={{ fontSize: '1rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                            +{playerAns.score} pts
                          </span>
                        )}
                      </div>
                      {playerAns?.isTypo && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '2px' }}>Faute de frappe tolérée</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Prochaine question imminente...</p>
          </div>
        )}
      </div>
    </div>
  );
}
