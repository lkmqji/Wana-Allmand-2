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
          return <span key={i} style={{ color: isMatch ? 'var(--text-main)' : 'var(--danger)' }}>{char}</span>;
        })}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center' }}>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
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
              padding: '1.5rem',
              background: i === 0 && !isDraw ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-main)',
              borderRadius: '16px',
              border: `2px solid ${i === 0 && !isDraw ? 'var(--success)' : 'var(--border-color)'}`
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                {i === 0 ? '🥇' : '🥈'} {p.name}
              </span>
              <span style={{ fontSize: '2.5rem', fontWeight: '800', color: i === 0 && !isDraw ? 'var(--success)' : 'var(--primary)' }}>
                {p.score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>pts</span>
              </span>
            </div>
          ))}
        </div>

        <div className="mobile-stack" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
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
            style={{ flex: 1.5, borderColor: 'var(--danger)', color: 'var(--danger)' }}
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
      </div>

      {/* Résumé de la partie */}
      {session && session.vocabList && (
        <div className="card" style={{ textAlign: 'left' }}>
          <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem' }}>📝 Résumé de la partie</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {session.vocabList.slice(0, session.currentQuestionIndex || session.vocabList.length).map((word, index) => (
              <div key={index} style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '12px', border: '2px solid var(--border-color)' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-main)' }}>{word.question}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>👉 {word.answer}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed var(--border-color)' }}>
                  {Object.values(players).map(p => {
                    const ans = p.answers[index];
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{p.name} :</span>
                        <span style={{ fontWeight: 'bold' }}>
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
