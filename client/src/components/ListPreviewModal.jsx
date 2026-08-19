import React, { useState, useEffect } from 'react';
import { getListEmoji } from './ListCard';

export default function ListPreviewModal({ list, onClose, onPlay, isEditable = false, onUpdateWords }) {
  const [searchWord, setSearchWord] = useState('');
  const [words, setWords] = useState(list?.words || []);
  const [editingWordIdx, setEditingWordIdx] = useState(null);
  const [newWordDraft, setNewWordDraft] = useState({ question: '', answer: '' });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setWords(list?.words || []);
  }, [list]);

  if (!list) return null;

  const title = list.title || list.name || 'Liste de vocabulaire';
  const emoji = getListEmoji(title, list.emoji);

  const filteredWords = words.map((w, idx) => ({ ...w, originalIdx: idx })).filter(w => {
    if (!searchWord.trim()) return true;
    const q = searchWord.toLowerCase().trim();
    const qText = (w.question || '').toLowerCase();
    const aText = (w.answer || '').toLowerCase();
    return qText.includes(q) || aText.includes(q);
  });

  const handleCommitEdit = (idx, newGerman, newFrench) => {
    const updated = [...words];
    updated[idx] = {
      ...updated[idx],
      answer: newGerman.trim() || updated[idx].answer,
      question: newFrench.trim() || updated[idx].question
    };
    setWords(updated);
    setEditingWordIdx(null);
    if (onUpdateWords) {
      onUpdateWords(updated);
    }
  };

  const handleDeleteWord = (idx) => {
    const wordToDelete = words[idx];
    const displayWord = wordToDelete?.answer || wordToDelete?.question || `#${idx + 1}`;
    if (!window.confirm(`Supprimer « ${displayWord} » de cette liste ?`)) return;

    const updated = words.filter((_, i) => i !== idx);
    setWords(updated);
    if (onUpdateWords) {
      onUpdateWords(updated);
    }
  };

  const handleAddNewWord = (e) => {
    e?.preventDefault();
    if (!newWordDraft.answer.trim() || !newWordDraft.question.trim()) {
      alert("Veuillez renseigner le mot en allemand et la traduction en français.");
      return;
    }
    const newWord = {
      id: Date.now(),
      answer: newWordDraft.answer.trim(),
      question: newWordDraft.question.trim()
    };
    const updated = [...words, newWord];
    setWords(updated);
    setNewWordDraft({ question: '', answer: '' });
    setShowAddForm(false);
    if (onUpdateWords) {
      onUpdateWords(updated);
    }
  };

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
          maxWidth: '600px',
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

        {/* Toolbar: Search + Add Word button if editable */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            value={searchWord}
            onChange={(e) => setSearchWord(e.target.value)}
            placeholder="🔍 Rechercher un mot..."
            className="input-field"
            style={{
              flex: 1,
              padding: '0.55rem 0.9rem',
              fontSize: '0.88rem',
              borderRadius: '10px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          />
          {isEditable && (
            <button
              type="button"
              onClick={() => setShowAddForm(prev => !prev)}
              className="btn btn-primary"
              style={{
                width: 'auto',
                padding: '0.55rem 0.9rem',
                fontSize: '0.85rem',
                whiteSpace: 'nowrap',
                fontWeight: 700
              }}
            >
              {showAddForm ? '✕ Fermer' : '+ Ajouter'}
            </button>
          )}
        </div>

        {/* Add Word Collapsible Form */}
        {isEditable && showAddForm && (
          <form
            onSubmit={handleAddNewWord}
            style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid var(--primary)',
              borderRadius: '14px',
              padding: '0.9rem',
              marginBottom: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.2rem' }}>
              ✨ Nouveau mot pour cette liste :
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🇩🇪</span>
                <input
                  type="text"
                  placeholder="Allemand (ex: der Hund)"
                  value={newWordDraft.answer}
                  onChange={(e) => setNewWordDraft(d => ({ ...d, answer: e.target.value }))}
                  className="input-field"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.88rem' }}
                  autoFocus
                />
              </div>
              <div style={{ flex: 1, minWidth: '160px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>🇫🇷</span>
                <input
                  type="text"
                  placeholder="Français (ex: le chien)"
                  value={newWordDraft.question}
                  onChange={(e) => setNewWordDraft(d => ({ ...d, question: e.target.value }))}
                  className="input-field"
                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.88rem' }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.3rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowAddForm(false)}
                style={{ width: 'auto', padding: '0.35rem 0.8rem', fontSize: '0.8rem' }}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="btn btn-success"
                style={{ width: 'auto', padding: '0.35rem 1rem', fontSize: '0.8rem', fontWeight: 800 }}
              >
                ✓ Ajouter à la liste
              </button>
            </div>
          </form>
        )}

        {/* Words List in identical card style as photo */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.3rem', maxHeight: '48vh' }}>
          {filteredWords.length === 0 ? (
            <div className="text-center text-muted" style={{ padding: '2rem' }}>
              {words.length === 0 ? "Cette liste ne contient aucun mot." : "Aucun mot correspondant à votre recherche."}
            </div>
          ) : (
            filteredWords.map((w) => {
              const idx = w.originalIdx;
              const isCurrentlyEditing = editingWordIdx === idx;

              return (
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
                    gap: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isCurrentlyEditing ? (
                    <EditWordInlineForm
                      word={w}
                      onSave={(newGerman, newFrench) => handleCommitEdit(idx, newGerman, newFrench)}
                      onCancel={() => setEditingWordIdx(null)}
                    />
                  ) : (
                    <>
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
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

                        {isEditable && (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingWordIdx(idx)}
                              style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.4)',
                                color: '#a5b4fc',
                                borderRadius: '8px',
                                padding: '0.35rem 0.55rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                lineHeight: 1
                              }}
                              title="Modifier ce mot"
                              onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.35)';
                                e.currentTarget.style.borderColor = 'var(--primary)';
                                e.currentTarget.style.transform = 'scale(1.08)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              ✏️
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteWord(idx)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#f87171',
                                borderRadius: '8px',
                                padding: '0.35rem 0.55rem',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s',
                                lineHeight: 1
                              }}
                              title="Supprimer ce mot"
                              onMouseOver={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.35)';
                                e.currentTarget.style.borderColor = '#ef4444';
                                e.currentTarget.style.transform = 'scale(1.08)';
                              }}
                              onMouseOut={e => {
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                            >
                              🗑️
                            </button>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
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

function EditWordInlineForm({ word, onSave, onCancel }) {
  const [german, setGerman] = useState(word.answer || '');
  const [french, setFrench] = useState(word.question || '');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!german.trim() || !french.trim()) return;
    onSave(german, french);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>🇩🇪</span>
        <input
          type="text"
          className="input-field"
          value={german}
          onChange={(e) => setGerman(e.target.value)}
          placeholder="Mot en Allemand (ex: das Haus)"
          style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
          autoFocus
        />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>🇫🇷</span>
        <input
          type="text"
          className="input-field"
          value={french}
          onChange={(e) => setFrench(e.target.value)}
          placeholder="Traduction en Français (ex: la maison)"
          style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.9rem' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.2rem' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          style={{ width: 'auto', padding: '0.3rem 0.7rem', fontSize: '0.8rem' }}
        >
          ✕ Annuler
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: 'auto', padding: '0.3rem 0.85rem', fontSize: '0.8rem', fontWeight: 800 }}
        >
          ✓ Valider
        </button>
      </div>
    </form>
  );
}
