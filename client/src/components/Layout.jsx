import React from 'react';
import { formatPlayerName } from '../utils/formatters';

export default function Layout({ 
  children, 
  activeTab, 
  onNavigate, 
  user, 
  loginWithGoogle, 
  theme, 
  toggleTheme,
  rightPanelContent,
  isAdmin,
  onOpenAdmin,
  unreadCount = 0,
  onOpenNotifications,
  onOpenShop,
  onOpenAITutor,
  onOpenScheduler,
  onOpenTour
}) {
  const navItems = [
    { id: 'learn', label: 'Accueil', icon: '🏠' },
    { id: 'medical', label: 'Allemand Médical', icon: '🩺' },
    { id: 'reader', label: 'Lecture IA', icon: '📖' },
    { id: 'vault', label: 'Coffre Fautes', icon: '🎯' },
    { id: 'lists', label: 'Mes Listes', icon: '📂' },
    { id: 'community', label: 'Communauté', icon: '🌍' },
    { id: 'stats', label: 'Classement', icon: '🏆' },
    { id: 'profile', label: 'Profil', icon: '👤' }
  ];

  return (
    <div className="app-container">
      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <h2 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 800, color: 'var(--primary)' }}>
          WANA ALLMAND
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* AI Tutor Button */}
          <button 
            onClick={onOpenAITutor} 
            title="Assistant IA Wana Tutor"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            🤖
          </button>

          {/* Shop Button */}
          <button 
            onClick={onOpenShop} 
            title="Boutique & Personnalisation"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            🎨
          </button>

          {/* Match Scheduler Button */}
          <button 
            onClick={onOpenScheduler} 
            title="Planifier un match"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            📅
          </button>

          {/* Notifications Button Mobile */}
          <button
            onClick={onOpenNotifications}
            style={{ position: 'relative', background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem' }}
            title="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '-2px', right: '-4px',
                background: 'var(--danger)', color: 'white', fontSize: '0.65rem',
                fontWeight: 'bold', borderRadius: '10px', padding: '0.1rem 0.35rem',
                minWidth: '16px', textAlign: 'center', lineHeight: '1'
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={toggleTheme} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          
          {user ? (
            <img 
              src={user.photoURL} 
              alt="Profil" 
              onClick={() => onNavigate('profile')} 
              style={{ width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--border-color)' }} 
            />
          ) : (
            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '8px' }}>Connexion</button>
          )}
        </div>
      </div>

      {/* DESKTOP SIDEBAR */}
      <div className="sidebar">
        <div style={{ padding: '1rem', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', margin: 0, letterSpacing: '-0.5px' }}>WANA ALLMAND</h1>
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

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          {/* AI Tutor Desktop */}
          <button
            onClick={onOpenAITutor}
            className="nav-item"
            style={{ width: '100%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', justifyContent: 'flex-start', color: '#818cf8' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🤖</span>
            Wana Tutor IA
          </button>

          {/* Shop Desktop */}
          <button
            onClick={onOpenShop}
            className="nav-item"
            style={{ width: '100%', background: 'transparent', border: 'none', justifyContent: 'flex-start' }}
          >
            <span style={{ fontSize: '1.2rem' }}>🎨</span>
            Boutique & Skins
          </button>

          {/* Match Scheduler Desktop */}
          <button
            onClick={onOpenScheduler}
            className="nav-item"
            style={{ width: '100%', background: 'transparent', border: 'none', justifyContent: 'flex-start' }}
          >
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            Planning Duels
          </button>

          {/* Tour Guide Desktop */}
          <button
            onClick={onOpenTour}
            className="nav-item"
            style={{ width: '100%', background: 'transparent', border: 'none', justifyContent: 'flex-start' }}
          >
            <span style={{ fontSize: '1.2rem' }}>❓</span>
            Guide & Tutoriel
          </button>

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

          {isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="nav-item"
              style={{ width: '100%', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', justifyContent: 'flex-start', color: '#a78bfa' }}
            >
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              Admin
            </button>
          )}

          <button 
            onClick={toggleTheme} 
            className="nav-item" 
            style={{ width: '100%', background: 'transparent', border: 'none', justifyContent: 'flex-start' }}
          >
            <span style={{ fontSize: '1.2rem' }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
            Thème
          </button>
          
          {user ? (
            <div 
              className="nav-item" 
              onClick={() => onNavigate('profile')} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', cursor: 'pointer' }}
            >
              <img 
                src={user.photoURL} 
                alt="Profil" 
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--border-color)' }} 
              />
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatPlayerName(user.displayName)}
              </span>
            </div>
          ) : (
            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.8rem' }}>Connexion</button>
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
