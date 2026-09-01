import { VocabItem, ExtractionOptions } from '../types';

/**
 * Escapes special LaTeX characters in plain text string
 */
export function escapeLatex(text: string): string {
  if (!text) return '';
  
  // If text already contains latex commands like \textit{...}, preserve those
  if (/\\textit\{|\\textbf\{|\\small\{/.test(text)) {
    return text
      .replace(/&/g, '\\&')
      .replace(/%/g, '\\%')
      .replace(/\$/g, '\\$')
      .replace(/#/g, '\\#')
      .replace(/_/g, '\\_');
  }

  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

export const DEFAULT_OPTIONS: ExtractionOptions = {
  sourceLang: 'Français / English / العربية',
  targetLang: 'Allemand',
  excludeProperNouns: true,
  excludeLocations: true,
  excludeBasicGrammar: true,
  includeArticles: true,
  includePlurals: true,
  headerColor: 'gray!15',
  columnWidthSource: '9.5cm',
  columnWidthTarget: '5.5cm',
  arrayStretch: 1.3,
};

/**
 * Generates the complete LaTeX document string from vocabulary items and options
 */
export function generateLatexCode(
  items: VocabItem[],
  options: Partial<ExtractionOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Group items by category
  const categories: { key: string; label: string; items: VocabItem[] }[] = [
    {
      key: 'NOMS',
      label: 'NOMS (Substantive)',
      items: items.filter((i) => i.category === 'NOMS'),
    },
    {
      key: 'VERBES',
      label: 'VERBES (Verben)',
      items: items.filter((i) => i.category === 'VERBES'),
    },
    {
      key: 'ADJECTIFS_ADVERBES',
      label: 'ADJECTIFS \\& ADVERBES',
      items: items.filter((i) => i.category === 'ADJECTIFS_ADVERBES'),
    },
    {
      key: 'EXPRESSIONS',
      label: 'EXPRESSIONS UTILES',
      items: items.filter((i) => i.category === 'EXPRESSIONS' || i.category === 'EXPRESSIONS_UTILES'),
    },
  ];

  // Also handle any custom categories
  const standardKeys = new Set(['NOMS', 'VERBES', 'ADJECTIFS_ADVERBES', 'EXPRESSIONS', 'EXPRESSIONS_UTILES']);
  const customItems = items.filter((i) => !standardKeys.has(i.category));
  if (customItems.length > 0) {
    const customCatsMap = new Map<string, VocabItem[]>();
    for (const item of customItems) {
      const list = customCatsMap.get(item.category) || [];
      list.push(item);
      customCatsMap.set(item.category, list);
    }
    for (const [catName, catItems] of customCatsMap.entries()) {
      categories.push({
        key: catName,
        label: escapeLatex(catName.toUpperCase()),
        items: catItems,
      });
    }
  }

  // Build LaTeX body sections
  let sectionsLatex = '';
  const activeCategories = categories.filter((c) => c.items.length > 0);

  activeCategories.forEach((cat, index) => {
    sectionsLatex += `% ==========================================\n`;
    sectionsLatex += `% ${cat.key}\n`;
    sectionsLatex += `% ==========================================\n`;
    sectionsLatex += `\\multicolumn{2}{c}{\\textbf{\\large ${cat.label}}} \\\\\n`;
    sectionsLatex += `\\midrule\n`;

    cat.items.forEach((item) => {
      const srcText = escapeLatex(item.sourceText);
      let rawGerman = item.germanText;

      // Handle article option for Nouns
      if (opts.includeArticles === false && item.category === 'NOMS') {
        rawGerman = rawGerman.replace(/^(der|die|das)\s+/i, '');
      }

      // Handle plural option for Nouns
      if (opts.includePlurals === false && item.category === 'NOMS') {
        // Strip plural suffix like ", -en" or ", -e" or ", -¨er" or "(pl. -en)"
        rawGerman = rawGerman.replace(/,\s*(-[a-zäöüÄÖÜ\-¨]+|pl\.[^)]*)$/i, '');
      }

      let gerText = escapeLatex(rawGerman);

      // Handle notes like (pluriel) in german text
      if (item.notes) {
        const isPluralNote = /pluriel|pl\./i.test(item.notes);
        if (!isPluralNote || opts.includePlurals !== false) {
          const formattedNotes = `\\textit{${escapeLatex(item.notes)}}`;
          if (!gerText.includes(item.notes)) {
            gerText += ` ${formattedNotes}`;
          }
        }
      }

      sectionsLatex += `${srcText} & ${gerText} \\\\\n`;
    });

    if (index < activeCategories.length - 1) {
      sectionsLatex += `\\midrule\n\n`;
    } else {
      sectionsLatex += `\n`;
    }
  });

  const sourceLangLabel = escapeLatex(opts.sourceLang);
  const targetLangLabel = escapeLatex(opts.targetLang);

  return `\\documentclass[a4paper, 11pt]{article}

% Encodage et langue
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[french, ngerman]{babel}

% Mise en page
\\usepackage[margin=2.5cm]{geometry}

% Packages pour les tableaux
\\usepackage{longtable}
\\usepackage{booktabs}
\\usepackage{array}
\\usepackage{xcolor}

\\begin{document}

\\renewcommand{\\arraystretch}{${opts.arrayStretch}} % Espacement des lignes pour plus de lisibilité

\\begin{longtable}{>{\\raggedright\\arraybackslash}p{${opts.columnWidthSource}} >{\\raggedright\\arraybackslash}p{${opts.columnWidthTarget}}}
\\toprule
\\rowcolor{${opts.headerColor}}
\\textbf{${sourceLangLabel} (Mot ou expression)} & \\textbf{${targetLangLabel}} \\\\
\\midrule
\\endfirsthead

% En-tête pour les pages suivantes
\\multicolumn{2}{c}{{\\small\\textit{Suite du tableau de la page précédente}}} \\\\
\\toprule
\\rowcolor{${opts.headerColor}}
\\textbf{${sourceLangLabel} (Mot ou expression)} & \\textbf{${targetLangLabel}} \\\\
\\midrule
\\endhead

% Pied de page pour les pages coupées
\\midrule
\\multicolumn{2}{r}{{\\small\\textit{Suite à la page suivante...}}} \\\\
\\endfoot

% Pied de page final
\\bottomrule
\\endlastfoot

${sectionsLatex}\\end{longtable}

\\end{document}`;
}
