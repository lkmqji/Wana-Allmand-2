import { useState, useEffect, useMemo } from "react";
import { formatPlayerName } from "../utils/formatters";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function Admin({ user, onClose }) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, users, lists, settings
  const [config, setConfig] = useState({ guestMode: true, maintenanceMode: false, announcement: "" });
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");

  // Search & filter states
  const [userSearch, setUserSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [listFilter, setListFilter] = useState("all"); // all, public, private
  const [inspectingList, setInspectingList] = useState(null);

  // Edit list modal state
  const [editingList, setEditingList] = useState(null);
  const [editListForm, setEditListForm] = useState({ name: "", words: [] });

  // Edit user modal state
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", xp: 0, level: 1, gamesPlayed: 0, gamesWon: 0 });

  // Announcement input
  const [announcementText, setAnnouncementText] = useState("");

  // Notification sender state
  const [notifForm, setNotifForm] = useState({
    title: "",
    message: "",
    type: "info",
    icon: "📢",
    targetType: "all", // "all" or "specific"
    selectedUserIds: []
  });
  const [notifUserSearch, setNotifUserSearch] = useState("");

  const isAdmin = Boolean(user && ADMIN_UID && user.uid === ADMIN_UID);

  const fetchHeaders = useMemo(() => ({
    "Content-Type": "application/json",
    "x-admin-uid": user?.uid || ""
  }), [user?.uid]);

  const loadAllData = async (showRefreshSpinner = false) => {
    if (!isAdmin) return;
    if (showRefreshSpinner) setIsRefreshing(true);
    else setLoading(true);

    try {
      const uid = user?.uid || "";
      const [cfgRes, ovRes, usRes, lsRes] = await Promise.all([
        fetch(`${API_URL}/api/config`),
        fetch(`${API_URL}/api/admin/overview?adminUid=${uid}`, { headers: fetchHeaders }),
        fetch(`${API_URL}/api/admin/users?adminUid=${uid}`, { headers: fetchHeaders }),
        fetch(`${API_URL}/api/admin/lists?adminUid=${uid}`, { headers: fetchHeaders })
      ]);

      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        setConfig(cfgData);
        setAnnouncementText(cfgData.announcement || "");
      }
      if (ovRes.ok) setOverview(await ovRes.json());
      if (usRes.ok) setUsers(await usRes.json());
      if (lsRes.ok) setLists(await lsRes.json());
    } catch (err) {
      console.error("Admin fetch error:", err);
      showErrorMessage("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const showSuccessMessage = (msg) => {
    setMessage(`✅ ${msg}`);
    setTimeout(() => setMessage(""), 3500);
  };

  const showErrorMessage = (msg) => {
    setMessage(`❌ ${msg}`);
    setTimeout(() => setMessage(""), 3500);
  };

  // Toggle config settings
  const toggleConfig = async (setting, currentValue) => {
    setSaving(setting);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/admin/config?adminUid=${user.uid}`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ adminUid: user.uid, setting, value: !currentValue })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConfig(prev => ({ ...prev, [setting]: !currentValue }));
        showSuccessMessage("Paramètre mis à jour avec succès !");
      } else {
        showErrorMessage(data.error || "Erreur de configuration.");
      }
    } catch (e) {
      showErrorMessage("Erreur réseau.");
    } finally {
      setSaving(null);
    }
  };

  // Save Announcement
  const saveAnnouncement = async () => {
    setSaving("announcement");
    try {
      const res = await fetch(`${API_URL}/api/admin/config?adminUid=${user.uid}`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({ adminUid: user.uid, setting: "announcement", value: announcementText })
      });
      if (res.ok) {
        setConfig(prev => ({ ...prev, announcement: announcementText }));
        showSuccessMessage("Message diffusé en direct à tous les joueurs !");
      } else {
        showErrorMessage("Impossible de diffuser le message.");
      }
    } catch {
      showErrorMessage("Erreur lors de la diffusion de l'annonce.");
    } finally {
      setSaving(null);
    }
  };

  // Send Notification to all or specific users
  const handleSendNotification = async () => {
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      return showErrorMessage("Veuillez renseigner un titre et un message.");
    }
    if (notifForm.targetType === "specific" && notifForm.selectedUserIds.length === 0) {
      return showErrorMessage("Veuillez sélectionner au moins un utilisateur cible.");
    }

    setSaving("send_notif");
    try {
      const res = await fetch(`${API_URL}/api/admin/notifications?adminUid=${user.uid}`, {
        method: "POST",
        headers: fetchHeaders,
        body: JSON.stringify({
          adminUid: user.uid,
          title: notifForm.title,
          message: notifForm.message,
          type: notifForm.type,
          icon: notifForm.icon,
          targetType: notifForm.targetType,
          targetUserIds: notifForm.selectedUserIds
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showSuccessMessage(`Notification envoyée avec succès (${data.count} destinataire${data.count > 1 ? 's' : ''}) !`);
        setNotifForm({
          title: "",
          message: "",
          type: "info",
          icon: "📢",
          targetType: "all",
          selectedUserIds: []
        });
      } else {
        showErrorMessage(data.error || "Erreur lors de l'envoi.");
      }
    } catch (e) {
      showErrorMessage("Erreur réseau lors de l'envoi de la notification.");
    } finally {
      setSaving(null);
    }
  };

  // Update user XP / Level
  const handleSaveUserEdit = async () => {
    if (!editingUser) return;
    setSaving("user_edit");
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${editingUser.firebaseId}?adminUid=${user.uid}`, {
        method: "PUT",
        headers: fetchHeaders,
        body: JSON.stringify({
          adminUid: user.uid,
          name: editForm.name,
          xp: Number(editForm.xp),
          level: Number(editForm.level),
          gamesPlayed: Number(editForm.gamesPlayed || 0),
          gamesWon: Number(editForm.gamesWon || 0)
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setUsers(prev => prev.map(u => u.firebaseId === updated.firebaseId ? updated : u));
        setEditingUser(null);
        showSuccessMessage("Utilisateur mis à jour !");
      } else {
        showErrorMessage("Erreur lors de la modification de l'utilisateur.");
      }
    } catch {
      showErrorMessage("Erreur réseau.");
    } finally {
      setSaving(null);
    }
  };

  // Delete user
  const handleDeleteUser = async (firebaseId, userName) => {
    if (!window.confirm(`Supprimer définitivement l'utilisateur "${userName}" et toutes ses listes ?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${firebaseId}?adminUid=${user.uid}`, {
        method: "DELETE",
        headers: fetchHeaders
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.firebaseId !== firebaseId));
        setLists(prev => prev.filter(l => l.userId !== firebaseId));
        showSuccessMessage(`Utilisateur "${userName}" et ses listes ont été supprimés.`);
      } else {
        showErrorMessage("Erreur lors de la suppression.");
      }
    } catch {
      showErrorMessage("Erreur réseau.");
    }
  };

  // Toggle list public status
  const handleToggleListPublic = async (listId, currentStatus) => {
    try {
      const res = await fetch(`${API_URL}/api/lists/${listId}/public?adminUid=${user.uid}`, {
        method: "PUT",
        headers: fetchHeaders,
        body: JSON.stringify({ isPublic: !currentStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setLists(prev => prev.map(l => l._id === listId ? { ...l, isPublic: updated.isPublic } : l));
        showSuccessMessage(`Statut changé en ${!currentStatus ? 'Publique' : 'Privée'}.`);
      } else {
        showErrorMessage("Erreur lors du changement de statut.");
      }
    } catch {
      showErrorMessage("Erreur réseau.");
    }
  };

  // Save edited list
  const handleSaveListEdit = async () => {
    if (!editingList) return;
    setSaving("list_edit");
    try {
      const res = await fetch(`${API_URL}/api/lists/${editingList._id}?adminUid=${user.uid}`, {
        method: "PUT",
        headers: fetchHeaders,
        body: JSON.stringify({
          name: editListForm.name,
          words: editListForm.words
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setLists(prev => prev.map(l => l._id === updated._id ? { ...updated, creatorName: l.creatorName } : l));
        setEditingList(null);
        showSuccessMessage("Liste modifiée avec succès !");
      } else {
        showErrorMessage("Erreur lors de la mise à jour de la liste.");
      }
    } catch {
      showErrorMessage("Erreur réseau.");
    } finally {
      setSaving(null);
    }
  };

  // Delete list
  const handleDeleteList = async (listId, listName) => {
    if (!window.confirm(`Supprimer définitivement la liste "${listName}" ?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/lists/${listId}?adminUid=${user.uid}`, {
        method: "DELETE",
        headers: fetchHeaders
      });
      if (res.ok) {
        setLists(prev => prev.filter(l => l._id !== listId));
        if (inspectingList?._id === listId) setInspectingList(null);
        showSuccessMessage(`Liste "${listName}" supprimée.`);
      } else {
        showErrorMessage("Erreur lors de la suppression de la liste.");
      }
    } catch {
      showErrorMessage("Erreur réseau.");
    }
  };

  // Filtered lists
  const filteredLists = lists.filter(l => {
    const matchesSearch = l.name?.toLowerCase().includes(listSearch.toLowerCase()) || 
                          (l.creatorName && l.creatorName.toLowerCase().includes(listSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (listFilter === "public") return l.isPublic;
    if (listFilter === "private") return !l.isPublic;
    return true;
  });

  // Filtered users
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.firebaseId?.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
      zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "1.5rem 1rem", overflowY: "auto"
    }}>
      <div style={{
        width: "100%", maxWidth: "950px", background: "var(--bg-surface)",
        border: "1px solid var(--border-color)", borderRadius: "20px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)", overflow: "hidden",
        display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem 2rem", borderBottom: "1px solid var(--border-color)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "linear-gradient(to right, rgba(99,102,241,0.08), transparent)",
          flexWrap: "wrap", gap: "1rem"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <span style={{ fontSize: "1.6rem" }}>🛡️</span>
              <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800, background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Super Admin Panel
              </h1>
              <span style={{
                background: "rgba(34, 197, 94, 0.15)", color: "var(--success)",
                padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: "bold"
              }}>
                ● Actif
              </span>
            </div>
            <p style={{ color: "var(--text-muted)", margin: "0.2rem 0 0 0", fontSize: "0.85rem" }}>
              Gestion globale de la plateforme Wana Allmand
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <button
              onClick={() => loadAllData(true)}
              className="btn btn-secondary"
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              title="Rafraîchir les données"
              disabled={isRefreshing}
            >
              🔄 {isRefreshing ? "Actualisation..." : "Rafraîchir"}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(user?.uid || "");
                showSuccessMessage("UID Admin copié dans le presse-papiers !");
              }}
              className="btn btn-secondary"
              style={{ fontSize: "0.85rem", padding: "0.45rem 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
              title="Copier votre UID"
            >
              📋 Copier mon UID
            </button>
            <button 
              onClick={onClose} 
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.8rem", cursor: "pointer", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Global Toast Message */}
        {message && (
          <div style={{
            margin: "1rem 2rem 0 2rem", padding: "0.8rem 1rem", borderRadius: "10px",
            background: message.startsWith("✅") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
            color: message.startsWith("✅") ? "var(--success)" : "var(--danger)",
            fontWeight: "bold", textAlign: "center", fontSize: "0.9rem"
          }}>
            {message}
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{
          display: "flex", borderBottom: "1px solid var(--border-color)",
          padding: "0.5rem 1.5rem 0 1.5rem", gap: "0.5rem", overflowX: "auto"
        }}>
          {[
            { id: "overview", label: "📊 Tableau de Bord", count: null },
            { id: "users", label: "👥 Utilisateurs", count: users.length },
            { id: "lists", label: "📂 Toutes les Listes", count: lists.length },
            { id: "settings", label: "⚙️ Système & Réglages", count: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.75rem 1.2rem", background: "none", border: "none",
                borderBottom: activeTab === tab.id ? "3px solid var(--primary)" : "3px solid transparent",
                color: activeTab === tab.id ? "var(--primary)" : "var(--text-muted)",
                fontWeight: activeTab === tab.id ? "bold" : "500",
                cursor: "pointer", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.4rem",
                transition: "all 0.2s"
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  background: activeTab === tab.id ? "var(--primary)" : "rgba(255,255,255,0.1)",
                  color: "white", fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "10px"
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: "1.5rem 2rem", minHeight: "380px" }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>⏳</div>
              Chargement des données administrateur...
            </div>
          ) : (
            <>
              {/* ---------------- 1. OVERVIEW TAB ---------------- */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div className="card" style={{ padding: "1.2rem", background: "linear-gradient(135deg, rgba(99,102,241,0.1), transparent)", border: "1px solid rgba(99,102,241,0.3)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase" }}>Utilisateurs</div>
                      <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#a78bfa", marginTop: "0.2rem" }}>
                        {overview?.totalUsers ?? users.length}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>Inscrits au total</div>
                    </div>

                    <div className="card" style={{ padding: "1.2rem", background: "linear-gradient(135deg, rgba(34,197,94,0.1), transparent)", border: "1px solid rgba(34,197,94,0.3)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase" }}>Listes de vocabulaire</div>
                      <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "var(--success)", marginTop: "0.2rem" }}>
                        {overview?.totalLists ?? lists.length}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                        {overview?.publicLists ?? 0} publiques • {overview?.privateLists ?? 0} privées
                      </div>
                    </div>

                    <div className="card" style={{ padding: "1.2rem", background: "linear-gradient(135deg, rgba(245,158,11,0.1), transparent)", border: "1px solid rgba(245,158,11,0.3)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase" }}>Parties Jouées</div>
                      <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#f59e0b", marginTop: "0.2rem" }}>
                        {overview?.totalGamesPlayed ?? 0}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>
                        {overview?.totalXp?.toLocaleString() ?? 0} XP cumulés
                      </div>
                    </div>

                    <div className="card" style={{ padding: "1.2rem", background: "linear-gradient(135deg, rgba(236,72,153,0.1), transparent)", border: "1px solid rgba(236,72,153,0.3)" }}>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "bold", textTransform: "uppercase" }}>Salons en direct</div>
                      <div style={{ fontSize: "2.2rem", fontWeight: "900", color: "#ec4899", marginTop: "0.2rem" }}>
                        {overview?.activeRooms ?? 0}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.4rem" }}>Parties multijoueur actives</div>
                    </div>
                  </div>

                  {/* Quick System Status Card */}
                  <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>⚡ Statut &amp; État du Serveur</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem", background: "var(--bg-main)", borderRadius: "10px" }}>
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Mode Invité</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Accès sans login Google</div>
                        </div>
                        <span style={{ fontWeight: "bold", color: config.guestMode ? "var(--success)" : "var(--danger)" }}>
                          {config.guestMode ? "ACTIVÉ" : "DÉSACTIVÉ"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.8rem 1rem", background: "var(--bg-main)", borderRadius: "10px" }}>
                        <div>
                          <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>Mode Maintenance</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Verrouillage public</div>
                        </div>
                        <span style={{ fontWeight: "bold", color: config.maintenanceMode ? "var(--danger)" : "var(--text-muted)" }}>
                          {config.maintenanceMode ? "EN MAINTENANCE" : "NORMAL"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---------------- 2. USERS MANAGEMENT TAB ---------------- */}
              {activeTab === "users" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="🔍 Rechercher un utilisateur par pseudo ou UID..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      style={{ margin: 0, padding: "0.7rem 1rem" }}
                    />
                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          <th style={{ padding: "0.75rem" }}>Utilisateur</th>
                          <th style={{ padding: "0.75rem" }}>Niveau</th>
                          <th style={{ padding: "0.75rem" }}>XP Total</th>
                          <th style={{ padding: "0.75rem" }}>Victoires / Parties</th>
                          <th style={{ padding: "0.75rem", textAlign: "right" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan="5" style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                              Aucun utilisateur trouvé.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.firebaseId} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "0.75rem" }}>
                                <div style={{ fontWeight: "bold" }}>{formatPlayerName(u.name)}</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.firebaseId}</div>
                              </td>
                              <td style={{ padding: "0.75rem" }}>
                                <span style={{ background: "rgba(99,102,241,0.2)", color: "#a78bfa", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.85rem", fontWeight: "bold" }}>
                                  Lvl {u.level || 1}
                                </span>
                              </td>
                              <td style={{ padding: "0.75rem", fontWeight: "bold", color: "var(--primary)" }}>
                                {u.xp || 0} pts
                              </td>
                              <td style={{ padding: "0.75rem", fontSize: "0.9rem" }}>
                                {u.gamesWon || 0} 🏆 / {u.gamesPlayed || 0} 🎮
                              </td>
                              <td style={{ padding: "0.75rem", textAlign: "right" }}>
                                <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                                  <button
                                    onClick={() => {
                                      setEditingUser(u);
                                      setEditForm({
                                        name: u.name,
                                        xp: u.xp || 0,
                                        level: u.level || 1,
                                        gamesPlayed: u.gamesPlayed || 0,
                                        gamesWon: u.gamesWon || 0
                                      });
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem" }}
                                  >
                                    ✏️ Modifier
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u.firebaseId, u.name)}
                                    className="btn btn-secondary"
                                    style={{ padding: "0.35rem 0.7rem", fontSize: "0.8rem", color: "var(--danger)", borderColor: "var(--danger)" }}
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ---------------- 3. LISTS MANAGEMENT TAB ---------------- */}
              {activeTab === "lists" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="🔍 Rechercher une liste par nom ou créateur..."
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      style={{ margin: 0, flex: 1, minWidth: "200px", padding: "0.7rem 1rem" }}
                    />
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      {["all", "public", "private"].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setListFilter(filter)}
                          className={`btn ${listFilter === filter ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "0.5rem 0.9rem", fontSize: "0.85rem" }}
                        >
                          {filter === "all" ? "Toutes" : filter === "public" ? "Publiques" : "Privées"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                    {filteredLists.length === 0 ? (
                      <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        Aucune liste trouvée.
                      </div>
                    ) : (
                      filteredLists.map((l) => (
                        <div key={l._id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.8rem", position: "relative" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                            <h4 style={{ margin: 0, fontSize: "1.05rem" }}>{l.name}</h4>
                            <span style={{
                              padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold",
                              background: l.isPublic ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.1)",
                              color: l.isPublic ? "#f59e0b" : "var(--text-muted)"
                            }}>
                              {l.isPublic ? "Publique" : "Privée"}
                            </span>
                          </div>

                          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Créée par <strong style={{ color: "var(--text-main)" }}>{l.creatorName || "Utilisateur"}</strong> • {l.words?.length || 0} mots
                          </div>

                          <div style={{ display: "flex", gap: "0.4rem", marginTop: "auto", flexWrap: "wrap" }}>
                            <button
                              onClick={() => setInspectingList(l)}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              👁️ Voir
                            </button>
                            <button
                              onClick={() => {
                                setEditingList(l);
                                setEditListForm({ name: l.name, words: l.words || [] });
                              }}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.8rem" }}
                            >
                              ✏️ Éditer
                            </button>
                            <button
                              onClick={() => handleToggleListPublic(l._id, l.isPublic)}
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: "0.4rem 0.6rem", fontSize: "0.8rem", color: l.isPublic ? "#f59e0b" : "inherit" }}
                            >
                              {l.isPublic ? "Rendre Privée" : "Rendre Publique"}
                            </button>
                            <button
                              onClick={() => handleDeleteList(l._id, l.name)}
                              className="btn btn-secondary"
                              style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", color: "var(--danger)", borderColor: "var(--danger)" }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ---------------- 4. SYSTEM & SETTINGS TAB ---------------- */}
              {activeTab === "settings" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Guest Mode Setting */}
                  <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "1rem" }}>👤 Mode Invité Global</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                        Permet aux apprenants d'utiliser l'application sans connexion Google obligatoire.
                      </div>
                    </div>
                    <button
                      onClick={() => toggleConfig("guestMode", config.guestMode)}
                      disabled={saving === "guestMode"}
                      style={{
                        flexShrink: 0, width: "58px", height: "30px", borderRadius: "15px",
                        background: config.guestMode ? "var(--success)" : "rgba(255,255,255,0.15)",
                        border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s"
                      }}
                    >
                      <span style={{
                        position: "absolute", top: "3px",
                        left: config.guestMode ? "30px" : "3px",
                        width: "24px", height: "24px", borderRadius: "50%",
                        background: "white", transition: "left 0.3s", display: "block"
                      }} />
                    </button>
                  </div>

                  {/* Maintenance Mode Setting */}
                  <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.2rem" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "1rem" }}>🚧 Mode Maintenance</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                        Indique que l'application est en maintenance aux utilisateurs.
                      </div>
                    </div>
                    <button
                      onClick={() => toggleConfig("maintenanceMode", config.maintenanceMode)}
                      disabled={saving === "maintenanceMode"}
                      style={{
                        flexShrink: 0, width: "58px", height: "30px", borderRadius: "15px",
                        background: config.maintenanceMode ? "var(--danger)" : "rgba(255,255,255,0.15)",
                        border: "none", cursor: "pointer", position: "relative", transition: "background 0.3s"
                      }}
                    >
                      <span style={{
                        position: "absolute", top: "3px",
                        left: config.maintenanceMode ? "30px" : "3px",
                        width: "24px", height: "24px", borderRadius: "50%",
                        background: "white", transition: "left 0.3s", display: "block"
                      }} />
                    </button>
                  </div>

                  {/* Broadcast Announcement */}
                  <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "1.2rem" }}>
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "1rem" }}>📢 Message Flash / Annonce aux Joueurs</div>
                      <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                        Diffusez un message en direct sous forme de bannière visible par tous les joueurs connectés.
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.8rem" }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ex: Tournoi spécial ce soir à 20h ! 🚀"
                        value={announcementText}
                        onChange={(e) => setAnnouncementText(e.target.value)}
                        style={{ margin: 0, flex: 1 }}
                      />
                      <button
                        onClick={saveAnnouncement}
                        disabled={saving === "announcement"}
                        className="btn btn-primary"
                        style={{ padding: "0.7rem 1.2rem", width: "auto" }}
                      >
                        {saving === "announcement" ? "Envoi..." : "Diffuser"}
                      </button>
                    </div>
                  </div>

                  {/* Targeted / Global Notification Dispatcher */}
                  <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.2rem", padding: "1.4rem", background: "linear-gradient(135deg, rgba(99,102,241,0.08), transparent)", border: "1px solid rgba(99,102,241,0.3)" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.4rem" }}>📬</span>
                        <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#a78bfa" }}>Envoyer une Notification aux Utilisateurs</h3>
                      </div>
                      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: "0.3rem 0 0 0" }}>
                        Envoyez une notification persistante dans la boîte de réception des joueurs (globale ou ciblée).
                      </p>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1rem" }}>
                      <div>
                        <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                          Titre de la notification :
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Ex: 🎉 Nouveau défi de vocabulaire disponible !"
                          value={notifForm.title}
                          onChange={(e) => setNotifForm(prev => ({ ...prev, title: e.target.value }))}
                          style={{ margin: 0 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                          Type / Icône :
                        </label>
                        <select
                          className="input-field"
                          value={notifForm.icon}
                          onChange={(e) => {
                            const icon = e.target.value;
                            const type = icon === "🎁" ? "reward" : icon === "🏆" ? "tournament" : icon === "⚠️" ? "alert" : "announcement";
                            setNotifForm(prev => ({ ...prev, icon, type }));
                          }}
                          style={{ margin: 0, padding: "0.7rem 1rem", fontSize: "1rem" }}
                        >
                          <option value="📢">📢 Annonce</option>
                          <option value="🎁">🎁 Récompense</option>
                          <option value="🏆">🏆 Tournoi / Défi</option>
                          <option value="⚠️">⚠️ Alerte</option>
                          <option value="💡">💡 Astuce</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>
                        Message détaillé :
                      </label>
                      <textarea
                        className="input-field"
                        rows={3}
                        placeholder="Rédigez le texte de la notification ici..."
                        value={notifForm.message}
                        onChange={(e) => setNotifForm(prev => ({ ...prev, message: e.target.value }))}
                        style={{ margin: 0, resize: "vertical" }}
                      />
                    </div>

                    {/* Target Selector */}
                    <div>
                      <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.5rem" }}>
                        Destinataires :
                      </label>
                      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "0.8rem" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                          <input
                            type="radio"
                            name="notifTarget"
                            checked={notifForm.targetType === "all"}
                            onChange={() => setNotifForm(prev => ({ ...prev, targetType: "all", selectedUserIds: [] }))}
                          />
                          <span>🌐 <strong>Tous les utilisateurs</strong> (Global)</span>
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
                          <input
                            type="radio"
                            name="notifTarget"
                            checked={notifForm.targetType === "specific"}
                            onChange={() => setNotifForm(prev => ({ ...prev, targetType: "specific" }))}
                          />
                          <span>👤 <strong>Sélectionner des utilisateurs</strong> ({notifForm.selectedUserIds.length} sélectionné{notifForm.selectedUserIds.length > 1 ? 's' : ''})</span>
                        </label>
                      </div>

                      {/* Specific user selection box */}
                      {notifForm.targetType === "specific" && (
                        <div style={{
                          background: "var(--bg-main)", border: "1px solid var(--border-color)",
                          borderRadius: "12px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.8rem"
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="🔍 Filtrer les utilisateurs par nom..."
                              value={notifUserSearch}
                              onChange={(e) => setNotifUserSearch(e.target.value)}
                              style={{ margin: 0, flex: 1, minWidth: "180px", padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                            />
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                type="button"
                                onClick={() => {
                                  const allIds = users.map(u => u.firebaseId);
                                  setNotifForm(prev => ({ ...prev, selectedUserIds: allIds }));
                                }}
                                className="btn btn-secondary"
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                              >
                                Tout cocher
                              </button>
                              <button
                                type="button"
                                onClick={() => setNotifForm(prev => ({ ...prev, selectedUserIds: [] }))}
                                className="btn btn-secondary"
                                style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
                              >
                                Décocher
                              </button>
                            </div>
                          </div>

                          <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                            {users
                              .filter(u => u.name?.toLowerCase().includes(notifUserSearch.toLowerCase()))
                              .map(u => {
                                const isChecked = notifForm.selectedUserIds.includes(u.firebaseId);
                                return (
                                  <label
                                    key={u.firebaseId}
                                    style={{
                                      display: "flex", alignItems: "center", justifyContent: "space-between",
                                      padding: "0.4rem 0.6rem", borderRadius: "8px",
                                      background: isChecked ? "rgba(99,102,241,0.15)" : "transparent",
                                      cursor: "pointer", fontSize: "0.85rem"
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {
                                          setNotifForm(prev => {
                                            const current = new Set(prev.selectedUserIds);
                                            if (current.has(u.firebaseId)) current.delete(u.firebaseId);
                                            else current.add(u.firebaseId);
                                            return { ...prev, selectedUserIds: Array.from(current) };
                                          });
                                        }}
                                      />
                                      <span style={{ fontWeight: "bold" }}>{formatPlayerName(u.name)}</span>
                                    </div>
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                                      Lvl {u.level || 1} • {u.xp || 0} pts
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSendNotification}
                      disabled={saving === "send_notif"}
                      className="btn btn-primary"
                      style={{ padding: "0.8rem 1.5rem", fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
                    >
                      {saving === "send_notif" ? "⏳ Envoi en cours..." : "🚀 Envoyer la Notification"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Inspect List Words Modal */}
        {inspectingList && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100,
            display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem"
          }}>
            <div className="card" style={{ width: "100%", maxWidth: "600px", maxHeight: "80vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>📚 {inspectingList.name} ({inspectingList.words?.length} mots)</h3>
                <button onClick={() => setInspectingList(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      <th style={{ padding: "0.5rem" }}>#</th>
                      <th style={{ padding: "0.5rem" }}>Question (FR/EN)</th>
                      <th style={{ padding: "0.5rem" }}>Réponse (Allemand)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectingList.words?.map((w, idx) => (
                      <tr key={w.id || idx} style={{ borderBottom: "1px solid var(--border-color)", fontSize: "0.9rem" }}>
                        <td style={{ padding: "0.5rem", color: "var(--text-muted)" }}>{idx + 1}</td>
                        <td style={{ padding: "0.5rem" }}>{w.question}</td>
                        <td style={{ padding: "0.5rem", fontWeight: "bold", color: "var(--primary)" }}>{w.answer}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button onClick={() => setInspectingList(null)} className="btn btn-secondary" style={{ marginTop: "0.5rem" }}>Fermer</button>
            </div>
          </div>
        )}

        {/* Edit List Modal */}
        {editingList && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100,
            display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem"
          }}>
            <div className="card" style={{ width: "100%", maxWidth: "650px", maxHeight: "85vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>✏️ Modifier la Liste</h3>
                <button onClick={() => setEditingList(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Nom de la liste :</label>
                <input
                  type="text"
                  className="input-field"
                  value={editListForm.name}
                  onChange={(e) => setEditListForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      <th style={{ padding: "0.5rem" }}>Question</th>
                      <th style={{ padding: "0.5rem" }}>Réponse</th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editListForm.words.map((w, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={{ padding: "0.4rem" }}>
                          <input
                            type="text"
                            value={w.question}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditListForm(prev => ({
                                ...prev,
                                words: prev.words.map((item, i) => i === idx ? { ...item, question: val } : item)
                              }));
                            }}
                            className="input-field"
                            style={{ margin: 0, padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                          />
                        </td>
                        <td style={{ padding: "0.4rem" }}>
                          <input
                            type="text"
                            value={w.answer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEditListForm(prev => ({
                                ...prev,
                                words: prev.words.map((item, i) => i === idx ? { ...item, answer: val } : item)
                              }));
                            }}
                            className="input-field"
                            style={{ margin: 0, padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                          />
                        </td>
                        <td style={{ padding: "0.4rem", textAlign: "center" }}>
                          <button
                            onClick={() => {
                              setEditListForm(prev => ({
                                ...prev,
                                words: prev.words.filter((_, i) => i !== idx)
                              }));
                            }}
                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "1.1rem" }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={() => {
                  setEditListForm(prev => ({
                    ...prev,
                    words: [...prev.words, { id: Date.now(), question: "", answer: "" }]
                  }));
                }}
                className="btn btn-secondary"
                style={{ padding: "0.5rem" }}
              >
                + Ajouter un mot
              </button>

              <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem" }}>
                <button onClick={() => setEditingList(null)} className="btn btn-secondary" style={{ flex: 1 }}>Annuler</button>
                <button onClick={handleSaveListEdit} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving === "list_edit" ? "Enregistrement..." : "Sauvegarder"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100,
            display: "flex", justifyContent: "center", alignItems: "center", padding: "1rem"
          }}>
            <div className="card" style={{ width: "100%", maxWidth: "450px", display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>✏️ Modifier l'utilisateur</h3>
                <button onClick={() => setEditingUser(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.5rem", cursor: "pointer" }}>×</button>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Pseudo :</label>
                <input
                  type="text"
                  className="input-field"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>XP Total :</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editForm.xp}
                    onChange={(e) => setEditForm(prev => ({ ...prev, xp: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Niveau :</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editForm.level}
                    onChange={(e) => setEditForm(prev => ({ ...prev, level: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Parties Jouées :</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editForm.gamesPlayed}
                    onChange={(e) => setEditForm(prev => ({ ...prev, gamesPlayed: e.target.value }))}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginBottom: "0.3rem" }}>Victoires :</label>
                  <input
                    type="number"
                    className="input-field"
                    value={editForm.gamesWon}
                    onChange={(e) => setEditForm(prev => ({ ...prev, gamesWon: e.target.value }))}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.8rem", marginTop: "0.5rem" }}>
                <button onClick={() => setEditingUser(null)} className="btn btn-secondary" style={{ flex: 1 }}>Annuler</button>
                <button onClick={handleSaveUserEdit} className="btn btn-primary" style={{ flex: 1 }}>
                  {saving === "user_edit" ? "Enregistrement..." : "Sauvegarder"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
