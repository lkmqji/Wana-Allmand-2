import { useState, useEffect, useRef } from 'react';

export default function Lobby({ socket, session, players, isHost, setView, onlineUsers = [], playerName, avatar, user }) {
  // Tabs: 'chat', 'online', 'words', 'settings'
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedSockets, setInvitedSockets] = useState({});
  const [copiedCode, setCopiedCode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const chatBottomRef = useRef(null);

  // Editable session state (synced with session)
  const [words, setWords] = useState(session?.vocabList || []);
  const [settings, setSettings] = useState(session?.settings || { rounds: (session?.vocabList || []).length || 10, timePerWord: 15, powerupsEnabled: false });
  const [savingList, setSavingList] = useState(false);
  const [customListName, setCustomListName] = useState('');

  const playerCount = Object.keys(players || {}).length;
  const isRoomFull = playerCount >= 2;

  // Sync state when session is updated from server
  useEffect(() => {
    if (session?.vocabList) setWords(session.vocabList);
    if (session?.settings) setSettings(session.settings);
  }, [session]);

  // Auto-scroll chat on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to lobby chat messages & invite status
  useEffect(() => {
    const handleLobbyMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleInviteSent = ({ targetSocketId }) => {
      if (targetSocketId) {
        setInvitedSockets((prev) => ({ ...prev, [targetSocketId]: true }));
        // Allow re-inviting after 8s
        setTimeout(() => {
          setInvitedSockets((prev) => {
            const next = { ...prev };
            delete next[targetSocketId];
            return next;
          });
        }, 8000);
      }
    };

    socket.on('lobby_chat_message', handleLobbyMessage);
    socket.on('invite_sent_success', handleInviteSent);

    // Initial welcome message
    setMessages([
      {
        id: 'welcome',
        isSystem: true,
        text: `🎮 Salle #${session?.id} ouverte. Chattez, personnalisez vos mots & invitez vos amis !`,
        timestamp: Date.now()
      }
    ]);

    return () => {
      socket.off('lobby_chat_message', handleLobbyMessage);
      socket.off('invite_sent_success', handleInviteSent);
    };
  }, [socket, session?.id]);

  const handleLeave = () => {
    socket.emit('leave_session', session?.id);
    setView('home');
  };

  const handleStart = () => {
    if (words.length === 0) {
      alert("Ajoutez au moins 1 mot avant de lancer la partie !");
      return;
    }
    socket.emit('start_game', session?.id);
  };

  const handleCopyCode = () => {
    if (session?.id) {
      navigator.clipboard.writeText(session.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputMsg.trim()) return;

    const displayName = playerName || user?.displayName || 'Moi';
    socket.emit('send_lobby_chat', {
      sessionId: session?.id,
      text: inputMsg.trim(),
      senderName: displayName,
      senderAvatar: avatar || '🦊'
    });
    setInputMsg('');
  };

  const handleInvitePlayer = (targetUser) => {
    if (!targetUser?.socketId) return;
    socket.emit('send_game_invite', {
      targetSocketId: targetUser.socketId,
      targetFirebaseId: targetUser.firebaseId,
      sessionId: session?.id
    });
    setInvitedSockets((prev) => ({ ...prev, [targetUser.socketId]: true }));
  };

  // Words management (Host only)
  const handleEditWord = (index, field, value) => {
    const updated = [...words];
    updated[index] = { ...updated[index], [field]: value };
    setWords(updated);
    socket.emit('update_session_words', {
      sessionId: session?.id,
      vocabList: updated,
      changeDescription: `Mot #${index + 1} modifié : "${updated[index].question || '...'} = ${updated[index].answer || '...'}"`
    });
  };

  const handleAddWord = () => {
    const newWord = { id: Date.now(), question: '', answer: '' };
    const updated = [...words, newWord];
    setWords(updated);
    socket.emit('update_session_words', {
      sessionId: session?.id,
      vocabList: updated,
      changeDescription: `Nouveau mot ajouté à la liste (${updated.length} mots au total)`
    });
  };

  const handleDeleteWord = (index) => {
    const deletedWord = words[index];
    const updated = words.filter((_, i) => i !== index);
    setWords(updated);
    socket.emit('update_session_words', {
      sessionId: session?.id,
      vocabList: updated,
      changeDescription: `Mot supprimé : "${deletedWord.question || '...'}" (${updated.length} mots restants)`
    });
  };

  // Settings management (Host only)
  const handleUpdateSettings = (newSettings, desc) => {
    setSettings(newSettings);
    socket.emit('update_session_settings', {
      sessionId: session?.id,
      settings: newSettings,
      changeDescription: desc
    });
  };

  const handleSaveListToAccount = async () => {
    if (!user) return alert("Connectez-vous pour enregistrer cette liste.");
    const nameToUse = customListName.trim() || `Liste #${session?.id}`;
    const validWords = words.filter(w => w.question.trim() && w.answer.trim());
    if (validWords.length === 0) return alert("Aucun mot valide à enregistrer.");

    setSavingList(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, name: nameToUse, words: validWords })
      });
      if (res.ok) {
        alert("Liste enregistrée dans votre compte avec succès ! 🎉");
        setCustomListName('');
      } else {
        alert("Erreur lors de la sauvegarde.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau.");
    } finally {
      setSavingList(false);
    }
  };

  // Filter online users: exclude self and players currently in this room
  const sessionPlayerIds = Object.keys(players || {});
  const filteredOnlineUsers = onlineUsers.filter((u) => {
    if (u.socketId === socket.id) return false;
    if (sessionPlayerIds.includes(u.socketId)) return false;
    if (searchQuery.trim()) {
      return (u.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* =========================================================
          SECTION DU HAUT : ONGLETS (Chat, Joueurs Connectés, Mots, Paramètres)
         ========================================================= */}
      <div className="card" style={{ padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', minHeight: '340px' }}>
        
        {/* Navigation Tabs Header */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '0.6rem',
          marginBottom: '0.8rem',
          flexWrap: 'wrap'
        }}>
          {/* Tab: Chat */}
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.45rem 0.8rem',
              fontSize: '0.85rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'chat' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>💬</span> Chat ({messages.length})
          </button>

          {/* Tab: Joueurs en ligne */}
          <button
            onClick={() => setActiveTab('online')}
            style={{
              padding: '0.45rem 0.8rem',
              fontSize: '0.85rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'online' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'online' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>👥</span> Inviter ({filteredOnlineUsers.length})
          </button>

          {/* Tab: Liste des mots */}
          <button
            onClick={() => setActiveTab('words')}
            style={{
              padding: '0.45rem 0.8rem',
              fontSize: '0.85rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'words' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'words' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>📝</span> Mots ({words.length})
          </button>

          {/* Tab: Paramètres */}
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '0.45rem 0.8rem',
              fontSize: '0.85rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'settings' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
          >
            <span>⚙️</span> Paramètres ({settings.timePerWord}s)
          </button>
        </div>

        {/* ----------------- ONGLET 1 : CHAT DE LA SALLE ----------------- */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '260px' }}>
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              paddingRight: '0.4rem',
              marginBottom: '0.6rem'
            }}>
              {messages.map((m) => {
                if (m.isSystem) {
                  return (
                    <div
                      key={m.id}
                      style={{
                        textAlign: 'center',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-main)',
                        padding: '0.3rem 0.6rem',
                        borderRadius: '8px',
                        margin: '0.1rem auto',
                        maxWidth: '92%',
                        border: '1px dashed var(--border-color)'
                      }}
                    >
                      {m.text}
                    </div>
                  );
                }

                const isMe = m.senderId === socket.id;

                return (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isMe ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      fontSize: '0.7rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.15rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>{m.senderAvatar || '👤'}</span>
                      <span>{isMe ? 'Vous' : m.senderName}</span>
                      <span style={{ opacity: 0.6 }}>• {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div style={{
                      padding: '0.45rem 0.75rem',
                      borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                      background: isMe ? 'var(--primary)' : 'var(--bg-main)',
                      color: isMe ? '#ffffff' : 'var(--text-main)',
                      border: isMe ? 'none' : '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      wordBreak: 'break-word'
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Message */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Écrire un message à la salle..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                maxLength={250}
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!inputMsg.trim()}
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Envoyer
              </button>
            </form>
          </div>
        )}

        {/* ----------------- ONGLET 2 : JOUEURS CONNECTES & INVITATIONS ----------------- */}
        {activeTab === 'online' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', height: '260px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="🔍 Rechercher par pseudo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '0.3rem'
            }}>
              {filteredOnlineUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {searchQuery ? (
                    <p>Aucun joueur ne correspond à « {searchQuery} ».</p>
                  ) : (
                    <>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Aucun autre joueur connecté.</p>
                      <p style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                        Partagez le code <strong style={{ color: 'var(--primary)' }}>{session?.id}</strong> pour inviter un ami !
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredOnlineUsers.map((u) => {
                  const isInvited = Boolean(invitedSockets[u.socketId]);
                  const isBusy = u.status === 'in_game' || (u.status === 'in_lobby' && u.sessionId !== session?.id);

                  return (
                    <div
                      key={u.socketId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '0.45rem 0.75rem',
                        gap: '0.6rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{u.avatar || '👤'}</span>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            {u.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: isBusy ? 'var(--warning)' : 'var(--success)' }}>
                            {isBusy ? '🟡 En partie' : '🟢 Disponible'}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInvitePlayer(u)}
                        disabled={isRoomFull}
                        className={`btn ${isInvited ? 'btn-secondary' : 'btn-primary'}`}
                        style={{
                          width: 'auto',
                          padding: '0.35rem 0.7rem',
                          fontSize: '0.75rem',
                          borderRadius: '8px'
                        }}
                      >
                        {isInvited ? '✓ Envoyé' : '✉️ Inviter'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ----------------- ONGLET 3 : MOTS DE LA SESSION ----------------- */}
        {activeTab === 'words' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '260px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.4rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)'
            }}>
              <span>{isHost ? '✏️ Cliquez pour modifier les mots en direct :' : '👀 Mots prévus pour ce duel :'}</span>
              {isHost && (
                <button
                  onClick={handleAddWord}
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                >
                  + Ajouter un mot
                </button>
              )}
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '0.3rem',
              marginBottom: '0.4rem'
            }}>
              {words.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Aucun mot dans la session.
                </div>
              ) : (
                words.map((w, idx) => (
                  <div
                    key={w.id || idx}
                    style={{
                      display: 'flex',
                      gap: '0.4rem',
                      alignItems: 'center',
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.3rem 0.5rem'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '18px', textAlign: 'center' }}>
                      {idx + 1}
                    </span>

                    <input
                      type="text"
                      className="input-field"
                      value={w.question}
                      disabled={!isHost}
                      onChange={(e) => handleEditWord(idx, 'question', e.target.value)}
                      placeholder="Français"
                      style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }}
                    />

                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>➔</span>

                    <input
                      type="text"
                      className="input-field"
                      value={w.answer}
                      disabled={!isHost}
                      onChange={(e) => handleEditWord(idx, 'answer', e.target.value)}
                      placeholder="Allemand"
                      style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px' }}
                    />

                    {isHost && (
                      <button
                        onClick={() => handleDeleteWord(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '0 0.3rem',
                          fontSize: '0.85rem'
                        }}
                        title="Supprimer ce mot"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Quick Save List to account */}
            {user && isHost && (
              <div style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.3rem', borderTop: '1px solid var(--border-color)' }}>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nom pour sauvegarder la liste..."
                  value={customListName}
                  onChange={(e) => setCustomListName(e.target.value)}
                  style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '6px' }}
                />
                <button
                  onClick={handleSaveListToAccount}
                  disabled={savingList}
                  className="btn btn-secondary"
                  style={{ width: 'auto', padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                >
                  {savingList ? '...' : '💾 Sauvegarder'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ----------------- ONGLET 4 : PARAMETRES DU DUEL ----------------- */}
        {activeTab === 'settings' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', height: '260px', overflowY: 'auto' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.8rem',
              background: 'var(--bg-main)',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              {/* Rounds */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Nombre de questions :
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={settings.rounds || words.length}
                  disabled={!isHost}
                  min={1}
                  max={Math.max(1, words.length)}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(words.length, parseInt(e.target.value) || 1));
                    handleUpdateSettings({ ...settings, rounds: val }, `Nombre de questions réglé à ${val}`);
                  }}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Max : {words.length} mots</span>
              </div>

              {/* Time per word */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Temps par mot :
                </label>
                <select
                  className="input-field"
                  value={settings.timePerWord || 15}
                  disabled={!isHost}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    handleUpdateSettings({ ...settings, timePerWord: val }, `Temps par mot réglé à ${val}s`);
                  }}
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                >
                  <option value={10}>⚡ 10s (Rapide)</option>
                  <option value={15}>⏱️ 15s (Normal)</option>
                  <option value={20}>🧘 20s (Tranquille)</option>
                  <option value={30}>🐢 30s (Lent)</option>
                </select>
              </div>

              {/* Powerups toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Pouvoirs de gel 🥶 :
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isHost ? 'pointer' : 'default' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.powerupsEnabled)}
                    disabled={!isHost}
                    onChange={(e) => {
                      const val = e.target.checked;
                      handleUpdateSettings({ ...settings, powerupsEnabled: val }, `Pouvoirs ${val ? 'activés 🥶' : 'désactivés'}`);
                    }}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: settings.powerupsEnabled ? 'var(--success)' : 'var(--text-muted)' }}>
                    {settings.powerupsEnabled ? 'Activé' : 'Désactivé'}
                  </span>
                </label>
              </div>
            </div>

            {!isHost && (
              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                🔒 Seul l'hôte peut modifier ces paramètres.
              </div>
            )}
          </div>
        )}

      </div>

      {/* =========================================================
          SECTION DU BAS : CODE DE SESSION, JOUEURS DE LA SALLE & BOUTONS
         ========================================================= */}
      <div className="card" style={{ padding: '1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        
        {/* Code & Players Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* Compact Session Code */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            padding: '0.4rem 0.8rem',
            borderRadius: '12px'
          }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>CODE :</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '2px' }}>
              {session?.id}
            </span>
            <button
              onClick={handleCopyCode}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '6px' }}
            >
              {copiedCode ? '✓ Copié' : '📋'}
            </button>
          </div>

          {/* Connected players in this room */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.values(players || {}).map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.35rem 0.7rem',
                  background: 'var(--bg-main)',
                  border: `1.5px solid ${i === 0 ? 'var(--primary)' : 'var(--border-color)'}`,
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold'
                }}
              >
                <span>{i === 0 ? '👑' : '⚔️'}</span>
                <span>{p.name} {p.id === socket.id ? '(Vous)' : ''}</span>

                {isHost && p.id !== socket.id && (
                  <button
                    onClick={() => socket.emit('kick_player', { sessionId: session.id, playerId: p.id })}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      marginLeft: '0.2rem'
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

        {/* Action Controls Row */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginTop: '0.4rem' }}>
          <button
            onClick={handleLeave}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.6rem 1rem', fontSize: '0.85rem' }}
          >
            ← Quitter
          </button>

          {isHost ? (
            <button
              className="btn btn-primary"
              onClick={handleStart}
              style={{ flex: 1, padding: '0.6rem 1.2rem', fontSize: '0.95rem' }}
            >
              {playerCount === 1 ? '🚀 Jouer en Solo' : '⚔️ Démarrer le Duel !'}
            </button>
          ) : (
            <div style={{
              flex: 1,
              padding: '0.6rem 1rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--warning)',
              borderRadius: '12px',
              color: 'var(--warning)',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textAlign: 'center'
            }}>
              ⏳ En attente de l'hôte pour démarrer...
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
