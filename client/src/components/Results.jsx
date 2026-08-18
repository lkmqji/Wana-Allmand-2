import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { formatPlayerName, getClientPlayerKey } from '../utils/formatters';

const PRESET_RESULTS_CHAT = [
  "GG! 🏆",
  "Revanche ? ⚔️",
  "Bien joué ! 👏",
  "Oups ! 🙈",
  "Trop rapide ! ⚡"
];

const PRESET_REACTIONS = ['🔥', '⚡', '🏆', '⚔️', '💪', '👏'];

export default function Results({ players = {}, setView, socket, session, isHost, playerName, avatar, user }) {
  const [currentPlayers, setCurrentPlayers] = useState(players || {});
  
  // Floating Twitch reactions state & 5s cooldown
  const [reactionCooldown, setReactionCooldown] = useState(0);
  const [floatingReactions, setFloatingReactions] = useState([]);

  // Cooldown countdown ticker
  useEffect(() => {
    if (reactionCooldown > 0) {
      const timer = setInterval(() => {
        setReactionCooldown(c => Math.max(0, c - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [reactionCooldown]);

  // Update current players if opponent leaves or session changes
  useEffect(() => {
    setCurrentPlayers(players || {});
  }, [players]);

  useEffect(() => {
    const handlePlayerUpdate = (updatedPlayers) => {
      if (updatedPlayers) setCurrentPlayers(updatedPlayers);
    };
    const handleSessionUpdate = (updatedSession) => {
      if (updatedSession?.players) setCurrentPlayers(updatedSession.players);
    };
    const handleFloatingReaction = (reaction) => {
      if (!reaction || !reaction.emoji) return;
      setFloatingReactions(prev => [...prev, reaction]);
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 2500);
    };

    socket.on('player_joined', handlePlayerUpdate);
    socket.on('session_updated', handleSessionUpdate);
    socket.on('floating_reaction', handleFloatingReaction);

    return () => {
      socket.off('player_joined', handlePlayerUpdate);
      socket.off('session_updated', handleSessionUpdate);
      socket.off('floating_reaction', handleFloatingReaction);
    };
  }, [socket]);

  const playerArr = Object.values(currentPlayers || {}).sort((a, b) => b.score - a.score);
  const winner = playerArr[0];
  const isDraw = playerArr.length > 1 && playerArr[0].score === playerArr[1].score;
  const isSolo = playerArr.length <= 1;

  // Mini-Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

  // Proposal for failed words replay
  const [incomingProposal, setIncomingProposal] = useState(null);
  const [waitingForProposalResp, setWaitingForProposalResp] = useState(false);

  // Proposal for standard rematch
  const [incomingRematchProposal, setIncomingRematchProposal] = useState(null);
  const [waitingForRematchResp, setWaitingForRematchResp] = useState(false);

  // Confetti on win
  useEffect(() => {
    if (!isDraw && winner) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#6366f1', '#ec4899', '#f59e0b', '#ff007f']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#ec4899', '#f59e0b', '#ff007f']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isDraw, winner]);

  // Chat message listener & proposal listeners
  useEffect(() => {
    const handleChatMessage = (msg) => {
      setChatMessages(prev => [...prev, msg]);
    };

    const handleRetryProposal = (proposal) => {
      setIncomingProposal(proposal);
    };

    const handleRetryDeclined = ({ declinerName }) => {
      setWaitingForProposalResp(false);
      const shouldPlaySolo = window.confirm(
        `${declinerName || 'Votre adversaire'} a décliné la proposition de rejouer les fautes ensemble.\n\nSouhaitez-vous rejouer ces mots manqués en solo ?`
      );
      if (shouldPlaySolo && session?.vocabList) {
        const failedWords = getFailedWords();
        if (failedWords.length > 0) {
          createSoloFailedSession(failedWords);
        }
      }
    };

    const handleRematchProposal = (proposal) => {
      setIncomingRematchProposal(proposal);
    };

    const handleRematchDeclined = ({ declinerName }) => {
      setWaitingForRematchResp(false);
      alert(`${declinerName || 'Votre adversaire'} a décliné la demande de revanche.`);
    };

    const handleRetryCancelled = () => {
      setIncomingProposal(null);
    };

    const handleRematchCancelled = () => {
      setIncomingRematchProposal(null);
    };

    socket.on('lobby_chat_message', handleChatMessage);
    socket.on('retry_failed_words_proposal', handleRetryProposal);
    socket.on('retry_failed_words_declined', handleRetryDeclined);
    socket.on('retry_failed_words_cancelled', handleRetryCancelled);
    socket.on('rematch_proposal', handleRematchProposal);
    socket.on('rematch_declined', handleRematchDeclined);
    socket.on('rematch_cancelled', handleRematchCancelled);

    return () => {
      socket.off('lobby_chat_message', handleChatMessage);
      socket.off('retry_failed_words_proposal', handleRetryProposal);
      socket.off('retry_failed_words_declined', handleRetryDeclined);
      socket.off('retry_failed_words_cancelled', handleRetryCancelled);
      socket.off('rematch_proposal', handleRematchProposal);
      socket.off('rematch_declined', handleRematchDeclined);
      socket.off('rematch_cancelled', handleRematchCancelled);
    };
  }, [socket, session]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendReaction = (emoji) => {
    if (reactionCooldown > 0 || !session?.id) return;
    const currentName = formatPlayerName(playerName || user?.displayName || 'Moi');
    socket.emit('send_reaction_emoji', {
      sessionId: session.id,
      emoji,
      senderName: currentName
    });
    setReactionCooldown(5);
  };

  const handleSendChatMessage = (textToSend) => {
    const content = (typeof textToSend === 'string' ? textToSend : chatInput).trim();
    if (!content || !session?.id) return;
    const currentName = formatPlayerName(playerName || user?.displayName || (currentPlayers[socket.id]?.name) || 'Moi');
    socket.emit('send_lobby_chat', {
      sessionId: session.id,
      text: content,
      senderName: currentName,
      senderAvatar: avatar || '🦊'
    });
    if (typeof textToSend !== 'string') {
      setChatInput('');
    }
  };

  const getFailedWords = () => {
    if (!session || !session.vocabList) return [];
    return session.vocabList.filter((word, index) => {
      return Object.values(currentPlayers).some(p => {
        const ans = p.answers && p.answers[index];
        return !ans || ans.score < 100;
      });
    });
  };

  const createSoloFailedSession = (failedWords) => {
    const pName = formatPlayerName(playerName || (session?.players?.[socket.id]?.name) || 'Joueur');
    socket.emit('create_session', {
      vocabList: failedWords.map((w, idx) => ({ ...w, id: idx + 1 })),
      settings: { rounds: failedWords.length, timePerWord: 15, powerupsEnabled: false },
      playerName: pName,
      firebaseId: user?.uid || null,
      avatar: avatar || '🦊',
      clientPlayerKey: getClientPlayerKey()
    });
  };

  // TASK 5: Frictionless Rematch / Failed Words Replay
  const handleRetryFailedWordsClick = () => {
    const failedWords = getFailedWords();
    if (failedWords.length === 0) {
      alert("Félicitations ! Aucun mot manqué dans cette partie 🎉");
      return;
    }

    const activePlayersCount = Object.keys(currentPlayers).length;
    // If only 1 player is currently present or it's a solo game, start IMMEDIATELY without waiting
    if (activePlayersCount <= 1 || isSolo) {
      createSoloFailedSession(failedWords);
    } else {
      // Multiplayer: propose to opponent in room
      setWaitingForProposalResp(true);
      socket.emit('propose_retry_failed_words', {
        sessionId: session.id,
        failedWords
      });
    }
  };

  const handleAcceptProposal = () => {
    if (!incomingProposal || !session?.id) return;
    socket.emit('accept_retry_failed_words', {
      sessionId: session.id,
      failedWords: incomingProposal.failedWords
    });
    setIncomingProposal(null);
  };

  const handleDeclineProposal = () => {
    if (!incomingProposal || !session?.id) return;
    socket.emit('decline_retry_failed_words', {
      sessionId: session.id,
      requesterSocketId: incomingProposal.requesterSocketId
    });
    setIncomingProposal(null);
  };

  const handleRematchClick = () => {
    if (!session?.id) return alert("Revanche indisponible.");
    const activePlayersCount = Object.keys(currentPlayers).length;
    if (activePlayersCount <= 1 || isSolo) {
      socket.emit('rematch', session.id);
    } else {
      setWaitingForRematchResp(true);
      socket.emit('propose_rematch', session.id);
    }
  };

  const handleAcceptRematch = () => {
    if (!session?.id) return;
    socket.emit('accept_rematch', session.id);
    setIncomingRematchProposal(null);
  };

  const handleDeclineRematch = () => {
    if (!incomingRematchProposal || !session?.id) return;
    socket.emit('decline_rematch', {
      sessionId: session.id,
      requesterSocketId: incomingRematchProposal.requesterSocketId
    });
    setIncomingRematchProposal(null);
  };

  const handleCancelProposal = () => {
    setWaitingForProposalResp(false);
    if (session?.id) socket.emit('cancel_retry_failed_words', session.id);
  };

  const handleCancelRematch = () => {
    setWaitingForRematchResp(false);
    if (session?.id) socket.emit('cancel_rematch', session.id);
  };

  const renderDiff = (expected, actual, isCorrect, isTypo) => {
    if (!actual) return <span style={{ color: 'var(--danger)' }}>(Aucune réponse)</span>;
    if (isCorrect || isTypo) return <span style={{ color: 'var(--success)' }}>{actual}</span>;
    
    let matchCount = 0;
    for(let i = 0; i < Math.min(expected.length, actual.length); i++) {
      if(expected[i].toLowerCase() === actual[i].toLowerCase()) matchCount++;
    }
    if (matchCount < expected.length / 3) {
      return <span style={{ color: 'var(--danger)' }}>{actual}</span>;
    }
    
    return (
      <span>
        {actual.split('').map((char, i) => {
          const isMatch = expected[i] && expected[i].toLowerCase() === char.toLowerCase();
          return <span key={i} style={{ color: isMatch ? 'var(--text-main)' : 'var(--danger)' }}>{char}</span>;
        })}
      </span>
    );
  };

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', width: '100%', textAlign: 'center', position: 'relative' }}>
      
      {/* Waiting Indicator for multiplayer failed words proposal */}
      {waitingForProposalResp && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--danger)',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          marginBottom: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          textAlign: 'left'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--danger)' }}>
              🎯 Demande de rejouer les fautes envoyée...
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              En attente de confirmation de votre adversaire.
            </div>
          </div>
          <button
            onClick={handleCancelProposal}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Waiting Indicator for multiplayer Rematch */}
      {waitingForRematchResp && (
        <div style={{
          background: 'rgba(99, 102, 241, 0.15)',
          border: '2px solid var(--primary)',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          marginBottom: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          textAlign: 'left'
        }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary)' }}>
              🔄 Demande de revanche envoyée...
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              En attente de confirmation de votre adversaire pour retourner au lobby.
            </div>
          </div>
          <button
            onClick={handleCancelRematch}
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* =========================================================
          TASK 3 : REDESIGN DU PODIUM ESPORT (SIDE-BY-SIDE + GAGNANT/PERDANT GLOW)
         ========================================================= */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99, 102, 241, 0.08) 50%, var(--bg-surface) 100%)',
        borderColor: 'var(--border-color)',
        padding: '1.5rem 1rem',
        marginBottom: '1.2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        
        {/* Top Arena Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.3rem' }}>🏆</span>
            <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Résultats du Duel
            </span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            padding: '0.25rem 0.75rem',
            borderRadius: '10px',
            fontSize: '0.8rem',
            fontWeight: 800,
            color: isDraw ? '#f59e0b' : 'var(--primary)'
          }}>
            {isDraw ? '🤝 ÉGALITÉ' : isSolo ? '⭐ SOLO COMPLET' : `👑 VICTOIRE : ${formatPlayerName(winner?.name)}`}
          </div>
        </div>

        {/* Central Esport Arena Grid (Side-by-Side on Desktop, Stacked on Mobile) */}
        {isSolo ? (
          /* Solo Champion Podium */
          <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}>
            <div className="results-esport-podium results-esport-winner" style={{ maxWidth: '360px', width: '100%' }}>
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#ffffff',
                fontSize: '0.72rem',
                fontWeight: 900,
                padding: '0.2rem 0.8rem',
                borderRadius: '12px',
                letterSpacing: '1px',
                lineHeight: 1
              }}>
                👑 CHAMPION DUEL
              </div>

              <div className="esport-avatar-ring">
                {winner?.avatar || avatar || '🦊'}
              </div>

              <div style={{ fontWeight: 900, fontSize: '1.25rem', color: 'var(--text-main)' }}>
                {formatPlayerName(winner?.name || playerName || 'Joueur')}
              </div>

              <div style={{
                fontSize: '2.6rem',
                fontWeight: 900,
                color: '#f59e0b',
                letterSpacing: '1px',
                lineHeight: 1,
                margin: '0.3rem 0'
              }}>
                {winner?.score || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>pts</span>
              </div>
            </div>
          </div>
        ) : (
          /* Multiplayer Versus Arena */
          <div className="mobile-stack" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            position: 'relative'
          }}>
            
            {/* PLAYER 1 PODIUM */}
            {(() => {
              const p = playerArr[0];
              if (!p) return null;
              const isPWinner = !isDraw && winner?.id === p.id;
              const isPLoser = !isDraw && winner?.id !== p.id;
              const isMe = p.id === socket.id;

              return (
                <div className={`results-esport-podium ${isPWinner ? 'results-esport-winner' : isPLoser ? 'results-esport-loser' : 'results-esport-draw'}`}>
                  <div style={{
                    background: isPWinner ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isDraw ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isPWinner ? '#ffffff' : isDraw ? 'var(--primary)' : 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '8px',
                    letterSpacing: '0.5px',
                    lineHeight: 1
                  }}>
                    {isPWinner ? '👑 GAGNANT' : isDraw ? '🤝 ÉGALITÉ' : '🥈 2ND PLACE'}
                  </div>

                  <div className="esport-avatar-ring">
                    {p.avatar || '🦊'}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    maxWidth: '100%',
                    width: '100%',
                    overflow: 'hidden'
                  }}>
                    <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatPlayerName(p.name)}
                    </span>
                    {isMe && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, flexShrink: 0 }}>(Vous)</span>}
                  </div>

                  <div style={{
                    fontSize: '2.4rem',
                    fontWeight: 900,
                    color: isPWinner ? '#f59e0b' : 'var(--text-main)',
                    lineHeight: 1,
                    marginTop: '0.2rem'
                  }}>
                    {p.score} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>pts</span>
                  </div>
                </div>
              );
            })()}

            {/* CENTER MATCH SCORE / VS BADGE */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '100px',
              zIndex: 10
            }}>
              <div style={{
                fontSize: '1.8rem',
                fontWeight: 900,
                color: isDraw ? '#f59e0b' : 'var(--primary)',
                letterSpacing: '2px',
                fontFamily: 'Outfit, sans-serif'
              }}>
                {playerArr[0]?.score || 0} - {playerArr[1]?.score || 0}
              </div>
              <span style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontWeight: 800,
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginTop: '2px'
              }}>
                {session?.vocabList?.length || 10} Rounds
              </span>
            </div>

            {/* PLAYER 2 PODIUM */}
            {(() => {
              const p = playerArr[1];
              if (!p) return null;
              const isPWinner = !isDraw && winner?.id === p.id;
              const isPLoser = !isDraw && winner?.id !== p.id;
              const isMe = p.id === socket.id;

              return (
                <div className={`results-esport-podium ${isPWinner ? 'results-esport-winner' : isPLoser ? 'results-esport-loser' : 'results-esport-draw'}`}>
                  <div style={{
                    background: isPWinner ? 'linear-gradient(135deg, #f59e0b, #d97706)' : isDraw ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isPWinner ? '#ffffff' : isDraw ? 'var(--primary)' : 'var(--text-muted)',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '0.2rem 0.65rem',
                    borderRadius: '8px',
                    letterSpacing: '0.5px',
                    lineHeight: 1
                  }}>
                    {isPWinner ? '👑 GAGNANT' : isDraw ? '🤝 ÉGALITÉ' : '🥈 2ND PLACE'}
                  </div>

                  <div className="esport-avatar-ring">
                    {p.avatar || '🐼'}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    maxWidth: '100%',
                    width: '100%',
                    overflow: 'hidden'
                  }}>
                    <span style={{ fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formatPlayerName(p.name)}
                    </span>
                    {isMe && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 800, flexShrink: 0 }}>(Vous)</span>}
                  </div>

                  <div style={{
                    fontSize: '2.4rem',
                    fontWeight: 900,
                    color: isPWinner ? '#f59e0b' : 'var(--text-main)',
                    lineHeight: 1,
                    marginTop: '0.2rem'
                  }}>
                    {p.score} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>pts</span>
                  </div>
                </div>
              );
            })()}

          </div>
        )}

        {/* =========================================================
            TASK 2 : FLOATING REACTIONS BAR & COOLDOWN (RESULTS)
           ========================================================= */}
        <div style={{
          marginTop: '1.2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            Réagir en direct :
          </span>
          {PRESET_REACTIONS.map((emoji, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendReaction(emoji)}
              disabled={reactionCooldown > 0}
              className={`reaction-pill-btn ${reactionCooldown > 0 ? 'cooldown-active' : ''}`}
            >
              <span>{emoji}</span>
              {reactionCooldown > 0 && (
                <span style={{ fontSize: '0.7rem', color: 'var(--warning)', fontWeight: 800 }}>
                  {reactionCooldown}s
                </span>
              )}
            </button>
          ))}
        </div>

      </div>

      {/* =========================================================
          TASK 4 : MINI-CHAT DIRECTEMENT INTÉGRÉ (RÉSULTATS)
         ========================================================= */}
      <div className="card" style={{
        padding: '1rem',
        marginBottom: '1.2rem',
        textAlign: 'left'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)' }}>
            <span>💬</span>
            <span>Discussion de Fin de Partie</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {chatMessages.length} message(s)
          </span>
        </div>

        {/* Preset Quick Reaction Phrases */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          {PRESET_RESULTS_CHAT.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleSendChatMessage(phrase)}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                borderRadius: '12px',
                padding: '0.25rem 0.6rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              {phrase}
            </button>
          ))}
        </div>

        {/* Mini-Chat Messages List */}
        <div style={{
          height: '110px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem',
          paddingRight: '0.3rem',
          marginBottom: '0.6rem',
          background: 'var(--bg-main)',
          borderRadius: '12px',
          padding: '0.6rem',
          border: '1px solid var(--border-color)'
        }}>
          {chatMessages.length === 0 ? (
            <div style={{ margin: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Échangez avec votre adversaire avant de relancer ! 👋
            </div>
          ) : (
            chatMessages.map(m => {
              const isMe = m.senderId === socket.id;
              return (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '90%'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isMe ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {isMe ? 'Moi' : formatPlayerName(m.senderName)}:
                  </span>
                  <span style={{
                    background: isMe ? 'rgba(99, 102, 241, 0.18)' : 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    color: 'var(--text-main)',
                    wordBreak: 'break-word'
                  }}>
                    {m.text}
                  </span>
                </div>
              );
            })
          )}
          <div ref={chatBottomRef} />
        </div>

        {/* Mini-Chat Input */}
        <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.4rem' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Écrire un message rapide..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            maxLength={150}
            style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!chatInput.trim()}
            style={{ width: 'auto', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            Envoyer
          </button>
        </form>
      </div>

      {/* Action Buttons Bar */}
      <div className="mobile-stack" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        
        {/* Button 1: Leave & Home */}
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            if (session?.id) socket.emit('leave_session', session.id);
            setView('home');
          }} 
          style={{ flex: 1, minWidth: '130px', padding: '0.75rem 1rem' }}
        >
          ← Accueil
        </button>
        
        {/* Button 2: Retry Failed Words (TASK 5: INSTANT SOLO IF OPPONENT LEFT) */}
        <button 
          className="btn btn-secondary" 
          onClick={handleRetryFailedWordsClick} 
          disabled={waitingForProposalResp || waitingForRematchResp}
          style={{
            flex: 1.3,
            borderColor: 'var(--danger)',
            color: 'var(--danger)',
            minWidth: '160px',
            padding: '0.75rem 1rem',
            fontWeight: 800
          }}
        >
          🎯 {isSolo ? 'Mots manqués' : 'Rejouer les fautes'}
        </button>

        {/* Button 3: Rematch (Back to Lobby) */}
        <button 
          className="btn btn-primary" 
          onClick={handleRematchClick} 
          disabled={waitingForProposalResp || waitingForRematchResp}
          style={{
            flex: 1.8,
            minWidth: '180px',
            padding: '0.75rem 1.2rem',
            fontWeight: 900,
            letterSpacing: '0.5px'
          }}
        >
          🔄 {isSolo ? 'Rejouer (Lobby)' : 'Demander Revanche'}
        </button>
      </div>

      {/* Detailed Game Summary List */}
      {session && session.vocabList && (
        <div className="card" style={{ textAlign: 'left', padding: '1.25rem' }}>
          <h3 style={{ marginBottom: '1.2rem', textAlign: 'center', fontSize: '1.35rem' }}>📝 Résumé des questions & réponses</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {session.vocabList.slice(0, session.currentQuestionIndex || session.vocabList.length).map((word, index) => (
              <div key={index} style={{ padding: '0.9rem 1rem', background: 'var(--bg-main)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                <div style={{ marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>{word.question}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.95rem' }}>👉 {word.answer}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed var(--border-color)' }}>
                  {Object.values(currentPlayers).map(p => {
                    const ans = p.answers && p.answers[index];
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{formatPlayerName(p.name)} :</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {ans ? renderDiff(ans.expected, ans.answer, ans.score >= 100, ans.isTypo) : <span style={{ color: 'var(--danger)' }}>(Non répondu)</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 1 : DEMANDE DE REJOUER LES FAUTES (MULTIJOUEUR)
         ========================================================= */}
      {incomingProposal && (
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
          zIndex: 3000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '1.8rem',
            textAlign: 'center',
            border: '2px solid var(--danger)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🎯</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.8rem', color: 'var(--text-main)' }}>
              Rejouer les fautes ensemble ?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              <strong>{formatPlayerName(incomingProposal.requesterName)}</strong> propose de refaire une session ciblée sur les{' '}
              <strong style={{ color: 'var(--danger)' }}>{incomingProposal.count} mots manqués</strong> de cette partie !
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={handleDeclineProposal}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Refuser ✕
              </button>
              <button
                onClick={handleAcceptProposal}
                className="btn btn-primary"
                style={{ flex: 1.2, padding: '0.75rem', background: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                Accepter 🎯
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2 : DEMANDE DE REVANCHE STANDARD (MULTIJOUEUR)
         ========================================================= */}
      {incomingRematchProposal && (
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
          zIndex: 3000,
          padding: '1rem'
        }}>
          <div className="card" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '1.8rem',
            textAlign: 'center',
            border: '2px solid var(--primary)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>⚔️</div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.8rem', color: 'var(--text-main)' }}>
              Demande de Revanche !
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              <strong>{formatPlayerName(incomingRematchProposal.requesterName)}</strong> vous propose une Revanche !<br />
              Souhaitez-vous retourner dans la salle d'attente pour rejouer ?
            </p>
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                onClick={handleDeclineRematch}
                className="btn btn-secondary"
                style={{ flex: 1, padding: '0.75rem' }}
              >
                Refuser ✕
              </button>
              <button
                onClick={handleAcceptRematch}
                className="btn btn-primary"
                style={{ flex: 1.2, padding: '0.75rem' }}
              >
                Accepter ⚔️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Twitch-Style Floating Reactions Container */}
      <div className="floating-reactions-container">
        {floatingReactions.map((r) => (
          <span
            key={r.id}
            className="floating-reaction-item"
            style={{ left: `${r.xPos}%` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>

    </div>
  );
}
