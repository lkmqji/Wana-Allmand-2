import { useState, useEffect } from "react";

export const THEMES = [
  { id: "dark", name: "Dark Modern", icon: "🌑", primaryColor: "#6366f1", bgDesc: "Bleu profond élégant", requiredLevel: 1 },
  { id: "cyberpunk", name: "Cyberpunk 2077", icon: "⚡", primaryColor: "#f43f5e", bgDesc: "Néon Rose & Cyan futuriste", requiredLevel: 2 },
  { id: "synthwave", name: "Synthwave 80s", icon: "🌆", primaryColor: "#d946ef", bgDesc: "Coucher de soleil rétro & violet", requiredLevel: 3 },
  { id: "emerald", name: "Emerald Forest", icon: "🌲", primaryColor: "#10b981", bgDesc: "Vert émeraude apaisant", requiredLevel: 5 },
  { id: "midnight", name: "Midnight Gold", icon: "👑", primaryColor: "#eab308", bgDesc: "Noir absolu & or impérial", requiredLevel: 8 },
  { id: "light", name: "Light Crisp", icon: "☀️", primaryColor: "#3b82f6", bgDesc: "Thème clair épuré", requiredLevel: 1 }
];

export const BACKGROUND_EFFECTS = [
  { id: "default", name: "Mesh Gradient", icon: "🌌", desc: "Dégradé fluide moderne", requiredLevel: 1 },
  { id: "grid", name: "Cyber Grid", icon: "📐", desc: "Grille néon rétro animée", requiredLevel: 3 },
  { id: "aurora", name: "Aurora Borealis", icon: "✨", desc: "Lueurs nordiques changeantes", requiredLevel: 6 },
  { id: "minimal", name: "Pure Flat", icon: "⬛", desc: "Fond uni ultra-sobre", requiredLevel: 1 }
];

export const AVATAR_COLLECTION = [
  { emoji: "🦊", name: "Renard Rusé", requiredLevel: 1 },
  { emoji: "🐺", name: "Loup Alpha", requiredLevel: 2 },
  { emoji: "🦅", name: "Aigle Royal", requiredLevel: 3 },
  { emoji: "🐼", name: "Panda Zen", requiredLevel: 4 },
  { emoji: "🦁", name: "Lion Vaillant", requiredLevel: 5 },
  { emoji: "🤖", name: "Cyborg DE", requiredLevel: 7 },
  { emoji: "🧙‍♂️", name: "Mage des Mots", requiredLevel: 10 },
  { emoji: "👑", name: "Kaiser Suprême", requiredLevel: 15 }
];

export const CARD_STYLES = [
  { id: "card-glass", name: "Glassmorphism", desc: "Verre dépoli lumineux", requiredLevel: 1 },
  { id: "card-neon", name: "Bordure Néon", desc: "Halo lumineux vibrant", requiredLevel: 4 },
  { id: "card-retro", name: "Pixel Arcade", desc: "Style 16-bit immersif", requiredLevel: 6 }
];

