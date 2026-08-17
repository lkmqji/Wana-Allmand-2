import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{
              padding: '0.8rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              background: '#6366f1',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            🔄 Recharger l'application
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
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
