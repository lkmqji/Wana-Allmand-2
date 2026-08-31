import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Home from './components/Home';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Results from './components/Results';
import VengeanceMode from './components/VengeanceMode';
import TugOfWarArena from './components/TugOfWarArena';
import Layout from './components/Layout';
import Admin from './components/Admin';
import NotificationCenter from './components/NotificationCenter';
import InviteModal from './components/InviteModal';
import RightPanel from './components/RightPanel';
import TitleScreen from './components/TitleScreen';
import InstallGate from './components/InstallGate';
import { exampleLists } from './data/exampleLists';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { auth, loginWithGoogle, logout, deleteAccount, updateUserProfile } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { formatPlayerName, getClientPlayerKey } from './utils/formatters';
import { useSoundEffects, useAudio } from './context/AudioContext';
import { sfx } from './utils/sfxManager';
import { Agentation } from 'agentation';

// Strict Standalone PWA detection helper with Desktop (PC/Mac) bypass
const evaluateStandalone = () => {
  if (typeof window === 'undefined') {
    return {
      isStandalone: false,
      isLocalDev: false,
      isDesktop: false,
      isStandaloneMode: false,
      isIOSStandalone: false,
      hostname: ''
    };
  }

  const hostname = window.location.hostname || '';
  const ua = (window.navigator.userAgent || '').toLowerCase();
  const platform = (window.navigator.platform || '').toLowerCase();
  const maxTouchPoints = window.navigator.maxTouchPoints || 0;

  // Accès web direct autorisé sur localhost / 127.0.0.1
  const isLocalDev = Boolean(hostname === 'localhost' || hostname === '127.0.0.1');

  // Détection Mobile / Tablette (iOS, Android, iPadOS)
  const isMobileDevice = /android|iphone|ipod|windows phone|iemobile|mobile/i.test(ua) || 
                         /ipad/i.test(ua) || 
                         (platform.includes('macintel') && maxTouchPoints > 1);

  // Ordinateurs de bureau (PC Windows, macOS, Linux)
  const isDesktop = !isMobileDevice;

  // Détection PWA Standalone (Android / Chrome)
  const isStandaloneMode = Boolean(
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
  );

  // Détection PWA Standalone (iOS Safari)
  const isIOSStandalone = Boolean(
    window.navigator && window.navigator.standalone === true
  );

  // Accès autorisé si : Dev Local (et non natif) OU Ordinateur Bureau (PC/Mac) OU Mobile installé en Standalone
  const isCapacitorNative = !!window.Capacitor?.isNative;
  const isStandalone = (isLocalDev && !isCapacitorNative) || isDesktop || isStandaloneMode || isIOSStandalone;

  return {
    isStandalone,
    isLocalDev: isLocalDev && !isCapacitorNative,
    isDesktop,
    isStandaloneMode,
    isIOSStandalone,
    hostname
  };
};

// Connect to server (uses env variable or fallback to localhost)
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;
const socket = io(API_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  timeout: 10000
});

