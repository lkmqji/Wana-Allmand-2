import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function MatchSchedulerModal({ 
  user, 
  playerName, 
  avatar, 
  onlineUsers = [], 
  lists = [], 
  onClose,
  onLaunchScheduledMatch 
}) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [toast, setToast] = useState(null);

  // Form State
  const [guestId, setGuestId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("20:00");
  const [selectedListId, setSelectedListId] = useState("");
  const [note, setNote] = useState("");

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 3500);
  };

  const loadSchedules = async () => {
    const uid = user?.uid || 'guest';
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/schedules/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, [user]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!scheduledDate) {
      showToast("❌ Veuillez sélectionner une date.");
      return;
    }

    const fullDateTime = new Date(`${scheduledDate}T${scheduledTime || '20:00'}:00`);
    if (isNaN(fullDateTime.getTime())) {
      showToast("❌ Date ou heure invalide.");
      return;
    }

    const selectedList = lists.find(l => l._id === selectedListId);

    try {
      const res = await fetch(`${API_URL}/api/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: user?.uid || 'guest',
          hostName: playerName || 'Joueur',
          hostAvatar: avatar || '🦊',
          guestId: guestId || null,
          guestName: guestName || 'Adversaire invité',
          scheduledDate: fullDateTime.toISOString(),
          note: note.trim(),
          listId: selectedListId || null,
          listName: selectedList?.name || 'Vocabulaire général'
        })
      });

      if (res.ok) {
        showToast("✅ Duel planifié avec succès !");
        setShowCreateForm(false);
        loadSchedules();
      } else {
        showToast("❌ Erreur lors de la planification.");
      }
    } catch (err) {
      console.error(err);
      showToast("❌ Erreur de connexion.");
    }
  };

  const handleDeleteSchedule = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/schedules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSchedules(prev => prev.filter(s => s._id !== id));
        showToast("🗑️ Duel supprimé.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="scheduler-modal glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <div className="scheduler-header">
          <div>
            <h2 className="modal-title">📅 Planificateur de Matchs & Rappels</h2>
            <p className="scheduler-subtitle">Programme tes prochains duels et reçois des notifications à l'heure du match.</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {toast && <div className="shop-toast animate-slide-down">{toast}</div>}

        <div className="scheduler-toolbar">
          <button 
            className="btn-primary" 
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            {showCreateForm ? "Annuler ✕" : "➕ Programmer un nouveau match"}
          </button>
        </div>

        {/* Create Schedule Form */}
        {showCreateForm && (
          <form className="scheduler-form glass-panel animate-slide-down" onSubmit={handleCreateSchedule}>
            <h3>Nouveau Duel Programmé</h3>
            
            <div className="form-row-grid">
              <div className="form-group">
                <label>Date du match *</label>
                <input 
                  type="date" 
                  className="input-field"
                  required
                  value={scheduledDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Heure du match *</label>
                <input 
                  type="time" 
                  className="input-field"
                  required
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Adversaire (Optionnel)</label>
              <select 
                className="input-field"
                value={guestId}
                onChange={(e) => {
                  setGuestId(e.target.value);
                  const found = onlineUsers.find(u => u.firebaseId === e.target.value);
                  if (found) setGuestName(found.name);
                }}
              >
                <option value="">Sélectionner un joueur en ligne ou ami...</option>
                {onlineUsers.filter(u => u.firebaseId && u.firebaseId !== user?.uid).map(u => (
                  <option key={u.firebaseId} value={u.firebaseId}>
                    {u.avatar} {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Liste de vocabulaire associée</label>
              <select 
                className="input-field"
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
              >
                <option value="">Vocabulaire général aléatoire</option>
                {lists.map(l => (
                  <option key={l._id} value={l._id}>
                    📖 {l.name} ({l.words?.length || 0} mots)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Note / Défi (ex: "Entraînement verbes irréguliers")</label>
              <input 
                type="text" 
                className="input-field"
                placeholder="Ajoute une note ou un enjeu..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "10px" }}>
              💾 Confirmer la planification
            </button>
          </form>
        )}

        {/* List of Scheduled Matches */}
        <div className="scheduler-list-section">
          <h3>Mes Duels Programmés ({schedules.length})</h3>

          {loading ? (
            <div className="loading-spinner">Chargement des matchs...</div>
          ) : schedules.length === 0 ? (
            <div className="empty-scheduler-box">
              <span className="empty-icon">📅</span>
              <p>Aucun match programmé pour le moment.</p>
              <span className="empty-hint">Clique sur "Programmer un nouveau match" pour défier un ami plus tard !</span>
            </div>
          ) : (
            <div className="schedules-grid">
              {schedules.map((s) => {
                const dateObj = new Date(s.scheduledDate);
                const isPast = dateObj < new Date();
                const isToday = dateObj.toDateString() === new Date().toDateString();

                return (
                  <div key={s._id} className={`schedule-card glass-panel ${isPast ? 'past' : ''}`}>
                    <div className="schedule-card-top">
                      <span className={`schedule-date-badge ${isToday ? 'today' : ''}`}>
                        {isToday ? "AUJOURD'HUI" : dateObj.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="schedule-time-badge">
                        ⏰ {dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="schedule-matchup">
                      <div className="schedule-player">
                        <span className="player-avatar">{s.hostAvatar}</span>
                        <span className="player-name">{s.hostName}</span>
                      </div>
                      <span className="vs-badge">VS</span>
                      <div className="schedule-player">
                        <span className="player-avatar">👤</span>
                        <span className="player-name">{s.guestName || 'Adversaire'}</span>
                      </div>
                    </div>

                    <div className="schedule-details">
                      <p className="schedule-list-name">📖 {s.listName}</p>
                      {s.note && <p className="schedule-note">💬 "{s.note}"</p>}
                    </div>

                    <div className="schedule-card-actions">
                      <button 
                        className="btn-primary-small"
                        onClick={() => {
                          if (onLaunchScheduledMatch) onLaunchScheduledMatch(s);
                        }}
                      >
                        🚀 Lancer le match
                      </button>
                      <button 
                        className="btn-delete-small"
                        onClick={() => handleDeleteSchedule(s._id)}
                        title="Supprimer la planification"
                      >
                        🗑️
                      </button>
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
