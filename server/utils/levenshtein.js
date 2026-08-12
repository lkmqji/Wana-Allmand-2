/**
 * Calculates the Levenshtein distance between two strings.
 * @param {string} a 
 * @param {string} b 
 * @returns {number} distance
 */
function levenshteinDistance(a, b) {
    const matrix = [];

    // Increment along the first column of each row
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1  // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculates score based on distance and word length.
 * 0 distance = 100%
 * 1 distance = 75%
 * 2 distance = 50%
 * 3+ distance = 0%
 */
function calculateScore(expected, actual) {
    const distance = levenshteinDistance(expected.toLowerCase().trim(), actual.toLowerCase().trim());
    
    // Toleration: 1 mistake allowed per 5 letters, minimum 1
    const maxTypos = Math.max(1, Math.floor(expected.length / 5));
    
    if (distance === 0) return { score: 100, isTypo: false };
    if (distance <= maxTypos) return { score: 100, isTypo: true };
    if (distance === maxTypos + 1) return { score: 50, isTypo: false };
    return { score: 0, isTypo: false };
}

module.exports = { levenshteinDistance, calculateScore };
