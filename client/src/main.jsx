import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AudioProvider } from './context/AudioContext'
import { registerSW } from 'virtual:pwa-register'
import { Agentation } from 'agentation'

// Force PWA Service Worker auto-update immediately
registerSW({ immediate: true })


class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#111827',
          color: '#f9fafb',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'Outfit, sans-serif'
        }}>
          <h1 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '2rem' }}>⚠️ Une erreur est survenue</h1>
          <p style={{ color: '#9ca3af', maxWidth: '500px', marginBottom: '1.5rem' }}>
            {this.state.error?.message || "Impossible de charger l'application."}
          </p>
          <button
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const registrations = await navigator.serviceWorker.getRegistrations();
                  for (const reg of registrations) {
                    await reg.unregister();
                  }
                }
                if ('caches' in window) {
                  const cacheKeys = await caches.keys();
                  for (const key of cacheKeys) {
                    await caches.delete(key);
                  }
                }
              } catch (err) {
                console.warn('Error clearing caches:', err);
              }
              localStorage.clear();
              sessionStorage.clear();
              window.location.href = window.location.origin + window.location.pathname + '?nocache=' + Date.now();
            }}
            style={{
              padding: '0.85rem 1.6rem',
              borderRadius: '12px',
              border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #ec4899)',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1rem',
              boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
            }}
          >
            🔄 Recharger l'application (Vider le cache)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AudioProvider>
        <App />
        {import.meta.env.DEV && <Agentation />}
      </AudioProvider>
    </ErrorBoundary>
  </StrictMode>,
)
