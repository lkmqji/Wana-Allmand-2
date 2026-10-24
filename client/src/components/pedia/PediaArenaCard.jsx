import React, { useState, useEffect } from 'react';

/**
 * Format medical content with clean paragraphs and lists
 */
function formatMedicalText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();
  text = text.replace(/([^\n\r])\s*([➢⁃•►▶✔✓])\s*/g, '$1\n$2 ');
  text = text.replace(/([^\n\r])\s+(\d+[\.\)-]\s+[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ])/g, '$1\n$2');
  return text;
}

export default function PediaArenaCard({
  question,
  questionIndex = 0,
  totalQuestions = 10,
  onSubmitAnswer,
  hasAnswered = false,
  opponentAnswered = false,
  timeRemaining = 0
}) {
  const [selectedLetters, setSelectedLetters] = useState([]);
  const [croqText, setCroqText] = useState('');

  // Reset local state when a new question arrives
  useEffect(() => {
    setSelectedLetters([]);
    setCroqText('');
  }, [question?.uid, questionIndex]);

  if (!question) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <p>Chargement de la question médicale...</p>
      </div>
    );
  }

  const isCroq = Boolean(question.is_croq || question.type === 'CROQ');
  const options = question.options || [];

  const handleToggleOption = (letter) => {
    if (hasAnswered) return;
    setSelectedLetters(prev => {
      const upper = letter.toUpperCase();
      if (prev.includes(upper)) {
        return prev.filter(l => l !== upper);
      } else {
        return [...prev, upper].sort();
      }
    });
  };

  const handleValidateQcm = () => {
    if (hasAnswered || selectedLetters.length === 0) return;
    onSubmitAnswer(selectedLetters);
  };

  const handleValidateCroq = () => {
    if (hasAnswered || !croqText.trim()) return;
    onSubmitAnswer(croqText.trim());
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      width: '100%',
      maxWidth: '850px',
      margin: '0 auto',
      paddingBottom: '2.5rem'
    }}>
      {/* Header bar: Chapter & Question metadata */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem',
        padding: '0.6rem 1rem',
        background: 'rgba(13, 21, 39, 0.85)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        borderRadius: '14px',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🩺</span>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#00d4ff', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.5px' }}>
              {question.chapterTitle || 'Pédiatrie'}
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f6fc' }}>
              Question {questionIndex + 1} / {totalQuestions}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            fontSize: '0.75rem',
            padding: '0.2rem 0.6rem',
            borderRadius: '9999px',
            fontWeight: 800,
            background: isCroq ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0, 212, 255, 0.2)',
            color: isCroq ? '#c084fc' : '#38bdf8',
            border: `1px solid ${isCroq ? 'rgba(139, 92, 246, 0.5)' : 'rgba(0, 212, 255, 0.5)'}`
          }}>
            {isCroq ? '✍️ CROQ (Rédaction)' : (question.type || 'QCM')}
          </span>

          {opponentAnswered && (
            <span style={{
              fontSize: '0.72rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px',
              fontWeight: 800,
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}>
              <span>⚡</span> Adversaire a répondu
            </span>
          )}
        </div>
      </div>

      {/* Clinical Case if present */}
      {question.is_cas_clinique && question.clinical_case && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.08))',
          border: '1.5px solid rgba(56, 189, 248, 0.4)',
          borderRadius: '16px',
          padding: '1rem 1.2rem',
          boxShadow: '0 4px 20px rgba(0, 212, 255, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.85rem',
            fontWeight: 800,
            color: '#38bdf8',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            <span>🩺</span> Cas Clinique
          </div>
          <p style={{
            margin: 0,
            fontSize: '0.94rem',
            lineHeight: 1.55,
            color: '#e2e8f0',
            whiteSpace: 'pre-line',
            fontWeight: 500
          }}>
            {formatMedicalText(question.clinical_case)}
          </p>
        </div>
      )}

      {/* Main Question Statement */}
      <div style={{
        background: 'rgba(18, 29, 51, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        padding: '1.2rem 1.4rem',
        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '1.08rem',
          lineHeight: 1.5,
          fontWeight: 700,
          color: '#ffffff',
          whiteSpace: 'pre-line'
        }}>
          {formatMedicalText(question.question)}
        </h3>

        {/* Media images if present */}
        {Array.isArray(question.media_urls) && question.media_urls.length > 0 && (
          <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {question.media_urls.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Illustration ${idx + 1}`}
                style={{
                  maxHeight: '180px',
                  borderRadius: '10px',
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

      {/* Answering Area */}
      {!isCroq ? (
        /* QCM / QCU Options Grid */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {options.map((opt) => {
            const letter = (opt.letter || '').toUpperCase();
            const isSelected = selectedLetters.includes(letter);

            return (
              <div
                key={opt.id || letter}
                onClick={() => handleToggleOption(letter)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem',
                  padding: '0.85rem 1.1rem',
                  borderRadius: '14px',
                  cursor: hasAnswered ? 'default' : 'pointer',
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.18), rgba(13, 21, 39, 0.9))'
                    : 'rgba(13, 21, 39, 0.75)',
                  border: isSelected
                    ? '2px solid #00d4ff'
                    : '1.5px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isSelected
                    ? '0 0 16px rgba(0, 212, 255, 0.25)'
                    : 'none',
                  transition: 'all 0.18s ease',
                  userSelect: 'none'
                }}
              >
                {/* Letter Circle Badge */}
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: '0.95rem',
                  background: isSelected ? '#00d4ff' : 'rgba(255, 255, 255, 0.06)',
                  color: isSelected ? '#070b14' : '#94a3b8',
                  boxShadow: isSelected ? '0 0 10px rgba(0, 212, 255, 0.6)' : 'none',
                  flexShrink: 0,
                  transition: 'all 0.18s ease'
                }}>
                  {letter}
                </div>

                {/* Proposition Text */}
                <div style={{
                  fontSize: '0.95rem',
                  lineHeight: 1.45,
                  color: isSelected ? '#ffffff' : '#cbd5e1',
                  fontWeight: isSelected ? 600 : 500,
                  flex: 1
                }}>
                  {opt.text}
                </div>

                {/* Checkmark icon if selected */}
                {isSelected && (
                  <div style={{
                    color: '#00d4ff',
                    fontSize: '1.1rem',
                    fontWeight: 900,
                    flexShrink: 0
                  }}>
                    ✓
                  </div>
                )}
              </div>
            );
          })}

          {/* Validation Action */}
          <div style={{ marginTop: '0.4rem' }}>
            <button
              type="button"
              onClick={handleValidateQcm}
              disabled={hasAnswered || selectedLetters.length === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.9rem',
                fontSize: '1.05rem',
                fontWeight: 900,
                letterSpacing: '0.5px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.6rem',
                background: hasAnswered
                  ? 'rgba(16, 185, 129, 0.3)'
                  : (selectedLetters.length > 0 ? 'linear-gradient(135deg, #00d4ff, #0284c7)' : 'rgba(255,255,255,0.08)'),
                color: hasAnswered ? '#34d399' : (selectedLetters.length > 0 ? '#070b14' : '#64748b'),
                borderColor: hasAnswered ? '#10b981' : (selectedLetters.length > 0 ? '#00d4ff' : 'transparent'),
                boxShadow: (selectedLetters.length > 0 && !hasAnswered) ? '0 4px 18px rgba(0, 212, 255, 0.4)' : 'none'
              }}
            >
              {hasAnswered ? (
                <>✓ Réponse envoyée ({selectedLetters.join(', ')}) • En attente</>
              ) : (
                <>VALIDER {selectedLetters.length > 0 ? `(${selectedLetters.join(', ')})` : ''}</>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* CROQ / QROC Textarea Input */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{
            background: 'rgba(13, 21, 39, 0.85)',
            border: '1.5px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            padding: '1rem'
          }}>
            <textarea
              rows={4}
              value={croqText}
              onChange={(e) => setCroqText(e.target.value)}
              disabled={hasAnswered}
              placeholder="Saisissez votre réponse médicale rédigée (mots-clés cliniques, thérapeutiques ou paracliniques attendus au concours)..."
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#f8fafc',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.4rem' }}>
              <span>💡 Évaluation sémantique IA (Gemini Flash)</span>
              <span>{croqText.length} caractères</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleValidateCroq}
            disabled={hasAnswered || !croqText.trim()}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.9rem',
              fontSize: '1.05rem',
              fontWeight: 900,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.6rem',
              background: hasAnswered
                ? 'rgba(16, 185, 129, 0.3)'
                : (croqText.trim() ? 'linear-gradient(135deg, #8b5cf6, #6366f1)' : 'rgba(255,255,255,0.08)'),
              color: hasAnswered ? '#34d399' : (croqText.trim() ? '#ffffff' : '#64748b'),
              borderColor: hasAnswered ? '#10b981' : (croqText.trim() ? '#8b5cf6' : 'transparent')
            }}
          >
            {hasAnswered ? '✓ Réponse envoyée à l\'IA • Évaluation en cours...' : 'SOUMETTRE À L\'IA ⚡'}
          </button>
        </div>
      )}
    </div>
  );
}
