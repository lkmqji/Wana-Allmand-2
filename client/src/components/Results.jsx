import { useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import { formatPlayerName } from '../utils/formatters';

export default function Results({ players, setView, socket, session, isHost, playerName, avatar, user }) {
  const playerArr = Object.values(players || {}).sort((a, b) => b.score - a.score);
  const winner = playerArr[0];
  const isDraw = playerArr.length > 1 && playerArr[0].score === playerArr[1].score;
  const isSolo = playerArr.length <= 1;

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatBottomRef = useRef(null);

  // Proposal for failed words replay
  const [incomingProposal, setIncomingProposal] = useState(null); // { requesterName, requesterAvatar, failedWords, requesterSocketId }
  const [waitingForProposalResp, setWaitingForProposalResp] = useState(false);

  // Proposal for standard rematch
  const [incomingRematchProposal, setIncomingRematchProposal] = useState(null); // { requesterName, requesterAvatar, requesterSocketId }
  const [waitingForRematchResp, setWaitingForRematchResp] = useState(false);

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
          colors: ['#6366f1', '#ec4899', '#10b981']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#6366f1', '#ec4899', '#10b981']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [isDraw, winner]);

  // Chat message listener & proposal listeners (failed words + rematch)
  useEffect(() => {
    const handleChatMessage = (msg) => {
      setChatMessages(prev => [...prev, msg]);
      if (!showChat) {
        setUnreadChatCount(prev => prev + 1);
      }
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
  }, [socket, showChat, session]);

  // Auto-scroll chat
  useEffect(() => {
    if (showChat) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  const handleOpenChat = () => {
    setShowChat(true);
    setUnreadChatCount(0);
  };

  const handleSendChatMessage = (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !session?.id) return;
    const currentName = formatPlayerName(playerName || user?.displayName || (players[socket.id]?.name) || 'Moi');
    socket.emit('send_lobby_chat', {
      sessionId: session.id,
      text: chatInput.trim(),
      senderName: currentName,
      senderAvatar: avatar || '🦊'
    });
    setChatInput('');
  };

  const getFailedWords = () => {
    if (!session || !session.vocabList) return [];
    return session.vocabList.filter((word, index) => {
      return Object.values(players).some(p => {
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

  const handleRetryFailedWordsClick = () => {
    const failedWords = getFailedWords();
    if (failedWords.length === 0) {
      alert("Félicitations ! Aucun mot manqué dans cette partie 🎉");
      return;
    }

    if (isSolo) {
      createSoloFailedSession(failedWords);
    } else {
      // Multiplayer: propose to other players in the room
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
    if (isSolo) {
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
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', textAlign: 'center', position: 'relative' }}>
      
      {/* Waiting Indicator for multiplayer failed words proposal */}
      {waitingForProposalResp && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          border: '2px solid var(--danger)',
          borderRadius: '16px',
          padding: '1rem 1.5rem',
          marginBottom: '1.5rem',
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
          marginBottom: '1.5rem',
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

      {/* Main Results Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--text-main)' }}>
          {isDraw ? 'Égalité !' : 'Partie Terminée !'}
        </h1>
        
        {!isDraw && winner && (
          <h2 style={{ color: 'var(--success)', marginBottom: '3rem', fontSize: '2rem' }}>
            {formatPlayerName(winner.name)} gagne avec {winner.score} pts 🏆
          </h2>
        )}

        {/* Players podium list (supports 2 to 8 players) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2.5rem' }}>
          {playerArr.map((p, i) => (
            <div key={p.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '1.2rem 1.5rem',
              background: i === 0 && !isDraw ? 'rgba(34, 197, 94, 0.1)' : i === 1 ? 'rgba(99, 102, 241, 0.08)' : i === 2 ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-main)',
              borderRadius: '16px',
              border: `2px solid ${i === 0 && !isDraw ? 'var(--success)' : i === 1 ? 'var(--primary)' : 'var(--border-color)'}`
            }}>
              <span style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--text-main)' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`} {formatPlayerName(p.name)} {p.id === socket.id ? '(Vous)' : ''}
              </span>
              <span style={{ fontSize: '2rem', fontWeight: '800', color: i === 0 && !isDraw ? 'var(--success)' : 'var(--primary)' }}>
                {p.score} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>pts</span>
              </span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mobile-stack" style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
          
          {/* Button 1: Leave & Home */}
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              if (session?.id) socket.emit('leave_session', session.id);
              setView('home');
            }} 
            style={{ flex: 1, minWidth: '130px' }}
          >
            ← Accueil
          </button>
          
          {/* Button 2: Retry Failed Words */}
          <button 
            className="btn btn-secondary" 
            onClick={handleRetryFailedWordsClick} 
            disabled={waitingForProposalResp || waitingForRematchResp}
            style={{ flex: 1.2, borderColor: 'var(--danger)', color: 'var(--danger)', minWidth: '150px' }}
          >
            🎯 {isSolo ? 'Mots manqués' : 'Rejouer les fautes'}
          </button>

          {/* Button 3: Rematch (Back to Lobby) */}
          <button 
            className="btn btn-primary" 
            onClick={handleRematchClick} 
            disabled={waitingForProposalResp || waitingForRematchResp}
            style={{ flex: 1.8, minWidth: '180px' }}
          >
            🔄 {isSolo ? 'Rejouer (Lobby)' : 'Demander Revanche'}
          </button>

          {/* Button 4: Chat Box Toggle */}
          <button
            className="btn btn-secondary"
            onClick={handleOpenChat}
            style={{
              width: 'auto',
              padding: '0.8rem 1.2rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              position: 'relative'
            }}
            title="Ouvrir le chat de session"
          >
            <span>💬</span> Chat
            {unreadChatCount > 0 && (
              <span style={{
                background: 'var(--danger)',
                color: '#fff',
                fontSize: '0.7rem',
                fontWeight: 900,
                borderRadius: '10px',
                padding: '0.1rem 0.45rem',
                marginLeft: '0.2rem'
              }}>
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Detailed Game Summary */}
      {session && session.vocabList && (
        <div className="card" style={{ textAlign: 'left' }}>
          <h3 style={{ marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.5rem' }}>📝 Résumé de la partie</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {session.vocabList.slice(0, session.currentQuestionIndex || session.vocabList.length).map((word, index) => (
              <div key={index} style={{ padding: '1rem', background: 'var(--bg-main)', borderRadius: '12px', border: '2px solid var(--border-color)' }}>
                <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--text-main)' }}>{word.question}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>👉 {word.answer}</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px dashed var(--border-color)' }}>
                  {Object.values(players).map(p => {
                    const ans = p.answers && p.answers[index];
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{formatPlayerName(p.name)} :</span>
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

      {/* =========================================================
          MODAL / DRAWER : CHAT BOX DU LOBBY
         ========================================================= */}
      {showChat && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2500,
          padding: '1rem'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '520px',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            padding: '1.2rem',
            borderRadius: '20px',
            background: 'var(--bg-surface)',
            border: '2px solid var(--primary)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.6rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>💬</span> Chat de session (#{session?.id || '—'})
              </h3>
              <button
                onClick={() => setShowChat(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.3rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
              >
                ✕
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div style={{
              height: '320px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              paddingRight: '0.4rem'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: 'auto' }}>
                  Aucun message pour le moment. Dites bonjour ! 👋
                </div>
              ) : (
                chatMessages.map((m) => {
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
                        <span>{isMe ? 'Vous' : m.senderName}</span>
                        <span style={{ opacity: 0.6 }}>• {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div style={{
                        padding: '0.5rem 0.8rem',
                        borderRadius: isMe ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                        background: isMe ? 'var(--primary)' : 'var(--bg-main)',
                        color: isMe ? '#ffffff' : 'var(--text-main)',
                        border: isMe ? 'none' : '1px solid var(--border-color)',
                        fontSize: '0.85rem',
                        wordBreak: 'break-word',
                        textAlign: 'left'
                      }}>
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input & Send Form */}
            <form onSubmit={handleSendChatMessage} style={{ display: 'flex', gap: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Écrire un message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                maxLength={250}
                autoFocus
                style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!chatInput.trim()}
                style={{ width: 'auto', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

