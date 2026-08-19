import React from 'react';

// Helper to determine or auto-suggest an Emoji based on list title
export function getListEmoji(title = '', explicitEmoji = null) {
  if (explicitEmoji) return explicitEmoji;
  const t = title.toLowerCase();
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
  onEdit,
  onTogglePublic,
  onDelete
}) {
  const emoji = getListEmoji(list.name, list.emoji);
  const wordCount = list.words?.length || 0;
  const dateFormatted = list.createdAt ? new Date(list.createdAt).toLocaleDateString() : 'Récemment';

  return (
    <div className={`list-card ${isSelected ? 'selected' : ''}`}>
      {/* Header: Emoji + Title + Selection Checkbox */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
          <div className="list-card-emoji">
            {emoji}
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ 
              margin: 0, 
              fontSize: '0.98rem', 
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: 'var(--text-main)'
            }}>
              {list.name}
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                {wordCount} {wordCount > 1 ? 'mots' : 'mot'}
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>•</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>
                {dateFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Checkbox for merging/selecting */}
        {onToggleSelect && (
          <input
            type="checkbox"
            checked={Boolean(isSelected)}
            onChange={onToggleSelect}
            aria-label="Sélectionner la liste"
            style={{ 
              width: '18px', 
              height: '18px', 
              cursor: 'pointer',
              accentColor: 'var(--accent-primary)',
              marginTop: '4px'
            }}
          />
        )}
      </div>

      {/* Secondary Controls Bar (Edit, Privacy Status, Delete) */}
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        {onEdit && (
          <button
            onClick={onEdit}
            className="btn btn-secondary"
            style={{ 
              flex: 1, 
              minHeight: '34px',
              padding: '0.35rem 0.5rem', 
              fontSize: '0.78rem', 
              fontWeight: 500,
              borderRadius: '6px'
            }}
            title="Modifier le contenu de la liste"
          >
            ✏️ Éditer
          </button>
        )}

        {onTogglePublic && (
          <button
            onClick={onTogglePublic}
            className="btn btn-secondary"
            style={{ 
              flex: 1, 
              minHeight: '34px',
              padding: '0.35rem 0.5rem', 
              fontSize: '0.78rem', 
              fontWeight: 500,
              borderRadius: '6px',
              borderColor: list.isPublic ? 'var(--warning)' : 'var(--border-subtle)',
              color: list.isPublic ? 'var(--warning)' : 'var(--text-secondary)'
            }}
            title={list.isPublic ? 'Rendre privée' : 'Partager avec la communauté'}
          >
            {list.isPublic ? '🌍 Publique' : '🔒 Privée'}
          </button>
        )}

        {onDelete && (
          <button
            onClick={onDelete}
            className="btn btn-secondary"
            style={{ 
              width: 'auto', 
              minHeight: '34px',
              padding: '0.35rem 0.65rem', 
              fontSize: '0.8rem', 
              borderRadius: '6px',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)'
            }}
            title="Supprimer cette liste"
          >
            🗑️
          </button>
        )}
      </div>

      {/* Primary Action Button */}
      <button
        onClick={onPlay}
        className="btn btn-success"
        style={{
          width: '100%',
          minHeight: '40px',
          padding: '0.55rem 1rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem'
        }}
      >
        <span>⚔️</span> JOUER
      </button>
    </div>
  );
}
