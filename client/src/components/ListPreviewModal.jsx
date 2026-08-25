import React, { useState, useEffect } from 'react';
import { getListEmoji } from './ListCard';
import PlayDropdown from './PlayDropdown';

export default function ListPreviewModal({ 
  list, 
  onClose, 
  onPlay, 
  onPlaySurvival,
  isEditable = false, 
  onUpdateWords,
  onRenameList,
  onTogglePublic
}) {
  const [searchWord, setSearchWord] = useState('');
  const [words, setWords] = useState(list?.words || []);
  const [editingWordIdx, setEditingWordIdx] = useState(null);
  const [newWordDraft, setNewWordDraft] = useState({ question: '', answer: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(list?.title || list?.name || 'Liste de vocabulaire');
  const [isPublicState, setIsPublicState] = useState(Boolean(list?.isPublic));

  useEffect(() => {
    setWords(list?.words || []);
    setCurrentTitle(list?.title || list?.name || 'Liste de vocabulaire');
    setIsPublicState(Boolean(list?.isPublic));
  }, [list]);

  if (!list) return null;

  const emoji = getListEmoji(currentTitle, list.emoji);

  const handleSaveTitleSubmit = (e) => {
    e?.preventDefault();
    if (!currentTitle.trim()) return;
    setIsEditingTitle(false);
    if (onRenameList) {
      onRenameList(currentTitle.trim());
    }
  };

  const handleTogglePublicClick = () => {
    const nextStatus = !isPublicState;
    setIsPublicState(nextStatus);
    if (onTogglePublic) {
      onTogglePublic(nextStatus);
    }
  };

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', borderBottom: '1px solid rgba(239, 68, 68, 0.2)', paddingBottom: '0.8rem', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '2rem', flexShrink: 0 }}>{emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditingTitle ? (
                <form onSubmit={handleSaveTitleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                  <input
                    type="text"
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.3rem 0.6rem', fontSize: '1.05rem', fontWeight: 800, borderRadius: '8px' }}
                    autoFocus
                  />
                  <button
                    type="submit"
                    style={{ background: 'var(--success)', border: 'none', borderRadius: '6px', color: '#fff', padding: '0.35rem 0.6rem', cursor: 'pointer', fontWeight: 800, fontSize: '0.85rem' }}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentTitle(list?.title || list?.name || '');
                      setIsEditingTitle(false);
                    }}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px', color: '#cbd5e1', padding: '0.35rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    ✕
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.22rem', color: '#ffffff', fontWeight: 800, wordBreak: 'break-word' }}>
                    {currentTitle}
                  </h3>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => setIsEditingTitle(true)}
                      title="Renommer la liste"
                      style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        borderRadius: '6px',
                        padding: '0.2rem 0.35rem',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: '#a5b4fc',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}

              {/* Creator info with Google photo / Avatar + words count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                {list.creatorPhoto ? (
                  <img
                    src={list.creatorPhoto}
                    alt={list.creatorName || 'Créateur'}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '1.5px solid var(--primary)'
                    }}
                  />
                ) : list.creatorAvatar ? (
                  <span style={{ fontSize: '0.9rem' }}>{list.creatorAvatar}</span>
                ) : null}

                <span style={{ fontSize: '0.82rem', color: '#fca5a5', fontWeight: 600 }}>
                  {words.length} {words.length > 1 ? 'mots' : 'mot'} au total
                  {list.creatorName && ` • Par ${list.creatorName}`}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Actions: Public/Private World Toggle + Close button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            {isEditable ? (
              <button
                type="button"
                onClick={handleTogglePublicClick}
                title={isPublicState ? "Liste Publique — Cliquer pour rendre Privée" : "Liste Privée — Cliquer pour rendre Publique"}
                style={{
                  background: isPublicState ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                  border: `1.5px solid ${isPublicState ? 'rgba(234, 179, 8, 0.5)' : 'rgba(255, 255, 255, 0.2)'}`,
                  borderRadius: '10px',
                  padding: '0.35rem 0.6rem',
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: isPublicState ? '#facc15' : 'var(--text-muted)',
                  fontWeight: 800,
                  transition: 'all 0.18s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = isPublicState ? '#facc15' : 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.borderColor = isPublicState ? 'rgba(234, 179, 8, 0.5)' : 'rgba(255, 255, 255, 0.2)';
                }}
              >
                <span>{isPublicState ? '🌍' : '🔒'}</span>
                <span>{isPublicState ? 'Public' : 'Privé'}</span>
              </button>
            ) : (
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.4)',
                  borderRadius: '10px',
                  padding: '0.3rem 0.55rem',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  color: '#facc15',
                  fontWeight: 700
                }}
              >
                <span>🌍</span>
                <span>Public</span>
              </div>
            )}

            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.6rem', cursor: 'pointer', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
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

        {/* Words List with Numbers on the LEFT before words */}
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
                    gap: '0.85rem',
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
                      {/* Left section: Index badge FIRST, followed by German and French translations */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: '#f87171',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '8px',
                          whiteSpace: 'nowrap',
                          minWidth: '34px',
                          textAlign: 'center',
                          flexShrink: 0
                        }}>
                          #{idx + 1}
                        </span>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fca5a5', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>🇩🇪</span>
                            <span>{w.answer || '—'}</span>
                          </div>
                          <div style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '0.25rem', wordBreak: 'break-word', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span>🇫🇷</span>
                            <span>{w.question || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right section: Action buttons if editable */}
                      {isEditable && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
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
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions with PlayDropdown */}
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ flex: 1, padding: '0.75rem', fontSize: '0.9rem' }}
          >
            Fermer
          </button>
          {onPlay && (
            <div style={{ flex: 2 }}>
              <PlayDropdown
                onPlay={() => {
                  onClose();
                  onPlay(words);
                }}
                onPlaySurvival={onPlaySurvival ? () => {
                  onClose();
                  onPlaySurvival(words, title);
                } : null}
                label="⚔️ JOUER CETTE LISTE"
              />
            </div>
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
