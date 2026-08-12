/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    Math.min(
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

/**
 * Calculates score based on distance and word length.
 * Handles German articles (der/die/das): if article is wrong, score is halved.
 */
function calculateScore(expected, actual) {
    const expClean = expected.trim();
    const actClean = actual.trim();

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

    const distance = levenshteinDistance(expNoun.toLowerCase(), actNoun.toLowerCase());
    const maxTypos = Math.max(1, Math.floor(expNoun.length / 5));

    let score = 0;
    let isTypo = false;

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

    if (articleMismatch) {
        score = Math.floor(score / 2);
    }

    return { score, isTypo };
}

module.exports = { levenshteinDistance, calculateScore };
