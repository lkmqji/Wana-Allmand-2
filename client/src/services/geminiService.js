// Gemini API Service with Resilience Cascade & Local Fallback (100% Modèles Flash)
// Transposé depuis qcm-p-diatrie pour le Tuteur Médical et le Raisonnement Clinique IA
export const DEFAULT_GEMINI_KEY = "AQ.Ab8RN6InNmt_sD2jtOWtfP5veazlJgMEJ85vNfXf2B6St-_gVw";

/**
 * Cascade de résilience ordonnée : EXCLUSIVEMENT des modèles Flash
 * Garantit une latence ultra-faible, une résistance aux limites de quota et une grande fluidité
 */
export const MODEL_CASCADE = [
  "gemini-3-flash-preview",   // Priorité #1 : modèle Flash ultra-rapide (~1.25s)
  "gemini-flash-lite-latest", // Secours #2 : Flash Lite dernière génération ultra-réactif
  "gemini-3.1-flash-lite",    // Secours #3 : Flash Lite haute disponibilité
  "gemini-3.8-flash",         // Secours #4 : Flash haute fidélité (si quota disponible)
  "gemini-3.7-flash",         // Secours #5 : Flash standard
  "gemini-3.6-flash",         // Secours #6 : Flash secours
  "gemini-3.5-flash"          // Secours #7 : Flash réserve
];

/**
 * Nettoyeur et convertisseur de formules / balises LaTeX en texte clair médical lisible.
 * Supprime les syntaxes cryptiques (\text{}, \mathbf{}, \times, \frac, etc.) générées parfois par les LLMs.
 */
export function cleanLatexMath(str) {
  if (!str || typeof str !== 'string') return '';
  let res = str;

  // 1. Délimiteurs de blocs mathématiques : $$...$$, $...$, \[...\], \(...\)
  res = res.replace(/\$\$([\s\S]*?)\$\$/g, '$1');
  res = res.replace(/\\\[([\s\S]*?)\\\]/g, '$1');
  res = res.replace(/\\\(([\s\S]*?)\\\)/g, '$1');
  res = res.replace(/\$([^\$\n]+)\$/g, '$1');

  // 2. Symboles et opérateurs mathématiques courants
  const symbols = [
    [/\\times\b/g, '×'],
    [/\\cdot\b/g, '·'],
    [/\\div\b/g, '÷'],
    [/\\pm\b/g, '±'],
    [/\\mp\b/g, '∓'],
    [/\\leq?\b/g, '≤'],
    [/\\geq?\b/g, '≥'],
    [/\\neq?\b/g, '≠'],
    [/\\approx\b/g, '≈'],
    [/\\sim\b/g, '∼'],
    [/\\equiv\b/g, '≡'],
    [/\\infty\b/g, '∞'],
    [/\\[rR]ightarrow\b|\\to\b/g, '→'],
    [/\\[lL]eftarrow\b/g, '←'],
    [/\\implies\b|\\Rightarrow\b/g, '⇒'],
    [/\\iff\b|\\Leftrightarrow\b/g, '⇔'],
    [/\\mu(?:m|g|l|mol)?\b/g, (m) => m.replace(/\\mu/, 'µ')],
    [/\\alpha\b/g, 'α'],
    [/\\beta\b/g, 'β'],
    [/\\gamma\b/g, 'γ'],
    [/\\delta\b/g, 'δ'],
    [/\\Delta\b/g, 'Δ'],
    [/\\lambda\b/g, 'λ'],
    [/\\theta\b/g, 'θ'],
    [/\\pi\b/g, 'π'],
    [/\\sigma\b/g, 'σ'],
    [/\\Sigma\b/g, 'Σ'],
    [/\\Omega\b/g, 'Ω'],
    [/\\(?:left|right)\s*([()[\]{}|])/g, '$1'],
    [/\\\{/g, '{'],
    [/\\\}/g, '}'],
    [/\\%/g, '%'],
    [/\\_/g, '_'],
    [/\\&/g, '&'],
    [/\\(?:quad|qquad|;|,|:)/g, ' '],
    [/\\\s+/g, ' '],
    [/\^\{\\circ\}\s*C\b|\^\\circ\s*C\b/g, '°C'],
    [/\^\{\\circ\}|\^\\circ/g, '°']
  ];
  for (const [re, repl] of symbols) {
    res = res.replace(re, repl);
  }

  // 3. Déballage styles Gras / Italique LaTeX : \mathbf{...}, \textbf{...}, \mathit{...}, \textit{...}
  let prev;
  do {
    prev = res;
    res = res.replace(/\\(?:mathbf|textbf)\{([^{}]+)\}/g, '**$1**');
    res = res.replace(/\\(?:mathit|textit)\{([^{}]+)\}/g, '*$1*');
  } while (res !== prev);

  // 4. Déballage texte brut : \text{...}, \mathrm{...}, \operatorname{...}, etc.
  do {
    prev = res;
    res = res.replace(/\\(?:text|mathrm|textrm|textnormal|operatorname)\{([^{}]*)\}/g, '$1');
  } while (res !== prev);

  // 5. Fractions : \(?:d)?frac{A}{B} -> (A / B)
  do {
    prev = res;
    res = res.replace(/\\d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1 / $2)');
  } while (res !== prev);

  // 6. Racines carrées : \sqrt{A} -> √(A)
  do {
    prev = res;
    res = res.replace(/\\sqrt(?:\[[^\]]*\])?\{([^{}]+)\}/g, '√($1)');
  } while (res !== prev);

  // 7. Commandes résiduelles : \nom{contenu} -> contenu
  do {
    prev = res;
    res = res.replace(/\\[a-zA-Z]+\{([^{}]*)\}/g, '$1');
  } while (res !== prev);

  // 8. Exposants et indices : ^{2} -> ², _{2} -> ₂
  const superMap = {'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','+':'⁺','-':'⁻'};
  const subMap = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
  res = res.replace(/\^\{?([0-9+-])\}?/g, (m, d) => superMap[d] || m);
  res = res.replace(/_\{?([0-9])\}?/g, (m, d) => subMap[d] || m);

  // 9. Nettoyage des antislashs orphelins résiduels devant des mots
  res = res.replace(/\\([a-zA-Z]+)/g, '$1');

  // 10. Espacements propres
  res = res.replace(/[ \t]{2,}/g, ' ');
  res = res.replace(/\s+([,.:;?!])/g, '$1');

  return res.trim();
}

