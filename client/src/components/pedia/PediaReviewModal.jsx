import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatPlayerName } from '../../utils/formatters';

/**
 * Format medical text with clean line breaks
 */
function formatMedicalText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();
  text = text.replace(/([^\n\r])\s*([➢⁃•►▶✔✓])\s*/g, '$1\n$2 ');
  text = text.replace(/([^\n\r])\s+(\d+[\.\)-]\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ])/g, '$1\n$2');
  return text;
}

const PRESET_DEBRIEF_REACTIONS = [
  '💡 Bravo !',
  '😅 Pas évident',
  '🏥 Cas typique',
  '👏 Bien joué',
  '🤔 Piège !'
];

export default function PediaReviewModal({
  debriefQuestion,
  players = {},
  myPlayerId,
  onReadyNext,
  readyCount = 0,
  totalPlayers = 2,
  isReady = false,
  reviewDuration = 60,
  chatMessages = [],
  onSendChatMessage,
  onVoteExtendDebriefTime,
  extendVotesCount = 0,
  extendTotalRequired = 2,
  hasVotedExtend = false,
  extendedRemainingSeconds = null
}) {
  const [timeLeft, setTimeLeft] = useState(reviewDuration);
  const [inputMsg, setInputMsg] = useState('');
  const chatBottomRef = useRef(null);

  // Sync remaining seconds when time is extended by server
  useEffect(() => {
    if (typeof extendedRemainingSeconds === 'number') {
      setTimeLeft(extendedRemainingSeconds);
    }
  }, [extendedRemainingSeconds]);

  // Local 1-second countdown ticker for the 60s debrief
  useEffect(() => {
    setTimeLeft(reviewDuration);
    const interval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [reviewDuration, debriefQuestion?.uid]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const handleSendChat = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!inputMsg.trim() || !onSendChatMessage) return;
    onSendChatMessage(inputMsg.trim());
    setInputMsg('');
  };

  const handleSendPreset = (preset) => {
    if (!onSendChatMessage) return;
    onSendChatMessage(preset);
  };

  if (!debriefQuestion) {
    const loadingContent = (
      <div className="pedia-review-overlay">
        <div style={{ textAlign: 'center', color: '#00d4ff', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>⏳</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>Chargement du débriefing médical...</div>
        </div>
      </div>
    );
    return typeof document !== 'undefined' ? createPortal(loadingContent, document.body) : loadingContent;
  }

  const isCroq = Boolean(debriefQuestion.is_croq || debriefQuestion.type === 'CROQ');
  const myPlayer = players[myPlayerId];
  const qIdx = debriefQuestion.currentQuestionIndex ?? Object.keys(myPlayer?.answers || {}).pop();
  const myAnswer = myPlayer?.answers?.[qIdx];

  const opponentPlayerId = Object.keys(players).find(id => id !== myPlayerId);
  const opponentPlayer = opponentPlayerId ? players[opponentPlayerId] : null;
  const opponentAnswer = opponentPlayer?.answers?.[qIdx];

  const mySelectedLetters = Array.isArray(myAnswer?.selectedLetters)
    ? myAnswer.selectedLetters
    : (Array.isArray(myAnswer?.answer) ? myAnswer.answer : []);

  const opponentSelectedLetters = Array.isArray(opponentAnswer?.selectedLetters)
    ? opponentAnswer.selectedLetters
    : (Array.isArray(opponentAnswer?.answer) ? opponentAnswer.answer : []);

  const progressPercent = Math.max(0, Math.min(100, (timeLeft / reviewDuration) * 100));

  const modalContent = (
    <div className="pedia-review-overlay">
      <div className="pedia-review-dialog">
        {/* Top Header: Timer Bar & Title & Ready Action */}
        <div style={{
          padding: '0.85rem 1.4rem',
          background: 'rgba(18, 29, 51, 0.95)',
          borderBottom: '1px solid rgba(0, 212, 255, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.8rem',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📋</span>
            <div>
              <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#f3f6fc', letterSpacing: '0.3px' }}>
                Débriefing &amp; Explication Médicale
              </div>
              <div style={{ fontSize: '0.78rem', color: '#00d4ff', fontWeight: 700, textTransform: 'uppercase' }}>
                {debriefQuestion.chapterTitle || 'Pédiatrie'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* 60s Countdown Badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(0, 212, 255, 0.15)',
              border: '1.5px solid #00d4ff',
              padding: '0.4rem 0.85rem',
              borderRadius: '9999px',
              fontWeight: 800,
              fontSize: '0.9rem',
              color: '#38bdf8',
              boxShadow: '0 0 12px rgba(0, 212, 255, 0.3)'
            }}>
              <span>⏳</span>
              <span>{timeLeft}s</span>
            </div>

            {/* Extend Time Button (+1 min with Mutual Voting) */}
            {onVoteExtendDebriefTime && (
              <button
                type="button"
                onClick={onVoteExtendDebriefTime}
                className="btn-extend-debrief"
                style={{
                  padding: '0.42rem 0.95rem',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  background: hasVotedExtend
                    ? 'rgba(245, 158, 11, 0.22)'
                    : (!hasVotedExtend && extendVotesCount > 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(234, 88, 12, 0.25))' : 'rgba(255, 255, 255, 0.08)'),
                  color: hasVotedExtend
                    ? '#fbbf24'
                    : (!hasVotedExtend && extendVotesCount > 0 ? '#fef08a' : '#cbd5e1'),
                  border: hasVotedExtend
                    ? '1.5px solid #f59e0b'
                    : (!hasVotedExtend && extendVotesCount > 0 ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.16)'),
                  boxShadow: hasVotedExtend
                    ? '0 0 14px rgba(245, 158, 11, 0.45)'
                    : (!hasVotedExtend && extendVotesCount > 0 ? '0 0 18px rgba(245, 158, 11, 0.6)' : 'none')
                }}
                title={totalPlayers > 1 ? "Voter pour ajouter 1 minute supplémentaire au débriefing (les 2 joueurs doivent voter)" : "Ajouter 1 minute supplémentaire au débriefing"}
              >
                <span style={{ fontSize: '1rem' }}>⏱️</span>
                {totalPlayers <= 1 ? (
                  <span>+1 min</span>
                ) : hasVotedExtend ? (
                  <span>En attente ({extendVotesCount}/{extendTotalRequired})</span>
                ) : (!hasVotedExtend && extendVotesCount > 0) ? (
                  <span>Accepter +1 min ! ({extendVotesCount}/{extendTotalRequired})</span>
                ) : (
                  <span>+1 min ({extendVotesCount}/{extendTotalRequired})</span>
                )}
              </button>
            )}

            {/* Ready / Skip Button */}
            <button
              type="button"
              onClick={onReadyNext}
              disabled={isReady}
              className={`btn ${isReady ? 'btn-success' : 'btn-primary'}`}
              style={{
                padding: '0.55rem 1.25rem',
                fontSize: '0.92rem',
                fontWeight: 900,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: isReady ? '0 0 16px rgba(16, 185, 129, 0.6)' : '0 0 16px rgba(0, 212, 255, 0.45)',
                transition: 'all 0.2s ease',
                cursor: isReady ? 'default' : 'pointer'
              }}
            >
              {isReady ? `✓ Prêt (${readyCount}/${totalPlayers})` : `Passer ➔ (${readyCount}/${totalPlayers})`}
            </button>
          </div>
        </div>

        {/* 60s Animated Progress Bar */}
        <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #00d4ff, #8b5cf6)',
            transition: 'width 1s linear'
          }} />
        </div>

        {/* Modal Body: Two Columns (Explanations & Live Chat) */}
        <div className="pedia-review-grid">
          {/* Column 1: Detailed Explanations & Answers (Scrollable) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', paddingRight: '0.3rem' }}>
            
            {/* Score Comparison Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0.85rem 1rem',
              background: 'linear-gradient(135deg, rgba(18, 29, 51, 0.9), rgba(13, 21, 39, 0.95))',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 4px 18px rgba(0,0,0,0.3)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>Vous</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: (myAnswer?.score || 0) > 0 ? '#10b981' : '#ef4444' }}>
                  +{(myAnswer?.score || 0).toFixed(0)} pts
                </div>
              </div>

              <div style={{ fontSize: '1.2rem', color: 'rgba(255, 255, 255, 0.25)', fontWeight: 800 }}>VS</div>

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 700 }}>
                  {formatPlayerName(opponentPlayer?.name) || 'Adversaire'}
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: (opponentAnswer?.score || 0) > 0 ? '#10b981' : '#ef4444' }}>
                  +{(opponentAnswer?.score || 0).toFixed(0)} pts
                </div>
              </div>
            </div>

            {/* Clinical Case if present */}
            {debriefQuestion.is_cas_clinique && debriefQuestion.clinical_case && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.08))',
                border: '1.5px solid rgba(56, 189, 248, 0.35)',
                borderRadius: '14px',
                padding: '0.9rem 1.1rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  marginBottom: '0.4rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  <span>🩺</span> Cas Clinique
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                  color: '#e2e8f0',
                  whiteSpace: 'pre-line'
                }}>
                  {formatMedicalText(debriefQuestion.clinical_case)}
                </p>
              </div>
            )}

            {/* Question Statement */}
            <div style={{
              background: 'rgba(13, 21, 39, 0.95)',
              padding: '1rem 1.2rem',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#00d4ff', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem', letterSpacing: '0.5px' }}>
                Énoncé de la question
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {formatMedicalText(debriefQuestion.question)}
              </div>

              {/* Media images if present */}
              {Array.isArray(debriefQuestion.media_urls) && debriefQuestion.media_urls.length > 0 && (
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '0.8rem' }}>
                  {debriefQuestion.media_urls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Illustration ${idx + 1}`}
                      style={{
                        maxHeight: '140px',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        objectFit: 'contain',
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(url, '_blank')}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* QCM Options Review */}
            {!isCroq ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.3px' }}>
                  Analyse détaillée de chaque proposition :
                </div>
                {(debriefQuestion.options || []).map((opt) => {
                  const letter = (opt.letter || '').toUpperCase();
                  const isCorrect = Boolean(opt.is_correct);
                  const isMyChoice = mySelectedLetters.includes(letter);
                  const isOpponentChoice = opponentSelectedLetters.includes(letter);

                  let bg = 'rgba(255, 255, 255, 0.03)';
                  let border = '1px solid rgba(255, 255, 255, 0.08)';
                  let badge = null;

                  if (isMyChoice && isCorrect) {
                    bg = 'rgba(16, 185, 129, 0.16)';
                    border = '1.5px solid #10b981';
                    badge = <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 800 }}>✓ Mon choix (Juste)</span>;
                  } else if (isMyChoice && !isCorrect) {
                    bg = 'rgba(239, 68, 68, 0.16)';
                    border = '1.5px solid #ef4444';
                    badge = <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 800 }}>✕ Mon choix (Faux)</span>;
                  } else if (!isMyChoice && isCorrect) {
                    bg = 'rgba(16, 185, 129, 0.08)';
                    border = '1.5px dashed #10b981';
                    badge = <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>✓ Bonne réponse (Omission)</span>;
                  }

                  return (
                    <div
                      key={opt.id || letter}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.8rem',
                        padding: '0.75rem 1rem',
                        borderRadius: '12px',
                        background: bg,
                        border,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <span style={{
                          fontWeight: 900,
                          fontSize: '0.9rem',
                          width: '28px',
                          height: '28px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isCorrect ? 'rgba(16, 185, 129, 0.25)' : (isMyChoice ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.06)'),
                          color: isCorrect ? '#34d399' : (isMyChoice ? '#f87171' : '#94a3b8'),
                          flexShrink: 0
                        }}>
                          {letter}
                        </span>
                        <span style={{ fontSize: '0.9rem', color: isCorrect ? '#ffffff' : '#cbd5e1', lineHeight: 1.45, fontWeight: isCorrect ? 600 : 500 }}>
                          {opt.text}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                        {isOpponentChoice && (
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '9999px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            fontWeight: 700
                          }}>
                            👤 Adversaire
                          </span>
                        )}
                        {badge}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* CROQ Review */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <div style={{
                  padding: '0.9rem',
                  borderRadius: '14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Votre proposition rédigée (Score : {myAnswer?.score || 0}%)
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#f1f5f9', lineHeight: 1.5 }}>
                    {myAnswer?.answer || 'Aucune réponse saisie'}
                  </div>
                </div>

                <div style={{
                  padding: '0.9rem',
                  borderRadius: '14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)'
                }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                    Réponse officielle de référence concours
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#f1f5f9', whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                    {debriefQuestion.croq_answer || 'Réponse type disponible'}
                  </div>
                </div>

                {myAnswer?.feedback && (
                  <div style={{
                    padding: '0.9rem',
                    borderRadius: '14px',
                    background: 'rgba(139, 92, 246, 0.12)',
                    border: '1px solid rgba(139, 92, 246, 0.35)'
                  }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#c084fc', marginBottom: '0.35rem', textTransform: 'uppercase' }}>
                      Évaluation IA (Gemini Flash)
                    </div>
                    <div style={{ fontSize: '0.88rem', color: '#e2e8f0', lineHeight: 1.5 }}>
                      {myAnswer.feedback}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Official Course Explanation */}
            {debriefQuestion.explanation && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.95), rgba(14, 165, 233, 0.08))',
                padding: '1.1rem 1.25rem',
                borderRadius: '14px',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                boxShadow: '0 4px 20px rgba(0, 212, 255, 0.08)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  color: '#00d4ff',
                  textTransform: 'uppercase',
                  marginBottom: '0.5rem',
                  letterSpacing: '0.5px'
                }}>
                  <span>💡</span> Explication Officielle de Cours
                </div>
                <div style={{ fontSize: '0.9rem', lineHeight: 1.65, color: '#cbd5e1', whiteSpace: 'pre-line' }}>
                  {formatMedicalText(debriefQuestion.explanation)}
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Interactive Live Chat Between Both Players */}
          <div style={{
            background: 'rgba(18, 29, 51, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '18px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              background: 'rgba(255, 255, 255, 0.04)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              fontWeight: 800,
              fontSize: '0.85rem',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem'
            }}>
              <span>💬</span> Chat Débriefing (En direct)
            </div>

            {/* Chat Messages List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              minHeight: '220px'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.82rem', margin: 'auto 0', padding: '1rem' }}>
                  Échangez avec votre adversaire sur ce cas clinique ! 💬
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === myPlayerId;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        background: isMe ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '0.5rem 0.8rem',
                        fontSize: '0.85rem',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', color: isMe ? '#bae6fd' : '#94a3b8', fontWeight: 700, marginBottom: '0.15rem' }}>
                        {msg.senderName}
                      </div>
                      <div style={{ color: '#ffffff', wordBreak: 'break-word', lineHeight: 1.4 }}>{msg.text}</div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Preset 1-Click Reactions */}
            <div style={{
              display: 'flex',
              gap: '0.35rem',
              padding: '0.45rem 0.8rem',
              background: 'rgba(7, 11, 20, 0.4)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              overflowX: 'auto'
            }}>
              {PRESET_DEBRIEF_REACTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendPreset(preset)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.25rem 0.5rem',
                    color: '#e2e8f0',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.15)';
                    e.currentTarget.style.borderColor = '#00d4ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} style={{
              display: 'flex',
              gap: '0.45rem',
              padding: '0.65rem 0.8rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(7, 11, 20, 0.7)'
            }}>
              <input
                type="text"
                placeholder="Un commentaire sur ce cas clinique ?..."
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '0.5rem 0.8rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!inputMsg.trim()}
                style={{
                  background: '#00d4ff',
                  color: '#070b14',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 0.95rem',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: inputMsg.trim() ? 'pointer' : 'default',
                  opacity: inputMsg.trim() ? 1 : 0.4,
                  boxShadow: inputMsg.trim() ? '0 0 10px rgba(0, 212, 255, 0.4)' : 'none'
                }}
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