function App() {
  const [standaloneDebug, setStandaloneDebug] = useState(() => evaluateStandalone());
  const isStandalone = standaloneDebug.isStandalone;
  const { playMessageReceived, playNotification, setIsInGame } = useAudio();
  const [hasEnteredApp, setHasEnteredApp] = useState(false);

  const [view, setView] = useState('home'); // home, lobby, game, results

  // Init custom keyboard size from localStorage
  useEffect(() => {
    const savedSize = localStorage.getItem('wana_keyboard_size');
    if (savedSize) {
      document.documentElement.style.setProperty('--kb-height', `${savedSize}dvh`);
    } else {
      document.documentElement.style.setProperty('--kb-height', `40dvh`);
    }
  }, []);

  // Gestion du bouton retour matériel (Android)
  useEffect(() => {
    const handleBackPress = () => {
      if (view === 'game' || view === 'vengeance' || view === 'tug_of_war') {
        // En jeu, émettre un événement pour le composant Game afin de mettre en pause
        window.dispatchEvent(new CustomEvent('requestTogglePause'));
      } else if (view !== 'home') {
        // Revenir à l'accueil depuis le lobby ou les résultats
        setView('home');
      } else {
        // Sur Home, quitter l'application
        if (window.Capacitor?.isNative && CapacitorApp) {
          CapacitorApp.exitApp().catch(() => {});
        }
      }
    };
    window.addEventListener('hardwareBackPress', handleBackPress);
    return () => window.removeEventListener('hardwareBackPress', handleBackPress);
  }, [view]);



  // Global Application Config (cached in localStorage to prevent white flashes)
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_app_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { requirePwaInstall: false, guestMode: true, maintenanceMode: false, announcement: '' };
  });

  // Load global config & listen for real-time admin changes (Kill Switch)
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_URL}/api/config`);
        if (res.ok) {
          const data = await res.json();
          setConfig(prev => {
            const next = { ...prev, ...data };
            try {
              localStorage.setItem('wana_app_config', JSON.stringify(next));
            } catch {}
            return next;
          });
        }
      } catch (err) {
        console.debug('Config load error:', err);
      }
    };

    fetchConfig();

    const handleConfigUpdate = (newConfig) => {
      if (newConfig && typeof newConfig === 'object') {
        setConfig(prev => {
          const next = { ...prev, ...newConfig };
          try {
            localStorage.setItem('wana_app_config', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    };

    socket.on('config_updated', handleConfigUpdate);
    return () => {
      socket.off('config_updated', handleConfigUpdate);
    };
  }, []);


  // Automatically sync in-game state to AudioContext (mutes in-game if preferred, restores menu music when match ends)
  useEffect(() => {
    const inGame = view === 'game' || view === 'vengeance' || view === 'tug_of_war';
    setIsInGame(inGame);
  }, [view, setIsInGame]);
  const [activeTab, setActiveTab] = useState('learn'); // learn, lists, community, stats, profile
  const [session, setSession] = useState(null);
  const [players, setPlayers] = useState({});
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('wana_player_name') || '';
  });
  const [avatar, setAvatar] = useState(() => {
    return localStorage.getItem('wana_avatar') || '🦊';
  });
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
  const [chatMessages, setChatMessages] = useState([]);
  const [discordToast, setDiscordToast] = useState(null);
  const [failedWords, setFailedWords] = useState(() => {
    try {
      const saved = localStorage.getItem('wana_failed_words');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [survivalSession, setSurvivalSession] = useState(null); // { words: [...], title: '...' }
  const [tugOfWarSession, setTugOfWarSession] = useState(null); // { words: [...], title: '...', wager: 10 }

  const handleStartSurvival = (wordsList, title = 'Mode Survie') => {
    const valid = (wordsList || []).filter(w => (w.question?.trim() || w.germanWord || w.word) && (w.answer?.trim() || w.frenchPrompt || w.question));
    if (valid.length === 0) {
      alert("Aucun mot valide dans cette liste !");
      return;
    }
    setSurvivalSession({ words: valid, title });
    setView('vengeance');
  };

  const handleStartTugOfWar = (wordsList, title = 'Tir à la Corde', wager = 10) => {
    const valid = (wordsList || []).filter(w => (w.question?.trim() || w.germanWord || w.word) && (w.answer?.trim() || w.frenchPrompt || w.question));
    if (valid.length === 0) {
      alert("Aucun mot valide dans cette liste !");
      return;
    }
    setTugOfWarSession({ words: valid, title, wager });
    setView('tug_of_war');
  };

  const handlePurifySuccess = (word, apiData) => {
    setFailedWords(prev => {
      const next = prev.filter(w => (typeof w === 'string' ? w : w.word) !== word);
      try {
        localStorage.setItem('wana_failed_words', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
    // Refresh leaderboard silently
    fetch(`${API_URL}/api/leaderboard`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(() => {});
  };

  const handleDeleteFailedWord = async (wordToDelete) => {
    if (!wordToDelete) return;
    const normalizedTarget = wordToDelete.trim().toLowerCase();
    
    setFailedWords(prev => {
      const next = prev.filter(w => {
        const wStr = typeof w === 'string' ? w : (w?.word || '');
        return wStr.trim().toLowerCase() !== normalizedTarget;
      });
      try {
        localStorage.setItem('wana_failed_words', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    if (user?.uid) {
      try {
        await fetch(`${API_URL}/api/users/${user.uid}/failed-words`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: wordToDelete })
        });
      } catch (err) {
        console.error('Error deleting failed word on server:', err);
      }
    }
  };

  const handleEditFailedWord = async (oldWord, newGerman, newFrench) => {
    if (!oldWord || !newGerman?.trim()) return;
    const oldNorm = oldWord.trim().toLowerCase();

    setFailedWords(prev => {
      const next = prev.map(w => {
        const wWord = typeof w === 'string' ? w : (w?.word || '');
        if (wWord.trim().toLowerCase() === oldNorm) {
          return {
            ...(typeof w === 'object' ? w : {}),
            word: newGerman.trim(),
            question: newFrench?.trim() || w.question || newGerman.trim()
          };
        }
        return w;
      });
      try {
        localStorage.setItem('wana_failed_words', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });

    if (user?.uid) {
      try {
        await fetch(`${API_URL}/api/users/${user.uid}/failed-words/edit`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldWord, newWord: newGerman.trim(), newQuestion: newFrench?.trim() })
        });
      } catch (err) {
        console.error('Error updating failed word on server:', err);
      }
    }
  };

  const handleClearAllFailedWords = async () => {
    setFailedWords([]);
    try {
      localStorage.setItem('wana_failed_words', JSON.stringify([]));
    } catch (e) {
      console.warn(e);
    }

    if (user?.uid) {
      try {
        await fetch(`${API_URL}/api/users/${user.uid}/failed-words/clear`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (err) {
        console.error('Error clearing failed words on server:', err);
      }
    }
  };

  const [isAdminOverride, setIsAdminOverride] = useState(() => {
    try {
      return localStorage.getItem('wana_is_admin') === 'true';
    } catch {
      return false;
    }
  });

  const storedAdminUid = typeof window !== 'undefined' ? localStorage.getItem('wana_admin_uid') : null;
  const effectiveAdminUid = ADMIN_UID || storedAdminUid;

  const isAdmin = Boolean(
    (user && effectiveAdminUid && user.uid === effectiveAdminUid) ||
    isAdminOverride
  );

  const handleToggleAdmin = (enable) => {
    try {
      if (enable) {
        localStorage.setItem('wana_is_admin', 'true');
        if (user?.uid) localStorage.setItem('wana_admin_uid', user.uid);
        setIsAdminOverride(true);
      } else {
        localStorage.removeItem('wana_is_admin');
        localStorage.removeItem('wana_admin_uid');
        setIsAdminOverride(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    window.enableAdmin = () => handleToggleAdmin(true);
    window.disableAdmin = () => handleToggleAdmin(false);
  }, [user]);

  // Auto-dismiss Discord-like Toast after 4 seconds (Task 5)
  useEffect(() => {
    if (discordToast) {
      const timer = setTimeout(() => {
        setDiscordToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [discordToast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('wana_theme', theme);
  }, [theme]);

  // Standalone PWA Cache Buster helper
  const handleClearPwaCache = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = window.location.origin + window.location.pathname + '?pwa_clear=' + Date.now();
    } catch (err) {
      console.error('Error clearing PWA cache:', err);
      window.location.reload();
    }
  };

  // Expose global debug helper
  useEffect(() => {
    window.clearPwaCache = handleClearPwaCache;
    window.evaluateStandalone = evaluateStandalone;
  }, []);

  // Listen for standalone display-mode changes (e.g. installed and opened in PWA mode)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleModeChange = () => {
      setStandaloneDebug(evaluateStandalone());
    };

    handleModeChange();

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleModeChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleModeChange);
    }

    // Configurer la barre de statut Capacitor et le bouton de retour
    if (window.Capacitor?.isNative) {
      // Barre de statut
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {});

      // Bouton Retour matériel
      const backButtonListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        // Obtenir la vue actuelle directement depuis React n'est pas toujours facile dans un listener global, 
        // donc on peut émettre un event custom, ou utiliser la variable de vue depuis l'état (si on la met dans une ref)
        // Pour l'instant, on dispatch un événement 'hardwareBackPress' que les composants peuvent écouter.
        const event = new CustomEvent('hardwareBackPress', { detail: { canGoBack } });
        window.dispatchEvent(event);
      });

      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleModeChange);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleModeChange);
        }
        backButtonListener.then(listener => listener.remove()).catch(() => {});
      };
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleModeChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleModeChange);
      }
    };
  }, []);

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

  const handleSaveProfile = async (newName, newAvatar) => {
    const formatted = formatPlayerName(newName);
    const finalAvatar = newAvatar || avatar || '🦊';

    setPlayerName(formatted);
    if (newAvatar) setAvatar(newAvatar);

    localStorage.setItem('wana_player_name', formatted);
    localStorage.setItem('wana_avatar', finalAvatar);

    if (user?.uid) {
      // 1. Firebase Auth profile displayName update
      try {
        if (auth.currentUser) {
          await updateUserProfile(auth.currentUser, { displayName: formatted });
        }
      } catch (err) {
        console.warn('Firebase updateUserProfile error:', err);
      }

      // 2. Backend DB profile update
      try {
        const res = await fetch(`${API_URL}/api/users/${user.uid}/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formatted, avatar: finalAvatar })
        });
        const data = await res.json();
        if (data?.user) {
          setLeaderboard(prev => prev.map(u => u.firebaseId === user.uid ? { ...u, name: formatted, avatar: finalAvatar } : u));
        }
      } catch (err) {
        console.error('Backend update profile error:', err);
      }
    }

    // 3. Online users socket identity update
    socket.emit('register_online_user', {
      firebaseId: user?.uid || null,
      name: formatted ? `${finalAvatar} ${formatted}` : `${finalAvatar} Joueur`,
      avatar: finalAvatar
    });
    socket.emit('get_online_users');

    return true;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
      if (currentUser) {
        // Register personal user socket room for direct notifications
        socket.emit('register_user', currentUser.uid);

        const savedLocalName = localStorage.getItem('wana_player_name');
        const savedLocalAvatar = localStorage.getItem('wana_avatar');

        // Sync with backend
        try {
          const syncRes = await fetch(`${API_URL}/api/users/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              firebaseId: currentUser.uid, 
              name: savedLocalName || currentUser.displayName || 'Joueur',
              avatar: savedLocalAvatar || '🦊',
              photoURL: currentUser.photoURL || null
            })
          });
          const data = await syncRes.json();
          if (data) {
            const finalName = formatPlayerName(savedLocalName || data.name || currentUser.displayName || '');
            if (finalName) {
              setPlayerName(finalName);
              localStorage.setItem('wana_player_name', finalName);
            }
            const finalAvatar = savedLocalAvatar || data.avatar || '🦊';
            if (finalAvatar) {
              setAvatar(finalAvatar);
              localStorage.setItem('wana_avatar', finalAvatar);
            }
            if (Array.isArray(data.failedWords)) {
              setFailedWords(data.failedWords);
              localStorage.setItem('wana_failed_words', JSON.stringify(data.failedWords));
            }
          }
        } catch (err) {
          console.error('Backend sync error:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

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
      setChatMessages([
        {
          id: 'welcome',
          isSystem: true,
          text: `🎮 Salle #${fullSession.id} ouverte. Chattez, personnalisez vos mots & invitez vos amis !`,
          timestamp: Date.now()
        }
      ]);
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
      setChatMessages([]);
      localStorage.removeItem('wana_active_session');
      sessionStorage.removeItem('active_game_session');
      setView('home');
    });

    socket.on('session_closed', (data) => {
      setSession(null);
      setPlayers({});
      setIsHost(false);
      setChatMessages([]);
      localStorage.removeItem('wana_active_session');
      sessionStorage.removeItem('active_game_session');
      setView('home');
      
      const message = data?.message || "Le lobby est fermé à cause de la déconnexion de l'autre joueur.";
      playNotification();
      setToastNotif({
        icon: '⚠️',
        title: 'Lobby fermé',
        message: message
      });
      setTimeout(() => setToastNotif(null), 6000);
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
      playNotification();
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
      playNotification();
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

      playNotification();
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
      playNotification();
      setAnnouncement(msg);
    });

    socket.on('new_notification', (notif) => {
      playNotification();
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
      socket.off('session_closed');
    };
  }, [playNotification]);

  // Global Chat Listener & Discord-like Floating Toast (Task 2 & Task 5)
  useEffect(() => {
    const handleIncomingChatMessage = (msg) => {
      if (!msg) return;
      
      const isFromOtherPlayer = msg.senderId && msg.senderId !== socket.id;
      if (isFromOtherPlayer && !msg.isSystem) {
        playMessageReceived();
      }

      setChatMessages(prev => {
        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
        if (prev.some(m => m.senderId === msg.senderId && m.text === msg.text && Math.abs(m.timestamp - (msg.timestamp || Date.now())) < 2000)) {
          return prev;
        }
        return [...prev, msg];
      });

      // If user is outside active chat view, trigger floating Discord-like toast
      const isChatVisibleDirectly = ['lobby', 'game', 'results'].includes(view) && activeTab === 'learn';
      if (!isChatVisibleDirectly && isFromOtherPlayer && !msg.isSystem) {
        setDiscordToast({
          id: msg.id || Date.now(),
          senderAvatar: msg.senderAvatar || '💬',
          senderName: formatPlayerName(msg.senderName || 'Joueur'),
          text: msg.text
        });
      }
    };

    socket.on('lobby_chat_message', handleIncomingChatMessage);
    socket.on('game_chat_message', handleIncomingChatMessage);
    socket.on('receive_message', handleIncomingChatMessage);

    return () => {
      socket.off('lobby_chat_message', handleIncomingChatMessage);
      socket.off('game_chat_message', handleIncomingChatMessage);
      socket.off('receive_message', handleIncomingChatMessage);
    };
  }, [view, activeTab, playMessageReceived]);

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



  const handleManualLoginGoogle = async () => {
    try {
      try {
        if (sfx && typeof sfx.unlockAudio === 'function') {
          sfx.unlockAudio();
        }
      } catch (audioErr) {
        console.debug('Audio unlock error:', audioErr);
      }
      setHasEnteredApp(true);
      await loginWithGoogle();
    } catch (err) {
      console.error('Manual login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        alert("Erreur de connexion : " + (err.message || err.code || "Impossible de se connecter avec Google."));
      }
    }
  };

  const handleManualLoginGuest = () => {
    try {
      if (sfx && typeof sfx.unlockAudio === 'function') {
        sfx.unlockAudio();
      }
    } catch (audioErr) {
      console.debug('Audio unlock error:', audioErr);
    }
    setIsGuest(true);
    setHasEnteredApp(true);
  };

  // 🛑 HARD GATE / KILL SWITCH :
  // Si l'admin a désactivé l'obligation (requirePwaInstall === false), on bypass totalement et on donne un accès direct.
  // Si l'admin l'exige (requirePwaInstall === true) ET qu'on n'est pas en standalone, on bloque avec InstallGate.
  if (config?.requirePwaInstall === true && !isStandalone) {
    return <InstallGate />;
  }

  if (isAuthLoading) {
    return (
      <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2 style={{ color: 'var(--primary)' }}>Chargement...</h2>
      </div>
    );
  }

  const renderMainContent = () => {
    // 1. Unauthenticated users see Login Screen
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
                onClick={handleManualLoginGoogle}
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
                  onClick={handleManualLoginGuest}
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

    // 2. Authenticated users who haven't clicked enter yet see the Title Screen (Unlocks Audio)
    if (!hasEnteredApp) {
      return (
        <TitleScreen
          onEnter={() => setHasEnteredApp(true)}
          onLogout={() => {
            logout();
            setIsGuest(false);
            setHasEnteredApp(false);
          }}
          user={user}
          playerName={playerName}
          avatar={avatar}
        />
      );
    }

    // 3. Main game & dashboard views once inside
    if (view === 'tug_of_war') {
      return (
        <div className={`page-transition`}>
          {error && (
            <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', position: 'absolute', top: '1rem', left: '1rem', zIndex: 100 }}>
              {error} <button onClick={() => setError('')} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>X</button>
            </div>
          )}
          <TugOfWarArena
            words={tugOfWarSession?.words || []}
            modeTitle={tugOfWarSession?.title || 'Tir à la Corde'}
            wager={tugOfWarSession?.wager ?? 10}
            playerName={playerName}
            avatar={avatar}
            user={user}
            onEndMatch={(result) => {
              if (result?.won && user?.uid) {
                fetch(`${API_URL}/api/leaderboard`)
                  .then(res => res.json())
                  .then(data => { if (Array.isArray(data)) setLeaderboard(data); })
                  .catch(() => {});
              }
            }}
            onBackHome={() => {
              setTugOfWarSession(null);
              if (session?.id) {
                setView('lobby');
              } else {
                setView('home');
              }
            }}
          />
        </div>
      );
    }

    if (view === 'vengeance') {
      return (
        <div className={`page-transition`}>
          {error && (
            <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', position: 'absolute', top: '1rem', left: '1rem', zIndex: 100 }}>
              {error} <button onClick={() => setError('')} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>X</button>
            </div>
          )}
          <VengeanceMode 
            failedWords={survivalSession ? survivalSession.words : failedWords}
            isSurvivalMode={Boolean(survivalSession)}
            modeTitle={survivalSession?.title || 'Mode Vengeance'}
            user={user}
            onPurify={survivalSession ? null : handlePurifySuccess}
            onBackHome={() => {
              setSurvivalSession(null);
              setView('home');
            }}
            playerName={playerName}
            avatar={avatar}
          />
        </div>
      );
    }

    if (view === 'game') {
      return (
        <div className={`app-container page-transition`}>
          {error && (
            <div style={{ background: 'var(--danger)', padding: '1rem', borderRadius: '8px', position: 'absolute', top: '1rem', left: '1rem', zIndex: 100 }}>
              {error} <button onClick={() => setError('')} style={{background:'none',border:'none',color:'white',cursor:'pointer'}}>X</button>
            </div>
          )}
          <Game 
            socket={socket} 
            session={session} 
            playerName={playerName} 
            avatar={avatar} 
            chatMessages={chatMessages} 
            setChatMessages={setChatMessages} 
          />
        </div>
      );
    }

    return (
      <Layout 
        activeTab={activeTab} 
        onNavigate={(tab) => {
          setActiveTab(tab);
          if (tab === 'learn') {
            if (session?.id) {
              const sessStatus = session.status;
              if (sessStatus === 'playing' || sessStatus === 'showing_results') {
                setView('game');
              } else if (sessStatus === 'finished') {
                setView('results');
              } else {
                setView('lobby');
              }
            } else {
              setView('home');
            }
          } else {
            // When navigating to 'profile', 'lists', 'community', 'stats':
            // Switch view to 'home' to render the requested tab, but KEEP the session and socket room alive in background!
            setView('home');
          }
        }}
        user={user}
        playerName={playerName}
        avatar={avatar}
        loginWithGoogle={loginWithGoogle}
        logout={logout}
        theme={theme}
        toggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        rightPanelContent={
          <RightPanel 
            view={view}
            activeTab={activeTab}
            leaderboard={leaderboard}
            user={user}
            playerName={playerName}
            avatar={avatar}
            onQuickSolo={handleQuickSoloFromSidebar}
          />
        }
        isAdmin={isAdmin}
        onOpenAdmin={() => setShowAdmin(true)}
        unreadCount={unreadCount}
        onOpenNotifications={() => setShowNotifications(true)}
      >
        {/* Global Discord-like Chat Floating Toast (Task 2 & 5) */}
        {discordToast && (
          <div 
            className="discord-chat-toast"
            onClick={() => {
              setActiveTab('learn');
              if (session?.id) {
                const sessStatus = session.status;
                if (sessStatus === 'playing' || sessStatus === 'showing_results') setView('game');
                else if (sessStatus === 'finished') setView('results');
                else setView('lobby');
              }
              setDiscordToast(null);
            }}
          >
            <div className="discord-toast-avatar-container">
              <span className="discord-toast-avatar">{discordToast.senderAvatar || '💬'}</span>
            </div>
            <div className="discord-toast-content">
              <div className="discord-toast-header">
                <span className="discord-toast-sender">{discordToast.senderName}</span>
                <span className="discord-toast-badge">Salon</span>
              </div>
              <div className="discord-toast-text">{discordToast.text}</div>
            </div>
            <button 
              type="button"
              className="discord-toast-close"
              onClick={(e) => {
                e.stopPropagation();
                setDiscordToast(null);
              }}
              title="Fermer"
            >
              ×
            </button>
          </div>
        )}

        {/* Active Session in Background Banner */}
        {session?.id && activeTab !== 'learn' && (
          <div 
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(236, 72, 153, 0.15))',
              border: '1px solid var(--primary)',
              borderRadius: '12px',
              padding: '0.6rem 1rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.8rem',
              cursor: 'pointer'
            }}
            onClick={() => {
              setActiveTab('learn');
              const sessStatus = session.status;
              if (sessStatus === 'playing') setView('game');
              else if (sessStatus === 'finished') setView('results');
              else setView('lobby');
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}>
              <span>🎮</span>
              <span><strong>Session active en attente (#{session.id})</strong> • Cliquez pour revenir au salon</span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800 }}>Rejoindre →</span>
          </div>
        )}

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
            onSaveProfile={handleSaveProfile}
            user={user}
            loginWithGoogle={loginWithGoogle}
            logout={() => { logout(); setIsGuest(false); setHasEnteredApp(false); }}
            deleteAccount={deleteAccount}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onNavigate={setActiveTab}
            setView={setView}
            leaderboard={leaderboard}
            isGuest={isGuest}
            setIsGuest={setIsGuest}
            isAdmin={isAdmin}
            onOpenAdmin={() => setShowAdmin(true)}
            theme={theme}
            setTheme={setTheme}
            failedWords={failedWords}
            standaloneDebug={standaloneDebug}
            onClearPwaCache={handleClearPwaCache}
            onDeleteFailedWord={handleDeleteFailedWord}
            onEditFailedWord={handleEditFailedWord}
            onClearAllFailedWords={handleClearAllFailedWords}
            onStartVengeance={() => {
              setSurvivalSession(null);
              setTugOfWarSession(null);
              setView('vengeance');
            }}
            onStartSurvival={handleStartSurvival}
            onStartTugOfWar={handleStartTugOfWar}
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
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            onStartSurvival={handleStartSurvival}
            onStartTugOfWar={handleStartTugOfWar}
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
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
          />
        )}
      </Layout>
    );
  };

  return (
    <>
      {renderMainContent()}

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

      {/* Agentation visual feedback - Active in local dev OR for the confirmed administrator */}
      {(import.meta.env.DEV || isAdmin || standaloneDebug.isLocalDev) && <Agentation />}
    </>
  );
}

export default App;
