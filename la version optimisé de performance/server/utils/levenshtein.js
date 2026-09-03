/**
 * High-performance Levenshtein distance calculation.
 * Optimized with:
 * 1. O(min(N, M)) memory footprint using a single 1D Int32Array (no 2D matrix allocation / zero GC pressure).
 * 2. Fast paths for identical strings and empty strings.
 * 3. Character code comparisons avoiding repeated substring/charAt overhead.
 */
function levenshteinDistance(a, b) {
    if (a === b) return 0;
    
    let aLen = a.length;
    let bLen = b.length;

    if (aLen === 0) return bLen;
    if (bLen === 0) return aLen;

    // Ensure `b` is the shorter string to minimize vector allocation
    let strA = a;
    let strB = b;
    if (aLen < bLen) {
        strA = b;
        strB = a;
        aLen = strA.length;
        bLen = strB.length;
    }

    // Single flat typed array of size (bLen + 1)
    const row = new Int32Array(bLen + 1);
    for (let j = 0; j <= bLen; j++) {
        row[j] = j;
    }

    for (let i = 1; i <= aLen; i++) {
        let left = i;
        let diagonal = i - 1;
        const codeA = strA.charCodeAt(i - 1);

        for (let j = 1; j <= bLen; j++) {
            const cost = (codeA === strB.charCodeAt(j - 1)) ? 0 : 1;
            const temp = row[j];
            
            // Math.min inline
            const deletion = temp + 1;
            const insertion = left + 1;
            const substitution = diagonal + cost;

            left = deletion < insertion
                ? (deletion < substitution ? deletion : substitution)
                : (insertion < substitution ? insertion : substitution);

            diagonal = temp;
            row[j] = left;
        }
    }

    return row[bLen];
}

/**
 * Calculates score based on distance and word length.
 * Handles German articles (der/die/das): if article is wrong, score is halved.
 * 
 * Performance optimizations:
 * - Direct exact match fast-path.
 * - Length-differential early exit before computing Levenshtein distance.
 */
function calculateScore(expected, actual) {
    const expClean = (expected || '').trim();
    const actClean = (actual || '').trim();

    if (!expClean && !actClean) return { score: 100, isTypo: false };
    if (!expClean || !actClean) return { score: 0, isTypo: false };

    const articles = ['der', 'die', 'das'];
    const expParts = expClean.split(' ');
    const actParts = actClean.split(' ');

    let articleMismatch = false;
    let expNoun = expClean;
    let actNoun = actClean;

    if (expParts.length > 1 && articles.includes(expParts[0].toLowerCase())) {
        const expectedArticle = expParts[0].toLowerCase();
        expNoun = expParts.slice(1).join(' ');

        if (actParts.length > 1 && articles.includes(actParts[0].toLowerCase())) {
            const actualArticle = actParts[0].toLowerCase();
            if (actualArticle !== expectedArticle) {
                articleMismatch = true;
            }
            actNoun = actParts.slice(1).join(' ');
        } else {
            articleMismatch = true;
        }
    }

    const expNounLower = expNoun.toLowerCase();
    const actNounLower = actNoun.toLowerCase();
    const maxTypos = Math.max(1, Math.floor(expNoun.length / 5));

    let score = 0;
    let isTypo = false;

    // Fast-path: exact noun match
    if (expNounLower === actNounLower) {
        score = 100;
        isTypo = false;
    } else {
        // Fast-path: if length difference exceeds maxTypos + 1, distance is guaranteed to be > maxTypos + 1
        const lenDiff = Math.abs(expNounLower.length - actNounLower.length);
        if (lenDiff > maxTypos + 1) {
            score = 0;
            isTypo = false;
        } else {
            const distance = levenshteinDistance(expNounLower, actNounLower);
            if (distance === 0) {
                score = 100;
            } else if (distance <= maxTypos) {
                score = 100;
                isTypo = true;
            } else if (distance === maxTypos + 1) {
                score = 50;
            } else {
                score = 0;
            }
        }
    }

    if (articleMismatch) {
        score = Math.floor(score / 2);
    }

    return { score, isTypo };
}

module.exports = { levenshteinDistance, calculateScore };
