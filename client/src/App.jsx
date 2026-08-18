import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Results from './components/Results';
import Layout from './components/Layout';
import Admin from './components/Admin';
import NotificationCenter from './components/NotificationCenter';
import InviteModal from './components/InviteModal';
import { exampleLists } from './data/exampleLists';
import { auth, loginWithGoogle, logout, deleteAccount } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { formatPlayerName, getClientPlayerKey } from './utils/formatters';

// Connect to server (uses env variable or fallback to localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
const socket = io(API_URL, {
  transports: ['websocket'],
  upgrade: false
});

function App() {
  const [view, setView] = useState('home'); // home, lobby, game, results
  const [activeTab, setActiveTab] = useState('learn'); // learn, lists, community, stats, profile
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastNotif, setToastNotif] = useState(null);
  const [serverGuestMode, setServerGuestMode] = useState(true); // from server config
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('wana_theme') || 'midnight';
  });
  const [leaderboard, setLeaderboard] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingInvite, setIncomingInvite] = useState(null);

  const isAdmin = Boolean(user && ADMIN_UID && user.uid === ADMIN_UID);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('wana_theme', theme);
  }, [theme]);

  // Detect ?admin in URL - ONLY for the admin user
  useEffect(() => {
    if (isAdmin && window.location.search.includes('admin')) {
      setShowAdmin(true);
    }
  }, [isAdmin]);

  const [announcement, setAnnouncement] = useState('');

  // Fetch server config (guest mode etc.)
  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(r => r.json())
      .then(data => {
        setServerGuestMode(data.guestMode ?? true);
        if (data.announcement) setAnnouncement(data.announcement);
      })
      .catch(() => {});
  }, []);

  // Sync user profile with online users registry on server and on socket connect/reconnect
  useEffect(() => {
    const registerUserOnline = () => {
      const currentName = formatPlayerName(playerName || user?.displayName || (isGuest ? 'Invité' : ''));
      socket.emit('register_online_user', {
        firebaseId: user?.uid || null,
        name: currentName ? `${avatar} ${currentName}` : `${avatar} Joueur`,
        avatar: avatar || '🦊'
      });
      socket.emit('get_online_users');
    };

    registerUserOnline();
    socket.on('connect', registerUserOnline);

    return () => {
      socket.off('connect', registerUserOnline);
    };
  }, [user, playerName, avatar, isGuest]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        if (!playerName) setPlayerName(formatPlayerName(currentUser.displayName || ''));
        // Register personal user socket room for direct notifications
        socket.emit('register_user', currentUser.uid);
        // Sync with backend
        fetch(`${API_URL}/api/users/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ firebaseId: currentUser.uid, name: currentUser.displayName })
        }).catch(console.error);
      }
    });
    return () => unsubscribe();
  }, [playerName]);

  // Fetch notifications for user or guest
  useEffect(() => {
    const targetUserId = user ? user.uid : (isGuest ? 'guest' : '');
    if (targetUserId) {
      fetch(`${API_URL}/api/notifications/${targetUserId}`)
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.isRead).length);
          }
        })
        .catch(() => {});
    }
  }, [user, isGuest]);

  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    socket.on('session_created', (sess) => {
      const fullSession = typeof sess === 'object' ? sess : { id: sess };
      setSession(fullSession);
      setPlayers(fullSession.players || {});
      setIsHost(true);
      setView('lobby');
    });

    socket.on('session_joined', (sess) => {
      setSession(sess);
      setPlayers(sess.players);
      setIsHost(sess.hostId === socket.id);
      setView('lobby');
    });

    socket.on('kicked', () => {
      alert("Vous avez été exclu de la session par l'hôte.");
      setSession(null);
      setPlayers({});
      setIsHost(false);
      setView('home');
    });

    socket.on('player_joined', (updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    socket.on('online_users_update', (users) => {
      if (Array.isArray(users)) {
        setOnlineUsers(users);
      }
    });

    socket.on('game_invite_received', (inviteData) => {
      // Never show invite if we are the host or if it's our own session
      if (!inviteData || inviteData.hostSocketId === socket.id) return;
      setIncomingInvite(inviteData);
    });

    socket.on('invite_response', (resp) => {
      if (resp.accepted) {
        setToastNotif({
          icon: '⚔️',
          title: 'Invitation acceptée !',
          message: `${formatPlayerName(resp.playerName)} a accepté votre invitation et rejoint la salle !`
        });
      } else {
        setToastNotif({
          icon: 'ℹ️',
          title: 'Invitation déclinée',
          message: `${formatPlayerName(resp.playerName)} a décliné votre invitation.`
        });
      }
      setTimeout(() => setToastNotif(null), 5000);
    });

    socket.on('game_started', () => {
      setView('game');
    });

    socket.on('game_over', (data) => {
      sessionStorage.removeItem('active_game_session');
      setPlayers(data.players);
      setSession(prev => ({ ...prev, vocabList: data.vocabList }));
      setView('results');
    });

    socket.on('forfeit_game_over', (data) => {
      localStorage.removeItem('wana_active_session');
      setPlayers(data.players);
      setSession(prev => ({ ...prev, vocabList: data.vocabList }));
      setView('results');
      setToastNotif({
        icon: '🏆',
        title: 'Victoire par forfait !',
        message: `${data.forfeitedName} ne s'est pas reconnecté à temps.`
      });
      setTimeout(() => setToastNotif(null), 6000);
    });

    socket.on('rejoin_success', (data) => {
      setSession(data.session);
      setPlayers(data.session.players || {});
      setIsHost(Boolean(data.isHost));

      const sessStatus = data.session.status || data.status;
      if (sessStatus === 'playing' || sessStatus === 'showing_results') {
        setView('game');
      } else if (sessStatus === 'waiting') {
        setView('lobby');
      } else if (sessStatus === 'finished') {
        setView('results');
      }

      setToastNotif({
        icon: '⚡',
        title: 'Session réintégrée',
        message: 'Vous êtes de retour dans votre session !'
      });
      setTimeout(() => setToastNotif(null), 4000);
    });

    socket.on('rejoin_failed', () => {
      localStorage.removeItem('wana_active_session');
    });

    socket.on('admin_announcement', (msg) => {
      setAnnouncement(msg);
    });

    socket.on('new_notification', (notif) => {
      setNotifications(prev => [notif, ...prev]);
      setUnreadCount(prev => prev + 1);
      setToastNotif(notif);
      setTimeout(() => setToastNotif(null), 6000);
    });

    socket.on('session_updated', (sess) => {
      setSession(sess);
      if (sess.players) setPlayers(sess.players);
      setIsHost(sess.hostId === socket.id);
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.off('session_created');
      socket.off('session_joined');
      socket.off('session_updated');
      socket.off('player_joined');
      socket.off('online_users_update');
      socket.off('game_invite_received');
      socket.off('invite_response');
      socket.off('game_started');
      socket.off('game_over');
      socket.off('forfeit_game_over');
      socket.off('rejoin_success');
      socket.off('rejoin_failed');
      socket.off('admin_announcement');
      socket.off('new_notification');
      socket.off('error');
      socket.off('kicked');
    };
  }, []);

  // Save active session to localStorage so closing/reopening browser directly rejoins lobby or game
  useEffect(() => {
    if (['game', 'lobby', 'results'].includes(view) && session?.id) {
      localStorage.setItem('wana_active_session', JSON.stringify({
        sessionId: session.id,
        view,
        clientPlayerKey: getClientPlayerKey(),
        firebaseId: user?.uid || null,
        playerName: playerName || 'Joueur',
        avatar: avatar || '🦊'
      }));
    } else if (view === 'home') {
      localStorage.removeItem('wana_active_session');
    }
  }, [view, session?.id, user?.uid, playerName, avatar]);

  // Attempt auto-rejoin on socket connect/reconnect and initial mount
  useEffect(() => {
    const handleRejoinCheck = () => {
      try {
        const saved = localStorage.getItem('wana_active_session');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.sessionId) {
            socket.emit('rejoin_session', {
              sessionId: parsed.sessionId,
              clientPlayerKey: getClientPlayerKey(),
              firebaseId: user?.uid || parsed.firebaseId || null,
              playerName: playerName || parsed.playerName || '',
              avatar: avatar || parsed.avatar || '🦊'
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    socket.on('connect', handleRejoinCheck);
    handleRejoinCheck();

    return () => {
      socket.off('connect', handleRejoinCheck);
    };
  }, [user, playerName, avatar]);

  const handleAcceptInvite = () => {
    if (!incomingInvite) return;
    const finalName = playerName ? `${avatar} ${formatPlayerName(playerName)}` : `${avatar} Invité`;
    
    socket.emit('respond_game_invite', {
      inviteId: incomingInvite.inviteId,
      hostSocketId: incomingInvite.hostSocketId,
      accepted: true,
      sessionId: incomingInvite.sessionId,
      playerName: finalName,
      avatar,
      firebaseId: user?.uid
    });

    socket.emit('join_session', {
      sessionId: incomingInvite.sessionId,
      playerName: finalName,
      firebaseId: user?.uid,
      avatar
    });

    setIncomingInvite(null);
  };

  const handleRejectInvite = () => {
    if (!incomingInvite) return;
    const finalName = playerName ? `${avatar} ${formatPlayerName(playerName)}` : `${avatar} Invité`;

    socket.emit('respond_game_invite', {
      inviteId: incomingInvite.inviteId,
      hostSocketId: incomingInvite.hostSocketId,
      accepted: false,
      sessionId: incomingInvite.sessionId,
      playerName: finalName,
      avatar,
      firebaseId: user?.uid
    });

    setIncomingInvite(null);
  };

  // Fallback timeout to ensure auth loading never hangs indefinitely
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAuthLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleQuickSoloFromSidebar = () => {
    const allWords = [];
    exampleLists.forEach(list => allWords.push(...list.words));
    if (allWords.length === 0) return alert("Aucun mot disponible !");
    const shuffled = allWords.sort(() => 0.5 - Math.random());
    const selectedWords = shuffled.slice(0, 10).map((w, idx) => ({ ...w, id: idx + 1 }));
    const finalName = playerName ? `${avatar} ${formatPlayerName(playerName)}` : `${avatar} Hôte`;
    socket.emit('create_session', {
      vocabList: selectedWords,
      settings: { rounds: selectedWords.length, timePerWord: 15, powerupsEnabled: false },
      playerName: finalName,
      firebaseId: user?.uid,
      avatar,
      clientPlayerKey: getClientPlayerKey()
    });
  };

  const RightPanelContent = () => {
    if (view === 'lobby') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Combat en Direct 🥊</h3>
          <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), var(--bg-surface))' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>⚡ Règles du Duel</h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
              <li>Tape la bonne réponse en allemand aussi vite que possible.</li>
              <li>Majuscules et accents pris en compte.</li>
              <li>Le plus rapide marque le maximum de points !</li>
            </ul>
          </div>
        </div>
      );
    }

    // Context 1: ROUTE CLASSEMENT (activeTab === 'stats') -> "Ta Carte Joueur"
    if (activeTab === 'stats') {
      const userRankIndex = leaderboard.findIndex(p => 
        (user?.uid && p.firebaseId === user.uid) || 
        (playerName && p.name && p.name.toLowerCase().includes(playerName.toLowerCase()))
      );
      const userRank = userRankIndex >= 0 ? userRankIndex + 1 : '—';
      const userXP = userRankIndex >= 0 ? (leaderboard[userRankIndex].xp || 0) : (user ? 120 : 0);
      const currentLevel = Math.max(1, Math.floor(userXP / 100) + 1);
      const xpInCurrentLevel = userXP % 100;
      const xpNeededNext = 100 - xpInCurrentLevel;
      const progressPercent = Math.min(100, Math.max(5, (xpInCurrentLevel / 100) * 100));

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Ta Carte Joueur 🏆</h3>

          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99, 102, 241, 0.12) 100%)',
            border: '2px solid var(--primary)',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            {/* Player Header with Avatar & Rank */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--bg-main)',
                border: '2px solid var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                flexShrink: 0
              }}>
                {avatar || '🦊'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatPlayerName(playerName || user?.displayName || 'Joueur')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                  <span style={{
                    background: userRank === 1 ? '#f59e0b' : 'var(--primary)',
                    color: '#ffffff',
                    fontSize: '0.7rem',
                    fontWeight: 900,
                    padding: '0.1rem 0.45rem',
                    borderRadius: '6px'
                  }}>
                    RANG #{userRank}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {userXP} pts
                  </span>
                </div>
              </div>
            </div>

            {/* Level & XP Progress Bar */}
            <div style={{ background: 'var(--bg-main)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                  Niveau {currentLevel}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {xpInCurrentLevel} / 100 XP
                </span>
              </div>
              
              {/* Progress track */}
              <div style={{
                width: '100%',
                height: '10px',
                background: 'var(--bg-surface)',
                borderRadius: '6px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                  borderRadius: '6px',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.35rem' }}>
                Plus que <strong style={{ color: 'var(--text-main)' }}>{xpNeededNext} XP</strong> pour le Niveau {currentLevel + 1} !
              </div>
            </div>

            {/* Call to action */}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px' }}>
              💡 Chaque victoire en duel vous rapporte <strong style={{ color: 'var(--primary)' }}>+20 XP</strong> et vous fait progresser dans le classement !
            </div>
          </div>
        </div>
      );
    }

    // Context 2: ROUTE APPRENDRE (activeTab === 'learn' / home) -> "Prêt pour le duel ?"
    if (activeTab === 'learn') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Arène Rapide ⚡</h3>

          <div className="card" style={{
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99, 102, 241, 0.15) 100%)',
            border: '2px solid var(--primary)',
            padding: '1.3rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.9rem',
            boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.6rem' }}>⚔️</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  Prêt pour le duel ?
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                  SESSION INSTANTANÉE
                </span>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Teste tes réflexes et perfectionne ton vocabulaire avec une série de 10 mots choisis au hasard.
            </p>

            <button
              onClick={handleQuickSoloFromSidebar}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.95rem',
                fontWeight: 900,
                borderRadius: '12px',
                letterSpacing: '0.5px'
              }}
            >
              ⚡ DUEL RAPIDE SOLO
            </button>
          </div>

          {/* Daily tip card */}
          <div className="card" style={{ padding: '1rem', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
              <span>💡</span>
              <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--warning)' }}>Astuce du jour</h4>
            </div>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Les noms terminés par <strong>-ung</strong>, <strong>-heit</strong>, <strong>-keit</strong>, <strong>-schaft</strong> sont systématiquement du genre féminin (<strong>die</strong>) !
            </p>
          </div>
        </div>
      );
    }

    // Default right panel fallback for lists/community/profile
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Classement Mondial 🏆</h3>
        {(!Array.isArray(leaderboard) || leaderboard.length === 0) ? (
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Chargement du classement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {leaderboard.slice(0, 5).map((player, idx) => (
              <div key={player._id || idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 0.8rem', background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface)' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: idx === 0 ? '#f59e0b' : 'var(--text-muted)', minWidth: '24px' }}>#{idx + 1}</span>
                <span style={{ flex: 1, fontWeight: 'bold', fontSize: '0.88rem' }}>{formatPlayerName(player.name)}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>{player.xp || 0} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (view === 'game') {
    return (
      <div className={`app-container page-transition`}>
        {error && (
          <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', position: 'absolute', top: '1rem', left: '1rem', zIndex: 100 }}>
            {error} <button onClick={() => setError('')} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>X</button>
          </div>
        )}
        <Game socket={socket} session={session} playerName={playerName} avatar={avatar} />
      </div>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2 style={{ color: 'var(--primary)' }}>Chargement...</h2>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="app-container" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--bg-main)',
        padding: '1rem'
      }}>
        <div style={{
          textAlign: 'center',
          maxWidth: '420px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem'
        }}>
          {/* Logo */}
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, background: 'linear-gradient(135deg, var(--primary), #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
              WANA ALLMAND
            </h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '1rem' }}>
              Apprends l'allemand en jouant 🎮
            </p>
          </div>

          {/* Card */}
          <div className="card" style={{ width: '100%', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', alignItems: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Connexion requise</h2>
            <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.95rem', lineHeight: 1.6 }}>
              Connecte-toi pour accéder à toutes les fonctionnalités : tes listes, le classement, et bien plus.
            </p>
            <button
              onClick={loginWithGoogle}
              className="btn btn-primary"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1rem', padding: '0.9rem' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Se connecter avec Google
            </button>

            {serverGuestMode && (
              <button
                onClick={() => setIsGuest(true)}
                className="btn btn-secondary"
                style={{ width: '100%', fontSize: '1rem', padding: '0.75rem', opacity: 0.8 }}
              >
                👤 Continuer en tant qu'invité
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Layout 
        activeTab={activeTab} 
        onNavigate={(tab) => {
          setActiveTab(tab);
          // If on results/lobby/review, clean up and go back to home when navigating
          if (['results', 'lobby', 'review'].includes(view)) {
            if (session?.id) {
              socket.emit('leave_session', session.id);
              setSession(null);
            }
            setView('home');
          }
        }}
        user={user}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        rightPanelContent={<RightPanelContent />}
        isAdmin={isAdmin}
        onOpenAdmin={() => setShowAdmin(true)}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotifications(true)}
      >
        {/* Live Notification Pop-up Toast */}
        {toastNotif && (
          <div style={{
            position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 1200,
            background: 'var(--bg-surface)', border: '2px solid var(--primary)',
            borderRadius: '16px', padding: '1rem 1.2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'flex-start', gap: '0.8rem', maxWidth: '380px',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <span style={{ fontSize: '1.6rem' }}>{toastNotif.icon || '🔔'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: 'var(--text-main)' }}>{toastNotif.title}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{toastNotif.message}</div>
            </div>
            <button onClick={() => setToastNotif(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
        )}

        {announcement && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2))',
            border: '1px solid var(--primary)',
            padding: '0.8rem 1.2rem',
            borderRadius: '12px',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem' }}>
              <span>📢</span>
              <span><strong>Annonce :</strong> {announcement}</span>
            </div>
            <button onClick={() => setAnnouncement('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            {error} <button onClick={() => setError('')} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>X</button>
          </div>
        )}
        
        {view === 'home' && (
          <Home 
            socket={socket} 
            playerName={playerName} 
            setPlayerName={setPlayerName}
            avatar={avatar}
            setAvatar={setAvatar}
            user={user}
            loginWithGoogle={loginWithGoogle}
            logout={() => { logout(); setIsGuest(false); }}
            deleteAccount={deleteAccount}
            activeTab={activeTab}
            leaderboard={leaderboard}
            isGuest={isGuest}
            setIsGuest={setIsGuest}
            isAdmin={isAdmin}
            onOpenAdmin={() => setShowAdmin(true)}
            theme={theme}
            setTheme={setTheme}
          />
        )}
        {view === 'lobby' && (
          <Lobby 
            socket={socket} 
            session={session} 
            players={players} 
            isHost={isHost} 
            setView={setView} 
            onlineUsers={onlineUsers}
            playerName={playerName}
            avatar={avatar}
            user={user}
          />
        )}
        {view === 'results' && (
          <Results 
            players={players} 
            setView={setView} 
            socket={socket} 
            session={session} 
            isHost={isHost}
            playerName={playerName}
            avatar={avatar}
            user={user}
          />
        )}
      </Layout>

      {/* Real-time Game Invite Modal */}
      {incomingInvite && (
        <InviteModal 
          invite={incomingInvite}
          onAccept={handleAcceptInvite}
          onReject={handleRejectInvite}
        />
      )}

      {/* User Notifications Center Modal */}
      <NotificationCenter
        user={user}
        socket={socket}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        notifications={notifications}
        setNotifications={setNotifications}
      />

      {/* Admin Panel - Only accessible by the confirmed admin */}
      {showAdmin && isAdmin && <Admin user={user} onClose={() => setShowAdmin(false)} />}
    </>
  );
}

export default App;
