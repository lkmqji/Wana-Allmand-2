/**
 * Utility functions for formatting and truncating player names
 */

/**
 * Safely extracts Unicode graphemes (user-perceived characters/emojis)
 * to avoid splitting surrogate pairs or multi-codepoint emojis.
 */
function getGraphemes(str) {
  if (!str) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str), s => s.segment);
  }
  return Array.from(str);
}

/**
 * Truncates a player name to a maximum number of characters/emojis (default: 8).
 * Fully supports emojis anywhere in the name without corrupting surrogate pairs.
 * 
 * @param {string} name - Player name to format
 * @param {number} max - Maximum character length (default: 8)
 * @returns {string} - Formatted/abbreviated player name
 */
export function formatPlayerName(name, max = 8) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  // Check if string starts with an avatar emoji prefix followed by space (e.g., "🦊 Alexandre" or "🐼 تلميذة")
  const emojiMatch = trimmed.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*|\p{Emoji})\s+(.*)$/u);
  if (emojiMatch && emojiMatch[1]) {
    const avatar = emojiMatch[1];
    const rest = emojiMatch[2];
    if (!rest) return avatar;
    const restGraphemes = getGraphemes(rest);
    const truncatedRest = restGraphemes.length > max ? restGraphemes.slice(0, max).join('') : rest;
    return `${avatar} ${truncatedRest}`;
  }

  const allGraphemes = getGraphemes(trimmed);
  return allGraphemes.length > max ? allGraphemes.slice(0, max).join('') : trimmed;
}

/**
 * Gets or creates a persistent client player key stored in localStorage
 */
export function getClientPlayerKey() {
  try {
    let key = localStorage.getItem('wana_client_player_key');
    if (!key) {
      key = 'usr_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem('wana_client_player_key', key);
    }
    return key;
  } catch (e) {
    return 'usr_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Safely extracts ONLY the emoji from a string (e.g. "💥 Ouch!" -> "💥", "GG! 🏆" -> "🏆", "🔥" -> "🔥")
 */
export function extractEmoji(text) {
  if (!text || typeof text !== 'string') return '✨';
  const emojiRegex = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/u;
  const match = text.match(emojiRegex);
  if (match && match[0]) return match[0];
  const firstWord = text.trim().split(/\s+/)[0];
  return firstWord || '✨';
}

/**
 * Generates a full-screen Telegram Burst array of 8 particles for a given emoji
 */
export function generateBurstParticles(rawTextOrEmoji) {
  const emoji = extractEmoji(rawTextOrEmoji);
  const particles = [];
  const burstCount = 8;
  for (let i = 0; i < burstCount; i++) {
    const tx = `${Math.floor(Math.random() * 240) - 120}px`; // -120px to 120px dispersion
    const ty = `-${Math.floor(Math.random() * 25) + 85}vh`; // -85vh to -110vh (traverses full screen!)
    const scale = (Math.random() * 0.9 + 1.2).toFixed(2); // 1.2 to 2.1 scale
    const rot = `${Math.floor(Math.random() * 80) - 40}deg`; // -40deg to 40deg
    const delay = `${(Math.random() * 0.18).toFixed(2)}s`;
    const xPos = Math.floor(Math.random() * 70) + 15; // 15% to 85% horizontal launch
    particles.push({
      id: Math.random().toString(36).substring(2, 9) + '_' + Date.now() + '_' + i,
      emoji,
      tx,
      ty,
      scale,
      rot,
      delay,
      xPos
    });
  }
  return { emoji, particles };
}

