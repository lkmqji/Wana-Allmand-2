import React, { useState } from 'react';
import PlayDropdown from './PlayDropdown';

// Helper to determine or auto-suggest a 40px Emoji based on list title
export function getListEmoji(title = '', explicitEmoji = null) {
  if (explicitEmoji) return explicitEmoji;
  const t = (title || '').toLowerCase();
  if (t.includes('essen') || t.includes('nourriture') || t.includes('repas') || t.includes('fruit') || t.includes('boisson')) return '🍕';
  if (t.includes('haus') || t.includes('maison') || t.includes('wohnen') || t.includes('meuble')) return '🏠';
  if (t.includes('tier') || t.includes('animal') || t.includes('chien') || t.includes('chat')) return '🐾';
  if (t.includes('reis') || t.includes('voyage') || t.includes('urlaub') || t.includes('vacance') || t.includes('vol')) return '✈️';
  if (t.includes('arbeit') || t.includes('travail') || t.includes('job') || t.includes('beruf') || t.includes('bureau')) return '💼';
  if (t.includes('verb') || t.includes('action') || t.includes('gramm') || t.includes('conjug')) return '⚡';
  if (t.includes('schule') || t.includes('ecole') || t.includes('cours') || t.includes('uni') || t.includes('etude')) return '🎓';
  if (t.includes('zeit') || t.includes('temps') || t.includes('heure') || t.includes('date')) return '⏳';
  if (t.includes('natur') || t.includes('nature') || t.includes('wetter') || t.includes('meteo') || t.includes('arbre')) return '🌿';
  if (t.includes('stadt') || t.includes('ville') || t.includes('rue') || t.includes('transport') || t.includes('auto')) return '🚗';
  if (t.includes('tech') || t.includes('informatique') || t.includes('ordinateur') || t.includes('cyber')) return '💻';
  if (t.includes('ia') || t.includes('pdf') || t.includes('extract')) return '📄';
  return '🇩🇪';
}