export default function CustomizationShop({ 
  userLevel = 1, 
  userXp = 0, 
  currentTheme = "dark", 
  onSelectTheme, 
  currentAvatar = "🦊", 
  onSelectAvatar,
  onClose 
}) {
  const [activeTab, setActiveTab] = useState("themes");
  const [selectedBg, setSelectedBg] = useState(() => localStorage.getItem("wana_bg_effect") || "default");
  const [selectedCardStyle, setSelectedCardStyle] = useState(() => localStorage.getItem("wana_card_style") || "card-glass");
  const [toast, setToast] = useState(null);

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApplyTheme = (theme) => {
    if (userLevel < theme.requiredLevel) {
      showToast(`🔒 Débloqué au Niveau ${theme.requiredLevel} !`);
      return;
    }
    onSelectTheme(theme.id);
    localStorage.setItem("wana_theme", theme.id);
    showToast(`✅ Thème "${theme.name}" appliqué !`);
  };

  const handleApplyBg = (bg) => {
    if (userLevel < bg.requiredLevel) {
      showToast(`🔒 Débloqué au Niveau ${bg.requiredLevel} !`);
      return;
    }
    setSelectedBg(bg.id);
    localStorage.setItem("wana_bg_effect", bg.id);
    document.documentElement.setAttribute("data-bg-effect", bg.id);
    showToast(`✅ Effet de fond "${bg.name}" appliqué !`);
  };

  const handleApplyAvatar = (av) => {
    if (userLevel < av.requiredLevel) {
      showToast(`🔒 Débloqué au Niveau ${av.requiredLevel} !`);
      return;
    }
    onSelectAvatar(av.emoji);
    localStorage.setItem("wana_avatar", av.emoji);
    showToast(`✅ Avatar ${av.emoji} sélectionné !`);
  };

  const handleApplyCardStyle = (style) => {
    if (userLevel < style.requiredLevel) {
      showToast(`🔒 Débloqué au Niveau ${style.requiredLevel} !`);
      return;
    }
    setSelectedCardStyle(style.id);
    localStorage.setItem("wana_card_style", style.id);
    document.documentElement.setAttribute("data-card-style", style.id);
    showToast(`✅ Style de carte "${style.name}" appliqué !`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="customization-modal glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <div className="shop-header">
          <div className="shop-title-area">
            <h2 className="modal-title">🎨 Personnalisation & Boutique</h2>
            <div className="shop-user-level-badge">
              <span>⭐ Niveau <strong>{userLevel}</strong></span>
              <span className="shop-xp-count">{userXp} XP</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {toast && <div className="shop-toast animate-slide-down">{toast}</div>}

        <div className="shop-nav-tabs">
          <button className={`shop-tab ${activeTab === 'themes' ? 'active' : ''}`} onClick={() => setActiveTab('themes')}>
            🎨 Thèmes ({THEMES.length})
          </button>
          <button className={`shop-tab ${activeTab === 'avatars' ? 'active' : ''}`} onClick={() => setActiveTab('avatars')}>
            👤 Avatars ({AVATAR_COLLECTION.length})
          </button>
          <button className={`shop-tab ${activeTab === 'backgrounds' ? 'active' : ''}`} onClick={() => setActiveTab('backgrounds')}>
            ✨ Effets ({BACKGROUND_EFFECTS.length})
          </button>
          <button className={`shop-tab ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>
            🃏 Cartes ({CARD_STYLES.length})
          </button>
        </div>

        <div className="shop-content-scroll">
          {/* THEMES */}
          {activeTab === 'themes' && (
            <div className="shop-grid">
              {THEMES.map((th) => {
                const isUnlocked = userLevel >= th.requiredLevel;
                const isEquipped = currentTheme === th.id;
                return (
                  <div 
                    key={th.id} 
                    className={`shop-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => handleApplyTheme(th)}
                  >
                    <div className="shop-card-preview" style={{ borderColor: th.primaryColor }}>
                      <span className="shop-card-icon">{th.icon}</span>
                    </div>
                    <div className="shop-card-info">
                      <h4>{th.name}</h4>
                      <p>{th.bgDesc}</p>
                    </div>
                    <div className="shop-card-footer">
                      {isEquipped ? (
                        <span className="badge-equipped">Équipé ✓</span>
                      ) : isUnlocked ? (
                        <button className="btn-apply-small">Appliquer</button>
                      ) : (
                        <span className="badge-locked">🔒 Niv. {th.requiredLevel}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* AVATARS */}
          {activeTab === 'avatars' && (
            <div className="avatar-grid">
              {AVATAR_COLLECTION.map((av, idx) => {
                const isUnlocked = userLevel >= av.requiredLevel;
                const isEquipped = currentAvatar === av.emoji;
                return (
                  <div 
                    key={idx} 
                    className={`avatar-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => handleApplyAvatar(av)}
                  >
                    <span className="avatar-emoji">{av.emoji}</span>
                    <span className="avatar-name">{av.name}</span>
                    {isEquipped ? (
                      <span className="badge-equipped-mini">✓</span>
                    ) : !isUnlocked ? (
                      <span className="badge-locked-mini">🔒 Niv. {av.requiredLevel}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* BACKGROUNDS */}
          {activeTab === 'backgrounds' && (
            <div className="shop-grid">
              {BACKGROUND_EFFECTS.map((bg) => {
                const isUnlocked = userLevel >= bg.requiredLevel;
                const isEquipped = selectedBg === bg.id;
                return (
                  <div 
                    key={bg.id} 
                    className={`shop-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => handleApplyBg(bg)}
                  >
                    <div className="shop-card-preview">
                      <span className="shop-card-icon">{bg.icon}</span>
                    </div>
                    <div className="shop-card-info">
                      <h4>{bg.name}</h4>
                      <p>{bg.desc}</p>
                    </div>
                    <div className="shop-card-footer">
                      {isEquipped ? (
                        <span className="badge-equipped">Équipé ✓</span>
                      ) : isUnlocked ? (
                        <button className="btn-apply-small">Appliquer</button>
                      ) : (
                        <span className="badge-locked">🔒 Niv. {bg.requiredLevel}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CARD STYLES */}
          {activeTab === 'cards' && (
            <div className="shop-grid">
              {CARD_STYLES.map((cs) => {
                const isUnlocked = userLevel >= cs.requiredLevel;
                const isEquipped = selectedCardStyle === cs.id;
                return (
                  <div 
                    key={cs.id} 
                    className={`shop-card ${isEquipped ? 'equipped' : ''} ${!isUnlocked ? 'locked' : ''}`}
                    onClick={() => handleApplyCardStyle(cs)}
                  >
                    <div className="shop-card-preview">
                      <span className="shop-card-icon">🃏</span>
                    </div>
                    <div className="shop-card-info">
                      <h4>{cs.name}</h4>
                      <p>{cs.desc}</p>
                    </div>
                    <div className="shop-card-footer">
                      {isEquipped ? (
                        <span className="badge-equipped">Équipé ✓</span>
                      ) : isUnlocked ? (
                        <button className="btn-apply-small">Appliquer</button>
                      ) : (
                        <span className="badge-locked">🔒 Niv. {cs.requiredLevel}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
