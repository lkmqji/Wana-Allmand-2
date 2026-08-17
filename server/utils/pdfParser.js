const pdf = require('pdf-parse');

/**
 * Normalizes text for clean vocabulary entries.
 */
function cleanText(str) {
    if (!str) return '';
    return str
        .replace(/[\u2018\u2019]/g, "'") // normalize curly single quotes
        .replace(/[\u201C\u201D]/g, '"') // normalize curly double quotes
        .replace(/ß/g, 'ss')            // normalize German ß to ss for standard input
        .replace(/\s+/g, ' ')           // collapse multiple spaces
        .trim();
}

/**
 * Checks if a string is a header, page number, or non-vocabulary noise.
 */
function isNoise(text) {
    if (!text) return true;
    const clean = text.trim();
    if (!clean) return true;

    // Pure numbers (page numbers)
    if (/^\d+$/.test(clean) || /^page\s*\d+(\/\d+)?$/i.test(clean)) return true;

    // LaTeX/PDF table noise
    if (/^gray!\d+/i.test(clean)) return true;
    if (/^suite (à|a) la page suivante/i.test(clean)) return true;
    if (/^suite du tableau/i.test(clean)) return true;

    // Column headers
    if (/^(français|francais|mot|expression|allemand|german|english|anglais|question|réponse|reponse|answer)(\s*[\(/].*|\s*)$/i.test(clean)) return true;

    // Category / section titles alone (NOMS, VERBES, etc.)
    if (/^(noms?|verbes?|adjectifs?|adverbes?|expressions?|substantive?|verben|grammaire|vocabulaire|thème|theme)(\s*\(.*\))?$/i.test(clean)) return true;

    return false;
}

/**
 * Custom PDF page renderer that groups text items by vertical position (rows)
 * and detects column spacing with high precision.
 */
function render_page(pageData) {
    return pageData.getTextContent().then(textContent => {
        const items = textContent.items;
        if (!items || items.length === 0) return '';

        // Group items into rows with tolerance for slight font alignment differences
        const rows = [];
        const ROW_TOLERANCE = 4.5; // pixels

        for (const item of items) {
            const str = item.str;
            if (!str) continue;

            const x = item.transform[4];
            const y = item.transform[5];
            const width = item.width || 0;

            // Find an existing row within tolerance
            let row = rows.find(r => Math.abs(r.y - y) <= ROW_TOLERANCE);
            if (!row) {
                row = { y, items: [] };
                rows.push(row);
            }
            row.items.push({ x, y, width, str });
        }

        // Sort rows top-to-bottom (in PDF coordinate system, higher Y is higher on page)
        rows.sort((a, b) => b.y - a.y);

        const pageLines = [];

        for (const row of rows) {
            // Sort items in row left-to-right
            row.items.sort((a, b) => a.x - b.x);

            let lineText = '';
            let lastItemX = null;
            let lastItemWidth = 0;

            for (const it of row.items) {
                if (lastItemX !== null) {
                    const gap = it.x - (lastItemX + lastItemWidth);
                    // If gap between text blocks is significant (> 12px), treat as column separator (\t)
                    if (gap > 12) {
                        lineText += '\t';
                    } else if (gap > 2) {
                        // Small gap is a space
                        lineText += ' ';
                    }
                }
                lineText += it.str;
                lastItemX = it.x;
                lastItemWidth = it.width;
            }

            pageLines.push(lineText);
        }

        return pageLines.join('\n');
    });
}

/**
 * Parses the PDF buffer and extracts all vocabulary pairs.
 * Supports multiple formats (tables, tab-separated, delimiter-separated, etc.)
 * 
 * @param {Buffer} dataBuffer
 * @returns {Promise<Array<{id: number, question: string, answer: string}>>}
 */
async function parsePdf(dataBuffer) {
    const vocabList = [];
    const seen = new Set();
    let idCounter = 1;

    const addWord = (q, a) => {
        const question = cleanText(q);
        const answer = cleanText(a);

        if (!question || !answer) return;
        if (isNoise(question) || isNoise(answer)) return;

        // Avoid exact duplicate entries
        const key = `${question.toLowerCase()}:::${answer.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);

        vocabList.push({
            id: idCounter++,
            question,
            answer
        });
    };

    try {
        // Primary pass: layout-aware extraction with custom row grouping
        const data = await pdf(dataBuffer, { pagerender: render_page });
        const lines = data.text.split('\n');

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            // 1. Check if separated by our inserted tabs
            if (line.includes('\t')) {
                const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
                if (parts.length >= 2) {
                    const q = parts[0];
                    const a = parts[parts.length - 1];
                    addWord(q, a);
                    continue;
                }
            }

            // 2. Check common delimiters (=, -, —, –, :, |)
            const delimiterMatch = line.match(/^(.+?)\s*(?:=|—|–|->|=>|:\s+|\s+-\s+|\|)\s*(.+)$/);
            if (delimiterMatch) {
                addWord(delimiterMatch[1], delimiterMatch[2]);
                continue;
            }

            // 3. Check multiple consecutive spaces (2 or more spaces separating columns)
            const spaceColumns = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
            if (spaceColumns.length >= 2) {
                addWord(spaceColumns[0], spaceColumns[spaceColumns.length - 1]);
                continue;
            }

            // 4. Pattern check: German noun with article at end of line (e.g., "Maison das Haus" or "Chat die Katze")
            const germanArticleMatch = line.match(/^(.+?)\s+((?:der|die|das|den|dem|des|ein|eine|einen|einem|einer)\s+.+)$/i);
            if (germanArticleMatch) {
                addWord(germanArticleMatch[1], germanArticleMatch[2]);
                continue;
            }
        }
    } catch (err) {
        console.error('Error during primary PDF layout parsing, trying fallback:', err);
    }

    // Fallback: If no words found with custom render, try standard pdf-parse text extraction
    if (vocabList.length === 0) {
        try {
            const rawData = await pdf(dataBuffer);
            const lines = rawData.text.split('\n');

            for (let line of lines) {
                line = line.trim();
                if (!line) continue;

                const delim = line.match(/^(.+?)\s*(?:=|—|–|->|=>|:\s+|\s+-\s+|\||\t)\s*(.+)$/);
                if (delim) {
                    addWord(delim[1], delim[2]);
                    continue;
                }

                const spaceCols = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
                if (spaceCols.length >= 2) {
                    addWord(spaceCols[0], spaceCols[spaceCols.length - 1]);
                    continue;
                }

                const articleMatch = line.match(/^(.+?)\s+((?:der|die|das|den|dem|des)\s+.+)$/i);
                if (articleMatch) {
                    addWord(articleMatch[1], articleMatch[2]);
                }
            }
        } catch (fallbackErr) {
            console.error('Fallback PDF parse error:', fallbackErr);
        }
    }

    return vocabList;
}

module.exports = { parsePdf, cleanText, isNoise };
