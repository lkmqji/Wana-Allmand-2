import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const ADMIN_UID = import.meta.env.VITE_ADMIN_UID;

export default function Admin({ user, onClose }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [message, setMessage] = useState("");

  const isAdmin = user && ADMIN_UID && user.uid === ADMIN_UID;

  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(r => r.json())
      .then(data => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggle = async (setting, currentValue) => {
    setSaving(setting);
    setMessage("");
    try {
      const res = await fetch(`${API_URL}/api/admin/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: user.uid, setting, value: !currentValue })
      });
      const data = await res.json();
      if (data.success) {
        setConfig(prev => ({ ...prev, [setting]: !currentValue }));
        setMessage("✅ Sauvegardé !");
      } else {
        setMessage("❌ Erreur : " + (data.error || "inconnu"));
      }
    } catch {
      setMessage("❌ Erreur réseau.");
    }
    setSaving(null);
    setTimeout(() => setMessage(""), 3000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 1000,
      display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "2rem 1rem", overflowY: "auto"
    }}>
      <div style={{ width: "100%", maxWidth: "500px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", background: "linear-gradient(135deg, #6366f1, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              🛡️ Panneau Admin
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "0.3rem 0 0 0", fontSize: "0.85rem" }}>Gestion de WANA ALLMAND</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "1.8rem", cursor: "pointer" }}>×</button>
        </div>

        {/* UID Info */}
        <div style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: "12px", padding: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem" }}>Ton Firebase UID (copie-le pour configurer VITE_ADMIN_UID) :</div>
          <code style={{ fontSize: "0.85rem", color: "#a78bfa", wordBreak: "break-all" }}>{user?.uid || "Non connecté"}</code>
        </div>

        {!isAdmin ? (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "1.5rem", textAlign: "center" }}>
            <span style={{ fontSize: "2rem" }}>🚫</span>
            <h3 style={{ color: "var(--danger)", margin: "0.5rem 0" }}>Accès refusé</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>
              {!user ? "Connecte-toi d'abord." : !ADMIN_UID ? "Configure VITE_ADMIN_UID dans Vercel." : "Ton compte n'est pas administrateur."}
            </p>
          </div>
        ) : loading ? (
          <p style={{ color: "var(--text-muted)", textAlign: "center" }}>Chargement...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--text-muted)", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "1px" }}>Paramètres</h3>

            {/* Guest Mode Toggle */}
            <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "14px", padding: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <div>
                <div style={{ fontWeight: "bold", fontSize: "1rem" }}>👤 Mode Invité</div>
                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
                  Permet aux utilisateurs d'accéder sans connexion Google.
                </div>
              </div>
              <button
                onClick={() => toggle("guestMode", config.guestMode)}
                disabled={saving === "guestMode"}
                style={{
                  flexShrink: 0,
                  width: "58px", height: "30px",
                  borderRadius: "15px",
                  background: config.guestMode ? "var(--success)" : "rgba(255,255,255,0.15)",
                  border: "none", cursor: "pointer",
                  position: "relative", transition: "background 0.3s"
                }}
              >
                <span style={{
                  position: "absolute", top: "3px",
                  left: config.guestMode ? "30px" : "3px",
                  width: "24px", height: "24px",
                  borderRadius: "50%", background: "white",
                  transition: "left 0.3s", display: "block"
                }} />
              </button>
            </div>

            {message && (
              <div style={{ textAlign: "center", padding: "0.6rem", borderRadius: "8px", background: message.startsWith("✅") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", color: message.startsWith("✅") ? "var(--success)" : "var(--danger)", fontWeight: "bold" }}>
                {message}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
