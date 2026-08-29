import React, { useState, useEffect, useRef, useCallback } from 'react';
import { formatPlayerName, extractEmoji, generateBurstParticles } from '../utils/formatters';
import { useSoundEffects } from '../context/AudioContext';
import UserProfileModal from './UserProfileModal';

const PRESET_PHRASES = [
  "💥 Ouch!",
  "🎉 Yes!",
  "🏆 GG!",
  "🔥 Try harder!",
  "⚡ Trop rapide !",
  "👏 Bien joué !",
  "🙈 Oups !",
  "⚔️ Revanche bientôt ?"
];

const PAUSE_PRESET_PHRASES = [
  "On reprend ?",
  "1 min stp !",
  "Prêt !",
  "J'arrive !"
];

/**
 * Isolated GameTimerBadge Component
 * Updates at 10Hz locally without causing the Game or Input components to re-render.
 */
const GameTimerBadge = React.memo(function GameTimerBadge({
  initialDuration = 15,
  questionIndex = 0,
  isFrozenOrPaused,
  hasAnswered,
  roundResult,
  onTimeout,
  timeRef,
  playTimeWarning
}) {
  const [timeRemaining, setTimeRemaining] = useState(initialDuration);

  useEffect(() => {
    setTimeRemaining(initialDuration);
    if (timeRef) timeRef.current = initialDuration;
  }, [initialDuration, questionIndex, timeRef]);

  // Warning sound ticker
  const rounded = Math.ceil(timeRemaining);
  useEffect(() => {
    if (rounded <= 5 && rounded > 0 && !hasAnswered && !roundResult && !isFrozenOrPaused && playTimeWarning) {
      playTimeWarning();
    }
  }, [rounded, hasAnswered, roundResult, isFrozenOrPaused, playTimeWarning]);

  useEffect(() => {
    let interval;
    if (timeRemaining > 0 && !hasAnswered && !roundResult && !isFrozenOrPaused) {
      interval = setInterval(() => {
        setTimeRemaining(t => {
          const next = Math.max(0, parseFloat((t - 0.1).toFixed(2)));
          if (timeRef) timeRef.current = next;
          if (next <= 0.05) {
            clearInterval(interval);
            if (onTimeout) onTimeout();
            return 0;
          }
          return next;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [timeRemaining, hasAnswered, roundResult, isFrozenOrPaused, onTimeout, timeRef]);

  if (roundResult) return null;

  const displaySec = Math.ceil(timeRemaining);
  const isDanger = timeRemaining < 5;

  return (
    <div
      className={`timer ${isDanger ? 'danger' : ''}`}
      style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        margin: 0,
        color: isDanger ? 'var(--danger)' : 'var(--warning)',
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    >
      ⏳ {displaySec}s
    </div>
  );
});

/**
 * Isolated GameInputForm Component
 * Manages typing input locally with 0ms lag and hardware-accelerated transitions.
 */
const GameInputForm = React.memo(function GameInputForm({
  onSubmit,
  disabled,
  placeholder,
  isFrozen,
  inputRef
}) {
  const [localAnswer, setLocalAnswer] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (disabled) return;
    onSubmit(localAnswer);
    setLocalAnswer('');
  };

  return (
    <form onSubmit={handleSubmit} style={{ margin: '0 auto 1.5rem auto', width: '100%', maxWidth: '400px', position: 'relative' }}>
      <input
        ref={inputRef}
        autoFocus
        type="text"
        className="input-field"
        value={localAnswer}
        onChange={(e) => setLocalAnswer(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ 
          textAlign: 'left', 
          fontSize: '1.25rem', 
          padding: '1rem 3.5rem 1rem 1.5rem', 
          borderRadius: '30px',
          borderColor: isFrozen ? '#38bdf8' : 'var(--border-color)',
          width: '100%',
          transform: 'translateZ(0)',
          willChange: 'border-color'
        }}
        autoComplete="off"
      />
      <button 
        type="submit" 
        style={{ 
          position: 'absolute',
          right: '6px',
          top: '50%',
          transform: 'translateY(-50%) translateZ(0)',
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 0,
          background: 'var(--primary)',
          border: 'none',
          cursor: 'pointer',
          opacity: (disabled || !localAnswer.trim()) ? 0.5 : 1,
          transition: 'all 0.2s',
          flexShrink: 0,
          willChange: 'opacity, transform'
        }}
        disabled={disabled || !localAnswer.trim()}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </button>
    </form>
  );
});

export default function Game({ socket, session, playerName = '', avatar = '🦊', chatMessages = [], setChatMessages }) {
  const {
    playMessageSent,
    playReactionBurst,
    playCountdownTick,
    playCountdownGo,
    playTimeWarning,
    playOpponentAnswered,
    playFreeze,
    playSuccess,
    playError,
    isGameMusicMuted,
    toggleGameMusicMute,
    isSoundEnabled,
    toggleSound
  } = useSoundEffects();
  const [question, setQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(session?.settings?.rounds || 0);
  const [initialRoundDuration, setInitialRoundDuration] = useState(15);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [roundResult, setRoundResult] = useState(null); // { players: {}, correctAnswer: '' }
  const [players, setPlayers] = useState(session?.players || {});
  const [jokers, setJokers] = useState(3);
  const [jokerHint, setJokerHint] = useState('');
  const [streak, setStreak] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenTime, setFrozenTime] = useState(0); // Power-up freeze state in seconds
  const [isPaused, setIsPaused] = useState(false);
  const [pauseData, setPauseData] = useState(null);
  const [pausedBy, setPausedBy] = useState(null);
  const [pauseTimeRemaining, setPauseTimeRemaining] = useState(60);
  const [pauseCooldownRemaining, setPauseCooldownRemaining] = useState(0);
  const [isPausingEnabled, setIsPausingEnabled] = useState(true);

  // Leave / Terminate Request States
  // 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'refused'
  const [leaveRequestState, setLeaveRequestState] = useState('none');
  const [leaveRequesterName, setLeaveRequesterName] = useState('');
  const [leaveRequestCountdown, setLeaveRequestCountdown] = useState(30);

  const [floatingReactions, setFloatingReactions] = useState([]);
  const [reactionCooldown, setReactionCooldown] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);

  // Disconnection Grace Period state (30s)
  const [disconnectGrace, setDisconnectGrace] = useState({ disconnected: false, playerName: '', secondsRemaining: 30 });

  // Chat states
  const [isQuickChatOpen, setIsQuickChatOpen] = useState(false);
  const [quickChatInput, setQuickChatInput] = useState('');
  const [pauseChatInput, setPauseChatInput] = useState('');
  const [floatingBubbles, setFloatingBubbles] = useState([]);
  const pauseChatEndRef = useRef(null);

  const [readyCount, setReadyCount] = useState({ ready: 0, total: 0 });
  const [iAmReady, setIAmReady] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState(null);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  const [leaderId, setLeaderId] = useState(null);
  const [overtakerId, setOvertakerId] = useState(null);
  
  const inputRef = useRef(null);
  const timeRemainingRef = useRef(15);
  const hasAnsweredRef = useRef(hasAnswered);
  const isGameFrozenOrPausedRef = useRef(false);
  const sessionRef = useRef(session);
  const toastTimeoutRef = useRef(null);
  const overtakerTimeoutRef = useRef(null);
  const flashTimeoutRef = useRef(null);
  const audioTimeoutRef = useRef(null);

  const [flashEffect, setFlashEffect] = useState(null); // 'success' | 'error' | null

  useEffect(() => {
    hasAnsweredRef.current = hasAnswered;
  }, [hasAnswered]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const isGameFrozenOrPaused = isPaused || leaveRequestState !== 'none' || disconnectGrace.disconnected;

  useEffect(() => {
    isGameFrozenOrPausedRef.current = isGameFrozenOrPaused;
  }, [isGameFrozenOrPaused]);

  // Cancel any active SpeechSynthesis on unmount to avoid memory/audio leaks
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (overtakerTimeoutRef.current) clearTimeout(overtakerTimeoutRef.current);
      if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
      if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
    };
  }, []);

  // Force auto-focus on input whenever a new word is displayed or round becomes active (Task 3)
  useEffect(() => {
    if (!roundResult && !hasAnswered && !isFrozen && !isPaused && leaveRequestState === 'none' && !disconnectGrace.disconnected) {
      inputRef.current?.focus();
    }
  }, [question, roundResult, hasAnswered, isFrozen, isPaused, leaveRequestState, disconnectGrace.disconnected]);

  const allowPause = session?.settings?.allowPause !== false;

  const showToast = (text, type = 'info') => {
    setToastMessage({ text, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const playAudio = (text) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'de-DE'; // German
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error(e);
    }
  };

  // Disconnect Grace 30s timer ticker
  useEffect(() => {
    let timer;
    if (disconnectGrace.disconnected && disconnectGrace.secondsRemaining > 0) {
      timer = setInterval(() => {
        setDisconnectGrace(prev => {
          if (prev.secondsRemaining <= 1) {
            clearInterval(timer);
            return { ...prev, secondsRemaining: 0 };
          }
          return { ...prev, secondsRemaining: prev.secondsRemaining - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [disconnectGrace.disconnected, disconnectGrace.secondsRemaining]);

  // Leaderboard overtake detection
  useEffect(() => {
    let maxScore = -1;
    let currentLeader = null;
    let tie = false;

    Object.values(players).forEach(p => {
      if (p.score > maxScore) {
        maxScore = p.score;
        currentLeader = p.id;
        tie = false;
      } else if (p.score === maxScore && maxScore > 0) {
        tie = true;
      }
    });

    if (maxScore === 0) currentLeader = null;
    if (tie) currentLeader = null;

    if (currentLeader && leaderId !== currentLeader) {
      if (leaderId !== null) {
        setOvertakerId(currentLeader);
        if (overtakerTimeoutRef.current) clearTimeout(overtakerTimeoutRef.current);
        overtakerTimeoutRef.current = setTimeout(() => setOvertakerId(null), 1500);
      }
      setLeaderId(currentLeader);
    }
  }, [players, leaderId]);

  // Auto-scroll pause chat
  useEffect(() => {
    if (isPaused) {
      pauseChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isPaused]);

  // Reaction & Quick Message Cooldown Countdown ticker (5s)
  useEffect(() => {
    if (reactionCooldown > 0) {
      const timer = setInterval(() => {
        setReactionCooldown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [reactionCooldown]);

  // Synchronized Sound on Word Appearance (DOM Render)
  useEffect(() => {
    if (question && !roundResult && !isPaused) {
      playCountdownGo();
    }
  }, [questionIndex, question, roundResult, isPaused, playCountdownGo]);

  // Socket Events
  useEffect(() => {
    const onNewQuestion = (data) => {
      setQuestion(data.question);
      setQuestionIndex(data.questionIndex);
      setTotalQuestions(data.totalQuestions);
      setInitialRoundDuration(data.duration || 15);
      timeRemainingRef.current = data.duration || 15;
      setHasAnswered(false);
      hasAnsweredRef.current = false;
      setJokerHint('');
      setRoundResult(null);
      setIAmReady(false);
      setReadyCount({ ready: 0, total: 0 });
      setIsPaused(false);
      setPauseData(null);
      setLeaveRequestState('none');
      setDisconnectGrace({ disconnected: false, playerName: '', secondsRemaining: 30 });
      if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
      focusTimeoutRef.current = setTimeout(() => inputRef.current?.focus(), 100);
    };

    const onRoundResults = (result) => {
      setHasAnswered(true);
      hasAnsweredRef.current = true;
      setRoundResult(result);
      setPlayers(result.players);
      
      const myPlayer = result.players[socket.id];
      if (myPlayer) {
        setQuestionIndex(prevIndex => {
          const myAns = myPlayer.answers[prevIndex];
          if (myAns) {
            const isSuccess = myAns.score >= 50;
            setFlashEffect(isSuccess ? 'success' : 'error');
            if (isSuccess) {
              playSuccess();
            } else {
              playError();
            }
            if (flashTimeoutRef.current) clearTimeout(flashTimeoutRef.current);
            flashTimeoutRef.current = setTimeout(() => setFlashEffect(null), 1000);
          }
          return prevIndex;
        });
      }

      if (result.correctAnswer) {
        if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
        audioTimeoutRef.current = setTimeout(() => playAudio(result.correctAnswer), 500);
      }
    };

    const onJokerResult = (hint) => setJokerHint(hint);

    const onPowerupFrozen = (durationSeconds) => {
      playFreeze();
      setIsFrozen(true);
      setTimeout(() => setIsFrozen(false), durationSeconds * 1000);
    };

    const onOpponentAnswered = (data) => {
      if (data?.playerId !== socket.id && !hasAnsweredRef.current) {
        playOpponentAnswered();
      }
    };

    const onGamePaused = (data) => {
      setIsPaused(true);
      setPauseData(data);
      if (typeof data.timeRemaining === 'number') {
        timeRemainingRef.current = data.timeRemaining;
        setInitialRoundDuration(data.timeRemaining);
      }
    };

    const onGameResumed = (data) => {
      setIsPaused(false);
      setPauseData(null);
      setLeaveRequestState('none');
      setDisconnectGrace({ disconnected: false, playerName: '', secondsRemaining: 30 });
      if (typeof data?.timeRemaining === 'number') {
        timeRemainingRef.current = data.timeRemaining;
        setInitialRoundDuration(data.timeRemaining);
      }
    };

    const onPauseDisabled = () => showToast("L'hôte a désactivé la mise en pause pour cette partie.", 'error');

    const onTerminateRequested = (data) => {
      setLeaveRequestState('received');
      setLeaveRequesterName(data?.requesterName || "L'adversaire");
    };

    const onTerminatePending = () => setLeaveRequestState('pending');

    const onTerminateCancelled = () => {
      setLeaveRequestState('none');
      showToast("La demande d'arrêt a été annulée. La partie reprend !", 'info');
    };

    const onTerminateRefused = () => {
      setLeaveRequestState('none');
      showToast("L'adversaire a refusé l'arrêt de la partie. La partie continue !", 'warning');
    };

    const onPlayerDisconnectedGrace = (data) => {
      if (data.playerId !== socket.id) {
        setDisconnectGrace({
          disconnected: true,
          playerName: data.playerName || "L'adversaire",
          secondsRemaining: data.graceSeconds || 30
        });
      }
    };

    const onPlayerReconnected = (data) => {
      setDisconnectGrace({ disconnected: false, playerName: '', secondsRemaining: 30 });
      setIsPaused(false);
      showToast(`⚡ ${formatPlayerName(data.playerName) || 'Adversaire'} s'est reconnecté ! La partie reprend.`, 'success');
    };

    const onReadyCount = (data) => {
      if (data && data.ready > 0) {
        playCountdownTick();
      }
      setReadyCount(data);
    };

    const onGameChatMessage = (msg) => {
      if (!msg) return;
      if (setChatMessages) {
        setChatMessages(prev => {
          if (msg.id && prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      if (msg.senderId !== socket?.id) {
        setFloatingBubbles(prev => [...prev.slice(-3), msg]);
        setTimeout(() => {
          setFloatingBubbles(prev => prev.filter(b => b.id !== msg.id));
        }, 3500);
      }
    };

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

    socket.on('new_question', onNewQuestion);
    socket.on('round_results', onRoundResults);
    socket.on('joker_result', onJokerResult);
    socket.on('powerup_frozen', onPowerupFrozen);
    socket.on('opponent_answered', onOpponentAnswered);
    socket.on('game_paused', onGamePaused);
    socket.on('game_resumed', onGameResumed);
    socket.on('pause_disabled', onPauseDisabled);
    socket.on('terminate_requested', onTerminateRequested);
    socket.on('terminate_pending', onTerminatePending);
    socket.on('terminate_cancelled', onTerminateCancelled);
    socket.on('terminate_refused', onTerminateRefused);
    socket.on('player_disconnected_grace', onPlayerDisconnectedGrace);
    socket.on('player_reconnected', onPlayerReconnected);
    socket.on('ready_count', onReadyCount);
    socket.on('game_chat_message', onGameChatMessage);
    socket.on('floating_reaction_burst', handleReactionBurst);
    socket.on('floating_reaction', handleReactionBurst);

    return () => {
      socket.off('new_question', onNewQuestion);
      socket.off('round_results', onRoundResults);
      socket.off('joker_result', onJokerResult);
      socket.off('powerup_frozen', onPowerupFrozen);
      socket.off('opponent_answered', onOpponentAnswered);
      socket.off('game_paused', onGamePaused);
      socket.off('game_resumed', onGameResumed);
      socket.off('pause_disabled', onPauseDisabled);
      socket.off('terminate_requested', onTerminateRequested);
      socket.off('terminate_pending', onTerminatePending);
      socket.off('terminate_cancelled', onTerminateCancelled);
      socket.off('terminate_refused', onTerminateRefused);
      socket.off('player_disconnected_grace', onPlayerDisconnectedGrace);
      socket.off('player_reconnected', onPlayerReconnected);
      socket.off('ready_count', onReadyCount);
      socket.off('game_chat_message', onGameChatMessage);
      socket.off('floating_reaction_burst', handleReactionBurst);
      socket.off('floating_reaction', handleReactionBurst);
    };
  }, [socket, playCountdownGo, playSuccess, playError, playFreeze, playOpponentAnswered, playCountdownTick, playReactionBurst]);

  const submitAnswer = useCallback((ans = '') => {
    if (hasAnsweredRef.current || isGameFrozenOrPausedRef.current) return;
    setHasAnswered(true);
    hasAnsweredRef.current = true;
    socket.emit('submit_answer', {
      sessionId: sessionRef.current?.id,
      answer: ans,
      timeRemaining: timeRemainingRef.current
    });
  }, [socket]);

  const handleUseJoker = () => {
    if (jokers > 0 && !hasAnswered && !isGameFrozenOrPaused) {
      setJokers(j => j - 1);
      socket.emit('use_joker', session?.id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isGameFrozenOrPaused) return;
    if (roundResult) {
      handleReadyForNext();
      return;
    }
    submitAnswer();
  };

  const handleReadyForNext = () => {
    if (iAmReady || isGameFrozenOrPaused) return;
    setIAmReady(true);
    playCountdownTick();
    socket.emit('ready_for_next', session?.id);
  };

  // Leave Actions
  const handleRequestTerminate = () => {
    socket.emit('request_terminate', session?.id);
  };

  const handleCancelTerminate = () => {
    socket.emit('cancel_terminate', session?.id);
    setLeaveRequestState('none');
  };

  const handleAcceptTerminate = () => {
    socket.emit('accept_terminate', session?.id);
    setLeaveRequestState('none');
  };

  const handleRefuseTerminate = () => {
    socket.emit('refuse_terminate', session?.id);
    setLeaveRequestState('none');
  };

  // Pause Actions
  const handleTogglePause = () => {
    if (isPaused) {
      socket.emit('resume_game', session?.id);
    } else {
      socket.emit('request_pause', session?.id);
    }
  };

  const handleResumeGame = () => {
    socket.emit('resume_game', session?.id);
  };

  const handleSendQuickMessage = (text) => {
    if (reactionCooldown > 0 || !session?.id) return;
    
    playMessageSent();
    playReactionBurst();

    // Extract pure emoji & generate 8 full-screen particles if emoji exists
    const cleanEmoji = extractEmoji(text);
    const { particles } = generateBurstParticles(cleanEmoji || '💬');

    // Instant local feedback for sender: particles
    setFloatingReactions(prev => [...prev, ...particles]);
    setTimeout(() => {
      const idsToRemove = new Set(particles.map(p => p.id));
      setFloatingReactions(prev => prev.filter(r => !idsToRemove.has(r.id)));
    }, 2500);

    // Instant local feedback for sender: floating message bubble
    const localMsg = {
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      senderId: socket?.id,
      senderName: playerName || 'Vous',
      senderAvatar: avatar || '🦊',
      text: text.trim(),
      preset: true,
      timestamp: Date.now()
    };

    setFloatingBubbles(prev => [...prev.slice(-3), localMsg]);
    setTimeout(() => {
      setFloatingBubbles(prev => prev.filter(b => b.id !== localMsg.id));
    }, 3500);

    if (setChatMessages) {
      setChatMessages(prev => [...prev, localMsg]);
    }

    // Broadcast burst to Opponent with ONLY the extracted emoji
    socket.emit('send_reaction_burst', {
      sessionId: session?.id,
      emoji: cleanEmoji || '💬',
      particles,
      senderName: playerName
    });

    // Broadcast game chat message
    socket.emit('game_chat_message', {
      sessionId: session?.id,
      text: text.trim(),
      preset: true,
      id: localMsg.id
    });

    setReactionCooldown(2.5);
  };

  const handleSendReaction = handleSendQuickMessage;

  const handleSendCustomQuickChat = (e) => {
    e.preventDefault();
    if (!quickChatInput.trim() || !session?.id) return;
    playMessageSent();

    const localMsg = {
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      senderId: socket?.id,
      senderName: playerName || 'Vous',
      senderAvatar: avatar || '🦊',
      text: quickChatInput.trim(),
      preset: false,
      timestamp: Date.now()
    };

    setFloatingBubbles(prev => [...prev.slice(-3), localMsg]);
    setTimeout(() => {
      setFloatingBubbles(prev => prev.filter(b => b.id !== localMsg.id));
    }, 3500);

    if (setChatMessages) {
      setChatMessages(prev => [...prev, localMsg]);
    }

    socket.emit('game_chat_message', {
      sessionId: session?.id,
      text: quickChatInput.trim(),
      preset: false,
      id: localMsg.id
    });
    setQuickChatInput('');
  };

  const handleSendPauseChat = (e) => {
    e.preventDefault();
    if (!pauseChatInput.trim() || !session?.id) return;
    playMessageSent();

    const localMsg = {
      id: Math.random().toString(36).substring(2, 9) + Date.now(),
      senderId: socket?.id,
      senderName: playerName || 'Vous',
      senderAvatar: avatar || '🦊',
      text: pauseChatInput.trim(),
      preset: false,
      timestamp: Date.now()
    };

    setFloatingBubbles(prev => [...prev.slice(-3), localMsg]);
    setTimeout(() => {
      setFloatingBubbles(prev => prev.filter(b => b.id !== localMsg.id));
    }, 3500);

    if (setChatMessages) {
      setChatMessages(prev => [...prev, localMsg]);
    }

    socket.emit('game_chat_message', {
      sessionId: session?.id,
      text: pauseChatInput.trim(),
      preset: false,
      id: localMsg.id
    });
    setPauseChatInput('');
  };

  const renderDiff = (expected, actual, isCorrect, isTypo) => {
    if (!actual) return <span style={{ color: 'var(--danger)' }}>(Aucune réponse)</span>;
    if (isCorrect || isTypo) return <span style={{ color: 'var(--success)' }}>{actual}</span>;
    
    let matchCount = 0;
    for(let i=0; i<Math.min(expected.length, actual.length); i++) {
      if(expected[i].toLowerCase() === actual[i].toLowerCase()) matchCount++;
    }
    if (matchCount < expected.length / 3) {
      return <span style={{ color: 'var(--danger)' }}>{actual}</span>;
    }
    
    return (
      <span>
        {actual.split('').map((char, i) => {
          const isMatch = expected[i] && expected[i].toLowerCase() === char.toLowerCase();
          return <span key={i} style={{ color: isMatch ? 'var(--text-light)' : 'var(--danger)' }}>{char}</span>;
        })}
      </span>
    );
  };

  const isBlurred = isPaused || leaveRequestState !== 'none' || disconnectGrace.disconnected;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', flex: 1 }}>
      
      {/* Flash Effect Overlay */}
      {flashEffect && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          backgroundColor: flashEffect === 'success' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
          zIndex: 9999,
          animation: 'fadeOut 1s forwards'
        }} />
      )}

      {/* Global Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: toastMessage.type === 'error' ? 'var(--danger)' : toastMessage.type === 'warning' ? 'var(--warning)' : toastMessage.type === 'success' ? 'var(--success)' : 'var(--primary)',
          color: '#ffffff',
          padding: '0.65rem 1.4rem',
          borderRadius: '30px',
          zIndex: 9999,
          fontWeight: 'bold',
          fontSize: '0.9rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          animation: 'fadeIn 0.25s ease-out',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <span>{toastMessage.type === 'error' ? '🚫' : toastMessage.type === 'warning' ? '⚠️' : toastMessage.type === 'success' ? '⚡' : 'ℹ️'}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* =========================================================
          DISCONNECTION GRACE PERIOD OVERLAY (30s TIMER)
         ========================================================= */}
      {disconnectGrace.disconnected && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="card" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            border: '2px solid var(--warning)',
            boxShadow: '0 25px 50px -12px rgba(245, 158, 11, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem'
          }}>
            <div style={{ fontSize: '3rem', animation: 'pulse 1s infinite' }}>📡</div>
            <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--text-main)' }}>
              Adversaire déconnecté
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--warning)' }}>{formatPlayerName(disconnectGrace.playerName)}</strong> a perdu la connexion.
              La partie est mise en pause.
            </p>

            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid var(--warning)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Temps restant pour sa reconnexion :</span>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--warning)' }}>
                {disconnectGrace.secondsRemaining}s
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Si l'adversaire ne revient pas, la victoire vous sera accordée par forfait.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          1. LEAVE REQUEST MODALS (BLURRED OVERLAY)
         ========================================================= */}
      
      {/* 1A. SENDER WAITING MODAL */}
      {leaveRequestState === 'pending' && !disconnectGrace.disconnected && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="card" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            border: '2px solid var(--border-color)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem'
          }}>
            <div style={{ fontSize: '3rem', animation: 'pulse 1.5s infinite' }}>🚪</div>
            <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-main)' }}>
              Demande pour quitter envoyée
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              La partie est mise en pause. En attente de la confirmation de votre adversaire...
            </p>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: 'var(--warning)',
              fontSize: '0.85rem',
              background: 'rgba(245, 158, 11, 0.1)',
              padding: '0.5rem',
              borderRadius: '8px'
            }}>
              <span>⏳</span> <span>Vous pouvez annuler à tout moment pour reprendre le jeu.</span>
            </div>

            <button 
              onClick={handleCancelTerminate} 
              className="btn btn-secondary"
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}
            >
              <span>✖️</span> Annuler la demande & Reprendre
            </button>
          </div>
        </div>
      )}

      {/* 1B. OPPONENT CONFIRMATION MODAL */}
      {leaveRequestState === 'received' && !disconnectGrace.disconnected && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1.5rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="card" style={{
            maxWidth: '440px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            border: '2px solid var(--danger)',
            boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.2rem'
          }}>
            <div style={{ fontSize: '3rem' }}>⚠️</div>
            <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-main)' }}>
              Demande pour quitter la partie
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-main)' }}>{formatPlayerName(leaveRequesterName)}</strong> souhaite arrêter et quitter la partie en cours.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={handleAcceptTerminate} 
                className="btn btn-primary" 
                style={{ 
                  background: 'var(--danger)', 
                  borderColor: 'var(--danger)',
                  flex: 1,
                  minWidth: '140px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                ✅ Accepter & Quitter
              </button>
              <button 
                onClick={handleRefuseTerminate} 
                className="btn btn-secondary"
                style={{ 
                  flex: 1,
                  minWidth: '140px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.9rem'
                }}
              >
                ❌ Refuser & Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          2. IN-GAME PAUSE & CHAT MODAL (BLURRED OVERLAY)
         ========================================================= */}
      {isPaused && leaveRequestState === 'none' && !disconnectGrace.disconnected && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          zIndex: 900,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.25s ease-out'
        }}>
          <div className="card" style={{
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '2px solid var(--primary)',
            boxShadow: '0 25px 50px -12px rgba(99, 102, 241, 0.4)',
            textAlign: 'left'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.8rem' }}>⏸️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>Partie en Pause</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Mise en pause par <strong>{formatPlayerName(pauseData?.pausedByName) || 'un joueur'}</strong>
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={handleRequestTerminate}
                  className="btn btn-secondary"
                  style={{
                    width: 'auto',
                    padding: '0.6rem 1rem',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: '#f87171',
                    borderColor: 'rgba(239, 68, 68, 0.45)',
                    background: 'rgba(239, 68, 68, 0.12)'
                  }}
                  title="Demander à sortir / quitter la partie"
                >
                  🚪 Quitter
                </button>

                <button
                  onClick={handleResumeGame}
                  className="btn btn-primary btn-resume-glow"
                  style={{
                    width: 'auto',
                    padding: '0.6rem 1.4rem',
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderRadius: '12px'
                  }}
                >
                  <span>▶️</span> REPRENDRE
                </button>
              </div>
            </div>

            {/* In-Pause Chat Box History (Enlarged) */}
            <div style={{
              flex: 1,
              height: '280px',
              minHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              paddingRight: '0.3rem',
              background: 'var(--bg-main)',
              borderRadius: '10px',
              padding: '0.75rem',
              border: '1px solid var(--border-color)'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem', gap: '0.4rem' }}>
                  <span>💬</span>
                  <span>Discutez avec votre adversaire pendant la pause</span>
                </div>
              ) : (
                chatMessages.map(m => {
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
                      </div>
                      <div style={{
                        padding: '0.45rem 0.75rem',
                        borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMe ? 'var(--primary)' : 'var(--bg-surface)',
                        color: isMe ? '#ffffff' : 'var(--text-main)',
                        border: isMe ? 'none' : '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        wordBreak: 'break-word'
                      }}>
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={pauseChatEndRef} />
            </div>

            {/* Quick Chips in Pause Chat */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {PAUSE_PRESET_PHRASES.map((preset, idx) => (
                <button
                  key={idx}
                  disabled={reactionCooldown > 0}
                  onClick={() => handleSendQuickMessage(preset)}
                  style={{
                    background: reactionCooldown > 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-color)',
                    color: reactionCooldown > 0 ? 'var(--text-muted)' : 'var(--text-main)',
                    borderRadius: '16px',
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.75rem',
                    cursor: reactionCooldown > 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: reactionCooldown > 0 ? 0.6 : 1
                  }}
                >
                  {preset} {reactionCooldown > 0 ? `(${reactionCooldown}s)` : ''}
                </button>
              ))}
            </div>

            {/* Pause Chat Input */}
            <form onSubmit={handleSendPauseChat} style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Envoyer un message pendant la pause..."
                value={pauseChatInput}
                onChange={(e) => setPauseChatInput(e.target.value)}
                maxLength={200}
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!pauseChatInput.trim()}
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          3. FLOATING MESSENGER BUBBLES (TOP-RIGHT, NON-INTRUSIVE)
         ========================================================= */}
      <div style={{
        position: 'fixed',
        top: '4.8rem',
        right: '1rem',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        pointerEvents: 'none',
        maxWidth: '280px',
        width: 'calc(100vw - 2rem)'
      }}>
        {floatingBubbles.map((bubble) => {
          const isMe = bubble.senderId === socket.id;
          return (
            <div
              key={bubble.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(31, 41, 55, 0.95)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: isMe ? '1.5px solid var(--primary)' : '1.5px solid var(--warning)',
                boxShadow: '0 8px 20px rgba(0, 0, 0, 0.45)',
                padding: '0.45rem 0.8rem',
                borderRadius: '24px',
                animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                color: 'var(--text-main)',
                textAlign: 'right'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.7rem', color: isMe ? 'var(--primary)' : 'var(--warning)', fontWeight: 'bold', lineHeight: 1.1 }}>
                  {isMe ? 'Vous' : formatPlayerName(bubble.senderName)}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', wordBreak: 'break-word', lineHeight: 1.2 }}>
                  {bubble.text}
                </span>
              </div>

              <div style={{
                fontSize: '1.2rem',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: isMe ? 'rgba(99, 102, 241, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {bubble.senderAvatar || '🦊'}
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================
          TOP-LEFT ACTIONS: PAUSE PAR DÉFAUT + MENU VERTICAL FLOU (QUITTER, MUSIQUE, SON)
         ========================================================= */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '0.45rem',
        zIndex: 60
      }}>
        {/* Main Pill: Pause + Bouton ▶/▼ d'extension */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.25rem',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1.5px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '24px',
          padding: '3px 6px',
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.35)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)'
        }}>
          {/* Pause / Reprendre (Affiché par défaut) */}
          {allowPause ? (
            <button
              type="button"
              onClick={handleTogglePause}
              style={{
                background: isPaused ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                border: 'none',
                color: isPaused ? '#fbbf24' : 'var(--warning)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                fontWeight: 800,
                padding: '0.25rem 0.55rem',
                borderRadius: '16px',
                transition: 'all 0.2s ease'
              }}
              title={isPaused ? "Reprendre la partie" : "Mettre la partie en pause"}
            >
              <span>{isPaused ? '▶️' : '⏸️'}</span>
              <span style={{ fontSize: '0.78rem', letterSpacing: '0.3px' }}>
                {isPaused ? 'Reprendre' : 'Pause'}
              </span>
            </button>
          ) : (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.25rem 0.5rem',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              fontWeight: 700
            }}>
              ⚙️ Menu
            </div>
          )}

          {/* Bouton pour afficher/masquer verticalement */}
          <button
            type="button"
            onClick={() => setIsControlsExpanded(v => !v)}
            style={{
              background: isControlsExpanded ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.08)',
              border: isControlsExpanded ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.1)',
              color: isControlsExpanded ? '#ffffff' : 'var(--text-main)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.65rem',
              fontWeight: 900,
              padding: 0,
              transition: 'all 0.2s ease'
            }}
            title={isControlsExpanded ? "Fermer le menu" : "Afficher plus d'options"}
          >
            {isControlsExpanded ? '▲' : '▼'}
          </button>
        </div>

        {/* Menu vertical avec arrière-plan flou (Blur) */}
        {isControlsExpanded && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1.5px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '16px',
            padding: '0.45rem',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            minWidth: '160px',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Musique de fond */}
            <button
              type="button"
              onClick={toggleGameMusicMute}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                background: isGameMusicMuted ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${isGameMusicMuted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '10px',
                padding: '0.4rem 0.65rem',
                color: isGameMusicMuted ? 'var(--danger)' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.78rem',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left'
              }}
              title={isGameMusicMuted ? "Activer la musique de fond" : "Couper la musique de fond"}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{isGameMusicMuted ? '🔇' : '🎵'}</span>
                <span>Musique</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: isGameMusicMuted ? 'var(--danger)' : 'var(--primary)', fontWeight: 700 }}>
                {isGameMusicMuted ? 'Off' : 'On'}
              </span>
            </button>

            {/* Effets sonores / Bruitages */}
            <button
              type="button"
              onClick={toggleSound}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
                background: !isSoundEnabled ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${!isSoundEnabled ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '10px',
                padding: '0.4rem 0.65rem',
                color: !isSoundEnabled ? 'var(--danger)' : 'var(--text-main)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.78rem',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left'
              }}
              title={!isSoundEnabled ? "Activer les bruitages" : "Couper les bruitages"}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>{!isSoundEnabled ? '🔇' : '🔊'}</span>
                <span>Sons</span>
              </div>
              <span style={{ fontSize: '0.7rem', color: !isSoundEnabled ? 'var(--danger)' : 'var(--primary)', fontWeight: 700 }}>
                {!isSoundEnabled ? 'Off' : 'On'}
              </span>
            </button>

            {/* Séparateur discret */}
            <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '2px 0' }} />

            {/* Quitter */}
            <button
              type="button"
              onClick={handleRequestTerminate}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                padding: '0.4rem 0.65rem',
                color: 'var(--danger)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.78rem',
                transition: 'all 0.15s ease',
                width: '100%',
                textAlign: 'left'
              }}
              title="Quitter la partie"
            >
              <span>🚪</span>
              <span>Quitter la partie</span>
            </button>
          </div>
        )}
      </div>

      {/* =========================================================
          TOP-RIGHT ACTION: CHAT (EN HAUT A DROITE)
         ========================================================= */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        alignItems: 'center',
        zIndex: 60
      }}>
        <button 
          onClick={() => setIsQuickChatOpen(v => !v)}
          style={{ 
            background: isQuickChatOpen ? 'var(--primary)' : 'var(--bg-main)', 
            border: `2px solid ${isQuickChatOpen ? 'var(--primary)' : 'var(--border-color)'}`, 
            color: isQuickChatOpen ? '#ffffff' : 'var(--primary)', 
            cursor: 'pointer', 
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
          title="Réactions & Chat rapide en jeu"
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>💬</span>
        </button>
      </div>

      {/* QUICK CHAT POPOVER (Positioned in Top-Right) */}
      {isQuickChatOpen && (
        <div style={{
          position: 'absolute',
          top: '3.6rem',
          right: '1rem',
          width: '270px',
          background: 'var(--bg-surface)',
          border: '2px solid var(--primary)',
          borderRadius: '16px',
          boxShadow: '0 16px 36px rgba(0,0,0,0.5)',
          padding: '0.8rem',
          zIndex: 85,
          textAlign: 'left',
          animation: 'fadeIn 0.2s ease-out',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.6rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              ⚡ Réactions en 1 clic
            </span>
            <button 
              onClick={() => setIsQuickChatOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
            >
              ✕
            </button>
          </div>

          {/* Preset Buttons Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem' }}>
            {PRESET_PHRASES.map((preset, idx) => (
              <button
                key={idx}
                disabled={reactionCooldown > 0}
                onClick={() => {
                  handleSendQuickMessage(preset);
                  setIsQuickChatOpen(false);
                }}
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  color: reactionCooldown > 0 ? 'var(--text-muted)' : 'var(--text-main)',
                  borderRadius: '8px',
                  padding: '0.35rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: reactionCooldown > 0 ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  opacity: reactionCooldown > 0 ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (reactionCooldown === 0) {
                    e.currentTarget.style.borderColor = 'var(--primary)';
                    e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                  e.currentTarget.style.background = 'var(--bg-main)';
                }}
              >
                {preset} {reactionCooldown > 0 ? `(${reactionCooldown}s)` : ''}
              </button>
            ))}
          </div>

          {/* Custom Quick Message Input */}
          <form onSubmit={(e) => { handleSendCustomQuickChat(e); setIsQuickChatOpen(false); }} style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Message personnalisé..."
              value={quickChatInput}
              onChange={(e) => setQuickChatInput(e.target.value)}
              maxLength={100}
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', borderRadius: '8px' }}
            />
            <button
              type="submit"
              disabled={!quickChatInput.trim()}
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0.35rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}
            >
              ➔
            </button>
          </form>
        </div>
      )}

      {/* =========================================================
          MAIN GAME BODY (BLURRED DURING PAUSE & QUIT REQUEST)
         ========================================================= */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        filter: isBlurred ? 'blur(8px)' : 'none',
        pointerEvents: isBlurred ? 'none' : 'auto',
        transition: 'filter 0.3s ease, opacity 0.3s ease',
        opacity: isBlurred ? 0.6 : 1
      }}>
        
        {/* Scoreboard Header */}
        <div className="score-board card" style={{ padding: '0.5rem 1rem', marginBottom: '1rem' }}>
          {Object.values(players).map((p) => {
            const isLeader = p.id === leaderId;
            const isOvertaking = p.id === overtakerId;
            return (
              <div 
                key={p.id} 
                className={`player-score ${isOvertaking ? 'leader-overtake' : ''}`} 
                style={{ color: p.id === socket?.id ? 'var(--primary)' : 'var(--text-main)' }}
              >
                {isLeader && <div className="leader-crown">👑</div>}
                <div 
                  className="name" 
                  onClick={() => setSelectedProfileUser(p)} 
                  style={{ cursor: 'pointer', textDecoration: 'underline' }} 
                  title="Voir le profil du joueur"
                >
                  {formatPlayerName(p.name)} {p.id === socket?.id ? '(Vous)' : ''}
                </div>
                <div className="score">{p.score}</div>
              </div>
            );
          })}
        </div>

        {/* Central Game Card */}
        <div className="card" style={{ textAlign: 'center', position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '1.5rem', marginTop: '1rem', minHeight: '380px' }}>
          
          {/* Question Index Badge */}
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
            {questionIndex + 1} / {totalQuestions}
          </div>

          <GameTimerBadge
            key={`round_${questionIndex}`}
            questionIndex={questionIndex}
            initialDuration={initialRoundDuration}
            isFrozenOrPaused={isGameFrozenOrPaused}
            hasAnswered={hasAnswered}
            roundResult={roundResult}
            onTimeout={() => submitAnswer('')}
            timeRef={timeRemainingRef}
            playTimeWarning={playTimeWarning}
          />
          
          {/* Mot à traduire */}
          <div style={{ marginTop: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Traduisez en allemand :
            </h2>
            <h1 style={{ fontSize: 'clamp(1.5rem, 6vw, 2.5rem)', marginBottom: '0', color: 'var(--text-main)', wordBreak: 'break-word' }}>
              {question || 'Chargement...'}
            </h1>
          </div>

          {!roundResult ? (
            <div style={{ display: 'block', marginTop: '2.5rem' }}>
              {/* Champ de saisie instantané avec flèche */}
              <GameInputForm
                onSubmit={submitAnswer}
                disabled={hasAnswered || isFrozen || isGameFrozenOrPaused}
                placeholder={isFrozen ? "GELÉ..." : "Ex: der Tisch"}
                isFrozen={isFrozen}
                inputRef={inputRef}
              />

              {/* Joker Button */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button 
                  onClick={handleUseJoker} 
                  disabled={jokers <= 0 || hasAnswered || jokerHint || isGameFrozenOrPaused} 
                  style={{ 
                    background: 'var(--warning)', 
                    color: 'white', 
                    border: 'none',
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    opacity: (jokers <= 0 || hasAnswered || jokerHint || isGameFrozenOrPaused) ? 0.5 : 1,
                    boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)'
                  }}
                  title="Utiliser un Joker"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18h6"></path>
                    <path d="M10 22h4"></path>
                    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .34 2.02 1.5 3.5.76.76 1.23 1.52 1.41 2.5"></path>
                  </svg>
                </button>
                <span style={{ 
                  position: 'absolute', 
                  top: '-5px', 
                  right: '-5px', 
                  background: 'var(--danger)', 
                  color: 'white',
                  fontSize: '0.75rem', 
                  fontWeight: 'bold',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: '50%',
                  border: '2px solid var(--bg-main)'
                }}>
                  {jokers}
                </span>
                {jokerHint && <div style={{ marginTop: '0.75rem', color: 'var(--warning)', fontSize: '1.1rem', fontWeight: 'bold' }}>Indice : {jokerHint}</div>}
              </div>

              {isFrozen && (
                <div style={{ background: 'rgba(56, 189, 248, 0.2)', color: 'var(--text-main)', padding: '0.75rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid #38bdf8', fontSize: '0.9rem' }}>
                  🥶 <strong>GELÉ !</strong> L'adversaire a répondu juste 3 fois de suite !
                </div>
              )}
            </div>
          ) : (
            <div 
              style={{ padding: '1rem 0', animation: 'fadeIn 0.5s ease-out', cursor: 'pointer' }}
              onClick={handleReadyForNext}
            >
              <div style={{ background: 'var(--bg-main)', border: '2px solid var(--border-color)', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1rem', position: 'relative' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>La bonne réponse était :</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'center' }}>
                  <h2 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-main)' }}>{roundResult.correctAnswer}</h2>
                  <button onClick={(e) => { e.stopPropagation(); playAudio(roundResult.correctAnswer); }} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
                    🔊
                  </button>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.values(roundResult.players).map(p => {
                  const playerAns = p.answers[questionIndex];
                  const isCorrect = playerAns?.score >= 100;
                  return (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: '12px', border: '2px solid var(--border-color)', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>{formatPlayerName(p.name)}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <span style={{ fontWeight: 'bold' }}>
                            {renderDiff(roundResult.correctAnswer, playerAns?.answer, isCorrect, playerAns?.isTypo)}
                          </span>
                          {playerAns && (
                            <span style={{ fontSize: '1rem', color: 'var(--warning)', fontWeight: 'bold' }}>
                              +{playerAns.score} pts
                            </span>
                          )}
                        </div>
                        {playerAns?.isTypo && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '2px' }}>Faute de frappe tolérée</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Tap anywhere to continue */}
              <div style={{ marginTop: '1.5rem' }}>
                {iAmReady ? (
                  readyCount.total > 1 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      ⏳ En attente de l'adversaire... ({readyCount.ready}/{readyCount.total})
                    </p>
                  ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>⏳</p>
                  )
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', opacity: 0.7 }}>
                    Appuyez sur Entrée ou touchez l'écran
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Telegram Burst Floating Reactions Layer */}
      <div className="floating-reactions-container">
        {floatingReactions.map((r) => (
          <span
            key={r.id}
            className="floating-reaction-item"
            style={{
              left: `${r.xPos || 50}%`,
              '--tx': r.tx || '0px',
              '--ty': r.ty || '-95vh',
              '--scale': r.scale || '1.4',
              '--rot': r.rot || '0deg',
              animationDelay: r.delay || '0s'
            }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

      {/* Floating User Profile Modal */}
      {selectedProfileUser && (
        <UserProfileModal
          targetPlayerId={selectedProfileUser._id || selectedProfileUser.firebaseId || selectedProfileUser.name}
          targetPlayerFallback={selectedProfileUser}
          currentUser={user}
          onClose={() => setSelectedProfileUser(null)}
        />
      )}

    </div>
  );
}
