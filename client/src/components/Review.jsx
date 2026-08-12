import { useState } from 'react';

export default function Review({ vocabList, onCreateSession, user }) {
  const [words, setWords] = useState(vocabList);
  const [rounds, setRounds] = useState(Math.min(20, vocabList.length));
  const [timePerWord, setTimePerWord] = useState(15);
  const [powerupsEnabled, setPowerupsEnabled] = useState(true);
  const [listName, setListName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleEdit = (id, field, value) => {
    setWords(words.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleDelete = (id) => {
    const updated = words.filter(w => w.id !== id);
    setWords(updated);
    if (rounds > updated.length) setRounds(updated.length);
  };

  const handleAdd = () => {
    const newId = words.length > 0 ? Math.max(...words.map(w => w.id)) + 1 : 1;
    setWords([...words, { id: newId, question: '', answer: '' }]);
  };

  const handleStart = () => {
    const validWords = words.filter(w => w.question.trim() && w.answer.trim());
    if (validWords.length === 0) return alert("La liste est vide !");
    
    onCreateSession(validWords, { rounds, timePerWord, powerupsEnabled });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!listName.trim()) return alert("Veuillez entrer un nom pour cette liste.");
    const validWords = words.filter(w => w.question.trim() && w.answer.trim());
    if (validWords.length === 0) return alert("La liste est vide !");

    setIsSaving(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          name: listName,
          words: validWords
        })
      });
      if (res.ok) {
        alert("Liste sauvegardée avec succès !");
      } else {
        alert("Erreur lors de la sauvegarde.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '1rem', textAlign: 'center' }}>Vérification de la liste</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Vous pouvez corriger, supprimer ou ajouter des mots avant de lancer la partie.
      </p>

      {/* Paramètres de jeu */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Mots par partie (Rounds)</label>
          <input 
            type="number" 
            className="input-field" 
            value={rounds} 
            onChange={(e) => setRounds(Math.min(words.length, Math.max(1, parseInt(e.target.value) || 1)))} 
            min="1" 
            max={words.length}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Temps par mot (secondes)</label>
          <select className="input-field" value={timePerWord} onChange={(e) => setTimePerWord(parseInt(e.target.value))}>
            <option value={10}>10 secondes (Rapide)</option>
            <option value={15}>15 secondes (Normal)</option>
            <option value={20}>20 secondes (Débutant)</option>
            <option value={30}>30 secondes (Lent)</option>
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Pouvoirs (Glace 🥶)</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={powerupsEnabled} 
              onChange={(e) => setPowerupsEnabled(e.target.checked)}
              style={{ width: '20px', height: '20px' }}
            />
            <span style={{ color: powerupsEnabled ? 'var(--success)' : 'var(--text-muted)' }}>
              {powerupsEnabled ? 'Activé' : 'Désactivé'}
            </span>
          </label>
        </div>
      </div>

      {/* Tableau des mots */}
      <div style={{ overflowY: 'auto', flex: 1, marginBottom: '2rem', paddingRight: '0.5rem' }}>
        {words.map((word, index) => (
          <div key={word.id} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', width: '20px' }}>{index + 1}</span>
            <input
              type="text"
              className="input-field"
              value={word.question}
              onChange={(e) => handleEdit(word.id, 'question', e.target.value)}
              placeholder="Français"
              style={{ flex: 1, padding: '0.75rem' }}
            />
            <input
              type="text"
              className="input-field"
              value={word.answer}
              onChange={(e) => handleEdit(word.id, 'answer', e.target.value)}
              placeholder="Allemand"
              style={{ flex: 1, padding: '0.75rem' }}
            />
            <button onClick={() => handleDelete(word.id)} style={{ background: 'var(--danger)', color: 'white', border: 'none', padding: '0.75rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>
              X
            </button>
          </div>
        ))}
        
        <button onClick={handleAdd} style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.1)', border: '1px dashed var(--glass-border)', color: 'white', borderRadius: '12px', cursor: 'pointer', marginTop: '1rem' }}>
          + Ajouter un mot
        </button>
      </div>

      {user && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Nom de la liste (ex: Chapitre 1)" 
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button 
            className="btn btn-secondary" 
            onClick={handleSave} 
            disabled={isSaving || !listName.trim()}
          >
            {isSaving ? 'Sauvegarde...' : '💾 Archiver'}
          </button>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleStart} style={{ width: '100%', fontSize: '1.25rem' }}>
        Créer la Session
      </button>
    </div>
  );
}
