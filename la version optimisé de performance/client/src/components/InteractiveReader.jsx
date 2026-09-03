import { useState } from "react";
import { INTERACTIVE_TEXTS } from "../data/interactiveTexts";

export default function InteractiveReader({ onLaunchQuizWithWords, onSaveList }) {
  const [selectedTextIndex, setSelectedTextIndex] = useState(0);
  const [activeWordInfo, setActiveWordInfo] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showFullTranslation, setShowFullTranslation] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const textObj = INTERACTIVE_TEXTS[selectedTextIndex] || INTERACTIVE_TEXTS[0];

  const playWordAudio = (word) => {
    try {
      const clean = word.replace(/[^a-zA-ZäöüÄÖÜß-]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "de-DE";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error(e);
    }
  };

  const playFullParagraph = () => {
    try {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(textObj.audioText);
      utterance.lang = "de-DE";
      utterance.rate = 0.9;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error(e);
      setIsPlayingAudio(false);
    }
  };

  const handleWordClick = (rawWord) => {
    const cleanWord = rawWord.replace(/[^a-zA-ZäöüÄÖÜß-]/g, '');
    const entry = textObj.dictionary[cleanWord] || textObj.dictionary[rawWord];
    
    playWordAudio(cleanWord);

    if (entry) {
      setActiveWordInfo({
        word: cleanWord,
        article: entry.art || '',
        translation: entry.tr,
        pos: entry.pos || 'Mot',
        infinitive: entry.inf || ''
      });
    } else {
      setActiveWordInfo({
        word: cleanWord,
        translation: "Cliquer pour écouter la prononciation",
        pos: "Vocabulaire"
      });
    }
  };

  const handleSaveAsCustomList = () => {
    if (!onSaveList) return;
    const words = Object.entries(textObj.dictionary).map(([w, data], idx) => ({
      id: idx + 1,
      question: data.tr,
      answer: data.art ? `${data.art} ${w}` : w
    }));
    onSaveList(textObj.title, words);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleLaunchQuiz = () => {
    if (!onLaunchQuizWithWords) return;
    const words = Object.entries(textObj.dictionary).map(([w, data], idx) => ({
      id: idx + 1,
      question: data.tr,
      answer: data.art ? `${data.art} ${w}` : w
    }));
    onLaunchQuizWithWords(words, textObj.title);
  };

  const wordsArray = textObj.audioText.split(" ");

  return (
    <div className="interactive-reader-container animate-fade-in">
      <div className="reader-top-selector">
        <div className="reader-tabs-scroll">
          {INTERACTIVE_TEXTS.map((t, idx) => (
            <button
              key={t.id}
              className={`reader-tab-btn ${idx === selectedTextIndex ? 'active' : ''}`}
              onClick={() => {
                setSelectedTextIndex(idx);
                setActiveWordInfo(null);
                setShowFullTranslation(false);
              }}
            >
              <span className="reader-tab-badge">{t.level}</span>
              <span className="reader-tab-title">{t.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="reader-main-card glass-panel">
        <div className="reader-card-header">
          <div>
            <span className="reader-category-tag">{textObj.category}</span>
            <h2 className="reader-main-title">{textObj.title}</h2>
          </div>
          <div className="reader-audio-controls">
            <button 
              className={`btn-reader-audio ${isPlayingAudio ? 'playing animate-pulse' : ''}`}
              onClick={playFullParagraph}
            >
              {isPlayingAudio ? "⏹️ Stopper l'audio" : "🔊 Écouter le texte"}
            </button>
          </div>
        </div>

        <div className="reader-instruction-banner">
          💡 <em>Clique sur n'importe quel mot pour entendre sa prononciation et voir sa traduction instantanée !</em>
        </div>

        {/* Interactive Words Passage */}
        <div className="reader-passage-box">
          <p className="reader-interactive-text">
            {wordsArray.map((w, idx) => {
              const clean = w.replace(/[^a-zA-ZäöüÄÖÜß-]/g, '');
              const hasDef = Boolean(textObj.dictionary[clean] || textObj.dictionary[w]);
              return (
                <span
                  key={idx}
                  className={`reader-word-token ${hasDef ? 'has-def' : ''} ${activeWordInfo?.word === clean ? 'active-word' : ''}`}
                  onClick={() => handleWordClick(w)}
                >
                  {w}{" "}
                </span>
              );
            })}
          </p>
        </div>

        {/* Word Info Inspector Card */}
        {activeWordInfo && (
          <div className="reader-word-popover glass-panel animate-scale-up">
            <div className="word-popover-header">
              <div className="word-popover-title-row">
                {activeWordInfo.article && <span className="word-art-tag">{activeWordInfo.article}</span>}
                <span className="word-popover-word">{activeWordInfo.word}</span>
                <button className="btn-audio-mini" onClick={() => playWordAudio(activeWordInfo.word)}>🔊</button>
              </div>
              <span className="word-pos-badge">{activeWordInfo.pos}</span>
            </div>
            <div className="word-popover-body">
              <p className="word-translation">🇫🇷 <strong>{activeWordInfo.translation}</strong></p>
              {activeWordInfo.infinitive && (
                <p className="word-inf-note">Infinitif : <em>{activeWordInfo.infinitive}</em></p>
              )}
            </div>
          </div>
        )}

        {/* Translation Toggle */}
        <div className="reader-translation-section">
          <button 
            className="btn-toggle-translation"
            onClick={() => setShowFullTranslation(!showFullTranslation)}
          >
            {showFullTranslation ? "Masquer la traduction française ✕" : "Afficher la traduction française intégrale 👁️"}
          </button>
          
          {showFullTranslation && (
            <div className="reader-french-box animate-slide-down">
              <p>{textObj.frenchTranslation}</p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="reader-footer-actions">
          <button className="btn-secondary" onClick={handleSaveAsCustomList}>
            {savedSuccess ? "✅ Liste sauvegardée !" : "💾 Enregistrer en liste de révision"}
          </button>
          <button className="btn-primary" onClick={handleLaunchQuiz}>
            🚀 Lancer un Quiz sur ce texte
          </button>
        </div>
      </div>
    </div>
  );
}
