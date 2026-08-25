import React, { useState, useRef, useEffect } from 'react';
import { formatPlayerName } from '../utils/formatters';
import { useSoundEffects } from '../context/AudioContext';

export default function Layout({ 
  children, 
  activeTab, 
  onNavigate, 
  user, 
  playerName, 
  avatar, 
  loginWithGoogle, 
  logout, 
  theme, 
  toggleTheme, 
  setTheme,
  rightPanelContent, 
  isAdmin, 
  onOpenAdmin, 
  unreadCount = 0, 
  onOpenNotifications 
}) {
  const { isMusicMuted, toggleMusicMute } = useSoundEffects();
  const [isQuickSettingsOpen, setIsQuickSettingsOpen] = useState(false);
  const quickSettingsRef = useRef(null);

  const navItems = [
    { id: 'learn', label: 'Apprendre', icon: '🏠' },
    { id: 'lists', label: 'Mes Listes', icon: '📂' },
    { id: 'community', label: 'Communauté', icon: '🌍' },
    { id: 'stats', label: 'Classement', icon: '🏆' },
    { id: 'profile', label: 'Profil', icon: '👤' }
  ];

  // Close Quick Settings Popover on outside click
  useEffect(() => {
    if (!isQuickSettingsOpen) return;
    const handleClickOutside = (e) => {
      if (quickSettingsRef.current && !quickSettingsRef.current.contains(e.target)) {
        setIsQuickSettingsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isQuickSettingsOpen]);

  // Touch Swipe Navigation for Portrait / Mobile
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now()
    };
  };

  const handleTouchEnd = (e) => {
    if (!e.changedTouches || e.changedTouches.length !== 1) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;

    // Minimum swipe threshold 60px, mostly horizontal and reasonably fast (< 600ms)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && deltaTime < 600) {
      const tabOrder = ['learn', 'lists', 'community', 'stats', 'profile'];
      const currentIndex = tabOrder.indexOf(activeTab);
      if (currentIndex !== -1) {
        if (deltaX < -60 && currentIndex < tabOrder.length - 1) {
          // Swipe Left -> Next Tab
          onNavigate(tabOrder[currentIndex + 1]);
        } else if (deltaX > 60 && currentIndex > 0) {
          // Swipe Right -> Prev Tab
          onNavigate(tabOrder[currentIndex - 1]);
        }
      }
    }
  };

  return (
    <div className="app-container">
      {/* MOBILE HEADER - Clean: Logo on left, [Bell + Avatar] on right */}
      <div className="mobile-header">
        <h2 
          className="brand-logo-shine" 
          onClick={() => onNavigate('learn')}
          style={{ fontSize: '1.25rem', margin: 0, cursor: 'pointer' }}
        >
          WANA ALLMAND
        </h2>
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', position: 'relative' }}>
          {/* Notifications Button Mobile */}
          <button
            onClick={onOpenNotifications}
            style={{ position: 'relative', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.25rem', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-3px', right: '-5px',
                background: 'var(--danger)', color: 'white', fontSize: '0.65rem',
                fontWeight: 'bold', borderRadius: '10px', padding: '0.1rem 0.35rem',
                minWidth: '16px', textAlign: 'center', lineHeight: '1'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Profile Avatar Mobile with Quick Settings Trigger */}
          {user ? (
            <div style={{ position: 'relative' }} ref={quickSettingsRef}>
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profil" 
                  onClick={() => setIsQuickSettingsOpen(prev => !prev)} 
                  style={{ width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--primary)', objectFit: 'cover' }} 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  onClick={() => setIsQuickSettingsOpen(prev => !prev)} 
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: '2px solid var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    background: 'var(--bg-surface)'
                  }}
                >
                  {avatar || '🦊'}
                </div>
              )}

              {/* FLOATING QUICK SETTINGS POPOVER */}
              {isQuickSettingsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0,
                    width: '260px',
                    background: 'var(--bg-surface)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '0.85rem',
                    boxShadow: '0 16px 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(99, 102, 241, 0.25)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                    animation: 'dropdownFadeIn 0.18s ease-out'
                  }}
                >
                  {/* User Summary Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{avatar || '🦊'}</span>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {formatPlayerName(playerName || user.displayName || 'Joueur')}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 700 }}>
                        ⭐ Paramètres rapides
                      </div>
                    </div>
                  </div>

                  {/* Quick Controls List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {/* BGM Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleMusicMute?.()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isMusicMuted ? 'rgba(239, 68, 68, 0.12)' : 'rgba(34, 197, 94, 0.12)',
                        border: `1px solid ${isMusicMuted ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                        borderRadius: '10px',
                        padding: '0.45rem 0.65rem',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {isMusicMuted ? '🔇' : '🎵'} Musique de fond
                      </span>
                      <span style={{ fontSize: '0.72rem', color: isMusicMuted ? '#f87171' : '#4ade80' }}>
                        {isMusicMuted ? 'Muet' : 'Activée'}
                      </span>
                    </button>

                    {/* Theme Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (toggleTheme) toggleTheme();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255, 255, 255, 0.04)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '0.45rem 0.65rem',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🎨 Changer de thème
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {theme || 'Sombre'}
                      </span>
                    </button>

                    {/* Link: Mon Profil */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickSettingsOpen(false);
                        onNavigate('profile');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '10px',
                        padding: '0.45rem 0.65rem',
                        color: 'var(--primary)',
                        fontSize: '0.82rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span>👤</span> Mon Profil Complet
                    </button>

                    {/* Link: Déconnexion */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickSettingsOpen(false);
                        if (logout) logout();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'transparent',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '10px',
                        padding: '0.45rem 0.65rem',
                        color: '#f87171',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginTop: '0.2rem'
                      }}
                    >
                      <span>🚪</span> Se déconnecter
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '10px' }}>Connexion</button>
          )}
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <div className="sidebar">
        <div style={{ padding: '1rem 0.5rem', marginBottom: '1rem', cursor: 'pointer' }} onClick={() => onNavigate('learn')}>
          <h1 className="brand-logo-shine" style={{ fontSize: '1.45rem', margin: 0 }}>
            WANA ALLMAND
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
          {navItems.map(item => (
            <div 
              key={item.id} 
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Notifications Button Desktop */}
          <button
            onClick={onOpenNotifications}
            className="nav-item"
            style={{ width: '100%', background: unreadCount > 0 ? 'rgba(99,102,241,0.15)' : 'transparent', border: 'none', justifyContent: 'flex-start', position: 'relative' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            <span style={{ flex: 1, textAlign: 'left' }}>Notifications</span>
            {unreadCount > 0 && (
              <span style={{
                background: 'var(--danger)', color: 'white', fontSize: '0.75rem',
                fontWeight: 'bold', borderRadius: '10px', padding: '0.15rem 0.5rem'
              }}>
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* User Profile Desktop */}
          {user ? (
            <div 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => onNavigate('profile')} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer', padding: '0.6rem 0.8rem' }}
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profil" 
                  style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--primary)', objectFit: 'cover' }} 
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span style={{ fontSize: '1.8rem', lineHeight: '1' }}>{avatar || '🦊'}</span>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatPlayerName(playerName || user.displayName || 'Joueur')}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mon Profil</span>
              </div>
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.8rem', borderRadius: '12px' }}>Connexion</button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA WITH TOUCH SWIPE LISTENER */}
      <div className="main-area">
        <div 
          className="main-content"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {children}
        </div>
      </div>

      {/* DESKTOP RIGHT PANEL */}
      <div className="right-panel">
        {rightPanelContent}
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div className="bottom-nav">
        {navItems.map(item => (
          <div 
            key={item.id} 
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            style={{ color: activeTab === item.id ? 'var(--primary)' : 'var(--text-muted)' }}
          >
            <span style={{ fontSize: '1.5rem', marginBottom: '2px' }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

