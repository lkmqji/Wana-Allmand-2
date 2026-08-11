import { useState, useEffect, useRef } from 'react';

export default function Game({ socket, session }) {
  const [question, setQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answer, setAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [roundResult, setRoundResult] = useState(null); // { players: {}, correctAnswer: '' }
  const [players, setPlayers] = useState(session.players || {});
  
  const [leaderId, setLeaderId] = useState(null);
  const [overtakerId, setOvertakerId] = useState(null);
  
  const inputRef = useRef(null);

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
      setRoundResult(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    });

    socket.on('round_results', (data) => {
      setRoundResult(data);
      setPlayers(data.players);
    });

    return () => {
      socket.off('new_question');
      socket.off('round_results');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    submitAnswer();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', height: '100%', padding: '0.5rem' }}>
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

            <form onSubmit={handleSubmit} style={{ marginTop: 'auto' }}>
              <input
                ref={inputRef}
                type="text"
                className="input-field"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Ex: der Tisch"
                disabled={hasAnswered}
                style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: '0.5rem', padding: '0.75rem' }}
                autoComplete="off"
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem' }}
                disabled={hasAnswered || !answer.trim()}
              >
                {hasAnswered ? 'En attente...' : 'Valider'}
              </button>
            </form>
          </>
        ) : (
          <div style={{ padding: '1rem 0', animation: 'fadeIn 0.5s ease-out' }}>
            <h3 style={{ color: 'var(--success)', marginBottom: '0.5rem', fontSize: '1.5rem' }}>Temps écoulé !</h3>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>La bonne réponse était :</p>
              <h2 style={{ fontSize: '2rem', margin: 0 }}>{roundResult.correctAnswer}</h2>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.values(roundResult.players).map(p => {
                const playerAns = p.answers[questionIndex];
                const isCorrect = playerAns?.score >= 100;
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                    <span style={{ fontWeight: 'bold' }}>{p.name}</span>
                    <span style={{ color: isCorrect ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
                      {playerAns?.answer || '(Aucune réponse)'}
                    </span>
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
