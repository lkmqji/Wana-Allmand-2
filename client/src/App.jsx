import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Results from './components/Results';
import Review from './components/Review';
import Layout from './components/Layout';
import { auth, loginWithGoogle, logout, deleteAccount } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Connect to server (uses env variable or fallback to localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
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
  const [vocabListForReview, setVocabListForReview] = useState(null);
  const [editingListInfo, setEditingListInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        if (!playerName) setPlayerName(currentUser.displayName || '');
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

  useEffect(() => {
    fetch(`${API_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (vocabListForReview) {
      setView('review');
    }
  }, [vocabListForReview]);

  useEffect(() => {
    socket.on('session_created', (sessionId) => {
      setSession({ id: sessionId });
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

    socket.on('game_started', () => {
      setView('game');
    });

    socket.on('game_over', (data) => {
      setPlayers(data.players);
      setSession(prev => ({ ...prev, vocabList: data.vocabList }));
      setView('results');
    });

    socket.on('error', (msg) => {
      setError(msg);
    });

    return () => {
      socket.off('session_created');
      socket.off('session_joined');
      socket.off('player_joined');
      socket.off('game_started');
      socket.off('game_over');
      socket.off('error');
      socket.off('kicked');
    };
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
        {leaderboard.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>Chargement du classement...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
            {leaderboard.slice(0, 5).map((player, idx) => (
              <div key={player._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem', background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface)' }}>
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
        <Game socket={socket} session={session} />
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

  return (
    <Layout 
      activeTab={activeTab} 
      onNavigate={(tab) => {
        setActiveTab(tab);
        // If on results/lobby/review, go back to home when navigating
        if (['results', 'lobby', 'review'].includes(view)) {
          setView('home');
        }
      }}
      user={user}
      loginWithGoogle={loginWithGoogle}
      logout={logout}
      theme={theme}
      toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      rightPanelContent={<RightPanelContent />}
    >
      {error && (
        <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error} <button onClick={() => setError('')} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>X</button>
        </div>
      )}
      
      {view === 'home' && (
        <Home 
          socket={socket} 
          setVocabListForReview={setVocabListForReview} 
          setEditingListInfo={setEditingListInfo}
          playerName={playerName} 
          setPlayerName={setPlayerName}
          avatar={avatar}
          setAvatar={setAvatar}
          user={user}
          loginWithGoogle={loginWithGoogle}
          logout={logout}
          deleteAccount={deleteAccount}
          activeTab={activeTab}
          leaderboard={leaderboard}
        />
      )}
      {view === 'review' && (
        <Review 
          vocabList={vocabListForReview} 
          editingListInfo={editingListInfo}
          user={user}
          setView={setView}
          onCreateSession={(finalList, settings) => {
            const finalName = playerName ? `${avatar} ${playerName}` : `${avatar} Hôte`;
            socket.emit('create_session', { vocabList: finalList, settings, playerName: finalName, firebaseId: user?.uid });
          }} 
        />
      )}
      {view === 'lobby' && <Lobby socket={socket} session={session} players={players} isHost={isHost} setView={setView} />}
      {view === 'results' && <Results players={players} setView={setView} socket={socket} session={session} isHost={isHost} setVocabListForReview={setVocabListForReview} />}
    </Layout>
  );
}

export default App;
