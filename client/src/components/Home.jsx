import { useState, useEffect } from 'react';
import { exampleLists } from '../data/exampleLists';
import { formatPlayerName, getClientPlayerKey } from '../utils/formatters';
import ListCard from './ListCard';

const listsCache = {
  public: null,
  archived: {} // keyed by user.uid
};

function resolveWordItem(item) {
  const germanWord = typeof item === 'string' ? item : (item.word || item.answer || '');
  let frenchPrompt = typeof item === 'object' ? (item.question || item.french || item.fr || item.translation || '') : '';
  
  if (!frenchPrompt || frenchPrompt.toLowerCase().includes('traduire')) {
    const allDict = [];
    (exampleLists || []).forEach(l => {
      if (Array.isArray(l.words)) allDict.push(...l.words);
    });
    const found = allDict.find(ex => 
      ex.answer?.toLowerCase().trim() === germanWord.toLowerCase().trim() ||
      ex.question?.toLowerCase().trim() === germanWord.toLowerCase().trim()
    );
    if (found && found.question) {
      frenchPrompt = found.question;
    } else {
      frenchPrompt = germanWord;
    }
  }

  return {
    germanWord,
    frenchPrompt,
    count: typeof item === 'object' && item.count ? item.count : 1
  };
}

export default function Home({ 
  socket, 
  playerName, 
  setPlayerName, 
  avatar, 
  setAvatar, 
  user, 
  loginWithGoogle, 
  logout, 
  deleteAccount, 
  activeTab, 
  setActiveTab,
  onNavigate,
  leaderboard, 
  isGuest, 
  setIsGuest, 
  isAdmin, 
  onOpenAdmin,
  theme,
  setTheme,
  failedWords = [],
  onStartVengeance
}) {
  const [listSubTab, setListSubTab] = useState('my_lists'); // 'my_lists' | 'failed_words'
  const [showMistakesModal, setShowMistakesModal] = useState(false);
  const [mainStep, setMainStep] = useState(1); // 1 = Prepare, 2 = Join
  const [prepTab, setPrepTab] = useState('pdf'); // 'pdf', 'text', 'examples', 'settings'
  const [joinCode, setJoinCode] = useState('');
  const [rawText, setRawText] = useState('la table = der Tisch\nla chaise = der Stuhl\nla maison = das Haus');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [archivedLists, setArchivedLists] = useState(() => user && listsCache.archived[user.uid] ? listsCache.archived[user.uid] : []);
  const [publicLists, setPublicLists] = useState(() => listsCache.public || []);
  const [isConnected, setIsConnected] = useState(true);
  const [soloWordCount, setSoloWordCount] = useState(10);
  const [showWordEditor, setShowWordEditor] = useState(false);
  const [manualWords, setManualWords] = useState([{ id: 1, question: '', answer: '' }]);
  const [selectedListIds, setSelectedListIds] = useState(new Set());
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    const saved = localStorage.getItem('autoSaveEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [editingListId, setEditingListId] = useState(null);
  const [listTitle, setListTitle] = useState('');
  const [importNotice, setImportNotice] = useState('');

  const handleStartDirectSession = (wordList) => {
    const validWords = (wordList || []).filter(w => w.question?.trim() && w.answer?.trim());
    if (validWords.length === 0) return alert("Aucun mot valide dans cette liste !");
    const finalName = playerName ? `${avatar} ${formatPlayerName(playerName)}` : `${avatar} Hôte`;
    socket.emit('create_session', {
      vocabList: validWords.map((w, idx) => ({ ...w, id: idx + 1 })),
      settings: { rounds: validWords.length, timePerWord: 15, powerupsEnabled: false },
      playerName: finalName,
      firebaseId: user?.uid,
      avatar,
      clientPlayerKey: getClientPlayerKey()
    });
  };

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

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

    fetch(`${API_URL}/api/lists/public`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          listsCache.public = data;
          setPublicLists(data);
        }
      })
      .catch(console.error);

    if (user) {
      if (listsCache.archived[user.uid]) {
        setArchivedLists(listsCache.archived[user.uid]);
      }
      fetch(`${API_URL}/api/lists/${user.uid}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            listsCache.archived[user.uid] = data;
            setArchivedLists(data);
          }
        })
        .catch(console.error);
    } else {
      setArchivedLists([]);
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
        return data;
      }
    } catch (e) {
      console.error("Erreur sauvegarde auto", e);
    }
  };

  const handleUpload = async (e) => {
    const file = e.target?.files?.[0];
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
        const words = data.vocabList.map((w, idx) => ({
          id: Date.now() + idx,
          question: w.question,
          answer: w.answer
        }));
        
        // Populate the word editor with all extracted words
        setManualWords(words);
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        setListTitle(fileNameWithoutExt);
        setEditingListId(null);
        setShowWordEditor(true);
        setImportNotice(`🎉 ${words.length} mots extraits du PDF "${file.name}" et ajoutés à ta liste !`);

        if (autoSaveEnabled && user) {
          await saveList(data.vocabList, fileNameWithoutExt);
        }
      } else {
        alert("Aucun mot de vocabulaire trouvé dans ce PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'analyse du PDF");
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSaveManualList = async () => {
    const valid = manualWords.filter(w => w.question.trim() && w.answer.trim());
    if (valid.length === 0) return alert('Ajoutez au moins un mot valide !');
    const title = listTitle.trim() || `Liste - ${new Date().toLocaleDateString()}`;

    if (!user) {
      alert("Connectez-vous pour sauvegarder vos listes dans votre compte.");
      return;
    }

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      if (editingListId) {
        const res = await fetch(`${API_URL}/api/lists/${editingListId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: title, words: valid })
        });
        if (res.ok) {
          const updated = await res.json();
          setArchivedLists(prev => prev.map(l => l._id === editingListId ? updated : l));
          alert('✅ Liste mise à jour avec succès !');
        }
      } else {
        const res = await fetch(`${API_URL}/api/lists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.uid, name: title, words: valid })
        });
        if (res.ok) {
          const created = await res.json();
          setArchivedLists(prev => [created, ...prev]);
          setEditingListId(created._id);
          alert('✅ Nouvelle liste enregistrée dans "Mes Listes" !');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Erreur lors de la sauvegarde de la liste.');
    }
  };

  const handleEditList = (list) => {
    if (!list || !list.words) return;
    setManualWords(list.words.map((w, idx) => ({ ...w, id: w.id || Date.now() + idx })));
    setEditingListId(list._id || null);
    setListTitle(list.name || 'Ma Liste');
    setImportNotice('');
    setShowWordEditor(true);
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
        handleStartDirectSession(data.vocabList);
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
        handleStartDirectSession(data.vocabList);
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
    handleStartDirectSession(merged);
    setSelectedListIds(new Set());
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (joinCode.length === 4) {
      const finalName = playerName ? `${avatar} ${formatPlayerName(playerName)}` : `${avatar} Invité`;
      socket.emit('join_session', {
        sessionId: joinCode.toUpperCase(),
        playerName: finalName,
        firebaseId: user?.uid,
        avatar,
        clientPlayerKey: getClientPlayerKey()
      });
    }
  };

  const handlePlaySolo = () => {
    const allWords = [];
    exampleLists.forEach(list => allWords.push(...list.words));
    publicLists.forEach(list => allWords.push(...list.words));
    
    if (allWords.length === 0) {
      alert("Aucun mot disponible !");
      return;
    }

    const shuffled = allWords.sort(() => 0.5 - Math.random());
    const count = Math.max(1, Math.min(parseInt(soloWordCount) || 10, allWords.length));
    const selectedWords = shuffled.slice(0, count).map((w, idx) => ({ ...w, id: idx + 1 }));
    
    handleStartDirectSession(selectedWords);
  };

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* ------------------- LEARN TAB ------------------- */}
      {activeTab === 'learn' && (
        <>
          {/* TÂCHE 1 : Point d'entrée UI - Mur de la Vengeance */}
          <div 
            className={`vengeance-entry-card ${failedWords.length > 0 ? 'active' : 'disabled'}`}
            onClick={() => {
              if (failedWords.length > 0 && onStartVengeance) {
                onStartVengeance();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1.2rem',
              flexWrap: 'wrap',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '220px' }}>
              <div style={{
                fontSize: '2.4rem',
                width: '58px',
                height: '58px',
                borderRadius: '16px',
                background: failedWords.length > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${failedWords.length > 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: failedWords.length > 0 ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none'
              }}>
                🔥
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.3px' }}>
                    🔥 Mur de la Vengeance
                  </h3>
                  {failedWords.length > 0 && (
                    <span className="vengeance-flame-badge" style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem' }}>
                      {failedWords.length} à purifier
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: failedWords.length > 0 ? '#fca5a5' : 'var(--text-muted)', fontWeight: 600 }}>
                  {failedWords.length > 0 
                    ? `${failedWords.length} mot${failedWords.length > 1 ? 's' : ''} attend${failedWords.length > 1 ? 'ent' : ''} d'être purifié${failedWords.length > 1 ? 's' : ''}`
                    : "Aucune vengeance en attente."}
                </p>
              </div>
            </div>

            {failedWords.length > 0 ? (
              <button
                type="button"
                className="vengeance-action-btn"
                style={{ fontSize: '0.92rem', padding: '0.75rem 1.3rem', pointerEvents: 'none' }}
              >
                ⚡ PURIFIER
              </button>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem' }}>
                ✨ Rien à purifier
              </span>
            )}
          </div>

          <div className="card card-arena" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'linear-gradient(to bottom right, var(--bg-surface), rgba(99, 102, 241, 0.1))' }}>
            <h2 className="brand-logo-shine" style={{ fontSize: '2.4rem', marginBottom: '0.4rem', letterSpacing: '-0.5px' }}>
              WANA ALLMAND
            </h2>
            <p className="text-muted" style={{ marginBottom: '1.8rem', fontSize: '1.05rem', fontWeight: 600 }}>
              Compétition &amp; Apprentissage de vocabulaire en direct 🎮
            </p>
            
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

            <div style={{ width: '100%', maxWidth: '300px', marginTop: '1rem', borderTop: '2px dashed rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={handlePlaySolo} 
                style={{ 
                  width: '100%', 
                  padding: '0.85rem', 
                  fontSize: '1rem', 
                  fontWeight: 900,
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.35)',
                  cursor: 'pointer'
                }}
              >
                ➕ CRÉER LOBBY
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', margin: '1rem 0 0 0' }}>Créer une nouvelle session</h3>
            
            {/* 3 big boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

              {/* BOX 1 : Écrire tes mots + Importer PDF */}
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ cursor: 'pointer', padding: '0.75rem', border: '2px solid var(--border-color)', borderRadius: '12px', transition: 'all 0.2s' }}
                  onClick={() => setShowWordEditor(true)}
                  onMouseOver={e => e.currentTarget.style.borderColor='var(--primary)'}
                  onMouseOut={e => e.currentTarget.style.borderColor='var(--border-color)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.3rem' }}>✏️</span>
                    <span style={{ fontWeight: 'bold' }}>Écrire tes mots</span>
                  </div>
                </div>
                <label style={{ cursor: isUploading ? 'wait' : 'pointer', padding: '0.75rem', border: '2px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s' }}
                  onMouseOver={e => e.currentTarget.style.borderColor='var(--primary)'}
                  onMouseOut={e => e.currentTarget.style.borderColor='var(--border-color)'}
                >
                  <span style={{ fontSize: '1.3rem' }}>📤</span>
                  <span style={{ fontWeight: 'bold' }}>{isUploading ? 'Analyse...' : 'Importer un PDF'}</span>
                  <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
                </label>
              </div>

              {/* BOX 2 : Génération IA (blurred) */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Bientôt disponible</span>
                </div>
                <h4 style={{ marginBottom: '1rem' }}>🎨 Génération IA</h4>
                <input type="text" className="input-field" placeholder="Thème" value={themeInput} onChange={(e) => setThemeInput(e.target.value)} style={{ marginBottom: '1rem', padding: '0.8rem 1rem' }} />
                <button className="btn btn-secondary" disabled>Créer</button>
              </div>

              {/* BOX 3 : Coller du texte (blurred) */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Bientôt disponible</span>
                </div>
                <h4 style={{ marginBottom: '1rem' }}>📝 Coller du Texte</h4>
                <textarea className="input-field" rows={3} value={rawText} onChange={(e) => setRawText(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.9rem', marginBottom: '1rem' }} />
                <button className="btn btn-secondary" disabled>Extraire avec IA</button>
              </div>

            </div>
          </div>

        </>
      )}

      {/* ------------------- MY LISTS TAB (TASK 2 & 3 SUB-TABS) ------------------- */}
      {activeTab === 'lists' && (
        <>
          {/* Header & Sub-tab Segmented Control */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Mes Listes 🗂️</h2>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Gérez vos listes et purifiez vos mots ratés
              </p>
            </div>

            {/* Segmented Control (Pill toggle) (Task 2) */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--card-bg, #151e2e)',
              padding: '0.3rem',
              borderRadius: '14px',
              border: '1.5px solid var(--border-color, #243044)',
              gap: '0.3rem',
              width: '100%',
              maxWidth: '430px'
            }}>
              <button
                type="button"
                onClick={() => setListSubTab('my_lists')}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: listSubTab === 'my_lists' ? 'var(--accent-primary, var(--primary))' : 'transparent',
                  color: listSubTab === 'my_lists' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: listSubTab === 'my_lists' ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none'
                }}
              >
                <span>📁</span>
                <span>Mes Listes</span>
              </button>

              <button
                type="button"
                onClick={() => setListSubTab('failed_words')}
                style={{
                  flex: 1,
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  border: 'none',
                  background: listSubTab === 'failed_words' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'transparent',
                  color: listSubTab === 'failed_words' ? '#ffffff' : 'var(--text-muted)',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: listSubTab === 'failed_words' ? '0 4px 14px rgba(239, 68, 68, 0.4)' : 'none'
                }}
              >
                <span>💔</span>
                <span>Fautes à Purifier ({failedWords.length})</span>
              </button>
            </div>
          </div>

          {/* SUB-TAB 1 : MES LISTES */}
          {listSubTab === 'my_lists' && (
            <>
              {selectedListIds.size >= 2 && (
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button onClick={handleMergeLists} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>
                    Fusionner ({selectedListIds.size})
                  </button>
                </div>
              )}

              {!user ? (
                <div className="card text-muted text-center" style={{ padding: '2rem' }}>
                  Connectez-vous avec votre compte Google pour créer et sauvegarder vos listes.
                </div>
              ) : archivedLists.length === 0 ? (
                <div className="card text-muted text-center" style={{ padding: '2.5rem 1rem' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>📂</span>
                  <p style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--text-main)' }}>Aucune liste sauvegardée pour le moment.</p>
                  <p style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>
                    Importez un fichier PDF ou écrivez vos mots depuis l'onglet Apprendre pour commencer !
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
                  {archivedLists.map(list => (
                    <ListCard
                      key={list._id}
                      list={list}
                      isSelected={selectedListIds.has(list._id)}
                      onToggleSelect={() => toggleListSelection(list._id)}
                      onPlay={() => handleStartDirectSession(list.words)}
                      onEdit={() => handleEditList(list)}
                      onTogglePublic={() => togglePublicList(list._id, list.isPublic)}
                      onDelete={() => deleteList(list._id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* SUB-TAB 2 : FAUTES À PURIFIER (TASK 2 & 3) */}
          {listSubTab === 'failed_words' && (
            <>
              {/* Pedagogical Infobox (Task 3) */}
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1.5px dashed rgba(239, 68, 68, 0.4)',
                borderRadius: '16px',
                padding: '1rem 1.3rem',
                marginBottom: '1.2rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.85rem',
                fontSize: '0.9rem',
                color: 'var(--text-main)',
                lineHeight: 1.5
              }}>
                <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>💡</span>
                <div>
                  <strong>Mode Solo :</strong> Jouez uniquement sur vos erreurs. Remplissez les 3 cœurs (❤️❤️❤️) pour effacer définitivement le mot de vos fautes et gagner un gros bonus d'XP !
                </div>
              </div>

              {/* Pinned Dossier Rouge Card */}
              <div className="pinned-mistakes-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '2.4rem', filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))' }}>💔</span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#fca5a5' }}>
                          Dossier Rouge : Mots Ratés 💔
                        </h3>
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.25)',
                          border: '1px solid rgba(239, 68, 68, 0.5)',
                          color: '#f87171',
                          borderRadius: '999px',
                          padding: '0.15rem 0.6rem',
                          fontSize: '0.75rem',
                          fontWeight: 800
                        }}>
                          {failedWords.length} mot{failedWords.length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                        {failedWords.length > 0 
                          ? "Consultez la liste de vos erreurs avant de lancer la purge." 
                          : "Bravo ! Aucune faute en attente de purification."}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowMistakesModal(true)}
                      disabled={failedWords.length === 0}
                      style={{
                        padding: '0.6rem 1.2rem',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        color: failedWords.length > 0 ? '#fca5a5' : 'var(--text-muted)'
                      }}
                    >
                      📖 CONSULTER
                    </button>
                    {failedWords.length > 0 && (
                      <button
                        type="button"
                        className="vengeance-action-btn"
                        onClick={() => onStartVengeance && onStartVengeance()}
                        style={{ padding: '0.6rem 1.2rem', fontSize: '0.88rem' }}
                      >
                        ⚡ Lancer la Purge
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Direct List Preview for failed words */}
              {failedWords.length === 0 ? (
                <div className="card text-center text-muted" style={{ padding: '2.5rem' }}>
                  <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}>✨</span>
                  <p style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>Votre dossier est vierge de toute erreur !</p>
                  <p style={{ fontSize: '0.88rem', marginTop: '0.2rem' }}>Jouez des parties en direct ou en solo pour vous entraîner.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                    Aperçu des fautes enregistrées :
                  </div>
                  {failedWords.map((item, idx) => {
                    const resolved = resolveWordItem(item);
                    return (
                      <div
                        key={idx}
                        className="card"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          background: 'linear-gradient(135deg, rgba(25, 12, 16, 0.75) 0%, var(--bg-surface) 100%)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          padding: '1rem 1.2rem'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fca5a5' }}>
                            🇩🇪 {resolved.germanWord}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                            🇫🇷 {resolved.frenchPrompt}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '8px'
                        }}>
                          {resolved.count}x raté
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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
                <button onClick={() => handleStartDirectSession(list.words)} className="btn btn-secondary" style={{ marginTop: 'auto' }}>JOUER</button>
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
                  <h4>
                    {list.creatorName && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginRight: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                        {list.creatorName.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                    {list.name}
                  </h4>
                  <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem', marginTop: '0.5rem' }}>{list.words.length} mots</p>
                  <button onClick={() => handleStartDirectSession(list.words)} className="btn btn-secondary" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>JOUER</button>
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
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>{formatPlayerName(player.name)}</h3>
                  </div>
                  <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                    {player.xp || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>pts</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ------------------- PROFILE TAB (TASK 1 & 2) ------------------- */}
      {activeTab === 'profile' && (
        <>
          <h2>Profil &amp; Paramètres 👤</h2>
          
          {/* Guest login banner */}
          {isGuest && !user && (
            <div style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '14px', padding: '1.2rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center', textAlign: 'center' }}>
              <span style={{ fontSize: '1.6rem' }}>👤</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1rem', marginBottom: '0.3rem' }}>Tu es en mode invité</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Connecte-toi pour sauvegarder tes listes, apparaître dans le classement et accéder à toutes les fonctionnalités.</div>
              </div>
              <button onClick={loginWithGoogle} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Se connecter avec Google
              </button>
            </div>
          )}
          
          {/* Identity Card */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Votre Identité</h3>
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
                maxLength={32}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          </div>

          {/* TASK 1 & 4: 8 THEMES SELECTOR */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <h3 style={{ margin: 0 }}>🎨 Thèmes Visuels (8 Styles)</h3>
              <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                Actif : {theme?.toUpperCase() || 'MIDNIGHT'}
              </span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.8rem' }}>
              Personnalisez l'ambiance et la palette graphique de toute l'application :
            </p>

            <div className="theme-grid">
              {[
                { id: 'midnight', name: 'Midnight', icon: '🌌', desc: 'Bleu sombre & Violet fluo', primary: '#6366f1', bg: '#0b0f19' },
                { id: 'cyberpink', name: 'Cyber Pink', icon: '💖', desc: 'Violet sombre & Rose néon', primary: '#ff007f', bg: '#120914' },
                { id: 'sakura', name: 'Sakura', icon: '🌸', desc: 'Blanc & Rose poudré doux', primary: '#ec4899', bg: '#fff5f8' },
                { id: 'hacker', name: 'Hacker', icon: '💻', desc: 'Noir pur & Vert Matrix', primary: '#00ff66', bg: '#030704' },
                { id: 'glacier', name: 'Glacier', icon: '❄️', desc: 'Bleu marine & Cyan glacial', primary: '#00f0ff', bg: '#071321' },
                { id: 'bloodduel', name: 'BloodDuel', icon: '⚔️', desc: 'Anthracite & Rouge sang', primary: '#ef4444', bg: '#121113' },
                { id: 'sunset', name: 'Sunset', icon: '🌅', desc: 'Terre brûlée & Orange feu', primary: '#f97316', bg: '#18110e' },
                { id: 'classic', name: 'Classic Light', icon: '☀️', desc: 'Blanc cassé & Bleu pur', primary: '#2563eb', bg: '#f8fafc' },
              ].map((th) => {
                const isActive = (theme === th.id) || (th.id === 'classic' && theme === 'light');
                return (
                  <button
                    key={th.id}
                    type="button"
                    className={`theme-card-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (setTheme) {
                        setTheme(th.id);
                        localStorage.setItem('wana_theme', th.id);
                      }
                    }}
                    style={{
                      borderLeft: `4px solid ${th.primary}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '1.3rem' }}>{th.icon}</span>
                      <div className="theme-swatch">
                        <div className="theme-dot" style={{ backgroundColor: th.bg }} />
                        <div className="theme-dot" style={{ backgroundColor: th.primary }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'left', width: '100%' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: isActive ? 'var(--primary)' : 'var(--text-main)' }}>
                        {th.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.2', marginTop: '2px' }}>
                        {th.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preferences */}
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

          {/* TASK 2: Admin moved to Profile */}
          {user && isAdmin && onOpenAdmin && (
            <div className="card" style={{ marginBottom: '1rem', background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                <h3 style={{ margin: 0, color: 'var(--primary)' }}>Administration</h3>
              </div>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Accédez aux contrôles serveur, gestion des utilisateurs et diffusions d'annonces.
              </p>
              <button 
                onClick={onOpenAdmin} 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '0.75rem' }}
              >
                Ouvrir le Panneau Admin
              </button>
            </div>
          )}

          {/* Danger Zone */}
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

      {/* ---- WORD EDITOR MODAL (ROOT LEVEL OVERLAY) ---- */}
      {showWordEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem 1rem', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.7)', border: '2px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem' }}>✏️ Éditeur de Vocabulaire ({manualWords.filter(w => w.question?.trim() || w.answer?.trim()).length} mots)</h2>
              <button onClick={() => setShowWordEditor(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            {/* Import Notice Banner */}
            {importNotice && (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid var(--success)', borderRadius: '10px', padding: '0.6rem 1rem', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', color: 'var(--success)' }}>
                <span>{importNotice}</span>
                <button onClick={() => setImportNotice('')} style={{ background: 'none', border: 'none', color: 'var(--success)', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>
            )}

            {/* List Title Input */}
            <div style={{ marginBottom: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={listTitle}
                onChange={(e) => setListTitle(e.target.value)}
                placeholder="Nom de la liste (ex: Vocabulaire Allemand PDF)"
                className="input-field"
                style={{ flex: 1, padding: '0.5rem 0.8rem', fontSize: '0.95rem' }}
              />
              {user && (
                <button
                  onClick={handleSaveManualList}
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.5rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  title="Sauvegarder dans 'Mes Listes'"
                >
                  💾 Enregistrer
                </button>
              )}
            </div>

            {/* Toolbar buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <label className="btn btn-secondary" style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: isUploading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📄 {isUploading ? 'Analyse...' : 'Importer un PDF'}</span>
                  <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
                </label>

                <button
                  onClick={() => setManualWords(prev => [...prev, { id: Date.now(), question: '', answer: '' }])}
                  className="btn btn-primary"
                  style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                >
                  + Ajouter une ligne
                </button>
              </div>

              {manualWords.length > 1 && (
                <button
                  onClick={() => {
                    if (window.confirm("Voulez-vous vraiment effacer tous les mots de l'éditeur ?")) {
                      setManualWords([{ id: Date.now(), question: '', answer: '' }]);
                      setImportNotice('');
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}
                >
                  🗑️ Vider la liste
                </button>
              )}
            </div>

            {/* Rules warning */}
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '10px', padding: '0.6rem 0.8rem', marginBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <span>💡</span>
                <span>Noms avec article (<strong style={{ color: 'var(--warning)' }}>der / die / das</strong>) • Remplacer <strong style={{ color: 'var(--warning)' }}>ß</strong> par <strong style={{ color: 'var(--warning)' }}>ss</strong>.</span>
              </div>
            </div>

            {/* Scrollable Table */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.2rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card, #1e1e2f)', zIndex: 5 }}>
                  <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                    <th style={{ padding: '0.4rem', width: '36px', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>#</th>
                    <th style={{ padding: '0.4rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Français / Anglais</th>
                    <th style={{ padding: '0.4rem', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Allemand (Réponse)</th>
                    <th style={{ width: '36px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {manualWords.map((w, idx) => (
                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.35rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.8rem' }}>{idx + 1}</td>
                      <td style={{ padding: '0.35rem' }}>
                        <input
                          type="text"
                          value={w.question}
                          onChange={(e) => setManualWords(prev => prev.map(x => x.id === w.id ? { ...x, question: e.target.value } : x))}
                          placeholder="ex: la maison / the house"
                          style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.88rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.35rem' }}>
                        <input
                          type="text"
                          value={w.answer}
                          onChange={(e) => setManualWords(prev => prev.map(x => x.id === w.id ? { ...x, answer: e.target.value } : x))}
                          placeholder="ex: das Haus"
                          style={{ width: '100%', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '0.4rem 0.6rem', color: 'var(--text-main)', fontSize: '0.88rem' }}
                        />
                      </td>
                      <td style={{ padding: '0.35rem', textAlign: 'center' }}>
                        <button onClick={() => setManualWords(prev => prev.filter(x => x.id !== w.id))} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '1rem', opacity: 0.7 }} title="Supprimer cette ligne">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowWordEditor(false)} className="btn btn-secondary" style={{ flex: 1 }}>Fermer</button>
              <button
                className="btn btn-success"
                style={{ flex: 2 }}
                onClick={() => {
                  const valid = manualWords.filter(w => w.question?.trim() && w.answer?.trim());
                  if (valid.length === 0) return alert('Ajoutez au moins un mot valide !');
                  handleStartDirectSession(valid.map((w, i) => ({ ...w, id: i + 1 })));
                  setShowWordEditor(false);
                }}
              >
                🚀 LANCER LA SESSION ({manualWords.filter(w => w.question?.trim() && w.answer?.trim()).length} mots)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Consultation Mots Ratés (Task 2) */}
      {showMistakesModal && (
        <div 
          className="modal-overlay" 
          onClick={() => setShowMistakesModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
          }}
        >
          <div 
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '100%',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              background: 'linear-gradient(145deg, #180c10 0%, #0d0608 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              borderRadius: '22px',
              padding: '1.8rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(239, 68, 68, 0.25)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.8rem' }}>💔</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.3rem', color: '#ffffff', fontWeight: 800 }}>
                    Dossier Rouge : Mots Ratés
                  </h3>
                  <span style={{ fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600 }}>
                    {failedWords.length} mot{failedWords.length > 1 ? 's' : ''} en attente de rédemption
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowMistakesModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* List of failed words */}
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', maxHeight: '48vh' }}>
              {failedWords.length === 0 ? (
                <div className="text-center text-muted" style={{ padding: '2rem' }}>
                  Aucun mot raté dans votre dossier.
                </div>
              ) : (
                failedWords.map((item, idx) => {
                  const resolved = resolveWordItem(item);

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        padding: '0.85rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fca5a5' }}>
                          🇩🇪 {resolved.germanWord}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.2rem' }}>
                          🇫🇷 {resolved.frenchPrompt}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#f87171',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap'
                      }}>
                        {resolved.count}x raté
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Purge Action Button */}
            <button
              type="button"
              className="vengeance-action-btn"
              disabled={failedWords.length === 0}
              onClick={() => {
                setShowMistakesModal(false);
                if (onStartVengeance) onStartVengeance();
              }}
              style={{ width: '100%', fontSize: '1.05rem', padding: '0.95rem' }}
            >
              ⚡ Lancer la Purge (Mur de Vengeance)
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
