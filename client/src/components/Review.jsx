import { useState } from 'react';

export default function Review({ vocabList, onCreateSession, user, setView, editingListInfo }) {
  const [words, setWords] = useState(vocabList);
  const [rounds, setRounds] = useState(Math.min(20, vocabList.length));
  const [timePerWord, setTimePerWord] = useState(15);
  const [powerupsEnabled, setPowerupsEnabled] = useState(false);
  const [listName, setListName] = useState(editingListInfo?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState('words'); // 'words' or 'settings'
  const isEditing = !!(editingListInfo?.id);
  const isMerge = editingListInfo?.id === null && editingListInfo?.name;

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
      // If editing an existing list, use PUT; otherwise POST a new one
      const url = isEditing ? `${API_URL}/api/lists/${editingListInfo.id}` : `${API_URL}/api/lists`;
      const method = isEditing ? 'PUT' : 'POST';
      const body = isEditing
        ? JSON.stringify({ name: listName, words: validWords })
        : JSON.stringify({ userId: user.uid, name: listName, words: validWords });

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (res.ok) {
        alert(isEditing ? 'Liste mise à jour avec succès !' : 'Liste sauvegardée avec succès !');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Erreur : ${errData.error || res.statusText}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Erreur : ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {step === 'words' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            <button 
              onClick={() => setView('home')}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              ← Retour
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <h2 style={{ fontSize: '1.8rem', margin: 0 }}>
                {isEditing ? 'Modifier la liste' : isMerge ? 'Fusion de listes' : 'Vérification de la liste'}
              </h2>
              {(isEditing || isMerge) && (
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', padding: '0.1rem 0.6rem', borderRadius: '20px' }}>
                  {isEditing ? `✏️ Édition : ${editingListInfo.name}` : `🔄 Fusion`}
                </span>
              )}
            </div>
            <div style={{ width: '80px' }}></div>
          </div>
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Vous pouvez corriger, supprimer ou ajouter des mots avant de configurer la partie.
          </p>



          {/* Tableau des mots */}
          <div style={{ overflowY: 'auto', flex: 1, marginBottom: '2rem', paddingRight: '0.5rem' }}>
            {words.map((word, index) => (
              <div key={word.id} className="mobile-stack" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
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
            <div className="mobile-stack" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder={isEditing ? 'Nom de la liste' : 'Nom de la liste (ex: Chapitre 1)'}
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                className="btn btn-secondary" 
                onClick={handleSave} 
                disabled={isSaving || !listName.trim()}
              >
                {isSaving ? 'En cours...' : isEditing ? '💾 Mettre à jour' : isMerge ? '💾 Sauvegarder la fusion' : '💾 Archiver'}
              </button>
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={() => {
              const validWords = words.filter(w => w.question.trim() && w.answer.trim());
              if (validWords.length === 0) return alert("La liste est vide !");
              setStep('settings');
            }} 
            style={{ width: '100%', fontSize: '1.25rem', padding: '1rem' }}
          >
            Continuer vers les paramètres ➡️
          </button>
        </>
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
            <button 
              onClick={() => setStep('words')}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
            >
              ← Mots
            </button>
            <h2 style={{ fontSize: '1.8rem', margin: 0, flex: 1, textAlign: 'center' }}>Paramètres du Duel</h2>
            <div style={{ width: '80px' }}></div>
          </div>
          
          <div className="mobile-stack" style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px' }}>
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

          <div style={{ flex: 1 }}></div>

          <button className="btn btn-primary" onClick={handleStart} style={{ width: '100%', fontSize: '1.25rem', padding: '1rem' }}>
            🚀 Créer la Session
          </button>
        </>
      )}
    </div>
  );
}
