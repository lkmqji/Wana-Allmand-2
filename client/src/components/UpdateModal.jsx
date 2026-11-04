import React from 'react';
import { createPortal } from 'react-dom';
import { openUpdateDownload, dismissVersion } from '../services/updateService';

/**
 * Render formatted markdown-like release notes (bullet points, bold, headers)
 */
function renderReleaseNotes(text) {
  if (!text) return null;
  const lines = text.split('\n');

  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} style={{ height: '0.4rem' }} />;

    // Headers
    if (trimmed.startsWith('###')) {
      return (
        <h4 key={idx} style={{ color: '#38bdf8', fontSize: '0.92rem', margin: '0.6rem 0 0.25rem 0', fontWeight: 800 }}>
          {trimmed.replace(/^###\s*/, '')}
        </h4>
      );
    }
    if (trimmed.startsWith('##')) {
      return (
        <h3 key={idx} style={{ color: '#00d4ff', fontSize: '1rem', margin: '0.8rem 0 0.3rem 0', fontWeight: 900 }}>
          {trimmed.replace(/^##\s*/, '')}
        </h3>
      );
    }
    if (trimmed.startsWith('#')) {
      return (
        <h2 key={idx} style={{ color: '#ffffff', fontSize: '1.05rem', margin: '0.9rem 0 0.35rem 0', fontWeight: 900 }}>
          {trimmed.replace(/^#\s*/, '')}
        </h2>
      );
    }

    // Bullet points
    if (/^[-*•]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*•]\s+/, '');
      return (
        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', fontSize: '0.86rem', color: '#cbd5e1', lineHeight: 1.5, margin: '0.2rem 0' }}>
          <span style={{ color: '#00d4ff', fontSize: '0.8rem', marginTop: '0.15rem' }}>▪</span>
          <span>{content}</span>
        </div>
      );
    }

    return (
      <p key={idx} style={{ fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5, margin: '0.25rem 0' }}>
        {trimmed}
      </p>
    );
  });
}

export default function UpdateModal({
  updateInfo,
  onClose
}) {
  if (!updateInfo || !updateInfo.updateAvailable) return null;

  const handleDownload = () => {
    openUpdateDownload(updateInfo.downloadUrl);
  };

  const handleDismissPermanent = () => {
    dismissVersion(updateInfo.latestVersion);
    if (onClose) onClose();
  };

  const formattedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : null;

  const modalContent = (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 9, 20, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      zIndex: 999999,
      animation: 'overlayFadeIn 0.25s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, #0d1527, #070b14)',
        border: '1.5px solid rgba(0, 212, 255, 0.4)',
        boxShadow: '0 12px 40px rgba(0, 212, 255, 0.25), 0 0 100px rgba(99, 102, 241, 0.15)',
        borderRadius: '20px',
        maxWidth: '520px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header with Glowing Badge */}
        <div style={{
          padding: '1.2rem 1.4rem 0.8rem 1.4rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(255, 255, 255, 0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.6rem', filter: 'drop-shadow(0 0 8px rgba(0,212,255,0.6))' }}>🚀</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#ffffff', letterSpacing: '0.4px' }}>
                  Mise à Jour Disponible !
                </h3>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Wana Allmand sur GitHub Releases
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                color: '#cbd5e1',
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              title="Fermer"
            >
              ✕
            </button>
          </div>

          {/* Version Pills: Current -> New */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            <span style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#94a3b8',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              fontSize: '0.76rem',
              fontWeight: 700
            }}>
              Actuelle : {updateInfo.currentVersionName || updateInfo.currentVersion}
            </span>
            <span style={{ color: '#00d4ff', fontSize: '0.85rem', fontWeight: 900 }}>➔</span>
            <span style={{
              background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.25), rgba(99, 102, 241, 0.2))',
              border: '1.5px solid #00d4ff',
              color: '#38bdf8',
              padding: '0.25rem 0.75rem',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: 900,
              boxShadow: '0 0 14px rgba(0, 212, 255, 0.35)'
            }}>
              Nouvelle : {updateInfo.latestVersion}
            </span>

            {updateInfo.apkSizeMb && (
              <span style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                📦 {updateInfo.apkSizeMb} Mo
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Changelog / Release Notes */}
        <div style={{
          padding: '1.1rem 1.4rem',
          overflowY: 'auto',
          flex: 1,
          maxHeight: '45vh',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {updateInfo.releaseName || 'Nouveautés'}
            </div>
            {formattedDate && (
              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                {formattedDate}
              </div>
            )}
          </div>

          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '0.9rem',
            lineHeight: 1.5
          }}>
            {renderReleaseNotes(updateInfo.releaseNotes)}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.4rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(7, 11, 20, 0.8)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.65rem'
        }}>
          <button
            type="button"
            onClick={handleDownload}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.95rem',
              fontWeight: 900,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #00d4ff, #6366f1)',
              boxShadow: '0 0 20px rgba(0, 212, 255, 0.45)',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <span>📥</span>
            <span>Télécharger la mise à jour (APK)</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={handleDismissPermanent}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.76rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '4px'
              }}
              title="Ne plus afficher la notification pour cette version"
            >
              Ignorer cette version
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#cbd5e1',
                borderRadius: '8px',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
