import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Results from './components/Results';
import Review from './components/Review';
import { auth, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Connect to server (uses env variable or fallback to localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const socket = io(API_URL, {
  transports: ['websocket'],
  upgrade: false
});

function App() {
  const [view, setView] = useState('home'); // home, lobby, game, results
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [avatar, setAvatar] = useState('🦊');
  const [vocabListForReview, setVocabListForReview] = useState(null);
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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

  return (
    <div className={`app-container page-transition`}>
      <button 
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        style={{
          position: 'absolute', top: '1rem', right: '1rem', 
          background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
          color: 'var(--text-light)', width: '40px', height: '40px', borderRadius: '50%',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          cursor: 'pointer', zIndex: 100, transition: 'all 0.2s'
        }}
        title={theme === 'dark' ? 'Passer au mode clair' : 'Passer au mode sombre'}
      >
        {theme === 'dark' ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="4.22" x2="19.78" y2="5.64"></line>
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        )}
      </button>

      {error && (
        <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
          {error} <button onClick={() => setError('')}>X</button>
        </div>
      )}
      
      {view === 'home' && (
        <Home 
          socket={socket} 
          setVocabListForReview={setVocabListForReview} 
          playerName={playerName} 
          setPlayerName={setPlayerName}
          avatar={avatar}
          setAvatar={setAvatar}
          user={user}
          loginWithGoogle={loginWithGoogle}
          logout={logout}
        />
      )}
      {view === 'review' && (
        <Review 
          vocabList={vocabListForReview} 
          user={user}
          setView={setView}
          onCreateSession={(finalList, settings) => {
            const finalName = playerName ? `${avatar} ${playerName}` : `${avatar} Hôte`;
            socket.emit('create_session', { vocabList: finalList, settings, playerName: finalName, firebaseId: user?.uid });
          }} 
        />
      )}
      {view === 'lobby' && <Lobby socket={socket} session={session} players={players} isHost={isHost} setView={setView} />}
      {view === 'game' && <Game socket={socket} session={session} />}
      {view === 'results' && <Results players={players} setView={setView} socket={socket} session={session} isHost={isHost} setVocabListForReview={setVocabListForReview} />}
    </div>
  );
}

export default App;
