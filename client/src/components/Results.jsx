import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Results({ players, setView, socket, session, isHost, setVocabListForReview }) {
  const playerArr = Object.values(players).sort((a, b) => b.score - a.score);
  const winner = playerArr[0];
  const isDraw = playerArr.length > 1 && playerArr[0].score === playerArr[1].score;

  useEffect(() => {
    if (!isDraw) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6366f1', '#ec4899', '#10b981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#ec4899', '#10b981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isDraw]);

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

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 className="title" style={{ fontSize: '4rem', marginBottom: '1rem' }}>
        {isDraw ? 'Égalité !' : 'Partie Terminée !'}
      </h1>
      
      {!isDraw && (
        <h2 style={{ color: 'var(--success)', marginBottom: '3rem', fontSize: '2rem' }}>
          {winner.name} gagne avec {winner.score} pts 🏆
        </h2>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
        {playerArr.map((p, i) => (
          <div key={p.id} style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '1rem',
            background: i === 0 && !isDraw ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.1)',
            borderRadius: '12px',
            border: i === 0 && !isDraw ? '1px solid var(--success)' : 'none'
          }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {i === 0 ? '🥇' : '🥈'} {p.name}
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>
              {p.score} pts
            </span>
          </div>
        ))}
      </div>

      <div className="mobile-stack" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" onClick={() => setView('home')} style={{ flex: 1 }}>
          Accueil
        </button>
        {isHost && (
          <button className="btn btn-secondary" onClick={() => setView('review')} style={{ flex: 1 }}>
            Paramètres
          </button>
        )}
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            if (session && session.vocabList) {
              const failedWords = session.vocabList.slice(0, session.currentQuestionIndex || session.vocabList.length).filter((word, index) => {
                return Object.values(players).some(p => {
                  const ans = p.answers[index];
                  return !ans || ans.score < 100;
                });
              });
              if (failedWords.length > 0) {
                setVocabListForReview(failedWords);
                setView('review');
              } else {
                alert("Félicitations ! Aucun mot manqué dans cette partie 🎉");
              }
            }
          }} 
          style={{ flex: 1.5, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }}
        >
          🎯 Pratiquer les mots faux
        </button>
        <button 
          className="btn btn-primary" 
          onClick={() => {
            if(session) socket.emit('rematch', session.id);
            else alert("Revanche indisponible pour le moment.");
          }} 
          style={{ flex: 2 }}
        >
          🔄 Revanche !
        </button>
      </div>

      {/* Résumé de la partie */}
      {session && session.vocabList && (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px', textAlign: 'left' }}>
          <h3 style={{ marginBottom: '1.5rem', textAlign: 'center' }}>📝 Résumé de la partie</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {session.vocabList.slice(0, session.currentQuestionIndex || session.vocabList.length).map((word, index) => (
              <div key={index} style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{word.question}</span>
                  <span style={{ color: 'var(--text-muted)' }}>👉 {word.answer}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem', paddingLeft: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                  {Object.values(players).map(p => {
                    const ans = p.answers[index];
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>{p.name} :</span>
                        <span>
                          {ans ? renderDiff(ans.expected, ans.answer, ans.score >= 100, ans.isTypo) : <span style={{ color: 'var(--danger)' }}>(Non répondu)</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
