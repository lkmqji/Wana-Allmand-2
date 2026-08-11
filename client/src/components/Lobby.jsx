export default function Lobby({ socket, session, players, isHost }) {
  const playerCount = Object.keys(players).length;
  
  const handleStart = () => {
    socket.emit('start_game', session.id);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Salle d'attente</h2>
      
      <div style={{ margin: '2rem 0', padding: '2rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Code de session</p>
        <h1 style={{ fontSize: '4rem', letterSpacing: '0.2em', margin: 0, color: 'var(--primary)' }}>
          {session.id}
        </h1>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Joueurs connectés ({playerCount}/2)</h3>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
          {Object.values(players).map((p, i) => (
            <div key={p.id} style={{ 
              padding: '1rem 2rem', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '12px',
              border: `2px solid ${i === 0 ? 'var(--primary)' : 'var(--secondary)'}`
            }}>
              {p.name} {p.id === socket.id ? '(Vous)' : ''}
            </div>
          ))}
        </div>
      </div>

      {isHost ? (
        <button 
          className="btn btn-primary" 
          onClick={handleStart} 
          style={{ width: '100%', fontSize: '1.25rem' }}
        >
          {playerCount === 1 ? 'Jouer en Solo' : 'Démarrer la partie !'}
        </button>
      ) : (
        <div style={{ padding: '1rem', color: 'var(--warning)' }}>
          En attente de l'hôte pour démarrer...
        </div>
      )}
    </div>
  );
}
