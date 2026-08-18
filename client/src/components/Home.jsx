import { useState, useEffect } from 'react';
import { exampleLists } from '../data/exampleLists';
import { formatPlayerName, getClientPlayerKey } from '../utils/formatters';

export default function Home({ socket, playerName, setPlayerName, avatar, setAvatar, user, loginWithGoogle, logout, deleteAccount, activeTab, leaderboard, isGuest, setIsGuest, isAdmin, comingSoonFeaturesEnabled = false, onOpenAdmin }) {
  const [mainStep, setMainStep] = useState(1); // 1 = Prepare, 2 = Join
  const [prepTab, setPrepTab] = useState('pdf'); // 'pdf', 'text', 'examples', 'settings'
  const [joinCode, setJoinCode] = useState('');
  const [rawText, setRawText] = useState('la table = der Tisch\nla chaise = der Stuhl\nla maison = das Haus');
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [archivedLists, setArchivedLists] = useState([]);
  const [publicLists, setPublicLists] = useState([]);
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
        const words = data.vocabList.map((w, idx) => ({
          id: Date.now() + idx,
          question: w.question,
          answer: w.answer
        }));
        setManualWords(words);
        setListTitle(`Extraction Texte - ${new Date().toLocaleDateString()}`);
        setEditingListId(null);
        setShowWordEditor(true);
        setImportNotice(`✨ ${words.length} mots extraits avec succès ! Vous pouvez les modifier ou lancer la session.`);

        if (autoSaveEnabled && user) {
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
        const words = data.vocabList.map((w, idx) => ({
          id: Date.now() + idx,
          question: w.question,
          answer: w.answer
        }));
        setManualWords(words);
        setListTitle(`Thème: ${themeInput}`);
        setEditingListId(null);
        setShowWordEditor(true);
        setImportNotice(`🎉 ${words.length} mots générés sur le thème "${themeInput}" !`);

        if (autoSaveEnabled && user) {
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

            <div style={{ width: '100%', maxWidth: '300px', marginTop: '1rem', borderTop: '2px dashed rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {/* Arrow spinner with editable input */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '2px' }}>nb de mots</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '4px 8px' }}>
                    <button onClick={() => setSoloWordCount(v => Math.max(1, (parseInt(v) || 1) - 1))} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>&#9664;</button>
                    <input
                      type="number"
                      min="1"
                      value={soloWordCount}
                      onChange={(e) => setSoloWordCount(e.target.value)}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value);
                        const allWords = [];
                        exampleLists.forEach(l => allWords.push(...l.words));
                        publicLists.forEach(l => allWords.push(...l.words));
                        const max = allWords.length || 100;
                        setSoloWordCount(!val || val < 1 ? max : val);
                      }}
                      style={{ width: '40px', background: 'none', border: 'none', color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem', outline: 'none', MozAppearance: 'textfield' }}
                    />
                    <button onClick={() => setSoloWordCount(v => (parseInt(v) || 0) + 1)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>&#9654;</button>
                  </div>
                </div>
                <button className="btn btn-success" onClick={handlePlaySolo} style={{ flex: 1, padding: '0.8rem' }}>
                  JOUER SOLO
                </button>
              </div>
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

              {/* BOX 2 : Génération IA (unlocked for admin or if enabled) */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {!isAdmin && !comingSoonFeaturesEnabled && (
                  <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Bientôt disponible</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h4 style={{ margin: 0 }}>🎨 Génération IA</h4>
                  {isAdmin && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.2)', color: '#a78bfa', padding: '0.15rem 0.5rem', borderRadius: '8px', fontWeight: 'bold' }}>
                      👑 Accès Admin
                    </span>
                  )}
                </div>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Thème (ex: Voyage, Restaurant, Cuisine...)" 
                  value={themeInput} 
                  onChange={(e) => setThemeInput(e.target.value)} 
                  onKeyDown={(e) => { if (e.key === 'Enter' && (isAdmin || comingSoonFeaturesEnabled)) handleGenerateTheme(); }}
                  disabled={!isAdmin && !comingSoonFeaturesEnabled}
                  style={{ marginBottom: '0.8rem', padding: '0.7rem 0.9rem' }} 
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleGenerateTheme}
                  disabled={(!isAdmin && !comingSoonFeaturesEnabled) || isGeneratingTheme || !themeInput.trim()}
                  style={{ marginTop: 'auto' }}
                >
                  {isGeneratingTheme ? '⏳ Génération en cours...' : '🎨 Créer'}
                </button>
              </div>

              {/* BOX 3 : Coller du texte (unlocked for admin or if enabled) */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {!isAdmin && !comingSoonFeaturesEnabled && (
                  <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 10, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>Bientôt disponible</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                  <h4 style={{ margin: 0 }}>📝 Coller du Texte</h4>
                  {isAdmin && (
                    <span style={{ fontSize: '0.75rem', background: 'rgba(99,102,241,0.2)', color: '#a78bfa', padding: '0.15rem 0.5rem', borderRadius: '8px', fontWeight: 'bold' }}>
                      👑 Accès Admin
                    </span>
                  )}
                </div>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  value={rawText} 
                  onChange={(e) => setRawText(e.target.value)} 
                  disabled={!isAdmin && !comingSoonFeaturesEnabled}
                  placeholder="Collez ici votre texte ou liste (ex: chien = der Hund)..."
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', marginBottom: '0.8rem' }} 
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleExtractAI}
                  disabled={(!isAdmin && !comingSoonFeaturesEnabled) || isExtracting || !rawText.trim()}
                  style={{ marginTop: 'auto' }}
                >
                  {isExtracting ? '⏳ Extraction en cours...' : '⚡ Extraire avec IA'}
                </button>
              </div>

            </div>
          </div>

          {/* ---- WORD EDITOR MODAL ---- */}
          {showWordEditor && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '2rem 1rem', overflowY: 'auto' }}>
              <div className="card" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
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
                      <button onClick={() => handleStartDirectSession(list.words)} className="btn btn-success" style={{ padding: '0.5rem', flex: 1, fontSize: '0.85rem' }}>Jouer</button>
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

      {/* ------------------- PROFILE TAB ------------------- */}
      {activeTab === 'profile' && (
        <>
          <h2>Profil &amp; Paramètres</h2>
          
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
                maxLength={32}
                value={playerName}
                onChange={(e) => setPlayerName(formatPlayerName(e.target.value, 8))}
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

          {user && isAdmin && onOpenAdmin && (
            <div className="card" style={{ marginBottom: '1rem', background: 'rgba(99,102,241,0.08)', borderColor: 'rgba(99,102,241,0.3)' }}>
              <h3 style={{ marginBottom: '0.5rem', color: '#a78bfa' }}>🛡️ Administration</h3>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Accédez aux contrôles et réglages de l'application.
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
