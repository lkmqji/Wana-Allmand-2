import React, { useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

export default function Profil({
  user,
  isGuest,
  loginWithGoogle,
  avatar,
  setAvatar,
  playerName,
  setPlayerName,
  onSaveProfile,
  theme,
  setTheme,
  autoSaveEnabled,
  toggleAutoSave,
  isAdmin,
  onOpenAdmin,
  onToggleAdmin,
  logout,
  handleDeleteAccount
}) {
  const [subTab, setSubTab] = useState('account'); // 'account', 'themes', 'audio'
  const [nameInput, setNameInput] = useState(playerName || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const isInitialMount = React.useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      setNameInput(playerName || '');
      isInitialMount.current = false;
    }
  }, [playerName]);

  const handleSave = async (customName = nameInput, customAvatar = avatar) => {
    const trimmed = (customName || '').trim();
    if (!trimmed) return;
    setIsSaving(true);
    try {
      if (onSaveProfile) {
        await onSaveProfile(trimmed, customAvatar);
      } else {
        if (setPlayerName) setPlayerName(trimmed);
        if (setAvatar) setAvatar(customAvatar);
        localStorage.setItem('wana_player_name', trimmed);
        localStorage.setItem('wana_avatar', customAvatar);
      }
      playSuccess();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = (newAv) => {
    if (setAvatar) setAvatar(newAv);
    handleSave(nameInput, newAv);
  };

  const {
    isSoundEnabled,
    toggleSound,
    masterVolume,
    setMasterVolume,
    sfxVolume,
    setSfxVolume,
    bgmVolume,
    setBgmVolume,
    resetAudioSettings,
    playClick,
    playSuccess,
    playExplosion,
    playNotification
  } = useAudio();

  const themesList = [
    { id: 'midnight', name: 'Midnight', icon: '🌌', desc: 'Bleu sombre & Violet fluo', primary: '#6366f1', bg: '#0b0f19' },
    { id: 'cyberpink', name: 'Cyber Pink', icon: '💖', desc: 'Violet sombre & Rose néon', primary: '#ff007f', bg: '#120914' },
    { id: 'sakura', name: 'Sakura', icon: '🌸', desc: 'Blanc & Rose poudré doux', primary: '#ec4899', bg: '#fff5f8' },
    { id: 'hacker', name: 'Hacker', icon: '💻', desc: 'Noir pur & Vert Matrix', primary: '#00ff66', bg: '#030704' },
    { id: 'glacier', name: 'Glacier', icon: '❄️', desc: 'Bleu marine & Cyan glacial', primary: '#00f0ff', bg: '#071321' },
    { id: 'bloodduel', name: 'BloodDuel', icon: '⚔️', desc: 'Anthracite & Rouge sang', primary: '#ef4444', bg: '#121113' },
    { id: 'sunset', name: 'Sunset', icon: '🌅', desc: 'Terre brûlée & Orange feu', primary: '#f97316', bg: '#18110e' },
    { id: 'classic', name: 'Classic Light', icon: '☀️', desc: 'Blanc cassé & Bleu pur', primary: '#2563eb', bg: '#f8fafc' },
  ];

  const getVolIcon = (vol) => {
    if (!isSoundEnabled || vol === 0) return '🔇';
    if (vol < 0.4) return '🔉';
    return '🔊';
  };

  return (
    <div className="profil-hub-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Hub Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Profil &amp; Paramètres ⚙️</h2>
          <p className="text-muted" style={{ margin: '0.2rem 0 0 0', fontSize: '0.88rem' }}>
            Gérez votre compte, personnalisez le visuel et mixez le son
          </p>
        </div>
      </div>

      {/* 3 Horizontal Sub-Tabs */}
      <div className="subtabs-nav-bar">
        <button
          type="button"
          className={`subtab-btn ${subTab === 'account' ? 'active' : ''}`}
          onClick={() => {
            setSubTab('account');
            playClick();
          }}
        >
          <span className="subtab-icon">👤</span>
          <span className="subtab-label">Compte</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${subTab === 'themes' ? 'active' : ''}`}
          onClick={() => {
            setSubTab('themes');
            playClick();
          }}
        >
          <span className="subtab-icon">🎨</span>
          <span className="subtab-label">Thèmes</span>
        </button>

        <button
          type="button"
          className={`subtab-btn ${subTab === 'audio' ? 'active' : ''}`}
          onClick={() => {
            setSubTab('audio');
            playClick();
          }}
        >
          <span className="subtab-icon">{getVolIcon(masterVolume)}</span>
          <span className="subtab-label">Audio</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 👤 1. SOUS-ONGLET COMPTE */}
      {/* ========================================================================= */}
      {subTab === 'account' && (
        <div className="tab-pane-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Guest login banner */}
          {isGuest && !user && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(168,85,247,0.1))',
              border: '1px solid rgba(99,102,241,0.4)',
              borderRadius: '16px',
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '2rem' }}>👤</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.05rem', marginBottom: '0.3rem' }}>Tu es en mode invité</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Connecte-toi pour sauvegarder tes listes, apparaître dans le classement et synchroniser tes réglages.
                </div>
              </div>
              <button
                onClick={loginWithGoogle}
                className="btn btn-primary"
                style={{ width: '100%', maxWidth: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Se connecter avec Google
              </button>
            </div>
          )}

          {/* Identity Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🪪</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Votre Identité en Jeu</h3>
                  <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                    Modifiez votre pseudo et avatar affichés en duel et dans le classement
                  </div>
                </div>
              </div>
              {saveSuccess && (
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid #10b981',
                  color: '#10b981',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.75rem',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  animation: 'fadeIn 0.2s ease-in-out'
                }}>
                  ✓ Modifié &amp; Sauvegardé
                </span>
              )}
            </div>
            
            <div className="mobile-stack" style={{ alignItems: 'center', gap: '0.9rem' }}>
              {user?.photoURL ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }} title="Photo de votre compte Google">
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '3px solid var(--primary)',
                    boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)',
                    overflow: 'hidden',
                    background: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img 
                      src={user.photoURL} 
                      alt="Photo Google" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              ) : (
                <select 
                  className="input-field" 
                  value={avatar} 
                  onChange={(e) => handleAvatarChange(e.target.value)}
                  style={{ padding: '0.5rem', fontSize: '1.6rem', flex: '0 0 90px', textAlign: 'center', cursor: 'pointer' }}
                  title="Choisir votre avatar de jeu"
                >
                  <option value="🦊">🦊 Renard</option>
                  <option value="🐼">🐼 Panda</option>
                  <option value="🦁">🦁 Lion</option>
                  <option value="🐸">🐸 Grenouille</option>
                  <option value="🦄">🦄 Licorne</option>
                  <option value="😎">😎 Cool</option>
                  <option value="👻">👻 Fantôme</option>
                  <option value="👑">👑 Roi</option>
                  <option value="⚡">⚡ Éclair</option>
                  <option value="🔥">🔥 Flamme</option>
                </select>
              )}

              <div style={{ flex: 1, width: '100%' }}>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Votre pseudo (ex: Wail...)" 
                  maxLength={32}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave(nameInput.trim(), avatar);
                    }
                  }}
                  style={{ margin: 0, width: '100%', fontSize: '1.05rem', fontWeight: 600 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
              <div className="text-muted" style={{ fontSize: '0.82rem' }}>
                {user ? (
                  <span>Compte lié : <strong style={{ color: 'var(--text-main)' }}>{user.displayName || user.email}</strong></span>
                ) : (
                  <span>Mode Invité : Enregistré localement sur votre appareil.</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSave(nameInput.trim(), avatar)}
                disabled={isSaving || !nameInput.trim()}
                className="btn btn-primary"
                style={{
                  padding: '0.55rem 1.4rem',
                  fontWeight: 'bold',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  width: 'auto',
                  minWidth: '150px',
                  justifyContent: 'center',
                  background: saveSuccess ? '#10b981' : undefined,
                  borderColor: saveSuccess ? '#10b981' : undefined
                }}
              >
                {isSaving ? '⏳ Enregistrement...' : saveSuccess ? '✓ Enregistré !' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>

          {/* Preferences */}
          {user && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⚡</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Préférences de Sauvegarde</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.8rem' }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>Sauvegarde Automatique</div>
                  <div className="text-muted" style={{ fontSize: '0.85rem' }}>Enregistre automatiquement vos extractions de vocabulaire IA.</div>
                </div>
                <button
                  onClick={toggleAutoSave}
                  className={`btn ${autoSaveEnabled ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ width: 'auto', padding: '0.5rem 1.2rem', fontWeight: 'bold' }}
                >
                  {autoSaveEnabled ? 'ACTIVÉ ✓' : 'DÉSACTIVÉ ✕'}
                </button>
              </div>
            </div>
          )}

          {/* Admin panel & Agentation Controls */}
          {user && (
            <div className="card" style={{ 
              background: isAdmin 
                ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))' 
                : 'rgba(255,255,255,0.02)', 
              borderColor: isAdmin ? 'rgba(99,102,241,0.5)' : 'var(--border-color)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🛡️</span>
                  <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.15rem' }}>
                    {isAdmin ? 'Espace Administrateur (Actif)' : 'Mode Administrateur'}
                  </h3>
                </div>
                {isAdmin && (
                  <span style={{
                    background: 'rgba(99, 102, 241, 0.2)',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px'
                  }}>
                    👑 ADMIN CONFIRMÉ
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <div>
                  <strong>UID : </strong>
                  <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem', wordBreak: 'break-all' }}>
                    {user.uid}
                  </code>
                </div>
                {isAdmin ? (
                  <div style={{ color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                    <span>✓</span> Bouton de commentaire Agentation actif sur toute l'application.
                  </div>
                ) : (
                  <div>
                    Activez les privilèges administrateur pour débloquer le bouton de feedback Agentation et le panneau d'administration.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                {isAdmin && onOpenAdmin && (
                  <button 
                    onClick={onOpenAdmin} 
                    className="btn btn-primary" 
                    style={{ flex: '1 1 180px', padding: '0.75rem', fontWeight: 'bold' }}
                  >
                    Ouvrir le Panneau Admin 🛡️
                  </button>
                )}
                {onToggleAdmin && (
                  <button
                    onClick={() => onToggleAdmin(!isAdmin)}
                    className={`btn ${isAdmin ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ flex: '1 1 180px', padding: '0.75rem', fontWeight: 'bold' }}
                  >
                    {isAdmin ? '🔒 Désactiver Mode Admin' : '👑 Activer Mode Admin & Agentation'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {user && (
            <div className="card" style={{ borderColor: 'var(--danger)', background: 'rgba(239,68,68,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                <h3 style={{ color: 'var(--danger)', margin: 0, fontSize: '1.15rem' }}>Zone de Danger</h3>
              </div>
              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                Actions irréversibles sur votre session ou votre profil utilisateur.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={logout}
                  className="btn btn-secondary"
                  style={{ flex: '1 1 200px', borderColor: 'var(--warning)', color: 'var(--warning)', fontWeight: 'bold' }}
                >
                  🚪 SE DÉCONNECTER
                </button>
                <button
                  onClick={handleDeleteAccount}
                  className="btn btn-secondary"
                  style={{ flex: '1 1 200px', color: 'var(--danger)', borderColor: 'var(--danger)', fontWeight: 'bold' }}
                >
                  🗑️ SUPPRIMER MON COMPTE
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🎨 2. SOUS-ONGLET THÈMES */}
      {/* ========================================================================= */}
      {subTab === 'themes' && (
        <div className="tab-pane-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.4rem' }}>🎨</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Thèmes Visuels (8 Styles)</h3>
              </div>
              <span className="theme-active-badge">
                Actif : {theme?.toUpperCase() || 'MIDNIGHT'}
              </span>
            </div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1.2rem' }}>
              Personnalisez l'ambiance et la palette graphique de toute l'application en un clic :
            </p>

            <div className="theme-grid">
              {themesList.map((th) => {
                const isActive = (theme === th.id) || (th.id === 'classic' && theme === 'light');
                return (
                  <button
                    key={th.id}
                    type="button"
                    className={`theme-card-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (setTheme) {
                        setTheme(th.id);
                        localStorage.setItem('wana_theme', th.id);
                        playClick();
                      }
                    }}
                    style={{
                      borderLeft: `4px solid ${th.primary}`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span style={{ fontSize: '1.4rem' }}>{th.icon}</span>
                      <div className="theme-swatch">
                        <div className="theme-dot" style={{ backgroundColor: th.bg }} />
                        <div className="theme-dot" style={{ backgroundColor: th.primary }} />
                      </div>
                    </div>
                    <div style={{ textAlign: 'left', width: '100%' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: isActive ? 'var(--primary)' : 'var(--text-main)' }}>
                        {th.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.25', marginTop: '3px' }}>
                        {th.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 🔊 3. SOUS-ONGLET AUDIO (MIXEUR) */}
      {/* ========================================================================= */}
      {subTab === 'audio' && (
        <div className="tab-pane-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Main Master Switch & Mixer Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
            {/* Header with Global Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>🎚️</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Mixeur Audio du Joueur</h3>
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
                  Ajustez avec précision les différents canaux sonores selon vos préférences.
                </div>
              </div>

              <button
                type="button"
                onClick={toggleSound}
                className={`btn ${isSoundEnabled ? 'btn-primary' : 'btn-secondary'}`}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 1rem', width: 'auto', fontWeight: 'bold' }}
              >
                <span>{isSoundEnabled ? '🔊 Son Activé' : '🔇 Tout Muet'}</span>
              </button>
            </div>

            {/* 1. MASTER VOLUME SLIDER */}
            <div className="audio-slider-group">
              <div className="audio-slider-header">
                <div className="audio-slider-label">
                  <span className="audio-slider-icon">🎛️</span>
                  <div>
                    <span className="audio-slider-title">Volume Principal (Master)</span>
                    <div className="audio-slider-desc">Contrôle global de tous les sons et musiques</div>
                  </div>
                </div>
                <span className="audio-percentage-pill">
                  {Math.round(masterVolume * 100)}%
                </span>
              </div>
              
              <div className="audio-slider-track-wrap">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
                  className="wana-range-slider"
                  style={{
                    '--progress': `${masterVolume * 100}%`
                  }}
                  aria-label="Volume Principal (Master)"
                />
              </div>
            </div>

            {/* 2. SFX VOLUME SLIDER */}
            <div className="audio-slider-group">
              <div className="audio-slider-header">
                <div className="audio-slider-label">
                  <span className="audio-slider-icon">💥</span>
                  <div>
                    <span className="audio-slider-title">Effets Sonores (SFX)</span>
                    <div className="audio-slider-desc">Bips d'interface, validations, clics et explosions de duel</div>
                  </div>
                </div>
                <span className="audio-percentage-pill">
                  {Math.round(sfxVolume * 100)}%
                </span>
              </div>

              <div className="audio-slider-track-wrap">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  className="wana-range-slider"
                  style={{
                    '--progress': `${sfxVolume * 100}%`
                  }}
                  aria-label="Effets Sonores (SFX)"
                />
              </div>
            </div>

            {/* 3. BGM VOLUME SLIDER */}
            <div className="audio-slider-group">
              <div className="audio-slider-header">
                <div className="audio-slider-label">
                  <span className="audio-slider-icon">🎵</span>
                  <div>
                    <span className="audio-slider-title">Musique d'Ambiance (BGM)</span>
                    <div className="audio-slider-desc">Bande sonore d'arrière-plan immersive pour l'apprentissage</div>
                  </div>
                </div>
                <span className="audio-percentage-pill">
                  {Math.round(bgmVolume * 100)}%
                </span>
              </div>

              <div className="audio-slider-track-wrap">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={bgmVolume}
                  onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                  className="wana-range-slider"
                  style={{
                    '--progress': `${bgmVolume * 100}%`
                  }}
                  aria-label="Musique d'Ambiance (BGM)"
                />
              </div>
            </div>

            {/* Audio Testing & Quick Actions */}
            <div style={{ marginTop: '0.5rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🧪 Tester les Effets Sonores en direct :</div>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={playClick}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', width: 'auto' }}
                >
                  🔘 Clic UI
                </button>
                <button
                  type="button"
                  onClick={playSuccess}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', width: 'auto', color: 'var(--success)', borderColor: 'var(--success)' }}
                >
                  ✨ Succès
                </button>
                <button
                  type="button"
                  onClick={playExplosion}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', width: 'auto', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                >
                  💥 Explosion
                </button>
                <button
                  type="button"
                  onClick={playNotification}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.85rem', padding: '0.45rem 0.8rem', width: 'auto', color: '#a78bfa', borderColor: '#a78bfa' }}
                >
                  📢 Notification
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    resetAudioSettings();
                    playSuccess();
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', width: 'auto', color: 'var(--text-muted)' }}
                  title="Réinitialise le mixeur à 50%"
                >
                  ↺ Réinitialiser aux valeurs par défaut (50%)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
