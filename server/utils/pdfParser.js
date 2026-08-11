const pdf = require('pdf-parse');

/**
 * Parses the PDF buffer and attempts to extract vocabulary.
 * Assumes a structure where each line might be a row in a table.
 * For the MVP, we assume format: [French/English] [German with Article]
 * 
 * @param {Buffer} dataBuffer
 * @returns {Array<{id: number, question: string, answer: string}>}
 */
async function parsePdf(dataBuffer) {
    const data = await pdf(dataBuffer);
    const text = data.text;
    const lines = text.split('\n').filter(line => line.trim() !== '');

    const vocabList = [];
    let idCounter = 1;

    for (const line of lines) {
        // Simple heuristic: split by multiple spaces or a single tab/separator if possible.
        // For standard tables in PDFs, there might be multiple spaces between columns.
        const parts = line.split(/\s{2,}|\t/);
        
        if (parts.length >= 2) {
            const question = parts[0].trim();
            const answer = parts[1].trim();
            
            // Basic validation to avoid empty strings
            if (question && answer) {
                vocabList.push({
                    id: idCounter++,
                    question,
                    answer
                });
            }
        } else {
            // Fallback: try splitting by a single space if it's just two words, 
            // but German words often have articles (e.g. "der Tisch" -> 2 words).
            // This is a naive fallback that might need adjustment based on real PDFs.
            const spaceParts = line.trim().split(' ');
            if (spaceParts.length >= 2) {
                const question = spaceParts[0];
                const answer = spaceParts.slice(1).join(' ');
                vocabList.push({
                    id: idCounter++,
                    question,
                    answer
                });
            }
        }
    }

    return vocabList;
}

module.exports = { parsePdf };
