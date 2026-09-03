export const normalizeGerman = (str = '') => {
  return str
    .trim()
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/\s+/g, ' ');
};

export const cleanText = (str = '') => {
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
};

export const getLevenshteinDistance = (a = '', b = '') => {
  const s1 = a.toLowerCase();
  const s2 = b.toLowerCase();
  const matrix = [];
  for (let i = 0; i <= s1.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s2.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // suppression
        );
      }
    }
  }
  return matrix[s1.length][s2.length];
};

export const findDroppedLetters = (input = '', target = '') => {
  const normInput = cleanText(input);
  const normTarget = cleanText(target);
  const dropped = [];
  if (normInput.length > normTarget.length) {
    for (let i = 0; i < normInput.length; i++) {
      if (normInput[i] !== normTarget[i] && !normTarget.includes(normInput[i])) {
        dropped.push({ char: normInput[i], index: i });
      }
    }
  } else {
    for (let i = 0; i < Math.min(normInput.length, normTarget.length); i++) {
      if (normInput[i] !== normTarget[i]) {
        dropped.push({ char: normInput[i], index: i });
      }
    }
  }
  return dropped.length > 0 ? dropped : [{ char: normInput[normInput.length - 1] || '?', index: 0 }];
};

export const evaluateAnswer = (input = '', expected = '') => {
  const cleanedInput = cleanText(input);
  const cleanedExpected = cleanText(expected);

  if (!cleanedInput) {
    return { status: 'EMPTY', distance: cleanedExpected.length, dropped: [] };
  }

  if (cleanedInput === cleanedExpected || normalizeGerman(cleanedInput) === normalizeGerman(cleanedExpected)) {
    return { status: 'PERFECT', distance: 0, dropped: [] };
  }

  const distance = getLevenshteinDistance(cleanedInput, cleanedExpected);
  const allowedTypoThreshold = cleanedExpected.length > 6 ? 2 : 1;

  if (distance <= allowedTypoThreshold) {
    return {
      status: 'TYPO',
      distance,
      dropped: findDroppedLetters(input, expected)
    };
  }

  return { status: 'ERROR', distance, dropped: [] };
};
