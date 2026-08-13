import { useState, useEffect } from 'react';

export default function Home({ socket, setVocabListForReview, setEditingListInfo, playerName, setPlayerName, avatar, setAvatar, user, loginWithGoogle, logout, deleteAccount, activeTab, leaderboard }) {
  const [mainStep, setMainStep] = useState(1); // 1 = Prepare, 2 = Join
  const [prepTab, setPrepTab] = useState('pdf'); // 'pdf', 'text', 'examples', 'settings'
  const [joinCode, setJoinCode] = useState('');
  const [rawText, setRawText] = useState('la table = der Tisch\nla chaise = der Stuhl\nla maison = das Haus');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [archivedLists, setArchivedLists] = useState([]);
  const [publicLists, setPublicLists] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [selectedListIds, setSelectedListIds] = useState(new Set());
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleAutoSave = () => {
    const newVal = !autoSaveEnabled;
    setAutoSaveEnabled(newVal);
    localStorage.setItem('autoSaveEnabled', JSON.stringify(newVal));
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    const confirm1 = window.confirm("ATTENTION : Vous êtes sur le point de supprimer votre compte et TOUTES vos listes. Continuer ?");
    if (!confirm1) return;
    const confirm2 = window.confirm("Êtes-vous ABSOLUMENT certain ? Cette action est irréversible.");
    if (!confirm2) return;

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await fetch(`${API_URL}/api/users/${user.uid}`, { method: 'DELETE' });
      await deleteAccount(user);
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la suppression. Vous devez peut-être vous reconnecter d'abord.");
    }
  };

  const exampleLists = [
    {
      id: 'ex1',
      title: 'Chapitre 1 : La Maison & les Objets',
      subtitle: '(Haus & Gegenstände)',
      count: '10 mots répertoriés',
      words: [
        { id: 1, question: 'la table', answer: 'der Tisch' },
        { id: 2, question: 'la chaise', answer: 'der Stuhl' },
        { id: 3, question: 'la maison', answer: 'das Haus' },
        { id: 4, question: 'la porte', answer: 'die Tür' },
        { id: 5, question: 'la fenêtre', answer: 'das Fenster' },
        { id: 6, question: 'le lit', answer: 'das Bett' },
        { id: 7, question: 'l\'armoire', answer: 'der Schrank' },
        { id: 8, question: 'la lampe', answer: 'die Lampe' },
        { id: 9, question: 'la clé', answer: 'der Schlüssel' },
        { id: 10, question: 'le jardin', answer: 'der Garten' },
      ]
    },
    {
      id: 'ex2',
      title: 'Chapitre 2 : La Nourriture & Boissons',
      subtitle: '(Essen & Trinken)',
      count: '10 mots répertoriés',
      words: [
        { id: 1, question: 'le pain', answer: 'das Brot' },
        { id: 2, question: 'l\'eau', answer: 'das Wasser' },
        { id: 3, question: 'le fromage', answer: 'der Käse' },
        { id: 4, question: 'la pomme', answer: 'der Apfel' },
        { id: 5, question: 'le café', answer: 'der Kaffee' },
        { id: 6, question: 'le lait', answer: 'die Milch' },
        { id: 7, question: 'le beurre', answer: 'die Butter' },
        { id: 8, question: 'la bière', answer: 'das Bier' },
        { id: 9, question: 'le sel', answer: 'das Salz' },
        { id: 10, question: 'le sucre', answer: 'der Zucker' },
      ]
    },
    {
      id: 'ex3',
      title: 'Chapitre 3 : Verbes Essentiels',
      subtitle: '(Wichtige Verben)',
      count: '10 mots répertoriés',
      words: [
        { id: 1, question: 'être', answer: 'sein' },
        { id: 2, question: 'avoir', answer: 'haben' },
        { id: 3, question: 'faire', answer: 'machen' },
        { id: 4, question: 'aller', answer: 'gehen' },
        { id: 5, question: 'venir', answer: 'kommen' },
        { id: 6, question: 'parler', answer: 'sprechen' },
        { id: 7, question: 'manger', answer: 'essen' },
        { id: 8, question: 'boire', answer: 'trinken' },
        { id: 9, question: 'dormir', answer: 'schlafen' },
        { id: 10, question: 'comprendre', answer: 'verstehen' },
      ]
    }
  ];

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    fetch(`${API_URL}/api/lists/public`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPublicLists(data);
      })
      .catch(console.error);

    if (user) {
      fetch(`${API_URL}/api/lists/${user.uid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setArchivedLists(data);
        })
        .catch(console.error);
    }
  }, [user]);

  const saveList = async (vocabList, name) => {
    if (!user) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, name, words: vocabList })
      });
      if (res.ok) {
        const data = await res.json();
        setArchivedLists(prev => [data, ...prev]);
      }
    } catch (e) {
      console.error("Erreur sauvegarde auto", e);
    }
  };

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
      if (data.vocabList && data.vocabList.length > 0) {
        setVocabListForReview(data.vocabList);
        if (autoSaveEnabled) {
          await saveList(data.vocabList, `Import PDF - ${new Date().toLocaleDateString()}`);
        }
      } else {
        alert("Aucun mot trouvé dans ce PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'analyse du PDF");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExtractAI = async (e) => {
    const fileInput = e?.target;
    const file = fileInput?.files?.[0];
    if (!rawText.trim() && !file) return alert("Veuillez coller du texte ou uploader un fichier.");
    
    setIsExtracting(true);
    const formData = new FormData();
    formData.append('text', rawText);
    if (file) formData.append('file', file);

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.vocabList && data.vocabList.length > 0) {
        setVocabListForReview(data.vocabList);
        if (autoSaveEnabled) {
          await saveList(data.vocabList, `Extraction IA - ${new Date().toLocaleDateString()}`);
        }
      } else {
        alert(data.error || "Aucun mot extrait.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'extraction par l'IA.");
    } finally {
      setIsExtracting(false);
      if (fileInput) fileInput.value = null; // Clear the file input
    }
  };

  const [themeInput, setThemeInput] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);

  const handleGenerateTheme = async () => {
    if (!themeInput.trim()) return alert("Veuillez entrer un thème.");
    setIsGeneratingTheme(true);
    try {
      const formData = new FormData();
      formData.append('text', `THEME: ${themeInput}`);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.vocabList && data.vocabList.length > 0) {
        setVocabListForReview(data.vocabList);
        if (autoSaveEnabled) {
          await saveList(data.vocabList, `Thème: ${themeInput}`);
        }
      } else {
        alert(data.error || "Aucun mot extrait.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération du thème.");
    } finally {
      setIsGeneratingTheme(false);
    }
  };

  const deleteList = async (listId) => {
    if (!window.confirm('Supprimer définitivement cette liste ?')) return;
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/lists/${listId}`, { method: 'DELETE' });
      if (res.ok) {
        setArchivedLists(prev => prev.filter(l => l._id !== listId));
        setSelectedListIds(prev => { const next = new Set(prev); next.delete(listId); return next; });
      } else {
        alert('Erreur lors de la suppression.');
      }
    } catch (e) {
      alert('Erreur lors de la suppression.');
    }
  };

  const togglePublicList = async (listId, currentStatus) => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/lists/${listId}/public`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !currentStatus })
      });
      if (res.ok) {
        const updatedList = await res.json();
        setArchivedLists(prev => prev.map(l => l._id === listId ? updatedList : l));
        // Update publicLists state if necessary
        if (!currentStatus) {
          setPublicLists(prev => [updatedList, ...prev]);
        } else {
          setPublicLists(prev => prev.filter(l => l._id !== listId));
        }
      } else {
        alert('Erreur lors de la modification du statut public.');
      }
    } catch (e) {
      alert('Erreur réseau.');
    }
  };

  const handleEditList = (list) => {
    setEditingListInfo({ id: list._id, name: list.name });
    setVocabListForReview(list.words);
  };

  const toggleListSelection = (listId) => {
    setSelectedListIds(prev => {
      const next = new Set(prev);
      if (next.has(listId)) next.delete(listId);
      else next.add(listId);
      return next;
    });
  };

  const handleMergeLists = () => {
    const listsToMerge = archivedLists.filter(l => selectedListIds.has(l._id));
    const seen = new Set();
    const merged = [];
    listsToMerge.forEach(list => {
      list.words.forEach(w => {
        const key = `${w.question?.toLowerCase()}__${w.answer?.toLowerCase()}`;
        if (!seen.has(key)) { seen.add(key); merged.push({ ...w, id: merged.length + 1 }); }
      });
    });
    const mergedNames = listsToMerge.map(l => l.name).join(' + ');
    setEditingListInfo({ id: null, name: `Fusion: ${mergedNames}` });
    setVocabListForReview(merged);
    setSelectedListIds(new Set());
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.length === 4) {
      const finalName = playerName ? `${avatar} ${playerName}` : `${avatar} Invité`;
      socket.emit('join_session', { sessionId: joinCode.toUpperCase(), playerName: finalName, firebaseId: user?.uid });
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ------------------- LEARN TAB ------------------- */}
      {activeTab === 'learn' && (
        <>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(to bottom right, var(--bg-surface), rgba(99, 102, 241, 0.1))' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>WortDuel</h2>
            <p className="text-muted" style={{ marginBottom: '2rem' }}>Compétition de vocabulaire en direct</p>
            
            <form onSubmit={handleJoin} style={{ width: '100%', maxWidth: '300px' }}>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Code (ex: AB47)" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ textAlign: 'center', letterSpacing: '2px', fontSize: '1.5rem', marginBottom: '1rem', textTransform: 'uppercase' }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={joinCode.length !== 4}
              >
                REJOINDRE
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: '1rem 0 0 0' }}>Créer une nouvelle session</h3>
            
            <div className="mobile-stack">
              <div className="card" style={{ flex: 1 }}>
                <h4 style={{ marginBottom: '1rem' }}>📤 Importer un PDF</h4>
                <label className="btn btn-secondary" style={{ width: '100%', cursor: isUploading ? 'wait' : 'pointer' }}>
                  {isUploading ? 'Analyse...' : 'Parcourir'}
                  <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
                </label>
              </div>

              <div className="card" style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Bientôt disponible</span>
                </div>
                <h4 style={{ marginBottom: '1rem' }}>🎨 Génération IA</h4>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Thème (ex: Animaux)" 
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  style={{ marginBottom: '1rem', padding: '0.8rem 1rem' }}
                />
                <button 
                  onClick={handleGenerateTheme}
                  className="btn btn-secondary"
                  disabled={isGeneratingTheme}
                >
                  {isGeneratingTheme ? 'Génération...' : 'Créer'}
                </button>
              </div>
            </div>

            <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Bientôt disponible</span>
              </div>
              <h4 style={{ marginBottom: '1rem' }}>📝 Coller du Texte</h4>
              <textarea 
                className="input-field" 
                rows={3}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                style={{ fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '1rem' }}
              />
              <button 
                onClick={() => handleExtractAI()}
                className="btn btn-secondary"
                disabled={isExtracting}
              >
                {isExtracting ? 'Extraction...' : 'Extraire avec IA'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ------------------- MY LISTS TAB ------------------- */}
      {activeTab === 'lists' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2>Mes Listes</h2>
            {selectedListIds.size >= 2 && (
              <button onClick={handleMergeLists} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>
                Fusionner ({selectedListIds.size})
              </button>
            )}
          </div>

          {!user ? (
            <div className="card text-muted text-center">Connectez-vous pour sauvegarder vos listes.</div>
          ) : archivedLists.length === 0 ? (
            <div className="card text-muted text-center">Aucune liste sauvegardée.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {archivedLists.map(list => {
                const isSelected = selectedListIds.has(list._id);
                return (
                  <div key={list._id} className="card" style={{ borderColor: isSelected ? 'var(--primary)' : 'var(--border-color)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleListSelection(list._id)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                    </div>
                    <h4 style={{ paddingRight: '2rem' }}>{list.name}</h4>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                      {list.words.length} mots • {new Date(list.createdAt).toLocaleDateString()}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button onClick={() => setVocabListForReview(list.words)} className="btn btn-success" style={{ padding: '0.5rem', flex: 1, fontSize: '0.85rem' }}>Jouer</button>
                      <button onClick={() => handleEditList(list)} className="btn btn-secondary" style={{ padding: '0.5rem', flex: 1, fontSize: '0.85rem' }}>Éditer</button>
                      <button onClick={() => togglePublicList(list._id, list.isPublic)} className="btn btn-secondary" style={{ padding: '0.5rem', flex: 1, fontSize: '0.85rem', borderColor: list.isPublic ? 'var(--warning)' : 'var(--border-color)', color: list.isPublic ? 'var(--warning)' : 'inherit' }}>
                        {list.isPublic ? 'Publique' : 'Privée'}
                      </button>
                      <button onClick={() => deleteList(list._id)} className="btn btn-secondary" style={{ padding: '0.5rem', width: 'auto', borderColor: 'var(--danger)', color: 'var(--danger)' }}>🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ------------------- COMMUNITY TAB ------------------- */}
      {activeTab === 'community' && (
        <>
          <h2 style={{ marginBottom: '1rem' }}>Bibliothèque</h2>
          
          <h3 className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Listes par défaut</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {exampleLists.map(list => (
              <div key={list.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <h4>{list.title}</h4>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>{list.subtitle} • {list.count}</p>
                </div>
                <button onClick={() => setVocabListForReview(list.words)} className="btn btn-secondary" style={{ marginTop: 'auto' }}>JOUER</button>
              </div>
            ))}
          </div>

          <h3 className="text-muted" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Listes Publiques (Communauté)</h3>
          {publicLists.length === 0 ? (
             <div className="card text-muted text-center">Aucune liste publique.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {publicLists.map(list => (
                <div key={list._id} className="card" style={{ borderColor: 'var(--warning)' }}>
                  <h4>{list.name}</h4>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>{list.words.length} mots</p>
                  <button onClick={() => setVocabListForReview(list.words)} className="btn btn-secondary" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>JOUER</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------- STATS TAB ------------------- */}
      {activeTab === 'stats' && (
        <>
          <h2 style={{ marginBottom: '1rem' }}>Classement Mondial 🏆</h2>
          {(!leaderboard || leaderboard.length === 0) ? (
             <div className="card text-muted text-center">Aucune donnée de classement pour le moment.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {leaderboard.slice(0, 10).map((player, idx) => (
                <div key={player._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: idx === 0 ? 'rgba(255, 215, 0, 0.15)' : idx === 1 ? 'rgba(192, 192, 192, 0.15)' : idx === 2 ? 'rgba(205, 127, 50, 0.15)' : 'var(--bg-surface)' }}>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'var(--text-muted)', minWidth: '40px', textAlign: 'center' }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{player.name}</h3>
                  </div>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {player.score} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>pts</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------- PROFILE TAB ------------------- */}
      {activeTab === 'profile' && (
        <>
          <h2>Profil & Paramètres</h2>
          
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Votre Profil</h3>
            <div className="mobile-stack" style={{ alignItems: 'center' }}>
              <select 
                className="input-field" 
                value={avatar} 
                onChange={(e) => setAvatar(e.target.value)}
                style={{ padding: '0.5rem', fontSize: '1.5rem', flex: '0 0 80px', textAlign: 'center' }}
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
                placeholder="Pseudo (ex: Wail...)" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {user && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Préférences</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Sauvegarde Automatique</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Enregistre vos extractions IA.</div>
                </div>
                <button onClick={toggleAutoSave} className={`btn ${autoSaveEnabled ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                  {autoSaveEnabled ? 'OUI' : 'NON'}
                </button>
              </div>
            </div>
          )}

          {user && (
            <div className="card" style={{ borderColor: 'var(--danger)' }}>
              <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Zone de Danger</h3>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={logout} className="btn btn-secondary" style={{ flex: 1, borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                  SE DÉCONNECTER
                </button>
                <button onClick={handleDeleteAccount} className="btn btn-secondary" style={{ flex: 1, color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                  SUPPRIMER MON COMPTE
                </button>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
}
