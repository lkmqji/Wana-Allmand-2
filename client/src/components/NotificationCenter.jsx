import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function NotificationCenter({ user, socket, isOpen, onClose, unreadCount, setUnreadCount, notifications, setNotifications }) {
  const [loading, setLoading] = useState(false);

  const userId = user?.uid || "guest";

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/notifications/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid })
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid })
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await fetch(`${API_URL}/api/notifications/${id}`, { method: "DELETE" });
      setNotifications(prev => {
        const removed = prev.find(n => n._id === id);
        if (removed && !removed.isRead) {
          setUnreadCount(c => Math.max(0, c - 1));
        }
        return prev.filter(n => n._id !== id);
      });
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return "Hier";
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1250, alignItems: "flex-start", paddingTop: "4rem" }}>
      <div 
        className="modal-content animate-scale-up"
        style={{
          width: "100%", maxWidth: "520px",
          overflow: "hidden",
          display: "flex", flexDirection: "column", maxHeight: "85vh",
          padding: 0
        }}
      >
        {/* Header */}
        <div style={{
          padding: "1.2rem 1.5rem", borderBottom: "1px solid var(--border-color)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "linear-gradient(to right, rgba(99,102,241,0.12), transparent)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ fontSize: "1.4rem" }}>🔔</span>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Notifications</h2>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : "Toutes lues"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            {user && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "transparent", border: "none", color: "var(--primary)",
                  fontSize: "0.8rem", fontWeight: "bold", cursor: "pointer", textDecoration: "underline"
                }}
              >
                Tout marquer comme lu
              </button>
            )}
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.8rem", cursor: "pointer", lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div style={{ padding: "1rem 1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.8rem", flex: 1 }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {[1, 2, 3].map((k) => (
                <div key={k} className="skeleton-card" style={{ padding: "0.9rem 1rem", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div className="skeleton-avatar skeleton-loading" style={{ width: "28px", height: "28px", minWidth: "28px" }} />
                    <div className="skeleton-text skeleton-loading" style={{ width: "40%", height: "14px" }} />
                  </div>
                  <div className="skeleton-text skeleton-loading" style={{ width: "90%", height: "12px" }} />
                  <div className="skeleton-text skeleton-loading" style={{ width: "25%", height: "10px" }} />
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📭</div>
              <div style={{ fontWeight: "bold", fontSize: "1rem", color: "var(--text-main)" }}>Aucune notification</div>
              <p style={{ margin: "0.3rem 0 0 0", fontSize: "0.85rem" }}>Vous êtes parfaitement à jour !</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif._id}
                style={{
                  padding: "1rem",
                  borderRadius: "14px",
                  background: notif.isRead ? "var(--bg-main)" : "rgba(99,102,241,0.1)",
                  border: notif.isRead ? "1px solid var(--border-color)" : "1px solid rgba(99,102,241,0.4)",
                  display: "flex",
                  gap: "0.8rem",
                  alignItems: "flex-start",
                  transition: "all 0.2s"
                }}
              >
                <span style={{ fontSize: "1.6rem", flexShrink: 0, marginTop: "2px" }}>
                  {notif.icon || "📢"}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-main)" }}>
                      {notif.title}
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", flexShrink: 0 }}>
                      {formatTime(notif.createdAt)}
                    </span>
                  </div>

                  <p style={{ margin: "0.3rem 0 0.5rem 0", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4, wordBreak: "break-word" }}>
                    {notif.message}
                  </p>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                    {user && !notif.isRead && (
                      <button
                        onClick={() => markAsRead(notif._id)}
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem" }}
                      >
                        ✓ Vu
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notif._id)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer", padding: "0.2rem" }}
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.8rem 1.5rem", borderTop: "1px solid var(--border-color)", textAlign: "center" }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ width: "100%", padding: "0.6rem" }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
