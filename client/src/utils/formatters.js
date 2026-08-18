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
 * Formats a date timestamp into a human-friendly French string with exact time
 * e.g. "Aujourd'hui à 14:25", "Hier à 18:30", "12/05/2026 à 09:15"
 */
export function formatLastLogin(dateInput) {
  if (!dateInput) return "Jamais";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "Inconnue";

  const now = new Date();
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  const isToday = now.toDateString() === date.toDateString();
  if (isToday) {
    return `Aujourd'hui à ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = yesterday.toDateString() === date.toDateString();
  if (isYesterday) {
    return `Hier à ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${dateStr} à ${timeStr}`;
}

/**
 * Returns full date and time string with seconds
 */
export function formatFullDateTime(dateInput) {
  if (!dateInput) return "-";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
