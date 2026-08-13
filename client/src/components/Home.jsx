import { useState, useEffect } from 'react';

export default function Home({ socket, setVocabListForReview, setEditingListInfo, playerName, setPlayerName, avatar, setAvatar, user, loginWithGoogle, logout, deleteAccount }) {
  const [mainStep, setMainStep] = useState(1); // 1 = Prepare, 2 = Join
  const [prepTab, setPrepTab] = useState('pdf'); // 'pdf', 'text', 'examples', 'settings'
  const [joinCode, setJoinCode] = useState('');
  const [rawText, setRawText] = useState('la table = der Tisch\nla chaise = der Stuhl\nla maison = das Haus');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [archivedLists, setArchivedLists] = useState([]);
  const [publicLists, setPublicLists] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
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

    fetch(`${API_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(() => setIsConnected(false));

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
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem', width: '100%' }}>
      {/* Header Bar */}
      <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: '#d97706', color: '#fff', padding: '0.6rem 1rem', borderRadius: '12px', fontWeight: 'bold', fontSize: '1.4rem' }}>
            DE
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>WortDuel</h1>
              <span style={{ background: 'rgba(255,255,255,0.1)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', color: 'var(--text-muted)' }}>
                # LIVE 2 JOUEURS
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Compétition de vocabulaire allemand en direct</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: isConnected ? '#22c55e' : '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: isConnected ? '#22c55e' : '#ef4444' }}></span>
            {isConnected ? 'EN LIGNE' : 'HORS LIGNE'}
          </span>
          {user ? (
            <button onClick={logout} className="btn" style={{ background: 'rgba(255,255,255,0.1)', padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Déconnexion</button>
          ) : (
            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Se connecter</button>
          )}
        </div>
      </div>

      {/* Pseudo & Avatar Selection Bar */}
      <div className="mobile-stack" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', padding: '1rem', borderRadius: '14px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>VOTRE PROFIL :</span>
        <select 
          className="input-field" 
          value={avatar} 
          onChange={(e) => setAvatar(e.target.value)}
          style={{ padding: '0.5rem', fontSize: '1.3rem', cursor: 'pointer', flex: '0 0 65px', textAlign: 'center' }}
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
          style={{ padding: '0.5rem 1rem', flex: 1, minWidth: '150px' }}
        />
      </div>

      {/* Main Steps Navigation Tabs */}
      <div className="mobile-stack" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setMainStep(1)}
          style={{ 
            padding: '0.75rem 1.5rem', 
            borderRadius: '12px', 
            border: mainStep === 1 ? '1px solid var(--primary)' : '1px solid transparent',
            background: mainStep === 1 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
            color: mainStep === 1 ? 'var(--text-light)' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          1. PRÉPARER LE PDF / LISTE
        </button>
        <button 
          onClick={() => setMainStep(2)}
          style={{ 
            padding: '0.75rem 1.5rem', 
            borderRadius: '12px', 
            border: mainStep === 2 ? '1px solid var(--primary)' : '1px solid transparent',
            background: mainStep === 2 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)',
            color: mainStep === 2 ? 'var(--text-light)' : 'var(--text-muted)',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          2. REJOINDRE / DÉMARRER
        </button>
      </div>

      {/* STEP 1: PREPARE LIST */}
      {mainStep === 1 && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
              # ÉTAPE 01 - PRÉPARATION
            </span>
            <h2 style={{ fontSize: '2rem', margin: '0.3rem 0 0.5rem 0' }}>Importez ou Créez votre Liste</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Téléversez un cours PDF, l'IA extrait automatiquement les paires de mots (Français / Allemand avec article) pour alimenter le duel live.
            </p>
          </div>

          {/* Sub-tabs */}
          <div className="mobile-stack" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <button 
              className="sub-tab-btn"
              onClick={() => setPrepTab('pdf')}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: prepTab === 'pdf' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: prepTab === 'pdf' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              📤 IMPORTER UN PDF
            </button>
            <button 
              className="sub-tab-btn"
              onClick={() => setPrepTab('text')}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: prepTab === 'text' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: prepTab === 'text' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              📝 COLLER DU TEXTE
            </button>
            <button 
              className="sub-tab-btn"
              onClick={() => setPrepTab('examples')}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: prepTab === 'examples' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: prepTab === 'examples' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              📚 EXEMPLES
            </button>
            <button 
              className="sub-tab-btn"
              onClick={() => setPrepTab('theme')}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: prepTab === 'theme' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: prepTab === 'theme' ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.85rem'
              }}
            >
              🎨 THÈME IA
            </button>
            {user && (
              <button 
                className="sub-tab-btn"
                onClick={() => setPrepTab('lists')}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: prepTab === 'lists' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: prepTab === 'lists' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                📂 MES LISTES
              </button>
            )}
            {user && (
              <button 
                className="sub-tab-btn"
                onClick={() => setPrepTab('settings')}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: prepTab === 'settings' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                  color: prepTab === 'settings' ? '#fff' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                ⚙️ PARAMÈTRES
              </button>
            )}
          </div>

          {/* Tab 1: PDF Upload */}
          {prepTab === 'pdf' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', border: '2px dashed rgba(255,255,255,0.1)', padding: '3rem 2rem', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📤</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Déposez votre fichier PDF ici</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                Tableau 2 colonnes (Français/Anglais -&gt; Allemand avec article)
              </p>
              <label className="btn btn-primary" style={{ padding: '0.75rem 2rem', cursor: isUploading ? 'wait' : 'pointer', display: 'inline-block' }}>
                {isUploading ? 'Analyse en cours...' : 'SÉLECTIONNER UN FICHIER'}
                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
              </label>
            </div>
          )}

          {/* Tab 2: Raw Text Extraction & Multimodal */}
          {prepTab === 'text' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                COLLEZ VOS PAIRES DE MOTS OU TEXTE BRUT :
              </label>
              <textarea 
                className="input-field" 
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                style={{ width: '100%', fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '1rem', padding: '1rem' }}
              />
              
              <div style={{ textAlign: 'center', margin: '1rem 0', color: 'var(--text-muted)' }}>OU</div>
              
              <label className="btn btn-secondary" style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', cursor: isExtracting ? 'wait' : 'pointer', display: 'block', textAlign: 'center' }}>
                📷 UPLOADER UN FICHIER (IMAGE, AUDIO, TEXTE)
                <input type="file" style={{ display: 'none' }} onChange={handleExtractAI} disabled={isExtracting} />
              </label>

              <button 
                onClick={() => handleExtractAI()}
                className="btn btn-primary"
                disabled={isExtracting}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {isExtracting ? '✨ extraction avec l\'IA en cours...' : '✨ EXTRAIRE LE TEXTE CI-DESSUS'}
              </button>
            </div>
          )}

          {/* Tab 3: Example Lists */}
          {prepTab === 'examples' && (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--text-light)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>Listes par défaut</h3>
              <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {exampleLists.map(list => (
                  <div key={list.id} style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem' }}>{list.title}</h4>
                      <p style={{ margin: '0 0 0.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{list.subtitle}</p>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{list.count}</span>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setVocabListForReview(list.words)}
                      style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      UTILISER CETTE LISTE -&gt;
                    </button>
                  </div>
                ))}
              </div>

              <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>🌍 Listes Publiques (Communauté)</h3>
              {publicLists.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>
                  Aucune liste publique pour le moment.
                </div>
              ) : (
                <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                  {publicLists.map(list => (
                    <div key={list._id} style={{ background: 'rgba(234,179,8,0.05)', border: '1px solid rgba(234,179,8,0.2)', padding: '1.5rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '1rem', color: '#eab308' }}>{list.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{list.words.length} mots • {new Date(list.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => setVocabListForReview(list.words)}
                        style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                      >
                        JOUER CETTE LISTE -&gt;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Theme Generation */}
          {prepTab === 'theme' && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎨</div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Générer avec l'IA depuis un thème</h3>
              <input 
                type="text" 
                className="input-field" 
                placeholder="Ex: Les animaux, La nourriture, Voyage..." 
                value={themeInput}
                onChange={(e) => setThemeInput(e.target.value)}
                style={{ width: '100%', marginBottom: '1.5rem', textAlign: 'center', padding: '1rem', borderRadius: '8px' }}
              />
              <button 
                onClick={handleGenerateTheme}
                className="btn btn-primary"
                disabled={isGeneratingTheme}
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {isGeneratingTheme ? '✨ Génération en cours...' : '✨ GÉNÉRER 15 MOTS'}
              </button>
            </div>
          )}

          {/* Tab 5: User Saved Lists */}
          {prepTab === 'lists' && user && (
            <div>
              {archivedLists.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Aucune liste sauvegardée pour le moment.
                </div>
              ) : (
                <>
                  {/* Merge Bar */}
                  {selectedListIds.size >= 2 && (
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(99,102,241,0.15)', border: '1px solid var(--primary)',
                      borderRadius: '12px', padding: '0.8rem 1.2rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem'
                    }}>
                      <span style={{ color: 'var(--text-light)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {selectedListIds.size} listes sélectionnées
                      </span>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => setSelectedListIds(new Set())}
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'var(--text-muted)', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                          Annuler
                        </button>
                        <button onClick={handleMergeLists}
                          style={{ background: 'var(--primary)', border: 'none', color: '#fff', padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                          🔄 Fusionner
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedListIds.size < 2 && selectedListIds.size > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center' }}>
                      Sélectionnez au moins 2 listes pour les fusionner
                    </div>
                  )}

                  {selectedListIds.size === 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textAlign: 'center' }}>
                      Cochez des listes pour les fusionner, ou utilisez les boutons ci-dessous
                    </div>
                  )}

                  <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                    {archivedLists.map(list => {
                      const isSelected = selectedListIds.has(list._id);
                      return (
                        <div key={list._id} style={{
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.05)',
                          padding: '1.2rem', borderRadius: '12px',
                          border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                          transition: 'all 0.2s'
                        }}>
                          {/* Header row: checkbox + name */}
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '0.4rem' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleListSelection(list._id)}
                              style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0, marginTop: '2px' }}
                            />
                            <h4 style={{ margin: 0, fontSize: '0.95rem', flex: 1, lineHeight: '1.3' }}>{list.name}</h4>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.8rem', paddingLeft: '24px' }}>
                            {list.words.length} mots • {new Date(list.createdAt).toLocaleDateString()}
                          </span>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => setVocabListForReview(list.words)}
                              style={{ flex: 1, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}
                            >
                              ▶ Jouer
                            </button>
                            <button
                              onClick={() => handleEditList(list)}
                              style={{ flex: 1, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: 'var(--primary)', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 'bold' }}
                            >
                              ✏️ Modifier
                            </button>
                            <button
                              onClick={() => togglePublicList(list._id, list.isPublic)}
                              title={list.isPublic ? "Rendre privée" : "Rendre publique"}
                              style={{ background: list.isPublic ? 'rgba(234,179,8,0.2)' : 'rgba(255,255,255,0.05)', border: list.isPublic ? '1px solid rgba(234,179,8,0.4)' : '1px solid rgba(255,255,255,0.2)', color: list.isPublic ? '#eab308' : 'var(--text-muted)', padding: '0.4rem 0.6rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem' }}
                            >
                              🌍 {list.isPublic ? 'Publique' : 'Privée'}
                            </button>
                            <button
                              onClick={() => deleteList(list._id)}
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.4rem 0.6rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab 6: Settings */}
          {prepTab === 'settings' && user && (
            <div style={{ maxWidth: '500px', margin: '0 auto', background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '12px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-light)' }}>Préférences</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Sauvegarde Automatique</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enregistrer les listes après une extraction IA ou PDF.</div>
                </div>
                <button 
                  onClick={toggleAutoSave}
                  style={{
                    background: autoSaveEnabled ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: 'bold'
                  }}
                >
                  {autoSaveEnabled ? 'ACTIVÉE' : 'DÉSACTIVÉE'}
                </button>
              </div>

              <h3 style={{ color: '#ef4444', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>Zone de Danger</h3>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                La suppression de votre compte effacera toutes vos données personnelles ainsi que toutes les listes que vous avez enregistrées. 
                Cette action ne peut pas être annulée.
              </p>
              <button 
                onClick={handleDeleteAccount}
                style={{
                  width: '100%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '1rem',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              >
                SUPPRIMER MON COMPTE
              </button>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: JOIN SESSION */}
      {mainStep === 2 && (
        <div className="glass-panel" style={{ padding: '3rem 2rem', maxWidth: '500px', margin: '0 auto 2rem auto', textAlign: 'center' }}>
          <div style={{ background: '#d97706', color: '#fff', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1rem auto', fontWeight: 'bold', fontSize: '1.5rem' }}>
            DE
          </div>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Rejoindre une Session Live</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '2rem' }}>
            Entrez le code de session à 4 caractères transmis par votre ami.
          </p>

          <form onSubmit={handleJoin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>CODE DE SESSION (4 CARACTÈRES) :</label>
              <input 
                type="text" 
                className="input-field" 
                placeholder="EX : AB47" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                style={{ width: '100%', textTransform: 'uppercase', textAlign: 'center', letterSpacing: '3px', fontSize: '1.2rem', padding: '0.75rem' }}
              />
            </div>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={joinCode.length !== 4}
              style={{ width: '100%', padding: '0.85rem' }}
            >
              REJOINDRE LA PARTIE -&gt;
            </button>
          </form>
        </div>
      )}

      {/* Leaderboard */}
      {leaderboard.length > 0 && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>🏆 Classement Mondial</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
            {leaderboard.slice(0, 6).map((u, i) => (
              <div key={u._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {u.name} (Niv. {u.level})</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>{u.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
