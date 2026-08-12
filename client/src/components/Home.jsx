import { useState, useEffect } from 'react';

export default function Home({ socket, setVocabListForReview, playerName, setPlayerName, avatar, setAvatar, user, loginWithGoogle, logout }) {
  const [joinCode, setJoinCode] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [archivedLists, setArchivedLists] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  
  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Fetch leaderboard
    fetch(`${API_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(console.error);

    if (user) {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      fetch(`${API_URL}/api/lists/${user.uid}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) setArchivedLists(data);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.vocabList) {
        setVocabListForReview(data.vocabList);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.length === 4) {
      const finalName = playerName ? `${avatar} ${playerName}` : `${avatar} Invité`;
      socket.emit('join_session', { sessionId: joinCode.toUpperCase(), playerName: finalName, firebaseId: user?.uid });
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="title" style={{ fontSize: '2.5rem', marginBottom: 0 }}>VokabelDuell</h1>
        {user ? (
          <button onClick={logout} className="btn" style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem' }}>Déconnexion</button>
        ) : (
          <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>Se connecter</button>
        )}
      </div>
      <p className="subtitle" style={{ marginTop: '0.5rem' }}>L'application de compétition de vocabulaire allemand</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Choix du pseudo */}
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Ton Pseudo et Avatar</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select 
              className="input-field" 
              value={avatar} 
              onChange={(e) => setAvatar(e.target.value)}
              style={{ padding: '0.75rem', fontSize: '1.5rem', cursor: 'pointer', flex: '0 0 auto' }}
            >
              <option value="🦊">🦊</option>
              <option value="🐼">🐼</option>
              <option value="🦁">🦁</option>
              <option value="🐸">🐸</option>
              <option value="🦄">🦄</option>
              <option value="😎">😎</option>
              <option value="👻">👻</option>
              <option value="👑">👑</option>
            </select>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ex: Wail..." 
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              style={{ width: '100%', padding: '0.75rem' }}
            />
          </div>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Créer une session</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Uploadez un PDF de vocabulaire pour générer l'exercice.</p>
          <label className="btn btn-primary" style={{ width: '100%', cursor: isUploading ? 'wait' : 'pointer' }}>
            {isUploading ? 'Analyse...' : 'Upload PDF'}
            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
          </label>

          {user && archivedLists.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Mes Archives</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {archivedLists.map(list => (
                  <button 
                    key={list._id} 
                    className="btn"
                    style={{ background: 'rgba(255,255,255,0.1)', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
                    onClick={() => setVocabListForReview(list.words)}
                  >
                    <span>{list.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{list.words.length} mots</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>OU</div>

        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Rejoindre une session</h2>
          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Code (ex: AB47)" 
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={4}
              style={{ flex: 1, textTransform: 'uppercase' }}
            />
            <button type="submit" className="btn btn-primary" disabled={joinCode.length !== 4}>
              Rejoindre
            </button>
          </form>
        </div>

        {/* Classement */}
        {leaderboard.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px' }}>
            <h2 style={{ marginBottom: '1rem' }}>🏆 Classement Mondial</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {leaderboard.map((u, i) => (
                <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {u.name} (Niv. {u.level})</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{u.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
