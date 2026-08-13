export default function Lobby({ socket, session, players, isHost, setView }) {
  const playerCount = Object.keys(players).length;
  
  const handleLeave = () => {
    socket.emit('leave_session', session.id);
    setView('home');
  };
  
  const handleStart = () => {
    socket.emit('start_game', session.id);
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
        <button 
          onClick={handleLeave}
          className="btn btn-secondary"
          style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
        >
          ← Retour
        </button>
        <h2 style={{ fontSize: '1.8rem', margin: 0, flex: 1, textAlign: 'center' }}>Salle d'attente</h2>
        <div style={{ width: '80px' }}></div> {/* Spacer to balance the back button */}
      </div>
      
      <div style={{ margin: '2rem 0', padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '16px' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Code de session</p>
        <h1 style={{ fontSize: 'clamp(2.5rem, 8vw, 4rem)', letterSpacing: '0.2em', margin: 0, color: 'var(--primary)' }}>
          {session.id}
        </h1>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Joueurs connectés ({playerCount}/2)</h3>
        <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          {Object.values(players).map((p, i) => (
            <div key={p.id} style={{ 
              padding: '1rem 2rem', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '12px',
              border: `2px solid ${i === 0 ? 'var(--primary)' : 'var(--secondary)'}`,
              position: 'relative'
            }}>
              {p.name} {p.id === socket.id ? '(Vous)' : ''}
              {isHost && p.id !== socket.id && (
                <button
                  onClick={() => socket.emit('kick_player', { sessionId: session.id, playerId: p.id })}
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '-10px',
                    background: 'var(--danger)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}
                  title="Expulser"
                >
                  ✕
                </button>
              )}
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
