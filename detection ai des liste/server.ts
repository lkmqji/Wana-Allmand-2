import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { generateLatexCode } from './src/lib/latexGenerator.js';
import { VocabItem, ExtractionOptions } from './src/types.js';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON body limit for handling document & image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing from environment variables.');
    }
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Regenerate LaTeX code from a given vocabulary list
app.post('/api/generate-latex', (req, res) => {
  try {
    const { vocabulary, options } = req.body;
    if (!Array.isArray(vocabulary)) {
      return res.status(400).json({ success: false, error: 'Vocabulary array is required.' });
    }
    const latexCode = generateLatexCode(vocabulary, options || {});
    return res.json({ success: true, latexCode });
  } catch (err: any) {
    console.error('Error in /api/generate-latex:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate LaTeX.' });
  }
});

// Extract vocabulary and generate LaTeX from uploaded file or text
app.post('/api/extract-vocab', async (req, res) => {
  try {
    const { fileBuffer, mimeType, rawText, fileName, options = {} } = req.body;

    if (!fileBuffer && !rawText) {
      return res.status(400).json({
        success: false,
        error: 'Veuillez fournir un fichier ou du texte à analyser.',
      });
    }

    const ai = getGenAI();

    // Prepare contents for Gemini
    const parts: any[] = [];

    const sourceLang = options.sourceLang || 'Français / English / العربية';
    const targetLang = options.targetLang || 'Allemand';
    const excludeProperNouns = options.excludeProperNouns !== false;
    const excludeLocations = options.excludeLocations !== false;
    const excludeBasicGrammar = options.excludeBasicGrammar !== false;
    const includeArticles = options.includeArticles !== false;
    const includePlurals = options.includePlurals !== false;

    const systemInstruction = `Tu es un expert linguiste et professeur de langues polyglotte spécialisé dans l'apprentissage de l'allemand.
Ta tâche est d'analyser le contenu fourni (document PDF, texte, image de cours, audio, etc.) et d'en extraire le vocabulaire structuré en 2 étapes :

DANS LA PREMIÈRE COLONNE : Pour CHAQUE mot ou expression extrait, tu DOIS fournir sa traduction dans les TROIS LANGUES (Français, Anglais, Arabe) :
1. "frenchText": Mot/expression en Français (ex: "Addition / Facture")
2. "englishText": Mot/expression en Anglais (ex: "Bill / Invoice")
3. "arabicText": Mot/expression en Arabe avec caractères arabes (ex: "الفاتورة")
4. "sourceText": Assemblage des trois sous la forme : "frenchText | englishText | arabicText" (ex: "Addition / Facture | Bill / Invoice | الفاتورة")

DANS LA DEUXIÈME COLONNE ("germanText") :
- Pour chaque NOM (Substantif) : ${includeArticles ? "Ajoute l'article défini (der, die, das) devant le nom." : "Fournis le nom sans article."} ${includePlurals ? "Indique également la terminaison/forme du pluriel si disponible (ex: 'die Rechnung, -en', 'der Freund, -e', 'das Buch, -¨er')." : "N'inclus PAS la forme du pluriel."}
- Pour chaque VERBE : Mets-le à l'INFINITIF en allemand (ex: 'gehen', 'trinken', 'kochen').
- Pour chaque ADJECTIF/ADVERBE : Mets-le au masculin/adverbial (ex: 'müde', 'groß', 'schön').
- Pour chaque EXPRESSION : Fournis une traduction naturelle d'expression usuelle (ex: 'nach Hause', 'wie geht\'s?').

RÈGLES DE FILTRAGE :
- ${excludeProperNouns ? 'EXCLUS STRICTEMENT les prénoms et noms de personnes (ex: Lisa, Anna, Max, John).' : 'Conserve les noms si pertinent.'}
- ${excludeLocations ? 'EXCLUS STRICTEMENT les noms de villes et de pays (ex: Paris, London, Tokyo, Berlin, Deutschland).' : 'Conserve les lieux.'}
- ${excludeBasicGrammar ? 'EXCLUS les mots de grammaire trop basiques ou pronoms isolés (comme "je", "tu", "un", "une") sauf si cela fait partie d\'une expression utile.' : ''}

Classifie chaque élément dans l'une des 4 catégories suivantes :
1. "NOMS"
2. "VERBES"
3. "ADJECTIFS_ADVERBES"
4. "EXPRESSIONS"

Renvoie une structure JSON STRICTE respectant le schéma spécifié.`;

    const promptText = `Analyse ce contenu et extrais le vocabulaire dans la 1ère colonne (Français | Anglais | Arabe) et la 2ème colonne (${targetLang} avec article/infinitif) en suivant rigoureusement les consignes de filtrage.`;

    if (fileBuffer && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data: fileBuffer,
        },
      });
      parts.push({ text: promptText });
    } else if (rawText) {
      parts.push({ text: `Voici le texte à analyser :\n\n${rawText}\n\n${promptText}` });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedLanguage: {
              type: Type.STRING,
              description: 'La langue détectée du document d\'origine',
            },
            notes: {
              type: Type.STRING,
              description: 'Remarques succinctes sur l\'extraction et le filtrage effectué',
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: 'La catégorie: NOMS, VERBES, ADJECTIFS_ADVERBES, ou EXPRESSIONS',
                  },
                  frenchText: {
                    type: Type.STRING,
                    description: 'Traduction du mot/expression en Français',
                  },
                  englishText: {
                    type: Type.STRING,
                    description: 'Traduction du mot/expression en Anglais',
                  },
                  arabicText: {
                    type: Type.STRING,
                    description: 'Traduction du mot/expression en Arabe',
                  },
                  sourceText: {
                    type: Type.STRING,
                    description: 'Combinaison "Français | Anglais | Arabe"',
                  },
                  germanText: {
                    type: Type.STRING,
                    description: 'Mot ou expression en Allemand avec article pour les noms ou verbe à l\'infinitif',
                  },
                  article: {
                    type: Type.STRING,
                    description: 'L\'article si c\'est un nom: "der", "die", "das", "die (pluriel)" ou vide',
                  },
                  notes: {
                    type: Type.STRING,
                    description: 'Note éventuelle entre parenthèses ex: (pluriel), (boisson)',
                  },
                },
                required: ['category', 'germanText'],
              },
            },
          },
          required: ['vocabulary'],
        },
      },
    });

    const jsonText = response.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error('JSON parse error from Gemini output:', e, jsonText);
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de l\'analyse du format JSON renvoyé par l\'IA.',
      });
    }

    const rawVocab = Array.isArray(parsed.vocabulary) ? parsed.vocabulary : [];

    // Map into clean VocabItem array with IDs
    const vocabulary: VocabItem[] = rawVocab.map((item: any, idx: number) => {
      let cat = (item.category || 'EXPRESSIONS').toUpperCase();
      if (cat.includes('NOM') || cat.includes('SUBSTANTIF')) cat = 'NOMS';
      else if (cat.includes('VERB')) cat = 'VERBES';
      else if (cat.includes('ADJ') || cat.includes('ADV')) cat = 'ADJECTIFS_ADVERBES';
      else if (cat.includes('EXPR')) cat = 'EXPRESSIONS';

      let german = (item.germanText || '').trim();
      let article = item.article || '';

      // Infer article if missing for NOMS
      if (cat === 'NOMS' && !article) {
        if (/^der\s+/i.test(german)) article = 'der';
        else if (/^die\s+/i.test(german)) article = 'die';
        else if (/^das\s+/i.test(german)) article = 'das';
      }

      let french = (item.frenchText || '').trim();
      let english = (item.englishText || '').trim();
      let arabic = (item.arabicText || '').trim();
      let sourceText = (item.sourceText || '').trim();

      // If sourceText wasn't constructed or lacks part, combine french, english, arabic
      if (!sourceText || (!french && !english && !arabic)) {
        if (sourceText) {
          const parts = sourceText.split(/\s*[\||—\/]\s*/);
          french = french || parts[0] || '';
          english = english || parts[1] || '';
          arabic = arabic || parts[2] || '';
        }
      }

      if (!sourceText) {
        sourceText = [french, english, arabic].filter(Boolean).join(' | ');
      }

      return {
        id: `extracted-${Date.now()}-${idx}`,
        category: cat,
        frenchText: french,
        englishText: english,
        arabicText: arabic,
        sourceText: sourceText,
        germanText: german,
        article: article as any,
        notes: item.notes || '',
      };
    });

    // Calculate statistics
    const nounsCount = vocabulary.filter((v) => v.category === 'NOMS').length;
    const verbsCount = vocabulary.filter((v) => v.category === 'VERBES').length;
    const adjCount = vocabulary.filter((v) => v.category === 'ADJECTIFS_ADVERBES').length;
    const exprCount = vocabulary.filter((v) => v.category === 'EXPRESSIONS').length;

    // Generate exact LaTeX code
    const latexCode = generateLatexCode(vocabulary, options);

    return res.json({
      success: true,
      vocabulary,
      latexCode,
      summaryStats: {
        totalWords: vocabulary.length,
        nounsCount,
        verbsCount,
        adjCount,
        exprCount,
      },
      detectedInfo: {
        fileName: fileName || 'Document',
        detectedLanguage: parsed.detectedLanguage || sourceLang,
        notes: parsed.notes || 'Analyse et filtrage réussis.',
      },
    });
  } catch (err: any) {
    console.error('Error in /api/extract-vocab:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Une erreur est survenue lors de l\'extraction du vocabulaire.',
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
