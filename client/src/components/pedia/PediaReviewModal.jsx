import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatPlayerName } from '../../utils/formatters';
import { geminiService, cleanLatexMath } from '../../services/geminiService';

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

/**
 * Parse structured reasoning note from Gemini Flash into 4 clinical sections
 */
function parseReasoningCards(noteText) {
  if (!noteText || typeof noteText !== 'string') return null;
  const raw = cleanLatexMath(noteText.trim());

  const sec1Regex = /(?:###\s*|\*\*|#\s*)?(?:1[\.\)]\s*)?🎯\s*PI[ÈÉEeèéê]GE[^\n:]*[:\n]([\s\S]*?)(?=(?:###\s*|\*\*|#\s*)?(?:2[\.\)]\s*)?📋\s*JUSTIFICATION|(?:###\s*|\*\*|#\s*)?(?:3[\.\)]\s*)?🩺\s*D[ÉEèéê]MARCHE|(?:###\s*|\*\*|#\s*)?(?:2[\.\)]\s*)?🩺\s*M[ÉEèéê]THODE|$)/i;
  const sec2Regex = /(?:###\s*|\*\*|#\s*)?(?:2[\.\)]\s*)?📋\s*JUSTIFICATION[^\n:]*[:\n]([\s\S]*?)(?=(?:###\s*|\*\*|#\s*)?(?:3[\.\)]\s*)?🩺\s*D[ÉEèéê]MARCHE|(?:###\s*|\*\*|#\s*)?(?:4[\.\)]\s*)?💡\s*R[ÈÉEeèéê]GLE|$)/i;
  const sec3Regex = /(?:###\s*|\*\*|#\s*)?(?:[23][\.\)]\s*)?🩺\s*(?:D[ÉEèéê]MARCHE|M[ÉEèéê]THODE)[^\n:]*[:\n]([\s\S]*?)(?=(?:###\s*|\*\*|#\s*)?(?:[34][\.\)]\s*)?💡\s*R[ÈÉEeèéê]GLE|$)/i;
  const sec4Regex = /(?:###\s*|\*\*|#\s*)?(?:[34][\.\)]\s*)?💡\s*R[ÈÉEeèéê]GLE[^\n:]*[:\n]([\s\S]*?)$/i;

  const match1 = raw.match(sec1Regex);
  const match2 = raw.match(sec2Regex);
  const match3 = raw.match(sec3Regex);
  const match4 = raw.match(sec4Regex);

  return {
    trap: match1?.[1]?.trim(),
    justification: match2?.[1]?.trim(),
    method: match3?.[1]?.trim(),
    rule: match4?.[1]?.trim(),
    rawFallback: raw
  };
}

function renderInlineMarkdown(str) {
  if (!str) return '';
  const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function renderFormattedNoteSection(text) {
  if (!text) return null;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const elements = [];
  let currentList = [];
  let keyIdx = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${keyIdx++}`} className="reasoning-list">
          {currentList.map((item, idx) => (
            <li key={idx} className="reasoning-list-item">{renderInlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line) => {
    if (/^[\-–—*]{3,}$/.test(line)) return;

    if (line.startsWith('>')) {
      flushList();
      elements.push(
        <blockquote key={`quote-${keyIdx++}`} className="reasoning-callout-quote">
          {renderInlineMarkdown(line.replace(/^>\s*/, ''))}
        </blockquote>
      );
      return;
    }

    if (/^[-•*]\s+/.test(line)) {
      currentList.push(line.replace(/^[-•*]\s+/, ''));
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${keyIdx++}`} className="reasoning-paragraph">
        {renderInlineMarkdown(line)}
      </p>
    );
  });

  flushList();
  return elements;
}

const PRESET_DEBRIEF_REACTIONS = [
  '💡 Bravo !',
  '😅 Pas évident',
  '🏥 Cas typique',
  '👏 Bien joué',
  '🤔 Piège !',
  '🤖 Explique le piège !'
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
  extendVotes1m = null,
  extendVotes3m = null,
  extendedRemainingSeconds = null
}) {
  const [timeLeft, setTimeLeft] = useState(reviewDuration);
  const [inputMsg, setInputMsg] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiReasoning, setAiReasoning] = useState({
    loading: false,
    note: null,
    modelUsed: null,
    error: null
  });
  const chatBottomRef = useRef(null);

  const count1m = extendVotes1m ? (extendVotes1m.count || 0) : extendVotesCount;
  const hasVoted1m = extendVotes1m?.voters
    ? extendVotes1m.voters.includes(myPlayerId)
    : hasVotedExtend;

  const count3m = extendVotes3m?.count || 0;
  const hasVoted3m = extendVotes3m?.voters
    ? extendVotes3m.voters.includes(myPlayerId)
    : false;

  // Sync remaining seconds when time is extended by server
  useEffect(() => {
    if (typeof extendedRemainingSeconds === 'number') {
      setTimeLeft(extendedRemainingSeconds);
    }
  }, [extendedRemainingSeconds]);

  // Reset AI states when switching question
  useEffect(() => {
    setAiReasoning({
      loading: false,
      note: null,
      modelUsed: null,
      error: null
    });
    setIsAiThinking(false);
  }, [debriefQuestion?.uid]);

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
  }, [chatMessages, isAiThinking]);

  const handleSendChat = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const rawText = inputMsg.trim();
    if (!rawText) return;

    const startsWithAi = /^\/(?:ia|ai)\b/i.test(rawText);
    const isAiTargeted = isAiMode || startsWithAi;

    if (isAiTargeted) {
      const promptText = startsWithAi ? rawText.replace(/^\/(?:ia|ai)\s*/i, '').trim() : rawText;
      if (!promptText) {
        setInputMsg('');
        return;
      }

      // 1. Send user's prompt so both players see the question in chat
      const displayMsg = startsWithAi ? rawText : `🤖 [Question IA] ${rawText}`;
      if (onSendChatMessage) {
        onSendChatMessage(displayMsg);
      }
      setInputMsg('');

      // 2. Call Gemini Flash AI Tutor
      setIsAiThinking(true);
      try {
        const conversationHistory = (chatMessages || [])
          .filter(m => m.text)
          .map(m => ({
            role: m.isAi ? 'ai' : 'user',
            text: m.text
          }));

        const response = await geminiService.askAboutQuestion(
          debriefQuestion,
          conversationHistory,
          promptText
        );

        if (onSendChatMessage) {
          onSendChatMessage({
            text: response.text,
            senderName: `🤖 Tuteur IA (${response.modelUsed || 'Gemini Flash'})`,
            senderAvatar: '⚡',
            isAi: true,
            modelUsed: response.modelUsed
          });
        }
      } catch (err) {
        console.error('Erreur Tuteur IA:', err);
        if (onSendChatMessage) {
          onSendChatMessage({
            text: `⚠️ Le Tuteur IA n'a pas pu répondre : ${err.message}`,
            senderName: '🤖 Tuteur IA',
            senderAvatar: '⚠️',
            isAi: true
          });
        }
      } finally {
        setIsAiThinking(false);
      }
    } else {
      if (onSendChatMessage) {
        onSendChatMessage(rawText);
      }
      setInputMsg('');
    }
  };

  const handleSendPreset = (preset) => {
    if (!preset) return;
    if (preset === '🤖 Explique le piège !') {
      setInputMsg('/ia Explique-moi le piège principal de ce cas clinique');
      return;
    }
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

  const handleGenerateAiReasoning = async () => {
    if (!debriefQuestion || aiReasoning.loading) return;
    setAiReasoning(prev => ({ ...prev, loading: true, error: null }));
    try {
      const studentAnsLetters = mySelectedLetters || [];
      const studentCroqText = myAnswer?.text || myAnswer?.answer || '';
      const result = await geminiService.generateReasoningNote(
        debriefQuestion,
        studentAnsLetters,
        isCroq,
        studentCroqText
      );
      setAiReasoning({
        loading: false,
        note: result.note,
        modelUsed: result.modelUsed,
        error: null
      });
    } catch (err) {
      console.error('Erreur génération raisonnement IA:', err);
      setAiReasoning({
        loading: false,
        note: null,
        modelUsed: null,
        error: err.message || 'Impossible de générer le raisonnement IA.'
      });
    }
  };

  const renderReasoningCards = (noteText) => {
    const parsed = parseReasoningCards(noteText);
    if (!parsed) return null;

    const hasAnySection = parsed.trap || parsed.justification || parsed.method || parsed.rule;

    if (!hasAnySection) {
      return (
        <div className="reasoning-cards-container">
          <div className="reasoning-card card-method">
            <div className="reasoning-card-body">
              {renderFormattedNoteSection(parsed.rawFallback)}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="reasoning-cards-container">
        {/* Card 1: Piège Clinique & Analyse de l'Erreur */}
        {parsed.trap && (
          <div className="reasoning-card card-trap">
            <div className="reasoning-card-header">
              <span className="reasoning-badge badge-trap">
                <span>🎯</span>
                <span>Piège Clinique &amp; Analyse de l'Erreur</span>
              </span>
            </div>
            <div className="reasoning-card-body">
              {renderFormattedNoteSection(parsed.trap)}
            </div>
          </div>
        )}

        {/* Card 2: Justification Proposition par Proposition */}
        {parsed.justification && (
          <div className="reasoning-card card-options-analysis">
            <div className="reasoning-card-header">
              <span className="reasoning-badge badge-options-analysis">
                <span>📋</span>
                <span>Justification Proposition par Proposition</span>
              </span>
            </div>
            <div className="reasoning-card-body">
              {renderFormattedNoteSection(parsed.justification)}
            </div>
          </div>
        )}

        {/* Card 3: Démarche Clinique & Raisonnement */}
        {parsed.method && (
          <div className="reasoning-card card-method">
            <div className="reasoning-card-header">
              <span className="reasoning-badge badge-method">
                <span>🩺</span>
                <span>Démarche Clinique &amp; Raisonnement</span>
              </span>
            </div>
            <div className="reasoning-card-body">
              {renderFormattedNoteSection(parsed.method)}
            </div>
          </div>
        )}

        {/* Card 4: Règle d'or & Mémo Concours */}
        {parsed.rule && (
          <div className="reasoning-card card-rule">
            <div className="reasoning-card-header">
              <span className="reasoning-badge badge-rule">
                <span>💡</span>
                <span>Règle d'Or &amp; Mémo Concours</span>
              </span>
            </div>
            <div className="reasoning-card-body">
              {renderFormattedNoteSection(parsed.rule)}
            </div>
          </div>
        )}
      </div>
    );
  };

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

            {/* Extend Time Buttons (+1 min & +3 min with Mutual Voting) */}
            {onVoteExtendDebriefTime && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                {/* +1 min Button */}
                <button
                  type="button"
                  onClick={() => onVoteExtendDebriefTime(1)}
                  className="btn-extend-debrief"
                  style={{
                    padding: '0.42rem 0.85rem',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: hasVoted1m
                      ? 'rgba(245, 158, 11, 0.22)'
                      : (!hasVoted1m && count1m > 0 ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.35), rgba(234, 88, 12, 0.25))' : 'rgba(255, 255, 255, 0.08)'),
                    color: hasVoted1m
                      ? '#fbbf24'
                      : (!hasVoted1m && count1m > 0 ? '#fef08a' : '#cbd5e1'),
                    border: hasVoted1m
                      ? '1.5px solid #f59e0b'
                      : (!hasVoted1m && count1m > 0 ? '1.5px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.16)'),
                    boxShadow: hasVoted1m
                      ? '0 0 14px rgba(245, 158, 11, 0.45)'
                      : (!hasVoted1m && count1m > 0 ? '0 0 18px rgba(245, 158, 11, 0.6)' : 'none')
                  }}
                  title={totalPlayers > 1 ? "Voter pour ajouter 1 minute supplémentaire au débriefing (les 2 joueurs doivent voter)" : "Ajouter 1 minute supplémentaire au débriefing"}
                >
                  <span style={{ fontSize: '0.95rem' }}>⏱️</span>
                  {totalPlayers <= 1 ? (
                    <span>+1 min</span>
                  ) : hasVoted1m ? (
                    <span>En attente ({count1m}/{extendTotalRequired})</span>
                  ) : (!hasVoted1m && count1m > 0) ? (
                    <span>Accepter +1 min ! ({count1m}/{extendTotalRequired})</span>
                  ) : (
                    <span>+1 min ({count1m}/{extendTotalRequired})</span>
                  )}
                </button>

                {/* +3 min Button */}
                <button
                  type="button"
                  onClick={() => onVoteExtendDebriefTime(3)}
                  className="btn-extend-debrief"
                  style={{
                    padding: '0.42rem 0.85rem',
                    fontSize: '0.84rem',
                    fontWeight: 800,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: hasVoted3m
                      ? 'rgba(168, 85, 247, 0.25)'
                      : (!hasVoted3m && count3m > 0 ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.35), rgba(139, 92, 246, 0.25))' : 'rgba(255, 255, 255, 0.08)'),
                    color: hasVoted3m
                      ? '#c084fc'
                      : (!hasVoted3m && count3m > 0 ? '#f3e8ff' : '#cbd5e1'),
                    border: hasVoted3m
                      ? '1.5px solid #a855f7'
                      : (!hasVoted3m && count3m > 0 ? '1.5px solid #c084fc' : '1px solid rgba(255, 255, 255, 0.16)'),
                    boxShadow: hasVoted3m
                      ? '0 0 14px rgba(168, 85, 247, 0.45)'
                      : (!hasVoted3m && count3m > 0 ? '0 0 18px rgba(168, 85, 247, 0.6)' : 'none')
                  }}
                  title={totalPlayers > 1 ? "Voter pour ajouter 3 minutes supplémentaires au débriefing (les 2 joueurs doivent voter)" : "Ajouter 3 minutes supplémentaires au débriefing"}
                >
                  <span style={{ fontSize: '0.95rem' }}>⏳</span>
                  {totalPlayers <= 1 ? (
                    <span>+3 min</span>
                  ) : hasVoted3m ? (
                    <span>En attente ({count3m}/{extendTotalRequired})</span>
                  ) : (!hasVoted3m && count3m > 0) ? (
                    <span>Accepter +3 min ! ({count3m}/{extendTotalRequired})</span>
                  ) : (
                    <span>+3 min ({count3m}/{extendTotalRequired})</span>
                  )}
                </button>
              </div>
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

            {/* Deep Clinical AI Reasoning Note (Gemini Flash Cascade - 4 Cards) */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(13, 21, 39, 0.95), rgba(168, 85, 247, 0.08))',
              padding: '1.1rem 1.25rem',
              borderRadius: '16px',
              border: '1.5px solid rgba(168, 85, 247, 0.35)',
              boxShadow: '0 4px 24px rgba(168, 85, 247, 0.12)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.6rem',
                marginBottom: aiReasoning.note || aiReasoning.loading ? '0.85rem' : '0.4rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>🤖</span>
                  <div>
                    <div style={{
                      fontSize: '0.86rem',
                      fontWeight: 900,
                      color: '#c084fc',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Explication &amp; Raisonnement Clinique IA
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {aiReasoning.modelUsed ? `Modèle : ${aiReasoning.modelUsed}` : 'Moteur Gemini Flash Médical'}
                    </div>
                  </div>
                </div>

                {/* Action button: Generate or Reanalyze */}
                {!aiReasoning.loading && (
                  <button
                    type="button"
                    onClick={handleGenerateAiReasoning}
                    style={{
                      background: aiReasoning.note ? 'rgba(255, 255, 255, 0.08)' : 'linear-gradient(135deg, #a855f7, #6366f1)',
                      color: '#ffffff',
                      border: aiReasoning.note ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                      borderRadius: '10px',
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      boxShadow: aiReasoning.note ? 'none' : '0 0 14px rgba(168, 85, 247, 0.45)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{aiReasoning.note ? '🔄' : '✨'}</span>
                    <span>{aiReasoning.note ? 'Réanalyser' : 'Analyser par IA'}</span>
                  </button>
                )}
              </div>

              {/* Loading State */}
              {aiReasoning.loading && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '1rem 0.5rem',
                  color: '#c084fc'
                }}>
                  <div className="typing-indicator">
                    <span style={{ background: '#a855f7' }}></span>
                    <span style={{ background: '#a855f7' }}></span>
                    <span style={{ background: '#a855f7' }}></span>
                  </div>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, fontStyle: 'italic' }}>
                    Gemini Flash analyse le cas clinique et justifie chaque proposition (A à E)...
                  </span>
                </div>
              )}

              {/* Error State */}
              {aiReasoning.error && !aiReasoning.loading && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                  marginTop: '0.5rem'
                }}>
                  ⚠️ {aiReasoning.error}
                </div>
              )}

              {/* Invitation Text */}
              {!aiReasoning.loading && !aiReasoning.note && !aiReasoning.error && (
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5 }}>
                  Cliquez sur <strong>"Analyser par IA"</strong> pour obtenir une analyse exhaustive : piège clinique classique, justifications proposition par proposition (A-E), démarche diagnostique et règle mémo concours.
                </div>
              )}

              {/* Render Structured Cards */}
              {aiReasoning.note && !aiReasoning.loading && (
                renderReasoningCards(aiReasoning.note)
              )}
            </div>
          </div>

          {/* Column 2: Interactive Live Chat Between Both Players & AI Tutor */}
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
              justifyContent: 'space-between',
              gap: '0.45rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span>💬</span> Chat Débriefing (En direct)
              </div>
              <div style={{
                fontSize: '0.72rem',
                color: '#c084fc',
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                padding: '2px 8px',
                borderRadius: '999px',
                fontWeight: 700
              }}>
                🤖 Tuteur Flash intégré
              </div>
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
                  Échangez avec votre adversaire ou posez vos questions au <strong>Tuteur IA (/ia)</strong> ! 💬
                </div>
              ) : (
                chatMessages.map((msg) => {
                  const isMe = msg.senderId === myPlayerId;
                  const isAi = Boolean(msg.isAi || msg.senderId === 'ai_tutor');

                  if (isAi) {
                    return (
                      <div
                        key={msg.id}
                        className="chat-bubble bubble-ai"
                        style={{
                          alignSelf: 'flex-start',
                          maxWidth: '92%',
                          background: 'linear-gradient(135deg, rgba(18, 29, 51, 0.98), rgba(88, 28, 135, 0.35))',
                          border: '1.5px solid rgba(0, 212, 255, 0.35)',
                          borderRadius: '14px',
                          borderBottomLeftRadius: '4px',
                          padding: '0.7rem 0.9rem',
                          boxShadow: '0 4px 18px rgba(0, 212, 255, 0.12)'
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                          marginBottom: '0.35rem',
                          fontSize: '0.72rem'
                        }}>
                          <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                            {msg.senderName || '🤖 Tuteur IA Pédiatrique'}
                          </span>
                          {msg.modelUsed && (
                            <span style={{
                              fontSize: '0.65rem',
                              padding: '1px 6px',
                              borderRadius: '999px',
                              background: 'rgba(0, 212, 255, 0.15)',
                              color: '#7dd3fc',
                              border: '1px solid rgba(0, 212, 255, 0.3)'
                            }}>
                              {msg.modelUsed}
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#f1f5f9', wordBreak: 'break-word', lineHeight: 1.5, fontSize: '0.84rem' }}>
                          {renderFormattedNoteSection(msg.text)}
                        </div>
                      </div>
                    );
                  }

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

              {/* AI Thinking Indicator */}
              {isAiThinking && (
                <div style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '0.65rem 0.95rem',
                  background: 'rgba(18, 29, 51, 0.95)',
                  border: '1px solid rgba(0, 212, 255, 0.35)',
                  borderRadius: '14px',
                  borderBottomLeftRadius: '4px',
                  boxShadow: '0 2px 14px rgba(0, 212, 255, 0.2)'
                }}>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontStyle: 'italic', fontWeight: 700 }}>
                    Gemini Flash analyse ce QCM...
                  </span>
                </div>
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
                    background: preset.includes('🤖') ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.06)',
                    border: preset.includes('🤖') ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '0.25rem 0.5rem',
                    color: preset.includes('🤖') ? '#e9d5ff' : '#e2e8f0',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                    fontWeight: preset.includes('🤖') ? 700 : 500
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = preset.includes('🤖') ? 'rgba(168, 85, 247, 0.3)' : 'rgba(0, 212, 255, 0.15)';
                    e.currentTarget.style.borderColor = preset.includes('🤖') ? '#c084fc' : '#00d4ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = preset.includes('🤖') ? 'rgba(168, 85, 247, 0.18)' : 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = preset.includes('🤖') ? 'rgba(168, 85, 247, 0.4)' : 'rgba(255, 255, 255, 0.1)';
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* AI Tutor Toggle & Quick Trigger Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.35rem 0.8rem',
              background: 'rgba(7, 11, 20, 0.65)',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              fontSize: '0.76rem'
            }}>
              <button
                type="button"
                onClick={() => setIsAiMode(prev => !prev)}
                className={`btn-chat-ai-toggle ${isAiMode ? 'active' : ''}`}
                title="Cocher pour envoyer directement vos questions au Tuteur IA Pédiatrique"
              >
                <span>🤖</span>
                <span>{isAiMode ? '✓ Tuteur IA Actif' : 'Tuteur IA'}</span>
              </button>
              <span style={{ color: isAiMode ? '#c084fc' : '#64748b', fontSize: '0.72rem', fontStyle: 'italic' }}>
                {isAiMode ? 'Vos questions s\'adressent au Tuteur IA' : 'Tapez /ia [question] ou cochez 🤖'}
              </span>
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
                placeholder={isAiMode ? "Posez votre question médicale au Tuteur IA..." : "Un commentaire sur ce cas clinique ? (Tapez /ia pour l'IA)..."}
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                disabled={isAiThinking}
                style={{
                  flex: 1,
                  background: isAiMode ? 'rgba(168, 85, 247, 0.08)' : 'rgba(255, 255, 255, 0.06)',
                  border: isAiMode ? '1.5px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '10px',
                  padding: '0.5rem 0.8rem',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!inputMsg.trim() || isAiThinking}
                style={{
                  background: isAiMode ? 'linear-gradient(135deg, #a855f7, #6366f1)' : '#00d4ff',
                  color: isAiMode ? '#ffffff' : '#070b14',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.5rem 0.95rem',
                  fontWeight: 900,
                  fontSize: '0.85rem',
                  cursor: (inputMsg.trim() && !isAiThinking) ? 'pointer' : 'default',
                  opacity: (inputMsg.trim() && !isAiThinking) ? 1 : 0.4,
                  boxShadow: (inputMsg.trim() && !isAiThinking) ? (isAiMode ? '0 0 12px rgba(168, 85, 247, 0.5)' : '0 0 10px rgba(0, 212, 255, 0.4)') : 'none'
                }}
              >
                {isAiThinking ? '⏳' : 'Envoyer'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
