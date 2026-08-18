import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const QUICK_PROMPTS = [
  "💡 Explique-moi la différence entre Akkusativ et Dativ",
  "🎯 Comment retenir facilement der, die et das ?",
  "🩺 Donne-moi 5 expressions médicales essentielles",
  "📝 Comment conjuguer les verbes forts au passé ?",
  "🗣️ Comment prononcer correctement les voyelles à tréma (ä, ö, ü) ?"
];

export default function AITutorModal({ isOpen, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hallo ! 🇩🇪 Ich bin **Wana Tutor**, ton assistant IA dédié à l'allemand. Pose-moi une question de grammaire, demande une traduction avec exemple ou teste ta prononciation !",
      timestamp: Date.now()
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const playTTS = (text) => {
    try {
      // Clean markdown tags
      const clean = text.replace(/[*_#`]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "de-DE";
      utterance.rate = 0.9; // Slightly slower for clarity
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    const userMsg = {
      role: "user",
      text: query.trim(),
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/ai/tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query.trim(),
          history: messages.slice(-5)
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: data.reply || "Désolé, je n'ai pas pu générer d'explication.",
            timestamp: Date.now()
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: "⚠️ Erreur de connexion avec l'IA. Vérifie ta connexion internet.",
            timestamp: Date.now()
          }
        ]);
      }
    } catch (err) {
      console.error("AI Tutor request error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "⚠️ Service temporairement indisponible.",
          timestamp: Date.now()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par ton navigateur.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "fr-FR"; // user speaks in French or German
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputText(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error("STT error:", e);
      setIsListening(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="ai-tutor-modal glass-panel animate-scale-up" onClick={(e) => e.stopPropagation()}>
        <div className="ai-tutor-header">
          <div className="ai-tutor-title-box">
            <div className="ai-tutor-avatar-badge animate-pulse">🤖</div>
            <div>
              <h3 className="ai-tutor-title">Wana Tutor IA 🇩🇪</h3>
              <span className="ai-tutor-status">En ligne • Assistant Pédagogique Vocal & Écrit</span>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="ai-tutor-chips-bar">
          {QUICK_PROMPTS.map((prompt, idx) => (
            <button 
              key={idx} 
              className="ai-chip"
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Chat Messages */}
        <div className="ai-tutor-messages-scroll">
          {messages.map((m, idx) => (
            <div key={idx} className={`ai-message-row ${m.role === 'user' ? 'user' : 'assistant'}`}>
              {m.role === 'assistant' && <div className="ai-msg-avatar">🇩🇪</div>}
              <div className="ai-msg-bubble">
                <div className="ai-msg-text" style={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </div>
                {m.role === 'assistant' && (
                  <button 
                    className="ai-tts-btn" 
                    onClick={() => playTTS(m.text)}
                    title="Écouter la prononciation"
                  >
                    🔊 Écouter
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="ai-message-row assistant">
              <div className="ai-msg-avatar">🇩🇪</div>
              <div className="ai-msg-bubble ai-typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form 
          className="ai-tutor-input-form" 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
        >
          <button 
            type="button" 
            className={`btn-mic ${isListening ? 'listening animate-pulse' : ''}`}
            onClick={toggleSpeechRecognition}
            title={isListening ? "Écoute en cours..." : "Parler au micro"}
          >
            {isListening ? "🎙️..." : "🎤"}
          </button>

          <input
            type="text"
            className="ai-input-field"
            placeholder="Pose une question en français ou allemand..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
          />

          <button 
            type="submit" 
            className="btn-send-ai" 
            disabled={!inputText.trim() || isLoading}
          >
            Envoyer ➔
          </button>
        </form>
      </div>
    </div>
  );
}
