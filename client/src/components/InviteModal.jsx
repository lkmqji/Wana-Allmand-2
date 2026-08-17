import { useState } from 'react';
import { formatPlayerName } from '../utils/formatters';

export default function InviteModal({ invite, onAccept, onReject }) {
  const [showFullList, setShowFullList] = useState(true);

  if (!invite) return null;

  const { sessionId, hostName, hostAvatar, vocabList = [], settings } = invite;
  const wordCount = vocabList.length;
  const timePerWord = settings?.timePerWord || 15;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '1rem',
      animation: 'fadeIn 0.25s ease-out'
    }}>
      <div 
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.3)',
          border: '2px solid var(--primary)',
          borderRadius: '24px',
          padding: '1.5rem',
          background: 'var(--bg-surface)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.2rem', position: 'relative' }}>
          <div style={{
            fontSize: '3rem',
            lineHeight: 1,
            marginBottom: '0.5rem',
            animation: 'pulse 1.5s infinite'
          }}>
            {hostAvatar || '🎮'}
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: 'var(--text-main)' }}>
            Invitation à une partie !
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            <strong style={{ color: 'var(--primary)' }}>{formatPlayerName(hostName)}</strong> vous invite à rejoindre son duel.
          </p>

          {/* Session Code Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginTop: '0.8rem',
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            padding: '0.4rem 1rem',
            borderRadius: '999px',
            fontSize: '0.9rem'
          }}>
            <span className="text-muted">Code session :</span>
            <span style={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '2px' }}>{sessionId}</span>
          </div>
        </div>

        {/* Info Badges */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.8rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.6rem 0.8rem',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Mots au programme</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>📚 {wordCount} mots</span>
          </div>
          <div style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '0.6rem 0.8rem',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Temps par mot</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--text-main)' }}>⏱️ {timePerWord}s</span>
          </div>
        </div>

        {/* Word List Preview */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '0.8rem',
          marginBottom: '1.2rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            paddingBottom: '0.4rem',
            borderBottom: '1px solid var(--border-color)'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📝</span> Liste des mots ({wordCount})
            </span>
            <button
              onClick={() => setShowFullList(!showFullList)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              {showFullList ? 'Réduire ▲' : 'Déplier ▼'}
            </button>
          </div>

          {showFullList && (
            <div style={{
              overflowY: 'auto',
              flex: 1,
              maxHeight: '180px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              paddingRight: '0.3rem'
            }}>
              {vocabList.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: 'auto' }}>
                  Liste personnalisée
                </p>
              ) : (
                vocabList.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '0.4rem 0.6rem',
                      fontSize: '0.85rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{item.question}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0.5rem' }}>➔</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{item.answer}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Action Buttons: Accepter & Rejeter */}
        <div style={{ display: 'flex', gap: '0.8rem' }}>
          <button
            onClick={onReject}
            className="btn btn-secondary"
            style={{
              flex: 1,
              padding: '0.8rem 1rem',
              fontSize: '0.95rem',
              color: 'var(--danger)',
              borderColor: 'rgba(239, 68, 68, 0.4)'
            }}
          >
            ✕ Rejeter
          </button>
          <button
            onClick={onAccept}
            className="btn btn-success"
            style={{
              flex: 1.5,
              padding: '0.8rem 1.2rem',
              fontSize: '1rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <span>✓</span> Accepter
          </button>
        </div>
      </div>
    </div>
  );
}
