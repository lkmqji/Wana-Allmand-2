import React, { useState, useRef } from 'react';

export default function AIGeneratorView({ onBack, onSessionReady }) {
  const [textMode, setTextMode] = useState(false);
  const [rawText, setRawText] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const [options, setOptions] = useState({
    sourceLang: 'Français / English / العربية',
    targetLang: 'Allemand',
    excludeProperNouns: true,
    excludeLocations: true,
    excludeBasicGrammar: true,
    includeArticles: true,
    includePlurals: true
  });

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleExtract = async () => {
    if (!rawText.trim() && !selectedFile) {
      alert("Veuillez fournir un texte ou un fichier.");
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    if (selectedFile) {
      formData.append('file', selectedFile);
    }
    if (rawText.trim()) {
      formData.append('rawText', rawText);
    }
    formData.append('options', JSON.stringify(options));

    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.vocabList && data.vocabList.length > 0) {
        onSessionReady(data.vocabList, data.detectedInfo);
      } else {
        alert(data.error || "Aucun vocabulaire extrait. Essayez avec un autre document.");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'extraction IA. Vérifiez la connexion.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button 
          onClick={onBack}
          style={{ background: 'var(--card-bg)', border: 'none', padding: '0.6rem 1rem', borderRadius: '12px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        >
          <span>⬅️</span> Retour
        </button>
        <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Générateur IA
        </h2>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
        Importez un document (PDF, Image, etc.) ou collez du texte, notre IA extraira le vocabulaire automatiquement avec traduction, articles et gestion des pluriels.
      </p>

      {/* Main Form */}
      <div className="card" style={{ padding: '2rem' }}>
        
        {/* Toggle Mode */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button 
            onClick={() => setTextMode(false)}
            style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: !textMode ? '2px solid var(--primary)' : '2px solid transparent', background: !textMode ? 'rgba(99, 102, 241, 0.1)' : 'var(--card-bg-light)', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            📄 Fichier (PDF, Image)
          </button>
          <button 
            onClick={() => setTextMode(true)}
            style={{ flex: 1, padding: '1rem', borderRadius: '12px', border: textMode ? '2px solid var(--primary)' : '2px solid transparent', background: textMode ? 'rgba(99, 102, 241, 0.1)' : 'var(--card-bg-light)', color: '#fff', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            📝 Coller du Texte
          </button>
        </div>

        {/* Input Area */}
        {textMode ? (
          <div>
            <textarea 
              className="input-field" 
              placeholder="Collez votre texte ici (allemand ou français)..."
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              style={{ width: '100%', fontSize: '0.95rem', resize: 'vertical' }}
            />
          </div>
        ) : (
          <div 
            onDragOver={handleDragOver} 
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--primary)',
              borderRadius: '16px',
              padding: '3rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(99, 102, 241, 0.05)',
              transition: 'background 0.2s',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}
          >
            <span style={{ fontSize: '3rem' }}>{selectedFile ? '✅' : '📤'}</span>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: '1.2rem', color: '#fff' }}>
                {selectedFile ? selectedFile.name : 'Glissez-déposez votre fichier ici'}
              </p>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : 'Formats supportés: PDF, PNG, JPG, TXT'}
              </p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.txt,.doc,.docx"
            />
          </div>
        )}

        {/* Options */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--card-bg-light)', borderRadius: '12px' }}>
          <h4 style={{ margin: '0 0 1rem 0' }}>Options de filtrage IA</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={options.excludeProperNouns} onChange={e => setOptions({...options, excludeProperNouns: e.target.checked})} />
              Ignorer les prénoms (Lisa, Max)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={options.excludeLocations} onChange={e => setOptions({...options, excludeLocations: e.target.checked})} />
              Ignorer les villes/pays
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={options.excludeBasicGrammar} onChange={e => setOptions({...options, excludeBasicGrammar: e.target.checked})} />
              Ignorer grammaire basique
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <input type="checkbox" checked={options.includeArticles} onChange={e => setOptions({...options, includeArticles: e.target.checked})} />
              Inclure articles (der, die, das)
            </label>
          </div>
        </div>

        {/* Action Button */}
        <button 
          className="btn btn-primary" 
          onClick={handleExtract}
          disabled={isProcessing || (!rawText.trim() && !selectedFile)}
          style={{ width: '100%', marginTop: '2rem', padding: '1.2rem', fontSize: '1.2rem', fontWeight: 800, display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
        >
          {isProcessing ? '✨ Analyse par l\'IA en cours...' : '✨ Extraire le Vocabulaire'}
        </button>

      </div>
    </div>
  );
}
