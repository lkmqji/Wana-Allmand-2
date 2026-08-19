import React, { useState } from 'react';
import { getListEmoji } from './ListCard';

export default function ListPreviewModal({ list, onClose, onPlay }) {
  const [searchWord, setSearchWord] = useState('');
  if (!list) return null;

  const title = list.title || list.name || 'Liste de vocabulaire';
  const emoji = getListEmoji(title, list.emoji);
  const words = list.words || [];

  const filteredWords = words.filter(w => {
    if (!searchWord.trim()) return true;
    const q = searchWord.toLowerCase().trim();
    const qText = (w.question || '').toLowerCase();
    const aText = (w.answer || '').toLowerCase();
    return qText.includes(q) || aText.includes(q);
  });

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '1rem'
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '580px',
          width: '100%',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(145deg, #180c10 0%, #0d0608 100%)',
          border: '1.5px solid rgba(239, 68, 68, 0.45)',
          borderRadius: '22px',
          padding: '1.8rem',
          boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(239, 68, 68, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '2rem' }}>{emoji}</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#ffffff', fontWeight: 800 }}>
                {title}
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600 }}>
                {words.length} {words.length > 1 ? 'mots' : 'mot'} au total
                {list.creatorName && ` • Par ${list.creatorName}`}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Search filter if more than 5 words */}
        {words.length > 5 && (
          <div style={{ marginBottom: '1rem' }}>
            <input
              type="text"
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              placeholder="🔍 Rechercher dans cette liste..."
              className="input-field"
              style={{
                width: '100%',
                padding: '0.55rem 0.9rem',
                fontSize: '0.88rem',
                borderRadius: '10px',
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            />
          </div>
        )}

        {/* Words List in identical card style as photo */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.3rem', maxHeight: '48vh' }}>
          {filteredWords.length === 0 ? (
            <div className="text-center text-muted" style={{ padding: '2rem' }}>
              Aucun mot trouvé.
            </div>
          ) : (
            filteredWords.map((w, idx) => (
              <div
                key={w.id || idx}
                style={{
                  background: 'linear-gradient(135deg, rgba(25, 12, 16, 0.75) 0%, var(--bg-surface) 100%)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '14px',
                  padding: '0.85rem 1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fca5a5', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🇩🇪</span>
                    <span>{w.answer || '—'}</span>
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '0.25rem', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🇫🇷</span>
                    <span>{w.question || '—'}</span>
                  </div>
                </div>
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  whiteSpace: 'nowrap'
                }}>
                  #{idx + 1}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1, padding: '0.85rem', fontSize: '0.95rem' }}
          >
            Fermer
          </button>
          {onPlay && (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => {
                onClose();
                onPlay(words);
              }}
              style={{ flex: 2, padding: '0.85rem', fontSize: '0.95rem', fontWeight: 800 }}
            >
              ⚔️ JOUER CETTE LISTE
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
