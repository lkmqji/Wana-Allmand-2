import React from 'react';

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
  onOpenAdmin
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
      {/* MOBILE HEADER */}
      <div className="mobile-header">
        <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 800, color: 'var(--primary)' }}>
          WANA ALLMAND
        </h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button 
            onClick={toggleTheme} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {isAdmin && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              title="Panneau Admin"
              style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              🛡️
            </button>
          )}
          {user ? (
            <img 
              src={user.photoURL} 
              alt="Profil" 
              onClick={() => onNavigate('profile')} 
              style={{ width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', border: '2px solid var(--border-color)' }} 
            />
          ) : (
            <button onClick={loginWithGoogle} className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', borderRadius: '8px' }}>Connexion</button>
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
                {user.displayName}
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
