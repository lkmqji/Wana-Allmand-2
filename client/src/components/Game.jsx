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

  const playAudio = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'de-DE'; // German
    window.speechSynthesis.speak(utterance);
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
      // Jouer le mot en allemand automatiquement
      if (result.correctAnswer) {
        playAudio(result.correctAnswer);
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
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', padding: '0.5rem', position: 'relative' }}>
      {/* Terminate Requested Modal */}
      {terminateRequested && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
            <h2>⚠️ Arrêt demandé</h2>
            <p style={{ margin: '1rem 0' }}>L'autre joueur souhaite arrêter la partie en cours.</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handleAcceptTerminate} className="btn btn-primary" style={{ background: 'var(--danger)' }}>Accepter</button>
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
        style={{ position: 'absolute', top: '-10px', left: '10px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem', zIndex: 10 }}
      >
        🚪 Quitter la partie
      </button>

      {/* Scoreboard Header */}
      <div className="score-board glass-panel" style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
        {Object.values(players).map((p, i) => {
          const isLeader = p.id === leaderId;
          const isOvertaking = p.id === overtakerId;
          return (
            <div 
              key={p.id} 
              className={`player-score ${isOvertaking ? 'leader-overtake' : ''}`} 
              style={{ color: p.id === socket.id ? 'var(--primary)' : 'white' }}
            >
              {isLeader && <div className="leader-crown">👑</div>}
              <div className="name">{p.name} {p.id === socket.id ? '(Vous)' : ''}</div>
              <div className="score">{p.score}</div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ textAlign: 'center', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)' }}>
          {questionIndex + 1} / {totalQuestions}
        </div>
        
        <h2 style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          Traduisez en allemand :
        </h2>
        
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'white' }}>
          {question || 'Chargement...'}
        </h1>

        {!roundResult ? (
          <>
            <div className={`timer ${timeRemaining < 5 ? 'danger' : ''}`} style={{ fontSize: '3rem', margin: '1rem 0' }}>
              {Math.ceil(timeRemaining)}s
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <button 
                onClick={handleUseJoker} 
                disabled={jokers <= 0 || hasAnswered || jokerHint} 
                className="btn" 
                style={{ background: 'var(--warning)', color: 'white', padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                💡 Joker ({jokers} restants)
              </button>
              {jokerHint && <div style={{ marginTop: '0.5rem', color: 'var(--warning)', fontSize: '1.2rem', fontWeight: 'bold' }}>Indice : {jokerHint}</div>}
            </div>

            {isFrozen && (
              <div style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--text-light)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #38bdf8' }}>
                🥶 <strong>Vous êtes gelé !</strong> Votre adversaire a répondu juste 3 fois de suite !
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ marginTop: 'auto' }}>
              <input
                ref={inputRef}
                type="text"
                className="input-field"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={isFrozen ? "GELÉ..." : "Ex: der Tisch"}
                disabled={hasAnswered || isFrozen}
                style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: '0.5rem', padding: '0.75rem', borderColor: isFrozen ? '#38bdf8' : '' }}
                autoComplete="off"
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem' }}
                disabled={hasAnswered || !answer.trim() || isFrozen}
              >
                {hasAnswered ? 'En attente...' : 'Valider'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ padding: '1rem 0', animation: 'fadeIn 0.5s ease-out' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem', position: 'relative' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>La bonne réponse était :</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                <h2 style={{ fontSize: '2rem', margin: 0 }}>{roundResult.correctAnswer}</h2>
                <button onClick={() => playAudio(roundResult.correctAnswer)} style={{ background: 'var(--primary)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
                  🔊
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.values(roundResult.players).map(p => {
                const playerAns = p.answers[questionIndex];
                const isCorrect = playerAns?.score >= 100;
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          {renderDiff(roundResult.correctAnswer, playerAns?.answer, isCorrect, playerAns?.isTypo)}
                        </span>
                        {playerAns && (
                          <span style={{ fontSize: '0.9rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                            +{playerAns.score} pts
                          </span>
                        )}
                      </div>
                      {playerAns?.isTypo && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: '2px' }}>Faute de frappe tolérée</div>
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
