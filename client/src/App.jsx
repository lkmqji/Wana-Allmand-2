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
import { auth, loginWithGoogle, logout, deleteAccount } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Connect to server (uses env variable or fallback to localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
const socket = io(API_URL, {
  transports: ['websocket'],
  upgrade: false
});

function App() {
  const [view, setView] = useState('home'); // home, lobby, game, results
  const [activeTab, setActiveTab] = useState('learn'); // learn, lists, community, profile
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
  const [theme, setTheme] = useState('dark');
  const [leaderboard, setLeaderboard] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [incomingInvite, setIncomingInvite] = useState(null);

  const isAdmin = Boolean(user && ADMIN_UID && user.uid === ADMIN_UID);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
      const currentName = playerName || user?.displayName || (isGuest ? 'Invité' : '');
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
        if (!playerName) setPlayerName(currentUser.displayName || '');
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
          message: `${resp.playerName} a accepté votre invitation et rejoint la salle !`
        });
      } else {
        setToastNotif({
          icon: 'ℹ️',
          title: 'Invitation déclinée',
          message: `${resp.playerName} a décliné votre invitation.`
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
      sessionStorage.removeItem('active_game_session');
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
      setIsHost(data.isHost);
      setView('game');
      setToastNotif({
        icon: '⚡',
        title: 'Partie réintégrée',
        message: 'Vous êtes de retour dans votre partie en cours !'
      });
      setTimeout(() => setToastNotif(null), 4000);
    });

    socket.on('rejoin_failed', () => {
      sessionStorage.removeItem('active_game_session');
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

  // Save active session for seamless direct rejoin if page refreshes or connection drops
  useEffect(() => {
    if (view === 'game' && session?.id) {
      sessionStorage.setItem('active_game_session', JSON.stringify({
        sessionId: session.id,
        firebaseId: user?.uid || null,
        playerName: playerName || 'Joueur',
        avatar: avatar || '🦊'
      }));
    } else if (view === 'home') {
      sessionStorage.removeItem('active_game_session');
    }
  }, [view, session?.id, user?.uid, playerName, avatar]);

  // Attempt auto-rejoin on socket connect/reconnect
  useEffect(() => {
    const handleRejoinCheck = () => {
      const saved = sessionStorage.getItem('active_game_session');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed?.sessionId) {
            socket.emit('rejoin_game_session', {
              sessionId: parsed.sessionId,
              firebaseId: user?.uid || parsed.firebaseId,
              playerName: playerName || parsed.playerName,
              avatar: avatar || parsed.avatar
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    socket.on('connect', handleRejoinCheck);
    // Also run once immediately on mount
    handleRejoinCheck();

    return () => {
      socket.off('connect', handleRejoinCheck);
    };
  }, [user, playerName, avatar]);

  const handleAcceptInvite = () => {
    if (!incomingInvite) return;
    const finalName = playerName ? `${avatar} ${playerName}` : `${avatar} Invité`;
    
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
    const finalName = playerName ? `${avatar} ${playerName}` : `${avatar} Invité`;

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

  const RightPanelContent = () => {
    if (view === 'lobby') {
      return (
        <div>
          <h3>Lobby Stats</h3>
          <p>En attente des joueurs...</p>
        </div>
      );
    }
    return (
      <div>
        <h3>Classement Mondial 🏆</h3>
        {(!Array.isArray(leaderboard) || leaderboard.length === 0) ? (
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Chargement du classement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
            {leaderboard.slice(0, 5).map((player, idx) => (
              <div key={player._id || idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface)' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: idx === 0 ? '#f59e0b' : 'var(--text-muted)' }}>#{idx + 1}</span>
                <span style={{ flex: 1, fontWeight: 'bold' }}>{player.name}</span>
                <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{player.xp || 0} pts</span>
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
