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
      setIsHost(false);
      setView('lobby');
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
    };
  }, []);

  return (
    <div className={`app-container page-transition`}>
      <button 
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        style={{
          position: 'absolute', top: '1rem', left: '1rem', 
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          color: 'var(--text-light)', padding: '0.5rem 1rem', borderRadius: '20px',
          cursor: 'pointer', zIndex: 100
        }}
      >
        {theme === 'dark' ? '☀️ Mode Clair' : '🌙 Mode Sombre'}
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
