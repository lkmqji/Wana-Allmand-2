export default function Results({ players, setView }) {
  const playerArr = Object.values(players).sort((a, b) => b.score - a.score);
  const winner = playerArr[0];
  const isDraw = playerArr.length > 1 && playerArr[0].score === playerArr[1].score;

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

      <button className="btn btn-primary" onClick={() => setView('home')} style={{ width: '100%' }}>
        Retour à l'accueil
      </button>
    </div>
  );
}
