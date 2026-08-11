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
  const [vocabListForReview, setVocabListForReview] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && !playerName) {
        setPlayerName(currentUser.displayName || '');
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

    socket.on('game_over', (finalPlayers) => {
      setPlayers(finalPlayers);
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
    <div className="app-container">
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
          user={user}
          loginWithGoogle={loginWithGoogle}
          logout={logout}
        />
      )}
      {view === 'review' && (
        <Review 
          vocabList={vocabListForReview} 
          user={user}
          onCreateSession={(finalList, settings) => {
            socket.emit('create_session', { vocabList: finalList, settings, playerName: playerName || 'Hôte' });
          }} 
        />
      )}
      {view === 'lobby' && <Lobby socket={socket} session={session} players={players} isHost={isHost} />}
      {view === 'game' && <Game socket={socket} session={session} />}
      {view === 'results' && <Results players={players} setView={setView} />}
    </div>
  );
}

export default App;
