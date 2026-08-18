import React from 'react';
import { formatPlayerName } from '../utils/formatters';

export default function RightPanel({
  view,
  activeTab,
  leaderboard,
  user,
  playerName,
  avatar,
  onQuickSolo
}) {
  if (view === 'lobby') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Combat en Direct 🥊</h3>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), var(--bg-surface))' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>⚡ Règles du Duel</h4>
          <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
            <li>Tape la bonne réponse en allemand aussi vite que possible.</li>
            <li>Majuscules et accents pris en compte.</li>
            <li>Le plus rapide marque le maximum de points !</li>
          </ul>
        </div>
      </div>
    );
  }

  // Context 1: ROUTE CLASSEMENT (activeTab === 'stats') -> "Ta Carte Joueur"
  if (activeTab === 'stats') {
    const userRankIndex = leaderboard.findIndex(p => 
      (user?.uid && p.firebaseId === user.uid) || 
      (playerName && p.name && p.name.toLowerCase().includes(playerName.toLowerCase()))
    );
    const userRank = userRankIndex >= 0 ? userRankIndex + 1 : '—';
    const userXP = userRankIndex >= 0 ? (leaderboard[userRankIndex].xp || 0) : (user ? 120 : 0);
    const currentLevel = Math.max(1, Math.floor(userXP / 100) + 1);
    const xpInCurrentLevel = userXP % 100;
    const xpNeededNext = 100 - xpInCurrentLevel;
    const progressPercent = Math.min(100, Math.max(5, (xpInCurrentLevel / 100) * 100));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Ta Carte Joueur 🏆</h3>

        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99, 102, 241, 0.12) 100%)',
          border: '2px solid var(--primary)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {/* Player Header with Avatar & Rank */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              background: 'var(--bg-main)',
              border: '2px solid var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              flexShrink: 0
            }}>
              {avatar || '🦊'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatPlayerName(playerName || user?.displayName || 'Joueur')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
                <span style={{
                  background: userRank === 1 ? '#f59e0b' : 'var(--primary)',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '6px'
                }}>
                  RANG #{userRank}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {userXP} pts
                </span>
              </div>
            </div>
          </div>

          {/* Level & XP Progress Bar */}
          <div style={{ background: 'var(--bg-main)', padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)' }}>
                Niveau {currentLevel}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {xpInCurrentLevel} / 100 XP
              </span>
            </div>
            
            {/* Progress track */}
            <div style={{
              width: '100%',
              height: '10px',
              background: 'var(--bg-surface)',
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                width: `${progressPercent}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
                borderRadius: '6px',
                transition: 'width 0.4s ease'
              }} />
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right', marginTop: '0.35rem' }}>
              Plus que <strong style={{ color: 'var(--text-main)' }}>{xpNeededNext} XP</strong> pour le Niveau {currentLevel + 1} !
            </div>
          </div>

          {/* Call to action */}
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4', background: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '8px' }}>
            💡 Chaque victoire en duel vous rapporte <strong style={{ color: 'var(--primary)' }}>+20 XP</strong> et vous fait progresser dans le classement !
          </div>
        </div>
      </div>
    );
  }

  // Context 2: ROUTE APPRENDRE (activeTab === 'learn' / home) -> "Prêt pour le duel ?"
  if (activeTab === 'learn') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Arène Rapide ⚡</h3>

        <div className="card" style={{
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(99, 102, 241, 0.15) 100%)',
          border: '2px solid var(--primary)',
          padding: '1.3rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
          boxShadow: '0 8px 25px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.6rem' }}>⚔️</span>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                Prêt pour le duel ?
              </h4>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                SESSION INSTANTANÉE
              </span>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Teste tes réflexes et perfectionne ton vocabulaire avec une série de 10 mots choisis au hasard.
          </p>

          <button
            onClick={onQuickSolo}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.95rem',
              fontWeight: 900,
              borderRadius: '12px',
              letterSpacing: '0.5px'
            }}
          >
            ⚡ DUEL RAPIDE SOLO
          </button>
        </div>

        {/* Daily tip card */}
        <div className="card" style={{ padding: '1rem', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.4rem' }}>
            <span>💡</span>
            <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--warning)' }}>Astuce du jour</h4>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Les noms terminés par <strong>-ung</strong>, <strong>-heit</strong>, <strong>-keit</strong>, <strong>-schaft</strong> sont systématiquement du genre féminin (<strong>die</strong>) !
          </p>
        </div>
      </div>
    );
  }

  // Default right panel fallback for lists/community/profile
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Classement Mondial 🏆</h3>
      {(!Array.isArray(leaderboard) || leaderboard.length === 0) ? (
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>Chargement du classement...</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {leaderboard.slice(0, 5).map((player, idx) => (
            <div key={player._id || idx} className="card" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 0.8rem', background: idx === 0 ? 'rgba(251, 191, 36, 0.1)' : 'var(--bg-surface)' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: idx === 0 ? '#f59e0b' : 'var(--text-muted)', minWidth: '24px' }}>#{idx + 1}</span>
              <span style={{ flex: 1, fontWeight: 'bold', fontSize: '0.88rem' }}>{formatPlayerName(player.name)}</span>
              <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>{player.xp || 0} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
