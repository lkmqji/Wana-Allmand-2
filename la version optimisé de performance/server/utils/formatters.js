/**
 * Utility functions for formatting and truncating player names on the server
 */

function getGraphemes(str) {
  if (!str) return [];
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    return Array.from(segmenter.segment(str), s => s.segment);
  }
  return Array.from(str);
}

function formatPlayerName(name, max = 8) {
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

module.exports = { formatPlayerName };
