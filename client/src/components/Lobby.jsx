import { useState, useEffect, useRef } from 'react';

export default function Lobby({ socket, session, players, isHost, setView, onlineUsers = [], playerName, avatar, user }) {
  const [activeSubTab, setActiveSubTab] = useState('chat'); // 'chat' or 'invite'
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedSockets, setInvitedSockets] = useState(new Set());
  const [copiedCode, setCopiedCode] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const chatBottomRef = useRef(null);

  const playerCount = Object.keys(players || {}).length;
  const isRoomFull = playerCount >= 2;

  // Auto-scroll chat on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to lobby chat messages
  useEffect(() => {
    const handleLobbyMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleInviteSent = ({ targetSocketId }) => {
      if (targetSocketId) {
        setInvitedSockets((prev) => new Set([...prev, targetSocketId]));
      }
    };

    socket.on('lobby_chat_message', handleLobbyMessage);
    socket.on('invite_sent_success', handleInviteSent);

    // Initial welcome message in chat
    setMessages([
      {
        id: 'welcome',
        isSystem: true,
        text: `Bienvenue dans la salle d'attente #${session?.id} ! Vous pouvez discuter ici en direct.`,
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
    socket.emit('start_game', session?.id);
  };

  const handleCopyCode = () => {
    if (session?.id) {
      navigator.clipboard.writeText(session.id);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputMsg.trim()) return;

    const displayName = playerName || (user?.displayName) || 'Moi';
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
    setInvitedSockets((prev) => new Set([...prev, targetUser.socketId]));
  };

  // Filter online users: exclude self, and filter by search query
  const sessionPlayerIds = Object.keys(players || {});
  const filteredOnlineUsers = onlineUsers.filter((u) => {
    if (u.socketId === socket.id) return false;
    // Don't show if already in current room
    if (sessionPlayerIds.includes(u.socketId)) return false;
    if (searchQuery.trim()) {
      return (u.name || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Header Card */}
      <div className="card" style={{ padding: '1.2rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' }}>
          <button 
            onClick={handleLeave}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}
          >
            ← Quitter
          </button>
          <h2 style={{ fontSize: '1.3rem', margin: 0, fontWeight: 800 }}>Salle d'attente</h2>
          <div style={{
            background: isRoomFull ? 'rgba(34, 197, 94, 0.15)' : 'rgba(99, 102, 241, 0.15)',
            border: `1px solid ${isRoomFull ? 'var(--success)' : 'var(--primary)'}`,
            padding: '0.3rem 0.8rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            color: isRoomFull ? 'var(--success)' : 'var(--primary)'
          }}>
            {playerCount}/2 Joueurs
          </div>
        </div>

        {/* Session Code & Share */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'var(--bg-main)',
          padding: '1.2rem',
          borderRadius: '16px',
          border: '2px solid var(--border-color)',
          textAlign: 'center'
        }}>
          <p className="text-muted" style={{ margin: '0 0 0.3rem 0', fontSize: '0.85rem', fontWeight: 'bold' }}>
            CODE DE SESSION
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <h1 style={{
              fontSize: 'clamp(2.2rem, 7vw, 3.2rem)',
              letterSpacing: '0.2em',
              margin: 0,
              color: 'var(--primary)',
              fontWeight: 900
            }}>
              {session?.id}
            </h1>
            <button
              onClick={handleCopyCode}
              className="btn btn-secondary"
              style={{
                width: 'auto',
                padding: '0.5rem 1rem',
                fontSize: '0.85rem',
                display: 'inline-flex',
                gap: '0.4rem',
                borderRadius: '10px'
              }}
            >
              {copiedCode ? '✓ Copié !' : '📋 Copier'}
            </button>
          </div>
        </div>

        {/* Players in current session */}
        <div style={{ marginTop: '1.5rem' }}>
          <h4 className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Joueurs dans la salle ({playerCount}/2)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem' }}>
            {Object.values(players || {}).map((p, i) => (
              <div 
                key={p.id} 
                style={{ 
                  padding: '0.9rem 1.2rem', 
                  background: 'var(--bg-surface-hover)', 
                  borderRadius: '14px',
                  border: `2px solid ${i === 0 ? 'var(--primary)' : 'var(--border-color)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{i === 0 ? '👑' : '⚔️'}</span>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>
                      {p.name} {p.id === socket.id ? '(Vous)' : ''}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: i === 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {i === 0 ? 'Hôte de la partie' : 'Adversaire'}
                    </div>
                  </div>
                </div>

                {isHost && p.id !== socket.id && (
                  <button
                    onClick={() => socket.emit('kick_player', { sessionId: session.id, playerId: p.id })}
                    style={{
                      background: 'var(--danger)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.3rem 0.6rem',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                    title="Expulser de la salle"
                  >
                    ✕ Expulser
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Controls */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
          {isHost ? (
            <button 
              className="btn btn-primary" 
              onClick={handleStart}
              style={{ fontSize: '1.1rem', padding: '0.9rem' }}
            >
              {playerCount === 1 ? '🚀 Jouer en Solo' : '⚔️ Démarrer le Duel !'}
            </button>
          ) : (
            <div style={{
              padding: '0.8rem 1rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--warning)',
              borderRadius: '12px',
              color: 'var(--warning)',
              fontWeight: 'bold',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <span className="pulse">⏳</span> En attente de l'hôte pour lancer la partie...
            </div>
          )}
        </div>
      </div>

      {/* Interactive Tabs: Chat Commun vs Inviter des Joueurs */}
      <div className="card" style={{ padding: '1.2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '0.8rem',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`nav-item ${activeSubTab === 'chat' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.95rem',
              borderRadius: '10px',
              border: 'none',
              background: activeSubTab === 'chat' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeSubTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>💬</span> Chat de la salle
            {messages.length > 1 && (
              <span style={{
                background: 'var(--primary)',
                color: 'white',
                fontSize: '0.75rem',
                borderRadius: '999px',
                padding: '0.1rem 0.5rem'
              }}>
                {messages.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('invite')}
            className={`nav-item ${activeSubTab === 'invite' ? 'active' : ''}`}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.95rem',
              borderRadius: '10px',
              border: 'none',
              background: activeSubTab === 'invite' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeSubTab === 'invite' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span>👥</span> Joueurs connectés ({filteredOnlineUsers.length})
          </button>
        </div>

        {/* TAB 1: ROOM CHAT */}
        {activeSubTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '320px' }}>
            {/* Messages Scroll Area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              paddingRight: '0.5rem',
              marginBottom: '1rem'
            }}>
              {messages.map((m) => {
                if (m.isSystem) {
                  return (
                    <div
                      key={m.id}
                      style={{
                        textAlign: 'center',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        background: 'var(--bg-main)',
                        padding: '0.4rem 0.8rem',
                        borderRadius: '8px',
                        margin: '0.2rem auto',
                        maxWidth: '90%',
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
                      maxWidth: '80%',
                      alignSelf: isMe ? 'flex-end' : 'flex-start'
                    }}
                  >
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      marginBottom: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}>
                      <span>{m.senderAvatar || '👤'}</span>
                      <span>{isMe ? 'Vous' : m.senderName}</span>
                      <span style={{ opacity: 0.6 }}>• {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div style={{
                      padding: '0.6rem 0.9rem',
                      borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                      background: isMe ? 'var(--primary)' : 'var(--bg-main)',
                      color: isMe ? '#ffffff' : 'var(--text-main)',
                      border: isMe ? 'none' : '1px solid var(--border-color)',
                      fontSize: '0.9rem',
                      wordBreak: 'break-word',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Écrire un message dans la salle..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                maxLength={300}
                style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!inputMsg.trim()}
                style={{ width: 'auto', padding: '0.6rem 1.2rem', fontSize: '0.9rem' }}
              >
                Envoyer
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: CONNECTED PLAYERS & INVITATIONS */}
        {activeSubTab === 'invite' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '320px' }}>
            {/* Username Search Filter */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="input-field"
                placeholder="🔍 Rechercher un joueur par pseudo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ padding: '0.6rem 1rem', fontSize: '0.9rem' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Players List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.6rem',
              paddingRight: '0.3rem'
            }}>
              {filteredOnlineUsers.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem 1rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.9rem'
                }}>
                  {searchQuery ? (
                    <p>Aucun joueur ne correspond à « {searchQuery} ».</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>👥</p>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>Aucun autre joueur connecté en ce moment.</p>
                      <p style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>
                        Partagez votre code de session <strong style={{ color: 'var(--primary)' }}>{session?.id}</strong> avec un ami !
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredOnlineUsers.map((u) => {
                  const isInvited = invitedSockets.has(u.socketId);
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
                        borderRadius: '12px',
                        padding: '0.6rem 0.9rem',
                        gap: '0.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontSize: '1.3rem' }}>{u.avatar || '👤'}</span>
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-main)' }}>
                            {u.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: isBusy ? 'var(--warning)' : 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span>{isBusy ? '🟡' : '🟢'}</span>
                            <span>{isBusy ? 'En partie' : 'En ligne / Disponible'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInvitePlayer(u)}
                        disabled={isInvited || isRoomFull}
                        className={`btn ${isInvited ? 'btn-secondary' : 'btn-primary'}`}
                        style={{
                          width: 'auto',
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        {isInvited ? '✓ Invité' : '✉️ Inviter'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
