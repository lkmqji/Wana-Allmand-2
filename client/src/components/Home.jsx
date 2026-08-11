import { useState } from 'react';

export default function Home({ socket }) {
  const [joinCode, setJoinCode] = useState('');
  const [isUploading, setIsUploading] = useState(false);

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
        socket.emit('create_session', data.vocabList);
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
      socket.emit('join_session', joinCode.toUpperCase());
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1 className="title">VokabelDuell</h1>
      <p className="subtitle">L'application de compétition de vocabulaire allemand</p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '2rem', borderRadius: '16px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Créer une session</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Uploadez un PDF de vocabulaire pour générer l'exercice.</p>
          <label className="btn btn-primary" style={{ width: '100%', cursor: isUploading ? 'wait' : 'pointer' }}>
            {isUploading ? 'Analyse...' : 'Upload PDF'}
            <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
          </label>
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
      </div>
    </div>
  );
}
