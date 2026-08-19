import { useState, useEffect, useRef } from 'react';
import { exampleLists, getAllDefaultWords } from '../data/exampleLists';
import { formatPlayerName, extractEmoji, generateBurstParticles } from '../utils/formatters';
import { useSoundEffects } from '../context/AudioContext';

export default function Lobby({ socket, session, players, isHost, setView, onlineUsers = [], playerName, avatar, user, chatMessages = [], setChatMessages }) {
  const { playAlert, playMessageSent, playReactionBurst } = useSoundEffects();
  // Tabs: 'chat', 'online', 'words', 'settings'
  const [activeTab, setActiveTab] = useState('chat');
  const [searchQuery, setSearchQuery] = useState('');
  const [invitedSockets, setInvitedSockets] = useState({});
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const messages = chatMessages;
  const [inputMsg, setInputMsg] = useState('');
  const chatBottomRef = useRef(null);

  // In-lobby chat notification toast & unread counter for other tabs
  const [lobbyChatToast, setLobbyChatToast] = useState(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Sound alert when an opponent joins the lobby
  const prevPlayerCountRef = useRef(Object.keys(players || {}).length);
  useEffect(() => {
    const currentCount = Object.keys(players || {}).length;
    if (currentCount > prevPlayerCountRef.current && currentCount >= 2) {
      playAlert();
    }
    prevPlayerCountRef.current = currentCount;
  }, [players, playAlert]);

  useEffect(() => {
    const handlePlayerJoined = () => {
      playAlert();
    };
    socket.on('player_joined', handlePlayerJoined);
    return () => {
      socket.off('player_joined', handlePlayerJoined);
    };
  }, [socket, playAlert]);

  // Auto-dismiss Lobby chat toast after 4s
  useEffect(() => {
    if (lobbyChatToast) {
      const timer = setTimeout(() => {
        setLobbyChatToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [lobbyChatToast]);

  // Reset unread count when switching to chat tab
  useEffect(() => {
    if (activeTab === 'chat') {
      setUnreadChatCount(0);
      setLobbyChatToast(null);
    }
  }, [activeTab]);

  // Editable session state
  const [words, setWords] = useState(session?.vocabList || []);
  const [settings, setSettings] = useState(session?.settings || { rounds: (session?.vocabList || []).length || 10, timePerWord: 15, powerupsEnabled: false });
  const [savingList, setSavingList] = useState(false);
  const [customListName, setCustomListName] = useState('');

  // Community list picker state
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);
  const [publicLists, setPublicLists] = useState([]);
  const [loadingPublicLists, setLoadingPublicLists] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // Input states for free-typing and erasing
  const [wordCountInput, setWordCountInput] = useState(String(session?.vocabList?.length || 10));
  const [roundsInput, setRoundsInput] = useState(String(session?.settings?.rounds || session?.vocabList?.length || 10));

  // Keep a ref of original words to detect real changes on blur
  const wordsRef = useRef(session?.vocabList || []);

  const playerCount = Object.keys(players || {}).length;
  const isRoomFull = playerCount >= 2;

  // Find host player name
  const hostPlayer = Object.values(players || {}).find(p => p.id === session?.hostId) || Object.values(players || {})[0];
  const hostDisplayName = formatPlayerName(hostPlayer?.name) || "l'hôte";

  // Sync state when session is updated from server
  useEffect(() => {
    if (session?.vocabList) {
      setWords(session.vocabList);
      wordsRef.current = session.vocabList;
      setWordCountInput(String(session.vocabList.length));
    }
    if (session?.settings) {
      setSettings(session.settings);
      setRoundsInput(String(session.settings.rounds || session.vocabList?.length || 10));
    }
  }, [session]);

  useEffect(() => {
    setWordCountInput(String(words.length));
  }, [words.length]);

  useEffect(() => {
    setRoundsInput(String(settings.rounds || words.length));
  }, [settings.rounds, words.length]);

  // Request online users & public lists on lobby mount
  useEffect(() => {
    socket.emit('get_online_users');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    fetch(`${API_URL}/api/lists/public`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setPublicLists(data);
      })
      .catch(console.error);
  }, [socket]);

  // Fetch public community lists when modal opens
  useEffect(() => {
    if (showCommunityPicker) {
      setLoadingPublicLists(true);
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      fetch(`${API_URL}/api/lists/public`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setPublicLists(data);
        })
        .catch(console.error)
        .finally(() => setLoadingPublicLists(false));
    }
  }, [showCommunityPicker]);

  // Calculate full vocabulary pool available across current session, example chapters & community lists
  const totalAvailablePool = getAllDefaultWords([
    { words: session?.vocabList || [] },
    { words: words || [] },
    ...publicLists
  ]);
  const maxAvailableWordsCount = Math.max(words.length, totalAvailablePool.length);

  // Floating reactions burst state & 5s cooldown
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [reactionCooldown, setReactionCooldown] = useState(0);

  // Cooldown countdown ticker
  useEffect(() => {
    if (reactionCooldown > 0) {
      const timer = setInterval(() => {
        setReactionCooldown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [reactionCooldown]);

  useEffect(() => {
    const handleReactionBurst = (data) => {
      playReactionBurst();
      if (data?.particles && Array.isArray(data.particles)) {
        setFloatingReactions(prev => [...prev, ...data.particles]);
        setTimeout(() => {
          const idsToRemove = new Set(data.particles.map(p => p.id));
          setFloatingReactions(prev => prev.filter(r => !idsToRemove.has(r.id)));
        }, 2500);
      } else if (data?.emoji) {
        const { particles } = generateBurstParticles(data.emoji);
        setFloatingReactions(prev => [...prev, ...particles]);
        setTimeout(() => {
          const idsToRemove = new Set(particles.map(p => p.id));
          setFloatingReactions(prev => prev.filter(r => !idsToRemove.has(r.id)));
        }, 2500);
      }
    };

    socket.on('floating_reaction_burst', handleReactionBurst);
    socket.on('floating_reaction', handleReactionBurst);
    return () => {
      socket.off('floating_reaction_burst', handleReactionBurst);
      socket.off('floating_reaction', handleReactionBurst);
    };
  }, [socket, playReactionBurst]);

  const handleSendReaction = (rawTextOrEmoji) => {
    if (reactionCooldown > 0 || !session?.id) return;
    const currentName = formatPlayerName(playerName || user?.displayName || 'Moi');
    
    // Play sound on local reaction send
    playReactionBurst();

    // Extract pure emoji & generate 8 full-screen particles
    const cleanEmoji = extractEmoji(rawTextOrEmoji);
    const { particles } = generateBurstParticles(cleanEmoji);;

    // Instant local feedback for sender
    setFloatingReactions(prev => [...prev, ...particles]);
    setTimeout(() => {
      const idsToRemove = new Set(particles.map(p => p.id));
      setFloatingReactions(prev => prev.filter(r => !idsToRemove.has(r.id)));
    }, 2500);

    // Broadcast pure emoji and particles to Opponent
    socket.emit('send_reaction_burst', {
      sessionId: session.id,
      emoji: cleanEmoji,
      particles,
      senderName: currentName
    });

    setReactionCooldown(5);
  };

  // Auto-scroll chat on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen to lobby chat messages & invite confirmations
  useEffect(() => {
    const handleLobbyMessage = (msg) => {
      if (!msg) return;
      if (setChatMessages) {
        setChatMessages((prev) => {
          if (msg.id && prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // If player is on 'words', 'online', or 'settings' and message is from another player, show toast & update badge
      if (activeTab !== 'chat' && msg.senderId && msg.senderId !== socket.id && !msg.isSystem) {
        setUnreadChatCount((prev) => prev + 1);
        setLobbyChatToast({
          id: msg.id || Date.now(),
          senderAvatar: msg.senderAvatar || '💬',
          senderName: formatPlayerName(msg.senderName || 'Joueur'),
          text: msg.text
        });
      }
    };

    const handleInviteSent = ({ targetSocketId }) => {
      if (targetSocketId) {
        setInvitedSockets((prev) => ({ ...prev, [targetSocketId]: true }));
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

    return () => {
      socket.off('lobby_chat_message', handleLobbyMessage);
      socket.off('invite_sent_success', handleInviteSent);
    };
  }, [socket, session?.id, setChatMessages, activeTab]);

  const handleLeave = () => {
    socket.emit('leave_session', session?.id);
    if (setChatMessages) setChatMessages([]);
    setView('home');
  };

  const handleStart = () => {
    const validWords = words.filter(w => w.question?.trim() && w.answer?.trim());
    if (validWords.length === 0) {
      alert("Ajoutez au moins 1 mot valide avant de lancer la partie !");
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

  const handleCopyInvite = () => {
    if (session?.id) {
      navigator.clipboard.writeText(`Rejoins mon duel d'allemand ! Code : ${session.id}`);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputMsg.trim()) return;

    playMessageSent();
    const displayName = formatPlayerName(playerName || user?.displayName || 'Moi');
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

  // Local word typing (No chat spam during typing)
  const handleLocalWordChange = (index, field, value) => {
    const updated = [...words];
    updated[index] = { ...updated[index], [field]: value };
    setWords(updated);
  };

  // Commit word change ONLY on blur / Enter
  const handleCommitWordChange = (index) => {
    const word = words[index];
    const original = wordsRef.current[index];

    // Check if changed
    if (!original || original.question !== word.question || original.answer !== word.answer) {
      wordsRef.current = [...words];
      socket.emit('update_session_words', {
        sessionId: session?.id,
        vocabList: words,
        changeDescription: `Mot #${index + 1} mis à jour : "${word.question || '...'} = ${word.answer || '...'}"`
      });
    }
  };

  const handleAddWord = () => {
    const newWord = { id: Date.now(), question: '', answer: '' };
    const updated = [...words, newWord];
    setWords(updated);
    wordsRef.current = updated;
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
    wordsRef.current = updated;
    socket.emit('update_session_words', {
      sessionId: session?.id,
      vocabList: updated,
      changeDescription: `Mot supprimé : "${deletedWord?.question || '...'}" (${updated.length} mots restants)`
    });
  };

  // 1. Host settings: Adjust total word count with random word selection
  const handleWordCountChange = (newCount) => {
    if (!isHost || newCount < 1) return;
    let updated = [...words];

    if (newCount > words.length) {
      // Pick extra random words from the unified vocabulary pool (current list + default chapters + community lists)
      const pool = totalAvailablePool.filter(
        pw => !updated.some(uw => uw.question.toLowerCase() === pw.question.toLowerCase())
      );
      const shuffledPool = pool.sort(() => Math.random() - 0.5);
      const needed = newCount - words.length;
      const added = shuffledPool.slice(0, needed).map((w, i) => ({ ...w, id: words.length + i + 1 }));
      updated = [...updated, ...added];
    } else if (newCount < words.length) {
      updated = updated.slice(0, newCount);
    }

    const newSettings = { ...settings, rounds: Math.min(newCount, updated.length) };
    setWords(updated);
    wordsRef.current = updated;
    setSettings(newSettings);

    socket.emit('update_session_words', {
      sessionId: session?.id,
      vocabList: updated,
      changeDescription: `Nombre de mots ajusté à ${updated.length} (sélection aléatoire) 🎲`
    });

    socket.emit('update_session_settings', {
      sessionId: session?.id,
      settings: newSettings,
      changeDescription: `Partie configurée à ${newSettings.rounds} questions`
    });
  };

  // 2. Shuffle all words at once
  const handleShuffleWords = () => {
    if (words.length <= 1) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5).map((w, idx) => ({ ...w, id: idx + 1 }));
    setWords(shuffled);
    wordsRef.current = shuffled;
    socket.emit('update_session_words', {
      sessionId: session?.id,
      vocabList: shuffled,
      changeDescription: `L'hôte a mélangé la liste des mots (${shuffled.length} mots) 🎲`
    });
  };

  // 3. Load chosen list from community / default library
  const handleLoadPredefinedList = (selectedList) => {
    if (!selectedList?.words || selectedList.words.length === 0) return;
    const formatted = selectedList.words.map((w, i) => ({ ...w, id: i + 1 }));
    const newSettings = { ...settings, rounds: formatted.length };

    setWords(formatted);
    wordsRef.current = formatted;
    setSettings(newSettings);
    setShowCommunityPicker(false);

    socket.emit('update_session_words', {
      sessionId: session?.id,
      vocabList: formatted,
      changeDescription: `L'hôte a chargé la liste : "${selectedList.title || selectedList.name}" (${formatted.length} mots) 📚`
    });

    socket.emit('update_session_settings', {
      sessionId: session?.id,
      settings: newSettings,
      changeDescription: `Nombre de questions ajusté à ${formatted.length}`
    });
  };

  // 4. Upload and parse PDF directly in lobby
  const handleUploadPdfInLobby = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    setIsUploadingPdf(true);
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
        const formatted = data.vocabList.map((w, idx) => ({ ...w, id: idx + 1 }));
        const newSettings = { ...settings, rounds: Math.min(settings.rounds || 10, formatted.length) };
        setWords(formatted);
        wordsRef.current = formatted;
        setSettings(newSettings);

        socket.emit('update_session_words', {
          sessionId: session?.id,
          vocabList: formatted,
          changeDescription: `L'hôte a importé un PDF "${file.name}" (${formatted.length} mots) 📄`
        });
      } else {
        alert("Aucun mot de vocabulaire trouvé dans ce PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'analyse du PDF");
    } finally {
      setIsUploadingPdf(false);
      if (e.target) e.target.value = '';
    }
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
    const validWords = words.filter(w => w.question?.trim() && w.answer?.trim());
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

  const sessionPlayerList = Object.values(players || {});
  const hostPlayerObj = sessionPlayerList.find(p => p.id === session?.hostId) || sessionPlayerList[0] || { name: playerName || 'Hôte', avatar: avatar || '🦊', id: socket.id };
  const opponentPlayerObj = sessionPlayerList.find(p => p.id !== hostPlayerObj?.id) || null;

  return (
    <div style={{
      width: '100%',
      maxWidth: '820px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      paddingBottom: '1.5rem'
    }}>

      {/* =========================================================
          TASK 4 : ARÈNE ESPORT (STREET FIGHTER / SMASH BROS STYLE)
         ========================================================= */}
      <div className="card card-arena arena-main-card" style={{
        padding: '1.25rem 1rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Top Arena Header: Title & Room Code */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', padding: '0 0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.1rem' }}>🥊</span>
            <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Arène de Duel
            </span>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            padding: '0.25rem 0.6rem',
            borderRadius: '10px'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>SALLE :</span>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--primary)', letterSpacing: '1.5px' }}>
              {session?.id}
            </span>
            <button
              onClick={handleCopyCode}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.1rem 0.4rem', fontSize: '0.7rem', borderRadius: '6px' }}
              title="Copier le code de la salle"
            >
              {copiedCode ? '✓' : '📋'}
            </button>
          </div>
        </div>

        {/* Central Versus Arena Grid */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.6rem',
          position: 'relative'
        }}>
          
          {/* LEFT: HOST PLAYER (TASK 1: PERFECT VERTICAL STACK & CENTERING) */}
          <div className="esport-podium host-active">
            <div style={{
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              fontSize: '0.65rem',
              fontWeight: 900,
              padding: '0.12rem 0.5rem',
              borderRadius: '6px',
              letterSpacing: '0.5px',
              lineHeight: 1
            }}>
              👑 HÔTE
            </div>

            <div className="esport-avatar-ring">
              {hostPlayerObj.avatar || avatar || '🦊'}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              maxWidth: '100%',
              width: '100%',
              textAlign: 'center',
              overflow: 'hidden'
            }}>
              <span style={{
                fontWeight: 900,
                fontSize: '0.95rem',
                color: 'var(--text-main)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {formatPlayerName(hostPlayerObj.name)}
              </span>
              {hostPlayerObj.id === socket.id && (
                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 800, flexShrink: 0 }}>
                  (Toi)
                </span>
              )}
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.7rem',
              color: 'var(--success)',
              fontWeight: 800,
              background: 'rgba(34, 197, 94, 0.1)',
              padding: '0.15rem 0.55rem',
              borderRadius: '6px'
            }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
              PRÊT
            </div>
          </div>

          {/* CENTER: VS BADGE WITH KEYFRAMES PULSE-VS */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '70px',
            zIndex: 10
          }}>
            <div className="vs-badge">
              VS
            </div>
            <span style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              fontWeight: 800,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              marginTop: '-2px'
            }}>
              {settings.rounds || words.length} Mots
            </span>
          </div>

          {/* RIGHT: OPPONENT PLAYER OR WAITING SLOT (TASK 1: PERFECT VERTICAL STACK & CENTERING) */}
          {opponentPlayerObj ? (
            <div className="esport-podium opponent-active">
              <div style={{
                background: 'rgba(236, 72, 153, 0.2)',
                border: '1px solid var(--secondary)',
                color: 'var(--secondary)',
                fontSize: '0.65rem',
                fontWeight: 900,
                padding: '0.12rem 0.5rem',
                borderRadius: '6px',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                lineHeight: 1
              }}>
                <span>⚔️ CHALLENGER</span>
                {isHost && opponentPlayerObj.id !== socket.id && (
                  <button
                    onClick={() => socket.emit('kick_player', { sessionId: session.id, playerId: opponentPlayerObj.id })}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 900, padding: 0, marginLeft: '2px' }}
                    title="Expulser"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="esport-avatar-ring">
                {opponentPlayerObj.avatar || '🐼'}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                maxWidth: '100%',
                width: '100%',
                textAlign: 'center',
                overflow: 'hidden'
              }}>
                <span style={{
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  color: 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {formatPlayerName(opponentPlayerObj.name)}
                </span>
                {opponentPlayerObj.id === socket.id && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 800, flexShrink: 0 }}>
                    (Toi)
                  </span>
                )}
              </div>

              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.7rem',
                color: 'var(--success)',
                fontWeight: 800,
                background: 'rgba(34, 197, 94, 0.1)',
                padding: '0.15rem 0.55rem',
                borderRadius: '6px'
              }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                PRÊT
              </div>
            </div>
          ) : (
            <div className="esport-podium" style={{ borderStyle: 'dashed', opacity: 0.9 }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                fontSize: '0.65rem',
                fontWeight: 800,
                padding: '0.12rem 0.5rem',
                borderRadius: '6px',
                lineHeight: 1
              }}>
                SLOT 2
              </div>

              <div className="esport-avatar-ring" style={{ borderStyle: 'dashed', opacity: 0.6, fontSize: '1.6rem' }}>
                ⏳
              </div>

              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                En attente...
              </div>

              <button
                onClick={() => {
                  setActiveTab('online');
                  socket.emit('get_online_users');
                }}
                className="btn btn-secondary"
                style={{
                  width: 'auto',
                  padding: '0.25rem 0.65rem',
                  fontSize: '0.72rem',
                  borderRadius: '8px',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary)'
                }}
              >
                ✉️ Inviter
              </button>
            </div>
          )}

        </div>
      </div>

      {/* =========================================================
          CONSOLE DE BORD / DASHBOARD DE CONFIGURATION (EN DESSOUS)
         ========================================================= */}
      <div className="card card-secondary-elevated" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        
        {/* Action Controls Bar */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={handleLeave}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.65rem 1rem', fontSize: '0.85rem' }}
          >
            ← Quitter
          </button>

          {isHost ? (
            <button
              className="btn btn-success"
              onClick={handleStart}
              style={{ flex: 1, padding: '0.7rem 1.2rem', fontSize: '0.95rem', fontWeight: 900, letterSpacing: '0.5px' }}
            >
              {playerCount === 1 ? '🚀 Jouer en Solo' : '⚔️ DÉMARRER LE DUEL !'}
            </button>
          ) : (
            <div style={{
              flex: 1,
              padding: '0.65rem 0.8rem',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid var(--warning)',
              borderRadius: '12px',
              color: 'var(--warning)',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              textAlign: 'center'
            }}>
              ⏳ En attente de l'hôte pour lancer le duel...
            </div>
          )}
        </div>

        {/* Floating Toast inside Lobby when looking at other tabs (Task 2 & 5) */}
        {lobbyChatToast && activeTab !== 'chat' && (
          <div 
            className="discord-chat-toast"
            onClick={() => {
              setActiveTab('chat');
              setUnreadChatCount(0);
              setLobbyChatToast(null);
            }}
          >
            <div className="discord-toast-avatar-container">
              <span className="discord-toast-avatar">{lobbyChatToast.senderAvatar || '💬'}</span>
            </div>
            <div className="discord-toast-content">
              <div className="discord-toast-header">
                <span className="discord-toast-sender">{lobbyChatToast.senderName}</span>
                <span className="discord-toast-badge">Chat</span>
              </div>
              <div className="discord-toast-text">{lobbyChatToast.text}</div>
            </div>
            <button 
              type="button"
              className="discord-toast-close"
              onClick={(e) => {
                e.stopPropagation();
                setLobbyChatToast(null);
              }}
              title="Fermer"
            >
              ×
            </button>
          </div>
        )}

        {/* Navigation Tabs Header */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          borderBottom: '2px solid var(--border-color)',
          paddingBottom: '0.4rem',
          overflowX: 'auto'
        }}>
          {/* Tab: Chat */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('chat');
              setUnreadChatCount(0);
              setLobbyChatToast(null);
            }}
            style={{
              padding: '0.35rem 0.7rem',
              fontSize: '0.82rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'chat' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap',
              position: 'relative'
            }}
          >
            <span>💬</span> Chat ({messages.length})
            {unreadChatCount > 0 && activeTab !== 'chat' && (
              <span style={{
                background: 'var(--danger)',
                color: '#ffffff',
                fontSize: '0.68rem',
                fontWeight: 900,
                borderRadius: '10px',
                padding: '0.1rem 0.4rem',
                lineHeight: 1,
                marginLeft: '3px'
              }}>
                +{unreadChatCount}
              </span>
            )}
          </button>

          {/* Tab: Joueurs en ligne */}
          <button
            onClick={() => {
              setActiveTab('online');
              socket.emit('get_online_users');
            }}
            style={{
              padding: '0.35rem 0.7rem',
              fontSize: '0.82rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'online' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'online' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>👥</span> Inviter ({filteredOnlineUsers.length})
          </button>

          {/* Tab: Liste des mots */}
          <button
            onClick={() => setActiveTab('words')}
            style={{
              padding: '0.35rem 0.7rem',
              fontSize: '0.82rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'words' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'words' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>📝</span> Mots ({words.length})
          </button>

          {/* Tab: Paramètres */}
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '0.35rem 0.7rem',
              fontSize: '0.82rem',
              borderRadius: '10px',
              border: 'none',
              background: activeTab === 'settings' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
              color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              whiteSpace: 'nowrap'
            }}
          >
            <span>⚙️</span> Paramètres ({settings.timePerWord}s)
          </button>
        </div>

        {/* ----------------- ONGLET 1 : CHAT DE LA SALLE ----------------- */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div 
              className="lobby-chat-box"
              style={{
                height: '210px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                paddingRight: '0.4rem',
                marginBottom: '0.5rem'
              }}
            >
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
                      <span>{isMe ? 'Vous' : formatPlayerName(m.senderName)}</span>
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

            {/* Telegram Burst Quick Reaction Bar with 5s Cooldown */}
            <div style={{ position: 'relative', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>Réactions :</span>
                {['🔥', '⚡', '🏆', '⚔️', '💪', '👏'].map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendReaction(emoji)}
                    disabled={reactionCooldown > 0}
                    className={`reaction-pill-btn ${reactionCooldown > 0 ? 'cooldown-active' : ''}`}
                    style={{ padding: '0.2rem 0.55rem', fontSize: '0.85rem' }}
                  >
                    <span>{emoji}</span>
                    {reactionCooldown > 0 && (
                      <span style={{ fontSize: '0.68rem', color: 'var(--warning)', fontWeight: 800 }}>
                        {reactionCooldown}s
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Telegram Burst Particle Container positioned right above the reaction bar */}
              <div className="floating-reactions-container">
                {floatingReactions.map((r) => (
                  <span
                    key={r.id}
                    className="floating-reaction-item"
                    style={{
                      left: `${r.xPos || 50}%`,
                      '--tx': r.tx || '0px',
                      '--ty': r.ty || '-200px',
                      '--scale': r.scale || '1',
                      '--rot': r.rot || '0deg',
                      animationDelay: r.delay || '0s'
                    }}
                  >
                    {r.emoji}
                  </span>
                ))}
              </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {/* Direct Invitation Copy Banner (Task 4) */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '0.65rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🔗</span>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    Code : <span style={{ color: 'var(--primary)', letterSpacing: '1px', fontWeight: 900 }}>{session?.id}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Partagez l'invitation à vos amis
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyInvite}
                className={`btn ${copiedInvite ? 'btn-success' : 'btn-primary'}`}
                style={{
                  width: 'auto',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  borderRadius: '10px'
                }}
              >
                {copiedInvite ? 'Copié ! ✅' : "🔗 Copier l'invitation"}
              </button>
            </div>

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
              height: '240px',
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
                      <p style={{ fontSize: '0.75rem', marginTop: '0.2rem', marginBottom: '0.6rem' }}>
                        Partagez le code <strong style={{ color: 'var(--primary)' }}>{session?.id}</strong> pour inviter un ami !
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyInvite}
                        className={`btn ${copiedInvite ? 'btn-success' : 'btn-secondary'}`}
                        style={{
                          width: 'auto',
                          margin: '0 auto',
                          padding: '0.35rem 0.8rem',
                          fontSize: '0.78rem',
                          borderRadius: '8px'
                        }}
                      >
                        {copiedInvite ? 'Copié ! ✅' : "🔗 Copier l'invitation"}
                      </button>
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
                            {formatPlayerName(u.name)}
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Read-only notification for Guest */}
            {!isHost ? (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid var(--primary)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <span>🔒</span>
                <span><strong>Mode consultation :</strong> Seul <strong>{hostDisplayName}</strong> (hôte) peut modifier ou ajouter des mots.</span>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
                gap: '0.4rem',
                flexWrap: 'wrap'
              }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  ✏️ Liste ({words.length} mots) :
                </span>

                {/* Host Action Buttons in Words Tab */}
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {words.length > 1 && (
                    <button
                      onClick={handleShuffleWords}
                      className="btn btn-secondary"
                      style={{ width: 'auto', padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                      title="Mélanger l'ordre de tous les mots"
                    >
                      🎲 Mélanger
                    </button>
                  )}

                  <button
                    onClick={() => setShowCommunityPicker(true)}
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                    title="Choisir parmi les listes par défaut ou communautaires"
                  >
                    📚 Choisir
                  </button>

                  <label
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '0.25rem 0.55rem', fontSize: '0.75rem', cursor: isUploadingPdf ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center' }}
                    title="Importer un fichier PDF avec vos mots"
                  >
                    <span>{isUploadingPdf ? '⏳...' : '📄 PDF'}</span>
                    <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleUploadPdfInLobby} disabled={isUploadingPdf} />
                  </label>

                  <button
                    onClick={handleAddWord}
                    className="btn btn-primary"
                    style={{ width: 'auto', padding: '0.25rem 0.55rem', fontSize: '0.75rem' }}
                  >
                    + Mot
                  </button>
                </div>
              </div>
            )}

            <div style={{
              height: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '0.3rem',
              marginBottom: '0.4rem'
            }}>
              {words.length === 0 ? (
                /* Empty state when all words were deleted / empty */
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2rem 1rem',
                  background: 'var(--bg-main)',
                  borderRadius: '12px',
                  border: '2px dashed var(--border-color)',
                  textAlign: 'center',
                  gap: '0.8rem'
                }}>
                  <span style={{ fontSize: '2rem' }}>📭</span>
                  <div>
                    <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.95rem' }}>La liste des mots est vide</h4>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Choisissez une liste prête à l'emploi ou ajoutez vos propres mots.
                    </p>
                  </div>

                  {isHost ? (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        onClick={() => setShowCommunityPicker(true)}
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                      >
                        📚 Choisir une liste de la communauté
                      </button>
                      <button
                        onClick={handleAddWord}
                        className="btn btn-secondary"
                        style={{ width: 'auto', padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                      >
                        + Ajouter un mot
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      En attente de l'hôte pour ajouter des mots...
                    </span>
                  )}
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
                      onChange={(e) => handleLocalWordChange(idx, 'question', e.target.value)}
                      onBlur={() => handleCommitWordChange(idx)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      placeholder="Français"
                      style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', cursor: isHost ? 'text' : 'default' }}
                    />

                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>➔</span>

                    <input
                      type="text"
                      className="input-field"
                      value={w.answer}
                      disabled={!isHost}
                      onChange={(e) => handleLocalWordChange(idx, 'answer', e.target.value)}
                      onBlur={() => handleCommitWordChange(idx)}
                      onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                      placeholder="Allemand"
                      style={{ flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', cursor: isHost ? 'text' : 'default' }}
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
            {user && isHost && words.length > 0 && (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {!isHost && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid var(--primary)',
                borderRadius: '8px',
                padding: '0.45rem 0.75rem',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <span>🔒</span>
                <span><strong>Règles de la partie :</strong> Paramétrées par <strong>{hostDisplayName}</strong> (hôte).</span>
              </div>
            )}

            <div style={{
              height: '240px',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.8rem',
              background: 'var(--bg-main)',
              padding: '0.8rem',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              {/* Option 1: Nombre de mots dans la liste (sélection aléatoire auto) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  🎲 Nombre de mots dans la liste :
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {/* Editable Arrow Box */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '4px 8px',
                    flex: 1
                  }}>
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(wordCountInput) || words.length || 1;
                          const next = Math.max(1, current - 1);
                          setWordCountInput(String(next));
                          handleWordCountChange(next);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 4px' }}
                      >
                        &#9664;
                      </button>
                    )}

                    <input
                      type="text"
                      inputMode="numeric"
                      value={wordCountInput}
                      disabled={!isHost}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setWordCountInput(val);
                      }}
                      onBlur={() => {
                        const parsed = parseInt(wordCountInput);
                        const clamped = !parsed || parsed < 1 ? words.length || 1 : Math.min(parsed, maxAvailableWordsCount);
                        setWordCountInput(String(clamped));
                        if (clamped !== words.length) {
                          handleWordCountChange(clamped);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.target.blur();
                      }}
                      style={{
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-main)',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />

                    {isHost && (
                      <button
                        type="button"
                        onClick={() => {
                          const current = parseInt(wordCountInput) || words.length || 1;
                          const next = Math.min(maxAvailableWordsCount, current + 1);
                          setWordCountInput(String(next));
                          handleWordCountChange(next);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 4px' }}
                      >
                        &#9654;
                      </button>
                    )}
                  </div>

                  {isHost && (
                    <button
                      onClick={handleShuffleWords}
                      className="btn btn-secondary"
                      style={{ width: 'auto', padding: '0.45rem 0.65rem', fontSize: '0.85rem' }}
                      title="Mélanger les mots"
                    >
                      🎲
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Total disponible actuellement : <strong>{maxAvailableWordsCount} mots</strong>
                </span>
              </div>

              {/* Option 2: Questions à jouer (Rounds) */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  🎯 Questions à jouer :
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '4px 8px'
                }}>
                  {isHost && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(roundsInput) || settings.rounds || words.length || 1;
                        const next = Math.max(1, current - 1);
                        setRoundsInput(String(next));
                        handleUpdateSettings({ ...settings, rounds: next }, `Nombre de questions réglé à ${next}`);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 4px' }}
                    >
                      &#9664;
                    </button>
                  )}

                  <input
                    type="text"
                    inputMode="numeric"
                    value={roundsInput}
                    disabled={!isHost}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setRoundsInput(val);
                    }}
                    onBlur={() => {
                      const parsed = parseInt(roundsInput);
                      const maxRounds = Math.max(1, words.length);
                      const clamped = !parsed || parsed < 1 ? maxRounds : Math.min(parsed, maxRounds);
                      setRoundsInput(String(clamped));
                      if (clamped !== settings.rounds) {
                        handleUpdateSettings({ ...settings, rounds: clamped }, `Nombre de questions réglé à ${clamped}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.target.blur();
                    }}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-main)',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.95rem',
                      outline: 'none'
                    }}
                  />

                  {isHost && (
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(roundsInput) || settings.rounds || words.length || 1;
                        const maxRounds = Math.max(1, words.length);
                        const next = Math.min(maxRounds, current + 1);
                        setRoundsInput(String(next));
                        handleUpdateSettings({ ...settings, rounds: next }, `Nombre de questions réglé à ${next}`);
                      }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 4px' }}
                    >
                      &#9654;
                    </button>
                  )}
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.25rem' }}>
                  Mots dispos dans la salle : {words.length}
                </span>
              </div>

              {/* Time per word */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  ⏱️ Temps par mot :
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
                  🥶 Pouvoirs de gel :
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

              {/* Allow Pause toggle */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  ⏸️ Bouton Pause & Chat :
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isHost ? 'pointer' : 'default' }}>
                  <input
                    type="checkbox"
                    checked={settings.allowPause !== false}
                    disabled={!isHost}
                    onChange={(e) => {
                      const val = e.target.checked;
                      handleUpdateSettings({ ...settings, allowPause: val }, `Pause en jeu ${val ? 'autorisée ⏸️' : 'désactivée 🚫'}`);
                    }}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: settings.allowPause !== false ? 'var(--success)' : 'var(--text-muted)' }}>
                    {settings.allowPause !== false ? 'Autorisé' : 'Désactivé'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* =========================================================
          MODAL DE SÉLECTION DE LISTES COMMUNAUTAIRES / PAR DÉFAUT
         ========================================================= */}
      {showCommunityPicker && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          padding: '1rem'
        }}>
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              padding: '1.2rem',
              borderRadius: '20px',
              background: 'var(--bg-surface)',
              border: '2px solid var(--primary)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📚</span> Choisir une liste de vocabulaire
              </h3>
              <button
                onClick={() => setShowCommunityPicker(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable list choices */}
            <div style={{
              overflowY: 'auto',
              maxHeight: '55vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              paddingRight: '0.3rem'
            }}>
              {/* Default Example Lists Section */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  🇩🇪 Listes par défaut (Thématiques)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {exampleLists.map((list) => (
                    <div
                      key={list.id}
                      onClick={() => handleLoadPredefinedList(list)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-main)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '0.6rem 0.8rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{list.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{list.subtitle}</div>
                      </div>
                      <button
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}
                      >
                        Charger ({list.words.length} mots)
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Public Community Lists Section */}
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--warning)', marginBottom: '0.5rem' }}>
                  🌍 Listes de la Communauté
                </h4>
                {loadingPublicLists ? (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Chargement des listes publiques...
                  </div>
                ) : publicLists.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    Aucune liste communautaire publique pour le moment.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {publicLists.map((list) => (
                      <div
                        key={list._id}
                        onClick={() => handleLoadPredefinedList(list)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: 'var(--bg-main)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '10px',
                          padding: '0.6rem 0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--warning)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                      >
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{list.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Par {list.creatorName || 'Membre'} • {list.words.length} mots
                          </div>
                        </div>
                        <button
                          className="btn btn-secondary"
                          style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.75rem', color: 'var(--warning)', borderColor: 'var(--warning)' }}
                        >
                          Charger
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setShowCommunityPicker(false)}
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
