const pdf = require('pdf-parse');

/**
 * Parses the PDF buffer and attempts to extract vocabulary.
 * Assumes a structure where each line might be a row in a table.
 * For the MVP, we assume format: [French/English] [German with Article]
 * 
 * @param {Buffer} dataBuffer
 * @returns {Array<{id: number, question: string, answer: string}>}
 */
function render_page(pageData) {
    return pageData.getTextContent().then(textContent => {
        let lastY, lastX, text = '';
        for (let item of textContent.items) {
            let x = item.transform[4];
            let y = item.transform[5];
            // If same line, check distance
            if (lastY === y || !lastY) {
                // If there's a big gap (e.g. > 10 pixels), insert a tab
                if (lastX && (x - lastX > 10)) {
                    text += '\t';
                }
                text += item.str;
            } else {
                text += '\n' + item.str;
            }
            lastY = y;
            lastX = x + item.width;
        }
        return text;
    });
}

/**
 * Parses the PDF buffer and attempts to extract vocabulary.
 * @param {Buffer} dataBuffer
 * @returns {Array<{id: number, question: string, answer: string}>}
 */
async function parsePdf(dataBuffer) {
    const data = await pdf(dataBuffer, { pagerender: render_page });
    const text = data.text;
    const lines = text.split('\n').filter(line => line.trim() !== '');

    const vocabList = [];
    let idCounter = 1;

    for (const line of lines) {
        // Now we can safely split by our inserted tabs
        const parts = line.split('\t');
        
        if (parts.length >= 2) {
            // First part is question, last part is answer
            const question = parts[0].trim();
            const answer = parts[parts.length - 1].trim(); // In case there are multiple tabs
            
            // Basic validation to avoid empty strings and headers
            if (question && answer && !question.includes('Français (Mot') && !question.includes('Suite du tableau')) {
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
