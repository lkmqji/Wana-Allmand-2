import React from 'react';
import { formatPlayerName } from '../utils/formatters';

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
  rightPanelContent,
  isAdmin,
  onOpenAdmin,
  unreadCount = 0,
  onOpenNotifications
}) {
  const navItems = [
    { id: 'learn', label: 'Apprendre', icon: '🏠' },
    { id: 'lists', label: 'Mes Listes', icon: '📂' },
    { id: 'community', label: 'Communauté', icon: '🌍' },
    { id: 'stats', label: 'Classement', icon: '🏆' },
    { id: 'profile', label: 'Profil', icon: '👤' }
  ];

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
        <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
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

          {/* Profile Avatar Mobile */}
          {user ? (
            user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Profil" 
                onClick={() => onNavigate('profile')} 
                style={{ width: '34px', height: '34px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--primary)', objectFit: 'cover' }} 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div 
                onClick={() => onNavigate('profile')} 
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
            )
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

      {/* MAIN CONTENT AREA */}
      <div className="main-area">
        <div className="main-content">
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
