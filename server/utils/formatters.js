/**
 * Utility functions for formatting and truncating player names on the server
 */

function formatPlayerName(name, max = 8) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (!trimmed) return '';

  // Match leading emoji/avatar prefix (e.g., 🦊, 🐼, 🦁, 👤, 👑, etc.)
  const emojiMatch = trimmed.match(/^(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*|\p{Emoji})\s*(.*)$/u);
  if (emojiMatch && emojiMatch[1]) {
    const emoji = emojiMatch[1];
    const rest = emojiMatch[2];
    if (!rest) return emoji;
    const truncatedRest = rest.length > max ? rest.slice(0, max) : rest;
    return `${emoji} ${truncatedRest}`;
  }

  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

module.exports = { formatPlayerName };
