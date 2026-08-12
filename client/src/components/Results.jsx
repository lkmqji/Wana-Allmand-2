import { useEffect } from 'react';
import confetti from 'canvas-confetti';

export default function Results({ players, setView, socket, session }) {
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
            padding: '1.5rem 2rem',
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

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button className="btn btn-secondary" onClick={() => setView('home')} style={{ flex: 1 }}>
          Accueil
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
  );
}
