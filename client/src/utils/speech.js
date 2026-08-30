import { TextToSpeech } from '@capacitor-community/text-to-speech';

/**
 * Universal speech function that uses Capacitor TTS on native devices,
 * and falls back to window.speechSynthesis on web.
 */
export const speakText = async (text, lang = 'de-DE') => {
  if (!text || typeof window === 'undefined') return;

  const isNative = !!window.Capacitor?.isNative;

  try {
    if (isNative) {
      await TextToSpeech.stop().catch(() => {});
      await TextToSpeech.speak({
        text,
        lang,
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient'
      });
    } else {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      window.speechSynthesis.speak(utterance);
    }
  } catch (err) {
    console.debug('Speech error:', err);
  }
};

export const stopSpeech = async () => {
  const isNative = !!window.Capacitor?.isNative;
  try {
    if (isNative) {
      await TextToSpeech.stop().catch(() => {});
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  } catch (err) {
    console.debug('Stop speech error:', err);
  }
};