export default function ListCard({
  list,
  isSelected,
  onToggleSelect,
  onPlay,
  onPlaySurvival,
  onPreview,
  onTogglePublic,
  onRename,
  onDelete,
  onSelectCreator
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const listTitle = list?.name || list?.title || 'Sans titre';
  const [tempTitle, setTempTitle] = useState(listTitle);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const emoji = getListEmoji(listTitle, list.emoji);
  const wordCount = Array.isArray(list.words) ? list.words.length : (typeof list.count === 'number' ? list.count : 0);
  const dateFormatted = list.createdAt ? new Date(list.createdAt).toLocaleDateString() : (list.subtitle || 'Récemment');

  const handleCardClick = (e) => {
    // Open preview modal when clicking anywhere on the card
    if (onPreview) {
      onPreview();
    }
  };

  const handleSaveTitle = (e) => {
    e?.stopPropagation();
    if (tempTitle.trim() && tempTitle.trim() !== listTitle) {
      if (onRename) {
        onRename(list, tempTitle.trim());
      }
    }
    setIsEditingTitle(false);
  };

  return (
    <>
      <div
        className={`list-card ${isSelected ? 'selected' : ''}`}
        onClick={handleCardClick}
        style={{
          cursor: 'pointer',
          transition: 'all 0.22s ease',
          position: 'relative',
          zIndex: isDropdownOpen ? 200 : 1,
          borderLeftColor: (list.isPublic && !onTogglePublic) ? 'var(--warning, #eab308)' : undefined
        }}
        title="Cliquer pour voir les mots de la liste"
      >
        {/* Header: 40px Emoji/Avatar + Title with Pen Edit + Trash Delete + Selection Checkbox */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
            {/* 40px Theme Emoji or Creator Avatar/Photo */}
            {list.creatorPhoto ? (
              <img
                src={list.creatorPhoto}
                alt={list.creatorName || 'Créateur'}
                style={{
                  width: '40px',
                  height: '40px',
                  minWidth: '40px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '2px solid var(--warning, #eab308)',
                  boxShadow: '0 0 10px rgba(234, 179, 8, 0.3)',
                  flexShrink: 0
                }}
              />
            ) : list.creatorAvatar && list.creatorName ? (
              <div
                className="list-card-emoji"
                style={{
                  background: 'rgba(234, 179, 8, 0.15)',
                  border: '2px solid var(--warning, #eab308)',
                  fontSize: '1.25rem'
                }}
              >
                {list.creatorAvatar}
              </div>
            ) : (
              <div className="list-card-emoji">
                {emoji}
              </div>
            )}
            
            <div style={{ flex: 1, minWidth: 0 }}>
              {isEditingTitle ? (
                <form
                  onSubmit={handleSaveTitle}
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}
                >
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="input-field"
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      width: '100%'
                    }}
                    autoFocus
                    onBlur={handleSaveTitle}
                  />
                  <button
                    type="submit"
                    style={{
                      background: 'var(--success)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      padding: '0.3rem 0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontWeight: 800
                    }}
                  >
                    ✓
                  </button>
                </form>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <h4
                    style={{ 
                      margin: 0, 
                      fontSize: '1.05rem', 
                      fontWeight: 800,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: 'var(--text-main)'
                    }}
                    title={listTitle}
                  >
                    {listTitle}
                  </h4>

                  {/* Small Pen Edit Icon to Rename list */}
                  {onRename && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempTitle(listTitle);
                        setIsEditingTitle(true);
                      }}
                      title="Renommer cette liste"
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.35)',
                        borderRadius: '6px',
                        padding: '0.2rem 0.35rem',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        color: '#a5b4fc',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
                        e.currentTarget.style.borderColor = 'var(--primary)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      ✏️
                    </button>
                  )}

                  {/* Small Trash Can Icon to Delete list */}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      title="Supprimer cette liste"
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        borderRadius: '6px',
                        padding: '0.2rem 0.35rem',
                        cursor: 'pointer',
                        fontSize: '0.72rem',
                        color: '#f87171',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.borderColor = '#ef4444';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.35)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      🗑️
                    </button>
                  )}
                </div>
              )}

              {list.creatorName ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span 
                    onClick={(e) => {
                      if (onSelectCreator) {
                        e.stopPropagation();
                        onSelectCreator({
                          firebaseId: list.creatorFirebaseId || null,
                          name: list.creatorName || 'Membre'
                        });
                      }
                    }}
                    style={{ 
                      fontSize: '0.82rem', 
                      color: '#facc15', 
                      fontWeight: 700, 
                      cursor: onSelectCreator ? 'pointer' : 'default', 
                      textDecoration: onSelectCreator ? 'underline' : 'none' 
                    }}
                    title={onSelectCreator ? "Voir le profil du créateur" : undefined}
                  >
                    Par {list.creatorName}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>•</span>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {wordCount} {wordCount > 1 ? 'mots' : 'mot'}
                  </span>
                </div>
              ) : (list.isDefault || list.isOfficial) ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--primary, #6366f1)', fontWeight: 700 }}>
                    👑 Wana Officiel
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>•</span>
                  <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {list.subtitle || `${wordCount} ${wordCount > 1 ? 'mots' : 'mot'}`}
                  </span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                    {wordCount} {wordCount > 1 ? 'mots' : 'mot'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>•</span>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                    {dateFormatted}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Checkbox for merging/selecting */}
          {onToggleSelect && (
            <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={Boolean(isSelected)}
                onChange={onToggleSelect}
                onClick={(e) => e.stopPropagation()}
                aria-label="Sélectionner la liste"
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  cursor: 'pointer',
                  accentColor: 'var(--primary)',
                  marginTop: '2px'
                }}
              />
            </div>
          )}
        </div>

        {/* Action Row: [ 1/5 Icon-Only Public/Privé/Official ] + [ 4/5 Voir la liste ] */}
        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', width: '100%' }} onClick={(e) => e.stopPropagation()}>
          {onTogglePublic ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePublic();
              }}
              title={list.isPublic ? "Liste Publique (partagée) — Cliquer pour rendre Privée" : "Liste Privée — Cliquer pour rendre Publique"}
              className="btn btn-secondary"
              style={{
                flex: '0 0 46px',
                width: '46px',
                padding: '0.55rem 0',
                fontSize: '1.1rem',
                borderRadius: '10px',
                borderColor: list.isPublic ? 'rgba(234, 179, 8, 0.5)' : 'rgba(255, 255, 255, 0.15)',
                color: list.isPublic ? '#facc15' : 'var(--text-muted)',
                background: list.isPublic ? 'rgba(234, 179, 8, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.borderColor = list.isPublic ? '#facc15' : 'var(--primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = list.isPublic ? 'rgba(234, 179, 8, 0.5)' : 'rgba(255, 255, 255, 0.15)';
              }}
            >
              <span>{list.isPublic ? '🌍' : '🔒'}</span>
            </button>
          ) : list.isPublic ? (
            <div
              title="Liste Publique (Communauté)"
              className="btn btn-secondary"
              style={{
                flex: '0 0 46px',
                width: '46px',
                padding: '0.55rem 0',
                fontSize: '1.1rem',
                borderRadius: '10px',
                borderColor: 'rgba(234, 179, 8, 0.5)',
                color: '#facc15',
                background: 'rgba(234, 179, 8, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default'
              }}
            >
              <span>🌍</span>
            </div>
          ) : (list.isDefault || list.isOfficial) ? (
            <div
              title="Liste Thématique Officielle"
              className="btn btn-secondary"
              style={{
                flex: '0 0 46px',
                width: '46px',
                padding: '0.55rem 0',
                fontSize: '1.1rem',
                borderRadius: '10px',
                borderColor: 'rgba(99, 102, 241, 0.4)',
                color: '#a5b4fc',
                background: 'rgba(99, 102, 241, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'default'
              }}
            >
              <span>👑</span>
            </div>
          ) : null}

          {onPreview && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="btn btn-secondary"
              style={{ 
                flex: 1, 
                padding: '0.55rem 0.8rem', 
                fontSize: '0.86rem', 
                fontWeight: 700,
                borderRadius: '10px',
                borderColor: 'rgba(99, 102, 241, 0.4)',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                transition: 'all 0.2s ease'
              }}
              title="Visualiser et gérer les mots de la liste"
            >
              <span>👁️</span> Voir la liste
            </button>
          )}
        </div>

        {/* Primary Action Button: Dropdown for game modes (Classique / Survie) */}
        <div style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
          <PlayDropdown
            onPlay={onPlay}
            onPlaySurvival={onPlaySurvival}
            onOpenChange={setIsDropdownOpen}
            label="⚔️ JOUER"
          />
        </div>
      </div>

      {/* Confirmation Modal Popup for Deleting List */}
      {showDeleteConfirm && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirm(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '430px',
              width: '100%',
              background: 'linear-gradient(145deg, #1b0d10 0%, #0d0608 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '22px',
              padding: '1.8rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 35px rgba(239, 68, 68, 0.25)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              animation: 'popIn 0.2s ease-out'
            }}
          >
            {/* Warning Trash Icon Badge */}
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '2px solid rgba(239, 68, 68, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)'
              }}
            >
              🗑️
            </div>

            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#ffffff', fontSize: '1.25rem', fontWeight: 800 }}>
                Supprimer la liste ?
              </h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.45' }}>
                Êtes-vous sûr de vouloir supprimer définitivement la liste <strong style={{ color: '#ffffff' }}>« {listTitle} »</strong> ({wordCount} {wordCount > 1 ? 'mots' : 'mot'}) ?
              </p>
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 0.8rem',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#fca5a5',
                  fontSize: '0.82rem',
                  fontWeight: 600
                }}
              >
                ⚠️ Cette action est irréversible.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.8rem', width: '100%', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteConfirm(false);
                }}
                className="btn btn-secondary"
                style={{
                  flex: 1,
                  padding: '0.7rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsDeleting(true);
                  try {
                    if (onDelete) {
                      await onDelete(list);
                    }
                  } finally {
                    setIsDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.7rem 1rem',
                  borderRadius: '12px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: '#ffffff',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {isDeleting ? 'Suppression...' : '🗑️ Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
