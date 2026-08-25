import React, { useState, useEffect } from 'react';
import { formatPlayerName } from '../utils/formatters';

export default function UserProfileModal({
  targetPlayerId, // Can be mongo _id, firebaseId, or name
  targetPlayerFallback = {},
  currentUser,
  onClose
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const identifier = targetPlayerId || targetPlayerFallback.firebaseId || targetPlayerFallback._id || targetPlayerFallback.name;
        if (!identifier) {
          throw new Error('Identifiant de joueur introuvable');
        }

        const currentFirebaseId = currentUser?.uid || null;
        const res = await fetch(`/api/users/profile/${encodeURIComponent(identifier)}${currentFirebaseId ? `?currentFirebaseId=${currentFirebaseId}` : ''}`);
        if (!res.ok) {
          // If not in DB yet, fallback to available client properties
          const fallbackData = {
            _id: targetPlayerFallback._id || null,
            firebaseId: targetPlayerFallback.firebaseId || null,
            name: targetPlayerFallback.name || 'Joueur',
            avatar: targetPlayerFallback.avatar || '🦊',
            photoURL: targetPlayerFallback.photoURL || null,
            xp: targetPlayerFallback.xp || 0,
            level: Math.floor((targetPlayerFallback.xp || 0) / 1000) + 1,
            gamesPlayed: targetPlayerFallback.gamesPlayed || 0,
            gamesWon: targetPlayerFallback.gamesWon || 0,
            winRate: targetPlayerFallback.gamesPlayed > 0 ? Math.round((targetPlayerFallback.gamesWon / targetPlayerFallback.gamesPlayed) * 100) : 0,
            lastSeen: new Date(),
            streak: targetPlayerFallback.streak || 1,
            dailyXpHistory: [
              { dayName: 'Lun', xp: 20 },
              { dayName: 'Mar', xp: 45 },
              { dayName: 'Mer', xp: 60 },
              { dayName: 'Jeu', xp: 35 },
              { dayName: 'Ven', xp: 80 },
              { dayName: 'Sam', xp: 120 },
              { dayName: 'Dim', xp: 95 }
            ],
            followersCount: 0,
            followingCount: 0,
            friendsCount: 0,
            isFollowing: false,
            isFriend: false
          };
          if (isMounted) {
            setProfile(fallbackData);
            setIsFollowing(false);
            setFollowersCount(0);
            setIsFriend(false);
            setFriendsCount(0);
          }
          return;
        }

        const data = await res.json();
        if (isMounted) {
          setProfile(data);
          setIsFollowing(Boolean(data.isFollowing));
          setFollowersCount(data.followersCount || 0);
          setIsFriend(Boolean(data.isFriend));
          setFriendsCount(data.friendsCount || 0);
        }
      } catch (err) {
        console.error('Error fetching player profile:', err);
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [targetPlayerId, targetPlayerFallback, currentUser]);

  const handleToggleFollow = async () => {
    if (!currentUser?.uid || !profile?.firebaseId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.firebaseId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentFirebaseId: currentUser.uid })
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.isFollowing);
        setFollowersCount(data.followersCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleFriend = async () => {
    if (!currentUser?.uid || !profile?.firebaseId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/users/${profile.firebaseId}/friend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentFirebaseId: currentUser.uid })
      });
      const data = await res.json();
      if (data.success) {
        setIsFriend(data.isFriend);
        setFriendsCount(data.friendsCount);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const formatLastSeen = (dateInput) => {
    if (!dateInput) return 'Récemment';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return 'Récemment';
    const now = new Date();
    const diffMin = Math.floor((now - date) / (1000 * 60));
    if (diffMin < 5) return 'En ligne maintenant 🟢';
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const isSelf = currentUser && (currentUser.uid === profile?.firebaseId || currentUser.displayName === profile?.name);
  const maxXp = Math.max(...(profile?.dailyXpHistory || []).map(d => d.xp || 0), 100);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3500,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.4rem',
          borderRadius: '20px',
          border: '1.5px solid rgba(99, 102, 241, 0.45)',
          background: 'linear-gradient(145deg, #180e18 0%, var(--bg-surface) 100%)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(99, 102, 241, 0.2)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.1rem'
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            color: 'var(--text-muted)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
            e.currentTarget.style.color = '#ef4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          ✕
        </button>

        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center' }}>
            <div className="skeleton-avatar skeleton-loading" style={{ width: '70px', height: '70px', margin: '0 auto 1rem auto', borderRadius: '50%' }} />
            <div className="skeleton-text skeleton-loading" style={{ width: '160px', height: '24px', margin: '0 auto 0.5rem auto' }} />
            <div className="skeleton-text skeleton-loading" style={{ width: '100px', height: '18px', margin: '0 auto' }} />
          </div>
        ) : error && !profile ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--danger)' }}>
            <span style={{ fontSize: '2.5rem' }}>⚠️</span>
            <p style={{ marginTop: '0.8rem' }}>Impossible de charger le profil.</p>
          </div>
        ) : (
          <>
            {/* Header: Avatar, Name, Level & Rank */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', paddingRight: '2rem' }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {profile.photoURL ? (
                  <img
                    src={profile.photoURL}
                    alt={profile.name}
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--primary)',
                      boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
                    }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(236, 72, 153, 0.25))',
                      border: '3px solid var(--primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem',
                      boxShadow: '0 0 16px rgba(99, 102, 241, 0.4)'
                    }}
                  >
                    {profile.avatar || '🦊'}
                  </div>
                )}
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    background: 'var(--primary)',
                    color: '#ffffff',
                    fontSize: '0.68rem',
                    fontWeight: 900,
                    padding: '0.15rem 0.45rem',
                    borderRadius: '10px',
                    border: '2px solid var(--bg-surface)',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  Nv.{profile.level || 1}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: 'var(--text-main)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formatPlayerName(profile.name)}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: '#facc15', fontWeight: 800 }}>
                    ⭐ {profile.xp || 0} XP
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>•</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Vu : {formatLastSeen(profile.lastSeen)}
                  </span>
                </div>
              </div>
            </div>

            {/* Social Follow & Friends Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-around',
                background: 'rgba(0, 0, 0, 0.28)',
                borderRadius: '14px',
                padding: '0.65rem 0.8rem',
                border: '1px solid var(--border-color)'
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  {followersCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Abonnés
                </div>
              </div>

              <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main)' }}>
                  {profile.followingCount || 0}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Abonnements
                </div>
              </div>

              <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }} />

              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f59e0b' }}>
                  {friendsCount}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                  Amis
                </div>
              </div>
            </div>

            {/* Interactive Social Buttons (if not self and user logged in) */}
            {!isSelf && currentUser && profile.firebaseId && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  disabled={actionLoading}
                  className={isFollowing ? "btn btn-secondary" : "btn btn-primary"}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    borderRadius: '10px'
                  }}
                >
                  {isFollowing ? '✓ Abonné' : '+ S\'abonner'}
                </button>

                <button
                  type="button"
                  onClick={handleToggleFriend}
                  disabled={actionLoading}
                  className={isFriend ? "btn btn-secondary" : "btn btn-success"}
                  style={{
                    flex: 1,
                    padding: '0.55rem',
                    fontSize: '0.82rem',
                    fontWeight: 800,
                    borderRadius: '10px'
                  }}
                >
                  {isFriend ? '🤝 Ami(e)' : '👋 Ajouter en ami'}
                </button>
              </div>
            )}

            {/* Key Statistics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
              {/* Matchs Joués */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.65rem 0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>⚔️</span>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                    {profile.gamesPlayed || 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Matchs joués</div>
                </div>
              </div>

              {/* Taux de Victoires */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '0.65rem 0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem'
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>🏆</span>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 900, color: '#4ade80' }}>
                    {profile.winRate || 0}%
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{profile.gamesWon || 0} Victoires</div>
                </div>
              </div>

              {/* Séries de jours d'affilée */}
              <div
                style={{
                  gridColumn: 'span 2',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12), rgba(245, 158, 11, 0.12))',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  borderRadius: '12px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>🔥</span>
                  <div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fca5a5' }}>
                      Série de {profile.streak || 1} {profile.streak > 1 ? 'jours consécutifs' : 'jour'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                      Entraînement régulier et assidu
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#f87171' }}>
                  {profile.streak || 1} 🔥
                </span>
              </div>
            </div>

            {/* Daily XP Evolution Chart (Last 7 days) */}
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.32)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)' }}>
                  📊 XP gagné par jour
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>7 derniers jours</span>
              </div>

              {/* Bar Chart Visualizer */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  height: '75px',
                  paddingTop: '0.5rem'
                }}
              >
                {(profile.dailyXpHistory || []).map((item, idx) => {
                  const heightPercent = Math.max(12, Math.round(((item.xp || 0) / maxXp) * 100));
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.25rem',
                        height: '100%',
                        justifyContent: 'flex-end'
                      }}
                      title={`${item.dayName} : +${item.xp || 0} XP`}
                    >
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#a5b4fc' }}>
                        {item.xp > 0 ? item.xp : ''}
                      </span>
                      <div
                        style={{
                          width: '100%',
                          maxWidth: '24px',
                          height: `${heightPercent}%`,
                          background: 'linear-gradient(180deg, var(--primary) 0%, #4338ca 100%)',
                          borderRadius: '6px 6px 2px 2px',
                          transition: 'height 0.3s ease',
                          boxShadow: '0 0 8px rgba(99, 102, 241, 0.3)'
                        }}
                      />
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {item.dayName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