class GeminiService {
  constructor() {
    this.apiKey = (typeof localStorage !== 'undefined' && localStorage.getItem('pedia_gemini_key')) || DEFAULT_GEMINI_KEY;
    this.allowedModels = MODEL_CASCADE.filter(m => m.toLowerCase().includes('flash'));
    this.activeModel = this.allowedModels[0] || "gemini-3-flash-preview";
    this.lastSuccessfulModel = null;
    this.quarantinedModels = new Map(); // model -> timestamp expiry
    this.callLogs = [];
  }

  setApiKey(key) {
    if (key && key.trim()) {
      this.apiKey = key.trim();
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pedia_gemini_key', this.apiKey);
      }
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  _isQuarantined(model) {
    if (!this.quarantinedModels.has(model)) return false;
    const expiry = this.quarantinedModels.get(model);
    if (Date.now() > expiry) {
      this.quarantinedModels.delete(model);
      return false;
    }
    return true;
  }

  /**
   * Execute API call in cascade avec mémorisation du modèle actif et circuit-breaker
   */
  async callWithFallback(prompt, systemInstruction = '', maxTokens = 2048) {
    const errors = [];

    const primary = (this.lastSuccessfulModel && !this._isQuarantined(this.lastSuccessfulModel))
      ? this.lastSuccessfulModel
      : (!this._isQuarantined(this.activeModel) ? this.activeModel : null);

    const candidateModels = primary
      ? [primary, ...this.allowedModels.filter(m => m !== primary)]
      : [...this.allowedModels];

    for (const model of candidateModels) {
      if (!model.toLowerCase().includes('flash')) continue;

      if (this._isQuarantined(model)) {
        continue;
      }

      try {
        this.activeModel = model;
        const result = await this._callModel(model, prompt, systemInstruction, maxTokens);
        if (result && result.text) {
          this.lastSuccessfulModel = model;
          this.quarantinedModels.delete(model);
          this.callLogs.push({ model, success: true, timestamp: Date.now() });
          return { text: result.text, modelUsed: model };
        }
      } catch (err) {
        errors.push({ model, error: err.message });

        if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))) {
          console.warn(`[Gemini Flash Circuit-Breaker] ${model} quota épuisé (429) -> Quarantaine 15 min.`);
          this.quarantinedModels.set(model, Date.now() + 15 * 60 * 1000);
        } else if (err.message && (err.message.includes('503') || err.message.includes('404'))) {
          console.warn(`[Gemini Flash Circuit-Breaker] ${model} indisponible (${err.message.slice(0, 35)}) -> Quarantaine 5 min.`);
          this.quarantinedModels.set(model, Date.now() + 5 * 60 * 1000);
        } else {
          console.warn(`[Gemini Flash Cascade] ${model} failed (${err.message}) -> Trying next Flash model...`);
        }
      }
    }

    throw new Error(`Tous les modèles Flash ont échoué : ${JSON.stringify(errors)}`);
  }

  async _callModel(model, prompt, systemInstruction, maxTokens) {
    if (!model.toLowerCase().includes('flash')) {
      throw new Error(`Modèle non autorisé (${model}) : seuls les modèles Flash sont autorisés.`);
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    
    const contents = [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ];

    const generationConfig = {
      temperature: 0.2,
      maxOutputTokens: maxTokens
    };

    if (model.includes('gemini-3-flash-preview')) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    const body = {
      contents,
      generationConfig
    };

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const textPart = candidate?.content?.parts?.find(p => p.text);
    if (!textPart || !textPart.text) {
      throw new Error("No candidate text returned");
    }

    return { text: cleanLatexMath(textPart.text.trim()) };
  }

  /**
   * Evaluate CROQ free text answer against standard official answer
   */
  async evaluateCroq(questionText, clinicalCase, expectedAnswer, userAnswer) {
    const systemPrompt = `Tu es un professeur expert en pédiatrie et jury de concours de résidanat et de 5ème année de médecine.
Ta mission est d'évaluer la réponse d'un étudiant à une question ouverte (CROQ / QROC) médicale par rapport à la réponse type attendue.
Critères d'évaluation :
- Sois rigoureux sur le plan sémantique et médical (synonymes médicaux, acronymes reconnus, termes équivalents doivent être acceptés).
- Attribue une note de 0 à 100%.
- Si le score est >= 75%, la réponse est considérée comme juste.
- Fournis une analyse détaillée et complète sans abréger.
- N'utilise JAMAIS de syntaxe ou balises LaTeX (interdit : \\text{}, \\mathbf{}, \\times, etc.) dans tes explications, feedback ou reasoningNote.
- Réponds STRICTEMENT au format JSON valide suivant, sans aucun markdown ni texte avant ou après :
{
  "score": 85,
  "isValid": true,
  "feedback": "Analyse exhaustive de la réponse : éléments clés validés, oublis et précisions cliniques requises.",
  "reasoningNote": "Conseil méthodologique et réflexe clinique complet pour retenir ce point."
}`;

    const userPrompt = `CONTEXTE CLINIQUE : ${clinicalCase || "Aucun"}
QUESTION CROQ : ${questionText}
RÉPONSE MODÈLE OFFICIELLE : ${expectedAnswer}
RÉPONSE DONNÉE PAR L'ÉTUDIANT : ${userAnswer}

Évalue la réponse de l'étudiant et retourne UNIQUEMENT l'objet JSON complet.`;

    try {
      const result = await this.callWithFallback(userPrompt, systemPrompt, 1024);
      const cleaned = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
      return {
        score,
        isValid: score >= 75,
        feedback: cleanLatexMath(parsed.feedback || (score >= 75 ? "Réponse conforme aux critères attendus." : "Réponse incomplète ou imprécise.")),
        reasoningNote: cleanLatexMath(parsed.reasoningNote || "Raisonnement clinique analysé."),
        modelUsed: result.modelUsed
      };
    } catch (err) {
      console.warn("Gemini CROQ evaluation failed, fallback to local semantic evaluation:", err);
      return this.localEvaluateCroq(expectedAnswer, userAnswer);
    }
  }

  localEvaluateCroq(expectedAnswer, userAnswer) {
    if (!userAnswer || !userAnswer.trim()) {
      return {
        score: 0,
        isValid: false,
        feedback: "Aucune réponse saisie.",
        reasoningNote: "Prenez le temps de formuler les mots-clés essentiels.",
        modelUsed: "Moteur sémantique local"
      };
    }

    const clean = (s) => (s || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2);

    const expWords = clean(expectedAnswer);
    const userWords = clean(userAnswer);

    if (expWords.length === 0) {
      return { score: 100, isValid: true, feedback: "Réponse validée.", reasoningNote: "OK", modelUsed: "Local" };
    }

    const expSet = new Set(expWords);
    let matched = 0;
    for (const w of expSet) {
      if (userWords.some(uw => uw.includes(w) || w.includes(uw))) {
        matched++;
      }
    }

    const ratio = matched / expSet.size;
    const score = Math.round(ratio * 100);
    return {
      score,
      isValid: score >= 75,
      feedback: `Évaluation locale hors-ligne : ${matched}/${expSet.size} concepts clés retrouvés.`,
      reasoningNote: "Vérifiez la concordance avec les termes précis de la réponse officielle.",
      modelUsed: "Moteur Local Hors-Ligne"
    };
  }

  /**
   * Generate complete, exhaustive clinical reasoning note for mistake or review
   * (Structure 4 cartes cliniques de PédiaDrill)
   */
  async generateReasoningNote(question, selectedLetters = [], isCroq = false, studentCroq = "") {
    if (!question) {
      return {
        note: "Aucune question médicale fournie pour l'analyse clinique.",
        modelUsed: "Tuteur Local"
      };
    }

    const correctOptions = (question.options || []).filter(o => o.is_correct);
    const correctLetters = correctOptions.map(o => o.letter).join(", ");
    const allOptionsText = (question.options || []).map(o => `${o.letter}) ${o.text}`).join("\n");

    const systemPrompt = `Tu es un Professeur de pédiatrie et jury de concours de résidanat en médecine.
L'étudiant s'entraîne sur un QCM/CROQ et a besoin d'une explication CLINIQUE COMPLÈTE, PARFAITEMENT STRUCTURÉE et PERCUTANTE.
Va directement au but avec un style médical soigné, rigoureux et précis (mots-clés en gras, listes à puces pour une lecture rapide).
La réponse doit être TOTALE et NE DOIT JAMAIS ÊTRE COUPÉE.
Structure OBLIGATOIREMENT ton retour selon ces 4 sections détaillées :

1. 🎯 PIÈGE CLINIQUE & ANALYSE DE L'ERREUR :
Explique précisément pourquoi la réponse cochée par l'étudiant est fausse, le piège classique posé dans l'énoncé et la confusion fréquente en pédiatrie.

2. 📋 JUSTIFICATION PROPOSITION PAR PROPOSITION (EXHAUSTIVE & COMPLÈTE) :
Passe impérativement en revue TOUTES les propositions (A, B, C, D, E le cas échéant) SANS AUCUNE EXCEPTION NI OUBLI.
Pour CHAQUE proposition (A, B, C, D, E), donne la lettre, l'énoncé de la proposition et justifie rigoureusement pourquoi elle est VRAIE ou FAUSSE sur les plans sémiologique, physiopathologique ou thérapeutique. Chaque proposition doit avoir sa justification détaillée et complète jusqu'au bout.

3. 🩺 DÉMARCHE DE RAISONNEMENT & CONDUITE CLINIQUE :
Détaille la démarche diagnostique et thérapeutique pas-à-pas : quel est le maître-symptôme, quelles données de l'âge de l'enfant orientent immédiatement, et comment éliminer les diagnostics différentiels.

4. 💡 RÈGLE D'OR & MÉMO CONCOURS :
Formule une règle mémo claire, percutante et mémorisable pour ne plus jamais hésiter sur ce dossier au concours.

5. 🚫 RÈGLE STRICTE SUR LES CALCULS, FORMULES ET UNITÉS :
- INTERDICTION TOTALE d'utiliser la syntaxe ou des balises LaTeX (strictement interdit : \\text{}, \\mathbf{}, \\times, \\frac{}, etc.).
- Écris TOUJOURS les calculs, posologies, poids et unités en texte français clair et direct (exemples : "14 g/dl", "3 kg", "×", "/").

Rédige en français médical soigné, rigoureux, direct et complet. Ne coupe aucune phrase, ne saute aucune étape.`;

    const userPrompt = `MODULE : Pédiatrie - ${question.chapterTitle || "Pédiatrie Générale"}
QUESTION : ${question.question || question.statement || ""}
${question.clinical_case ? `CAS CLINIQUE COMPLET : ${question.clinical_case}\n` : ""}
PROPOSITIONS PROPOSÉES :
${allOptionsText || "Question ouverte (CROQ)"}

RÉPONSE(S) OFFICIELLEMENT CORRECTE(S) : ${correctLetters || question.croq_answer || "Non précisé"}
RÉPONSE SÉLECTIONNÉE PAR L'ÉTUDIANT : ${isCroq ? studentCroq : (Array.isArray(selectedLetters) ? selectedLetters.join(", ") : (selectedLetters || "Aucune"))}
EXPLICATION OFFICIELLE DISPONIBLE DANS LA BASE : ${question.explanation || "Aucune explication fournie dans la base."}

Rédige l'explication clinique complète et approfondie sans aucune coupure. À l'étape 2, justifie impérativement et de façon complète chaque proposition une par une.`;

    try {
      const result = await this.callWithFallback(userPrompt, systemPrompt, 2500);
      return {
        note: cleanLatexMath(result.text),
        modelUsed: result.modelUsed
      };
    } catch (err) {
      console.warn("Reasoning note generation failed, fallback to structured official explanation:", err);
      const chosenStr = isCroq ? studentCroq : (Array.isArray(selectedLetters) ? selectedLetters.join(", ") : (selectedLetters || "Aucune"));
      const expStr = question.explanation ? question.explanation.trim() : "Se référer aux critères diagnostiques officiels de pédiatrie.";
      const corrStr = correctLetters || question.croq_answer || "Réponse officielle";

      let localNote = `### 1. 🎯 PIÈGE CLINIQUE & ANALYSE DE L'ERREUR :\n`;
      localNote += `* **Votre sélection :** ${chosenStr}\n`;
      localNote += `* **Réponse attendue :** ${corrStr}\n`;
      localNote += `* **Analyse & Piège :** ${expStr}\n\n`;

      localNote += `### 2. 📋 JUSTIFICATION PROPOSITION PAR PROPOSITION :\n`;
      if (question.options && question.options.length > 0) {
        question.options.forEach(o => {
          const status = o.is_correct ? "VRAIE" : "FAUSSE";
          localNote += `* **${o.letter}) ${o.text}** : **${status}**\n`;
        });
      } else {
        localNote += `* **Réponse type attendue :** ${question.croq_answer || expStr}\n`;
      }
      localNote += `\n`;

      localNote += `### 3. 🩺 DÉMARCHE DE RAISONNEMENT & CONDUITE CLINIQUE :\n`;
      localNote += `* **Thème clé :** *${question.chapterTitle || 'Pédiatrie Générale'}*\n`;
      if (question.clinical_case) {
        localNote += `* **Contexte clinique :** ${question.clinical_case.slice(0, 180)}...\n`;
      }
      localNote += `* **Conduite pratique :** Toujours hiérarchiser les signes de gravité vitale (détresse respiratoire, hémodynamique, neurologique) avant tout examen invasif ou traitement d'épreuve.\n\n`;

      localNote += `### 4. 💡 RÈGLE D'OR & MÉMO CONCOURS :\n`;
      localNote += `> **Règle d'or :** En pédiatrie (*${question.chapterTitle || 'Pédiatrie'}*), toujours retenir la notion clé : **${corrStr}** (conforme aux recommandations HAS et consensus officiels).`;

      return {
        note: cleanLatexMath(localNote),
        modelUsed: "Synthèse Clinique Locale (Hors-Ligne)"
      };
    }
  }

  /**
   * Question-in-context AI chat tutor (Flash models only)
   * Answers student queries specifically focused on the current QCM / CROQ
   */
  async askAboutQuestion(question, conversationHistory = [], userMessage) {
    if (!question) {
      return {
        text: "Aucune question active n'est actuellement chargée dans le débriefing.",
        modelUsed: "Tuteur Local"
      };
    }

    const correctOptions = (question.options || []).filter(o => o.is_correct);
    const correctLetters = correctOptions.map(o => o.letter).join(", ");
    const allOptionsText = (question.options || []).map(o => `${o.letter}) ${o.text}`).join("\n");

    const systemInstruction = `Tu es le Tuteur IA Pédiatrique de PédiaDrill, professeur universitaire et chef de clinique en pédiatrie.
L'étudiant s'entraîne sur un QCM/CROQ précis et te pose une question directe dans le chat de débriefing pour mieux comprendre.
Tu as le contexte médical complet sous les yeux :
- Module : Pédiatrie (${question.chapterTitle || 'Pédiatrie Générale'})
- Énoncé : "${question.question || question.statement || ''}"
${question.clinical_case ? `- Cas clinique : "${question.clinical_case}"\n` : ''}
${allOptionsText ? `- Propositions :\n${allOptionsText}\n` : '- Type : Question ouverte (CROQ)\n'}
- Bonne(s) réponse(s) officielle(s) : ${correctLetters || question.croq_answer || 'Non précisé'}
${question.explanation ? `- Explication officielle du cours : "${question.explanation}"\n` : ''}

Consignes pédagogiques strictes :
1. Réponds en français médical rigoureux, clair, bienveillant et concis (va droit au but).
2. Mets en valeur les mots-clés en gras et structure avec des tirets/puces pour une lecture rapide pendant le drill.
3. Justifie sur le plan physiopathologique, sémiologique ou thérapeutique pourquoi telle proposition est vraie ou fausse.
4. Signale les pièges fréquents au concours de résidanat si pertinent.
5. 🚫 RÈGLE STRICTE SUR LES CALCULS, DOSES ET FORMULES :
- INTERDICTION TOTALE d'utiliser la syntaxe ou des balises LaTeX (strictement interdit : \\text{}, \\mathbf{}, \\times, \\frac{}, \\cdot, etc.).
- Écris TOUJOURS les calculs, posologies, poids et unités en texte français clair et direct (exemples : "14 g/dl", "Poids = 3 kg", "Déficit = 4 g/dl", "×" au lieu de "\\times", "/" au lieu de "\\frac").`;

    let promptWithContext = '';
    if (!conversationHistory || conversationHistory.length === 0) {
      promptWithContext = `Voici ma question sur ce QCM : "${userMessage}"`;
    } else {
      const historyStr = conversationHistory.slice(-5).map(m => `${m.role === 'user' ? 'Étudiant' : 'Tuteur IA'} : ${m.text}`).join('\n\n');
      promptWithContext = `Historique de la discussion :\n${historyStr}\n\nNouvelle question de l'étudiant : "${userMessage}"`;
    }

    try {
      const result = await this.callWithFallback(promptWithContext, systemInstruction, 2048);
      return {
        text: cleanLatexMath(result.text),
        modelUsed: result.modelUsed
      };
    } catch (err) {
      console.warn("askAboutQuestion failed:", err);
      const corrStr = correctLetters || question.croq_answer || "Réponse officielle";
      return {
        text: cleanLatexMath(`⚠️ **Mode Hors-Ligne (Quota ou Réseau)** : Le Tuteur Flash est momentanément indisponible.\n\n*Rappel pour ce QCM :*\n- **Bonne réponse :** **${corrStr}**\n- **Explication :** ${question.explanation || 'Consultez le cours de référence.'}`),
        modelUsed: "Secours Local Hors-Ligne"
      };
    }
  }
}

export const geminiService = new GeminiService();
export default geminiService;
